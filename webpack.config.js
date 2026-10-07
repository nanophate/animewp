/**
 * @wordpress/scripts defaults plus the non-block entries: the Motion editor
 * panel (classic script) and its front-end module. Block entries are still
 * discovered from block.json files.
 */
const path = require( 'node:path' );
const { getProjectSourcePath } = require( '@wordpress/scripts/utils' );
const [ scriptConfig, moduleConfig ] = require( '@wordpress/scripts/config/webpack.config' );
const BuildPolicyPlugin = require( './scripts/build-policy.cjs' );

// Baseline comparisons pass a different source directory; every entry must use it.
const src = path.resolve( __dirname, getProjectSourcePath() );

function withEntries( config, extra ) {
	const defaults = config.entry;
	return {
		...config,
		plugins: [ ...config.plugins, new BuildPolicyPlugin() ],
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
