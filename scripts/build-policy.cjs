/** Prevent npm library code from entering production JavaScript or CSS. */
'use strict';
const path = require( 'node:path' );

class BuildPolicyPlugin {
	apply( compiler ) {
		if ( compiler.options.mode === 'development' ) {
			return;
		}
		const name = 'AnimewpBuildPolicyPlugin';
		compiler.hooks.thisCompilation.tap( name, ( compilation ) => {
			compilation.hooks.processAssets.tap(
				{ name, stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT },
				() => {
					const forbidden = new Set();
					const visited = new Set();
					const fromPackage = ( resource ) => typeof resource === 'string' && /(?:^|[\\/])node_modules[\\/]/.test( resource );
					const visit = ( module ) => {
						if ( visited.has( module ) ) {
							return;
						}
						visited.add( module );
						const resource = module.nameForCondition?.();
						if ( fromPackage( resource ) ) {
							forbidden.add( resource );
						}
						// Scope-hoisted modules have no separate chunk membership.
						for ( const child of module.modules || [] ) {
							visit( child );
						}
					};
					for ( const chunk of compilation.chunks ) {
						for ( const module of compilation.chunkGraph.getChunkModulesIterable( chunk ) ) {
							visit( module );
						}
					}
					// Sass may inline an imported stylesheet without a separate module.
					for ( const file of compilation.fileDependencies ) {
						if ( fromPackage( file ) && /\.(?:css|scss|sass)$/i.test( file ) ) {
							forbidden.add( file );
						}
					}
					for ( const file of [ ...forbidden ].sort() ) {
						compilation.errors.push( new Error( 'AnimeWP must not bundle npm library code: ' + path.relative( compiler.context, file ) ) );
					}
				}
			);
		} );
	}
}

module.exports = BuildPolicyPlugin;
