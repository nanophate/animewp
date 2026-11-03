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
	await page.goto( '/wp-admin/post.php?post=' + fixtures().simple.id + '&action=edit' );
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
} );

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
