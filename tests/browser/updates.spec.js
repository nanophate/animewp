const fs = require( 'node:fs' );
const { test, expect, wp, login, capture } = require( './helpers' );

function feed( mode ) {
	wp( 'option', 'update', 'animewp_browser_feed_mode', mode );
	wp( 'eval', "foreach (array('theme','plugin') as $type) { delete_site_transient('animewp_distribution_v1_feed_' . $type); delete_site_option('animewp_distribution_v1_good_' . $type); } delete_site_transient('update_themes'); delete_site_transient('update_plugins');" );
}

async function update( page, kind, slug ) {
	await login( page );
	await page.goto( '/wp-admin/update-core.php?force-check=1' );
	const form = page.locator( 'form[name="upgrade-' + kind + 's"]' );
	const value = kind === 'plugin' ? slug + '/' + slug + '.php' : slug;
	await expect( form.locator( 'input[name="checked[]"][value="' + value + '"]' ) ).toBeVisible();
	await form.locator( 'input[name="checked[]"][value="' + value + '"]' ).check();
	await form.locator( 'input[type="submit"]' ).first().click();
}

test.afterEach( async () => {
	feed( 'off' );
	wp( 'theme', 'install', 'wp-content/animewp-qa/current-theme.zip', '--force', '--activate' );
	wp( 'plugin', 'install', 'wp-content/animewp-qa/current-plugin.zip', '--force', '--activate' );
} );

test( 'native theme update works with the optional plugin inactive', async ( { page } ) => {
	wp( 'plugin', 'deactivate', 'animewp-blocks' );
	feed( 'valid' );
	await update( page, 'theme', 'animewp' );
	await expect.poll( () => wp( 'theme', 'get', 'animewp', '--field=version' ), { timeout: 45_000 } ).toContain( '99.0.0' );
	expect( wp( 'plugin', 'get', 'animewp-blocks', '--field=status' ) ).toContain( 'inactive' );
	await capture( page, 'native-theme-update' );
} );

test( 'native plugin update works while another theme is active', async ( { page } ) => {
	wp( 'theme', 'activate', 'twentytwentyfour' );
	feed( 'valid' );
	await update( page, 'plugin', 'animewp-blocks' );
	await expect.poll( () => wp( 'plugin', 'get', 'animewp-blocks', '--field=version' ), { timeout: 45_000 } ).toContain( '99.0.0' );
	expect( wp( 'option', 'get', 'stylesheet' ) ).toContain( 'twentytwentyfour' );
	await capture( page, 'native-plugin-update-other-theme' );
} );

test( 'native update refuses a ZIP whose SHA256 does not match the feed', async ( { page } ) => {
	feed( 'bad-hash' );
	await update( page, 'plugin', 'animewp-blocks' );
	await expect.poll( async () => {
		const text = await Promise.all( page.frames().map( ( frame ) => frame.locator( 'body' ).innerText().catch( () => '' ) ) );
		return text.join( '\n' );
	}, { timeout: 45_000 } ).toContain( 'AnimeWP update checksum verification failed.' );
	const current = fs.readFileSync( 'artifacts/browser-fixtures/current-version.txt', 'utf8' ).trim();
	expect( wp( 'plugin', 'get', 'animewp-blocks', '--field=version' ) ).toContain( current );
	await capture( page, 'native-update-checksum-refused' );
} );
