/**
 * Motion panel for every block. Settings live in the block comment only
 * (see shared.js); the editor shows hover and loop effects live, and the
 * Preview button replays the entrance on the canvas.
 */
import { __ } from '@wordpress/i18n';
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import {
	Button,
	PanelBody,
	RangeControl,
	SelectControl,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import {
	InspectorControls,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { ATTRIBUTE, SKIP, isActive, motionProps, normalized } from './shared';

const DEFAULTS = normalized( {} );

addFilter(
	'blocks.registerBlockType',
	'animewp/motion-attribute',
	( settings, name ) => {
		if (
			SKIP.includes( name ) ||
			( settings.attributes && settings.attributes[ ATTRIBUTE ] )
		) {
			return settings;
		}
		return {
			...settings,
			attributes: {
				...settings.attributes,
				[ ATTRIBUTE ]: { type: 'object' },
			},
		};
	}
);

/**
 * Store only values that differ from the defaults, so the block comment stays short.
 * @param {Object} motion Motion settings.
 */
function compact( motion ) {
	const result = {};
	Object.keys( DEFAULTS ).forEach( ( key ) => {
		if ( motion[ key ] !== DEFAULTS[ key ] ) {
			result[ key ] = motion[ key ];
		}
	} );
	return Object.keys( result ).length ? result : undefined;
}

function canvasElement( clientId ) {
	const canvas = document.querySelector( 'iframe[name="editor-canvas"]' );
	const documents = [ canvas && canvas.contentDocument, document ].filter(
		Boolean
	);
	for ( const doc of documents ) {
		const element = doc.querySelector( '[data-block="' + clientId + '"]' );
		if ( element ) {
			return element;
		}
	}
	return null;
}

const previews = new WeakMap();

function preview( clientId, motion ) {
	const element = canvasElement( clientId );
	if ( ! element || motion.entrance === 'none' ) {
		return;
	}
	// Finish the previous preview before starting another on the same block.
	if ( previews.has( element ) ) {
		previews.get( element )();
	}
	const entrance = motion.entrance === 'letters' ? 'rise' : motion.entrance;
	const { className, style } = motionProps( {
		...motion,
		entrance,
	} );
	const classes = className.split( ' ' ).concat( 'is-motion-preview' );
	Object.entries( style ).forEach( ( [ key, value ] ) =>
		element.style.setProperty( key, value )
	);
	const children =
		motion.target === 'children'
			? [
					...element.querySelectorAll(
						':scope > *, :scope > .block-editor-inner-blocks > .block-editor-block-list__layout > *'
					),
				]
			: [];
	children.forEach( ( child, index ) =>
		child.style.setProperty( '--animewp-i', String( index ) )
	);
	element.classList.remove( 'is-inview' );
	element.classList.add( ...classes );
	// Force a style flush so the animation restarts every time.
	void element.offsetWidth;
	element.classList.add( 'is-inview' );
	const total =
		( motion.delay || 0 ) +
		( motion.duration || 900 ) +
		children.length * ( motion.stagger || 90 ) +
		300;
	const cleanup = () => {
		clearTimeout( timer );
		element.classList.remove(
			'is-inview',
			'is-motion-preview',
			'has-entrance',
			'has-entrance-' + entrance
		);
		previews.delete( element );
	};
	previews.set( element, cleanup );
	const timer = setTimeout( cleanup, total );
}

function MotionPanel( { attributes, setAttributes, clientId } ) {
	const motion = normalized( attributes[ ATTRIBUTE ] );
	const hasChildren = useSelect(
		( select ) => select( blockEditorStore ).getBlockCount( clientId ) > 0,
		[ clientId ]
	);
	const set = ( key ) => ( value ) =>
		setAttributes( {
			[ ATTRIBUTE ]: compact( { ...motion, [ key ]: value } ),
		} );
	const select = ( key, label, options, help ) => (
		<SelectControl
			__nextHasNoMarginBottom
			__next40pxDefaultSize
			label={ label }
			help={ help }
			value={ motion[ key ] }
			options={ options }
			onChange={ set( key ) }
		/>
	);
	const range = ( key, label, min, max, step, help ) => (
		<RangeControl
			__nextHasNoMarginBottom
			__next40pxDefaultSize
			label={ label }
			help={ help }
			value={ motion[ key ] }
			min={ min }
			max={ max }
			step={ step }
			onChange={ ( value ) => set( key )( Number( value ) || 0 ) }
		/>
	);
	return (
		<PanelBody
			title={ __( 'Motion', 'animewp-blocks' ) }
			initialOpen={ isActive( attributes[ ATTRIBUTE ] ) }
		>
			{ select(
				'entrance',
				__( 'Entrance', 'animewp-blocks' ),
				[
					{ label: __( 'None', 'animewp-blocks' ), value: 'none' },
					{ label: __( 'Fade in', 'animewp-blocks' ), value: 'fade' },
					{ label: __( 'Rise', 'animewp-blocks' ), value: 'rise' },
					{
						label: __(
							'Slide from the start side',
							'animewp-blocks'
						),
						value: 'slide-start',
					},
					{
						label: __(
							'Slide from the end side',
							'animewp-blocks'
						),
						value: 'slide-end',
					},
					{ label: __( 'Zoom in', 'animewp-blocks' ), value: 'zoom' },
					{
						label: __( 'Come into focus (blur)', 'animewp-blocks' ),
						value: 'blur',
					},
					{
						label: __( 'Wipe (mask)', 'animewp-blocks' ),
						value: 'mask',
					},
					{
						label: __( 'Letter by letter', 'animewp-blocks' ),
						value: 'letters',
					},
				],
				__(
					'Plays once when the block scrolls into view.',
					'animewp-blocks'
				)
			) }
			{ motion.entrance !== 'none' && (
				<>
					{ hasChildren &&
						select( 'target', __( 'Apply to', 'animewp-blocks' ), [
							{
								label: __( 'This block', 'animewp-blocks' ),
								value: 'self',
							},
							{
								label: __(
									'Each inner block in turn',
									'animewp-blocks'
								),
								value: 'children',
							},
						] ) }
					{ range(
						'delay',
						__( 'Delay (ms)', 'animewp-blocks' ),
						0,
						3000,
						50
					) }
					{ range(
						'duration',
						__( 'Duration (ms)', 'animewp-blocks' ),
						0,
						4000,
						50,
						__(
							'0 uses the site’s motion speed.',
							'animewp-blocks'
						)
					) }
					{ motion.target === 'children' &&
						range(
							'stagger',
							__(
								'Gap between inner blocks (ms)',
								'animewp-blocks'
							),
							0,
							1000,
							10,
							__( '0 uses the site’s default.', 'animewp-blocks' )
						) }
					<Button
						variant="secondary"
						onClick={ () => preview( clientId, motion ) }
					>
						{ __( 'Preview', 'animewp-blocks' ) }
					</Button>
				</>
			) }
			<hr />
			{ select(
				'hover',
				__( 'On hover', 'animewp-blocks' ),
				[
					{ label: __( 'None', 'animewp-blocks' ), value: 'none' },
					{ label: __( 'Lift', 'animewp-blocks' ), value: 'lift' },
					{
						label: __( 'Zoom the image', 'animewp-blocks' ),
						value: 'zoom',
					},
					{ label: __( 'Glow', 'animewp-blocks' ), value: 'glow' },
				],
				hasChildren
					? __(
							'Follows “Apply to”: this block, or each inner block.',
							'animewp-blocks'
						)
					: undefined
			) }
			{ select(
				'loop',
				__( 'Keep moving', 'animewp-blocks' ),
				[
					{ label: __( 'None', 'animewp-blocks' ), value: 'none' },
					{ label: __( 'Float', 'animewp-blocks' ), value: 'float' },
					{ label: __( 'Sway', 'animewp-blocks' ), value: 'sway' },
					{ label: __( 'Pulse', 'animewp-blocks' ), value: 'pulse' },
				],
				__(
					'A slow, endless movement for decorations.',
					'animewp-blocks'
				)
			) }
			{ range(
				'parallax',
				__( 'Parallax', 'animewp-blocks' ),
				-50,
				50,
				5,
				__(
					'Moves slower (negative) or faster (positive) than the page while scrolling. 0 is off.',
					'animewp-blocks'
				)
			) }
			{ select(
				'scrolled',
				__( 'After scrolling down', 'animewp-blocks' ),
				[
					{
						label: __( 'No change', 'animewp-blocks' ),
						value: 'none',
					},
					{ label: __( 'Hide', 'animewp-blocks' ), value: 'hide' },
					{
						label: __(
							'Show (hidden at the top)',
							'animewp-blocks'
						),
						value: 'show',
					},
					{
						label: __( 'Make compact', 'animewp-blocks' ),
						value: 'shrink',
					},
				],
				__(
					'For headers: for example, hide the full logo and show a short one once the visitor scrolls.',
					'animewp-blocks'
				)
			) }
			<p className="animewp-motion-note">
				{ __(
					'Visitors who ask their device for reduced motion see everything without movement.',
					'animewp-blocks'
				) }
			</p>
		</PanelBody>
	);
}

addFilter(
	'editor.BlockEdit',
	'animewp/motion-panel',
	createHigherOrderComponent(
		( BlockEdit ) => ( props ) => (
			<>
				<BlockEdit { ...props } />
				{ props.isSelected && ! SKIP.includes( props.name ) && (
					<InspectorControls>
						<MotionPanel { ...props } />
					</InspectorControls>
				) }
			</>
		),
		'withAnimewpMotionPanel'
	)
);

/** Show hover and loop effects on the canvas (entrances play only from Preview). */
addFilter(
	'editor.BlockListBlock',
	'animewp/motion-canvas',
	createHigherOrderComponent(
		( BlockListBlock ) => ( props ) => {
			const value = props.attributes && props.attributes[ ATTRIBUTE ];
			if ( ! value || ! isActive( value ) ) {
				return <BlockListBlock { ...props } />;
			}
			const motion = normalized( value );
			const { className } = motionProps( {
				...motion,
				entrance: 'none',
				parallax: 0,
				scrolled: 'none',
			} );
			return (
				<BlockListBlock
					{ ...props }
					className={ [ props.className, className ]
						.filter( Boolean )
						.join( ' ' ) }
				/>
			);
		},
		'withAnimewpMotionCanvas'
	)
);
