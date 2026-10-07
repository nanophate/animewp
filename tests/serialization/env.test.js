/**
 * The harness must fail on script exceptions and tolerate unsupported CSS.
 * ANIMEWP_TEST_JSDOM_DIR may select an isolated dependency-update installation;
 * the repository's installed dependency is used by default.
 */
'use strict';
const assert = require( 'node:assert/strict' );
const fs = require( 'node:fs' );
const os = require( 'node:os' );
const path = require( 'node:path' );
const vm = require( 'node:vm' );
const { createRequire } = require( 'node:module' );
const test = require( 'node:test' );

const file = path.join( __dirname, 'env.js' );
const requireHere = createRequire( file );
const jsdom = requireHere( process.env.ANIMEWP_TEST_JSDOM_DIR || 'jsdom' );

function harness( t, debug = false ) {
	const logs = [];
	const forwardedConsole = {};
	for ( const key of Object.keys( console ) ) {
		if ( typeof console[ key ] === 'function' ) forwardedConsole[ key ] = ( ...args ) => logs.push( args );
	}
	const target = { exports: {} };
	// Isolate env.js's diagnostics queue and optional package substitution. The
	// exported functions are the unmodified implementation used by snapshots.
	vm.runInNewContext( fs.readFileSync( file, 'utf8' ), {
		module: target,
		require: ( name ) => name === 'jsdom' ? jsdom : requireHere( name ),
		__dirname,
		console: forwardedConsole,
		process: { env: { ...process.env, ANIMEWP_HARNESS_DEBUG: debug ? '1' : '' } },
	}, { filename: file } );
	const window = target.exports.createWindow();
	const directory = fs.mkdtempSync( path.join( os.tmpdir(), 'animewp-harness-' ) );
	t.after( () => {
		window.close();
		fs.rmSync( directory, { recursive: true, force: true } );
	} );
	return {
		window, logs,
		run( code ) {
			const script = path.join( directory, 'fixture.js' );
			fs.writeFileSync( script, code );
			target.exports.run( window, script );
		},
	};
}

test( 'debug diagnostics can create a window and forward console output', ( t ) => {
	const env = harness( t, true );
	env.run( 'window.ready = true; console.log("harness debug marker");' );
	assert.equal( env.window.ready, true );
	assert.ok( env.logs.some( ( args ) => args.includes( 'harness debug marker' ) ) );
} );

test( 'browser text encoding APIs preserve UTF-8 bytes and accept window typed arrays', ( t ) => {
	const env = harness( t );
	env.run( `
		const encoder = new TextEncoder();
		const bytes = encoder.encode('日本語🍿');
		window.byteLength = bytes.byteLength;
		window.decoded = new TextDecoder().decode(bytes);
		const destination = new Uint8Array(5);
		window.partial = encoder.encodeInto('日本語', destination);
		window.firstCharacter = new TextDecoder().decode(destination.subarray(0, 3));
	` );
	assert.equal( env.window.byteLength, 13 );
	assert.equal( env.window.decoded, '日本語🍿' );
	assert.equal( env.window.partial.read, 1 );
	assert.equal( env.window.partial.written, 3 );
	assert.equal( env.window.firstCharacter, '日' );
} );

for ( const debug of [ false, true ] ) {
	test( 'uncaught script exceptions fail the harness with debug=' + debug, ( t ) => {
		const env = harness( t, debug );
		assert.throws( () => env.run( 'throw new Error("intentional script failure");' ), /fixture\.js:.*intentional script failure/ );
		// Consuming the diagnostic must not poison the next successful script.
		assert.doesNotThrow( () => env.run( 'window.recovered = true;' ) );
		assert.equal( env.window.recovered, true );
	} );
}

test( 'a syntax error in a loaded script fails the harness', ( t ) => {
	const env = harness( t );
	assert.throws( () => env.run( 'const broken = ;' ), /SyntaxError/ );
} );

test( 'CSS parsing diagnostics stay nonfatal and remain visible in debug mode', ( t ) => {
	const env = harness( t, true );
	assert.doesNotThrow( () => env.run( 'const style = document.createElement("style"); style.textContent = "a { color: red; } }"; document.head.append(style); window.afterCss = true;' ) );
	assert.equal( env.window.afterCss, true );
	assert.ok( env.logs.some( ( args ) => args.some( ( value ) => String( value ).includes( 'Could not parse CSS stylesheet' ) ) ) );
} );
