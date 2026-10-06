import { useBlockProps } from '@wordpress/block-editor';
import { decorationProps, imageOf } from './markup';

export default function save( { attributes } ) {
	const image = imageOf( attributes );
	return (
		<div { ...useBlockProps.save( decorationProps( attributes ) ) }>
			{ image ? <img className="animewp-decoration__art" src={ image } alt="" decoding="async" /> : <span className="animewp-decoration__art" /> }
		</div>
	);
}
