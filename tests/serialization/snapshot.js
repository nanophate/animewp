#!/usr/bin/env node
/**
 * Serialize every case with one plugin build and print JSON to stdout.
 * Usage: node snapshot.js <plugin-dir>
 */
'use strict';
const path = require( 'node:path' );
const { installWordPress, loadPlugin } = require( './env' );
const { documents, generatedBlocks } = require( './cases' );

const dir = path.resolve( process.argv[ 2 ] || '' );
const { window, wp, version } = installWordPress();
const layout = loadPlugin( dir, window );
// Attributes are copied into the page realm so WordPress sees native objects.
const make = ( name, attributes = {}, inner = [] ) =>
	wp.blocks.createBlock( name, window.JSON.parse( JSON.stringify( attributes ) ), inner );
const { parse, serialize, switchToBlockType, getBlockTypes } = wp.blocks;

function describe( blocks, prefix = '' ) {
	return blocks.flatMap( ( block, index ) => [
		{ path: prefix + index, name: block.name, valid: block.isValid !== false },
		...describe( block.innerBlocks || [], prefix + index + '/' ),
	] );
}

function safe( fn ) {
	try {
		return fn();
	} catch ( error ) {
		return 'ERROR: ' + error.message;
	}
}

const result = {
	wordpress: version,
	layout,
	blockTypes: getBlockTypes()
		.map( ( type ) => type.name )
		.filter( ( name ) => name.startsWith( 'animewp/' ) )
		.sort(),
	documents: {},
	blocks: {},
};

for ( const [ name, html ] of Object.entries( documents() ) ) {
	const parsed = parse( html );
	const saved = serialize( parsed );
	result.documents[ name ] = {
		blocks: describe( parsed ),
		serialized: saved,
		// Re-parsing our own output must be valid with no deprecation step.
		reparsed: describe( parse( saved ) ),
	};
}

for ( const [ name, create ] of Object.entries( generatedBlocks( make ) ) ) {
	let block;
	try {
		block = create();
	} catch ( error ) {
		// A block added after the baseline: nothing to compare against yet.
		result.blocks[ name ] = { unregistered: true };
		continue;
	}
	const saved = safe( () => serialize( [ block ] ) );
	const toGroup = safe( () => {
		const switched = switchToBlockType( block, 'core/group' );
		return switched ? serialize( switched ) : null;
	} );
	const toMediaText =
		block.name === 'animewp/media'
			? safe( () => {
					const switched = switchToBlockType( block, 'core/media-text' );
					return switched ? serialize( switched ) : null;
			  } )
			: undefined;
	result.blocks[ name ] = {
		serialized: saved,
		reparsed: typeof saved === 'string' ? describe( parse( saved ) ) : null,
		toGroup,
		toMediaText,
	};
}

process.stdout.write( JSON.stringify( result ) );
