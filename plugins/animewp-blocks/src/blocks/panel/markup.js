/**
 * Class and inline-style builders shared by edit and save.
 * Their output is serialized into posts; see sanitize.js.
 */
import {
	enumValue,
	numberValue,
	safeColor,
	spacingValue,
} from '../../shared/sanitize';

export const ROLES = [ 'surface', 'accent', 'contrast' ];

export function decorationColor( a, prefix ) {
	const mode = a[ prefix + 'ColorMode' ];
	const slug =
		mode === 'role'
			? enumValue( a[ prefix + 'Role' ], ROLES, 'surface' )
			: a[ prefix + 'Preset' ];
	if (
		( mode === 'role' || mode === 'preset' ) &&
		typeof slug === 'string' &&
		/^[\p{L}\p{N}-]+$/u.test( slug )
	) {
		const fallback =
			mode === 'role' && slug !== 'surface' ? '#202020' : '#e5e5e5';
		return 'var(--wp--preset--color--' + slug + ',' + fallback + ')';
	}
	return safeColor( a[ prefix + 'Color' ], '#e5e5e5' );
}

export function roleForeground( a, prefix ) {
	const role = enumValue( a[ prefix + 'Role' ], ROLES, 'surface' );
	return role === 'surface'
		? 'var(--wp--preset--color--contrast,#202020)'
		: 'var(--wp--preset--color--on-' + role + ',#ffffff)';
}

export function headingTag( a ) {
	return 'h' + enumValue( a.headingLevel, [ 2, 3, 4, 5, 6 ], 2 );
}

export function panelClass( a ) {
	const headingLength = ( a.heading || '' ).replace( /<[^>]*>/g, '' ).length;
	const vertical =
		a.verticalHeading === true && headingLength > 0 && headingLength <= 40;
	return [
		'animewp-panel--boundary-' +
			enumValue( a.boundary, [ 'none', 'wave', 'diagonal' ], 'none' ),
		'animewp-panel--shadow-' +
			enumValue( a.panelShadow, [ 'none', 'soft', 'hard' ], 'none' ),
		'animewp-panel--text-shadow-' +
			enumValue( a.textShadow, [ 'none', 'soft', 'hard' ], 'none' ),
		'animewp-panel--highlight-' +
			enumValue( a.highlight, [ 'none', 'line', 'panel' ], 'none' ),
		vertical ? 'animewp-panel--vertical-heading' : '',
		a.backdropEnabled === true ? 'animewp-panel--backdrop' : '',
	]
		.filter( Boolean )
		.join( ' ' );
}

export function panelStyles( a ) {
	const styles = {};
	// Legacy variable kept so saved panels stay valid. Core backgrounds paint
	// on the root; the optional backdrop layer is separate.
	const color = a.style && a.style.color && a.style.color.background;
	if ( color ) {
		styles[ '--animewp-panel-background' ] = safeColor(
			color,
			'transparent'
		);
	} else if (
		typeof a.backgroundColor === 'string' &&
		/^[a-z0-9-]+$/i.test( a.backgroundColor )
	) {
		styles[ '--animewp-panel-background' ] =
			'var(--wp--preset--color--' + a.backgroundColor + ')';
	}
	if (
		a.backdropEnabled === true &&
		( a.backdropColor !== '#e5e5e5' ||
			( a.backdropColorMode && a.backdropColorMode !== 'custom' ) )
	) {
		styles[ '--animewp-panel-backdrop-background' ] = decorationColor(
			a,
			'backdrop'
		);
	}
	const explicitText =
		a.textColor || ( a.style && a.style.color && a.style.color.text );
	if (
		! explicitText &&
		a.backdropEnabled &&
		a.backdropColorMode === 'role'
	) {
		styles[ '--animewp-panel-role-foreground' ] = roleForeground(
			a,
			'backdrop'
		);
		styles.color = roleForeground( a, 'backdrop' );
	}
	if (
		! explicitText &&
		a.highlight !== 'none' &&
		a.highlightColorMode === 'role'
	) {
		styles[ '--animewp-panel-highlight-foreground' ] = roleForeground(
			a,
			'highlight'
		);
	}
	if ( a.backgroundSkew ) {
		styles[ '--animewp-panel-skew' ] =
			numberValue( a.backgroundSkew, -12, 12, 0 ) + 'deg';
	}
	// Defaults are omitted so older panels do not gain a serialized style.
	if ( a.backgroundRotation ) {
		styles[ '--animewp-panel-backdrop-rotation' ] =
			numberValue( a.backgroundRotation, -8, 8, 0 ) + 'deg';
	}
	if ( a.rotation ) {
		styles[ '--animewp-panel-rotation' ] =
			numberValue( a.rotation, -8, 8, 0 ) + 'deg';
	}
	// A string, because older serializers append px to numeric custom properties.
	if ( a.backgroundOpacity !== 100 ) {
		styles[ '--animewp-panel-opacity' ] = String(
			numberValue( a.backgroundOpacity, 0, 100, 100 ) / 100
		);
	}
	if ( a.radius ) {
		styles[ '--animewp-panel-radius' ] =
			numberValue( a.radius, 0, 100, 0 ) + 'px';
	}
	if (
		a.highlightColor !== '#e5e5e5' ||
		( a.highlightColorMode && a.highlightColorMode !== 'custom' )
	) {
		styles[ '--animewp-panel-highlight' ] = decorationColor(
			a,
			'highlight'
		);
	}
	if ( a.highlightPadding !== 0.2 ) {
		styles[ '--animewp-panel-highlight-padding' ] =
			numberValue( a.highlightPadding, 0, 2, 0.2 ) + 'em';
	}
	const gap = spacingValue(
		a.style && a.style.spacing && a.style.spacing.blockGap
	);
	if ( gap !== undefined ) {
		styles[ '--animewp-panel-gap' ] = gap;
	}
	return styles;
}
