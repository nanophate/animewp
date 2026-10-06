/**
 * @wordpress/scripts defaults plus the non-block entries: the Motion editor
 * panel (classic script) and its front-end module. Block entries are still
 * discovered from block.json files.
 */
const path = require( 'node:path' );
const [ scriptConfig, moduleConfig ] = require( '@wordpress/scripts/config/webpack.config' );

const src = path.resolve( __dirname, 'plugins/animewp-blocks/src' );

function withEntries( config, extra ) {
	const defaults = config.entry;
	return {
		...config,
		entry: async () => ( {
			...( typeof defaults === 'function' ? await defaults() : defaults ),
			...extra,
		} ),
	};
}

module.exports = [
	withEntries( scriptConfig, {
		'motion/editor': path.join( src, 'motion/editor.js' ),
		'motion/style': path.join( src, 'motion/style.js' ),
	} ),
	withEntries( moduleConfig, { 'motion/view': path.join( src, 'motion/view.js' ) } ),
];
