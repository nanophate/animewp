/**
 * Backdrop: plays a looping file, or follows the current slide / card in the
 * same section (`animewp:slidechange` from Carousel, pointer or focus on a
 * card) by cross-fading its poster or playing its video muted.
 */
import { backgroundUrl } from '../../shared/player';

const CARD = '.wp-block-animewp-video-card, .wp-block-image, figure';

function posterOf( element ) {
	const image = element && element.querySelector( 'img' );
	return image ? image.currentSrc || image.src : '';
}

function videoOf( element ) {
	const link = element && element.querySelector( '[data-provider]' );
	return link
		? backgroundUrl( link.dataset.provider, link.dataset.videoId )
		: '';
}

function enhance( layer ) {
	const section = layer.parentElement;
	const motion = window.matchMedia( '(prefers-reduced-motion: reduce)' );
	const fileVideo = layer.querySelector( 'video.animewp-backdrop__media' );
	if ( fileVideo ) {
		fileVideo.muted = true;
		const syncPlayback = () => {
			if ( motion.matches ) {
				fileVideo.pause();
			} else {
				fileVideo.play().catch( () => {} );
			}
		};
		motion.addEventListener( 'change', syncPlayback );
		syncPlayback();
	}
	const following =
		layer.classList.contains( 'is-mode-follow' ) ||
		layer.classList.contains( 'is-mode-follow-video' );
	if ( ! following || ! section ) {
		return;
	}
	const veil = layer.querySelector( '.animewp-backdrop__veil' );
	const videoMode = layer.classList.contains( 'is-mode-follow-video' );
	let current = null;
	let currentMedia = null;
	let currentCard = null;
	let timer = 0;

	function show( source, isFrame ) {
		if ( ! source || source === current ) {
			return;
		}
		current = source;
		const previous = [
			...layer.querySelectorAll( '.animewp-backdrop__media' ),
		];
		const next = document.createElement( isFrame ? 'iframe' : 'img' );
		currentMedia = next;
		next.className = 'animewp-backdrop__media';
		next.src = source;
		if ( isFrame ) {
			next.tabIndex = -1;
			next.allow = 'autoplay';
			next.title = '';
			next.referrerPolicy = 'strict-origin-when-cross-origin';
		} else {
			next.alt = '';
		}
		layer.insertBefore( next, veil );
		const reveal = () => {
			if ( currentMedia !== next ) {
				next.remove();
				return;
			}
			// A timer, not requestAnimationFrame: it also runs in background tabs.
			setTimeout( () => {
				if ( currentMedia === next ) {
					next.classList.add( 'is-active' );
				}
			}, 30 );
			// Capture the old layers: a previous transition must not remove a
			// newer image inserted while its cleanup timer was still pending.
			setTimeout( () => {
				previous.forEach( ( node ) => node.remove() );
			}, 1200 );
		};
		if ( isFrame ) {
			reveal();
		} else {
			next.decode().then( reveal, reveal );
		}
	}

	function follow( element ) {
		currentCard = element;
		clearTimeout( timer );
		const playVideo = videoMode && ! motion.matches;
		timer = setTimeout(
			() => {
				const video = playVideo && videoOf( element );
				// Only validated provider URLs become frames. Poster URLs may
				// have no file extension (CDNs and image handlers are common).
				show( video || posterOf( element ), Boolean( video ) );
			},
			playVideo ? 350 : 0
		);
	}

	motion.addEventListener( 'change', () => {
		if ( motion.matches ) {
			layer.querySelectorAll( 'iframe' ).forEach( ( frame ) => {
				if ( frame === currentMedia ) {
					current = null;
					currentMedia = null;
				}
				frame.remove();
			} );
		}
		follow( currentCard );
	} );

	section.addEventListener( 'animewp:slidechange', ( event ) =>
		follow( event.detail.slide )
	);
	const pick = ( event ) => {
		const card = event.target.closest && event.target.closest( CARD );
		if (
			card &&
			section.contains( card ) &&
			! card.closest( '.wp-block-animewp-carousel' )
		) {
			follow( card );
		}
	};
	section.addEventListener( 'pointerover', pick );
	section.addEventListener( 'focusin', pick );

	// Start with the current slide, or the first card in the section.
	const start =
		section.querySelector(
			'.wp-block-animewp-carousel .animewp-carousel__track > .is-active'
		) ||
		section.querySelector( '.animewp-carousel__track > *' ) ||
		section.querySelector( CARD );
	follow( start );
}

document.querySelectorAll( '.wp-block-animewp-backdrop' ).forEach( enhance );
