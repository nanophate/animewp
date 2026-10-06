/**
 * Deterministic inputs for the serialization comparison: saved documents
 * (fixtures and patterns) plus generated blocks covering every attribute.
 */
'use strict';
const fs = require( 'node:fs' );
const path = require( 'node:path' );
const ORIGIN = 'http://localhost:8888';

const ROOT = path.resolve( __dirname, '../..' );

/** Saved HTML documents: version fixtures and pattern markup. */
function documents() {
	const docs = {};
	const fixtures = path.join( ROOT, 'tests/fixtures' );
	for ( const file of fs.readdirSync( fixtures ).sort() ) {
		docs[ 'fixture/' + file ] = fs.readFileSync( path.join( fixtures, file ), 'utf8' );
	}
	const patternDirs = [ 'plugins/animewp-blocks/patterns', 'themes/animewp/patterns' ];
	for ( const dir of patternDirs ) {
		for ( const file of fs.readdirSync( path.join( ROOT, dir ) ).sort() ) {
			const source = fs.readFileSync( path.join( ROOT, dir, file ), 'utf8' );
			if ( ! source.includes( 'wp:animewp/' ) ) {
				continue;
			}
			const heredoc = /<<<'HTML'\n([\s\S]*?)\nHTML;/.exec( source );
			let html = heredoc ? heredoc[ 1 ] : source.replace( /^<\?php[\s\S]*?\?>\n?/, '' );
			// Theme patterns print asset URLs with PHP; a fixed site path stands in.
			html = html.replace( /<\?php[\s\S]*?\?>/g, '/wp-content/themes/animewp/assets/images/animewp-key-visual-b.svg' );
			docs[ 'pattern/' + dir.split( '/' )[ 0 ] + '/' + file ] = html;
		}
	}
	return docs;
}

/** Small seeded PRNG so every run generates identical cases. */
function prng( seed ) {
	return () => {
		seed |= 0;
		seed = ( seed + 0x6d2b79f5 ) | 0;
		let t = Math.imul( seed ^ ( seed >>> 15 ), 1 | seed );
		t = ( t + Math.imul( t ^ ( t >>> 7 ), 61 | t ) ) ^ t;
		return ( ( t ^ ( t >>> 14 ) ) >>> 0 ) / 4294967296;
	};
}

const SUPPORT_POOL = {
	align: [ undefined, 'wide', 'full' ],
	className: [ undefined, 'qa-extra', 'is-style-x qa-two' ],
	anchor: [ undefined, 'section-a' ],
	backgroundColor: [ undefined, 'accent', 'surface' ],
	textColor: [ undefined, 'contrast' ],
	gradient: [ undefined, 'animewp-wash' ],
	fontSize: [ undefined, 'large' ],
	style: [
		undefined,
		{ color: { background: '#111111', text: '#eeeeee' } },
		{ color: { background: 'url(x)' } },
		{ color: { gradient: 'linear-gradient(135deg, rgb(20, 20, 20) 0%, rgb(245, 245, 245) 100%)' } },
		{ color: { text: '#202020' } },
		{ spacing: { blockGap: '3rem' } },
		{ spacing: { blockGap: 'var:preset|spacing|40', padding: { top: '2rem', bottom: '1rem' } } },
		{ spacing: { blockGap: 'calc(1px + 2px)' }, typography: { lineHeight: '1.8' } },
		{ spacing: { margin: { top: '3rem', bottom: '3rem' } }, typography: { textAlign: 'center' } },
	],
};

const URLS = [
	'',
	'https://youtu.be/jNQXAC9IVRw?t=1m2s',
	'https://www.youtube.com/watch?v=jNQXAC9IVRw&start=30',
	'https://www.youtube.com/shorts/jNQXAC9IVRw',
	'https://vimeo.com/76979871#t=1m',
	'https://vimeo.com/76979871?h=private',
	'/wp-content/uploads/clip.mp4',
	ORIGIN + '/wp-content/uploads/clip.mp4',
	'https://cdn.example.test/clip.mp4',
	'javascript:alert(1)',
	'//evil.test/x.mp4',
	'https://user:pass@example.test/x.mp4',
];

const POOLS = {
	'animewp/carousel': {
		slideWidth: [ 100, 64, 30, 120 ],
		effect: [ 'slide', 'fade' ],
		navStyle: [ 'icon', 'text', 'line', 'none' ],
		showDots: [ true, false ],
		dotStyle: [ 'dots', 'numbers', 'thumbnails' ],
		autoplay: [ 0, 6, 30 ],
		loop: [ true, false ],
		emphasizeActive: [ false, true ],
		prevLabel: [ '前へ', 'PREV', '', 'x'.repeat( 60 ) ],
	},
	'animewp/video-card': {
		source: [ 'youtube', 'vimeo', 'file' ],
		url: URLS,
		posterUrl: [ '', '/wp-content/uploads/poster.jpg', ORIGIN + '/wp-content/uploads/poster.jpg', 'https://evil.test/p.jpg' ],
		label: [ '', 'TRAILER 01', '<strong>PV</strong>' ],
		title: [ '', 'メイン映像', 'A &amp; B' ],
		aspectRatio: [ '16/9', '9/16', '5/4' ],
		playLabel: [ '再生', '' ],
		closeLabel: [ '閉じる', 'Close' ],
	},
	'animewp/backdrop': {
		mode: [ 'follow', 'image', 'file', 'follow-video' ],
		imageUrl: [ '', '/wp-content/uploads/bg.jpg', 'https://evil.test/bg.jpg' ],
		videoUrl: [ '', '/wp-content/uploads/loop.mp4', 'javascript:x' ],
		blur: [ 24, 0, 200 ],
		veil: [ 55, 0, 100 ],
		focalX: [ 50, 0, 100 ],
	},
	'animewp/panel': {
		heading: [ '', '短い見出し', '<strong>太字</strong>と<em>斜体</em>', 'あ'.repeat( 41 ), 'A &amp; B &lt; C' ],
		headingLevel: [ 2, 3, 6, 7 ],
		verticalHeading: [ false, true ],
		backdropEnabled: [ false, true ],
		backdropColor: [ '#e5e5e5', '#123456', 'red', 'rgb(1, 2, 3)', 'url(x)', 'var(--x)' ],
		boundary: [ 'none', 'wave', 'diagonal', 'zigzag' ],
		backgroundSkew: [ 0, 5, -12, -20, 1.5 ],
		backgroundRotation: [ 0, 3, -8, 9 ],
		rotation: [ 0, 4, -8, 100, 0.5 ],
		backgroundOpacity: [ 100, 0, 40, 55.5, 150 ],
		radius: [ 0, 30, 200 ],
		panelShadow: [ 'none', 'soft', 'hard' ],
		textShadow: [ 'none', 'soft', 'hard' ],
		highlight: [ 'none', 'line', 'panel' ],
		highlightColor: [ '#e5e5e5', '#cccccc', 'bad;color:red' ],
		highlightPadding: [ 0.2, 0, 1, 3 ],
		backdropColorMode: [ 'custom', 'preset', 'role' ],
		backdropPreset: [ '', 'accent', '日本語', 'bad slug!' ],
		backdropRole: [ 'surface', 'accent', 'contrast' ],
		highlightColorMode: [ 'custom', 'preset', 'role' ],
		highlightPreset: [ '', 'surface', 'bad slug!' ],
		highlightRole: [ 'surface', 'accent', 'contrast' ],
	},
	'animewp/text-group': {
		rotation: [ 0, 3, -8, 20, 2.5 ],
		mobileRotation: [ 0, 1, -8, -30 ],
	},
	'animewp/media': {
		layoutMode: [ 'side', 'overlay' ],
		imageSide: [ 'left', 'right' ],
		imageWidth: [ 50, 20, 80, 10, 95, 33.3 ],
		crop: [ false, true ],
		focalX: [ 50, 0, 100, 120 ],
		focalY: [ 50, 20, -5 ],
		mobileFocalX: [ 50, 10 ],
		mobileFocalY: [ 50, 90 ],
		independentMobileFocus: [ false, true ],
		imageHeight: [ 400, 120, 1200, 50, 5000 ],
		mobileImageHeight: [ 280, 120, 800, 900 ],
	},
	'animewp/video': {
		source: [ 'file', 'youtube', 'vimeo' ],
		videoUrl: URLS,
		videoId: [ 0, 12 ],
		posterUrl: [ '', '/wp-content/uploads/poster.jpg', ORIGIN + '/wp-content/uploads/poster.jpg', 'https://evil.test/p.jpg' ],
		buttonLabel: [ '動画を開く', '', '  再生する  ', 'x'.repeat( 150 ) ],
		closeLabel: [ '閉じる', '', 'Close' ],
		trackUrl: [ '', '/wp-content/uploads/ja.vtt', 'https://cdn.example.test/ja.vtt', 'javascript:x' ],
		crossOriginMode: [ 'same-origin', 'anonymous' ],
		trackLanguage: [ 'ja', 'en-US', 'bad lang!' ],
		trackLabel: [ '日本語', '', 'English' ],
		description: [ '', '説明文', 'desc <b>tag</b> & amp' ],
	},
};

function innerBlocks( make, name, random ) {
	const paragraph = ( text ) => make( 'core/paragraph', { content: text } );
	if ( name === 'animewp/carousel' ) {
		return [
			make( 'animewp/video-card', { url: URLS[ 1 ], label: 'TRAILER 01', title: 'メイン映像', posterUrl: '/wp-content/uploads/a.jpg' } ),
			make( 'core/image', { url: ORIGIN + '/wp-content/uploads/b.jpg', alt: '画像' } ),
		];
	}
	if ( name === 'animewp/video-card' || name === 'animewp/backdrop' ) {
		return [];
	}
	if ( name === 'animewp/media' ) {
		return [
			make( 'core/image', { url: ORIGIN + '/wp-content/uploads/a.jpg', alt: 'QA', sizeSlug: 'large', linkDestination: 'none' } ),
			make( 'core/group', { layout: { type: 'default' } }, [ make( 'core/heading', { content: '見出し' } ), paragraph( '本文' ) ] ),
		];
	}
	const choice = Math.floor( random() * 3 );
	if ( choice === 0 ) {
		return [];
	}
	if ( choice === 1 ) {
		return [ paragraph( '入れ子本文を保持します。' ) ];
	}
	return [ make( 'core/heading', { level: 3, content: '見出し' } ), paragraph( '二つ目' ) ];
}

/** Generated blocks: one-attribute sweeps, then seeded random combinations. */
function generatedBlocks( make, perBlock = 400 ) {
	const cases = {};
	for ( const [ name, pool ] of Object.entries( POOLS ) ) {
		const random = prng( name.length * 7919 );
		let index = 0;
		const add = ( attributes ) => {
			cases[ name + '#' + index++ ] = () => make( name, attributes, innerBlocks( make, name, random ) );
		};
		add( {} );
		for ( const [ key, values ] of Object.entries( { ...pool, ...SUPPORT_POOL } ) ) {
			for ( const value of values ) {
				if ( value !== undefined ) {
					add( { [ key ]: value } );
				}
			}
		}
		for ( let i = 0; i < perBlock; i++ ) {
			const attributes = {};
			for ( const [ key, values ] of Object.entries( { ...pool, ...SUPPORT_POOL } ) ) {
				if ( random() < 0.5 ) {
					const value = values[ Math.floor( random() * values.length ) ];
					if ( value !== undefined ) {
						attributes[ key ] = value;
					}
				}
			}
			add( attributes );
		}
	}
	// Nesting: decorations must not leak into children.
	cases[ 'nested/panel-in-panel' ] = () =>
		make( 'animewp/panel', { rotation: 3, backgroundSkew: 5, backdropEnabled: true, heading: '外側' }, [
			make( 'animewp/panel', { backdropEnabled: true, heading: '内側' }, [ make( 'core/paragraph', { content: '子' } ) ] ),
		] );
	cases[ 'nested/text-in-text' ] = () =>
		make( 'animewp/text-group', { rotation: -2, mobileRotation: 1 }, [
			make( 'animewp/text-group', {}, [ make( 'core/paragraph', { content: '子' } ) ] ),
		] );
	cases[ 'nested/video-in-media' ] = () =>
		make( 'animewp/media', { crop: true }, [
			make( 'core/image', { url: ORIGIN + '/wp-content/uploads/a.jpg', alt: '' } ),
			make( 'core/group', {}, [ make( 'animewp/video', { source: 'youtube', videoUrl: URLS[ 1 ], posterUrl: '/p.jpg' } ) ] ),
		] );
	return cases;
}

module.exports = { documents, generatedBlocks };
