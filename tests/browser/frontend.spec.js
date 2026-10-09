const { test, expect, wp, fixtures, capture } = require( './helpers' );

async function expectOpaque( locator ) {
	// A visible box can still have a transparent entrance-animated ancestor.
	await expect.poll( () => locator.evaluate( ( element ) => {
		let opacity = 1;
		for ( let node = element; node; node = node.parentElement ) {
			opacity *= Number( getComputedStyle( node ).opacity );
		}
		return opacity;
	} ) ).toBe( 1 );
}

test( 'core-only basic is readable at desktop and 375px', async ( { page } ) => {
	wp( 'plugin', 'deactivate', 'animewp-blocks' );
	try {
		for ( const width of [ 1280, 375 ] ) {
			await page.setViewportSize( { width, height: 900 } );
			await page.goto( fixtures().basic.path );
			await expect( page.locator( 'main h1' ).first() ).toBeVisible();
			await expect( page.locator( '#introduction' ) ).toBeVisible();
			await expect( page.locator( '#news .animewp-news-query' ).getByRole( 'link', { name: fixtures().news.title, exact: true } ) ).toHaveAttribute( 'href', fixtures().news.url );
			await expect( page.locator( '#news .animewp-news-query' ).getByRole( 'link', { name: fixtures().basic.title, exact: true } ) ).toHaveCount( 0 );
			expect( await page.evaluate( () => document.documentElement.scrollWidth ) ).toBeLessThanOrEqual( width + 1 );
			await capture( page, 'basic-' + width );
		}
	} finally { wp( 'plugin', 'activate', 'animewp-blocks' ); }
} );

// Each width/example gets an isolated Playwright page and context. Reusing
// one page through six animated pages could intermittently close WebKit and
// made it impossible to tell which case failed.
for ( const key of [ 'simple', 'blur', 'drift' ] ) {
	for ( const width of [ 1280, 375 ] ) {
		test( `plugin ${key} at ${width}px shows posts, fits and keeps anchor headings visible`, async ( { page } ) => {
			await page.setViewportSize( { width, height: 900 } );
			await page.goto( fixtures()[ key ].path );
			await expect( page.locator( 'main h1' ).first() ).toBeVisible();
			expect( await page.evaluate( () => document.documentElement.scrollWidth ) ).toBeLessThanOrEqual( width + 1 );
			const hero = page.locator( '.animewp-carousel__track > .is-active' ).first();
			await expect( hero ).toHaveCSS( 'opacity', '1' );
			await expectOpaque( hero.locator( 'h1' ) );
			if ( key === 'blur' ) {
				const letters = hero.locator( 'h1 .animewp-letter' );
				await expect( letters.first() ).toBeVisible();
				await expect.poll( () => letters.evaluateAll( ( nodes ) => Math.min( ...nodes.map( ( node ) => Number( getComputedStyle( node ).opacity ) ) ) ) ).toBe( 1 );
			}
			await expect( page.getByRole( 'region', { name: 'キービジュアル', exact: true } ).locator( '.animewp-carousel__dot' ).first() ).toHaveAccessibleName( '1 / 2 作品タイトル' );
			await expect( page.getByRole( 'region', { name: '映像', exact: true } ).locator( '.animewp-carousel__dot' ).first() ).toHaveAccessibleName( '1 / 3 TRAILER 01 メイン映像' );
			// Record the visible hero before leaving it; offscreen entrance animations
			// have not run yet and should not be mistaken for missing page content.
			await capture( page, key + '-' + width + '-hero', { fullPage: false } );
			// Hash navigation also exercises mobile pages without requiring a hamburger click.
			await page.evaluate( () => { window.location.hash = 'news'; } );
			await expect( page.locator( '#news h2' ).first() ).toBeInViewport();
			await expectOpaque( page.locator( '#news h2' ).first() );
			const news = page.locator( '#news .animewp-news-query' );
			await expect( news.getByRole( 'link', { name: fixtures().news.title, exact: true } ) ).toHaveAttribute( 'href', fixtures().news.url );
			await expect( news.getByRole( 'link', { name: fixtures()[ key ].title, exact: true } ) ).toHaveCount( 0 );
			const positions = await page.evaluate( () => ( {
				heading: document.querySelector( '#news h2' ).getBoundingClientRect().top,
				header: document.querySelector( 'header' ).getBoundingClientRect().bottom,
			} ) );
			expect( positions.heading ).toBeGreaterThanOrEqual( positions.header - 1 );
			await capture( page, key + '-' + width + '-anchor', { fullPage: false } );
		} );
	}
}

test( 'carousel respects inputs and video connects only on explicit keyboard activation', async ( { page } ) => {
	const external = [];
	await page.route( '**/*', async ( route ) => {
		const host = new URL( route.request().url() ).hostname;
		if ( host && ! [ 'localhost', '127.0.0.1' ].includes( host ) ) { external.push( host ); await route.abort(); }
		else { await route.continue(); }
	} );
	await page.goto( fixtures().interaction.path );
	const carousel = page.locator( '.wp-block-animewp-carousel' );
	const track = carousel.locator( '.animewp-carousel__track' );
	await expect( carousel.getByRole( 'button', { name: 'Next', exact: true } ) ).toBeVisible();
	await track.focus();
	await page.keyboard.press( 'ArrowRight' );
	await expect( track.locator( ':scope > .is-active' ) ).toContainText( 'Second slide' );
	await page.keyboard.press( 'ArrowLeft' );
	await expect( track.locator( ':scope > .is-active' ) ).toContainText( 'First slide' );
	await page.locator( '.qa-input' ).focus();
	await page.keyboard.press( 'ArrowRight' );
	await page.waitForTimeout( 2200 ); // Autoplay must remain paused while editing an input.
	await expect( track.locator( ':scope > .is-active' ) ).toContainText( 'First slide' );
	expect( external ).toEqual( [] );
	const open = page.getByRole( 'link', { name: 'Play QA video' } );
	await open.focus();
	await page.keyboard.press( 'Enter' );
	const dialog = page.getByRole( 'dialog' );
	await expect( dialog ).toBeVisible();
	await expect.poll( () => external.some( ( host ) => host === 'www.youtube-nocookie.com' ) ).toBe( true );
	await page.keyboard.press( 'Tab' );
	expect( await dialog.evaluate( ( element ) => element.contains( document.activeElement ) ) ).toBe( true );
	await page.keyboard.press( 'Shift+Tab' );
	expect( await dialog.evaluate( ( element ) => element.contains( document.activeElement ) ) ).toBe( true );
	await page.keyboard.press( 'Escape' );
	await expect( dialog ).not.toBeVisible();
	await expect( open ).toBeFocused();
	await expect( page.locator( 'iframe' ) ).toHaveCount( 0 );
	await capture( page, 'keyboard-dialog-return' );
} );

test( 'combined motion stops when reduced motion changes during the visit', async ( { page } ) => {
	await page.goto( fixtures().interaction.path );
	const motion = page.locator( '#qa-motion' );
	// A floating element never becomes stable. Move the viewport without disabling
	// its animation, then verify the real hover state rather than waiting for stillness.
	await motion.evaluate( ( element ) => element.scrollIntoView( { block: 'center', behavior: 'instant' } ) );
	// Re-target the pointer while the element floats. A one-time forced hover
	// can lose :hover as the box moves, particularly in Firefox; simply
	// polling the old pointer location is not a meaningful interaction check.
	await expect.poll( async () => {
		const rect = await motion.boundingBox();
		if ( ! rect ) { return false; }
		await page.mouse.move( rect.x + rect.width / 2, rect.y + rect.height / 2 );
		return motion.evaluate( ( element ) => element.matches( ':hover' ) );
	} ).toBe( true );
	await expect( motion ).toHaveClass( /has-parallax/ );
	await expect.poll( () => motion.evaluate( ( element ) => getComputedStyle( element ).animationName ) ).toContain( 'animewp-float' );
	await page.emulateMedia( { reducedMotion: 'reduce' } );
	await expect.poll( () => motion.evaluate( ( element ) => {
		const style = getComputedStyle( element );
		return { animation: style.animationName, translate: style.translate, opacity: style.opacity };
	} ) ).toEqual( { animation: 'none', translate: 'none', opacity: '1' } );
	await capture( page, 'reduced-motion' );
} );

test.describe( 'JavaScript disabled', () => {
	test.use( { javaScriptEnabled: false, viewport: { width: 375, height: 900 } } );
	test( 'no-JavaScript preserves content and the original video link', async ( { page } ) => {
		await page.goto( fixtures().interaction.path );
		await expect( page.getByText( 'First slide', { exact: true } ) ).toBeVisible();
		await expect( page.getByRole( 'link', { name: 'Play QA video' } ) ).toHaveAttribute( 'href', /youtube\.com\/watch/ );
		await expect( page.locator( 'iframe' ) ).toHaveCount( 0 );
		// CSS float also runs without JavaScript; opacity and full-page capture do
		// not require Playwright's stable-element scrolling precondition.
		await expect( page.locator( '#qa-motion' ) ).toHaveCSS( 'opacity', '1' );
		await capture( page, 'no-javascript-375' );
	} );
} );
