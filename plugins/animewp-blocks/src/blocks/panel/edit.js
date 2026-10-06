import { __ } from '@wordpress/i18n';
import {
	ColorPalette,
	InnerBlocks,
	InspectorControls,
	RichText,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { BaseControl, PanelBody, SelectControl } from '@wordpress/components';
import { Range, Select, Toggle } from '../../shared/controls';
import { enumValue, safeColor } from '../../shared/sanitize';
import { headingTag, panelClass, panelStyles } from './markup';

function DecorationColor( { attributes: a, setAttributes, prefix } ) {
	const mode = enumValue(
		a[ prefix + 'ColorMode' ],
		[ 'custom', 'preset', 'role' ],
		'custom'
	);
	const colors = window.animewpColorPresets || [];
	const shared = { attributes: a, setAttributes };
	return (
		<>
			<Select
				{ ...shared }
				name={ prefix + 'ColorMode' }
				label={ __( 'Color source', 'animewp-blocks' ) }
				fallback="custom"
				options={ [
					{
						label: __(
							'Custom color (kept as is)',
							'animewp-blocks'
						),
						value: 'custom',
					},
					{
						label: __( 'Follow a site color', 'animewp-blocks' ),
						value: 'preset',
					},
					{
						label: __( 'Follow a color role', 'animewp-blocks' ),
						value: 'role',
					},
				] }
			/>
			{ mode === 'custom' && (
				<ColorPalette
					colors={ colors.filter(
						( color ) => !! safeColor( color.color, '' )
					) }
					value={ safeColor( a[ prefix + 'Color' ], '#e5e5e5' ) }
					onChange={ ( value ) =>
						setAttributes( {
							[ prefix + 'Color' ]: safeColor( value, '#e5e5e5' ),
						} )
					}
				/>
			) }
			{ mode === 'preset' && (
				<SelectControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={ __( 'Site color', 'animewp-blocks' ) }
					value={ a[ prefix + 'Preset' ] }
					options={ [
						{
							label: __( 'Choose a color', 'animewp-blocks' ),
							value: '',
						},
					].concat(
						colors.map( ( color ) => ( {
							label: color.name || color.slug,
							value: color.variableSlug,
						} ) )
					) }
					onChange={ ( value ) =>
						setAttributes( { [ prefix + 'Preset' ]: value } )
					}
				/>
			) }
			{ mode === 'role' && (
				<Select
					{ ...shared }
					name={ prefix + 'Role' }
					label={ __( 'Color role', 'animewp-blocks' ) }
					fallback="surface"
					options={ [
						{
							label: __(
								'Surface (soft background)',
								'animewp-blocks'
							),
							value: 'surface',
						},
						{
							label: __( 'Accent', 'animewp-blocks' ),
							value: 'accent',
						},
						{
							label: __(
								'Contrast (dark surface)',
								'animewp-blocks'
							),
							value: 'contrast',
						},
					] }
				/>
			) }
			<p>
				{ __(
					'Site colors and roles update when the color scheme changes; custom colors stay fixed. A role also picks a matching text color unless the block sets its own. Check readability after changing.',
					'animewp-blocks'
				) }
			</p>
		</>
	);
}

export default function Edit( { attributes: a, setAttributes } ) {
	const shared = { attributes: a, setAttributes };
	const blockProps = useBlockProps( {
		className: panelClass( a ),
		style: panelStyles( a ),
	} );
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'animewp-panel__content' },
		{
			template: [ [ 'core/paragraph', {} ] ],
			renderAppender: InnerBlocks.ButtonBlockAppender,
		}
	);
	const shadows = [
		{ label: __( 'None', 'animewp-blocks' ), value: 'none' },
		{ label: __( 'Soft', 'animewp-blocks' ), value: 'soft' },
		{ label: __( 'Hard', 'animewp-blocks' ), value: 'hard' },
	];
	const Heading = headingTag( a );

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={ __( 'Panel decoration', 'animewp-blocks' ) }
					initialOpen={ false }
				>
					<p>
						{ __(
							'Background, text color, spacing and font size use the standard Styles controls.',
							'animewp-blocks'
						) }
					</p>
					<Toggle
						{ ...shared }
						name="backdropEnabled"
						label={ __( 'Add a backdrop layer', 'animewp-blocks' ) }
						help={ __(
							'Adds a separate color shape behind the content. The standard background is unchanged.',
							'animewp-blocks'
						) }
					/>
					{ a.backdropEnabled && (
						<>
							<fieldset className="animewp-blocks-fieldset">
								<BaseControl.VisualLabel as="legend">
									{ __( 'Backdrop color', 'animewp-blocks' ) }
								</BaseControl.VisualLabel>
								<DecorationColor
									{ ...shared }
									prefix="backdrop"
								/>
							</fieldset>
							<Select
								{ ...shared }
								name="boundary"
								label={ __(
									'Backdrop edge',
									'animewp-blocks'
								) }
								fallback="none"
								options={ [
									{
										label: __(
											'Straight',
											'animewp-blocks'
										),
										value: 'none',
									},
									{
										label: __( 'Wave', 'animewp-blocks' ),
										value: 'wave',
									},
									{
										label: __(
											'Diagonal',
											'animewp-blocks'
										),
										value: 'diagonal',
									},
								] }
							/>
							<Range
								{ ...shared }
								name="backgroundRotation"
								label={ __(
									'Backdrop rotation (°)',
									'animewp-blocks'
								) }
								help={ __(
									'Rotates only the backdrop. Content stays level.',
									'animewp-blocks'
								) }
								min={ -8 }
								max={ 8 }
								fallback={ 0 }
							/>
							<Range
								{ ...shared }
								name="backgroundSkew"
								label={ __(
									'Backdrop skew (°)',
									'animewp-blocks'
								) }
								help={ __(
									'Slants the backdrop. Separate from rotation.',
									'animewp-blocks'
								) }
								min={ -12 }
								max={ 12 }
								fallback={ 0 }
							/>
							<Range
								{ ...shared }
								name="backgroundOpacity"
								label={ __(
									'Backdrop opacity (%)',
									'animewp-blocks'
								) }
								min={ 0 }
								max={ 100 }
								fallback={ 100 }
							/>
						</>
					) }
					<Range
						{ ...shared }
						name="rotation"
						label={ __(
							'Rotate whole panel (°)',
							'animewp-blocks'
						) }
						help={ __(
							'Rotates the backdrop and every block inside together.',
							'animewp-blocks'
						) }
						min={ -8 }
						max={ 8 }
						fallback={ 0 }
					/>
					<p>
						{ __(
							'To tilt only some text, keep this at 0° and put that text in a Rotated Text block inside the panel.',
							'animewp-blocks'
						) }
					</p>
					<Range
						{ ...shared }
						name="radius"
						label={ __( 'Corner radius (px)', 'animewp-blocks' ) }
						min={ 0 }
						max={ 100 }
						fallback={ 0 }
					/>
					<Select
						{ ...shared }
						name="panelShadow"
						label={ __( 'Panel shadow', 'animewp-blocks' ) }
						options={ shadows }
						fallback="none"
					/>
					<Select
						{ ...shared }
						name="textShadow"
						label={ __( 'Text shadow', 'animewp-blocks' ) }
						options={ shadows }
						fallback="none"
					/>
				</PanelBody>
				<PanelBody
					title={ __( 'Short heading', 'animewp-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={ __( 'Heading level', 'animewp-blocks' ) }
						value={ a.headingLevel }
						options={ [ 2, 3, 4, 5, 6 ].map( ( value ) => ( {
							label: 'H' + value,
							value,
						} ) ) }
						onChange={ ( value ) =>
							setAttributes( { headingLevel: Number( value ) } )
						}
					/>
					<Toggle
						{ ...shared }
						name="verticalHeading"
						label={ __( 'Vertical heading', 'animewp-blocks' ) }
						help={ __(
							'Applies to headings up to 40 characters. Body text and mobile stay horizontal.',
							'animewp-blocks'
						) }
					/>
					<Select
						{ ...shared }
						name="highlight"
						label={ __( 'Heading highlight', 'animewp-blocks' ) }
						fallback="none"
						options={ [
							{
								label: __( 'None', 'animewp-blocks' ),
								value: 'none',
							},
							{
								label: __(
									'Band behind each line',
									'animewp-blocks'
								),
								value: 'line',
							},
							{
								label: __(
									'Single padded block',
									'animewp-blocks'
								),
								value: 'panel',
							},
						] }
					/>
					{ a.highlight !== 'none' && (
						<>
							<fieldset className="animewp-blocks-fieldset">
								<BaseControl.VisualLabel as="legend">
									{ __(
										'Highlight color',
										'animewp-blocks'
									) }
								</BaseControl.VisualLabel>
								<DecorationColor
									{ ...shared }
									prefix="highlight"
								/>
							</fieldset>
							<Range
								{ ...shared }
								name="highlightPadding"
								label={ __(
									'Highlight padding (em)',
									'animewp-blocks'
								) }
								min={ 0 }
								max={ 2 }
								fallback={ 0.2 }
								step={ 0.05 }
							/>
						</>
					) }
				</PanelBody>
			</InspectorControls>
			<section { ...blockProps }>
				<Heading className="animewp-panel__heading">
					<RichText
						tagName="span"
						className="animewp-panel__heading-text"
						value={ a.heading }
						placeholder={ __(
							'Short heading (optional)',
							'animewp-blocks'
						) }
						allowedFormats={ [ 'core/bold', 'core/italic' ] }
						onChange={ ( value ) =>
							setAttributes( { heading: value } )
						}
					/>
				</Heading>
				<div { ...innerBlocksProps } />
			</section>
		</>
	);
}
