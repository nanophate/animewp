/**
 * Player and background URLs built from the validated provider embed URL,
 * so only the hosts allowed by providers.js are ever loaded.
 */
import providers from './providers';

function withParams( url, params ) {
	if ( ! url ) {
		return '';
	}
	const [ base, hash ] = url.split( '#' );
	return (
		base +
		( base.includes( '?' ) ? '&' : '?' ) +
		params +
		( hash ? '#' + hash : '' )
	);
}

/**
 * Player opened by the visitor: starts playing with sound.
 * @param {string} provider youtube or vimeo.
 * @param {string} id       Video ID.
 * @param {number} start    Start time in seconds.
 */
export function playerUrl( provider, id, start = 0 ) {
	return withParams(
		providers.embedUrl( provider, id, start ),
		'autoplay=1'
	);
}

/**
 * Muted, looping, control-less background. Connects on page load.
 * @param {string} provider youtube or vimeo.
 * @param {string} id       Video ID.
 */
export function backgroundUrl( provider, id ) {
	if ( provider === 'youtube' ) {
		return withParams(
			providers.embedUrl( provider, id, 0 ),
			'autoplay=1&mute=1&loop=1&playlist=' +
				id +
				'&controls=0&disablekb=1&playsinline=1&iv_load_policy=3&modestbranding=1'
		);
	}
	if ( provider === 'vimeo' ) {
		return withParams(
			providers.embedUrl( provider, id, 0 ),
			'background=1&muted=1&loop=1&autoplay=1'
		);
	}
	return '';
}

export const normalize = providers.normalize;
