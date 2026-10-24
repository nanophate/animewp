/*
 * Design-system acceptance checks against real saved block markup and the
 * WordPress-rendered theme, not only the editor preview or source CSS strings.
 *
 * Core owns content/typography/spacing. AnimeWP supplies structural geometry
 * and low-specificity defaults. A user's per-block choices must win.
 */
const { test, expect, fixtures, capture } = require( './helpers' );

test( 'official sitemap honors per-Paragraph font, weight, spacing and Column widths', async ( { page } ) => {
	await page.setViewportSize( { width: 1280, height: 900 } );
	await page.goto( fixtures().footer_official_customized.path );
	const footer = page.locator( '.animewp-footer-official' );
	const paragraph = footer.locator( '.animewp-footer-official__nav-item' ).first();
	const link = paragraph.locator( 'a' );
	const [ parentStyle, linkStyle ] = await Promise.all( [
		paragraph.evaluate( ( e ) => {
			const c = getComputedStyle( e );
			return { size: c.fontSize, weight: c.fontWeight, line: c.lineHeight, spacing: c.letterSpacing, family: c.fontFamily };
		} ),
		link.evaluate( ( e ) => {
			const c = getComputedStyle( e );
			return { size: c.fontSize, weight: c.fontWeight, line: c.lineHeight, spacing: c.letterSpacing, family: c.fontFamily };
		} ),
	] );
	expect( parentStyle.size ).toBe( '32px' );
	expect( parentStyle.weight ).toBe( '800' );
	expect( parentStyle.line ).toBe( '64px' );
	expect( linkStyle ).toEqual( parentStyle );
	const columns = footer.locator( '.animewp-footer-official__top > .wp-block-column' );
	await expect( columns.nth( 0 ) ).toHaveCSS( 'flex-basis', '70%' );
	await expect( columns.nth( 1 ) ).toHaveCSS( 'flex-basis', '30%' );
	await capture( page, 'design-custom-footer-desktop', { fullPage: false } );
} );

test( 'standalone footer metadata retains its compact defaults but custom block gap wins', async ( { page } ) => {
	await page.goto( fixtures().footer_official.path );
	const original = page.locator( '.animewp-footer-official__credit' );
	const originalSize = await original.evaluate( ( e ) => getComputedStyle( e ).fontSize );
	const originalGap = await original.evaluate( ( e ) => getComputedStyle( e ).columnGap );
	await page.goto( fixtures().part_footer_copyright_company.path );
	const independent = page.locator( '.animewp-footer-official__credit' );
	await expect( independent ).toBeVisible();
	await expect.poll( () => independent.evaluate( ( e ) => getComputedStyle( e ).fontSize ) ).toBe( originalSize );
	await expect.poll( () => independent.evaluate( ( e ) => getComputedStyle( e ).columnGap ) ).toBe( originalGap );
	// Core stores this variable on the Group when the author edits blockGap.
	await independent.evaluate( ( e ) => e.style.setProperty( '--wp--style--block-gap', '3rem' ) );
	await expect( independent ).toHaveCSS( 'column-gap', '48px' );
	await capture( page, 'design-standalone-footer-part', { fullPage: false } );
} );

test( 'video card title follows the editable root typography, metadata stays readable', async ( { page } ) => {
	await page.goto( fixtures().video_card_customized.path );
	const card = page.locator( '.wp-block-animewp-video-card' );
	const title = card.locator( '.animewp-video-card__title' );
	const label = card.locator( '.animewp-video-card__label' );
	await expect( card ).toBeVisible();
	await expect( card ).toHaveCSS( 'font-size', '24px' );
	await expect( card ).toHaveCSS( 'line-height', '72px' );
	await expect( title ).toHaveCSS( 'line-height', '72px' );
	const cardFamily = await card.evaluate( ( e ) => getComputedStyle( e ).fontFamily );
	const titleFamily = await title.evaluate( ( e ) => getComputedStyle( e ).fontFamily );
	expect( titleFamily ).toBe( cardFamily );
	await expect( label ).toHaveCSS( 'opacity', '1' );
	await capture( page, 'design-custom-video-card', { fullPage: false } );
} );

async function inspectVerticalGlyphs( heading ) {
	return heading.evaluate( ( element ) => {
		const bounds = element.getBoundingClientRect();
		const size = parseFloat( getComputedStyle( element ).fontSize );
		const glyphs = [];
		const walker = document.createTreeWalker( element, NodeFilter.SHOW_TEXT );
		while ( walker.nextNode() ) {
			const node = walker.currentNode;
			let offset = 0;
			for ( const glyph of [ ...node.textContent ] ) {
				const start = offset;
				offset += glyph.length;
				if ( ! glyph.trim() ) { continue; }
				const range = document.createRange();
				range.setStart( node, start );
				range.setEnd( node, offset );
				const rect = range.getBoundingClientRect();
				glyphs.push( { glyph, left: rect.left, top: rect.top, bottom: rect.bottom } );
			}
		}
		// The same vertical column has nearly the same left coordinate. Ignore
		// the separate line made by <br>, but require each glyph to advance.
		const groups = new Map();
		for ( const glyph of glyphs ) {
			const column = Math.round( glyph.left / 12 );
			if ( ! groups.has( column ) ) { groups.set( column, [] ); }
			groups.get( column ).push( glyph );
		}
		const overlaps = [];
		for ( const group of groups.values() ) {
			for ( let i = 1; i < group.length; i++ ) {
				const distance = group[ i ].top - group[ i - 1 ].top;
				if ( distance < size * 0.5 ) {
					overlaps.push( { prior: group[ i - 1 ].glyph, next: group[ i ].glyph, distance } );
				}
			}
		}
		return {
			writingMode: getComputedStyle( element ).writingMode,
			glyphs: glyphs.length,
			columns: groups.size,
			height: bounds.height,
			bottom: bounds.bottom,
			overlaps,
			clipped: glyphs.filter( ( glyph ) => glyph.top < bounds.top - 2 || glyph.bottom > bounds.bottom + 2 ),
		};
	} );
}

for ( const key of [ 'story_vertical', 'part_vertical_story_heading' ] ) {
	test( key + ' keeps distinct vertical glyph advances and returns to horizontal on mobile', async ( { page } ) => {
		await page.setViewportSize( { width: 1280, height: 900 } );
		await page.goto( fixtures()[ key ].path );
		const heading = page.locator( '.is-style-animewp-short-vertical' ).first();
		await expect( heading ).toBeVisible();
		const metrics = await inspectVerticalGlyphs( heading );
		expect( metrics.writingMode ).toBe( 'vertical-rl' );
		expect( metrics.glyphs ).toBeGreaterThan( 8 );
		expect( metrics.columns ).toBe( 2 );
		expect( metrics.overlaps, JSON.stringify( metrics ) ).toEqual( [] );
		expect( metrics.clipped, JSON.stringify( metrics ) ).toEqual( [] );
		await capture( page, 'design-' + key + '-vertical', { fullPage: false } );
		await page.setViewportSize( { width: 375, height: 900 } );
		await expect( heading ).toHaveCSS( 'writing-mode', 'horizontal-tb' );
		await expect( heading ).toHaveCSS( 'white-space', 'normal' );
		expect( await page.evaluate( () => document.documentElement.scrollWidth ) ).toBeLessThanOrEqual( 376 );
		await capture( page, 'design-' + key + '-mobile', { fullPage: false } );
	} );
}
