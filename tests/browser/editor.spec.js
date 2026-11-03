const { Editor } = require( '@wordpress/e2e-test-utils-playwright' );
const { test, expect, fixtures, login, capture } = require( './helpers' );

async function ready( page, editor, scope ) {
	await editor.setPreferences( scope, { welcomeGuide: false, welcomeGuideStyles: false, welcomeGuideTemplate: false, welcomeGuidePage: false } );
	await expect( page.locator( 'iframe[name="editor-canvas"]' ) ).toBeVisible();
	await page.waitForFunction( () => window.wp?.data?.select( 'core/block-editor' )?.getBlockCount() > 0 );
	await expect.poll( () => page.evaluate( () => {
		const invalid = [];
		const walk = ( blocks ) => blocks.forEach( ( block ) => {
			if ( block.isValid === false || block.name === 'core/missing' ) { invalid.push( block.name ); }
			walk( block.innerBlocks || [] );
		} );
		walk( window.wp.data.select( 'core/block-editor' ).getBlocks() );
		return invalid;
	} ) ).toEqual( [] );
}

test( 'Post Editor iframe validates, edits, saves and reloads core and plugin examples', async ( { page } ) => {
	await login( page );
	const editor = new Editor( { page } );
	for ( const key of [ 'basic', 'drift' ] ) {
		await page.goto( '/wp-admin/post.php?post=' + fixtures()[ key ].id + '&action=edit' );
		await ready( page, editor, 'core/edit-post' );
		const paragraph = editor.canvas.locator( '[data-type="core/paragraph"][contenteditable="true"]' ).first();
		const text = 'Browser QA saved paragraph ' + key;
		await paragraph.fill( text );
		await page.locator( '.editor-post-publish-button' ).first().click();
		await page.waitForFunction( () => ! window.wp.data.select( 'core/editor' ).isSavingPost() && ! window.wp.data.select( 'core/editor' ).isEditedPostDirty() );
		await page.reload();
		await ready( page, editor, 'core/edit-post' );
		await expect( editor.canvas.getByText( text, { exact: true } ) ).toBeVisible();
		await capture( page, 'post-editor-' + key );
	}
} );

test( 'character carousel editor shows thumbnails and navigates five editable slides', async ( { page } ) => {
	await login( page );
	const editor = new Editor( { page } );
	await page.goto( '/wp-admin/post.php?post=' + fixtures().carousel_edit_five.id + '&action=edit' );
	await ready( page, editor, 'core/edit-post' );
	const carouselId = await page.evaluate( () => {
		const find = ( blocks ) => {
			for ( const block of blocks ) {
				if ( block.name === 'animewp/carousel' && block.attributes.label === 'キャラクター' ) {
					return block.clientId;
				}
				const nested = find( block.innerBlocks || [] );
				if ( nested ) { return nested; }
			}
			return null;
		};
		return find( window.wp.data.select( 'core/block-editor' ).getBlocks() );
	} );
	expect( carouselId ).toBeTruthy();
	const carousel = editor.canvas.locator( `[data-block="${ carouselId }"]` );
	const nav = carousel.locator( '.animewp-carousel__nav' );
	const dots = nav.locator( '.animewp-carousel__dot' );
	await expect( dots ).toHaveCount( 3 );
	await expect( dots.locator( 'img' ) ).toHaveCount( 3 );
	await expect.poll( () => dots.locator( 'img' ).evaluateAll( ( images ) =>
		images.every( ( image ) => image.complete && image.naturalWidth > 0 )
	) ).toBe( true );
	const slideIds = await page.evaluate( ( id ) =>
		window.wp.data.select( 'core/block-editor' ).getBlocks( id ).map( ( block ) => block.clientId ),
		carouselId
	);
	await nav.getByRole( 'button', { name: '次へ' } ).click();
	await expect.poll( () => page.evaluate( () =>
		window.wp.data.select( 'core/block-editor' ).getSelectedBlockClientId()
	) ).toBe( slideIds[ 1 ] );
	await expect( dots.nth( 1 ) ).toHaveAttribute( 'aria-current', 'true' );

	// Adding slides must grow the picker; it must not stay at three blank slots.
	await page.evaluate( ( id ) => {
		const blocks = window.wp.data.select( 'core/block-editor' ).getBlocks( id );
		window.wp.data.dispatch( 'core/block-editor' ).insertBlocks(
			[ window.wp.blocks.cloneBlock( blocks[ 0 ] ), window.wp.blocks.cloneBlock( blocks[ 1 ] ) ],
			blocks.length,
			id,
			false
		);
	}, carouselId );
	await expect( dots ).toHaveCount( 5 );
	await expect( dots.locator( 'img' ) ).toHaveCount( 5 );
	await dots.nth( 4 ).click();
	await expect( dots.nth( 4 ) ).toHaveAttribute( 'aria-current', 'true' );
	const lastSlideId = await page.evaluate( ( id ) =>
		window.wp.data.select( 'core/block-editor' ).getBlocks( id )[ 4 ].clientId,
		carouselId
	);
	await expect.poll( () => page.evaluate( () =>
		window.wp.data.select( 'core/block-editor' ).getSelectedBlockClientId()
	) ).toBe( lastSlideId );
	await capture( page, 'character-editor-five-thumbnails', { fullPage: false } );
	await page.locator( '.editor-post-publish-button' ).first().click();
	await page.waitForFunction( () => ! window.wp.data.select( 'core/editor' ).isSavingPost() && ! window.wp.data.select( 'core/editor' ).isEditedPostDirty() );
	await page.reload();
	await ready( page, editor, 'core/edit-post' );
	const savedCount = await page.evaluate( () => window.wp.data.select( 'core/block-editor' ).getBlocks().find( ( block ) => block.name === 'animewp/carousel' )?.innerBlocks.length );
	expect( savedCount ).toBe( 5 );
	await expect( editor.canvas.locator( '.animewp-carousel__nav .animewp-carousel__dot img' ) ).toHaveCount( 5 );
	await page.goto( fixtures().carousel_edit_five.path );
	const publicCarousel = page.getByRole( 'region', { name: 'キャラクター', exact: true } );
	const publicThumbs = publicCarousel.locator( '.animewp-carousel__dots .animewp-carousel__dot' );
	await expect( publicThumbs ).toHaveCount( 5 );
	await expect( publicThumbs.locator( 'img' ) ).toHaveCount( 5 );
	await expect.poll( () => publicThumbs.locator( 'img' ).evaluateAll( ( images ) => images.every( ( image ) => image.complete && image.naturalWidth > 0 ) ) ).toBe( true );
	await publicThumbs.nth( 4 ).click();
	await expect( publicThumbs.nth( 4 ) ).toHaveAttribute( 'aria-current', 'true' );
	await publicCarousel.getByRole( 'button', { name: '次へ' } ).click();
	await expect( publicThumbs.first() ).toHaveAttribute( 'aria-current', 'true' );
	await capture( page, 'character-five-saved-public', { fullPage: false } );
} );

for ( const kind of [ 'characters', 'cast' ] ) {
	test( `${ kind } Core Grid: duplicate five cards, add a phrase, save, reload and display 3+2`, async ( { page } ) => {
		await login( page );
		const editor = new Editor( { page } );
		const fixture = fixtures()[ 'grid_edit_' + kind ];
		await page.goto( '/wp-admin/post.php?post=' + fixture.id + '&action=edit' );
		await ready( page, editor, 'core/edit-post' );
		const phrase = '自由に追加したキャッチフレーズ — ' + kind;
		const edited = await page.evaluate( ( text ) => {
			const store = window.wp.data.select( 'core/block-editor' );
			const find = ( blocks ) => {
				for ( const block of blocks ) {
					if ( block.name === 'core/group' && block.attributes.layout?.type === 'grid' ) { return block; }
					const nested = find( block.innerBlocks || [] );
					if ( nested ) { return nested; }
				}
				return null;
			};
			const grid = find( store.getBlocks() );
			if ( ! grid || grid.innerBlocks.length !== 3 ) { return false; }
			const dispatch = window.wp.data.dispatch( 'core/block-editor' );
			const cards = grid.innerBlocks;
			dispatch.insertBlocks( [ window.wp.blocks.cloneBlock( cards[ 0 ] ), window.wp.blocks.cloneBlock( cards[ 1 ] ) ], 3, grid.clientId, false );
			dispatch.insertBlocks( [ window.wp.blocks.createBlock( 'core/paragraph', { content: text } ) ], cards[ 0 ].innerBlocks.length, cards[ 0 ].clientId, false );
			return true;
		}, phrase );
		expect( edited ).toBe( true );
		await expect.poll( () => page.evaluate( () => window.wp.data.select( 'core/editor' ).isEditedPostDirty() ) ).toBe( true );
		await page.locator( '.editor-post-publish-button' ).first().click();
		await page.waitForFunction( () => ! window.wp.data.select( 'core/editor' ).isSavingPost() && ! window.wp.data.select( 'core/editor' ).isEditedPostDirty() );
		await page.reload();
		await ready( page, editor, 'core/edit-post' );
		const saved = await page.evaluate( ( text ) => {
			const find = ( blocks ) => {
				for ( const block of blocks ) {
					if ( block.name === 'core/group' && block.attributes.layout?.type === 'grid' ) { return block; }
					const nested = find( block.innerBlocks || [] );
					if ( nested ) { return nested; }
				}
				return null;
			};
			const grid = find( window.wp.data.select( 'core/block-editor' ).getBlocks() );
			return { count: grid?.innerBlocks.length, phrase: JSON.stringify( grid?.innerBlocks[ 0 ] ).includes( text ), valid: grid?.innerBlocks.every( ( block ) => block.isValid !== false ) };
		}, phrase );
		expect( saved ).toEqual( { count: 5, phrase: true, valid: true } );
		await capture( page, `${ kind }-grid-editor-five`, { fullPage: false } );
		await page.goto( fixture.path );
		const grid = page.locator( '.is-layout-grid' ).first();
		const cards = grid.locator( ':scope > .wp-block-group' );
		await expect( cards ).toHaveCount( 5 );
		await expect( cards.first() ).toContainText( phrase );
		for ( const width of [ 1280, 375 ] ) {
			await page.setViewportSize( { width, height: 900 } );
			const rects = await cards.evaluateAll( ( nodes ) => nodes.map( ( node ) => {
				const box = node.getBoundingClientRect();
				return { x: box.x, y: box.y };
			} ) );
			if ( width === 1280 ) {
				expect( Math.abs( rects[ 0 ].y - rects[ 1 ].y ) ).toBeLessThan( 2 );
				expect( Math.abs( rects[ 0 ].y - rects[ 2 ].y ) ).toBeLessThan( 2 );
				expect( rects[ 3 ].y ).toBeGreaterThan( rects[ 0 ].y + 100 );
				expect( Math.abs( rects[ 3 ].y - rects[ 4 ].y ) ).toBeLessThan( 2 );
			} else {
				for ( let i = 1; i < rects.length; i++ ) {
					expect( Math.abs( rects[ i ].x - rects[ 0 ].x ) ).toBeLessThan( 2 );
					expect( rects[ i ].y ).toBeGreaterThan( rects[ i - 1 ].y );
				}
			}
			await grid.screenshot( { path: `artifacts/browser-results/${ kind }-grid-five-${ width }.png` } );
		}
	} );
}

test( 'Site Editor iframe keeps edited template content after save and reload', async ( { page } ) => {
	await login( page );
	const editor = new Editor( { page } );
	await page.goto( '/wp-admin/site-editor.php?postType=wp_template&postId=' + encodeURIComponent( fixtures().template.id ) + '&canvas=edit' );
	await ready( page, editor, 'core/edit-site' );
	await editor.canvas.locator( '[data-type="core/paragraph"][contenteditable="true"]' ).first().fill( 'Browser QA template saved through the editor.' );
	// Only this saved template is dirty, so core saves without a second entities panel.
	await editor.saveSiteEditorEntities( { isOnlyCurrentEntityDirty: true } );
	await page.reload();
	await ready( page, editor, 'core/edit-site' );
	await expect( editor.canvas.getByText( 'Browser QA template saved through the editor.', { exact: true } ) ).toBeVisible();
	await capture( page, 'site-editor-saved-template' );
} );
