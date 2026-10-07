/**
 * Section builders shared by the section examples and the full-page examples.
 * Each takes a `look` so the same structure can be shown plain, with blur
 * entrances, or with drifting decorations: one structure, different motion.
 *
 * Content is neutral sample text; images are the theme's own sample art.
 */
'use strict';

const SECTION_PADDING = { top: 'var:preset|spacing|60', bottom: 'var:preset|spacing|60' };
// Full-bleed content (the key visual's caption) starts where the wide sections start.
const EDGE = 'max(var(--wp--style--root--padding-left), calc((100% - var(--wp--style--global--wide-size)) / 2))';

/** Motion presets per look. `plain` adds nothing. */
const LOOKS = {
	plain: { section: null, heading: null, title: null },
	blur: {
		section: { entrance: 'blur', target: 'children' },
		heading: { entrance: 'blur' },
		title: { entrance: 'letters' },
	},
	drift: {
		section: { entrance: 'rise', target: 'children' },
		heading: { entrance: 'fade' },
		title: { entrance: 'rise' },
	},
};

module.exports = ( { b, image, poster } ) => {
	const motion = ( value ) => ( value ? { animewpMotion: value } : {} );
	const label = ( text, extra = {} ) => b( 'core/paragraph', { content: text, className: 'is-style-animewp-label', ...extra } );
	const caption = ( text, extra = {} ) => b( 'core/paragraph', { content: text, className: 'is-style-animewp-caption', ...extra } );
	const paragraph = ( text, extra = {} ) => b( 'core/paragraph', { content: text, ...extra } );
	const buttons = ( items, extra = {} ) =>
		b( 'core/buttons', extra, items.map( ( [ text, outline ] ) => b( 'core/button', { text, url: '#', className: outline ? 'is-style-outline' : undefined } ) ) );

	/** A section title: large Latin word + small Japanese label. */
	const sectionTitle = ( latin, japanese, look, align ) =>
		b( 'core/group', { layout: { type: 'flex', orientation: 'vertical', justifyContent: align === 'center' ? 'center' : 'left' }, style: { spacing: { blockGap: '0.25rem', margin: { bottom: 'var:preset|spacing|40' } } }, ...motion( LOOKS[ look ].heading ) }, [
			b( 'core/heading', { content: latin, level: 2, className: 'is-style-animewp-latin' } ),
			label( japanese ),
		] );

	// One width per section: titles and content share the theme's wide size
	// (Styles → Layout), so every section starts at the same left edge.
	const section = ( inner, look, extra = {} ) =>
		b( 'core/group', { align: 'full', tagName: 'section', style: { spacing: { padding: SECTION_PADDING } }, layout: { type: 'constrained', contentSize: 'var(--wp--style--global--wide-size)' }, ...extra }, inner );

	// Decorations sit behind the content, except over full-bleed images (layer: front).
	const petals = ( look, layer = 'behind' ) =>
		look === 'drift'
			? [
					b( 'animewp/decoration', { shape: 'petal', x: 8, y: 18, size: 3, rotation: -25, opacity: 70, textColor: 'accent', layer, animewpMotion: { loop: 'float', parallax: -15 } } ),
					b( 'animewp/decoration', { shape: 'petal', x: 92, y: 70, size: 5, rotation: 35, opacity: 45, textColor: 'accent', layer, animewpMotion: { loop: 'sway', parallax: 20 } } ),
					b( 'animewp/decoration', { shape: 'sparkle', x: 75, y: 12, size: 2, opacity: 60, textColor: 'muted', layer, animewpMotion: { loop: 'pulse' } } ),
			  ]
			: [];

	const keyVisual = ( look = 'plain' ) => {
		const slide = ( file, catchphrase ) =>
			b( 'core/cover', { url: image( file ), dimRatio: 0, isDark: false, minHeight: 86, minHeightUnit: 'vh', contentPosition: 'bottom left', style: { spacing: { padding: { top: 'var:preset|spacing|60', right: EDGE, bottom: 'var:preset|spacing|60', left: EDGE } } } }, [
				b( 'core/group', { layout: { type: 'constrained', contentSize: '36rem', justifyContent: 'left' }, className: 'is-style-animewp-glass', ...motion( LOOKS[ look ].section ) }, [
					label( 'TV ANIMATION' ),
					b( 'core/heading', { content: '作品タイトル', level: 1, className: 'is-style-animewp-display', ...motion( LOOKS[ look ].title ) } ),
					b( 'core/paragraph', { content: catchphrase, className: 'is-style-animewp-catchphrase' } ),
					caption( '2026年10月 放送開始' ),
				] ),
			] );
		return b( 'core/group', { align: 'full', layout: { type: 'default' }, style: { spacing: { padding: { top: '0', bottom: '0' } } } }, [
			...petals( look, 'front' ),
			b( 'animewp/carousel', { label: 'キービジュアル', align: 'full', effect: 'fade', autoplay: 7, navStyle: 'none', dotStyle: 'numbers', style: { spacing: { blockGap: '0' } } }, [
				slide( 'animewp-key-visual-a.svg', '物語が、そっと動き出す。' ),
				slide( 'animewp-key-visual-b.svg', 'ここから、新しい景色へ。' ),
			] ),
		] );
	};

	const introduction = ( look = 'plain' ) =>
		section( [
			b( 'core/columns', { align: 'wide', verticalAlignment: 'center', style: { spacing: { blockGap: { left: 'var:preset|spacing|60' } } }, ...motion( LOOKS[ look ].section ) }, [
				b( 'core/column', { width: '50%' }, [ b( 'core/image', { url: image( 'animewp-key-visual-b.svg' ), alt: '作品の場面写真（差し替えてください）', className: 'is-style-animewp-fade-start' } ) ] ),
				b( 'core/column', {}, [
					label( 'INTRODUCTION' ),
					b( 'core/heading', { content: '作品について', className: 'is-style-animewp-display', level: 2 } ),
					b( 'core/paragraph', { content: '作品の世界と、物語の入口を短く伝えます。ここでは見出し・リード文・本文がそれぞれ独立したブロックです。', className: 'is-style-animewp-lead' } ),
					paragraph( '書体や字間は「スタイル → ブロック」の各テキストスタイルでまとめて変えられます。' ),
					buttons( [ [ 'ストーリーを読む', true ] ] ),
				] ),
			] ),
		], look, { anchor: 'introduction' } );

	const story = ( look = 'plain' ) =>
		section( [
			sectionTitle( 'Story', 'ストーリー', look ),
			b( 'core/columns', { align: 'wide', style: { spacing: { blockGap: { left: 'var:preset|spacing|60' } } }, ...motion( LOOKS[ look ].section ) }, [
				// The vertical heading sits beside the text (and comes first on phones).
				b( 'core/column', { width: '30%' }, [
					b( 'core/group', { layout: { type: 'flex', justifyContent: 'right' } }, [
						b( 'core/heading', { content: 'あの日の約束を、<br>もう一度。', level: 3, className: 'is-style-animewp-short-vertical' } ),
					] ),
				] ),
				b( 'core/column', {}, [
					paragraph( '物語のあらすじを入力します。登場人物、舞台、物語が動き出すきっかけを、数段落で紹介します。' ),
					paragraph( '縦書き見出しは短い言葉向けです。狭い画面では自動で横書きに戻ります。' ),
					b( 'core/details', { summary: '第1話のあらすじ', className: 'is-style-animewp-details' }, [ paragraph( '各話の紹介を開閉できる形で載せられます。' ) ] ),
					b( 'core/details', { summary: '第2話のあらすじ', className: 'is-style-animewp-details' }, [ paragraph( '話数に合わせて複製してください。' ) ] ),
				] ),
			] ),
		], look, { anchor: 'story' } );

	const movie = ( look = 'plain' ) => {
		const card = ( file, tag, title ) => b( 'animewp/video-card', { posterUrl: poster( file ), label: tag, title } );
		return section( [
			b( 'animewp/backdrop', { mode: 'follow', blur: 32, veil: 70 } ),
			...petals( look ),
			sectionTitle( 'Movie', '映像', look, 'center' ),
			b( 'animewp/carousel', { label: '映像', align: 'full', slideWidth: 64, emphasizeActive: true, ...motion( LOOKS[ look ].heading ) }, [
				card( 'animewp-key-visual-a.svg', 'TRAILER 01', 'メイン映像' ),
				card( 'animewp-key-visual-b.svg', 'TRAILER 02', 'ティザー映像' ),
				card( 'animewp-key-visual-a.svg', 'SPECIAL', '特別映像' ),
			] ),
			caption( '各カードに動画のURLを設定すると再生ボタンが表示されます。再生すると動画サービスに接続します。', { align: 'center' } ),
		], look, { anchor: 'movie' } );
	};

	const characters = ( look = 'plain' ) => {
		const person = ( file, number, name ) =>
			b( 'core/columns', { verticalAlignment: 'center', style: { spacing: { blockGap: { left: 'var:preset|spacing|50' } } } }, [
				b( 'core/column', { width: '42%' }, [ b( 'core/image', { url: image( file ), alt: name + 'のイラスト（差し替えてください）', className: 'is-style-animewp-portrait' } ) ] ),
				b( 'core/column', { ...motion( LOOKS[ look ].section ) }, [
					label( 'CHARACTER ' + number ),
					b( 'core/heading', { content: name, level: 3, className: 'is-style-animewp-display' } ),
					caption( 'CV：声優名' ),
					paragraph( '人物の紹介文を入力します。性格や物語での役割を短く伝えます。' ),
				] ),
			] );
		return section( [
			sectionTitle( 'Characters', 'キャラクター', look ),
			b( 'animewp/carousel', { label: 'キャラクター', align: 'wide', effect: 'fade', dotStyle: 'thumbnails' }, [
				person( 'animewp-character-a.svg', '01', '主人公の名前' ),
				person( 'animewp-character-b.svg', '02', '相棒の名前' ),
				person( 'animewp-character-c.svg', '03', 'ライバルの名前' ),
			] ),
		], look, { anchor: 'characters' } );
	};

	const credits = ( look = 'plain' ) => {
		const table = ( rows ) =>
			b( 'core/table', {
				hasFixedLayout: true,
				body: rows.map( ( [ role, name ] ) => ( { cells: [ { content: role, tag: 'td' }, { content: name, tag: 'td' } ] } ) ),
			} );
		return section( [
			sectionTitle( 'Staff & Cast', 'スタッフ・キャスト', look ),
			b( 'core/columns', { align: 'wide', ...motion( LOOKS[ look ].section ) }, [
				b( 'core/column', {}, [ label( 'STAFF' ), table( [ [ '原作', '名前' ], [ '監督', '名前' ], [ 'シリーズ構成', '名前' ], [ 'キャラクターデザイン', '名前' ], [ '音楽', '名前' ], [ 'アニメーション制作', 'スタジオ名' ] ] ) ] ),
				b( 'core/column', {}, [ label( 'CAST' ), table( [ [ '主人公の名前', '声優名' ], [ '相棒の名前', '声優名' ], [ 'ライバルの名前', '声優名' ] ] ) ] ),
			] ),
		], look, { anchor: 'staff' } );
	};

	const music = ( look = 'plain' ) => {
		const release = ( file, kind, song ) =>
			b( 'core/column', {}, [
				b( 'core/group', { className: 'is-style-animewp-card', layout: { type: 'default' } }, [
					b( 'core/image', { url: image( file ), alt: 'ジャケット画像（差し替えてください）', aspectRatio: '1', scale: 'cover' } ),
					label( kind ),
					b( 'core/heading', { content: song, level: 3 } ),
					caption( 'アーティスト名' ),
					buttons( [ [ '配信サイトで聴く', true ] ] ),
				] ),
			] );
		return section( [
			sectionTitle( 'Music', '音楽', look ),
			b( 'core/columns', { align: 'wide', animewpMotion: { ...( LOOKS[ look ].section || {} ), hover: 'lift', target: 'children' } }, [
				release( 'animewp-character-d.svg', 'OPENING THEME', 'オープニング曲名' ),
				release( 'animewp-character-e.svg', 'ENDING THEME', 'エンディング曲名' ),
			] ),
		], look, { anchor: 'music', className: 'is-style-animewp-surface' } );
	};

	const onAir = ( look = 'plain' ) =>
		section( [
			sectionTitle( 'On Air', '放送・配信', look ),
			b( 'core/group', { layout: { type: 'constrained', justifyContent: 'left' }, ...motion( LOOKS[ look ].section ) }, [
				b( 'core/table', {
					hasFixedLayout: true,
					head: [ { cells: [ { content: '放送局・配信', tag: 'th' }, { content: '日時', tag: 'th' } ] } ],
					body: [
						{ cells: [ { content: '放送局名', tag: 'td' }, { content: '毎週土曜 24:00〜', tag: 'td' } ] },
						{ cells: [ { content: '配信サービス名', tag: 'td' }, { content: '毎週土曜 24:30〜 順次配信', tag: 'td' } ] },
					],
				} ),
				caption( '※放送・配信日時は変更になる場合があります。' ),
				buttons( [ [ '配信サービス一覧', false ] ] ),
			] ),
		], look, { anchor: 'onair' } );

	const news = ( look = 'plain' ) =>
		section( [
			sectionTitle( 'News', 'お知らせ', look ),
			b( 'core/pattern', { slug: 'animewp/news-index' } ),
			buttons( [ [ 'お知らせ一覧', true ] ], { layout: { type: 'flex', justifyContent: 'right' } } ),
		], look, { anchor: 'news' } );

	const closing = ( look = 'plain' ) =>
		section( [
			...petals( look ),
			b( 'core/group', { layout: { type: 'flex', orientation: 'vertical', justifyContent: 'center' }, ...motion( LOOKS[ look ].section ) }, [
				label( 'COMING SOON', { align: 'center' } ),
				b( 'core/heading', { content: '物語のつづきは、<br>放送で。', level: 2, className: 'is-style-animewp-display', textAlign: 'center' } ),
				buttons( [ [ '公式SNSをフォロー', false ], [ '放送情報', true ] ], { layout: { type: 'flex', justifyContent: 'center' } } ),
			] ),
		], look, { className: 'is-style-animewp-contrast' } );

	return { keyVisual, introduction, story, movie, characters, credits, music, onAir, news, closing, label, caption, paragraph, buttons, sectionTitle, section };
};
