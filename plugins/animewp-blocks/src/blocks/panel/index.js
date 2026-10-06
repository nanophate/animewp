import { createBlock, registerBlockType } from '@wordpress/blocks';
import { coreAttributes, enumValue } from '../../shared/sanitize';
import metadata from './block.json';
import deprecated from './deprecated';
import Edit from './edit';
import save from './save';

registerBlockType( metadata, {
	edit: Edit,
	save,
	deprecated,
	transforms: {
		to: [
			{
				type: 'block',
				blocks: [ 'core/group' ],
				transform( a, innerBlocks ) {
					const contents = innerBlocks.slice();
					if ( a.heading ) {
						contents.unshift(
							createBlock( 'core/heading', {
								content: a.heading,
								level: enumValue(
									a.headingLevel,
									[ 2, 3, 4, 5, 6 ],
									2
								),
							} )
						);
					}
					return createBlock(
						'core/group',
						coreAttributes( a ),
						contents
					);
				},
			},
		],
	},
} );
