/**
 * Style guide: every text style, section style, button, carousel control and
 * motion preset on one page, each labeled with where it is edited. Doubles as
 * a visual check after changing the design settings.
 */
'use strict';
const sections = require( './_sections' );

module.exports = ( helpers ) => {
	const { b, image } = helpers;
	const s = sections( helpers );
	const where = ( text ) => s.caption( text );
	const block = ( title, note, inner ) =>
		b( 'core/group', { layout: { type: 'constrained' }, style: { spacing: { padding: { top: 'var:preset|spacing|40', bottom: 'var:preset|spacing|40' } }, border: { top: { color: 'var:preset|color|border', width: '1px' } } } }, [
			b( 'core/heading', { content: title, level: 2, className: 'is-style-animewp-label' } ),
			where( note ),
			...inner,
		] );

	const textStyles = [
		[ 'core/paragraph', 'animewp-kicker', '補助見出し' ],
		[ 'core/paragraph', 'animewp-label', 'ENGLISH LABEL' ],
		[ 'core/paragraph', 'animewp-lead', 'リード文：段落の最初で、内容の要点を少し大きく伝えます。' ],
		[ 'core/paragraph', 'animewp-catchphrase', 'キャッチコピー：物語が、そっと動き出す。' ],
		[ 'core/paragraph', 'animewp-caption', 'キャプション：画像や表の補足に使います。' ],
		[ 'core/paragraph', 'animewp-highlight', '文字の背景ハイライト' ],
		[ 'core/heading', 'animewp-display', '大見出し（明朝・広い字間）' ],
		[ 'core/heading', 'animewp-latin', 'Latin Heading' ],
	].map( ( [ name, style, text ] ) =>
		b( 'core/group', { layout: { type: 'flex', flexWrap: 'wrap', verticalAlignment: 'center' }, style: { spacing: { blockGap: 'var:preset|spacing|30' } } }, [
			b( 'core/paragraph', { content: style, className: 'is-style-animewp-caption', style: { layout: { selfStretch: 'fixed', flexSize: '12rem' } } } ),
			b( name, { content: text, className: 'is-style-' + style, ...( name === 'core/heading' ? { level: 3 } : {} ) } ),
		] )
	);

	const sectionStyles = [ [ 'animewp-surface', '淡い色面' ], [ 'animewp-card', 'カード' ], [ 'animewp-frame', '細いフレーム' ], [ 'animewp-soft-panel', '淡い背景' ], [ 'animewp-accent', '強調色の面' ], [ 'animewp-contrast', '濃い面' ], [ 'animewp-glass', 'すりガラス' ] ].map( ( [ style, name ] ) =>
		b( 'core/column', {}, [
			b( 'core/group', { className: 'is-style-' + style, layout: { type: 'default' } }, [ b( 'core/heading', { content: name, level: 3 } ), s.paragraph( 'is-style-' + style ) ] ),
		] )
	);
	const rows = ( items, size ) => {
		const result = [];
		for ( let i = 0; i < items.length; i += size ) {
			// Wide rows: in the readable text width, four framed samples left too little room for their labels.
			result.push( b( 'core/columns', { align: 'wide' }, items.slice( i, i + size ) ) );
		}
		return result;
	};

	const carousel = ( navStyle, dotStyle, extra = {} ) =>
		b( 'core/column', {}, [
			s.caption( 'navStyle: ' + navStyle + ' / dotStyle: ' + dotStyle ),
			b( 'animewp/carousel', { label: '見本画像', navStyle, dotStyle, ...extra }, [
				b( 'core/image', { url: image( 'animewp-key-visual-a.svg' ), alt: '見本画像1' } ),
				b( 'core/image', { url: image( 'animewp-key-visual-b.svg' ), alt: '見本画像2' } ),
				b( 'core/image', { url: image( 'animewp-character-d.svg' ), alt: '見本画像3' } ),
			] ),
		] );

	const entrances = [ [ 'fade', 'フェードイン' ], [ 'rise', '下から浮かぶ' ], [ 'slide-start', '行頭側からスライド' ], [ 'slide-end', '行末側からスライド' ], [ 'zoom', 'ズームイン' ], [ 'blur', 'ぼかしから鮮明に' ], [ 'mask', 'ワイプ' ], [ 'letters', '1文字ずつ' ] ].map( ( [ entrance, name ] ) =>
		b( 'core/column', {}, [
			b( 'core/group', { className: 'is-style-animewp-card', layout: { type: 'default' }, animewpMotion: entrance === 'letters' ? undefined : { entrance } }, [
				b( 'core/heading', { content: name, level: 3, animewpMotion: entrance === 'letters' ? { entrance } : undefined } ),
				s.caption( 'entrance: ' + entrance ),
			] ),
		] )
	);
	const hovers = [ [ 'lift', '浮き上がる' ], [ 'zoom', '画像を拡大' ], [ 'glow', '光る' ] ].map( ( [ hover, name ] ) =>
		b( 'core/column', {}, [
			b( 'core/group', { className: 'is-style-animewp-card', layout: { type: 'default' }, animewpMotion: { hover } }, [
				b( 'core/image', { url: image( 'animewp-key-visual-b.svg' ), alt: '' } ),
				b( 'core/heading', { content: name, level: 3 } ),
				s.caption( 'hover: ' + hover ),
			] ),
		] )
	);

	return {
		slug: 'style-guide',
		title: 'スタイル見本：すべての部品と動き',
		description: 'テキストスタイル、区画のスタイル、ボタン、カルーセルの操作、モーションを一覧できます。デザインを変えた後の確認にも使えます。',
		categories: [ 'animewp-example-pages' ],
		viewportWidth: 1280,
		blocks: [
			b( 'core/group', { align: 'wide', layout: { type: 'constrained', contentSize: '1180px' } }, [
				s.sectionTitle( 'Style Guide', 'スタイル見本', 'plain' ),
				block( 'Text styles / テキストスタイル', 'スタイル → ブロック → 段落／見出し で一括変更', textStyles ),
				block( 'Section styles / 区画のスタイル', 'スタイル → ブロック → グループ で一括変更', rows( sectionStyles, 4 ) ),
				block( 'Buttons / ボタン', 'スタイル → ブロック → ボタン、またはスタイル → 要素 → ボタン', [ s.buttons( [ [ '塗り', false ], [ '線', true ] ] ) ] ),
				block( 'Carousel / カルーセル', '各カルーセルの「操作」設定で切り替え', rows( [ carousel( 'icon', 'dots' ), carousel( 'text', 'numbers', { prevLabel: 'PREV', nextLabel: 'NEXT' } ), carousel( 'line', 'thumbnails', { prevLabel: 'PREV', nextLabel: 'NEXT', effect: 'fade' } ) ], 3 ) ),
				block( 'Entrances / 登場の動き', '各ブロックの「モーション → 登場」', rows( entrances, 4 ) ),
				block( 'Hover / ポインターを合わせたとき', '各ブロックの「モーション → ポインターを合わせたとき」', rows( hovers, 3 ) ),
			] ),
		],
	};
};
