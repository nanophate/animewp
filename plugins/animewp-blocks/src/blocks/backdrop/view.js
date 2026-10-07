/**
 * Backdrop: plays a looping file, or follows the current slide / card in the
 * same section (`animewp:slidechange` from Carousel, pointer or focus on a
 * card) by cross-fading its poster or playing its video muted.
 */
import { backgroundUrl } from '../../shared/player';

const reducedMotion = () =>
	window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
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
	const fileVideo = layer.querySelector( 'video.animewp-backdrop__media' );
	if ( fileVideo && ! reducedMotion() ) {
		fileVideo.muted = true;
		fileVideo.play().catch( () => {} );
	}
	const following =
		layer.classList.contains( 'is-mode-follow' ) ||
		layer.classList.contains( 'is-mode-follow-video' );
	if ( ! following || ! section ) {
		return;
	}
	const veil = layer.querySelector( '.animewp-backdrop__veil' );
	const videoMode =
		layer.classList.contains( 'is-mode-follow-video' ) && ! reducedMotion();
	let current = null;
	let timer = 0;

	function show( source ) {
		if ( ! source || source === current ) {
			return;
		}
		current = source;
		const isFrame =
			videoMode &&
			! /\.(?:jpe?g|png|webp|gif|avif|svg)(?:\?|$)/i.test( source );
		const next = document.createElement( isFrame ? 'iframe' : 'img' );
		next.className = 'animewp-backdrop__media';
		next.src = source;
		next.alt = '';
		if ( isFrame ) {
			next.tabIndex = -1;
			next.allow = 'autoplay';
			next.title = '';
			next.referrerPolicy = 'strict-origin-when-cross-origin';
		}
		layer.insertBefore( next, veil );
		const reveal = () => {
			// A timer, not requestAnimationFrame: it also runs in background tabs.
			setTimeout( () => next.classList.add( 'is-active' ), 30 );
			// Remove older layers after the cross-fade.
			setTimeout( () => {
				[ ...layer.querySelectorAll( '.animewp-backdrop__media' ) ]
					.filter( ( node ) => node !== next )
					.forEach( ( node ) => node.remove() );
			}, 1200 );
		};
		if ( isFrame ) {
			reveal();
		} else {
			next.decode().then( reveal, reveal );
		}
	}

	function follow( element ) {
		clearTimeout( timer );
		timer = setTimeout(
			() =>
				show(
					( videoMode && videoOf( element ) ) || posterOf( element )
				),
			videoMode ? 350 : 0
		);
	}

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
