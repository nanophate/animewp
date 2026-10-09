/**
 * Frontend behavior checks against the actual source modules. JSDOM performs no
 * remote requests; a deterministic clock covers overlapping UI state changes.
 * Run after both npm installs: node tests/serialization/frontend.test.js
 */
'use strict';
const assert = require( 'node:assert/strict' );
const fs = require( 'node:fs' );
const path = require( 'node:path' );
const test = require( 'node:test' );
const { JSDOM } = require( 'jsdom' );
const sass = require( '../../node_modules/sass' );
const postcss = require( '../../node_modules/postcss' );
const selectorParser = require( '../../node_modules/postcss-selector-parser' );
const specificity = require( '@csstools/selector-specificity' );

const SOURCE = path.resolve( __dirname, '../../plugins/animewp-blocks/src' );
const source = ( file ) => fs.readFileSync( path.join( SOURCE, file ), 'utf8' );

function environment( t, html, reduced = false ) {
	const dom = new JSDOM( html, { url: 'https://site.test/', runScripts: 'outside-only', pretendToBeVisual: true } );
	const { window } = dom;
	t.after( () => window.close() );
	const timers = new Map();
	let nextId = 1;
	let now = 0;
	let hidden = false;
	function schedule( callback, delay = 0, interval = false ) {
		const id = nextId++;
		timers.set( id, { callback, at: now + delay, interval: interval ? delay : 0 } );
		return id;
	}
	window.setTimeout = ( callback, delay ) => schedule( callback, delay );
	window.setInterval = ( callback, delay ) => schedule( callback, delay, true );
	window.clearTimeout = window.clearInterval = ( id ) => timers.delete( id );
	window.requestAnimationFrame = ( callback ) => schedule( callback, 16 );
	window.cancelAnimationFrame = window.clearTimeout;
	window.HTMLImageElement.prototype.decode = () => Promise.resolve();
	Object.defineProperty( window.document, 'hidden', { get: () => hidden, configurable: true } );
	const media = new window.EventTarget();
	media.matches = reduced;
	window.matchMedia = () => media;
	const tick = async ( milliseconds ) => {
		const end = now + milliseconds;
		for ( let count = 0; count < 10000; count++ ) {
			await Promise.resolve();
			const entry = [ ...timers ].filter( ( [ , timer ] ) => timer.at <= end )
				.sort( ( a, b ) => a[ 1 ].at - b[ 1 ].at || a[ 0 ] - b[ 0 ] )[ 0 ];
			if ( ! entry ) {
				now = end;
				return;
			}
			const [ id, timer ] = entry;
			now = timer.at;
			if ( timer.interval ) {
				timer.at += timer.interval;
			} else {
				timers.delete( id );
			}
			timer.callback();
		}
		throw new Error( 'Timer loop did not settle.' );
	};
	return {
		window, document: window.document, tick,
		run( file, adapt = ( code ) => code, exports = '' ) {
			return window.eval( '(function () {\n' + adapt( source( file ) ) + '\n' + exports + '\n})()' );
		},
		pointer( element, type ) { element.dispatchEvent( new window.Event( type, { bubbles: true } ) ); },
		visibility( value ) {
			hidden = value;
			window.document.dispatchEvent( new window.Event( 'visibilitychange' ) );
		},
		motion( value ) {
			media.matches = value;
			media.dispatchEvent( new window.Event( 'change' ) );
		},
	};
}

function carousel( t, options = {} ) {
	const env = environment( t, '<section><div id="track" tabindex="0"><div><input aria-label="Search"></div><div><a href="/next">Next story</a></div></div><button id="pause">Pause</button></section><button id="outside">Outside</button>', options.reduced );
	const { document } = env;
	const track = document.querySelector( '#track' );
	track.scrollTo = () => {};
	const createCarousel = env.run( 'shared/engines/carousel.js', ( code ) => code.replace( 'export function createCarousel', 'function createCarousel' ), 'return createCarousel;' );
	const api = createCarousel( { track, slides: [ ...track.children ], mode: 'fade', autoplay: 1, pauseButton: document.querySelector( '#pause' ), ...options } );
	return { ...env, api, track, root: track.parentElement, input: track.querySelector( 'input' ), outside: document.querySelector( '#outside' ) };
}

test( 'sticky header fragment correction handles literal and encoded IDs without repeated jumps', ( t ) => {
	const cases = [
		{ hash: '#news', html: '<h2 id="news">News</h2>', target: 'news' },
		{ hash: '#%E3%83%8B%E3%83%A5%E3%83%BC%E3%82%B9', html: '<h2 id="ニュース">News</h2>', target: 'ニュース' },
		{ hash: '#100%', html: '<h2 id="100%">Percent</h2>', target: '100%' },
		{ hash: '#literal%20id', html: '<h2 id="literal%20id">Literal</h2><h2 id="literal id">Decoded</h2>', target: 'literal%20id' },
		{ hash: '#%E0%A4%A', html: '', target: null },
		{ hash: '#missing', html: '', target: null },
		{ hash: '', html: '', target: null },
	];
	const presentation = fs.readFileSync( path.resolve( __dirname, '../../themes/animewp/assets/js/presentation.js' ), 'utf8' );
	for ( const scenario of cases ) {
		const env = environment( t, '<header class="wp-block-template-part" style="position:sticky"></header>' + scenario.html + '<h2 id="later">Later</h2>', true );
		env.window.history.replaceState( null, '', '/' + scenario.hash );
		const header = env.document.querySelector( 'header' );
		let height = 120;
		Object.defineProperty( header, 'offsetHeight', { get: () => height } );
		let measure;
		env.window.ResizeObserver = class {
			constructor( callback ) { measure = callback; }
			observe( node ) { assert.equal( node, header ); }
		};
		const scrolls = [];
		env.window.HTMLElement.prototype.scrollIntoView = function () { scrolls.push( this.id ); };
		env.window.eval( presentation );
		assert.doesNotThrow( () => measure(), scenario.hash );
		assert.deepEqual( scrolls, scenario.target ? [ scenario.target ] : [], scenario.hash );
		assert.equal( env.document.documentElement.style.getPropertyValue( '--animewp-sticky-header-height' ), '120px' );
		// A new fragment or a resized logo must update the offset without taking
		// over scrolling after the initial correction, including a malformed URL.
		env.window.history.replaceState( null, '', '/#later' );
		height = 160;
		assert.doesNotThrow( () => measure(), scenario.hash );
		assert.equal( env.document.documentElement.style.getPropertyValue( '--animewp-sticky-header-height' ), '160px' );
		assert.deepEqual( scrolls, scenario.target ? [ scenario.target ] : [], scenario.hash );
		header.style.position = 'static';
		env.window.dispatchEvent( new env.window.Event( 'resize' ) );
		assert.equal( env.document.documentElement.style.getPropertyValue( '--animewp-sticky-header-height' ), '' );
	}
} );

test( 'carousel advances normally and its explicit pause survives other events', async ( t ) => {
	const env = carousel( t );
	await env.tick( 1000 );
	assert.equal( env.api.active, 1 );
	env.document.querySelector( '#pause' ).click();
	env.pointer( env.root, 'pointerleave' );
	env.visibility( false );
	await env.tick( 1000 );
	assert.equal( env.api.active, 1 );
} );

test( 'carousel stays paused when the pointer leaves while focus remains inside', async ( t ) => {
	const env = carousel( t );
	env.input.focus();
	env.pointer( env.root, 'pointerenter' );
	env.pointer( env.root, 'pointerleave' );
	await env.tick( 1000 );
	assert.equal( env.api.active, 0 );
	assert.equal( env.input.closest( '#track > div' ).inert, false );
	env.outside.focus();
	await env.tick( 1000 );
	assert.equal( env.api.active, 1 );
} );

test( 'carousel stays paused when focus leaves while the pointer remains inside', async ( t ) => {
	const env = carousel( t );
	env.pointer( env.root, 'pointerenter' );
	env.input.focus();
	env.outside.focus();
	await env.tick( 1000 );
	assert.equal( env.api.active, 0 );
} );

test( 'carousel does not resume on tab return while focus remains inside', async ( t ) => {
	const env = carousel( t );
	env.input.focus();
	env.visibility( true );
	env.visibility( false );
	await env.tick( 1000 );
	assert.equal( env.api.active, 0 );
} );

test( 'carousel cannot start while its document is hidden', async ( t ) => {
	const env = carousel( t );
	env.visibility( true );
	env.pointer( env.root, 'pointerleave' );
	await env.tick( 1000 );
	assert.equal( env.api.active, 0 );
} );

test( 'carousel reacts immediately to a reduced-motion preference change', async ( t ) => {
	const env = carousel( t );
	env.motion( true );
	await env.tick( 1000 );
	assert.equal( env.api.active, 0 );
	env.motion( false );
	await env.tick( 1000 );
	assert.equal( env.api.active, 1 );
} );

test( 'carousel respects reduced motion at startup', async ( t ) => {
	const env = carousel( t, { reduced: true } );
	await env.tick( 1000 );
	assert.equal( env.api.active, 0 );
} );

test( 'carousel arrow keys preserve text input and modified shortcuts', ( t ) => {
	const env = carousel( t, { autoplay: 0 } );
	const inputKey = new env.window.KeyboardEvent( 'keydown', { key: 'ArrowRight', bubbles: true, cancelable: true } );
	env.input.dispatchEvent( inputKey );
	assert.equal( inputKey.defaultPrevented, false );
	assert.equal( env.api.active, 0 );
	const modifiedKey = new env.window.KeyboardEvent( 'keydown', { key: 'ArrowLeft', ctrlKey: true, bubbles: true, cancelable: true } );
	env.track.dispatchEvent( modifiedKey );
	assert.equal( modifiedKey.defaultPrevented, false );
	const trackKey = new env.window.KeyboardEvent( 'keydown', { key: 'ArrowRight', bubbles: true, cancelable: true } );
	env.track.dispatchEvent( trackKey );
	assert.equal( trackKey.defaultPrevented, true );
	assert.equal( env.api.active, 1 );
} );

function backdrop( t, { mode = 'follow-video', cards = '<figure><img src="/poster.jpg"></figure>', reduced = false, setup } = {} ) {
	const env = environment( t, '<section><div class="wp-block-animewp-backdrop is-mode-' + mode + '"><div class="animewp-backdrop__veil"></div></div>' + cards + '</section>', reduced );
	env.run( 'shared/providers.js' );
	env.window.frontendPlayer = env.run( 'shared/player.js', ( code ) => code.replace( "import providers from './providers';", 'const providers = window.animewpVideoProviders;' ).replace( /export /g, '' ), 'return { backgroundUrl, playerUrl };' );
	if ( setup ) setup( env );
	env.run( 'blocks/backdrop/view.js', ( code ) => code.replace( "import { backgroundUrl } from '../../shared/player';", 'const { backgroundUrl } = window.frontendPlayer;' ) );
	return { ...env, layer: env.document.querySelector( '.wp-block-animewp-backdrop' ) };
}

test( 'follow-video loads extensionless poster URLs as images', async ( t ) => {
	const env = backdrop( t, { cards: '<figure><img src="/media?id=123"></figure>' } );
	await env.tick( 1600 );
	assert.equal( env.layer.querySelector( 'iframe' ), null );
	assert.equal( env.layer.querySelector( 'img' ).getAttribute( 'src' ), 'https://site.test/media?id=123' );
} );

test( 'follow-video embeds only a validated provider and falls back to an image otherwise', async ( t ) => {
	const env = backdrop( t, { cards: '<figure><a data-provider="youtube" data-video-id="jNQXAC9IVRw"><img src="/one.jpg"></a></figure><figure><a data-provider="youtube" data-video-id="bad/id"><img src="/media?id=2"></a></figure>' } );
	await env.tick( 1600 );
	const frame = env.layer.querySelector( 'iframe' );
	assert.equal( new URL( frame.src ).hostname, 'www.youtube-nocookie.com' );
	env.pointer( env.document.querySelectorAll( 'figure' )[ 1 ], 'pointerover' );
	await env.tick( 1600 );
	assert.equal( env.layer.querySelector( 'iframe' ), null );
	assert.equal( env.layer.querySelector( 'img' ).src, 'https://site.test/media?id=2' );
} );

test( 'rapid backdrop changes never let an old cleanup remove the latest image', async ( t ) => {
	const env = backdrop( t, { mode: 'follow', cards: '<figure><img src="/one.jpg"></figure><figure><img src="/two.jpg"></figure>' } );
	await env.tick( 50 );
	env.pointer( env.document.querySelectorAll( 'figure' )[ 1 ], 'pointerover' );
	await env.tick( 1600 );
	const layers = env.layer.querySelectorAll( '.animewp-backdrop__media' );
	assert.equal( layers.length, 1 );
	assert.equal( layers[ 0 ].src, 'https://site.test/two.jpg' );
	assert.equal( layers[ 0 ].classList.contains( 'is-active' ), true );
} );

test( 'a stale image decode cannot replace a more recent backdrop', async ( t ) => {
	const decodes = new Map();
	const env = backdrop( t, {
		mode: 'follow', cards: '<figure><img src="/one.jpg"></figure><figure><img src="/two.jpg"></figure>',
		setup( context ) { context.window.HTMLImageElement.prototype.decode = function () { return new Promise( ( resolve ) => decodes.set( this.src, resolve ) ); }; },
	} );
	await env.tick( 0 );
	env.pointer( env.document.querySelectorAll( 'figure' )[ 1 ], 'pointerover' );
	await env.tick( 0 );
	decodes.get( 'https://site.test/two.jpg' )();
	await env.tick( 50 );
	decodes.get( 'https://site.test/one.jpg' )();
	await env.tick( 1600 );
	const layers = env.layer.querySelectorAll( '.animewp-backdrop__media' );
	assert.equal( layers.length, 1 );
	assert.equal( layers[ 0 ].src, 'https://site.test/two.jpg' );
} );

test( 'reduced motion replaces a running provider backdrop with its poster', async ( t ) => {
	const env = backdrop( t, { cards: '<figure><a data-provider="youtube" data-video-id="jNQXAC9IVRw"><img src="/one.jpg"></a></figure>' } );
	await env.tick( 1600 );
	assert.ok( env.layer.querySelector( 'iframe' ) );
	env.motion( true );
	await env.tick( 0 );
	assert.equal( env.layer.querySelector( 'iframe' ), null );
	assert.equal( env.layer.querySelector( 'img' ).src, 'https://site.test/one.jpg' );
} );

test( 'reduced motion pauses a running file backdrop', ( t ) => {
	let plays = 0;
	let pauses = 0;
	const env = backdrop( t, {
		mode: 'file', cards: '', setup( context ) {
			const video = context.document.createElement( 'video' );
			video.className = 'animewp-backdrop__media';
			video.play = () => { plays++; return Promise.resolve(); };
			video.pause = () => { pauses++; };
			context.document.querySelector( '.wp-block-animewp-backdrop' ).prepend( video );
		},
	} );
	assert.equal( plays, 1 );
	env.motion( true );
	assert.equal( pauses, 1 );
} );

// Text-tree invariant, not a substitute for a real screen-reader audit: the
// original readable text must remain outside aria-hidden, including in links.
function exposedText( node ) {
	if ( node.nodeType === 3 ) return node.nodeValue;
	if ( node.nodeType !== 1 || node.getAttribute( 'aria-hidden' ) === 'true' ) return '';
	return [ ...node.childNodes ].map( exposedText ).join( '' );
}

test( 'letter motion preserves paragraph text and the name of an embedded link', ( t ) => {
	const env = environment( t, '<p class="animewp-motion has-entrance has-entrance-letters">Watch <a href="/trailer">the trailer</a> now.</p>' );
	env.run( 'motion/view.js' );
	const paragraph = env.document.querySelector( 'p' );
	assert.equal( exposedText( paragraph.querySelector( 'a' ) ), 'the trailer' );
	assert.equal( exposedText( paragraph ), 'Watch the trailer now.' );
	assert.equal( paragraph.hasAttribute( 'aria-label' ), false );
	assert.ok( paragraph.querySelector( '.animewp-letter' ) );
} );

test( 'carousel dot names read slide titles once, after letter motion and across elements', ( t ) => {
	const env = environment( t, '<div class="wp-block-animewp-carousel has-dots-dots"><div class="animewp-carousel__track">'
		+ '<div><h1 class="animewp-motion has-entrance has-entrance-letters">Title</h1></div>'
		+ '<figure><figcaption><span>TRAILER 01</span><span>Main</span></figcaption></figure>'
		+ '</div></div>' );
	// Letter motion runs first here, so its aria-hidden copy is in the heading when dots are named.
	env.run( 'motion/view.js' );
	env.run( 'blocks/carousel/view.js', ( code ) =>
		source( 'shared/engines/carousel.js' ).replace( 'export function createCarousel', 'function createCarousel' )
		+ '\n' + code.replace( /^import .*$/m, '' ) );
	const names = [ ...env.document.querySelectorAll( '.animewp-carousel__dot' ) ].map( ( dot ) => dot.getAttribute( 'aria-label' ) );
	assert.deepEqual( names, [ '1 / 2 Title', '2 / 2 TRAILER 01 Main' ] );
} );

test( 'letter motion retains an explicit accessible label supplied by the author', ( t ) => {
	const env = environment( t, '<h2 aria-label="Season two" class="animewp-motion has-entrance has-entrance-letters">II</h2>' );
	env.run( 'motion/view.js' );
	assert.equal( env.document.querySelector( 'h2' ).getAttribute( 'aria-label' ), 'Season two' );
} );

test( 'letter motion leaves readable markup intact when reduced motion is requested', ( t ) => {
	const env = environment( t, '<p class="animewp-motion has-entrance has-entrance-letters">Watch <a href="/trailer">the trailer</a>.</p>', true );
	const paragraph = env.document.querySelector( 'p' );
	const before = paragraph.innerHTML;
	env.run( 'motion/view.js' );
	assert.equal( paragraph.innerHTML, before );
	assert.equal( paragraph.classList.contains( 'is-inview' ), true );
} );

const carouselCss = postcss.parse( sass.compile( path.join( SOURCE, 'blocks/carousel/style.scss' ), { silenceDeprecations: [ 'legacy-js-api' ] } ).css );
test( 'fade carousels retain a scrollable flex track until JavaScript enhances them', ( t ) => {
	const env = environment( t, '<section class="wp-block-animewp-carousel is-effect-fade"><div class="animewp-carousel__track"><article>One</article><article>Two</article></div></section>' );
	const track = env.document.querySelector( '.animewp-carousel__track' );
	function layoutRules() {
		const displays = [];
		carouselCss.walkRules( ( rule ) => {
			if ( rule.parent.type === 'atrule' ) return;
			if ( track.matches( rule.selector ) ) rule.walkDecls( 'display', ( decl ) => displays.push( decl.value ) );
		} );
		return displays;
	}
	assert.deepEqual( layoutRules(), [ 'flex' ] );
	track.parentElement.classList.add( 'is-enhanced' );
	assert.deepEqual( layoutRules(), [ 'flex', 'grid' ] );
} );

test( 'carousel responsive custom properties have no direct dependency on themselves', () => {
	carouselCss.walkDecls( /^--/, ( decl ) => {
		const references = [ ...decl.value.matchAll( /var\(\s*(--[\w-]+)/g ) ].map( ( match ) => match[ 1 ] );
		assert.equal( references.includes( decl.prop ), false, decl.prop + ' references itself in ' + decl.value );
	} );
} );

// Resolve declaration precedence for these static CSS rules. This deliberately
// does not simulate animation frames, layout, media queries, or visual rendering.
function declaration( css, element, property ) {
	let winner;
	css.walkRules( ( rule ) => {
		if ( rule.parent.type === 'atrule' ) return;
		selectorParser().astSync( rule.selector ).each( ( selector ) => {
			if ( ! element.matches( selector.toString() ) ) return;
			const rank = specificity.selectorSpecificity( selector );
			rule.walkDecls( property, ( decl ) => {
				if ( ! winner || ( ! winner.important && decl.important ) ||
					( Boolean( winner.important ) === Boolean( decl.important ) && specificity.compare( rank, winner.rank ) >= 0 ) ) {
					winner = { rank, value: decl.value, important: decl.important };
				}
			} );
		} );
	} );
	if ( winner ) return winner.value;
	return property.startsWith( '--' ) && element.parentElement ? declaration( css, element.parentElement, property ) : '';
}

const motionCss = postcss.parse( sass.compile( path.join( SOURCE, 'motion/style.scss' ) ).css );
function animation( element ) {
	return declaration( motionCss, element, 'animation' ).replace( /var\((--animewp-loop-animation)(?:,\s*([^)]*))?\)/g,
		( match, property, fallback ) => declaration( motionCss, element, property ) || fallback || '' );
}

for ( const loop of [ 'float', 'sway', 'pulse' ] ) {
	test( 'entrances and the ' + loop + ' loop both run, without copying the parent loop to children', ( t ) => {
		const env = environment( t, '<section id="parent" class="animewp-motion has-entrance has-entrance-rise is-inview has-loop-' + loop + '"><p id="child" class="animewp-motion has-entrance has-entrance-fade is-inview">Child</p></section>' );
		const parent = env.document.querySelector( '#parent' );
		const child = env.document.querySelector( '#child' );
		assert.match( animation( parent ), /animewp-in-rise/ );
		assert.ok( animation( parent ).includes( 'animewp-' + loop ) );
		assert.match( animation( child ), /animewp-in-fade/ );
		assert.equal( animation( child ).includes( 'animewp-' + loop ), false );
		parent.classList.add( 'is-target-children' );
		child.className = '';
		assert.match( animation( child ), /animewp-in-rise/ );
		assert.equal( animation( child ).includes( 'animewp-' + loop ), false );
	} );
}

function motionSettings( env ) {
	env.window.frontendSanitize = env.run( 'shared/sanitize.js', ( code ) => code.replace( /export /g, '' ), 'return { enumValue, numberValue, safeColor };' );
	env.window.frontendMotion = env.run( 'motion/shared.js', ( code ) => code.replace( "import { enumValue, numberValue, safeColor } from '../shared/sanitize';", 'const { enumValue, numberValue, safeColor } = window.frontendSanitize;' ).replace( /export /g, '' ), 'return { normalized, isActive, motionProps };' );
	return env.window.frontendMotion;
}

function preview( t ) {
	const env = environment( t, '<div data-block="preview">Preview</div>' );
	motionSettings( env );
	const show = env.run( 'motion/editor.js', ( code ) => 'const { motionProps } = window.frontendMotion;\n' + code.slice( code.indexOf( 'function canvasElement(' ), code.indexOf( 'function MotionPanel(' ) ), 'return preview;' );
	return { ...env, show, element: env.document.querySelector( '[data-block]' ) };
}

test( 'letter entrance previews remove the temporary rise class', async ( t ) => {
	const env = preview( t );
	env.show( 'preview', { entrance: 'letters', duration: 1000 } );
	assert.equal( env.element.classList.contains( 'has-entrance-rise' ), true );
	await env.tick( 1300 );
	assert.equal( env.element.classList.contains( 'has-entrance-rise' ), false );
	assert.equal( env.element.classList.contains( 'is-inview' ), false );
} );

test( 'an earlier preview cleanup cannot interrupt the next preview', async ( t ) => {
	const env = preview( t );
	env.show( 'preview', { entrance: 'rise', duration: 1000 } );
	await env.tick( 500 );
	env.show( 'preview', { entrance: 'fade', duration: 1000 } );
	assert.equal( env.element.classList.contains( 'has-entrance-rise' ), false );
	await env.tick( 800 );
	assert.equal( env.element.classList.contains( 'is-inview' ), true );
	assert.equal( env.element.classList.contains( 'has-entrance-fade' ), true );
	await env.tick( 500 );
	assert.equal( env.element.classList.contains( 'is-inview' ), false );
} );

// Supply layout facts that JSDOM cannot calculate. Selection, readiness,
// thresholds, focus handling and observers still run through the real module.
function scrollMotion( t, html ) {
	const env = environment( t, html );
	const observed = new Set();
	let resized;
	env.window.ResizeObserver = class {
		constructor( callback ) { resized = callback; }
		observe( element ) { observed.add( element ); }
	};
	return {
		...env, observed,
		box( selector, geometry = {}, rendered = true ) {
			const element = env.document.querySelector( selector );
			element.getBoundingClientRect = () => {
				const value = typeof geometry === 'function' ? geometry() : geometry;
				const top = ( value.top ?? 0 ) - env.window.scrollY;
				const width = value.width ?? 1280;
				const height = value.height ?? 900;
				return { x: 0, y: top, top, left: 0, bottom: top + height, right: width, width, height };
			};
			element.getClientRects = () => rendered ? [ element.getBoundingClientRect() ] : [];
			return element;
		},
		async scroll( top ) {
			env.window.scrollY = top;
			env.window.dispatchEvent( new env.window.Event( 'scroll' ) );
			await env.tick( 32 );
		},
		async resize() {
			assert.equal( typeof resized, 'function', 'the runtime registered a ResizeObserver' );
			resized();
			await env.tick( 32 );
		},
	};
}

test( 'motion settings keep legacy distances and bound new appearance values without losing zero', ( t ) => {
	const env = environment( t, '' );
	const { normalized, motionProps, isActive } = motionSettings( env );
	assert.equal( normalized( { scrolled: 'show' } ).scrollDistance, 64 );
	assert.equal( normalized( {} ).scrollTrigger, 'distance' );
	for ( const value of [ null, false, '', '500', '1e309', Infinity, NaN, [] ] ) {
		assert.equal( normalized( { scrollDistance: value } ).scrollDistance, 64 );
	}
	for ( const [ value, expected ] of [ [ -100, 0 ], [ 0, 0 ], [ 360.6, 361 ], [ 10001, 10000 ] ] ) {
		assert.equal( normalized( { scrollDistance: value } ).scrollDistance, expected );
	}
	assert.equal( normalized( { scrollTrigger: 'hero" onclick="bad()' } ).scrollTrigger, 'distance' );
	assert.equal( isActive( { scrollDistance: 500 } ), false );
	assert.equal( isActive( { headerAppearance: true } ), true );
	const transparent = motionProps( { scrolled: 'navigation', headerAppearance: true, headerOpacity: 0, headerBlur: 0, headerHeight: 48 } );
	assert.match( transparent.className, /is-scrolled-navigation/ );
	assert.equal( transparent.style[ '--animewp-header-opacity' ], '0%' );
	assert.equal( transparent.style[ '--animewp-header-blur' ], '0px' );
	assert.equal( transparent.style[ '--animewp-header-height' ], '48px' );
	const bounded = normalized( { headerOpacity: 101, headerBlur: -1, headerHeight: 999 } );
	assert.deepEqual( [ bounded.headerOpacity, bounded.headerBlur, bounded.headerHeight ], [ 100, 0, 120 ] );
	const invalid = normalized( { headerOpacity: '20%;color:red', headerBlur: {}, headerHeight: false } );
	assert.deepEqual( [ invalid.headerOpacity, invalid.headerBlur, invalid.headerHeight ], [ 82, 12, 60 ] );
	assert.equal( motionProps( { headerAppearance: false, headerOpacity: 5 } ).style[ '--animewp-header-opacity' ], undefined );
} );

test( 'header surfaces use native solid and preset colors without accepting injected CSS', ( t ) => {
	const env = environment( t, '' );
	const { motionProps } = motionSettings( env );
	const fallback = 'var(--wp--preset--color--base, #fff)';
	const cases = [
		[ {}, fallback ],
		[ { backgroundColor: 'accent' }, 'var(--wp--preset--color--accent, ' + fallback + ')' ],
		[ { style: { color: { background: '#123456' } } }, '#123456' ],
		[ { backgroundColor: 'accent);color:red', style: { color: { background: 'rgb(10 20 30 / 50%)' } } }, 'rgb(10 20 30 / 50%)' ],
		[ { backgroundColor: 'bad;slug', style: { color: { background: '#fff;opacity:0' } } }, fallback ],
		[ { style: { color: { background: 'linear-gradient(red, blue)' } } }, fallback ],
	];
	for ( const [ attributes, expected ] of cases ) {
		assert.equal( motionProps( { headerAppearance: true }, attributes ).style[ '--animewp-header-background' ], expected );
	}
	assert.equal( motionProps( { headerAppearance: false }, { backgroundColor: 'accent' } ).style[ '--animewp-header-background' ], undefined );
} );

test( 'per-block scroll distances have strict boundaries while the legacy marker stays at 64px', async ( t ) => {
	const env = scrollMotion( t, '<div id="zero" class="is-scrolled-show" data-animewp-scroll-distance="0"></div>'
		+ '<div id="legacy" class="is-scrolled-hide"></div>'
		+ '<div id="custom" class="is-scrolled-show" data-animewp-scroll-distance="240"></div>'
		+ '<div id="invalid" class="is-scrolled-show" data-animewp-scroll-distance="Infinity"></div>' );
	env.run( 'motion/view.js' );
	for ( const top of [ 0, 1, 64, 65, 240, 241 ] ) {
		await env.scroll( top );
		for ( const [ id, threshold ] of [ [ 'zero', 0 ], [ 'legacy', 64 ], [ 'custom', 240 ], [ 'invalid', 64 ] ] ) {
			const element = env.document.getElementById( id );
			assert.equal( element.classList.contains( 'animewp-scroll-ready' ), true );
			assert.equal( element.classList.contains( 'is-scrolled-active' ), top > threshold, id + ' at ' + top );
		}
		assert.equal( env.document.documentElement.classList.contains( 'animewp-is-scrolled' ), top > 64 );
	}
	// Older custom CSS can also observe this marker on pages that initialize
	// the scroll runtime through parallax alone, without any scroll actions.
	const parallax = scrollMotion( t, '<div class="animewp-motion has-parallax"></div>' );
	parallax.run( 'motion/view.js' );
	await parallax.scroll( 65 );
	assert.equal( parallax.document.documentElement.classList.contains( 'animewp-is-scrolled' ), true );
	await parallax.scroll( 0 );
	assert.equal( parallax.document.documentElement.classList.contains( 'animewp-is-scrolled' ), false );
} );

test( 'hero selection skips hidden and collapsed covers and measures the outer carousel', async ( t ) => {
	const env = scrollMotion( t, '<header class="is-scrolled-navigation" data-animewp-scroll-trigger="hero"></header><main>'
		+ '<div style="display:none"><div id="css-hidden" class="wp-block-cover"></div></div>'
		+ '<div hidden><div id="attribute-hidden" class="wp-block-cover"></div></div>'
		+ '<div id="invisible" class="wp-block-cover" style="visibility:hidden"></div>'
		+ '<div id="collapsed" class="wp-block-cover"></div>'
		+ '<div id="carousel" class="wp-block-animewp-carousel"><div id="slide" class="wp-block-cover"></div></div></main>' );
	env.box( '#css-hidden', {}, false ); // Its own computed display is block, but the ancestor removes its layout box.
	env.box( '#attribute-hidden', { height: 20 } );
	env.box( '#invisible', { height: 20 } );
	env.box( '#collapsed', { height: 0 } );
	const carouselElement = env.box( '#carousel', { height: 900 } );
	env.box( '#slide', { height: 100 } );
	env.run( 'motion/view.js' );
	const header = env.document.querySelector( 'header' );
	assert.equal( env.observed.has( carouselElement ), true );
	await env.scroll( 200 );
	assert.equal( header.classList.contains( 'is-scrolled-active' ), false );
	await env.scroll( 901 );
	assert.equal( header.classList.contains( 'is-scrolled-active' ), true );
} );

test( 'hero geometry is measured after enhancement and updates on resize without another scroll', async ( t ) => {
	const env = scrollMotion( t, '<header class="is-scrolled-navigation" data-animewp-scroll-trigger="hero"></header><main><div id="cover" class="wp-block-cover"></div></main>' );
	const header = env.document.querySelector( 'header' );
	let height = 900;
	const cover = env.box( '#cover', () => ( { top: header.classList.contains( 'animewp-scroll-ready' ) ? 0 : 90, height } ) );
	env.window.scrollY = 901;
	env.run( 'motion/view.js' );
	assert.equal( header.classList.contains( 'is-scrolled-active' ), true, 'the former inline header height must not delay activation' );
	assert.equal( env.observed.has( cover ), true );
	height = 1200;
	await env.resize();
	assert.equal( env.window.scrollY, 901 );
	assert.equal( header.classList.contains( 'is-scrolled-active' ), false );
	height = 800;
	await env.resize();
	assert.equal( header.classList.contains( 'is-scrolled-active' ), true );
} );

test( 'hero-triggered blocks stay unenhanced and visible when no usable hero exists', ( t ) => {
	for ( const body of [ '<main><p>No cover</p></main>', '<main><div id="empty" class="wp-block-cover"></div></main>', '<p>No main content region</p>' ] ) {
		const env = scrollMotion( t, '<header class="is-scrolled-show" data-animewp-scroll-trigger="hero"><a href="#news">News</a></header>' + body );
		if ( env.document.querySelector( '#empty' ) ) env.box( '#empty', { height: 0 } );
		env.run( 'motion/view.js' );
		const header = env.document.querySelector( 'header' );
		assert.equal( header.classList.contains( 'animewp-scroll-ready' ), false );
		assert.notEqual( declaration( motionCss, header, 'display' ), 'none' );
	}
} );

test( 'delayed enhancement preserves focused fallback links until focus leaves', async ( t ) => {
	for ( const action of [ 'show', 'hide', 'navigation' ] ) {
		const env = scrollMotion( t, '<section class="is-scrolled-' + action + '" data-animewp-scroll-distance="100"><a id="inside" href="#news">News</a></section><button id="outside">Outside</button>' );
		const element = env.document.querySelector( 'section' );
		const inside = env.document.querySelector( '#inside' );
		inside.focus();
		env.run( 'motion/view.js' );
		assert.equal( element.classList.contains( 'animewp-scroll-ready' ), false, action + ' keeps its actual fallback presentation, including on phones' );
		assert.equal( env.document.activeElement, inside );
		await env.scroll( 200 );
		assert.equal( element.classList.contains( 'animewp-scroll-ready' ), false );
		env.document.querySelector( '#outside' ).focus();
		await env.tick( 32 );
		assert.equal( element.classList.contains( 'animewp-scroll-ready' ), true );
		assert.equal( element.classList.contains( 'is-scrolled-active' ), true );
	}
} );

test( 'an open Core menu defers enhancement and preserves its state until the menu closes', async ( t ) => {
	const env = scrollMotion( t, '<header class="is-scrolled-navigation" data-animewp-scroll-distance="100"><nav class="is-menu-open"><a href="#news">News</a></nav></header>' );
	const header = env.document.querySelector( 'header' );
	const menu = env.document.querySelector( 'nav' );
	env.window.scrollY = 200;
	env.run( 'motion/view.js' );
	assert.equal( header.classList.contains( 'animewp-scroll-ready' ), false );
	menu.classList.remove( 'is-menu-open' );
	await env.tick( 32 );
	assert.equal( header.classList.contains( 'animewp-scroll-ready' ), true );
	assert.equal( header.classList.contains( 'is-scrolled-active' ), true );
	menu.classList.add( 'is-menu-open' );
	await env.scroll( 0 );
	assert.equal( header.classList.contains( 'is-scrolled-active' ), true );
	menu.classList.remove( 'is-menu-open' );
	await env.tick( 32 );
	assert.equal( header.classList.contains( 'is-scrolled-active' ), false, 'Core closing its menu triggers reevaluation without an extra scroll' );
} );

test( 'compact headers still update while a navigation link has focus', async ( t ) => {
	const env = scrollMotion( t, '<header class="is-scrolled-shrink"><a href="#news">News</a></header>' );
	env.run( 'motion/view.js' );
	env.document.querySelector( 'a' ).focus();
	await env.scroll( 200 );
	assert.equal( env.document.querySelector( 'header' ).classList.contains( 'is-scrolled-active' ), true );
	assert.equal( env.document.activeElement.tagName, 'A' );
} );

function videoCard( t, { supported = true, setup } = {} ) {
	const env = environment( t, '<figure class="wp-block-animewp-video-card"><a class="animewp-video-card__link" href="https://www.youtube.com/watch?v=jNQXAC9IVRw" aria-label="Play trailer" data-provider="youtube" data-video-id="jNQXAC9IVRw" data-close-label="Close trailer">Watch</a></figure>' );
	const errors = [];
	env.window.addEventListener( 'error', ( event ) => { errors.push( event.error ); event.preventDefault(); } );
	if ( supported ) {
		env.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
		env.window.HTMLDialogElement.prototype.close = function () {
			this.open = false;
			this.dispatchEvent( new env.window.Event( 'close' ) );
		};
	}
	env.run( 'shared/providers.js' );
	env.window.frontendPlayer = env.run( 'shared/player.js', ( code ) => code.replace( "import providers from './providers';", 'const providers = window.animewpVideoProviders;' ).replace( /export /g, '' ), 'return { playerUrl };' );
	env.window.frontendDialog = env.run( 'shared/engines/dialog.js', ( code ) => code.replace( /export /g, '' ), 'return { createDialog, filePlayer, iframePlayer };' );
	if ( setup ) setup( env );
	env.run( 'blocks/video-card/view.js', ( code ) => code
		.replace( /import \{[\s\S]*?\} from '\.\.\/\.\.\/shared\/engines\/dialog';/, 'const { createDialog, filePlayer, iframePlayer } = window.frontendDialog;' )
		.replace( "import { playerUrl } from '../../shared/player';", 'const { playerUrl } = window.frontendPlayer;' ) );
	const link = env.document.querySelector( 'a' );
	return {
		...env, link, errors,
		click() {
			let intercepted;
			// Observe the plugin's decision, then suppress navigation in the test
			// runner only. JSDOM cannot actually navigate to the saved URL.
			env.document.addEventListener( 'click', ( event ) => {
				intercepted = event.defaultPrevented;
				event.preventDefault();
			}, { once: true } );
			link.dispatchEvent( new env.window.MouseEvent( 'click', { button: 0, bubbles: true, cancelable: true } ) );
			return intercepted;
		},
	};
}

test( 'video cards keep their saved link when native dialogs are unsupported', ( t ) => {
	const env = videoCard( t, { supported: false } );
	assert.equal( env.click(), false );
	assert.deepEqual( env.errors, [] );
	assert.equal( env.document.querySelector( 'dialog, iframe, video' ), null );
	assert.equal( env.document.documentElement.classList.contains( 'animewp-has-dialog' ), false );
} );

test( 'video cards keep their saved link if dialog creation throws', ( t ) => {
	const env = videoCard( t, { setup( context ) {
		const create = context.document.createElement.bind( context.document );
		context.document.createElement = ( tag, options ) => {
			if ( tag === 'dialog' ) throw new Error( 'Dialog creation failed' );
			return create( tag, options );
		};
	} } );
	assert.equal( env.click(), false );
	assert.deepEqual( env.errors, [] );
	assert.equal( env.document.querySelector( 'dialog, iframe, video' ), null );
} );

test( 'video cards clean up failed modal opens without intercepting their saved link', ( t ) => {
	const env = videoCard( t, { setup( context ) {
		context.window.HTMLDialogElement.prototype.showModal = () => { throw new Error( 'Modal opening failed' ); };
	} } );
	assert.equal( env.click(), false );
	assert.deepEqual( env.errors, [] );
	assert.equal( env.document.querySelector( 'dialog, iframe, video' ), null );
	assert.equal( env.document.documentElement.classList.contains( 'animewp-has-dialog' ), false );
} );

test( 'supported video cards open one player and restore focus after closing it', ( t ) => {
	const env = videoCard( t );
	let plays = 0;
	env.link.addEventListener( 'animewp:play', () => plays++ );
	env.link.focus();
	assert.equal( env.click(), true );
	assert.deepEqual( env.errors, [] );
	const dialog = env.document.querySelector( 'dialog' );
	const close = dialog.querySelector( 'button' );
	assert.equal( dialog.open, true );
	assert.equal( dialog.getAttribute( 'aria-label' ), 'Play trailer' );
	assert.equal( close.textContent, 'Close trailer' );
	assert.equal( env.document.activeElement, close );
	assert.equal( env.document.querySelectorAll( 'iframe' ).length, 1 );
	assert.equal( new URL( dialog.querySelector( 'iframe' ).src ).hostname, 'www.youtube-nocookie.com' );
	assert.equal( env.document.documentElement.classList.contains( 'animewp-has-dialog' ), true );
	assert.equal( plays, 1 );
	close.click();
	assert.equal( dialog.open, false );
	assert.equal( env.document.querySelector( 'iframe' ), null );
	assert.equal( env.document.documentElement.classList.contains( 'animewp-has-dialog' ), false );
	assert.equal( env.document.activeElement, env.link );
} );
