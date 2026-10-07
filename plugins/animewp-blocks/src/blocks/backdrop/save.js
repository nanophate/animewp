import { useBlockProps } from '@wordpress/block-editor';
import { backdropProps, media } from './markup';

export default function save( { attributes } ) {
	const { image, video } = media( attributes );
	return (
		<div { ...useBlockProps.save( backdropProps( attributes ) ) }>
			{ image && (
				<img
					className="animewp-backdrop__media is-active"
					src={ image }
					alt=""
					decoding="async"
				/>
			) }
			{ video && (
				<video
					className="animewp-backdrop__media is-active"
					src={ video }
					muted
					loop
					playsInline
					preload="metadata"
				/>
			) }
			<span className="animewp-backdrop__veil" />
		</div>
	);
}
