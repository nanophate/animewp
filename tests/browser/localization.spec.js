const { randomBytes } = require( 'node:crypto' );
const { Editor } = require( '@wordpress/e2e-test-utils-playwright' );
const { test, expect, wp, fixtures, capture } = require( './helpers' );

// A separate user exercises WordPress's real editor locale without changing
// the default administrator or the English locale used by other browser tests.
const username = 'animewp-qa-ja-' + randomBytes( 6 ).toString( 'hex' );
const password = randomBytes( 24 ).toString( 'hex' );
let created = false;

test.use( { locale: 'ja-JP' } );
test.beforeAll( () => {
	wp( 'user', 'create', username, username + '@example.invalid', '--role=administrator', '--user_pass=' + password );
	created = true;
	wp( 'user', 'meta', 'update', username, 'locale', 'ja' );
} );
test.afterAll( () => {
	if ( created ) {
		wp( 'user', 'delete', username, '--reassign=1', '--yes' );
	}
} );

async function loginJapanese( page ) {
	await page.goto( '/wp-login.php' );
	await expect( page.locator( '#user_login' ) ).toBeFocused();
	await page.locator( '#user_login' ).fill( username );
	await page.locator( '#user_pass' ).fill( password );
	await page.locator( '#wp-submit' ).click();
	await expect( page.locator( '#wpadminbar' ) ).toBeVisible();
}

for ( const kind of [ 'post', 'site' ] ) {
	test( 'Japanese Motion controls load in the ' + kind + ' editor from the installed ZIP', async ( { page } ) => {
		await loginJapanese( page );
		const editor = new Editor( { page } );
		const url = kind === 'post'
			? '/wp-admin/post.php?post=' + fixtures().basic.id + '&action=edit'
			: '/wp-admin/site-editor.php?postType=wp_template&postId=' + encodeURIComponent( fixtures().template.id ) + '&canvas=edit';
		await page.goto( url );
		await editor.setPreferences( kind === 'post' ? 'core/edit-post' : 'core/edit-site', {
			welcomeGuide: false, welcomeGuideStyles: false, welcomeGuideTemplate: false, welcomeGuidePage: false,
		} );
		await expect( page.locator( 'iframe[name="editor-canvas"]' ) ).toBeVisible();
		await page.waitForFunction( () => window.wp?.data?.select( 'core/block-editor' )?.getBlockCount() > 0 );

		// Checking the browser's registered domain catches a catalog that exists
		// in the ZIP but was not found or injected for the Motion script handle.
		await expect.poll( () => page.evaluate( () => window.wp.i18n.__( 'Motion', 'animewp-blocks' ) ) ).toBe( 'モーション' );
		await expect( page.locator( '#animewp-motion-editor-js-translations' ) ).toHaveCount( 1 );

		await page.evaluate( () => {
			const findGroup = ( blocks ) => {
				for ( const block of blocks ) {
					if ( block.name === 'core/group' ) { return block; }
					const child = findGroup( block.innerBlocks || [] );
					if ( child ) { return child; }
				}
			};
			const block = findGroup( window.wp.data.select( 'core/block-editor' ).getBlocks() );
			if ( ! block ) { throw new Error( 'The localization fixture needs an editable Core Group.' ); }
			// Use the same Group marker as the optional hero header preset. This
			// is an unsaved editor change; it must expose the translated controls.
			window.wp.data.dispatch( 'core/block-editor' ).updateBlockAttributes( block.clientId, {
				className: ( block.attributes.className || '' ) + ' animewp-header animewp-header--hero',
			} );
			window.wp.data.dispatch( 'core/block-editor' ).selectBlock( block.clientId );
		} );
		// The upstream helper hard-codes English Core labels. Resolve these in
		// the current locale so this also works when Core's ja pack is installed.
		const labels = await page.evaluate( () => ( {
			topBar: window.wp.i18n.__( 'Editor top bar' ), settings: window.wp.i18n.__( 'Settings' ),
		} ) );
		const settings = page.getByRole( 'region', { name: labels.topBar, exact: true } )
			.getByRole( 'button', { name: labels.settings, exact: true, disabled: false } );
		if ( await settings.getAttribute( 'aria-expanded' ) === 'false' ) {
			await settings.click();
		}
		const panelButton = page.getByRole( 'button', { name: 'モーション', exact: true } );
		await expect( panelButton ).toBeVisible();
		if ( await panelButton.getAttribute( 'aria-expanded' ) !== 'true' ) {
			await panelButton.click();
		}
		const action = page.getByLabel( '下にスクロールした後', { exact: true } );
		await expect( action.locator( 'option[value="navigation"]' ) ).toHaveText( 'メニューを展開する' );
		await action.selectOption( 'navigation' );
		const trigger = page.getByLabel( '切り替えのきっかけ', { exact: true } );
		await expect( trigger.locator( 'option' ) ).toHaveText( [ 'スクロール距離', 'キービジュアルを通過した後' ] );
		await trigger.selectOption( 'distance' );
		const distance = page.getByRole( 'spinbutton', { name: 'スクロール距離（px）', exact: true } );
		await distance.fill( '320' );
		await distance.blur();
		await expect.poll( () => page.evaluate( () => window.wp.data.select( 'core/block-editor' ).getSelectedBlock().attributes.animewpMotion.scrollDistance ) ).toBe( 320 );
		await trigger.selectOption( 'hero' );
		await expect( distance ).toHaveCount( 0 );
		await expect( page.getByText( 'ページ本文の最初の「カバー」または「カルーセル」を基準にします。見つからない場合は、メニューを表示したままにします。', { exact: true } ) ).toBeVisible();
		await expect( page.getByRole( 'button', { name: 'Motion', exact: true } ) ).toHaveCount( 0 );
		await capture( page, kind + '-editor-japanese-scroll', { fullPage: false } );
		await panelButton.click();
		await page.getByRole( 'button', { name: 'ヘッダーの見た目', exact: true } ).click();
		for ( const label of [ '背景の不透明度（%）', '背景のぼかし（px）', '最小の高さ（px）' ] ) {
			await expect( page.getByRole( 'spinbutton', { name: label, exact: true } ) ).toBeVisible();
		}
		await capture( page, kind + '-editor-japanese-header', { fullPage: false } );
	} );
}
