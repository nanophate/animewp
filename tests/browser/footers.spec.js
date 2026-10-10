const { test, expect, fixtures, capture } = require( './helpers' );

test( 'official footer uses the Core social icons, editable branding and vertical sitemap without overflow', async ( { page } ) => {
	await page.goto( fixtures().footer_official.path );
	const footer = page.locator( '.animewp-footer-official' );
	await expect( footer ).toBeVisible();
	await expect( footer.locator( '.wp-block-cover__background' ) ).toHaveCount( 1 );
	await expect( footer.locator( '.wp-block-site-title' ) ).toHaveCount( 1 );
	const socials = footer.locator( '.wp-block-social-links .wp-social-link' );
	await expect( socials ).toHaveCount( 4 );
	await expect( footer.getByText( '制作：制作会社名を入力' ) ).toBeVisible();
	await expect( footer.getByRole( 'link', { name: 'プライバシーポリシー' } ) ).toBeVisible();
	const firstLink = footer.locator( '.animewp-footer-official__sitemap .wp-block-navigation-item__content' ).first();
	await expect( firstLink ).toBeVisible();
	await expect( firstLink ).toHaveCSS( 'writing-mode', 'vertical-rl' );
	// A vertical link must consume a full column of glyphs, not collapse
	// multi-character Japanese text into a one-character-high flex box.
	const verticalLinks = footer.locator( '.animewp-footer-official__sitemap .wp-block-navigation-item__content' );
	await expect( verticalLinks ).toHaveCount( 7 );
	for ( const link of await verticalLinks.all() ) {
		const size = await link.evaluate( ( node ) => ( {
			characters: [ ...node.textContent.trim() ].length,
			height: node.getBoundingClientRect().height,
		} ) );
		expect( size.height ).toBeGreaterThanOrEqual( size.characters * 11 );
	}
	const initial = await page.evaluate( () => document.documentElement.scrollWidth );
	expect( initial ).toBeLessThanOrEqual( 1281 );
	await capture( page, 'official-footer-desktop', { fullPage: false } );

	await page.setViewportSize( { width: 375, height: 900 } );
	await expect( firstLink ).toHaveCSS( 'writing-mode', 'horizontal-tb' );
	await expect( socials.first() ).toBeVisible();
	await expect( footer.getByRole( 'link', { name: 'TO TOP ↑' } ) ).toBeVisible();
	expect( await page.evaluate( () => document.documentElement.scrollWidth ) ).toBeLessThanOrEqual( 376 );
	await capture( page, 'official-footer-mobile', { fullPage: false } );
} );

test.describe( 'official footer without JavaScript', () => {
	test.use( { javaScriptEnabled: false } );
	test( 'all Core footer links stay accessible', async ( { page } ) => {
		await page.goto( fixtures().footer_official.path );
		const footer = page.locator( '.animewp-footer-official' );
		await expect( footer.getByRole( 'link', { name: 'プライバシーポリシー' } ) ).toBeVisible();
		await expect( footer.locator( '.animewp-footer-official__sitemap .wp-block-navigation-item__content' ).first() ).toBeVisible();
		await expect( footer.locator( '.wp-block-social-links .wp-social-link' ) ).toHaveCount( 4 );
	} );
} );
