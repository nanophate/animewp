'use strict';
const assert = require( 'node:assert/strict' );
const fs = require( 'node:fs' );
const os = require( 'node:os' );
const path = require( 'node:path' );
const { test } = require( 'node:test' );
const { execFileSync } = require( 'node:child_process' );
const webpack = require( 'webpack' );
const BuildPolicyPlugin = require( '../scripts/build-policy.cjs' );

async function compile( entry, { policy = true, library = 'module.exports = () => "library-without-banner";', ...options } = {} ) {
	const root = fs.mkdtempSync( path.join( os.tmpdir(), 'animewp-build-policy-' ) );
	const pkg = path.join( root, 'node_modules/review-fixture' );
	fs.mkdirSync( pkg, { recursive: true } );
	fs.writeFileSync( path.join( pkg, 'package.json' ), JSON.stringify( { name: 'review-fixture', main: 'index.js', sideEffects: false } ) );
	fs.writeFileSync( path.join( pkg, 'index.js' ), library );
	fs.writeFileSync( path.join( root, 'entry.js' ), entry );
	fs.writeFileSync( path.join( root, 'own.js' ), 'export const message = "project-owned-code";' );
	const compiler = webpack( {
		mode: 'production', context: root, entry: './entry.js',
		output: { path: path.join( root, 'dist' ), filename: 'index.js' },
		plugins: policy ? [ new BuildPolicyPlugin() ] : [],
		...options,
	} );
	try {
		const stats = await new Promise( ( resolve, reject ) => compiler.run( ( error, result ) => error ? reject( error ) : resolve( result ) ) );
		const data = stats.toJson( { all: false, errors: true } );
		const output = path.join( root, 'dist/index.js' );
		return { errors: data.errors, code: fs.existsSync( output ) ? fs.readFileSync( output, 'utf8' ) : '' };
	} finally {
		await new Promise( ( resolve, reject ) => compiler.close( ( error ) => error ? reject( error ) : resolve() ) );
		fs.rmSync( root, { recursive: true, force: true } );
	}
}

test( 'project code and WordPress-provided externals build successfully', async () => {
	const result = await compile( 'import { message } from "./own.js"; import { __ } from "@wordpress/i18n"; globalThis.result = __(message);', {
		externals: { '@wordpress/i18n': [ 'wp', 'i18n' ] },
	} );
	assert.deepEqual( result.errors, [] );
	assert.match( result.code, /project-owned-code/ );
} );

test( 'a library without a license banner is still rejected', async () => {
	const entry = 'globalThis.result = require("review-fixture")();';
	const withoutPolicy = await compile( entry, { policy: false } );
	assert.deepEqual( withoutPolicy.errors, [] );
	assert.match( withoutPolicy.code, /library-without-banner/ );
	assert.doesNotMatch( withoutPolicy.code, /\/\*!|@license|@preserve/ );
	const protectedBuild = await compile( entry );
	assert.ok( protectedBuild.errors.some( ( error ) => /must not bundle npm library code:.*review-fixture/.test( error.message ) ) );
} );

test( 'concatenated ES modules cannot hide npm library code', async () => {
	const result = await compile( 'import { message } from "review-fixture"; globalThis.result = message;', {
		library: 'export const message = "concatenated-library";',
	} );
	assert.ok( result.errors.some( ( error ) => /review-fixture/.test( error.message ) ) );
} );

test( 'npm library code in a lazy-loaded chunk is rejected', async () => {
	const result = await compile( 'import("review-fixture").then((library) => { globalThis.result = library.default(); });' );
	assert.ok( result.errors.some( ( error ) => /review-fixture/.test( error.message ) ) );
} );

test( 'unused modules removed by tree shaking are not distributed', async () => {
	const result = await compile( 'import { message } from "review-fixture"; globalThis.result = "own-code";', {
		library: 'export const message = "unused-library";',
	} );
	assert.deepEqual( result.errors, [] );
	assert.doesNotMatch( result.code, /unused-library/ );
} );

test( 'baseline builds take every motion entry from the selected source', () => {
	const root = path.resolve( __dirname, '..' );
	fs.mkdirSync( path.join( root, '.testenv' ), { recursive: true } );
	const tmp = fs.mkdtempSync( path.join( root, '.testenv/baseline-source-' ) );
	const src = path.join( tmp, 'src' );
	fs.mkdirSync( path.join( src, 'motion' ), { recursive: true } );
	fs.mkdirSync( path.join( src, 'blocks/fixture' ), { recursive: true } );
	for ( const entry of [ 'editor', 'style', 'view' ] ) {
		fs.writeFileSync( path.join( src, 'motion', entry + '.js' ), 'globalThis.baseline = true;' );
	}
	fs.writeFileSync( path.join( src, 'blocks/fixture/block.json' ), JSON.stringify( {
		name: 'animewp/fixture', editorScript: 'file:./index.js',
	} ) );
	fs.writeFileSync( path.join( src, 'blocks/fixture/index.js' ), 'globalThis.fixture = true;' );
	try {
		const program = 'const configs=require("./webpack.config.js"); Promise.all(configs.map(c=>c.entry())).then(entries=>console.log(JSON.stringify(entries)));';
		const entries = JSON.parse( execFileSync( process.execPath, [ '-e', program ], {
			cwd: root, encoding: 'utf8',
			env: { ...process.env, NODE_ENV: 'production', WP_SOURCE_PATH: path.relative( root, src ), WP_EXPERIMENTAL_MODULES: 'true' },
		} ) );
		assert.equal( entries[ 0 ][ 'motion/editor' ], path.join( src, 'motion/editor.js' ) );
		assert.equal( entries[ 0 ][ 'motion/style' ], path.join( src, 'motion/style.js' ) );
		assert.equal( entries[ 1 ][ 'motion/view' ], path.join( src, 'motion/view.js' ) );
	} finally {
		fs.rmSync( tmp, { recursive: true, force: true } );
	}
} );
