/**
 * Motion settings: one object attribute (`animewpMotion`) available on every
 * block. It is stored in the block comment only; includes/motion.php turns it
 * into classes and custom properties when the page renders, so saved HTML
 * never changes and the content stays valid without this plugin.
 */
import { enumValue, numberValue, safeColor } from '../shared/sanitize';

export const ATTRIBUTE = 'animewpMotion';
export const ENTRANCES = [
	'none',
	'fade',
	'rise',
	'slide-start',
	'slide-end',
	'zoom',
	'blur',
	'mask',
	'letters',
];
export const HOVERS = [ 'none', 'lift', 'zoom', 'glow' ];
export const LOOPS = [ 'none', 'float', 'sway', 'pulse' ];
export const SCROLLED = [ 'none', 'hide', 'show', 'shrink', 'navigation' ];

/** Blocks the panel is not offered on. */
export const SKIP = [
	'core/missing',
	'core/freeform',
	'core/block',
	'core/template-part',
	'core/post-content',
	'animewp/backdrop',
];

export function normalized( value ) {
	const m = value && typeof value === 'object' ? value : {};
	return {
		entrance: enumValue( m.entrance, ENTRANCES, 'none' ),
		target: m.target === 'children' ? 'children' : 'self',
		delay: numberValue( m.delay, 0, 3000, 0 ),
		duration: numberValue( m.duration, 0, 4000, 0 ),
		stagger: numberValue( m.stagger, 0, 1000, 0 ),
		hover: enumValue( m.hover, HOVERS, 'none' ),
		loop: enumValue( m.loop, LOOPS, 'none' ),
		parallax: numberValue( m.parallax, -50, 50, 0 ),
		scrolled: enumValue( m.scrolled, SCROLLED, 'none' ),
		scrollTrigger: enumValue(
			m.scrollTrigger,
			[ 'distance', 'hero' ],
			'distance'
		),
		scrollDistance: Math.round(
			numberValue( m.scrollDistance, 0, 10000, 64 )
		),
		headerAppearance: m.headerAppearance === true,
		headerOpacity: Math.round( numberValue( m.headerOpacity, 0, 100, 82 ) ),
		headerBlur: Math.round( numberValue( m.headerBlur, 0, 24, 12 ) ),
		headerHeight: Math.round( numberValue( m.headerHeight, 48, 120, 60 ) ),
	};
}

export function isActive( value ) {
	const m = normalized( value );
	return (
		m.entrance !== 'none' ||
		m.hover !== 'none' ||
		m.loop !== 'none' ||
		m.parallax !== 0 ||
		m.scrolled !== 'none' ||
		m.headerAppearance
	);
}

/**
 * Classes and custom properties; mirrored in includes/motion.php.
 * @param {Object} value      Saved motion attribute.
 * @param {Object} attributes Optional Core attributes for the editor preview.
 */
export function motionProps( value, attributes ) {
	const m = normalized( value );
	const classes = [ 'animewp-motion' ];
	const style = {};
	if ( m.entrance !== 'none' ) {
		classes.push( 'has-entrance', 'has-entrance-' + m.entrance );
	}
	if ( m.target === 'children' ) {
		classes.push( 'is-target-children' );
	}
	if ( m.hover !== 'none' ) {
		classes.push( 'has-hover-' + m.hover );
	}
	if ( m.loop !== 'none' ) {
		classes.push( 'has-loop-' + m.loop );
	}
	if ( m.parallax !== 0 ) {
		classes.push( 'has-parallax' );
		style[ '--animewp-parallax' ] = String( m.parallax / 100 );
	}
	if ( m.scrolled !== 'none' ) {
		classes.push( 'is-scrolled-' + m.scrolled );
	}
	if ( m.headerAppearance ) {
		style[ '--animewp-header-opacity' ] = m.headerOpacity + '%';
		style[ '--animewp-header-blur' ] = m.headerBlur + 'px';
		style[ '--animewp-header-height' ] = m.headerHeight + 'px';
		if ( attributes ) {
			const fallback = 'var(--wp--preset--color--base, #fff)';
			const preset = attributes.backgroundColor;
			style[ '--animewp-header-background' ] =
				typeof preset === 'string' && /^[a-z0-9-]+$/i.test( preset )
					? `var(--wp--preset--color--${ preset }, ${ fallback })`
					: safeColor(
							attributes.style?.color?.background,
							fallback
						);
		}
	}
	if ( m.delay ) {
		style[ '--animewp-delay' ] = m.delay + 'ms';
	}
	if ( m.duration ) {
		style[ '--animewp-duration' ] = m.duration + 'ms';
	}
	if ( m.stagger ) {
		style[ '--animewp-stagger' ] = m.stagger + 'ms';
	}
	return { className: classes.join( ' ' ), style };
}
