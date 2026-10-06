import { __ } from '@wordpress/i18n';
import {
	InnerBlocks,
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import {
	Button,
	Notice,
	PanelBody,
	TextControl,
	TextareaControl,
} from '@wordpress/components';
import { useState } from '@wordpress/element';
import providers from '../../shared/providers';
import { Select } from '../../shared/controls';
import {
	isSameOrigin,
	editorUrl,
	localPosterUrl,
	numberValue,
	safeText,
	safeUrl,
} from '../../shared/sanitize';
import { SAVED_TEXT, VideoElement, isExternal } from './markup';

function sitePath( value ) {
	const url = new URL( value, window.location.href );
	return url.pathname + url.search + url.hash;
}

export default function Edit( { attributes: a, setAttributes } ) {
	const [ posterSelectionError, setPosterSelectionError ] = useState( false );
	// External players only accept site-local posters, stored as a path.
	const set = ( update ) => {
		if (
			( update.source === 'youtube' || update.source === 'vimeo' ) &&
			isSameOrigin( a.posterUrl )
		) {
			update.posterUrl = sitePath( a.posterUrl );
		}
		setAttributes( update );
	};
	const blockProps = useBlockProps();
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'animewp-video__content' },
		{ template: [], renderAppender: InnerBlocks.ButtonBlockAppender }
	);
	const url = safeUrl( a.videoUrl );
	const external = isExternal( a );
	const provider = external && providers.normalize( a.source, a.videoUrl );
	const localPoster = external ? localPosterUrl( a.posterUrl ) : '';

	function Field( { name, label, help } ) {
		return (
			<TextControl
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				label={ label }
				help={ help }
				value={ a[ name ] || '' }
				onChange={ ( value ) => {
					if (
						external &&
						name === 'posterUrl' &&
						isSameOrigin( value )
					) {
						value = sitePath( value );
					}
					set( { [ name ]: value } );
				} }
			/>
		);
	}

	const posterPicker = (
		<>
			<MediaUploadCheck>
				<MediaUpload
					allowedTypes={ [ 'image' ] }
					onSelect={ ( media ) => {
						const selected = localPosterUrl( media && media.url );
						if ( ! selected ) {
							setPosterSelectionError( true );
							return;
						}
						setPosterSelectionError( false );
						set( { posterUrl: selected } );
					} }
					render={ ( { open } ) => (
						<Button variant="secondary" onClick={ open }>
							{ localPoster
								? __( 'Replace poster image', 'animewp-blocks' )
								: __(
										'Choose poster image',
										'animewp-blocks'
									) }
						</Button>
					) }
				/>
			</MediaUploadCheck>
			{ a.posterUrl && (
				<Button
					variant="tertiary"
					isDestructive
					onClick={ () => {
						setPosterSelectionError( false );
						set( { posterUrl: '' } );
					} }
				>
					{ __( 'Remove poster image', 'animewp-blocks' ) }
				</Button>
			) }
			{ a.posterUrl && ! localPoster && (
				<Notice status="warning" isDismissible={ false }>
					{ __(
						'YouTube and Vimeo posters must come from this site’s Media Library. External images are not loaded.',
						'animewp-blocks'
					) }
				</Notice>
			) }
			{ posterSelectionError && (
				<Notice status="warning" isDismissible={ false }>
					{ __(
						'That image is not hosted on this site. Choose an image from this site’s Media Library.',
						'animewp-blocks'
					) }
				</Notice>
			) }
		</>
	);

	const externalPreview = (
		<div
			className="animewp-video__preview"
			role="group"
			aria-label={ __(
				'Poster and play button preview',
				'animewp-blocks'
			) }
		>
			<div className="animewp-video__preview-frame">
				{ localPoster && (
					<img
						src={ editorUrl( localPoster ) }
						alt=""
						loading="lazy"
					/>
				) }
				<span className="animewp-video__trigger animewp-video__preview-cta">
					{ safeText( a.buttonLabel, SAVED_TEXT.defaultButton, 100 ) }
				</span>
			</div>
			{ ! localPoster && (
				<p className="animewp-video__preview-hint">
					{ __(
						'Choose a poster image to preview it here.',
						'animewp-blocks'
					) }
				</p>
			) }
		</div>
	);

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={ __( 'Video and captions', 'animewp-blocks' ) }
				>
					<Select
						attributes={ a }
						setAttributes={ set }
						name="source"
						label={ __( 'Source', 'animewp-blocks' ) }
						fallback="file"
						options={ [
							{
								label: __( 'Video file', 'animewp-blocks' ),
								value: 'file',
							},
							{ label: 'YouTube', value: 'youtube' },
							{
								label: __(
									'Vimeo (public videos)',
									'animewp-blocks'
								),
								value: 'vimeo',
							},
						] }
					/>
					{ Field( {
						name: 'videoUrl',
						label: external
							? __( 'Video page URL', 'animewp-blocks' )
							: __( 'Video file URL', 'animewp-blocks' ),
						help: external
							? __(
									'HTTPS link to the video page. Start times (t= or start=) are kept. Link private or unlisted Vimeo videos instead.',
									'animewp-blocks'
								)
							: __(
									'An http(s) URL or a site path starting with /.',
									'animewp-blocks'
								),
					} ) }
					{ external && ! a.videoUrl && (
						<Notice status="info" isDismissible={ false }>
							{ __(
								'Enter the video page URL. The editor never connects to the video service.',
								'animewp-blocks'
							) }
						</Notice>
					) }
					{ external && ! provider && a.videoUrl && (
						<Notice status="warning" isDismissible={ false }>
							{ __(
								'This URL is not supported for the selected service. Only the original link will be saved.',
								'animewp-blocks'
							) }
						</Notice>
					) }
					{ external && provider && (
						<p>
							{ __(
								'The player loads only after a visitor presses play, and is removed when closed. Captions are managed on the video service.',
								'animewp-blocks'
							) }
						</p>
					) }
					{ a.videoUrl && ! url && (
						<Notice status="warning" isDismissible={ false }>
							{ __(
								'This URL is invalid and will be removed on save.',
								'animewp-blocks'
							) }
						</Notice>
					) }
					{ external
						? posterPicker
						: Field( {
								name: 'posterUrl',
								label: __(
									'Poster image URL (optional)',
									'animewp-blocks'
								),
							} ) }
					{ Field( {
						name: 'buttonLabel',
						label: __( 'Play button text', 'animewp-blocks' ),
					} ) }
					{ Field( {
						name: 'closeLabel',
						label: __( 'Close button text', 'animewp-blocks' ),
					} ) }
					{ ! external &&
						Field( {
							name: 'trackUrl',
							label: __(
								'Captions file URL (WebVTT, optional)',
								'animewp-blocks'
							),
							help: __(
								'By default captions must be served from this site.',
								'animewp-blocks'
							),
						} ) }
					{ ! external && (
						<Select
							attributes={ a }
							setAttributes={ set }
							name="crossOriginMode"
							label={ __(
								'Video and captions hosting',
								'animewp-blocks'
							) }
							help={ __(
								'Anonymous CORS applies to both video and captions. The other server must send Access-Control-Allow-Origin. Authenticated hosting is not supported.',
								'animewp-blocks'
							) }
							fallback="same-origin"
							options={ [
								{
									label: __(
										'This site (captions on the same site)',
										'animewp-blocks'
									),
									value: 'same-origin',
								},
								{
									label: __(
										'Another server (anonymous CORS)',
										'animewp-blocks'
									),
									value: 'anonymous',
								},
							] }
						/>
					) }
					{ ! external &&
						a.trackUrl &&
						safeUrl( a.trackUrl ) &&
						! isSameOrigin( a.trackUrl ) &&
						a.crossOriginMode !== 'anonymous' && (
							<Notice status="warning" isDismissible={ false }>
								{ __(
									'The captions file is on another server. Move it to this site, or check that server’s CORS settings and choose anonymous CORS.',
									'animewp-blocks'
								) }
							</Notice>
						) }
					{ ! external && a.crossOriginMode === 'anonymous' && (
						<p>
							{ __(
								'Converting to standard blocks turns the video into a Custom HTML block to keep the CORS setting. Description, captions and link are kept.',
								'animewp-blocks'
							) }
						</p>
					) }
					{ ! external && a.trackUrl && ! safeUrl( a.trackUrl ) && (
						<Notice status="warning" isDismissible={ false }>
							{ __(
								'The captions URL is invalid.',
								'animewp-blocks'
							) }
						</Notice>
					) }
					{ ! external &&
						Field( {
							name: 'trackLanguage',
							label: __(
								'Captions language code',
								'animewp-blocks'
							),
						} ) }
					{ ! external &&
						Field( {
							name: 'trackLabel',
							label: __( 'Captions label', 'animewp-blocks' ),
						} ) }
					<TextareaControl
						__nextHasNoMarginBottom
						label={ __( 'Video description', 'animewp-blocks' ) }
						value={ a.description }
						onChange={ ( value ) => set( { description: value } ) }
					/>
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>
				{ ! external && (
					<MediaUploadCheck>
						<MediaUpload
							allowedTypes={ [ 'video' ] }
							value={ numberValue(
								a.videoId,
								0,
								Number.MAX_SAFE_INTEGER,
								0
							) }
							onSelect={ ( media ) =>
								set( {
									videoUrl: safeUrl( media.url ),
									videoId: numberValue(
										media.id,
										0,
										Number.MAX_SAFE_INTEGER,
										0
									),
								} )
							}
							render={ ( { open } ) => (
								<Button variant="secondary" onClick={ open }>
									{ url
										? __(
												'Replace video',
												'animewp-blocks'
											)
										: __(
												'Choose video from Media Library',
												'animewp-blocks'
											) }
								</Button>
							) }
						/>
					</MediaUploadCheck>
				) }
				{ external && (
					<p>
						{ provider
							? __(
									'Video page URL is set. The editor does not connect to the service.',
									'animewp-blocks'
								)
							: __(
									'Set a YouTube or Vimeo video page URL.',
									'animewp-blocks'
								) }
					</p>
				) }
				{ ! external && url && <VideoElement attributes={ a } /> }
				{ ! external && ! url && (
					<p>
						{ __(
							'Choose a video, or enter a video URL in the settings.',
							'animewp-blocks'
						) }
					</p>
				) }
				{ external && externalPreview }
				<p className="animewp-video__editor-note">
					{ __(
						'On the site, the video opens when the button is pressed. Add a description or transcript below with standard blocks.',
						'animewp-blocks'
					) }
				</p>
				{ a.description && (
					<p className="animewp-video__description">
						{ a.description }
					</p>
				) }
				<div { ...innerBlocksProps } />
			</div>
		</>
	);
}
