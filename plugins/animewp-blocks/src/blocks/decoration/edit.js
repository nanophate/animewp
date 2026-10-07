import { __ } from '@wordpress/i18n';
import {
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
	useBlockProps,
} from '@wordpress/block-editor';
import { Button, PanelBody } from '@wordpress/components';
import { Range, Select, Toggle } from '../../shared/controls';
import { editorUrl, localPosterUrl, numberValue } from '../../shared/sanitize';
import { SHAPES, decorationProps, imageOf } from './markup';

export default function Edit( { attributes: a, setAttributes } ) {
	const shared = { attributes: a, setAttributes };
	const { className, style } = decorationProps( a );
	const blockProps = useBlockProps( { className, style } );
	const image = imageOf( a );
	const names = {
		circle: __( 'Circle', 'animewp-blocks' ),
		ring: __( 'Ring', 'animewp-blocks' ),
		petal: __( 'Petal', 'animewp-blocks' ),
		sparkle: __( 'Sparkle', 'animewp-blocks' ),
		dots: __( 'Dots', 'animewp-blocks' ),
		wave: __( 'Wave', 'animewp-blocks' ),
		image: __( 'Your image', 'animewp-blocks' ),
	};

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Decoration', 'animewp-blocks' ) }>
					<div
						className="animewp-decoration-shapes"
						role="group"
						aria-label={ __( 'Shape', 'animewp-blocks' ) }
					>
						{ SHAPES.map( ( shape ) => (
							<Button
								key={ shape }
								className={
									'animewp-decoration-shapes__item is-shape-' +
									shape
								}
								isPressed={ a.shape === shape }
								label={ names[ shape ] }
								showTooltip
								onClick={ () => setAttributes( { shape } ) }
							>
								{ shape === 'image' ? (
									__( 'Image', 'animewp-blocks' )
								) : (
									<span className="animewp-decoration__art" />
								) }
							</Button>
						) ) }
					</div>
					{ a.shape === 'image' ? (
						<MediaUploadCheck>
							<MediaUpload
								allowedTypes={ [ 'image' ] }
								value={ a.imageId }
								onSelect={ ( item ) =>
									setAttributes( {
										imageId: numberValue(
											item.id,
											0,
											Number.MAX_SAFE_INTEGER,
											0
										),
										imageUrl: localPosterUrl( item.url ),
									} )
								}
								render={ ( { open } ) => (
									<Button
										variant="secondary"
										onClick={ open }
									>
										{ image
											? __(
													'Replace image',
													'animewp-blocks'
												)
											: __(
													'Choose image',
													'animewp-blocks'
												) }
									</Button>
								) }
							/>
						</MediaUploadCheck>
					) : (
						<p>
							{ __(
								'The shape uses this block’s text color (Styles → Color).',
								'animewp-blocks'
							) }
						</p>
					) }
					<Range
						{ ...shared }
						name="x"
						label={ __(
							'Horizontal position (%)',
							'animewp-blocks'
						) }
						min={ -20 }
						max={ 120 }
						fallback={ 85 }
					/>
					<Range
						{ ...shared }
						name="y"
						label={ __(
							'Vertical position (%)',
							'animewp-blocks'
						) }
						min={ -20 }
						max={ 120 }
						fallback={ 20 }
					/>
					<Range
						{ ...shared }
						name="size"
						label={ __(
							'Size (% of the section width)',
							'animewp-blocks'
						) }
						min={ 1 }
						max={ 100 }
						fallback={ 6 }
					/>
					<Range
						{ ...shared }
						name="rotation"
						label={ __( 'Rotation (°)', 'animewp-blocks' ) }
						min={ -180 }
						max={ 180 }
						fallback={ 0 }
					/>
					<Range
						{ ...shared }
						name="opacity"
						label={ __( 'Opacity (%)', 'animewp-blocks' ) }
						min={ 0 }
						max={ 100 }
						fallback={ 100 }
					/>
					<Select
						{ ...shared }
						name="layer"
						label={ __( 'Layer', 'animewp-blocks' ) }
						fallback="behind"
						options={ [
							{
								label: __(
									'Behind the content',
									'animewp-blocks'
								),
								value: 'behind',
							},
							{
								label: __(
									'In front of the content',
									'animewp-blocks'
								),
								value: 'front',
							},
						] }
					/>
					<Select
						{ ...shared }
						name="blend"
						label={ __( 'Blend', 'animewp-blocks' ) }
						fallback="normal"
						options={ [
							{
								label: __( 'Normal', 'animewp-blocks' ),
								value: 'normal',
							},
							{
								label: __(
									'Multiply (darken)',
									'animewp-blocks'
								),
								value: 'multiply',
							},
							{
								label: __(
									'Screen (lighten)',
									'animewp-blocks'
								),
								value: 'screen',
							},
							{
								label: __( 'Overlay', 'animewp-blocks' ),
								value: 'overlay',
							},
							{
								label: __( 'Soft light', 'animewp-blocks' ),
								value: 'soft-light',
							},
						] }
					/>
					<Toggle
						{ ...shared }
						name="hideOnMobile"
						label={ __(
							'Hide on small screens',
							'animewp-blocks'
						) }
					/>
					<p className="animewp-motion-note">
						{ __(
							'To make it drift, open Motion below and choose Keep moving → Float, or set Parallax.',
							'animewp-blocks'
						) }
					</p>
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>
				{ image ? (
					<img
						className="animewp-decoration__art"
						src={ editorUrl( image ) }
						alt=""
					/>
				) : (
					<span className="animewp-decoration__art" />
				) }
			</div>
		</>
	);
}
