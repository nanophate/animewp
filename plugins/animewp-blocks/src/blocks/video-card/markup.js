import { decodeEntities } from '@wordpress/html-entities';
import { normalize } from '../../shared/player';
import {
	enumValue,
	localPosterUrl,
	safeText,
	safeUrl,
} from '../../shared/sanitize';

export const RATIOS = [ '16/9', '21/9', '4/3', '1/1', '3/4', '9/16' ];

/**
 * Play target saved as data attributes; read by view.js.
 * @param {Object} a Block attributes.
 */
export function playTarget( a ) {
	const url = safeUrl( a.url );
	if ( ! url ) {
		return null;
	}
	if ( a.source === 'file' ) {
		return { href: url, 'data-file': url };
	}
	const video = normalize( a.source, a.url );
	if ( ! video ) {
		return null;
	}
	return {
		href: url,
		'data-provider': video.provider,
		'data-video-id': video.id,
		'data-start': String( video.start ),
	};
}

export function plainText( html ) {
	return decodeEntities( ( html || '' ).replace( /<[^>]*>/g, '' ) ).trim();
}

export function cardStyle( a ) {
	return {
		'--animewp-video-card-ratio': enumValue(
			a.aspectRatio,
			RATIOS,
			'16/9'
		),
	};
}

export function poster( a ) {
	return localPosterUrl( a.posterUrl );
}

export function labels( a ) {
	return {
		play: safeText( a.playLabel, '再生', 40 ),
		close: safeText( a.closeLabel, '閉じる', 40 ),
	};
}
