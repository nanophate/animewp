/**
 * Frozen v1.0.0 panel: schema, supports and save, kept independent of the
 * current helpers. WordPress 6.6 saved nonzero opacity with a px suffix;
 * explicit strings reproduce that HTML on old and new serializers.
 */
import { InnerBlocks, RichText, useBlockProps } from '@wordpress/block-editor';

function numberValue( value, min, max, fallback ) {
	return typeof value === 'number' && Number.isFinite( value )
		? Math.min( max, Math.max( min, value ) )
		: fallback;
}
function enumValue( value, allowed, fallback ) {
	return allowed.indexOf( value ) !== -1 ? value : fallback;
}
function safeColor( value, fallback ) {
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
function spacingValue( value ) {
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
function panelClass( a ) {
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
function panelStyles( a ) {
	const styles = {};
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
	if ( a.backdropEnabled === true && a.backdropColor !== '#e5e5e5' ) {
		styles[ '--animewp-panel-backdrop-background' ] = safeColor(
			a.backdropColor,
			'#e5e5e5'
		);
	}
	if ( a.backgroundSkew ) {
		styles[ '--animewp-panel-skew' ] =
			numberValue( a.backgroundSkew, -12, 12, 0 ) + 'deg';
	}
	if ( a.rotation ) {
		styles[ '--animewp-panel-rotation' ] =
			numberValue( a.rotation, -8, 8, 0 ) + 'deg';
	}
	if ( a.backgroundOpacity !== 100 ) {
		const opacity = numberValue( a.backgroundOpacity, 0, 100, 100 ) / 100;
		styles[ '--animewp-panel-opacity' ] =
			opacity === 0 ? '0' : String( opacity ) + 'px';
	}
	if ( a.radius ) {
		styles[ '--animewp-panel-radius' ] =
			numberValue( a.radius, 0, 100, 0 ) + 'px';
	}
	if ( a.highlightColor !== '#e5e5e5' ) {
		styles[ '--animewp-panel-highlight' ] = safeColor(
			a.highlightColor,
			'#e5e5e5'
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

const v100OpacityPx = {
	attributes: {
		heading: {
			type: 'string',
			source: 'html',
			selector: '.animewp-panel__heading-text',
			default: '',
		},
		headingLevel: { type: 'number', enum: [ 2, 3, 4, 5, 6 ], default: 2 },
		verticalHeading: { type: 'boolean', default: false },
		backdropEnabled: { type: 'boolean', default: false },
		backdropColor: { type: 'string', default: '#e5e5e5' },
		boundary: {
			type: 'string',
			enum: [ 'none', 'wave', 'diagonal' ],
			default: 'none',
		},
		backgroundSkew: { type: 'number', default: 0 },
		rotation: { type: 'number', default: 0 },
		backgroundOpacity: { type: 'number', default: 100 },
		radius: { type: 'number', default: 0 },
		panelShadow: {
			type: 'string',
			enum: [ 'none', 'soft', 'hard' ],
			default: 'none',
		},
		textShadow: {
			type: 'string',
			enum: [ 'none', 'soft', 'hard' ],
			default: 'none',
		},
		highlight: {
			type: 'string',
			enum: [ 'none', 'line', 'panel' ],
			default: 'none',
		},
		highlightColor: { type: 'string', default: '#e5e5e5' },
		highlightPadding: { type: 'number', default: 0.2 },
	},
	supports: {
		html: false,
		anchor: true,
		align: [ 'wide', 'full' ],
		color: { background: true, text: true, gradients: false },
		spacing: { margin: true, padding: true, blockGap: true },
		typography: { fontSize: true, lineHeight: true },
		shadow: true,
	},
	save( { attributes: a } ) {
		const Heading = 'h' + enumValue( a.headingLevel, [ 2, 3, 4, 5, 6 ], 2 );
		return (
			<section
				{ ...useBlockProps.save( {
					className: panelClass( a ),
					style: panelStyles( a ),
				} ) }
			>
				{ a.heading && (
					<Heading className="animewp-panel__heading">
						<RichText.Content
							tagName="span"
							className="animewp-panel__heading-text"
							value={ a.heading }
						/>
					</Heading>
				) }
				<div className="animewp-panel__content">
					<InnerBlocks.Content />
				</div>
			</section>
		);
	},
	migrate: ( attributes, innerBlocks ) => [ attributes, innerBlocks ],
};

export default [ v100OpacityPx ];
