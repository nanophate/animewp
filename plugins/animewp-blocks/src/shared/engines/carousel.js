/**
 * Scroll-snap carousel. CSS does the layout and snapping; this only keeps the
 * active index, buttons, dots, keyboard and optional autoplay in sync.
 * Without JavaScript the track is still a swipeable, scrollable list.
 */
const reducedMotion = () =>
	window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

export function createCarousel( {
	track,
	slides,
	prev,
	next,
	dots = [],
	loop = true,
	autoplay = 0,
	pauseButton,
	onChange,
	mode = 'slide',
} ) {
	const fade = mode === 'fade';
	let active = -1;
	let timer = null;
	let paused = false;
	let frame = 0;

	function setActive( index ) {
		if ( index === active ) {
			return;
		}
		active = index;
		slides.forEach( ( slide, i ) => {
			slide.classList.toggle( 'is-active', i === index );
			// Hidden fade slides must not be reachable by keyboard or screen readers.
			if ( fade ) {
				slide.inert = i !== index;
			}
		} );
		dots.forEach( ( dot, i ) => {
			if ( i === index ) {
				dot.setAttribute( 'aria-current', 'true' );
			} else {
				dot.removeAttribute( 'aria-current' );
			}
		} );
		if ( onChange ) {
			onChange( index );
		}
	}

	function goTo( index, smooth = true ) {
		const count = slides.length;
		if ( ! count ) {
			return;
		}
		const target = loop
			? ( index + count ) % count
			: Math.max( 0, Math.min( count - 1, index ) );
		if ( ! fade ) {
			const slide = slides[ target ];
			const left =
				slide.offsetLeft -
				( track.clientWidth - slide.clientWidth ) / 2;
			track.scrollTo( {
				left,
				behavior: smooth && ! reducedMotion() ? 'smooth' : 'auto',
			} );
		}
		setActive( target );
	}

	function nearest() {
		const center = track.scrollLeft + track.clientWidth / 2;
		let best = 0;
		let distance = Infinity;
		slides.forEach( ( slide, i ) => {
			const d = Math.abs(
				slide.offsetLeft + slide.clientWidth / 2 - center
			);
			if ( d < distance ) {
				distance = d;
				best = i;
			}
		} );
		return best;
	}

	if ( fade ) {
		// Slides are stacked; a horizontal swipe changes them.
		let startX = null;
		track.addEventListener( 'pointerdown', ( event ) => {
			startX = event.clientX;
		} );
		track.addEventListener( 'pointerup', ( event ) => {
			if ( startX !== null && Math.abs( event.clientX - startX ) > 40 ) {
				goTo( active + ( event.clientX < startX ? 1 : -1 ) );
			}
			startX = null;
		} );
	} else {
		track.addEventListener(
			'scroll',
			() => {
				window.cancelAnimationFrame( frame );
				frame = window.requestAnimationFrame( () =>
					setActive( nearest() )
				);
			},
			{ passive: true }
		);
	}
	if ( prev ) {
		prev.addEventListener( 'click', () => goTo( active - 1 ) );
	}
	if ( next ) {
		next.addEventListener( 'click', () => goTo( active + 1 ) );
	}
	dots.forEach( ( dot, i ) =>
		dot.addEventListener( 'click', () => goTo( i ) )
	);
	track.addEventListener( 'keydown', ( event ) => {
		if ( event.key === 'ArrowRight' || event.key === 'ArrowLeft' ) {
			event.preventDefault();
			goTo( active + ( event.key === 'ArrowRight' ? 1 : -1 ) );
		}
	} );

	// Autoplay pauses on hover, focus, hidden tab, and the visible pause button.
	function stop() {
		clearInterval( timer );
		timer = null;
	}
	function start() {
		stop();
		if (
			autoplay > 0 &&
			! paused &&
			! reducedMotion() &&
			slides.length > 1
		) {
			timer = setInterval( () => goTo( active + 1 ), autoplay * 1000 );
		}
	}
	if ( autoplay > 0 ) {
		const root = track.parentElement;
		root.addEventListener( 'pointerenter', stop );
		root.addEventListener( 'pointerleave', start );
		root.addEventListener( 'focusin', stop );
		root.addEventListener( 'focusout', start );
		document.addEventListener( 'visibilitychange', () =>
			document.hidden ? stop() : start()
		);
		if ( pauseButton ) {
			pauseButton.hidden = false;
			pauseButton.addEventListener( 'click', () => {
				paused = ! paused;
				pauseButton.setAttribute( 'aria-pressed', String( paused ) );
				if ( paused ) {
					stop();
				} else {
					start();
				}
			} );
		}
		start();
	}

	setActive( 0 );
	return {
		goTo,
		get active() {
			return active;
		},
	};
}
