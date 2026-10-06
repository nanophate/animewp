import { __ } from '@wordpress/i18n';
import {
	InnerBlocks,
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import { Range, Select, Toggle } from '../../shared/controls';
import { carouselProps } from './markup';
import { NavPreview } from './nav';

const TEMPLATE = [
	[ 'animewp/video-card', {} ],
	[ 'animewp/video-card', {} ],
	[ 'animewp/video-card', {} ],
];

export default function Edit( { attributes: a, setAttributes } ) {
	const shared = { attributes: a, setAttributes };
	const { className, style } = carouselProps( a );
	const blockProps = useBlockProps( { className, style } );
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'animewp-carousel__track' },
		{
			template: TEMPLATE,
			orientation: 'horizontal',
			renderAppender: InnerBlocks.ButtonBlockAppender,
		}
	);

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Slides', 'animewp-blocks' ) }>
					<p>
						{ __(
							'Every block inside becomes one slide.',
							'animewp-blocks'
						) }
					</p>
					<Range
						{ ...shared }
						name="slideWidth"
						label={ __( 'Slide width (%)', 'animewp-blocks' ) }
						help={ __(
							'At 100%, one slide fills the width. Smaller values let the next slides peek in.',
							'animewp-blocks'
						) }
						min={ 30 }
						max={ 100 }
						fallback={ 100 }
					/>
					<Select
						{ ...shared }
						name="effect"
						label={ __( 'Transition', 'animewp-blocks' ) }
						fallback="slide"
						options={ [
							{
								label: __( 'Slide', 'animewp-blocks' ),
								value: 'slide',
							},
							{
								label: __(
									'Fade (slides stack in place)',
									'animewp-blocks'
								),
								value: 'fade',
							},
						] }
					/>
					<Toggle
						{ ...shared }
						name="emphasizeActive"
						label={ __(
							'Dim the slides that are not current',
							'animewp-blocks'
						) }
					/>
					<Toggle
						{ ...shared }
						name="loop"
						label={ __(
							'Loop from the last slide to the first',
							'animewp-blocks'
						) }
					/>
				</PanelBody>
				<PanelBody title={ __( 'Controls', 'animewp-blocks' ) }>
					<Select
						{ ...shared }
						name="navStyle"
						label={ __(
							'Previous and next buttons',
							'animewp-blocks'
						) }
						fallback="icon"
						options={ [
							{
								label: __(
									'Round icon buttons',
									'animewp-blocks'
								),
								value: 'icon',
							},
							{
								label: __( 'Text', 'animewp-blocks' ),
								value: 'text',
							},
							{
								label: __(
									'Text with arrow line',
									'animewp-blocks'
								),
								value: 'line',
							},
							{
								label: __(
									'None (swipe and dots only)',
									'animewp-blocks'
								),
								value: 'none',
							},
						] }
					/>
					{ a.navStyle !== 'none' && (
						<>
							<TextControl
								__nextHasNoMarginBottom
								__next40pxDefaultSize
								label={ __(
									'Previous button text',
									'animewp-blocks'
								) }
								help={
									a.navStyle === 'icon'
										? __(
												'Read by screen readers.',
												'animewp-blocks'
											)
										: undefined
								}
								value={ a.prevLabel }
								onChange={ ( prevLabel ) =>
									setAttributes( { prevLabel } )
								}
							/>
							<TextControl
								__nextHasNoMarginBottom
								__next40pxDefaultSize
								label={ __(
									'Next button text',
									'animewp-blocks'
								) }
								value={ a.nextLabel }
								onChange={ ( nextLabel ) =>
									setAttributes( { nextLabel } )
								}
							/>
						</>
					) }
					<Toggle
						{ ...shared }
						name="showDots"
						label={ __( 'Slide picker', 'animewp-blocks' ) }
					/>
					{ a.showDots !== false && (
						<Select
							{ ...shared }
							name="dotStyle"
							label={ __(
								'Slide picker style',
								'animewp-blocks'
							) }
							help={
								a.dotStyle === 'thumbnails'
									? __(
											'Uses the first image in each slide.',
											'animewp-blocks'
										)
									: undefined
							}
							fallback="dots"
							options={ [
								{
									label: __( 'Dots', 'animewp-blocks' ),
									value: 'dots',
								},
								{
									label: __(
										'Numbers (01, 02…)',
										'animewp-blocks'
									),
									value: 'numbers',
								},
								{
									label: __( 'Thumbnails', 'animewp-blocks' ),
									value: 'thumbnails',
								},
							] }
						/>
					) }
					<Range
						{ ...shared }
						name="autoplay"
						label={ __(
							'Auto-advance (seconds)',
							'animewp-blocks'
						) }
						help={ __(
							'0 turns it off. Pauses on hover and focus, adds a pause button, and never runs for visitors who prefer reduced motion.',
							'animewp-blocks'
						) }
						min={ 0 }
						max={ 20 }
						fallback={ 0 }
					/>
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>
				<div { ...innerBlocksProps } />
				<NavPreview attributes={ a } />
			</div>
		</>
	);
}
