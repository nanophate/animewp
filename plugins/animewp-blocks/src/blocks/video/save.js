import { InnerBlocks, useBlockProps } from '@wordpress/block-editor';
import providers from '../../shared/providers';
import { safeText, safeUrl } from '../../shared/sanitize';
import { SAVED_TEXT, VideoElement, isExternal } from './markup';

export default function save( { attributes: a } ) {
	const url = safeUrl( a.videoUrl );
	const buttonLabel = safeText(
		a.buttonLabel,
		SAVED_TEXT.defaultButton,
		100
	);
	const closeLabel = safeText( a.closeLabel, SAVED_TEXT.defaultClose, 80 );

	if ( isExternal( a ) ) {
		const provider = providers.normalize( a.source, a.videoUrl );
		const poster = safeUrl( a.posterUrl );
		return (
			<div { ...useBlockProps.save() }>
				{ provider && (
					<button
						className="animewp-video__trigger"
						type="button"
						hidden
						data-animewp-provider={ provider.provider }
						data-animewp-video-id={ provider.id }
						data-animewp-start={ String( provider.start ) }
						data-animewp-close-label={ closeLabel }
					>
						{ buttonLabel + SAVED_TEXT.externalSuffix }
					</button>
				) }
				<div className="animewp-video__fallback">
					{ poster.startsWith( '/' ) && (
						<img src={ poster } alt="" loading="lazy" />
					) }
					<p>{ SAVED_TEXT.externalNotice }</p>
				</div>
				{ a.description && (
					<p className="animewp-video__description">
						{ a.description }
					</p>
				) }
				{ url && (
					<p className="animewp-video__link">
						<a href={ url }>{ SAVED_TEXT.externalLink }</a>
					</p>
				) }
				<div className="animewp-video__content">
					<InnerBlocks.Content />
				</div>
			</div>
		);
	}

	return (
		<div { ...useBlockProps.save() }>
			{ url && (
				<button
					className="animewp-video__trigger"
					type="button"
					hidden
					data-animewp-close-label={ closeLabel }
				>
					{ buttonLabel }
				</button>
			) }
			{ url && (
				<div className="animewp-video__fallback">
					<VideoElement attributes={ a } />
				</div>
			) }
			{ a.description && (
				<p className="animewp-video__description">{ a.description }</p>
			) }
			{ url && (
				<p className="animewp-video__link">
					<a href={ url }>{ SAVED_TEXT.fileLink }</a>
				</p>
			) }
			<div className="animewp-video__content">
				<InnerBlocks.Content />
			</div>
		</div>
	);
}
