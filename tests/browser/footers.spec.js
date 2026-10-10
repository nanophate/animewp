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
	const nav = footer.locator( '.animewp-footer-official__sitemap .wp-block-navigation__container' ).first();
	await expect( nav ).toHaveCSS( 'flex-direction', 'row-reverse' );
	await expect( nav ).toHaveCSS( 'writing-mode', 'horizontal-tb' );
	await expect( firstLink ).toHaveCSS( 'writing-mode', 'vertical-rl' );
	await expect( firstLink.locator( '.wp-block-navigation-item__label' ) ).toHaveCSS( 'writing-mode', 'vertical-rl' );
	// A single vertical writing axis for Core navigation and its links
	// preserves every Japanese glyph in Chromium, Firefox and WebKit.
	const labels = footer.locator( '.animewp-footer-official__sitemap .wp-block-navigation-item__label' );
	await expect( labels ).toHaveCount( 7 );
	// Keep a visual diagnostic even when the following glyph geometry fails.
	await capture( page, 'official-footer-desktop-before-glyph-check', { fullPage: false } );
	for ( const label of await labels.all() ) {
		const size = await label.evaluate( ( node ) => {
			const block = node.getBoundingClientRect();
			const range = document.createRange();
			range.selectNodeContents( node );
			const glyphs = range.getBoundingClientRect();
			return {
				characters: [ ...node.textContent.trim() ].length,
				height: block.height,
				glyphHeight: glyphs.height,
				visibleWithinColumn: glyphs.top >= block.top - 1 &&
					glyphs.bottom <= block.bottom + 1,
				labelText: node.textContent.trim(),
				boxWidth: block.width,
				glyphWidth: glyphs.width,
				computed: {
					display: getComputedStyle( node ).display,
					writingMode: getComputedStyle( node ).writingMode,
					orientation: getComputedStyle( node ).textOrientation,
					whiteSpace: getComputedStyle( node ).whiteSpace,
					fontSize: getComputedStyle( node ).fontSize,
					height: getComputedStyle( node ).height,
					minHeight: getComputedStyle( node ).minHeight,
					inlineSize: getComputedStyle( node ).inlineSize,
				},
				parent: node.parentElement?.outerHTML.slice( 0, 800 ),
			};
		} );
		expect( size.height ).toBeGreaterThanOrEqual( size.characters * 11 );
		// All text must retain its intrinsic glyph height, not just the CSS box.
		expect( size.glyphHeight ).toBeGreaterThan( size.characters * 8 );
		expect( size.visibleWithinColumn ).toBe( true );
	}
	const initial = await page.evaluate( () => document.documentElement.scrollWidth );
	expect( initial ).toBeLessThanOrEqual( 1281 );
	await capture( page, 'official-footer-desktop', { fullPage: false } );

	await page.setViewportSize( { width: 375, height: 900 } );
	await expect( nav ).toHaveCSS( 'writing-mode', 'horizontal-tb' );
	await expect( nav ).toHaveCSS( 'flex-direction', 'row' );
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
