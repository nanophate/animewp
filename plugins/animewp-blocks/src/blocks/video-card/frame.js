import { safeColor } from '../../shared/sanitize';

function presetValue( value ) {
	if ( typeof value === 'string' && value.indexOf( 'var:preset|' ) === 0 ) {
		const [ , type, slug ] = value.split( '|' );
		return 'var(--wp--preset--' + type + '--' + slug + ')';
	}
	return value;
}

/**
 * Per-card border from the Core border controls, applied to the poster frame
 * rather than the outer wrapper (Styles → Blocks uses block.json selectors).
 * @param {Object} a Block attributes.
 */
export function frameStyle( a ) {
	const border = ( a.style && a.style.border ) || {};
	const style = {};
	const radius = border.radius;
	if ( typeof radius === 'string' && radius ) {
		style.borderRadius = radius;
	} else if ( radius && typeof radius === 'object' ) {
		style.borderTopLeftRadius = radius.topLeft;
		style.borderTopRightRadius = radius.topRight;
		style.borderBottomRightRadius = radius.bottomRight;
		style.borderBottomLeftRadius = radius.bottomLeft;
	}
	if ( border.width ) {
		style.borderWidth = border.width;
		style.borderStyle = border.style || 'solid';
	}
	let color = '';
	if (
		typeof a.borderColor === 'string' &&
		/^[a-z0-9-]+$/i.test( a.borderColor )
	) {
		color = 'var(--wp--preset--color--' + a.borderColor + ')';
	} else if (
		typeof border.color === 'string' &&
		/^var:preset\|color\|[a-z0-9-]+$/i.test( border.color )
	) {
		color = presetValue( border.color );
	} else {
		color = safeColor( border.color, '' );
	}
	if ( color ) {
		style.borderColor = color;
	}
	const shadow = a.style && a.style.shadow;
	if ( typeof shadow === 'string' && shadow ) {
		style.boxShadow = presetValue( shadow );
	}
	return style;
}
