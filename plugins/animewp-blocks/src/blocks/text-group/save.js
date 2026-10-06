import { InnerBlocks, useBlockProps } from '@wordpress/block-editor';
import { textGroupStyles } from './markup';

export default function save( { attributes } ) {
	return (
		<div
			{ ...useBlockProps.save( {
				style: textGroupStyles( attributes ),
			} ) }
		>
			<div className="animewp-text-group__content">
				<InnerBlocks.Content />
			</div>
		</div>
	);
}
