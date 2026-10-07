/**
 * Carousel: adds buttons, dots and keyboard support to the saved track and
 * announces the current slide with an `animewp:slidechange` event (used by
 * the Backdrop block). Without this script the track still scrolls and snaps.
 */
import { createCarousel } from '../../shared/engines/carousel';

function element( tag, className, text ) {
	const node = document.createElement( tag );
	node.className = className;
	if ( text ) {
		node.textContent = text;
	}
	return node;
}

function arrow( direction, style, label ) {
	const button = element(
		'button',
		'animewp-carousel__arrow is-' + direction
	);
	button.type = 'button';
	if ( style === 'icon' ) {
		button.setAttribute( 'aria-label', label );
		button.append( element( 'span', 'animewp-carousel__chevron' ) );
	} else {
		const text = element( 'span', 'animewp-carousel__arrow-text', label );
		const line =
			style === 'line'
				? element( 'span', 'animewp-carousel__line' )
				: null;
		if ( line && direction === 'prev' ) {
			button.append( line );
		}
		button.append( text );
		if ( line && direction === 'next' ) {
			button.append( line );
		}
	}
	return button;
}

function enhance( root ) {
	const track = root.querySelector( ':scope > .animewp-carousel__track' );
	const slides = track ? [ ...track.children ] : [];
	if ( slides.length < 2 ) {
		return;
	}
	const style =
		[ 'icon', 'text', 'line', 'none' ].find( ( name ) =>
			root.classList.contains( 'has-nav-' + name )
		) || 'icon';
	const nav = element( 'div', 'animewp-carousel__nav' );
	const prev =
		style === 'none'
			? null
			: arrow( 'prev', style, root.dataset.prevLabel || '前へ' );
	const next =
		style === 'none'
			? null
			: arrow( 'next', style, root.dataset.nextLabel || '次へ' );
	const dots = [];
	if ( prev ) {
		nav.append( prev );
	}
	if ( root.dataset.dots !== 'false' ) {
		const group = element( 'div', 'animewp-carousel__dots' );
		group.setAttribute( 'role', 'group' );
		group.setAttribute( 'aria-label', root.dataset.label || 'スライド' );
		const dotStyle =
			[ 'numbers', 'thumbnails' ].find( ( name ) =>
				root.classList.contains( 'has-dots-' + name )
			) || 'dots';
		slides.forEach( ( slide, index ) => {
			const dot = element( 'button', 'animewp-carousel__dot' );
			dot.type = 'button';
			const heading = slide.querySelector(
				'h1, h2, h3, h4, h5, h6, figcaption, .animewp-video-card__title'
			);
			const name = heading ? heading.textContent.trim() : '';
			dot.setAttribute(
				'aria-label',
				( index + 1 + ' / ' + slides.length + ' ' + name ).trim()
			);
			if ( dotStyle === 'numbers' ) {
				dot.textContent = String( index + 1 ).padStart( 2, '0' );
			} else if ( dotStyle === 'thumbnails' ) {
				const image = slide.querySelector( 'img' );
				if ( image ) {
					const thumb = document.createElement( 'img' );
					thumb.src = image.currentSrc || image.src;
					thumb.alt = '';
					thumb.loading = 'lazy';
					dot.append( thumb );
				} else {
					dot.textContent = String( index + 1 ).padStart( 2, '0' );
				}
			}
			dots.push( dot );
			group.append( dot );
		} );
		nav.append( group );
	}
	if ( next ) {
		nav.append( next );
	}
	const autoplay = Number( root.dataset.autoplay || 0 );
	let pause = null;
	if ( autoplay > 0 ) {
		pause = element( 'button', 'animewp-carousel__pause' );
		pause.type = 'button';
		pause.hidden = true;
		pause.setAttribute( 'aria-pressed', 'false' );
		pause.setAttribute(
			'aria-label',
			root.dataset.pauseLabel || '自動切り替えを一時停止'
		);
		nav.append( pause );
	}
	if ( nav.childElementCount ) {
		root.append( nav );
	}

	// aria-roledescription is only announced on an element with a role.
	root.setAttribute( 'role', 'region' );
	root.setAttribute( 'aria-roledescription', 'carousel' );
	root.setAttribute( 'aria-label', root.dataset.label || 'スライド' );
	track.tabIndex = 0;
	slides.forEach( ( slide, index ) => {
		slide.setAttribute( 'role', 'group' );
		slide.setAttribute( 'aria-roledescription', 'slide' );
		slide.setAttribute( 'aria-label', index + 1 + ' / ' + slides.length );
	} );

	createCarousel( {
		track,
		slides,
		prev,
		next,
		dots,
		loop: root.dataset.loop !== 'false',
		autoplay,
		pauseButton: pause,
		mode: root.classList.contains( 'is-effect-fade' ) ? 'fade' : 'slide',
		onChange( index ) {
			root.dispatchEvent(
				new CustomEvent( 'animewp:slidechange', {
					bubbles: true,
					detail: { index, slide: slides[ index ] },
				} )
			);
		},
	} );
	root.classList.add( 'is-enhanced' );
}

document.querySelectorAll( '.wp-block-animewp-carousel' ).forEach( enhance );
