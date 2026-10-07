import { InnerBlocks, useBlockProps } from '@wordpress/block-editor';
import { mediaClass, mediaStyles } from './markup';

export default function save( { attributes } ) {
	return (
		<div
			{ ...useBlockProps.save( {
				className: mediaClass( attributes ),
				style: mediaStyles( attributes ),
			} ) }
		>
			<div className="animewp-media__layout">
				<InnerBlocks.Content />
			</div>
		</div>
	);
}
