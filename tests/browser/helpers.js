const fs = require( 'node:fs' );
const path = require( 'node:path' );
const { execFileSync } = require( 'node:child_process' );
const { test: base, expect } = require( '@playwright/test' );

function wp( ...args ) {
	return execFileSync( 'npx', [ '--no-install', 'wp-env', 'run', 'tests-cli', '--', 'wp', ...args ], {
		encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'pipe' ], timeout: 120_000,
	} );
}
function fixtures() { return JSON.parse( fs.readFileSync( 'artifacts/browser-fixtures/pages.json', 'utf8' ) ); }
async function login( page ) {
	await page.goto( '/wp-login.php' );
	// Core schedules autofocus after 200 ms; wait for it before typing so it
	// cannot redirect a password fill into the selected username input.
	await expect( page.locator( '#user_login' ) ).toBeFocused();
	await page.locator( '#user_login' ).fill( process.env.WP_USERNAME || 'admin' );
	await page.locator( '#user_pass' ).fill( process.env.WP_PASSWORD || 'password' );
	await page.locator( '#wp-submit' ).click();
	await expect( page.locator( '#wpadminbar' ) ).toBeVisible();
}
async function capture( page, name, options = {} ) {
	fs.mkdirSync( 'artifacts/browser-results', { recursive: true } );
	await page.screenshot( { path: path.resolve( 'artifacts/browser-results', name + '.png' ), fullPage: true, ...options } );
}
const test = base.extend( {} );
test.afterEach( async ( { page }, info ) => {
	if ( info.status !== info.expectedStatus && ! page.isClosed() ) {
		await capture( page, 'failure-' + info.title.replace( /[^a-z0-9_-]/gi, '-' ).slice( 0, 100 ) ).catch( () => {} );
	}
} );
module.exports = { test, expect, wp, fixtures, login, capture };
