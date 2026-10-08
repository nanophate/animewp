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
