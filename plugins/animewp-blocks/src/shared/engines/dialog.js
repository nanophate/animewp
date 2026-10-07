/**
 * One modal <dialog> per container. Native showModal provides focus trapping,
 * Escape and an inert page; players are created on open and removed on close.
 * @param {HTMLElement} container        Element the dialog is added to.
 * @param {Object}      root0            Options.
 * @param {string}      root0.closeLabel Close button text.
 * @param {string}      root0.className  Base class name.
 */
export function createDialog(
	container,
	{ closeLabel = '閉じる', className = 'animewp-dialog' } = {}
) {
	const dialog = document.createElement( 'dialog' );
	dialog.className = className;
	const close = document.createElement( 'button' );
	close.type = 'button';
	close.className = className + '__close';
	close.textContent = closeLabel;
	const body = document.createElement( 'div' );
	body.className = className + '__body';
	dialog.append( close, body );
	container.append( dialog );
	let opener = null;

	close.addEventListener( 'click', () => dialog.close() );
	dialog.addEventListener( 'click', ( event ) => {
		if ( event.target === dialog ) {
			dialog.close();
		}
	} );
	dialog.addEventListener( 'close', () => {
		body.replaceChildren();
		document.documentElement.classList.remove( 'animewp-has-dialog' );
		if ( opener && opener.isConnected ) {
			opener.focus( { preventScroll: true } );
		}
	} );

	return {
		open( content, { label, trigger } = {} ) {
			opener = trigger || container.ownerDocument.activeElement;
			dialog.setAttribute( 'aria-label', label || '' );
			// Do not attach an autoplaying player until the modal actually opens.
			dialog.showModal();
			body.replaceChildren( content );
			document.documentElement.classList.add( 'animewp-has-dialog' );
			close.focus( { preventScroll: true } );
		},
		close: () => dialog.close(),
		element: dialog,
	};
}

export function iframePlayer( src, title ) {
	const frame = document.createElement( 'iframe' );
	frame.className = 'animewp-dialog__frame';
	frame.src = src;
	frame.title = title || '';
	frame.allow = 'autoplay; fullscreen; picture-in-picture';
	frame.referrerPolicy = 'strict-origin-when-cross-origin';
	return frame;
}

export function filePlayer( src, title ) {
	const video = document.createElement( 'video' );
	video.className = 'animewp-dialog__video';
	video.src = src;
	video.controls = true;
	video.autoplay = true;
	video.playsInline = true;
	video.setAttribute( 'aria-label', title || '' );
	return video;
}
