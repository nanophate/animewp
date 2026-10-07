/**
 * Saved-markup pieces for the video block.
 *
 * The Japanese strings below are part of saved posts, not interface text:
 * translating them per locale would invalidate existing content.
 */
import { languageValue, safeText, safeUrl } from '../../shared/sanitize';

export const SAVED_TEXT = {
	defaultButton: '動画を開く',
	defaultClose: '閉じる',
	defaultTrackLabel: '字幕',
	externalSuffix: '（外部サービスへ接続）',
	externalNotice:
		'動画を開くと外部サービスへ接続します。閉じるとプレーヤーを削除します。',
	externalLink: '配信元で動画を見る',
	fileLink: '動画ファイルを開く',
};

export function isExternal( a ) {
	return a.source === 'youtube' || a.source === 'vimeo';
}

export function VideoElement( { attributes: a } ) {
	const url = safeUrl( a.videoUrl );
	if ( ! url ) {
		return null;
	}
	const track = safeUrl( a.trackUrl );
	return (
		<video
			controls
			playsInline
			preload="none"
			src={ url }
			poster={ safeUrl( a.posterUrl ) || undefined }
			crossOrigin={
				a.crossOriginMode === 'anonymous' ? 'anonymous' : undefined
			}
		>
			{ track && (
				<track
					kind="captions"
					src={ track }
					srcLang={ languageValue( a.trackLanguage ) }
					label={ safeText(
						a.trackLabel,
						SAVED_TEXT.defaultTrackLabel,
						80
					) }
					default
				/>
			) }
		</video>
	);
}
