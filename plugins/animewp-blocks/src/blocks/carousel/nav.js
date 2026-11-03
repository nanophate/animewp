/** The editor's navigable counterpart to the controls added by view.js. */
import { safeText, safeUrl } from '../../shared/sanitize';

/**
 * Find the first image a slide would display, including nested Core blocks.
 *
 * @param {Object} block The current or nested slide block.
 * @return {string} The first usable image URL, or an empty string.
 */
export function slideThumbnail( block ) {
	const a = block.attributes || {};
	let image = '';
	switch ( block.name ) {
		case 'core/image':
		case 'core/cover':
			image = a.url;
			break;
		case 'core/media-text':
			image = a.mediaType === 'image' ? a.mediaUrl : '';
			break;
		case 'animewp/video-card':
			image = a.posterUrl;
			break;
		case 'animewp/backdrop':
			image = a.mode === 'image' ? a.imageUrl : '';
			break;
	}
	const url = safeUrl( image );
	if ( url ) {
		return url;
	}
	for ( const child of block.innerBlocks || [] ) {
		const nested = slideThumbnail( child );
		if ( nested ) {
			return nested;
		}
	}
	return '';
}

function Arrow( { direction, label, style, onClick, disabled } ) {
	return (
		<button
			type="button"
			className={ 'animewp-carousel__arrow is-' + direction }
			aria-label={ label }
			onClick={ onClick }
			disabled={ disabled }
		>
			{ style === 'icon' && (
				<span className="animewp-carousel__chevron" />
			) }
			{ style === 'line' && direction === 'prev' && (
				<span className="animewp-carousel__line" />
			) }
			{ style !== 'icon' && (
				<span className="animewp-carousel__arrow-text">{ label }</span>
			) }
			{ style === 'line' && direction === 'next' && (
				<span className="animewp-carousel__line" />
			) }
		</button>
	);
}

export function NavPreview( {
	attributes: a,
	slides,
	activeIndex,
	onNavigate,
} ) {
	const count = slides.length;
	if ( count < 2 || ( a.navStyle === 'none' && a.showDots === false ) ) {
		return null;
	}
	const current = Math.min( activeIndex, count - 1 );
	const loop = a.loop !== false;
	const dotStyle = a.dotStyle || 'dots';
	return (
		<div
			className="animewp-carousel__nav"
			role="group"
			aria-label={ safeText( a.label, 'スライド', 80 ) }
		>
			{ a.navStyle !== 'none' && (
				<Arrow
					direction="prev"
					style={ a.navStyle }
					label={ safeText( a.prevLabel, '前へ', 40 ) }
					onClick={ () => onNavigate( current - 1 ) }
					disabled={ ! loop && current === 0 }
				/>
			) }
			{ a.showDots !== false && (
				<div className="animewp-carousel__dots">
					{ slides.map( ( slide, index ) => {
						const image =
							dotStyle === 'thumbnails'
								? slideThumbnail( slide )
								: '';
						let preview = null;
						if ( image ) {
							preview = <img src={ image } alt="" />;
						} else if ( dotStyle !== 'dots' ) {
							preview = String( index + 1 ).padStart( 2, '0' );
						}
						return (
							<button
								type="button"
								className="animewp-carousel__dot"
								key={ slide.clientId }
								aria-label={ `${ index + 1 } / ${ count }` }
								aria-current={
									current === index ? 'true' : undefined
								}
								onClick={ () => onNavigate( index ) }
							>
								{ preview }
							</button>
						);
					} ) }
				</div>
			) }
			{ a.navStyle !== 'none' && (
				<Arrow
					direction="next"
					style={ a.navStyle }
					label={ safeText( a.nextLabel, '次へ', 40 ) }
					onClick={ () => onNavigate( current + 1 ) }
					disabled={ ! loop && current === count - 1 }
				/>
			) }
		</div>
	);
}
