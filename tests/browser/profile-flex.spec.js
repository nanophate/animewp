'use strict';
const { Editor } = require( '@wordpress/e2e-test-utils-playwright' );
const { test, expect, fixtures, login, capture } = require( './helpers' );

async function selectForEditing( page, id ) {
	await page.evaluate( ( clientId ) => {
		window.wp.data.dispatch( 'core/block-editor' ).selectBlock( clientId );
		window.wp.data.dispatch( 'core/edit-post' ).openGeneralSidebar( 'edit-post/block' );
	}, id );
	await expect( page.locator( '.animewp-profile-tools' ) ).toBeVisible();
}
async function profileLayout( page ) {
	return page.evaluate( () => {
		const find = ( blocks, wantsRows ) => {
			for ( const block of blocks ) {
				if ( block.name === 'core/group' &&
					( wantsRows
						? ( block.attributes.className || '' ).includes( 'animewp-profile-rows' )
						: block.attributes.layout?.type === 'grid' &&
							( block.attributes.className || '' ).includes( 'animewp-profile-grid' )
					) ) {
					return block;
				}
				const nested = find( block.innerBlocks || [], wantsRows );
				if ( nested ) { return nested; }
			}
			return null;
		};
		const all = window.wp.data.select( 'core/block-editor' ).getBlocks();
		const rows = find( all, true );
		const grid = find( all, false );
		return rows ? {
			id: rows.clientId,
			rows: rows.innerBlocks.map( ( row ) => ( {
				id: row.clientId,
				columns: row.innerBlocks.length,
				cards: row.innerBlocks.map( ( column ) => column.innerBlocks[ 0 ]?.clientId ),
			} ) ),
		} : grid ? { id: grid.clientId, cards: grid.innerBlocks.map( ( card ) => card.clientId ) } : null;
	} );
}

for ( const [ kind, split, counts ] of [
	[ 'characters', '2＋3', [ 2, 3 ] ],
	[ 'cast', '3＋2', [ 3, 2 ] ],
] ) {
	test( 'editable ' + kind + ': extend, split, combine core blocks, save and reload', async ( { page } ) => {
		test.setTimeout( 240_000 );
		await login( page );
		const editor = new Editor( { page } );
		const fixture = fixtures()[ 'profile_flex_' + kind ];
		await page.goto( '/wp-admin/post.php?post=' + fixture.id + '&action=edit' );
		await editor.setPreferences( 'core/edit-post', { welcomeGuide: false, welcomeGuidePage: false } );
		await expect( page.locator( 'iframe[name="editor-canvas"]' ) ).toBeVisible();
		const first = await profileLayout( page );
		expect( first.cards ).toHaveLength( 3 );
		for ( const desired of [ 4, 5 ] ) {
			await selectForEditing( page, first.id );
			await page.locator( '.animewp-profile-tools' ).getByRole( 'button', { name: 'カードを追加' } ).click();
			await expect.poll( () => profileLayout( page ).then( ( layout ) => layout.cards?.length ) ).toBe( desired );
		}
		await selectForEditing( page, first.id );
		await page.locator( '.animewp-profile-tools' ).getByRole( 'button', { name: split + 'の行に変換' } ).click();
		await expect.poll( () => profileLayout( page ).then( ( layout ) => layout.rows?.map( ( row ) => row.columns ) ) ).toEqual( counts );
		let layout = await profileLayout( page );
		const cardId = layout.rows[ 0 ].cards[ 0 ];
		await selectForEditing( page, cardId );
		await page.locator( '.animewp-profile-tools' ).getByRole( 'button', { name: 'キャッチフレーズを追加' } ).click();
		await selectForEditing( page, cardId );
		await page.locator( '.animewp-profile-tools' ).getByRole( 'button', { name: '2カラムを追加' } ).click();
		await expect.poll( () => page.evaluate( ( id ) =>
			window.wp.data.select( 'core/block-editor' ).getBlocks( id ).some( ( block ) =>
				block.name === 'core/columns' && block.innerBlocks.length === 2
			), cardId
		) ).toBe( true );
		// Editing remains unlocked: standard Gutenberg can delete a column,
		// and the new card action can create its replacement.
		const second = layout.rows[ 1 ];
		await page.evaluate( ( id ) => {
			const col = window.wp.data.select( 'core/block-editor' ).getBlocks( id )[ 0 ];
			window.wp.data.dispatch( 'core/block-editor' ).removeBlock( col.clientId );
		}, second.id );
		await expect.poll( () => profileLayout( page ).then( ( data ) => data.rows[ 1 ].columns ) ).toBe( counts[ 1 ] - 1 );
		await selectForEditing( page, layout.id );
		await page.locator( '.animewp-profile-tools' ).getByRole( 'button', { name: 'カードを追加' } ).click();
		await expect.poll( () => profileLayout( page ).then( ( data ) => data.rows[ 1 ].columns ) ).toBe( counts[ 1 ] );
		await selectForEditing( page, layout.id );
		await page.locator( '.animewp-profile-tools' ).getByRole( 'button', { name: '行を追加' } ).click();
		await expect.poll( () => profileLayout( page ).then( ( data ) => data.rows.length ) ).toBe( 3 );
		await page.locator( '.editor-post-publish-button' ).first().click();
		await page.waitForFunction( () => ! window.wp.data.select( 'core/editor' ).isSavingPost() &&
			! window.wp.data.select( 'core/editor' ).isEditedPostDirty() );
		await page.reload();
		await expect( page.locator( 'iframe[name="editor-canvas"]' ) ).toBeVisible();
		layout = await profileLayout( page );
		expect( layout.rows.map( ( row ) => row.columns ) ).toEqual( [ ...counts, 1 ] );
		const persisted = await page.evaluate( () => {
			const walk = ( blocks ) => blocks.flatMap( ( block ) => [ block, ...walk( block.innerBlocks || [] ) ] );
			const all = walk( window.wp.data.select( 'core/block-editor' ).getBlocks() );
			return {
				invalid: all.filter( ( block ) => block.isValid === false || block.name === 'core/missing' ).length,
				phrase: all.some( ( block ) => String( block.attributes.content || '' ).includes( 'キャッチフレーズを入力' ) ),
				nestedColumns: all.filter( ( block ) => block.name === 'core/columns' ).length,
			};
		} );
		expect( persisted.invalid ).toBe( 0 );
		expect( persisted.phrase ).toBe( true );
		expect( persisted.nestedColumns ).toBeGreaterThanOrEqual( 4 );
		await capture( page, 'profile-flex-' + kind + '-editor', { fullPage: false } );
		await page.goto( fixture.path );
		const rows = page.locator( '.animewp-profile-rows > .wp-block-columns' );
		await expect( rows ).toHaveCount( 3 );
		for ( let i = 0; i < 2; i++ ) {
			await expect( rows.nth( i ).locator( ':scope > .wp-block-column' ) ).toHaveCount( counts[ i ] );
		}
		await expect( page.getByText( 'キャッチフレーズを入力' ).first() ).toBeVisible();
		for ( const width of [ 1280, 375 ] ) {
			await page.setViewportSize( { width, height: 900 } );
			await expect.poll( () => page.evaluate( () => document.documentElement.scrollWidth <= innerWidth + 1 ) ).toBe( true );
			await rows.first().screenshot( { path: 'artifacts/browser-results/profile-flex-' + kind + '-' + width + '.png' } );
		}
	} );
}
