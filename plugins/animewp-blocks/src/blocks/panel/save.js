import { InnerBlocks, RichText, useBlockProps } from '@wordpress/block-editor';
import { headingTag, panelClass, panelStyles } from './markup';

export default function save( { attributes: a } ) {
	const Heading = headingTag( a );
	return (
		<section
			{ ...useBlockProps.save( {
				className: panelClass( a ),
				style: panelStyles( a ),
			} ) }
		>
			{ a.heading && (
				<Heading className="animewp-panel__heading">
					<RichText.Content
						tagName="span"
						className="animewp-panel__heading-text"
						value={ a.heading }
					/>
				</Heading>
			) }
			<div className="animewp-panel__content">
				<InnerBlocks.Content />
			</div>
		</section>
	);
}
