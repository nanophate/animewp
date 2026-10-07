import { enumValue, numberValue, spacingValue } from '../../shared/sanitize';

/**
 * Serialized into posts; see sanitize.js.
 *
 * @param {Object} a Block attributes.
 * @return {string} Class names.
 */
export function mediaClass( a ) {
	return (
		'animewp-media--' +
		enumValue( a.layoutMode, [ 'side', 'overlay' ], 'side' ) +
		' animewp-media--image-' +
		enumValue( a.imageSide, [ 'left', 'right' ], 'left' ) +
		( a.crop === true ? ' animewp-media--crop' : '' )
	);
}

export function mediaStyles( a ) {
	const styles = {};
	if ( a.imageWidth !== 50 ) {
		styles[ '--animewp-media-image-width' ] =
			numberValue( a.imageWidth, 20, 80, 50 ) + '%';
	}
	if ( a.crop === true ) {
		styles[ '--animewp-media-focus' ] =
			numberValue( a.focalX, 0, 100, 50 ) +
			'% ' +
			numberValue( a.focalY, 0, 100, 50 ) +
			'%';
		styles[ '--animewp-media-mobile-focus' ] =
			a.independentMobileFocus === true
				? numberValue( a.mobileFocalX, 0, 100, 50 ) +
					'% ' +
					numberValue( a.mobileFocalY, 0, 100, 50 ) +
					'%'
				: styles[ '--animewp-media-focus' ];
		styles[ '--animewp-media-height' ] =
			numberValue( a.imageHeight, 120, 1200, 400 ) + 'px';
		styles[ '--animewp-media-mobile-height' ] =
			numberValue( a.mobileImageHeight, 120, 800, 280 ) + 'px';
	}
	const gap = spacingValue(
		a.style && a.style.spacing && a.style.spacing.blockGap
	);
	if ( gap !== undefined ) {
		styles[ '--animewp-media-gap' ] = gap;
	}
	return styles;
}
