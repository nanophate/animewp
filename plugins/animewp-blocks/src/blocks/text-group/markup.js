import { numberValue, spacingValue } from '../../shared/sanitize';

/**
 * Serialized into posts; see sanitize.js.
 *
 * @param {Object} a Block attributes.
 * @return {Object} Inline style declarations.
 */
export function textGroupStyles( a ) {
	const styles = {};
	if ( a.rotation ) {
		styles[ '--animewp-text-group-rotation' ] =
			numberValue( a.rotation, -8, 8, 0 ) + 'deg';
	}
	if ( a.mobileRotation ) {
		styles[ '--animewp-text-group-mobile-rotation' ] =
			numberValue( a.mobileRotation, -8, 8, 0 ) + 'deg';
	}
	const gap = spacingValue(
		a.style && a.style.spacing && a.style.spacing.blockGap
	);
	if ( gap !== undefined ) {
		styles[ '--animewp-text-group-gap' ] = gap;
	}
	return styles;
}
