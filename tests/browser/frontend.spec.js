const { test, expect, wp, fixtures, capture } = require( './helpers' );

async function expectOpaque( locator ) {
	// A visible box can still have a transparent entrance-animated ancestor.
	// WebKit can stop a compositor animation a few ten-thousandths below 1;
	// that is visually opaque, while a genuinely pending reveal remains far lower.
	await expect.poll( () => locator.evaluate( ( element ) => {
		let opacity = 1;
		for ( let node = element; node; node = node.parentElement ) {
			opacity *= Number( getComputedStyle( node ).opacity );
		}
		return opacity;
	} ) ).toBeGreaterThan( 0.999 );
}

// Verify the actual server-rendered Query Loop contents, not only the
// browser's transient accessibility-name cache. Keep positive AX coverage for
// the news post, and report post types/titles if a page really leaks in.
async function expectPostOnlyNews( page, exampleKey ) {
	const news = page.locator( '#news .animewp-news-query' );
	await expect( news.getByRole( 'link', { name: fixtures().news.title, exact: true } ) ).toHaveAttribute( 'href', fixtures().news.url );
	const rows = await news.locator( '.wp-block-post-template > li.wp-block-post' ).evaluateAll( ( nodes ) =>
		nodes.map( ( node ) => ( {
			type: [ ...node.classList ].find( ( cls ) => cls.startsWith( 'type-' ) ) || null,
			title: node.querySelector( '.wp-block-post-title a' )?.textContent.trim() || null,
		} ) )
	);
	expect( rows.length ).toBeGreaterThan( 0 );
	expect( rows.every( ( row ) => row.type === 'type-post' ), JSON.stringify( rows ) ).toBe( true );
	const unexpectedTitle = fixtures()[ exampleKey ].title;
	const unexpectedLinks = await news.locator( 'a' ).evaluateAll(
		( links, title ) => links.filter( ( link ) => link.textContent.trim() === title ).map( ( link ) => link.getAttribute( 'href' ) ),
		unexpectedTitle
	);
	expect( unexpectedLinks, JSON.stringify( rows ) ).toEqual( [] );
}

test( 'core-only basic is readable at desktop and 375px', async ( { page } ) => {
	wp( 'plugin', 'deactivate', 'animewp-blocks' );
	try {
		for ( const width of [ 1280, 375 ] ) {
			await page.setViewportSize( { width, height: 900 } );
			await page.goto( fixtures().basic.path );
			await expect( page.locator( 'main h1' ).first() ).toBeVisible();
			await expect( page.locator( '#introduction' ) ).toBeVisible();
			await expectPostOnlyNews( page, 'basic' );
			expect( await page.evaluate( () => document.documentElement.scrollWidth ) ).toBeLessThanOrEqual( width + 1 );
			await capture( page, 'basic-' + width );
		}
	} finally { wp( 'plugin', 'activate', 'animewp-blocks' ); }
} );

test( 'Core Grid wraps five character cards and allows optional profile text', async ( { page } ) => {
	await page.setViewportSize( { width: 1280, height: 900 } );
	await page.goto( fixtures().basic.path );
	const grid = page.locator( '#characters .is-layout-grid' ).first();
	const cards = grid.locator( ':scope > .wp-block-group' );
	await expect( cards ).toHaveCount( 3 );
	await grid.evaluate( ( element ) => {
		const existing = [ ...element.children ].filter( ( child ) => child.classList.contains( 'wp-block-group' ) );
		element.append( existing[ 0 ].cloneNode( true ), existing[ 1 ].cloneNode( true ) );
		const phrase = document.createElement( 'p' );
		phrase.textContent = 'あとから追加するキャッチフレーズ';
		existing[ 0 ].appendChild( phrase );
	} );
	await expect( cards ).toHaveCount( 5 );
	await expect( cards.first().getByText( 'あとから追加するキャッチフレーズ' ) ).toBeVisible();

	for ( const width of [ 1280, 375 ] ) {
		await page.setViewportSize( { width, height: 900 } );
		const positions = await cards.evaluateAll( ( nodes ) => nodes.map( ( node ) => {
			const box = node.getBoundingClientRect();
			return { x: box.x, y: box.y, width: box.width };
		} ) );
		if ( width === 1280 ) {
			for ( const index of [ 1, 2 ] ) expect( Math.abs( positions[ index ].y - positions[ 0 ].y ) ).toBeLessThan( 2 );
			expect( positions[ 0 ].width ).toBeGreaterThan( 280 );
			expect( positions[ 3 ].y ).toBeGreaterThan( positions[ 0 ].y + 100 );
			expect( Math.abs( positions[ 4 ].y - positions[ 3 ].y ) ).toBeLessThan( 2 );
		} else {
			for ( let index = 1; index < positions.length; index++ ) {
				expect( Math.abs( positions[ index ].x - positions[ 0 ].x ) ).toBeLessThan( 2 );
				expect( positions[ index ].y ).toBeGreaterThan( positions[ index - 1 ].y );
			}
		}
		expect( await page.evaluate( () => document.documentElement.scrollWidth ) ).toBeLessThanOrEqual( width + 1 );
		await grid.screenshot( { path: `artifacts/browser-results/characters-five-${ width }.png` } );
	}
} );

test( 'character carousel renders thumbnail images and can switch to every profile', async ( { page } ) => {
	await page.goto( fixtures().simple.path );
	const carousel = page.getByRole( 'region', { name: 'キャラクター', exact: true } );
	await expect( carousel ).toHaveClass( /is-enhanced/ );
	const thumbs = carousel.locator( '.animewp-carousel__dots .animewp-carousel__dot' );
	await expect( thumbs ).toHaveCount( 3 );
	await expect( thumbs.locator( 'img' ) ).toHaveCount( 3 );
	await expect.poll( () => thumbs.locator( 'img' ).evaluateAll( ( images ) =>
		images.every( ( image ) => image.complete && image.naturalWidth > 0 )
	) ).toBe( true );
	const active = carousel.locator( '.animewp-carousel__track > .is-active' );
	await expect( active ).toContainText( '主人公の名前' );
	await carousel.getByRole( 'button', { name: '次へ' } ).click();
	await expect( active ).toContainText( '相棒の名前' );
	await expect( thumbs.nth( 1 ) ).toHaveAttribute( 'aria-current', 'true' );
	await thumbs.nth( 2 ).click();
	await expect( active ).toContainText( 'ライバルの名前' );
	await expect( thumbs.nth( 2 ) ).toHaveAttribute( 'aria-current', 'true' );
	await capture( page, 'character-carousel-thumbnails', { fullPage: false } );
} );

// Each width/example gets an isolated Playwright page and context. Reusing
// one page through six animated pages could intermittently close WebKit and
// made it impossible to tell which case failed.
for ( const key of [ 'simple', 'blur', 'drift' ] ) {
	for ( const width of [ 1280, 375 ] ) {
		test( `plugin ${key} at ${width}px shows posts, fits and keeps anchor headings visible`, async ( { page } ) => {
			await page.setViewportSize( { width, height: 900 } );
			await page.goto( fixtures()[ key ].path );
			// The example hero auto-advances every 7s. Freeze it through the
			// entrance-opacity checks so a slow browser cannot cross-fade to a
			// different slide while those assertions are polling.
			const heroCarousel = page.getByRole( 'region', { name: 'キービジュアル', exact: true } );
			await expect( heroCarousel ).toHaveClass( /is-enhanced/ );
			const pauseAutoplay = heroCarousel.locator( '.animewp-carousel__pause' );
			if ( await pauseAutoplay.count() ) {
				await pauseAutoplay.click();
				await expect( pauseAutoplay ).toHaveAttribute( 'aria-pressed', 'true' );
			}
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
			await expectPostOnlyNews( page, key );
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
