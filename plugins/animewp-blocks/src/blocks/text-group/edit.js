import { __ } from '@wordpress/i18n';
import {
	InnerBlocks,
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { Range } from '../../shared/controls';
import { textGroupStyles } from './markup';

export default function Edit( { attributes, setAttributes } ) {
	const shared = { attributes, setAttributes };
	const blockProps = useBlockProps( {
		style: textGroupStyles( attributes ),
	} );
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'animewp-text-group__content' },
		{
			template: [
				[
					'core/paragraph',
					{ placeholder: __( 'Text to rotate', 'animewp-blocks' ) },
				],
			],
			renderAppender: InnerBlocks.ButtonBlockAppender,
		}
	);
	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Rotation', 'animewp-blocks' ) }>
					<p>
						{ __(
							'Rotates the headings, paragraphs and groups inside this block together. Neighbouring blocks stay level.',
							'animewp-blocks'
						) }
					</p>
					<Range
						{ ...shared }
						name="rotation"
						label={ __( 'Rotation (°)', 'animewp-blocks' ) }
						help={ __(
							'Screens 782px and wider. Negative tilts left, positive tilts right.',
							'animewp-blocks'
						) }
						min={ -8 }
						max={ 8 }
						fallback={ 0 }
					/>
					<Range
						{ ...shared }
						name="mobileRotation"
						label={ __( 'Mobile rotation (°)', 'animewp-blocks' ) }
						help={ __(
							'Screens 781px and narrower. 0° by default for readability.',
							'animewp-blocks'
						) }
						min={ -8 }
						max={ 8 }
						fallback={ 0 }
					/>
					<p>
						{ __(
							'A rotated parent panel or group also tilts this block. To tilt only this text, set the parent to 0°. Select this block from List View if it is hard to click.',
							'animewp-blocks'
						) }
					</p>
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>
				<div { ...innerBlocksProps } />
			</div>
		</>
	);
}
