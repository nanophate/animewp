/**
 * Value guards shared by every block.
 *
 * Saved markup is built from these, so their output is part of the block
 * contract: change one and existing posts stop validating.
 */

export function numberValue( value, min, max, fallback ) {
	return typeof value === 'number' && Number.isFinite( value )
		? Math.min( max, Math.max( min, value ) )
		: fallback;
}

export function enumValue( value, allowed, fallback ) {
	return allowed.indexOf( value ) !== -1 ? value : fallback;
}

export function safeText( value, fallback, max ) {
	return typeof value === 'string' && value.trim()
		? value.trim().slice( 0, max || 200 )
		: fallback;
}

/**
 * A color only: no URL, variable expansion, declarations or nested functions.
 *
 * @param {*}      value    Candidate color.
 * @param {string} fallback Returned when the value is not a plain color.
 * @return {string} A safe color.
 */
export function safeColor( value, fallback ) {
	if ( typeof value !== 'string' ) {
		return fallback;
	}
	const color = value.trim();
	if (
		/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test( color ) ||
		/^[a-z]{1,30}$/i.test( color ) ||
		/^(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\([0-9.,%+\-\s/]+\)$/i.test(
			color
		)
	) {
		return color;
	}
	return fallback;
}

export function safeUrl( value ) {
	if ( typeof value !== 'string' ) {
		return '';
	}
	const url = value.trim();
	if (
		! /^(?:https?:\/\/|\/(?!\/))/i.test( url ) ||
		/[\\\u0000- \u007f<>"`]/.test( url )
	) {
		return '';
	}
	try {
		const parsed = new URL( url, window.location.origin );
		return /^(?:http:|https:)$/.test( parsed.protocol ) &&
			! parsed.username &&
			! parsed.password
			? url
			: '';
	} catch {
		return '';
	}
}

export function languageValue( value ) {
	return typeof value === 'string' &&
		/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test( value )
		? value
		: 'ja';
}

export function isSameOrigin( value ) {
	const url = safeUrl( value );
	return (
		!! url &&
		new URL( url, window.location.origin ).origin === window.location.origin
	);
}

/**
 * Site-relative path for a same-origin image, or '' for anything else.
 *
 * @param {*} value Candidate URL.
 * @return {string} Path, query and hash, or ''.
 */
export function localPosterUrl( value ) {
	const url = safeUrl( value );
	if ( ! url ) {
		return '';
	}
	try {
		const parsed = new URL( url, window.location.origin );
		return parsed.origin === window.location.origin
			? parsed.pathname + parsed.search + parsed.hash
			: '';
	} catch {
		return '';
	}
}

/**
 * Core block-gap value → CSS value, or undefined when not a recognised length or preset.
 *
 * @param {*} value Block gap attribute value.
 * @return {string|undefined} CSS value.
 */
export function spacingValue( value ) {
	if (
		typeof value !== 'string' ||
		! /^(?:0|[\d.]+(?:px|rem|em|vw|vh|%)|var:preset\|spacing\|[a-z0-9-]+)$/i.test(
			value
		)
	) {
		return undefined;
	}
	return value.indexOf( 'var:preset|spacing|' ) === 0
		? 'var(--wp--preset--spacing--' + value.split( '|' )[ 2 ] + ')'
		: value;
}

/**
 * Core-support attributes carried over when transforming to a Core block.
 *
 * @param {Object} attributes Block attributes.
 * @return {Object} The Core-support subset.
 */
export function coreAttributes( attributes ) {
	const result = {};
	[
		'align',
		'anchor',
		'backgroundColor',
		'textColor',
		'gradient',
		'fontSize',
		'style',
	].forEach( ( key ) => {
		if ( attributes[ key ] !== undefined ) {
			result[ key ] = attributes[ key ];
		}
	} );
	return result;
}

/**
 * Absolute URL for showing a saved site path inside the editor canvas. The
 * canvas is a blob: document, where root-relative paths do not resolve.
 *
 * @param {string} path Site-relative path from localPosterUrl().
 * @return {string} Absolute URL, or ''.
 */
export function editorUrl( path ) {
	return path ? new URL( path, window.location.origin ).href : '';
}
