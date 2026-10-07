/**
 * Motion on the site: entrances when blocks scroll into view, letter splits,
 * parallax and the "page has scrolled" state. CSS does the animating; with
 * reduced motion requested, everything is shown immediately and stays still.
 */
const reduced = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
const root = document.documentElement;

/**
 * Wrap each character in a span; the element keeps the full text for screen readers.
 * @param {HTMLElement} element Text block to split.
 */
function splitLetters( element ) {
	const text = element.textContent.trim();
	if (
		! text ||
		text.length > 240 ||
		element.querySelector( 'img, svg, input, textarea, select, button' )
	) {
		return;
	}
	element.setAttribute( 'aria-label', text );
	let index = 0;
	const walker = element.ownerDocument.createTreeWalker(
		element,
		window.NodeFilter.SHOW_TEXT
	);
	const nodes = [];
	while ( walker.nextNode() ) {
		nodes.push( walker.currentNode );
	}
	nodes.forEach( ( node ) => {
		const fragment = element.ownerDocument.createDocumentFragment();
		[ ...node.nodeValue ].forEach( ( character ) => {
			if ( /\s/.test( character ) ) {
				fragment.append( character );
				return;
			}
			const span = element.ownerDocument.createElement( 'span' );
			span.className = 'animewp-letter';
			span.setAttribute( 'aria-hidden', 'true' );
			span.style.setProperty( '--animewp-i', String( index++ ) );
			span.textContent = character;
			fragment.append( span );
		} );
		node.replaceWith( fragment );
	} );
}

function prepare( element ) {
	if ( element.classList.contains( 'is-target-children' ) ) {
		[ ...element.children ].forEach( ( child, index ) =>
			child.style.setProperty( '--animewp-i', String( index ) )
		);
	}
	if ( element.classList.contains( 'has-entrance-letters' ) ) {
		splitLetters( element );
	}
}

const entrances = [
	...document.querySelectorAll( '.animewp-motion.has-entrance' ),
];
entrances.forEach( prepare );
if ( reduced || ! ( 'IntersectionObserver' in window ) ) {
	entrances.forEach( ( element ) => element.classList.add( 'is-inview' ) );
} else {
	const observer = new window.IntersectionObserver(
		( items ) => {
			items.forEach( ( item ) => {
				if ( item.isIntersecting ) {
					item.target.classList.add( 'is-inview' );
					observer.unobserve( item.target );
				}
			} );
		},
		{ threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
	);
	entrances.forEach( ( element ) => observer.observe( element ) );
}
root.classList.add( 'animewp-motion-ready' );

// Parallax: offset relative to the viewport centre, applied with the independent
// `translate` property so it composes with entrances, hovers and loops.
const parallax = reduced
	? []
	: [ ...document.querySelectorAll( '.animewp-motion.has-parallax' ) ];
let ticking = false;
function update() {
	ticking = false;
	const middle = window.innerHeight / 2;
	parallax.forEach( ( element ) => {
		const rect = element.getBoundingClientRect();
		if ( rect.bottom < -200 || rect.top > window.innerHeight + 200 ) {
			return;
		}
		const factor =
			parseFloat(
				element.style.getPropertyValue( '--animewp-parallax' )
			) || 0;
		const offset = ( rect.top + rect.height / 2 - middle ) * factor;
		element.style.setProperty(
			'--animewp-parallax-y',
			Math.round( offset ) + 'px'
		);
	} );
}

// "After scrolling down" visibility for headers and other blocks.
const scrolled = document.querySelector( '[class*="is-scrolled-"]' );
function onScroll() {
	if ( scrolled ) {
		root.classList.toggle( 'animewp-is-scrolled', window.scrollY > 64 );
	}
	if ( parallax.length && ! ticking ) {
		ticking = true;
		window.requestAnimationFrame( update );
	}
}
if ( scrolled || parallax.length ) {
	window.addEventListener( 'scroll', onScroll, { passive: true } );
	window.addEventListener( 'resize', onScroll, { passive: true } );
	onScroll();
}
