/* global wp */
/**
 * Gutenberg helpers for AnimeWP character/cast layouts.
 * Every change creates normal, unlocked WordPress core blocks. Existing saved
 * grids are recognized by their contents, so upgrading does not require a
 * destructive migration or the optional AnimeWP Blocks plugin.
 */
( function () {
	'use strict';
	if ( typeof wp === 'undefined' || ! wp.hooks || ! wp.blocks || ! wp.blockEditor || ! wp.data || ! wp.components ) {
		return;
	}
	const el = wp.element.createElement;
	const Fragment = wp.element.Fragment;
	const useSelect = wp.data.useSelect;
	const BlockControls = wp.blockEditor.BlockControls;
	const InspectorControls = wp.blockEditor.InspectorControls;
	const { ToolbarButton, ToolbarGroup, PanelBody, Button } = wp.components;
	const { createBlock, cloneBlock } = wp.blocks;
	const __ = wp.i18n.__;
	const store = 'core/block-editor';
	const gridClass = 'animewp-profile-grid';
	const rowsClass = 'animewp-profile-rows';
	const hasClass = ( names, name ) => ( names || '' ).split( /\s+/ ).includes( name );
	const addClass = ( names, name ) => hasClass( names, name ) ? names || '' : [ names, name ].filter( Boolean ).join( ' ' );
	const removeClass = ( names, name ) => ( names || '' ).split( /\s+/ ).filter( ( item ) => item && item !== name ).join( ' ' );
	const profileCard = ( block ) => block && block.name === 'core/group' && (
		hasClass( block.attributes?.className, 'animewp-profile-card' ) ||
		( block.innerBlocks || [] ).some( ( child ) =>
			child.name === 'core/paragraph' && /CV[：:]/.test( String( child.attributes?.content || '' ) )
		)
	);
	const newCard = ( cards ) => {
		const sample = cards.find( profileCard );
		return sample ? cloneBlock( sample ) : createBlock( 'core/group', {
			className: 'animewp-profile-card', layout: { type: 'default' },
		}, [ createBlock( 'core/paragraph', { content: __( '人物の紹介文を入力', 'animewp' ) } ) ] );
	};
	const rowBlock = ( cards ) => createBlock( 'core/columns', { className: 'animewp-profile-row' },
		cards.map( ( card ) => createBlock( 'core/column', {}, [ card ] ) )
	);
	const actions = () => wp.data.dispatch( store );

	function ProfileTools( { BlockEdit, ...props } ) {
		const { name, clientId, attributes, isSelected } = props;
		const children = useSelect( ( select ) => name === 'core/group'
			? select( store )?.getBlocks( clientId ) || [] : [], [ name, clientId ] );
		const grid = name === 'core/group' && attributes.layout?.type === 'grid' && (
			hasClass( attributes.className, gridClass ) || children.some( profileCard )
		);
		const rows = name === 'core/group' && hasClass( attributes.className, rowsClass );
		const card = name === 'core/group' && profileCard( { name, attributes, innerBlocks: children } );
		if ( ! grid && ! rows && ! card ) {
			return el( BlockEdit, props );
		}
		const selectNew = ( block ) => actions().selectBlock( block.clientId );

		function addCard() {
			if ( grid ) {
				const added = newCard( children );
				const className = addClass( attributes.className, gridClass );
				if ( className !== attributes.className ) {
					actions().updateBlockAttributes( clientId, { className } );
				}
				actions().insertBlocks( added, children.length, clientId );
				selectNew( added );
				return;
			}
			const source = children.flatMap( ( r ) => ( r.innerBlocks || [] ).flatMap( ( c ) => c.innerBlocks || [] ) );
			const added = newCard( source );
			const lastRow = children.filter( ( b ) => b.name === 'core/columns' ).at( -1 );
			if ( lastRow && lastRow.innerBlocks.length < 3 ) {
				actions().insertBlocks( createBlock( 'core/column', {}, [ added ] ), lastRow.innerBlocks.length, lastRow.clientId );
			} else {
				actions().insertBlocks( rowBlock( [ added ] ), children.length, clientId );
			}
			selectNew( added );
		}

		function addRow() {
			const source = children.flatMap( ( r ) => ( r.innerBlocks || [] ).flatMap( ( c ) => c.innerBlocks || [] ) );
			const added = newCard( source );
			actions().insertBlocks( rowBlock( [ added ] ), children.length, clientId );
			selectNew( added );
		}

		function toRows( first ) {
			const split = [ first, 5 - first ];
			const result = [];
			let offset = 0;
			while ( offset < children.length ) {
				const count = split[ result.length ] || 3;
				result.push( rowBlock( children.slice( offset, offset + count ) ) );
				offset += count;
			}
			if ( ! result.length ) {
				result.push( rowBlock( [ newCard( [] ) ] ) );
			}
			const replacement = createBlock( 'core/group', {
				...attributes,
				className: addClass( removeClass( attributes.className, gridClass ), rowsClass ),
				layout: { type: 'default' },
				style: { ...attributes.style, spacing: { ...attributes.style?.spacing, blockGap: 'var:preset|spacing|40' } },
			}, result );
			actions().replaceBlock( clientId, replacement );
			selectNew( replacement );
		}

		function toGrid() {
			const cards = children.flatMap( ( row ) => {
				if ( row.name !== 'core/columns' ) {
					return [ row ];
				}
				return ( row.innerBlocks || [] ).map( ( column ) => {
					const blocks = column.innerBlocks || [];
					return blocks.length === 1 ? blocks[ 0 ] :
						createBlock( 'core/group', { layout: { type: 'default' } }, blocks );
				} );
			} );
			const replacement = createBlock( 'core/group', {
				...attributes,
				className: addClass( removeClass( attributes.className, rowsClass ), gridClass ),
				layout: { type: 'grid', minimumColumnWidth: '280px' },
			}, cards );
			actions().replaceBlock( clientId, replacement );
			selectNew( replacement );
		}

		function addToCard( type ) {
			let block;
			if ( type === 'phrase' ) {
				block = createBlock( 'core/paragraph', {
					content: __( 'キャッチフレーズを入力', 'animewp' ),
					className: 'is-style-animewp-catchphrase',
				} );
			} else if ( type === 'columns' ) {
				block = createBlock( 'core/columns', {}, [
					createBlock( 'core/column', {}, [
						createBlock( 'core/paragraph', { content: __( '左側の内容', 'animewp' ) } ),
					] ),
					createBlock( 'core/column', {}, [
						createBlock( 'core/paragraph', { content: __( '右側の内容', 'animewp' ) } ),
					] ),
				] );
			} else {
				block = createBlock( 'core/paragraph', { content: __( '追加の紹介文を入力', 'animewp' ) } );
			}
			actions().insertBlocks( block, children.length, clientId );
			selectNew( block );
		}
		const button = ( label, onClick ) => el( Button, {
			key: label, variant: 'secondary', onClick,
			style: { marginBlockEnd: '8px', marginInlineEnd: '8px' },
		}, label );
		return el( Fragment, {},
			el( BlockEdit, props ),
			( grid || rows ) && isSelected && el( BlockControls, {},
				el( ToolbarGroup, {},
					el( ToolbarButton, { icon: 'plus', label: __( 'カードを追加', 'animewp' ), onClick: addCard } )
				)
			),
			isSelected && el( InspectorControls, {},
				el( PanelBody, {
					className: 'animewp-profile-tools',
					title: card ? __( 'AnimeWP：カードを自由に編集', 'animewp' ) : __( 'AnimeWP：人物一覧の自由配置', 'animewp' ),
					initialOpen: true,
				},
				grid && el( Fragment, {},
					button( __( 'カードを追加', 'animewp' ), addCard ),
					button( __( '2＋3の行に変換', 'animewp' ), () => toRows( 2 ) ),
					button( __( '3＋2の行に変換', 'animewp' ), () => toRows( 3 ) )
				),
				rows && el( Fragment, {},
					button( __( 'カードを追加', 'animewp' ), addCard ),
					button( __( '行を追加', 'animewp' ), addRow ),
					button( __( '自動折り返しに戻す', 'animewp' ), toGrid )
				),
				card && el( Fragment, {},
					button( __( 'キャッチフレーズを追加', 'animewp' ), () => addToCard( 'phrase' ) ),
					button( __( '紹介文を追加', 'animewp' ), () => addToCard( 'text' ) ),
					button( __( '2カラムを追加', 'animewp' ), () => addToCard( 'columns' ) )
				) )
			)
		);
	}

	wp.hooks.addFilter( 'editor.BlockEdit', 'animewp/profile-layout-controls', ( BlockEdit ) =>
		( props ) => el( ProfileTools, { ...props, BlockEdit } )
	);
}() );
