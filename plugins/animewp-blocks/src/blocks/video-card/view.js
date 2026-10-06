/**
 * Video Card: open the saved link in a player window. One dialog serves every
 * card on the page; the player is created on open and removed on close.
 */
import {
	createDialog,
	filePlayer,
	iframePlayer,
} from '../../shared/engines/dialog';
import { playerUrl } from '../../shared/player';

let dialog = null;

document.addEventListener( 'click', ( event ) => {
	const link =
		event.target.closest &&
		event.target.closest(
			'.wp-block-animewp-video-card a.animewp-video-card__link'
		);
	if (
		! link ||
		event.defaultPrevented ||
		event.button !== 0 ||
		event.metaKey ||
		event.ctrlKey ||
		event.shiftKey ||
		event.altKey
	) {
		return;
	}
	const { provider, videoId, start, file, closeLabel } = link.dataset;
	if ( ! provider && ! file ) {
		return;
	}
	const src = provider
		? playerUrl( provider, videoId, Number( start || 0 ) )
		: file;
	if ( ! src ) {
		return;
	}
	event.preventDefault();
	if ( ! dialog ) {
		dialog = createDialog( document.body, {
			closeLabel,
			className: 'animewp-dialog',
		} );
	}
	const title = link.getAttribute( 'aria-label' ) || '';
	dialog.open(
		provider ? iframePlayer( src, title ) : filePlayer( src, title ),
		{ label: title, trigger: link }
	);
	link.dispatchEvent( new CustomEvent( 'animewp:play', { bubbles: true } ) );
} );
