const { test, expect, fixtures, login } = require( './helpers' );

async function registeredBlocks( page ) {
	await login( page );
	await page.goto( '/wp-admin/post.php?post=' + fixtures().drift.id + '&action=edit' );
	await page.waitForFunction( () => window.wp?.blocks?.getBlockType( 'animewp/video-card' ) && window.wp.blocks.getBlockType( 'animewp/panel' ) );
}

test( 'video label text is escaped at the actual saved attribute boundary', async ( { page } ) => {
	await registeredBlocks( page );
	const cases = [
		{ title: '<strong>作品</strong> &amp; 続編', label: '', expected: 'Play 作品 & 続編' },
		{ title: '&lt;img src=x onerror=&quot;marker&quot;&gt;', label: '', expected: 'Play <img src=x onerror="marker">' },
		{ title: '&#34; onfocus=&#34;marker&#34; data-injected=&#34;1', label: '', expected: 'Play " onfocus="marker" data-injected="1' },
		{ title: "&#39; &amp; &lt; &gt;", label: '', expected: "Play ' & < >" },
		{ title: '作品 <em>続編', label: '', expected: 'Play 作品 続編' },
		{ title: '', label: '<i>ラベル &amp; 説明</i>', expected: 'Play ラベル & 説明' },
		{ title: '', label: '', expected: 'Play' },
	];
	const results = await page.evaluate( ( samples ) => {
		const { createBlock, getSaveContent } = window.wp.blocks;
		return samples.map( ( sample ) => {
			const block = createBlock( 'animewp/video-card', {
				source: 'file', url: '/wp-content/uploads/security-fixture.mp4',
				playLabel: 'Play', closeLabel: 'Close', title: sample.title, label: sample.label,
			} );
			const saved = getSaveContent( block.name, block.attributes, [] );
			// Parse only in an inert template. Never append test payloads to the page.
			// This proves the link's attribute boundary, not sanitization of arbitrary
			// RichText caption HTML or authorization of server-side post content.
			const template = document.createElement( 'template' );
			template.innerHTML = saved;
			const link = template.content.querySelector( '.animewp-video-card__link' );
			if ( ! link ) { throw new Error( 'The real block save did not produce a link' ); }
			return {
				name: link.getAttribute( 'aria-label' ),
				href: link.getAttribute( 'href' ),
				injectedAttributes: Array.from( link.attributes, ( item ) => item.name ).filter( ( name ) => /^on/i.test( name ) || name === 'data-injected' ),
				injectedElements: link.querySelectorAll( 'script, iframe, img, svg, object' ).length,
			};
		} );
	}, cases );
	for ( let index = 0; index < cases.length; index++ ) {
		expect( results[ index ], cases[ index ].title || 'label fallback' ).toEqual( {
			name: cases[ index ].expected,
			href: '/wp-content/uploads/security-fixture.mp4',
			injectedAttributes: [], injectedElements: 0,
		} );
	}
} );

test( 'current and frozen panel save retain the legacy heading-length decision', async ( { page } ) => {
	await registeredBlocks( page );
	const cases = [
		{ heading: '', vertical: false },
		{ heading: '<em></em>', vertical: false },
		{ heading: '<strong>' + '字'.repeat( 40 ) + '</strong>', vertical: true },
		{ heading: '字'.repeat( 41 ), vertical: false },
		{ heading: '&amp;'.repeat( 8 ), vertical: true },
		{ heading: '&amp;'.repeat( 9 ), vertical: false },
		{ heading: '😀'.repeat( 20 ), vertical: true },
		{ heading: '😀'.repeat( 21 ), vertical: false },
	];
	const results = await page.evaluate( ( samples ) => {
		const { createBlock, getBlockType, getSaveContent } = window.wp.blocks;
		const current = getBlockType( 'animewp/panel' );
		if ( ! current.deprecated?.[ 0 ] ) { throw new Error( 'Missing frozen v1 panel save' ); }
		const legacy = { ...current, ...current.deprecated[ 0 ] };
		const legacyDefaults = Object.fromEntries( Object.entries( legacy.attributes ).filter( ( [ , schema ] ) => Object.prototype.hasOwnProperty.call( schema, 'default' ) ).map( ( [ name, schema ] ) => [ name, schema.default ] ) );
		return samples.map( ( sample ) => {
			const attributes = { heading: sample.heading, verticalHeading: true, backgroundOpacity: 50 };
			const block = createBlock( current.name, attributes );
			return [
				getSaveContent( current, block.attributes, [] ),
				getSaveContent( legacy, { ...legacyDefaults, ...attributes }, [] ),
			].map( ( saved ) => {
				const template = document.createElement( 'template' );
				template.innerHTML = saved;
				const panel = template.content.querySelector( 'section' );
				if ( ! panel ) { throw new Error( 'The real panel save did not produce a section' ); }
				return {
					vertical: panel.classList.contains( 'animewp-panel--vertical-heading' ),
					opacity: panel.style.getPropertyValue( '--animewp-panel-opacity' ),
				};
			} );
		} );
	}, cases );
	for ( let index = 0; index < cases.length; index++ ) {
		expect( results[ index ] ).toEqual( [
			{ vertical: cases[ index ].vertical, opacity: '0.5' },
			{ vertical: cases[ index ].vertical, opacity: '0.5px' },
		] );
	}
} );
