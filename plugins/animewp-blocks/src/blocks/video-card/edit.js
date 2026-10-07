import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import {
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
	RichText,
	useBlockProps,
} from '@wordpress/block-editor';
import {
	Button,
	Notice,
	PanelBody,
	SelectControl,
	Spinner,
	TextControl,
} from '@wordpress/components';
import { useState } from '@wordpress/element';
import { normalize } from '../../shared/player';
import {
	editorUrl,
	localPosterUrl,
	numberValue,
	safeUrl,
} from '../../shared/sanitize';
import { frameStyle } from './frame';
import { RATIOS, cardStyle } from './markup';

export default function Edit( { attributes: a, setAttributes } ) {
	const [ importing, setImporting ] = useState( false );
	const [ error, setError ] = useState( '' );
	const external = a.source !== 'file';
	const provider = external ? normalize( a.source, a.url ) : null;
	const poster = localPosterUrl( a.posterUrl );
	const urlInvalid =
		!! a.url && ( external ? ! provider : ! safeUrl( a.url ) );

	function importThumbnail() {
		setImporting( true );
		setError( '' );
		apiFetch( {
			path: '/animewp/v1/youtube-poster',
			method: 'POST',
			data: { url: a.url },
		} )
			.then( ( media ) =>
				setAttributes( {
					posterId: media.id,
					posterUrl: localPosterUrl( media.url ),
				} )
			)
			.catch( ( response ) =>
				setError(
					( response && response.message ) ||
						__(
							'The thumbnail could not be imported.',
							'animewp-blocks'
						)
				)
			)
			.finally( () => setImporting( false ) );
	}

	const choosePoster = (
		<MediaUploadCheck>
			<MediaUpload
				allowedTypes={ [ 'image' ] }
				value={ a.posterId }
				onSelect={ ( media ) =>
					setAttributes( {
						posterId: numberValue(
							media.id,
							0,
							Number.MAX_SAFE_INTEGER,
							0
						),
						posterUrl: localPosterUrl( media.url ),
					} )
				}
				render={ ( { open } ) => (
					<Button variant="secondary" onClick={ open }>
						{ poster
							? __( 'Replace poster', 'animewp-blocks' )
							: __( 'Choose poster', 'animewp-blocks' ) }
					</Button>
				) }
			/>
		</MediaUploadCheck>
	);

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Video', 'animewp-blocks' ) }>
					<SelectControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={ __( 'Source', 'animewp-blocks' ) }
						value={ a.source }
						options={ [
							{ label: 'YouTube', value: 'youtube' },
							{
								label: __(
									'Vimeo (public videos)',
									'animewp-blocks'
								),
								value: 'vimeo',
							},
							{
								label: __( 'Video file', 'animewp-blocks' ),
								value: 'file',
							},
						] }
						onChange={ ( source ) => setAttributes( { source } ) }
					/>
					<TextControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={
							external
								? __( 'Video page URL', 'animewp-blocks' )
								: __( 'Video file URL', 'animewp-blocks' )
						}
						value={ a.url }
						onChange={ ( url ) =>
							setAttributes( { url: url.trim() } )
						}
					/>
					{ ! external && (
						<MediaUploadCheck>
							<MediaUpload
								allowedTypes={ [ 'video' ] }
								value={ a.fileId }
								onSelect={ ( media ) =>
									setAttributes( {
										url: safeUrl( media.url ),
										fileId: numberValue(
											media.id,
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
					) }
					{ urlInvalid && (
						<Notice status="warning" isDismissible={ false }>
							{ __(
								'This URL is not supported for the selected source.',
								'animewp-blocks'
							) }
						</Notice>
					) }
				</PanelBody>
				<PanelBody title={ __( 'Poster', 'animewp-blocks' ) }>
					<SelectControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={ __( 'Poster shape', 'animewp-blocks' ) }
						value={ a.aspectRatio }
						options={ RATIOS.map( ( ratio ) => ( {
							label: ratio.replace( '/', ':' ),
							value: ratio,
						} ) ) }
						onChange={ ( aspectRatio ) =>
							setAttributes( { aspectRatio } )
						}
					/>
					<p>
						{ __(
							'Posters come from this site’s Media Library, so visitors do not contact the video service until they press play.',
							'animewp-blocks'
						) }
					</p>
					<div className="animewp-blocks-buttons">
						{ choosePoster }
						{ a.source === 'youtube' && provider && (
							<Button
								variant="secondary"
								onClick={ importThumbnail }
								disabled={ importing }
							>
								{ importing ? (
									<Spinner />
								) : (
									__(
										'Import YouTube thumbnail',
										'animewp-blocks'
									)
								) }
							</Button>
						) }
						{ a.posterUrl && (
							<Button
								variant="tertiary"
								isDestructive
								onClick={ () =>
									setAttributes( {
										posterId: 0,
										posterUrl: '',
									} )
								}
							>
								{ __( 'Remove poster', 'animewp-blocks' ) }
							</Button>
						) }
					</div>
					{ error && (
						<Notice status="error" isDismissible={ false }>
							{ error }
						</Notice>
					) }
				</PanelBody>
				<PanelBody
					title={ __( 'Text', 'animewp-blocks' ) }
					initialOpen={ false }
				>
					<TextControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={ __(
							'Play button (screen readers)',
							'animewp-blocks'
						) }
						value={ a.playLabel }
						onChange={ ( playLabel ) =>
							setAttributes( { playLabel } )
						}
					/>
					<TextControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={ __( 'Close button', 'animewp-blocks' ) }
						value={ a.closeLabel }
						onChange={ ( closeLabel ) =>
							setAttributes( { closeLabel } )
						}
					/>
				</PanelBody>
			</InspectorControls>
			<figure { ...useBlockProps( { style: cardStyle( a ) } ) }>
				<div
					className="animewp-video-card__frame"
					style={ frameStyle( a ) }
				>
					{ poster ? (
						<img src={ editorUrl( poster ) } alt="" />
					) : (
						<span className="animewp-video-card__placeholder">
							{ a.url
								? __(
										'Choose or import a poster in the block settings.',
										'animewp-blocks'
									)
								: __(
										'Set the video URL in the block settings.',
										'animewp-blocks'
									) }
						</span>
					) }
					{ a.url && (
						<span
							className="animewp-video-card__play"
							aria-hidden="true"
						/>
					) }
				</div>
				<figcaption className="animewp-video-card__caption">
					<RichText
						tagName="span"
						className="animewp-video-card__label"
						value={ a.label }
						placeholder={ __(
							'Label (e.g. 2nd trailer)',
							'animewp-blocks'
						) }
						allowedFormats={ [] }
						onChange={ ( label ) => setAttributes( { label } ) }
					/>
					<RichText
						tagName="span"
						className="animewp-video-card__title"
						value={ a.title }
						placeholder={ __( 'Title', 'animewp-blocks' ) }
						allowedFormats={ [ 'core/bold', 'core/italic' ] }
						onChange={ ( title ) => setAttributes( { title } ) }
					/>
				</figcaption>
			</figure>
		</>
	);
}
