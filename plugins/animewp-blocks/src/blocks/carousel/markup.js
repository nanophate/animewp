import {
	enumValue,
	numberValue,
	safeText,
	spacingValue,
} from '../../shared/sanitize';

export const NAV_STYLES = [ 'icon', 'text', 'line', 'none' ];

/**
 * Saved classes, custom properties and data attributes; shared by edit and save.
 * @param {Object} a Block attributes.
 */
export function carouselProps( a ) {
	const style = {
		'--animewp-carousel-slide':
			numberValue( a.slideWidth, 30, 100, 100 ) + '%',
	};
	const gap = spacingValue(
		a.style && a.style.spacing && a.style.spacing.blockGap
	);
	if ( gap !== undefined ) {
		style[ '--animewp-carousel-gap' ] = gap;
	}
	return {
		className: [
			'has-nav-' + enumValue( a.navStyle, NAV_STYLES, 'icon' ),
			'is-effect-' + enumValue( a.effect, [ 'slide', 'fade' ], 'slide' ),
			'has-dots-' +
				enumValue(
					a.dotStyle,
					[ 'dots', 'numbers', 'thumbnails' ],
					'dots'
				),
			a.emphasizeActive === true ? 'is-emphasized' : '',
		]
			.filter( Boolean )
			.join( ' ' ),
		style,
		'data-autoplay':
			a.autoplay > 0
				? String( numberValue( a.autoplay, 1, 20, 6 ) )
				: undefined,
		'data-loop': a.loop === false ? 'false' : undefined,
		'data-dots': a.showDots === false ? 'false' : undefined,
		'data-prev-label': safeText( a.prevLabel, '前へ', 40 ),
		'data-next-label': safeText( a.nextLabel, '次へ', 40 ),
	};
}
