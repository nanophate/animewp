/**
 * Lint config for the block source. Extends the @wordpress/scripts default.
 */
const defaults = require( '@wordpress/scripts/config/eslint.config.cjs' );

module.exports = [
	...defaults,
	{ ignores: [ 'tests/**', 'themes/**', 'scripts/**' ] },
	{
		files: [ 'plugins/animewp-blocks/src/**/*.js' ],
		rules: {
			// WordPress provides @wordpress/* at runtime (webpack externals); they are not npm dependencies.
			'import/no-unresolved': [ 'error', { ignore: [ '^@wordpress/' ] } ],
			'import/no-extraneous-dependencies': 'off',
		},
	},
];
