/**
 * Exercise the entire customer-facing pattern catalog in a real Gutenberg
 * iframe, not merely PHP registration or a serializer running in isolation.
 * The fixtures are real source patterns installed from the current theme ZIP.
 */
const { Editor } = require( '@wordpress/e2e-test-utils-playwright' );
const { test, expect, fixtures, login, capture } = require( './helpers' );

const batches = { parts: 8, examples: 7, layouts: 4, plugin: 1 };
const blockTypes = [
	'animewp/backdrop', 'animewp/carousel', 'animewp/decoration',
	'animewp/media', 'animewp/panel', 'animewp/text-group',
	'animewp/video', 'animewp/video-card',
];

async function ready( page, editor ) {
	await editor.setPreferences( 'core/edit-post', { welcomeGuide: false, welcomeGuideStyles: false, welcomeGuidePage: false } );
	await expect( page.locator( 'iframe[name="editor-canvas"]' ) ).toBeVisible();
	await page.waitForFunction( () => window.wp?.data?.select( 'core/block-editor' )?.getBlockCount() > 0 );
}

test( 'all 75 insertable patterns and eight blocks reach Gutenberg; two Query Loops stay internal', async ( { page } ) => {
	const catalog = fixtures().catalog;
	const expected = Object.values( catalog ).flatMap( ( groups ) => groups.flatMap( ( group ) => group.names ) );
	expect( expected ).toHaveLength( 43 + 19 + 13 + 2 );
	expect( new Set( expected ).size ).toBe( expected.length );
	await login( page );
	const editor = new Editor( { page } );
	await page.goto( '/wp-admin/post.php?post=' + catalog.parts[ 0 ].id + '&action=edit' );
	await ready( page, editor );
	await page.waitForFunction( () => ( window.wp?.data?.select( 'core' )?.getBlockPatterns?.() || [] ).length > 0 );
	const registered = await page.evaluate( () => ( {
		patterns: window.wp.data.select( 'core' ).getBlockPatterns().map( ( pattern ) => ( {
			name: pattern.name,
			visible: pattern.inserterEnabled !== false,
			categories: pattern.categories || [],
		} ) ),
		categories: ( window.wp.data.select( 'core' ).getBlockPatternCategories() || [] ).map( ( category ) => category.name ),
		blocks: window.wp.blocks.getBlockTypes().map( ( block ) => block.name ),
	} ) );
	const names = new Map( registered.patterns.map( ( pattern ) => [ pattern.name, pattern ] ) );
	for ( const slug of expected ) {
		if ( [ 'animewp/news-index', 'animewp/news-latest' ].includes( slug ) ) {
			// Internal Query Loop dependencies are not exposed as selectable
			// patterns. Their server-side inserterEnabled=false is verified by
			// wp-components.php; the editor store can normalize/omit this flag.
			continue;
		}
		expect( names.has( slug ), `Pattern absent from Gutenberg: ${ slug }` ).toBe( true );
		expect( names.get( slug ).visible, `Not offered in inserter: ${ slug }` ).toBe( true );
	}
	for ( const category of [ 'animewp-components', 'animewp-layout-parts', 'animewp-scene-parts' ] ) {
		expect( registered.categories ).toContain( category );
	}
	for ( const name of blockTypes ) {
		expect( registered.blocks ).toContain( name );
	}
} );

test( 'each of the eight custom blocks can be inserted, edited, saved and reopened', async ( { page } ) => {
	test.setTimeout( 180_000 );
	await login( page );
	const editor = new Editor( { page } );
	await page.goto( '/wp-admin/post.php?post=' + fixtures().block_edit_gallery.id + '&action=edit' );
	await ready( page, editor );
	const inserted = await page.evaluate( () => {
		const make = window.wp.blocks.createBlock;
		const paragraph = ( content ) => make( 'core/paragraph', { content } );
		const imageUrl = window.location.origin + '/wp-content/themes/animewp/assets/images/animewp-character-a.svg';
		const clip = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
		const created = [
			make( 'animewp/panel', { heading: 'QA editable panel' }, [ paragraph( 'QA panel body' ) ] ),
			make( 'animewp/text-group', { rotation: 6 }, [ paragraph( 'QA rotated text' ) ] ),
			make( 'animewp/media', { imageWidth: 58 }, [
				make( 'core/image', { url: imageUrl, alt: 'QA media image' } ),
				make( 'core/group', {}, [ paragraph( 'QA media body' ) ] ),
			] ),
			make( 'animewp/video', { source: 'youtube', videoUrl: clip }, [ paragraph( 'QA video body' ) ] ),
			make( 'animewp/carousel', { label: 'QA editable carousel', dotStyle: 'thumbnails' }, [
				make( 'core/group', {}, [ make( 'core/image', { url: imageUrl, alt: 'QA first slide' } ) ] ),
				make( 'core/group', {}, [ paragraph( 'QA second slide' ) ] ),
			] ),
			make( 'animewp/video-card', { title: 'QA video card', url: clip } ),
			make( 'animewp/backdrop', { mode: 'image', imageUrl, blur: 12 } ),
			make( 'animewp/decoration', { shape: 'petal', size: 5 } ),
		];
		const dispatch = window.wp.data.dispatch( 'core/block-editor' );
		dispatch.insertBlocks( created, 1, undefined, false );
		// Change a real Inspector-backed attribute on every new block.
		const changed = [
			{ heading: 'QA saved panel' }, { rotation: 8 }, { imageWidth: 62 },
			{ buttonLabel: 'QA saved play button' }, { label: 'QA saved carousel' },
			{ title: 'QA saved video card' }, { blur: 14 }, { size: 7 },
		];
		created.forEach( ( block, index ) => dispatch.updateBlockAttributes( block.clientId, changed[ index ] ) );
		return created.map( ( block ) => block.name );
	} );
	expect( inserted ).toEqual( [
		'animewp/panel', 'animewp/text-group', 'animewp/media', 'animewp/video',
		'animewp/carousel', 'animewp/video-card', 'animewp/backdrop', 'animewp/decoration',
	] );
	for ( const name of blockTypes ) {
		await expect( editor.canvas.locator( `[data-type="${ name }"]` ) ).toHaveCount( 1 );
	}
	await expect.poll( () => page.evaluate( () => window.wp.data.select( 'core/editor' ).isEditedPostDirty() ) ).toBe( true );
	await page.locator( '.editor-post-publish-button' ).first().click();
	await page.waitForFunction( () => ! window.wp.data.select( 'core/editor' ).isSavingPost() && ! window.wp.data.select( 'core/editor' ).isEditedPostDirty() );
	await page.reload();
	await ready( page, editor );
	const saved = await page.evaluate( () => window.wp.data.select( 'core/block-editor' ).getBlocks().slice( 1 ).map( ( block ) => ( {
		name: block.name, valid: block.isValid !== false,
		attributes: block.attributes,
	} ) ) );
	expect( saved.map( ( block ) => block.name ) ).toEqual( inserted );
	expect( saved.every( ( block ) => block.valid ) ).toBe( true );
	const expectedAttrs = [
		[ 'heading', 'QA saved panel' ], [ 'rotation', 8 ], [ 'imageWidth', 62 ],
		[ 'buttonLabel', 'QA saved play button' ], [ 'label', 'QA saved carousel' ],
		[ 'title', 'QA saved video card' ], [ 'blur', 14 ], [ 'size', 7 ],
	];
	saved.forEach( ( block, index ) => expect( block.attributes[ expectedAttrs[ index ][ 0 ] ] ).toBe( expectedAttrs[ index ][ 1 ] ) );
	await capture( page, 'all-eight-blocks-in-editor', { fullPage: false } );
	await page.goto( fixtures().block_edit_gallery.path );
	for ( const name of blockTypes ) {
		await expect( page.locator( '.wp-block-' + name.replace( '/', '-' ) ) ).toHaveCount( 1 );
	}
	await expect.poll( () => page.locator( '.wp-block-animewp-media img' ).evaluateAll( ( images ) =>
		images.length > 0 && images.every( ( img ) => img.complete && img.naturalWidth > 0 )
	) ).toBe( true );
	await capture( page, 'all-eight-blocks-published', { fullPage: false } );
} );

for ( const [ family, count ] of Object.entries( batches ) ) {
	for ( let index = 0; index < count; index++ ) {
		test( `${ family } catalog ${ index + 1 }: every part edits, saves and reloads without an invalid block`, async ( { page } ) => {
			test.setTimeout( 240_000 );
			const fixture = fixtures().catalog[ family ][ index ];
			expect( fixture ).toBeTruthy();
			await login( page );
			const editor = new Editor( { page } );
			await page.goto( '/wp-admin/post.php?post=' + fixture.id + '&action=edit' );
			await ready( page, editor );
			const result = await page.evaluate( ( names ) => {
				// Core 6.6+ can expose rich-text attributes as RichTextData
				// objects, not primitive strings. Their string value is the
				// editable markup, and updateBlockAttributes accepts a string.
				const richText = ( value ) => value == null ? '' : String( value );
				const inspect = ( blocks ) => {
					const invalid = [];
					const visit = ( block ) => {
						if ( block.isValid === false || block.name === 'core/missing' ) { invalid.push( block.name ); }
						( block.innerBlocks || [] ).forEach( visit );
					};
					blocks.forEach( visit );
					return invalid;
				};
				// Mutate the pattern itself, rather than the surrounding QA marker.
				const editLeaf = ( block, marker, dispatch ) => {
					const a = block.attributes || {};
					if ( [ 'core/paragraph', 'core/heading' ].includes( block.name ) && a.content != null ) {
						dispatch.updateBlockAttributes( block.clientId, { content: richText( a.content ) + ' ' + marker } );
						return true;
					}
					if ( block.name === 'core/button' ) {
						dispatch.updateBlockAttributes( block.clientId, { text: richText( a.text ) + ' ' + marker } );
						return true;
					}
					if ( block.name === 'animewp/video-card' ) {
						dispatch.updateBlockAttributes( block.clientId, { title: ( a.title || '' ) + ' ' + marker } );
						return true;
					}
					if ( block.name === 'core/table' && Array.isArray( a.body ) && a.body.length && a.body[ 0 ].cells?.length ) {
						const body = a.body.map( ( row, rowIndex ) => rowIndex === 0 ? {
							...row,
							cells: row.cells.map( ( cell, cellIndex ) => cellIndex === 0 ? { ...cell, content: ( cell.content || '' ) + ' ' + marker } : cell ),
						} : row );
						dispatch.updateBlockAttributes( block.clientId, { body } );
						return true;
					}
					if ( block.name === 'core/navigation-link' ) {
						dispatch.updateBlockAttributes( block.clientId, { label: ( a.label || '' ) + ' ' + marker } );
						return true;
					}
					if ( block.name === 'core/social-link' ) {
						dispatch.updateBlockAttributes( block.clientId, { url: 'https://example.org/' + marker } );
						return true;
					}
					if ( block.name === 'core/image' ) {
						dispatch.updateBlockAttributes( block.clientId, { alt: ( a.alt || '' ) + ' ' + marker } );
						return true;
					}
					if ( block.name === 'core/site-title' ) {
						dispatch.updateBlockAttributes( block.clientId, { level: 3, className: [ a.className, marker ].filter( Boolean ).join( ' ' ) } );
						return true;
					}
					if ( block.name === 'core/site-logo' ) {
						dispatch.updateBlockAttributes( block.clientId, { width: ( a.width || 100 ) + 1, className: [ a.className, marker ].filter( Boolean ).join( ' ' ) } );
						return true;
					}
					if ( block.name === 'core/query' && a.query ) {
						dispatch.updateBlockAttributes( block.clientId, { query: { ...a.query, perPage: ( a.query.perPage || 3 ) + 1 }, className: [ a.className, marker ].filter( Boolean ).join( ' ' ) } );
						return true;
					}
					for ( const nested of block.innerBlocks || [] ) {
						if ( editLeaf( nested, marker, dispatch ) ) { return true; }
					}
					return false;
				};
				const state = window.wp.data.select( 'core/block-editor' );
				const dispatch = window.wp.data.dispatch( 'core/block-editor' );
				const samples = state.getBlocks();
				const errors = [];
				if ( samples.length !== names.length ) {
					errors.push( `Expected ${ names.length } wrappers, found ${ samples.length }` );
				}
				names.forEach( ( name, i ) => {
					const wrapper = samples[ i ];
					const label = wrapper?.innerBlocks?.[ 0 ];
					if ( wrapper?.name !== 'core/group' || richText( label?.attributes?.content ) !== name ) {
						errors.push( `Wrong root/label for ${ name }: ${ wrapper?.name }, ${ label?.attributes?.content }` );
						return;
					}
					const fragment = wrapper.innerBlocks.slice( 1 );
					if ( ! fragment.length ) { errors.push( `Empty pattern: ${ name }` ); return; }
					const invalid = inspect( fragment );
					if ( invalid.length ) { errors.push( `Invalid blocks ${ name }: ${ invalid.join( ',' ) }` ); return; }
					const marker = 'QA_' + name.replace( /[^a-z0-9]/gi, '_' );
					if ( ! fragment.some( ( block ) => editLeaf( block, marker, dispatch ) ) ) {
						errors.push( `No editable leaf in ${ name }` );
					}
				} );
				return errors;
			}, fixture.names );
			expect( result, `Catalog ${ family } ${ index + 1 }` ).toEqual( [] );
			await expect.poll( () => page.evaluate( () => window.wp.data.select( 'core/editor' ).isEditedPostDirty() ) ).toBe( true );
			await page.locator( '.editor-post-publish-button' ).first().click();
			await page.waitForFunction( () => ! window.wp.data.select( 'core/editor' ).isSavingPost() && ! window.wp.data.select( 'core/editor' ).isEditedPostDirty() );
			await page.reload();
			await ready( page, editor );
			const saved = await page.evaluate( ( names ) => {
				const samples = window.wp.data.select( 'core/block-editor' ).getBlocks();
				const errors = [];
				const inspect = ( block ) => {
					if ( block.isValid === false || block.name === 'core/missing' ) { errors.push( `Invalid saved block ${ block.name }` ); }
					( block.innerBlocks || [] ).forEach( inspect );
				};
				samples.forEach( inspect );
				names.forEach( ( name, i ) => {
					const marker = 'QA_' + name.replace( /[^a-z0-9]/gi, '_' );
					const content = samples[ i ]?.innerBlocks?.slice( 1 ) || [];
					if ( ! JSON.stringify( content.map( ( block ) => ( { attributes: block.attributes, innerBlocks: block.innerBlocks } ) ) ).includes( marker ) ) {
						errors.push( `Edited content disappeared after reloading ${ name }` );
					}
				} );
				return errors;
			}, fixture.names );
			expect( saved ).toEqual( [] );
		} );

		test( `${ family } catalog ${ index + 1 }: standalone parts display real images without phone overflow`, async ( { page } ) => {
			test.setTimeout( 150_000 );
			const fixture = fixtures().catalog[ family ][ index ];
			for ( const width of [ 1280, 375 ] ) {
				await page.setViewportSize( { width, height: 900 } );
				await page.goto( fixture.path );
				await expect( page.locator( '.qa-catalog-sample' ) ).toHaveCount( fixture.names.length );
				const broken = await page.locator( '.qa-catalog-sample img[src]' ).evaluateAll( async ( images ) => {
					// Decode independently: off-screen images may still be lazily
					// deferred by Core, even though their URLs are perfectly valid.
					const checks = await Promise.all( images.map( async ( img ) => {
						const src = img.currentSrc || img.src;
						if ( ! src ) { return img.getAttribute( 'src' ) || '(empty src)'; }
						const probe = new Image();
						probe.src = src;
						const valid = await Promise.race( [
							probe.decode().then( () => probe.naturalWidth > 0, () => false ),
							new Promise( ( resolve ) => setTimeout( () => resolve( false ), 8000 ) ),
						] );
						return valid ? null : src;
					} ) );
					return checks.filter( Boolean );
				} );
				expect( broken, `Broken images in ${ family } ${ index + 1 } at ${ width }px` ).toEqual( [] );
				const overflow = await page.evaluate( () => document.documentElement.scrollWidth - document.documentElement.clientWidth );
				expect( overflow, `Horizontal overflow in ${ family } ${ index + 1 } at ${ width }px` ).toBeLessThanOrEqual( 1 );
			}
		} );
	}
}

