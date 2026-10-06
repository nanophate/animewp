#!/usr/bin/env node
/**
 * Prove a plugin build saves byte-identical markup to a baseline build.
 *
 *   node tests/serialization/compare.js                    # baseline: plugin at git ref "main"
 *   node tests/serialization/compare.js --base-ref v1.3.0
 *   node tests/serialization/compare.js --base-dir /path/to/built/plugin
 *
 * The candidate is plugins/animewp-blocks in the working tree (run npm run build first).
 * Each build runs in its own process so the two block registries never mix.
 */
'use strict';
const { execFileSync } = require( 'node:child_process' );
const fs = require( 'node:fs' );
const path = require( 'node:path' );

const ROOT = path.resolve( __dirname, '../..' );
const PLUGIN = 'plugins/animewp-blocks';

function option( name, fallback ) {
	const index = process.argv.indexOf( name );
	return index === -1 ? fallback : process.argv[ index + 1 ];
}

function extract( ref ) {
	// Inside the repo (gitignored .testenv/) so a baseline build resolves this checkout's node_modules.
	const parent = path.join( ROOT, '.testenv' );
	fs.mkdirSync( parent, { recursive: true } );
	const target = fs.mkdtempSync( path.join( parent, 'baseline-' ) );
	const archive = execFileSync( 'git', [ 'archive', '--format=tar', ref, PLUGIN ], { cwd: ROOT, maxBuffer: 1 << 28 } );
	execFileSync( 'tar', [ '-x', '-C', target ], { input: archive } );
	return path.join( target, PLUGIN );
}

/** build/ is not committed: compile a baseline's src/ with this checkout's toolchain. */
function ensureBuilt( dir ) {
	if ( ! fs.existsSync( path.join( dir, 'src/blocks' ) ) || fs.existsSync( path.join( dir, 'build' ) ) ) {
		return dir;
	}
	const relative = path.relative( ROOT, dir );
	if ( relative.startsWith( '..' ) || path.isAbsolute( relative ) ) {
		throw new Error( 'A baseline without build/ must be inside this repository to build: ' + dir );
	}
	// Same invocation as npm run build, pointed at the baseline (relative paths from the repo root).
	execFileSync(
		path.join( ROOT, 'node_modules/.bin/wp-scripts' ),
		[ 'build', '--webpack-src-dir=' + path.join( relative, 'src' ), '--output-path=' + path.join( relative, 'build' ) ],
		{ cwd: ROOT, stdio: [ 'ignore', 'ignore', 'inherit' ] }
	);
	if ( ! fs.existsSync( path.join( dir, 'build/blocks/panel/index.js' ) ) ) {
		throw new Error( 'Baseline build produced no block scripts in ' + dir );
	}
	return dir;
}

function snapshot( dir ) {
	const output = execFileSync( process.execPath, [ path.join( __dirname, 'snapshot.js' ), dir ], {
		cwd: __dirname,
		maxBuffer: 1 << 30,
	} );
	return JSON.parse( output );
}

const baseOption = option( '--base-dir' );
const baseDir = ensureBuilt( baseOption ? path.resolve( baseOption ) : extract( option( '--base-ref', 'main' ) ) );
let base;
try {
	base = snapshot( baseDir );
} finally {
	// Remove only what this run extracted; a --base-dir is left as given.
	if ( ! baseOption ) {
		fs.rmSync( path.dirname( path.dirname( baseDir ) ), { recursive: true, force: true } );
	}
}
const head = snapshot( path.join( ROOT, PLUGIN ) );

const failures = [];
function same( label, a, b ) {
	if ( JSON.stringify( a ) !== JSON.stringify( b ) ) {
		failures.push( { label, base: a, head: b } );
	}
}

same( 'registered block types', base.blockTypes, head.blockTypes );
let documentCount = 0;
let invalidBase = 0;
for ( const [ name, entry ] of Object.entries( base.documents ) ) {
	const other = head.documents[ name ];
	documentCount++;
	invalidBase += entry.blocks.filter( ( block ) => ! block.valid ).length;
	same( name + ' validity', entry.blocks, other && other.blocks );
	same( name + ' serialized', entry.serialized, other && other.serialized );
	same( name + ' reparsed', entry.reparsed, other && other.reparsed );
}
let blockCount = 0;
for ( const [ name, entry ] of Object.entries( base.blocks ) ) {
	const other = head.blocks[ name ] || {};
	blockCount++;
	same( name + ' serialized', entry.serialized, other.serialized );
	same( name + ' reparsed', entry.reparsed, other.reparsed );
	same( name + ' → core/group', entry.toGroup, other.toGroup );
	same( name + ' → core/media-text', entry.toMediaText, other.toMediaText );
}
// Our own output must always re-parse as valid.
for ( const [ name, entry ] of Object.entries( head.blocks ) ) {
	if ( ! entry.reparsed || entry.reparsed.some( ( block ) => ! block.valid ) ) {
		failures.push( { label: name + ' head output does not re-parse as valid', head: entry.serialized } );
	}
}
for ( const [ name, entry ] of Object.entries( head.documents ) ) {
	if ( entry.reparsed.some( ( block ) => ! block.valid ) ) {
		failures.push( { label: name + ' head output does not re-parse as valid' } );
	}
}

console.log( `WordPress ${ head.wordpress } editor scripts. Baseline ${ base.layout } (${ baseDir }) vs working tree ${ head.layout }.` );
console.log( `Compared ${ documentCount } saved documents and ${ blockCount } generated blocks (save, re-parse, transforms).` );
if ( invalidBase ) {
	console.log( `Note: ${ invalidBase } blocks are already invalid in the baseline; head must match that exactly.` );
}
if ( failures.length ) {
	const kinds = {};
	for ( const failure of failures ) {
		const kind = failure.label.replace( /#\d+/, '#n' ).replace( /^(fixture|pattern)\/\S+/, '$1/…' );
		kinds[ kind ] = ( kinds[ kind ] || 0 ) + 1;
	}
	console.error( 'Differences by kind:' );
	for ( const [ kind, count ] of Object.entries( kinds ) ) {
		console.error( `  ${ count }× ${ kind }` );
	}
	for ( const failure of failures.slice( 0, 10 ) ) {
		console.error( '\n✖ ' + failure.label );
		if ( 'base' in failure ) {
			console.error( '  base: ' + JSON.stringify( failure.base ).slice( 0, 1200 ) );
		}
		console.error( '  head: ' + JSON.stringify( failure.head ).slice( 0, 1200 ) );
	}
	console.error( `\n${ failures.length } difference(s).` );
	process.exit( 1 );
}
console.log( 'Identical saved markup, validity and transforms.' );
