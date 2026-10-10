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
	const sitemap = footer.locator( 'nav.animewp-footer-official__sitemap' );
	const links = sitemap.locator( '.animewp-footer-official__nav-item a' );
	await expect( sitemap ).toBeVisible();
	await expect( links ).toHaveCount( 7 );
	await expect( sitemap ).toHaveCSS( 'flex-direction', 'row-reverse' );
	await expect( links.first() ).toHaveCSS( 'writing-mode', 'vertical-rl' );
	await capture( page, 'official-footer-desktop-before-glyph-check', { fullPage: false } );
	for ( const link of await links.all() ) {
		const size = await link.evaluate( ( node ) => {
			const bounds = node.getBoundingClientRect();
			const textNode = node.firstChild;
			const characters = [ ...( textNode?.textContent || '' ).trim() ];
			const rects = [];
			let offset = 0;
			for ( const character of characters ) {
				const range = document.createRange();
				range.setStart( textNode, offset );
				offset += character.length; // Handles surrogate pairs.
				range.setEnd( textNode, offset );
				const rect = range.getBoundingClientRect();
				rects.push( { top: rect.top, bottom: rect.bottom } );
			}
			const top = Math.min( ...rects.map( ( rect ) => rect.top ) );
			const bottom = Math.max( ...rects.map( ( rect ) => rect.bottom ) );
			return {
				characters: characters.length,
				height: bounds.height,
				glyphSpan: bottom - top,
				visibleWithinColumn: rects.every( ( rect ) => rect.top >= bounds.top - 1 && rect.bottom <= bounds.bottom + 1 ),
				text: node.textContent.trim(),
			};
		} );
		if ( size.height < size.characters * 11 || size.glyphSpan <= size.characters * 8 || ! size.visibleWithinColumn ) {
			console.log( 'Footer vertical link geometry:', JSON.stringify( size ) );
		}
		expect( size.height ).toBeGreaterThanOrEqual( size.characters * 11 );
		// Measure each rendered character. A single Range over vertical text has
		// inconsistent bounds across engines and can report only one glyph.
		expect( size.glyphSpan ).toBeGreaterThan( size.characters * 8 );
		expect( size.visibleWithinColumn ).toBe( true );
	}
	const initial = await page.evaluate( () => document.documentElement.scrollWidth );
	expect( initial ).toBeLessThanOrEqual( 1281 );
	await capture( page, 'official-footer-desktop', { fullPage: false } );

	await page.setViewportSize( { width: 375, height: 900 } );
	await expect( sitemap ).toHaveCSS( 'flex-direction', 'row' );
	await expect( links.first() ).toHaveCSS( 'writing-mode', 'horizontal-tb' );
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
		await expect( footer.locator( 'nav.animewp-footer-official__sitemap .animewp-footer-official__nav-item a' ).first() ).toBeVisible();
		await expect( footer.locator( '.wp-block-social-links .wp-social-link' ) ).toHaveCount( 4 );
	} );
} );
