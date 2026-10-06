import { InnerBlocks, useBlockProps } from '@wordpress/block-editor';
import { carouselProps } from './markup';

export default function save( { attributes } ) {
	return (
		<div { ...useBlockProps.save( carouselProps( attributes ) ) }>
			<div className="animewp-carousel__track">
				<InnerBlocks.Content />
			</div>
		</div>
	);
}
