const fs = require( 'node:fs' );
const path = require( 'node:path' );

module.exports = class SafeReporter {
	constructor() { this.results = []; }
	onTestEnd( test, result ) {
		this.results.push( { test: test.titlePath().join( ' / ' ), status: result.status, milliseconds: result.duration } );
	}
	onEnd( result ) {
		const directory = path.resolve( 'artifacts/browser-results' );
		fs.mkdirSync( directory, { recursive: true } );
		fs.writeFileSync( path.join( directory, 'results.json' ), JSON.stringify( {
			engine: process.env.ANIMEWP_BROWSER || 'chromium',
			wordpressBranch: process.env.ANIMEWP_WP_BRANCH,
			status: result.status, tests: this.results,
			// Deliberately no HTTP headers, request bodies, cookies or error DOM dumps.
		}, null, 2 ) + '\n' );
	}
};
