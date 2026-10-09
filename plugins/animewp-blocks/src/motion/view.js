/**
 * Motion on the site: entrances when blocks scroll into view, letter splits,
 * parallax and per-block scroll conditions. Reduced motion disables animation,
 * while navigation remains available and can still switch presentation.
 */
const reduced = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
const root = document.documentElement;

/**
 * Animate characters while keeping each original text node available to screen
 * readers, including the text that names a link inside a paragraph or heading.
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
		if ( ! node.nodeValue.trim() ) {
			return;
		}
		const fragment = element.ownerDocument.createDocumentFragment();
		const readable = element.ownerDocument.createElement( 'span' );
		readable.className = 'animewp-letter-text';
		readable.textContent = node.nodeValue;
		fragment.append( readable );
		const visual = element.ownerDocument.createElement( 'span' );
		visual.setAttribute( 'aria-hidden', 'true' );
		[ ...node.nodeValue ].forEach( ( character ) => {
			if ( /\s/.test( character ) ) {
				visual.append( character );
				return;
			}
			const span = element.ownerDocument.createElement( 'span' );
			span.className = 'animewp-letter';
			span.style.setProperty( '--animewp-i', String( index++ ) );
			span.textContent = character;
			visual.append( span );
		} );
		fragment.append( visual );
		node.replaceWith( fragment );
	} );
}

function prepare( element ) {
	if ( element.classList.contains( 'is-target-children' ) ) {
		[ ...element.children ].forEach( ( child, index ) =>
			child.style.setProperty( '--animewp-i', String( index ) )
		);
	}
	if ( ! reduced && element.classList.contains( 'has-entrance-letters' ) ) {
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
	updateScrolled();
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

// Initialize visibility only after JavaScript can maintain it. Before that,
// including with scripting disabled, links remain available in ordinary flow.
const scrolled = [
	...document.querySelectorAll(
		'.is-scrolled-show, .is-scrolled-hide, .is-scrolled-shrink, .is-scrolled-navigation'
	),
].map( ( element ) => {
	const raw = element.getAttribute( 'data-animewp-scroll-distance' );
	const number = raw === null || raw.trim() === '' ? 64 : Number( raw );
	return {
		element,
		trigger:
			element.getAttribute( 'data-animewp-scroll-trigger' ) === 'hero'
				? 'hero'
				: 'distance',
		distance: Number.isFinite( number )
			? Math.max( 0, Math.min( 10000, number ) )
			: 64,
	};
} );

function firstHero( element ) {
	const content = document.querySelector(
		'main, [role="main"], .wp-block-post-content'
	);
	if ( ! content ) {
		return null;
	}
	// The carousel wrapper appears before its nested Covers in document order.
	// Its full bounds remain stable when the active slide changes.
	return (
		[
			...content.querySelectorAll(
				'.wp-block-animewp-carousel, .wp-block-cover'
			),
		].find( ( candidate ) => {
			const style = window.getComputedStyle( candidate );
			const rect = candidate.getBoundingClientRect();
			return (
				! element.contains( candidate ) &&
				! candidate.closest( '[hidden], header' ) &&
				style.display !== 'none' &&
				style.visibility !== 'hidden' &&
				candidate.getClientRects().length > 0 &&
				rect.width > 0 &&
				rect.height > 0
			);
		} ) || null
	);
}

function updateScrolled() {
	// Retain the previous public marker for saved custom CSS. New blocks use
	// their own state, so one block's threshold never controls another block.
	root.classList.toggle( 'animewp-is-scrolled', window.scrollY > 64 );
	if ( ! scrolled.length ) {
		return;
	}
	let changed = false;
	const entries = scrolled.map( ( item ) => {
		const hero = item.trigger === 'hero' ? firstHero( item.element ) : null;
		let ready = item.trigger === 'distance' || !! hero;
		const wasReady = item.element.classList.contains(
			'animewp-scroll-ready'
		);
		if (
			! wasReady &&
			ready &&
			( item.element.contains(
				item.element.ownerDocument.activeElement
			) ||
				item.element.querySelector( '.is-menu-open' ) )
		) {
			// A delayed module must not hide the link a visitor already reached
			// in the unenhanced fallback, including at mobile breakpoints.
			ready = false;
		}
		if ( wasReady !== ready ) {
			item.element.classList.toggle( 'animewp-scroll-ready', ready );
			changed = true;
		}
		return { ...item, hero, ready };
	} );
	// Mark readiness first: an enhanced header becomes fixed here. Measuring
	// the cover before that layout change would count the old header's height.
	const toolbar = document.getElementById( 'wpadminbar' );
	const top = toolbar
		? Math.max( 0, toolbar.getBoundingClientRect().bottom )
		: 0;
	const bounds = new Map();
	entries.forEach( ( { element, hero, ready, distance } ) => {
		if ( hero && ! bounds.has( hero ) ) {
			bounds.set( hero, hero.getBoundingClientRect().bottom );
		}
		let active =
			ready &&
			( hero ? bounds.get( hero ) <= top : window.scrollY > distance );
		// Do not remove a focused link or switch the layout of an open menu.
		// Reevaluate after focus leaves or Core closes its navigation dialog.
		if (
			ready &&
			! element.classList.contains( 'is-scrolled-shrink' ) &&
			( element.contains( element.ownerDocument.activeElement ) ||
				element.querySelector( '.is-menu-open' ) )
		) {
			active = element.classList.contains( 'is-scrolled-active' );
		}
		if ( element.classList.contains( 'is-scrolled-active' ) !== active ) {
			element.classList.toggle( 'is-scrolled-active', active );
			changed = true;
		}
	} );
	if ( changed ) {
		document.dispatchEvent(
			new window.CustomEvent( 'animewp:scroll-state' )
		);
	}
}

function onScroll() {
	if ( ! ticking ) {
		ticking = true;
		window.requestAnimationFrame( update );
	}
}
if ( scrolled.length || parallax.length ) {
	window.addEventListener( 'scroll', onScroll, { passive: true } );
	window.addEventListener( 'resize', onScroll, { passive: true } );
	window.addEventListener( 'pageshow', onScroll );
	window.addEventListener( 'load', onScroll );
	document.addEventListener( 'focusin', onScroll );
	document.addEventListener( 'focusout', onScroll );
	if ( scrolled.length && 'ResizeObserver' in window ) {
		// Covers, fonts and content above the cover may resize after loading.
		const sizes = new window.ResizeObserver( onScroll );
		sizes.observe( document.body );
		scrolled.forEach( ( { element, trigger } ) => {
			const hero = trigger === 'hero' && firstHero( element );
			if ( hero ) {
				sizes.observe( hero );
			}
		} );
	}
	if ( scrolled.length && 'MutationObserver' in window ) {
		const menus = new window.MutationObserver( onScroll );
		scrolled.forEach( ( { element } ) =>
			menus.observe( element, {
				attributes: true,
				subtree: true,
				attributeFilter: [ 'class' ],
			} )
		);
	}
	update();
}
