import { createBlock, registerBlockType } from '@wordpress/blocks';
import { coreAttributes, numberValue, safeUrl } from '../../shared/sanitize';
import metadata from './block.json';
import Edit from './edit';
import save from './save';

registerBlockType( metadata, {
	edit: Edit,
	save,
	transforms: {
		to: [
			{
				type: 'block',
				blocks: [ 'core/group' ],
				transform: ( a, innerBlocks ) =>
					createBlock(
						'core/group',
						coreAttributes( a ),
						innerBlocks
					),
			},
			{
				type: 'block',
				blocks: [ 'core/media-text' ],
				transform( a, innerBlocks ) {
					const image = innerBlocks.find(
						( block ) => block.name === 'core/image'
					);
					const body = innerBlocks.find(
						( block ) => block.name === 'core/group'
					);
					const contents = body ? [ body ] : [];
					if ( image && image.attributes.caption ) {
						contents.push(
							createBlock( 'core/paragraph', {
								content: image.attributes.caption,
							} )
						);
					}
					return createBlock(
						'core/media-text',
						Object.assign( coreAttributes( a ), {
							mediaId: image ? image.attributes.id : undefined,
							mediaUrl: image
								? safeUrl( image.attributes.url )
								: '',
							mediaAlt: image ? image.attributes.alt || '' : '',
							href: image
								? safeUrl( image.attributes.href ) || undefined
								: undefined,
							linkTarget: image
								? image.attributes.linkTarget
								: undefined,
							rel: image ? image.attributes.rel : undefined,
							linkDestination: image
								? image.attributes.linkDestination
								: undefined,
							mediaSizeSlug: image
								? image.attributes.sizeSlug
								: undefined,
							mediaType: 'image',
							mediaPosition:
								a.imageSide === 'right' ? 'right' : 'left',
							mediaWidth: numberValue( a.imageWidth, 20, 80, 50 ),
							isStackedOnMobile: true,
						} ),
						contents
					);
				},
			},
		],
	},
} );
