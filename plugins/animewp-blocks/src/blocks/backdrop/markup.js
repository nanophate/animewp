import {
	enumValue,
	localPosterUrl,
	numberValue,
	safeUrl,
} from '../../shared/sanitize';

export const MODES = [ 'follow', 'image', 'file', 'follow-video' ];

export function backdropProps( a ) {
	const mode = enumValue( a.mode, MODES, 'follow' );
	return {
		className: 'is-mode-' + mode,
		style: {
			'--animewp-backdrop-blur': numberValue( a.blur, 0, 80, 24 ) + 'px',
			'--animewp-backdrop-veil': String(
				numberValue( a.veil, 0, 100, 55 ) / 100
			),
			'--animewp-backdrop-focus':
				numberValue( a.focalX, 0, 100, 50 ) +
				'% ' +
				numberValue( a.focalY, 0, 100, 50 ) +
				'%',
		},
		'aria-hidden': 'true',
	};
}

export function media( a ) {
	return {
		image: a.mode === 'image' ? localPosterUrl( a.imageUrl ) : '',
		video: a.mode === 'file' ? safeUrl( a.videoUrl ) : '',
	};
}
