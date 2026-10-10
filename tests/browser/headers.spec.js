const { test, expect, fixtures, login, capture } = require( './helpers' );

async function expectMeasuredHeader( page ) {
	await expect.poll( () => page.evaluate( () => {
		const header = document.querySelector( 'header.wp-block-template-part' );
		const measured = parseFloat( getComputedStyle( document.documentElement ).getPropertyValue( '--animewp-sticky-header-height' ) );
		return Math.abs( measured - header.offsetHeight );
	} ) ).toBeLessThanOrEqual( 1 );
}

async function expectClearTarget( page ) {
	await expect( page.locator( '#qa-header-target' ) ).toBeInViewport();
	await expect.poll( () => page.evaluate( () => document.querySelector( '#qa-header-target' ).getBoundingClientRect().top
		- document.querySelector( 'header.wp-block-template-part' ).getBoundingClientRect().bottom ) ).toBeGreaterThanOrEqual( -1 );
}

async function scrollTo( page, top ) {
	await page.evaluate( ( value ) => window.scrollTo( { top: value, behavior: 'instant' } ), top );
	await expect.poll( () => page.evaluate( () => window.scrollY ) ).toBeCloseTo( top, 0 );
}

async function documentTop( locator ) {
	return locator.evaluate( ( element ) => element.getBoundingClientRect().top + window.scrollY );
}

test( 'saved sticky headers measure direct links, resized images and compact motion; side menus stay readable', async ( { page } ) => {
	const errors = [];
	page.on( 'pageerror', ( error ) => errors.push( error.message ) );
	await page.goto( fixtures().header_tall.path + '#qa-header-target' );
	const header = page.locator( 'header.wp-block-template-part' );
	await expect( header ).toHaveCSS( 'position', 'sticky' );
	await expect( header.locator( ':scope > .is-position-sticky' ) ).toHaveCount( 1 );
	await expectMeasuredHeader( page );
	expect( ( await header.boundingBox() ).height ).toBeGreaterThan( 160 );
	await expectClearTarget( page );
	await capture( page, 'header-direct-anchor', { fullPage: false } );

	// The observer must follow an author's larger illustration without moving
	// the reader back to an old fragment. The next real link uses the new height.
	await page.locator( '#qa-header-image' ).evaluate( ( image ) => { image.style.height = '200px'; } );
	await expectMeasuredHeader( page );
	expect( ( await header.boundingBox() ).height ).toBeGreaterThan( 220 );
	await page.setViewportSize( { width: 375, height: 900 } );
	await page.evaluate( () => window.scrollTo( 0, 0 ) );
	await page.getByRole( 'link', { name: 'Jump to header target' } ).click();
	await expectMeasuredHeader( page );
	await expectClearTarget( page );
	await capture( page, 'header-resized-mobile-anchor', { fullPage: false } );

	await page.setViewportSize( { width: 1280, height: 900 } );
	await page.goto( fixtures().header_compact.path );
	await expectMeasuredHeader( page );
	const fullHeight = ( await header.boundingBox() ).height;
	expect( fullHeight ).toBeGreaterThanOrEqual( 88 );
	await page.getByRole( 'link', { name: 'Jump to header target' } ).click();
	await expect( page.locator( 'html' ) ).toHaveClass( /animewp-is-scrolled/ );
	await expect.poll( async () => ( await header.boundingBox() ).height ).toBeLessThan( fullHeight - 10 );
	await expectMeasuredHeader( page );
	await expectClearTarget( page );
	await capture( page, 'header-compact', { fullPage: false } );

	for ( const side of [ 'left', 'right' ] ) {
		await page.goto( fixtures()[ 'header_' + side ].path );
		const sideHeader = page.locator( '.animewp-header--' + side );
		await expect( sideHeader ).toHaveCSS( 'position', 'fixed' );
		const menu = sideHeader.locator( 'nav .wp-block-navigation__container' ).first();
		expect( ( await menu.boundingBox() ).width ).toBeGreaterThan( 100 );
		if ( side === 'left' ) {
			const brand = await sideHeader.locator( '.animewp-brand' ).boundingBox();
			expect( Math.abs( ( await menu.boundingBox() ).x - brand.x ) ).toBeLessThanOrEqual( 2 );
		}
		await page.setViewportSize( { width: 1000, height: 900 } );
		await expect( sideHeader ).not.toHaveCSS( 'position', 'fixed' );
		await page.setViewportSize( { width: 375, height: 900 } );
		await expect( sideHeader.locator( '.wp-block-navigation__responsive-container-open' ) ).toBeVisible();
		expect( await page.evaluate( () => document.documentElement.scrollWidth ) ).toBeLessThanOrEqual( 376 );
		await capture( page, 'header-' + side + '-mobile', { fullPage: false } );
		await page.setViewportSize( { width: 1280, height: 900 } );
	}
	expect( errors ).toEqual( [] );
} );

test( 'logged-in sticky headers follow the fixed or scrolling WordPress toolbar at mobile breakpoints', async ( { page } ) => {
	await login( page );
	for ( const width of [ 1280, 700, 600, 375 ] ) {
		await page.setViewportSize( { width, height: 900 } );
		await page.goto( fixtures().header_compact.path + '#qa-header-target' );
		const toolbar = page.locator( '#wpadminbar' );
		await expect( toolbar ).toHaveCSS( 'position', width <= 600 ? 'absolute' : 'fixed' );
		await expect( page.locator( 'html' ) ).toHaveClass( /animewp-is-scrolled/ );
		await expectMeasuredHeader( page );
		const expectedTop = width <= 600 ? 0 : ( await toolbar.boundingBox() ).height;
		await expect.poll( () => page.locator( 'header.wp-block-template-part' ).evaluate( ( element ) => element.getBoundingClientRect().top ) ).toBeCloseTo( expectedTop, 0 );
		await expectClearTarget( page );
		await capture( page, 'header-toolbar-' + width, { fullPage: false } );
	}
} );

test( 'saved scroll distances apply independently and never hide the keyboard focus', async ( { page } ) => {
	await page.goto( fixtures().header_scroll_distance.path );
	await expect( page.locator( 'html' ) ).toHaveClass( /animewp-motion-ready/ );
	const early = page.locator( '#qa-scroll-early' );
	const late = page.locator( '#qa-scroll-late' );
	await expect( early ).not.toBeVisible();
	await expect( late ).not.toBeVisible();

	await scrollTo( page, 200 );
	await expect( early ).not.toHaveClass( /is-scrolled-active/ );
	await expect( late ).not.toHaveClass( /is-scrolled-active/ );
	await scrollTo( page, 300 );
	await expect( early ).toBeVisible();
	await expect( early ).toHaveClass( /is-scrolled-active/ );
	await expect( late ).not.toBeVisible();
	await scrollTo( page, 800 );
	await expect( late ).toBeVisible();
	await expect( late ).toHaveClass( /is-scrolled-active/ );

	const focused = late.getByRole( 'link', { name: 'Late navigation' } );
	await focused.focus();
	await scrollTo( page, 0 );
	await expect( focused ).toBeFocused();
	await expect( focused ).toBeVisible();
	await expect( early ).not.toBeVisible();
	await focused.evaluate( ( element ) => element.blur() );
	await expect( late ).not.toBeVisible();
} );

test( 'hero header keeps the artwork clear and follows the cover boundary without a layout jump', async ( { page } ) => {
	await page.goto( fixtures().header_after_hero.path );
	await expect( page.locator( 'html' ) ).toHaveClass( /animewp-motion-ready/ );
	const header = page.locator( '.animewp-header--hero' );
	const part = page.locator( 'header.wp-block-template-part' );
	const cover = page.locator( '#qa-header-cover' );
	const menu = header.locator( '.wp-block-navigation__responsive-container-open' );
	await expect( part ).toHaveCSS( 'position', 'fixed' );
	await expect( header ).toHaveClass( /animewp-header--petal/ );
	await expect( header ).toHaveCSS( 'min-height', '56px' );
	await expect( header.locator( '.wp-block-site-logo, .wp-block-site-title' ) ).toHaveCount( 0 );
	await expect( menu ).toBeVisible();
	await expect.poll( () => menu.evaluate( ( element ) => getComputedStyle( element, '::after' ).width ) ).toBe( '8px' );
	await expect( header ).not.toHaveClass( /is-scrolled-active/ );
	const initialMainTop = await documentTop( page.locator( 'main' ) );
	expect( initialMainTop ).toBeLessThanOrEqual( 1 );
	const boundary = await cover.evaluate( ( element ) => element.getBoundingClientRect().bottom + window.scrollY );
	await scrollTo( page, boundary - 20 );
	await expect( menu ).toBeVisible();
	await expect( header ).not.toHaveClass( /is-scrolled-active/ );
	await capture( page, 'header-hero-before-cover-end', { fullPage: false } );
	await scrollTo( page, boundary + 20 );
	await expect( header ).toHaveClass( /is-scrolled-active/ );
	await expect( menu ).not.toBeVisible();
	await expect( header.getByRole( 'link' ).first() ).toBeVisible();
	// Screenshot the settled navigation, not an in-between animation frame.
	await expect.poll( () => header.locator( '.wp-block-navigation__container' ).first().evaluate(
		( element ) => getComputedStyle( element ).opacity
	) ).toBe( '1' );
	expect( await documentTop( page.locator( 'main' ) ) ).toBeCloseTo( initialMainTop, 0 );
	expect( ( await part.boundingBox() ).height ).toBeLessThan( 80 );
	await capture( page, 'header-hero-after-cover-end', { fullPage: false } );
	// Switching to the phone layout must not hide the link that currently owns
	// keyboard focus. The ordinary menu button can resume after focus leaves.
	const focusedLink = header.getByRole( 'link' ).first();
	await focusedLink.focus();
	await page.setViewportSize( { width: 375, height: 900 } );
	await expect( focusedLink ).toBeFocused();
	await expect( focusedLink ).toBeVisible();
	await focusedLink.evaluate( ( element ) => element.blur() );
	await expect( menu ).toBeVisible();
	await page.setViewportSize( { width: 1280, height: 900 } );
	await expect( menu ).not.toBeVisible();

	// Image loading or responsive Cover edits can change the boundary without
	// scrolling. Disable browser scroll anchoring so this specifically exercises
	// the observer's geometry update, rather than an incidental scroll event.
	await page.evaluate( () => { document.documentElement.style.overflowAnchor = 'none'; } );
	await cover.evaluate( ( element ) => { element.style.minHeight = '1200px'; } );
	await expect.poll( () => page.evaluate( () => window.scrollY ) ).toBeCloseTo( boundary + 20, 0 );
	await expect( header ).not.toHaveClass( /is-scrolled-active/ );
	await expect( menu ).toBeVisible();
	await scrollTo( page, 0 );
	expect( await documentTop( page.locator( 'main' ) ) ).toBeCloseTo( initialMainTop, 0 );
} );

test( 'hero menu stays accessible above the artwork and its overlay is not clipped by the glass', async ( { page } ) => {
	await page.goto( fixtures().header_after_hero.path );
	const header = page.locator( '.animewp-header--hero' );
	const open = header.locator( '.wp-block-navigation__responsive-container-open' );
	await expect( open ).toBeVisible();
	await open.focus();
	await page.keyboard.press( 'Enter' );
	const dialog = header.locator( '.wp-block-navigation__responsive-container.is-menu-open' );
	await expect( dialog ).toBeVisible();
	await expect( dialog.getByRole( 'link' ).first() ).toBeVisible();
	for ( const width of [ 1280, 375 ] ) {
		await page.setViewportSize( { width, height: 900 } );
		await expect.poll( async () => {
			const box = await dialog.boundingBox();
			return box && Math.max( Math.abs( box.x ), Math.abs( box.y ), Math.abs( box.width - width ), Math.abs( box.height - 900 ) );
		} ).toBeLessThanOrEqual( 1 );
		expect( await page.evaluate( () => document.documentElement.scrollWidth ) ).toBeLessThanOrEqual( width + 1 );
	}
	await capture( page, 'header-hero-mobile-menu', { fullPage: false } );
	await page.keyboard.press( 'Escape' );
	await expect( dialog ).toHaveCount( 0 );
	await expect( open ).toBeFocused();
	await expect( open ).toBeVisible();
} );

test( 'missing covers fail open and reduced-motion headers change state without transitions', async ( { page } ) => {
	await page.goto( fixtures().header_after_hero_missing.path );
	await expect( page.locator( 'html' ) ).toHaveClass( /animewp-motion-ready/ );
	const header = page.locator( '.animewp-header--hero' );
	await expect( page.locator( 'header.wp-block-template-part' ) ).not.toHaveCSS( 'position', 'fixed' );
	await expect( header ).not.toHaveClass( /animewp-scroll-ready/ );
	await expect( header.getByRole( 'link' ).first() ).toBeVisible();

	await page.emulateMedia( { reducedMotion: 'reduce' } );
	await page.goto( fixtures().header_after_hero.path );
	await expect( header.locator( '.wp-block-navigation__responsive-container-open' ) ).toBeVisible();
	await scrollTo( page, 1000 );
	await expect( header ).toHaveClass( /is-scrolled-active/ );
	await expect( header.getByRole( 'link' ).first() ).toBeVisible();
	await expect( header ).toHaveCSS( 'transition-duration', '0s' );
	await expect.poll( () => header.evaluate( ( element ) => getComputedStyle( element, '::before' ).transitionDuration ) ).toBe( '0s' );
} );

test.describe( 'header navigation without JavaScript', () => {
	test.use( { javaScriptEnabled: false, viewport: { width: 375, height: 900 } } );
	test( 'hero links remain available without a scripted menu or scroll controller', async ( { page } ) => {
		await page.goto( fixtures().header_after_hero.path );
		const header = page.locator( '.animewp-header--hero' );
		await expect( page.locator( 'header.wp-block-template-part' ) ).toHaveCSS( 'position', 'fixed' );
		expect( await documentTop( page.locator( 'main' ) ) ).toBeLessThanOrEqual( 1 );
		await expect( header.getByRole( 'link' ).first() ).toBeVisible();
		await expect( header.locator( '.wp-block-navigation__responsive-container-open' ) ).not.toBeVisible();
		await expect( header.locator( '.wp-block-navigation__responsive-container-close' ) ).not.toBeVisible();
		expect( await page.evaluate( () => document.documentElement.scrollWidth ) ).toBeLessThanOrEqual( 376 );
		await capture( page, 'header-hero-no-javascript', { fullPage: false } );
		await header.getByRole( 'link' ).first().click();
		await expect( page.locator( '#news' ) ).toBeInViewport();
	} );
	test( 'explicit hero falls back to ordinary links with no JS or marker', async ( { page } ) => {
		await page.goto( fixtures().header_explicit_missing.path );
		await expect( page.locator( 'header.wp-block-template-part' ) ).not.toHaveCSS( 'position', 'fixed' );
		await expect( page.locator( '.animewp-header--hero' ).getByRole( 'link' ).first() ).toBeVisible();
		await page.goto( fixtures().header_explicit_marked.path );
		await expect( page.locator( 'header.wp-block-template-part' ) ).toHaveCSS( 'position', 'fixed' );
		await expect( page.locator( '.animewp-header--hero' ).getByRole( 'link' ).first() ).toBeVisible();
	} );
} );

// Compatibility regression: pre-existing saved headers still pin to the
// first Cover anywhere in the content. Explicit-only headers are opt-in.
test( 'legacy nested heroes keep their layout and explicit mode requires marking', async ( { page } ) => {
	for ( const key of [ 'header_after_hero_late', 'header_after_hero_nested_late' ] ) {
		await page.goto( fixtures()[ key ].path );
		const header = page.locator( '.animewp-header--hero' );
		const part = page.locator( 'header.wp-block-template-part' );
		await expect( part ).toHaveCSS( 'position', 'fixed' );
		await expect( header ).toHaveClass( /animewp-scroll-ready/ );
		const initialMainTop = await documentTop( page.locator( 'main' ) );
		const cover = page.locator( '#qa-header-cover' );
		const boundary = await cover.evaluate( ( el ) => el.getBoundingClientRect().bottom + window.scrollY );
		await scrollTo( page, boundary + 20 );
		await expect( header ).toHaveClass( /is-scrolled-active/ );
		expect( await documentTop( page.locator( 'main' ) ) ).toBeCloseTo( initialMainTop, 0 );
	}

	await page.goto( fixtures().header_explicit_missing.path );
	const header = page.locator( '.animewp-header--hero' );
	const part = page.locator( 'header.wp-block-template-part' );
	await expect( header ).toHaveClass( /animewp-header--explicit-hero/ );
	await expect( part ).not.toHaveCSS( 'position', 'fixed' );
	await expect( header ).not.toHaveClass( /animewp-scroll-ready/ );
	await expect( header.getByRole( 'link' ).first() ).toBeVisible();
	await page.evaluate( () => window.scrollTo( { top: 1100, behavior: 'instant' } ) );
	await expect( header ).not.toHaveClass( /is-scrolled-active/ );

	await page.goto( fixtures().header_explicit_marked.path );
	await expect( part ).toHaveCSS( 'position', 'fixed' );
	await expect( header ).toHaveClass( /animewp-scroll-ready/ );
	const cover = page.locator( '#qa-header-cover' );
	const boundary = await cover.evaluate( ( el ) => el.getBoundingClientRect().bottom + window.scrollY );
	await scrollTo( page, boundary + 20 );
	await expect( header ).toHaveClass( /is-scrolled-active/ );
} );
