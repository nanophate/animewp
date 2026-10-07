import { enumValue, localPosterUrl, numberValue } from '../../shared/sanitize';

export const SHAPES = [
	'circle',
	'ring',
	'petal',
	'sparkle',
	'dots',
	'wave',
	'image',
];

export function decorationProps( a ) {
	const shape = enumValue( a.shape, SHAPES, 'sparkle' );
	return {
		className: [
			'is-shape-' + shape,
			'is-layer-' + ( a.layer === 'front' ? 'front' : 'behind' ),
			a.blend && a.blend !== 'normal'
				? 'is-blend-' +
					enumValue(
						a.blend,
						[ 'multiply', 'screen', 'overlay', 'soft-light' ],
						'multiply'
					)
				: '',
			a.hideOnMobile ? 'is-hidden-mobile' : '',
		]
			.filter( Boolean )
			.join( ' ' ),
		style: {
			'--animewp-decoration-x': numberValue( a.x, -20, 120, 85 ) + '%',
			'--animewp-decoration-y': numberValue( a.y, -20, 120, 20 ) + '%',
			'--animewp-decoration-size': numberValue( a.size, 1, 100, 6 ) + '%',
			'--animewp-decoration-rotation':
				numberValue( a.rotation, -180, 180, 0 ) + 'deg',
			'--animewp-decoration-opacity': String(
				numberValue( a.opacity, 0, 100, 100 ) / 100
			),
		},
		'aria-hidden': 'true',
	};
}

export function imageOf( a ) {
	return a.shape === 'image' ? localPosterUrl( a.imageUrl ) : '';
}
