import { __ } from '@wordpress/i18n';
import {
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
	useBlockProps,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import {
	Button,
	FocalPointPicker,
	Notice,
	PanelBody,
	TextControl,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { Range, Select } from '../../shared/controls';
import {
	editorUrl,
	localPosterUrl,
	numberValue,
	safeUrl,
} from '../../shared/sanitize';
import { backdropProps } from './markup';

/**
 * First site-hosted poster among the section's other blocks (for the "follow" preview).
 * @param {Array} blocks Blocks to search.
 */
function findPoster( blocks ) {
	for ( const block of blocks ) {
		const url = localPosterUrl(
			block.attributes.posterUrl || block.attributes.url || ''
		);
		if ( url && /\.(?:jpe?g|png|webp|gif|avif|svg)(?:\?|$)/i.test( url ) ) {
			return url;
		}
		const inner = findPoster( block.innerBlocks || [] );
		if ( inner ) {
			return inner;
		}
	}
	return '';
}

export default function Edit( { attributes: a, setAttributes, clientId } ) {
	const shared = { attributes: a, setAttributes };
	const followPoster = useSelect(
		( select ) => {
			const store = select( blockEditorStore );
			const parent = store.getBlockRootClientId( clientId );
			return findPoster(
				store
					.getBlocks( parent || undefined )
					.filter( ( block ) => block.clientId !== clientId )
			);
		},
		[ clientId ]
	);
	const { className, style } = backdropProps( a );
	const blockProps = useBlockProps( { className, style } );
	const image = a.mode === 'image' ? localPosterUrl( a.imageUrl ) : '';
	const preview =
		image || ( a.mode.startsWith( 'follow' ) ? followPoster : '' );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Backdrop', 'animewp-blocks' ) }>
					<p>
						{ __(
							'Fills the section this block is placed in, behind its other blocks.',
							'animewp-blocks'
						) }
					</p>
					<Select
						{ ...shared }
						name="mode"
						label={ __( 'Show', 'animewp-blocks' ) }
						fallback="follow"
						options={ [
							{
								label: __(
									'Poster of the current slide or card',
									'animewp-blocks'
								),
								value: 'follow',
							},
							{
								label: __( 'An image', 'animewp-blocks' ),
								value: 'image',
							},
							{
								label: __(
									'A looping video file',
									'animewp-blocks'
								),
								value: 'file',
							},
							{
								label: __(
									'The current video, muted (YouTube/Vimeo)',
									'animewp-blocks'
								),
								value: 'follow-video',
							},
						] }
					/>
					{ a.mode === 'follow' && (
						<p>
							{ __(
								'Follows a Carousel or Video Cards in the same section: the current slide, or the card under the pointer.',
								'animewp-blocks'
							) }
						</p>
					) }
					{ a.mode === 'follow-video' && (
						<Notice status="warning" isDismissible={ false }>
							{ __(
								'This connects to YouTube or Vimeo as soon as the page loads, before the visitor presses play. The poster option avoids that.',
								'animewp-blocks'
							) }
						</Notice>
					) }
					{ a.mode === 'image' && (
						<>
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
											imageUrl: localPosterUrl(
												item.url
											),
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
							{ image && (
								<FocalPointPicker
									__nextHasNoMarginBottom
									label={ __(
										'Focal point',
										'animewp-blocks'
									) }
									url={ editorUrl( image ) }
									value={ {
										x: a.focalX / 100,
										y: a.focalY / 100,
									} }
									onChange={ ( point ) =>
										setAttributes( {
											focalX: Math.round( point.x * 100 ),
											focalY: Math.round( point.y * 100 ),
										} )
									}
								/>
							) }
						</>
					) }
					{ a.mode === 'file' && (
						<>
							<TextControl
								__nextHasNoMarginBottom
								__next40pxDefaultSize
								label={ __(
									'Video file URL',
									'animewp-blocks'
								) }
								help={ __(
									'A short, silent loop works best (MP4 or WebM).',
									'animewp-blocks'
								) }
								value={ a.videoUrl }
								onChange={ ( value ) =>
									setAttributes( { videoUrl: value.trim() } )
								}
							/>
							<MediaUploadCheck>
								<MediaUpload
									allowedTypes={ [ 'video' ] }
									value={ a.videoId }
									onSelect={ ( item ) =>
										setAttributes( {
											videoUrl: safeUrl( item.url ),
											videoId: numberValue(
												item.id,
												0,
												Number.MAX_SAFE_INTEGER,
												0
											),
										} )
									}
									render={ ( { open } ) => (
										<Button
											variant="secondary"
											onClick={ open }
										>
											{ __(
												'Choose video from Media Library',
												'animewp-blocks'
											) }
										</Button>
									) }
								/>
							</MediaUploadCheck>
						</>
					) }
					<Range
						{ ...shared }
						name="blur"
						label={ __( 'Blur (px)', 'animewp-blocks' ) }
						min={ 0 }
						max={ 80 }
						fallback={ 24 }
					/>
					<Range
						{ ...shared }
						name="veil"
						label={ __( 'Veil (%)', 'animewp-blocks' ) }
						help={ __(
							'A layer of this block’s background color over the image, so text stays readable. Set the color under Styles.',
							'animewp-blocks'
						) }
						min={ 0 }
						max={ 100 }
						fallback={ 55 }
					/>
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>
				{ preview && (
					<img
						className="animewp-backdrop__media is-active"
						src={ editorUrl( preview ) }
						alt=""
					/>
				) }
				<span className="animewp-backdrop__veil" />
				<span className="animewp-backdrop__chip">
					{ __( 'Backdrop', 'animewp-blocks' ) }
				</span>
			</div>
		</>
	);
}
