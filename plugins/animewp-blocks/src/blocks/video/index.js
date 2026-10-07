import { createBlock, parse, registerBlockType } from '@wordpress/blocks';
import { renderToString } from '@wordpress/element';
import {
	coreAttributes,
	languageValue,
	safeText,
	safeUrl,
} from '../../shared/sanitize';
import metadata from './block.json';
import Edit from './edit';
import save from './save';
import { SAVED_TEXT, VideoElement, isExternal } from './markup';

function linkParagraph( url, text ) {
	return createBlock( 'core/paragraph', {
		content: renderToString( <a href={ url }>{ text }</a> ),
	} );
}

/**
 * Rebuild the block from Core blocks so content stays editable without this plugin.
 *
 * @param {Object} a           Block attributes.
 * @param {Array}  innerBlocks Inner blocks to keep.
 * @return {Object} A core/group block.
 */
function toGroup( a, innerBlocks ) {
	const contents = [];
	const url = safeUrl( a.videoUrl );
	if ( isExternal( a ) ) {
		if ( url ) {
			contents.push( linkParagraph( url, SAVED_TEXT.externalLink ) );
		}
		if ( a.description ) {
			contents.push(
				createBlock( 'core/paragraph', {
					content: renderToString( a.description ),
				} )
			);
		}
		return createBlock(
			'core/group',
			coreAttributes( a ),
			contents.concat( innerBlocks )
		);
	}
	if ( url ) {
		const track = safeUrl( a.trackUrl );
		if ( a.crossOriginMode === 'anonymous' ) {
			// core/video drops crossorigin, so keep the element as Custom HTML.
			contents.push(
				parse(
					'<!-- wp:html -->' +
						renderToString( <VideoElement attributes={ a } /> ) +
						'<!-- /wp:html -->'
				)[ 0 ]
			);
		} else {
			contents.push(
				createBlock( 'core/video', {
					src: url,
					id: a.videoId || undefined,
					poster: safeUrl( a.posterUrl ) || undefined,
					controls: true,
					playsInline: true,
					preload: 'none',
					tracks: track
						? [
								{
									src: track,
									kind: 'captions',
									srcLang: languageValue( a.trackLanguage ),
									label: safeText(
										a.trackLabel,
										SAVED_TEXT.defaultTrackLabel,
										80
									),
								},
							]
						: [],
				} )
			);
		}
		contents.push( linkParagraph( url, SAVED_TEXT.fileLink ) );
	}
	if ( a.description ) {
		const text = a.description
			.replace( /&/g, '&amp;' )
			.replace( /</g, '&lt;' )
			.replace( />/g, '&gt;' );
		contents.push( createBlock( 'core/paragraph', { content: text } ) );
	}
	return createBlock(
		'core/group',
		coreAttributes( a ),
		contents.concat( innerBlocks )
	);
}

registerBlockType( metadata, {
	edit: Edit,
	save,
	transforms: {
		to: [ { type: 'block', blocks: [ 'core/group' ], transform: toGroup } ],
	},
} );
