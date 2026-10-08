const path = require( 'node:path' );
const { defineConfig } = require( '@playwright/test' );

module.exports = defineConfig( {
	testDir: __dirname,
	testMatch: '*.spec.js',
	fullyParallel: false,
	workers: 1,
	retries: 0,
	timeout: 90_000,
	expect: { timeout: 15_000 },
	outputDir: path.resolve( 'artifacts/browser-private' ),
	reporter: [ [ 'list' ], [ path.join( __dirname, 'reporter.js' ) ] ],
	use: {
		baseURL: process.env.ANIMEWP_BROWSER_URL || 'http://localhost:8889',
		browserName: process.env.ANIMEWP_BROWSER || 'chromium',
		viewport: { width: 1280, height: 900 },
		locale: 'en-US',
		// Traces, HAR, videos and stored sessions can contain authentication data.
		trace: 'off', video: 'off', screenshot: 'off',
	},
} );
