import { createBlock, registerBlockType } from '@wordpress/blocks';
import { coreAttributes } from '../../shared/sanitize';
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
		],
	},
} );
