import { __ } from '@wordpress/i18n';
import {
	InnerBlocks,
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect, useRef, useState } from '@wordpress/element';
import { Range, Select, Toggle } from '../../shared/controls';
import { carouselProps } from './markup';
import { NavPreview } from './nav';

const TEMPLATE = [
	[ 'animewp/video-card', {} ],
	[ 'animewp/video-card', {} ],
	[ 'animewp/video-card', {} ],
];

function includesBlock( block, clientId ) {
	return (
		block.clientId === clientId ||
		( block.innerBlocks || [] ).some( ( child ) =>
			includesBlock( child, clientId )
		)
	);
}

export default function Edit( { attributes: a, setAttributes, clientId } ) {
	const shared = { attributes: a, setAttributes };
	const trackRef = useRef( null );
	const [ activeIndex, setActiveIndex ] = useState( 0 );
	const { slides, selectedClientId } = useSelect(
		( select ) => {
			const editor = select( blockEditorStore );
			return {
				slides: editor.getBlocks( clientId ),
				selectedClientId: editor.getSelectedBlockClientId(),
			};
		},
		[ clientId ]
	);
	const { selectBlock } = useDispatch( blockEditorStore );

	// Clicking directly into a slide should also update the picker below it.
	useEffect( () => {
		if ( ! selectedClientId ) {
			return;
		}
		const index = slides.findIndex( ( slide ) =>
			includesBlock( slide, selectedClientId )
		);
		if ( index >= 0 ) {
			setActiveIndex( index );
		}
	}, [ slides, selectedClientId ] );

	function navigate( index ) {
		if ( ! slides.length ) {
			return;
		}
		const next =
			a.loop === false
				? Math.max( 0, Math.min( slides.length - 1, index ) )
				: ( index + slides.length ) % slides.length;
		const slide = slides[ next ];
		setActiveIndex( next );
		selectBlock( slide.clientId );
		// The edit canvas keeps every slide editable in a horizontal track.
		// Bring the chosen slide into view instead of hiding the other blocks.
		trackRef.current
			?.querySelector( `[data-block="${ slide.clientId }"]` )
			?.scrollIntoView( {
				behavior: 'smooth',
				block: 'nearest',
				inline: 'center',
			} );
	}
	const { className, style } = carouselProps( a );
	const blockProps = useBlockProps( { className, style } );
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'animewp-carousel__track', ref: trackRef },
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
					<TextControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={ __(
							'Name for screen readers',
							'animewp-blocks'
						) }
						help={ __(
							'For example: Trailers, Characters.',
							'animewp-blocks'
						) }
						value={ a.label }
						onChange={ ( label ) => setAttributes( { label } ) }
					/>
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
					{ a.autoplay > 0 && (
						<TextControl
							__nextHasNoMarginBottom
							__next40pxDefaultSize
							label={ __(
								'Pause button (screen readers)',
								'animewp-blocks'
							) }
							value={ a.pauseLabel }
							onChange={ ( pauseLabel ) =>
								setAttributes( { pauseLabel } )
							}
						/>
					) }
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>
				<div { ...innerBlocksProps } />
				<NavPreview
					attributes={ a }
					slides={ slides }
					activeIndex={ activeIndex }
					onNavigate={ navigate }
				/>
			</div>
		</>
	);
}
