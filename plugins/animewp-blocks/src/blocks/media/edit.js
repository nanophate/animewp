import { __ } from '@wordpress/i18n';
import {
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { Range, Select, Toggle } from '../../shared/controls';
import { mediaClass, mediaStyles } from './markup';

const ALLOWED_BLOCKS = [ 'core/image', 'core/group' ];

export default function Edit( { attributes: a, setAttributes, clientId } ) {
	const shared = { attributes: a, setAttributes };
	const children = useSelect(
		( select ) => select( blockEditorStore ).getBlocks( clientId ),
		[ clientId ]
	);
	const { replaceInnerBlocks } = useDispatch( blockEditorStore );
	const blockProps = useBlockProps( {
		className: mediaClass( a ),
		style: mediaStyles( a ),
	} );
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'animewp-media__layout' },
		{
			allowedBlocks: ALLOWED_BLOCKS,
			// The template only fills an empty block. An "all" lock would re-sync
			// nested content; "insert" keeps both containers but allows reordering.
			templateLock: 'insert',
			template: [
				[
					'core/image',
					{ sizeSlug: 'large', linkDestination: 'none' },
				],
				[
					'core/group',
					{ templateLock: false, layout: { type: 'default' } },
					[
						[
							'core/heading',
							{ placeholder: __( 'Heading', 'animewp-blocks' ) },
						],
						[
							'core/paragraph',
							{
								placeholder: __(
									'Write the text',
									'animewp-blocks'
								),
							},
						],
					],
				],
			],
		}
	);
	const textFirst = children[ 0 ] && children[ 0 ].name === 'core/group';

	function changeReadingOrder( value ) {
		const image = children.find( ( block ) => block.name === 'core/image' );
		const body = children.find( ( block ) => block.name === 'core/group' );
		if ( ! image || ! body ) {
			return;
		}
		const rest = children.filter(
			( block ) => block !== image && block !== body
		);
		replaceInnerBlocks(
			clientId,
			( value === 'text-first'
				? [ body, image ]
				: [ image, body ]
			).concat( rest ),
			false
		);
	}

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Layout', 'animewp-blocks' ) }>
					<SelectControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={ __(
							'Reading order (mobile and screen readers)',
							'animewp-blocks'
						) }
						value={ textFirst ? 'text-first' : 'image-first' }
						options={ [
							{
								label: __(
									'Image, then text',
									'animewp-blocks'
								),
								value: 'image-first',
							},
							{
								label: __(
									'Text, then image',
									'animewp-blocks'
								),
								value: 'text-first',
							},
						] }
						help={ __(
							'Reorders the saved blocks, so mobile layout and screen readers always match.',
							'animewp-blocks'
						) }
						onChange={ changeReadingOrder }
					/>
					<Select
						{ ...shared }
						name="layoutMode"
						label={ __( 'Desktop layout', 'animewp-blocks' ) }
						help={ __(
							'On mobile, image and text always stack in reading order.',
							'animewp-blocks'
						) }
						fallback="side"
						options={ [
							{
								label: __( 'Side by side', 'animewp-blocks' ),
								value: 'side',
							},
							{
								label: __(
									'Text over image',
									'animewp-blocks'
								),
								value: 'overlay',
							},
						] }
					/>
					{ a.layoutMode !== 'overlay' && (
						<>
							<Select
								{ ...shared }
								name="imageSide"
								label={ __(
									'Desktop image position',
									'animewp-blocks'
								) }
								help={ __(
									'Visual only. Set the reading order above.',
									'animewp-blocks'
								) }
								fallback="left"
								options={ [
									{
										label: __( 'Left', 'animewp-blocks' ),
										value: 'left',
									},
									{
										label: __( 'Right', 'animewp-blocks' ),
										value: 'right',
									},
								] }
							/>
							<Range
								{ ...shared }
								name="imageWidth"
								label={ __(
									'Image width (%)',
									'animewp-blocks'
								) }
								min={ 20 }
								max={ 80 }
								fallback={ 50 }
							/>
						</>
					) }
					{ a.layoutMode === 'overlay' && (
						<p>
							{ __(
								'Give the inner group a background, text color and padding so the text stays readable.',
								'animewp-blocks'
							) }
						</p>
					) }
					<Toggle
						{ ...shared }
						name="crop"
						label={ __(
							'Crop image to a fixed height',
							'animewp-blocks'
						) }
					/>
					{ a.crop && (
						<>
							<Range
								{ ...shared }
								name="imageHeight"
								label={ __(
									'Image height (px)',
									'animewp-blocks'
								) }
								min={ 120 }
								max={ 1200 }
								fallback={ 400 }
							/>
							<Range
								{ ...shared }
								name="focalX"
								label={ __(
									'Focal point, horizontal (%)',
									'animewp-blocks'
								) }
								min={ 0 }
								max={ 100 }
								fallback={ 50 }
							/>
							<Range
								{ ...shared }
								name="focalY"
								label={ __(
									'Focal point, vertical (%)',
									'animewp-blocks'
								) }
								min={ 0 }
								max={ 100 }
								fallback={ 50 }
							/>
							<Range
								{ ...shared }
								name="mobileImageHeight"
								label={ __(
									'Mobile image height (px)',
									'animewp-blocks'
								) }
								min={ 120 }
								max={ 800 }
								fallback={ 280 }
							/>
							<Toggle
								{ ...shared }
								name="independentMobileFocus"
								label={ __(
									'Separate focal point on mobile',
									'animewp-blocks'
								) }
							/>
							{ a.independentMobileFocus && (
								<>
									<Range
										{ ...shared }
										name="mobileFocalX"
										label={ __(
											'Mobile focal point, horizontal (%)',
											'animewp-blocks'
										) }
										min={ 0 }
										max={ 100 }
										fallback={ 50 }
									/>
									<Range
										{ ...shared }
										name="mobileFocalY"
										label={ __(
											'Mobile focal point, vertical (%)',
											'animewp-blocks'
										) }
										min={ 0 }
										max={ 100 }
										fallback={ 50 }
									/>
								</>
							) }
						</>
					) }
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>
				<div { ...innerBlocksProps } />
			</div>
		</>
	);
}
