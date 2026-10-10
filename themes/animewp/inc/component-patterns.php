<?php
/**
 * Individually insertable building blocks derived from the theme's own
 * registered patterns. No duplicated markup, styling, or editor-only blocks:
 * one layout source powers full pages, sections, and smaller components.
 *
 * @package animewp
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Part inventory. A path indexes the nested block tree of the registered
 * source pattern. Expected root types make source-generator drift fail closed.
 * All titles and help text are in Japanese, matching the theme's inserter.
 *
 * @return array<string, array<string, mixed>>
 */
function animewp_component_catalog(): array {
	return array(
		'part-heading-pair' => array(
			'title' => __( '英語＋日本語の見出し', 'animewp' ),
			'description' => __( '作品名や各セクションの英語見出しに日本語の補助見出しを添えます。', 'animewp' ),
			'source' => 'animewp/example-story',
			'path' => array( 0, 0 ),
			'block' => 'core/group',
			'category' => 'animewp-components',
			'width' => 750,
		),
		'part-vertical-story-heading' => array(
			'title' => __( '縦書きの短い見出し', 'animewp' ),
			'description' => __( 'ストーリーやキャッチコピーに使う縦書き見出し。端末幅に追従します。', 'animewp' ),
			'source' => 'animewp/example-story',
			'path' => array( 0, 1, 0, 0 ),
			'block' => 'core/group',
			'category' => 'animewp-components',
			'width' => 500,
		),
		'part-hero-title-card' => array(
			'title' => __( 'キービジュアルの半透明タイトルカード', 'animewp' ),
			'description' => __( '作品名・キャッチコピー・放送時期をまとめた、色を変えられるガラス風カード。', 'animewp' ),
			'source' => 'animewp/example-key-visual',
			'path' => array( 0, 0, 0, 0 ),
			'block' => 'core/group',
			'category' => 'animewp-components',
			'width' => 720,
		),
		'part-single-cover' => array(
			'title' => __( 'タイトル付きカバー画像1枚', 'animewp' ),
			'description' => __( 'タイトルカードを重ねたカバー画像を1枚だけ追加します。', 'animewp' ),
			'source' => 'animewp/example-key-visual',
			'path' => array( 0, 0, 0 ),
			'block' => 'core/cover',
			'category' => 'animewp-layout-parts',
			'width' => 1200,
		),
		'part-intro-image-text' => array(
			'title' => __( '作品紹介：画像と文章の2列', 'animewp' ),
			'description' => __( '画像・見出し・本文・ボタンを左右に並べる組み合わせ。', 'animewp' ),
			'source' => 'animewp/example-introduction',
			'path' => array( 0, 0 ),
			'block' => 'core/columns',
			'category' => 'animewp-layout-parts',
			'width' => 1180,
		),
		'part-story-body' => array(
			'title' => __( 'あらすじ：縦書き見出しと本文', 'animewp' ),
			'description' => __( '縦書きの見出し、あらすじ、各話の開閉カードを組み合わせた本文。', 'animewp' ),
			'source' => 'animewp/example-story',
			'path' => array( 0, 1 ),
			'block' => 'core/columns',
			'category' => 'animewp-layout-parts',
			'width' => 1180,
		),
		'part-episode-details' => array(
			'title' => __( '各話紹介：開閉できるカード', 'animewp' ),
			'description' => __( 'タイトルを押すと本文を開ける各話用カード1件。', 'animewp' ),
			'source' => 'animewp/example-story',
			'path' => array( 0, 1, 1, 2 ),
			'block' => 'core/details',
			'category' => 'animewp-components',
			'width' => 760,
		),
		'part-episode-details-next' => array(
			'title' => __( '各話紹介：2つ目のカード', 'animewp' ),
			'description' => __( '開閉できる各話紹介を別の内容でもう1件追加します。', 'animewp' ),
			'source' => 'animewp/example-story',
			'path' => array( 0, 1, 1, 3 ),
			'block' => 'core/details',
			'category' => 'animewp-components',
			'width' => 760,
		),
		'part-movie-card' => array(
			'title' => __( '映像のカード1枚', 'animewp' ),
			'description' => __( 'ポスター・タイトル・再生操作がまとまった動画カード1件。', 'animewp' ),
			'source' => 'animewp/example-movie',
			'path' => array( 0, 2, 0 ),
			'block' => 'animewp/video-card',
			'category' => 'animewp-components',
			'width' => 720,
		),
		'part-movie-carousel' => array(
			'title' => __( '映像カードのスライダー', 'animewp' ),
			'description' => __( '映像カード3枚を切り替えるカルーセル。背景はページに合わせて編集します。', 'animewp' ),
			'source' => 'animewp/example-movie',
			'path' => array( 0, 2 ),
			'block' => 'animewp/carousel',
			'category' => 'animewp-layout-parts',
			'width' => 1180,
		),
		'part-character-profile' => array(
			'title' => __( 'キャラクター紹介1人分', 'animewp' ),
			'description' => __( '人物画像、名前、声優名、紹介文を2列で表示するプロフィール。', 'animewp' ),
			'source' => 'animewp/example-characters',
			'path' => array( 0, 1, 0 ),
			'block' => 'core/columns',
			'category' => 'animewp-layout-parts',
			'width' => 920,
		),
		'part-character-carousel' => array(
			'title' => __( 'キャラクター切り替え一覧', 'animewp' ),
			'description' => __( '複数の人物紹介をサムネイルで切り替えます。', 'animewp' ),
			'source' => 'animewp/example-characters',
			'path' => array( 0, 1 ),
			'block' => 'animewp/carousel',
			'category' => 'animewp-layout-parts',
			'width' => 1180,
		),
		'part-staff-credits' => array(
			'title' => __( 'スタッフ一覧表', 'animewp' ),
			'description' => __( '職種と担当者を並べる、テーマの書体・余白に合わせた表。', 'animewp' ),
			'source' => 'animewp/example-credits',
			'path' => array( 0, 1, 0, 1 ),
			'block' => 'core/table',
			'category' => 'animewp-components',
			'width' => 760,
		),
		'part-cast-credits' => array(
			'title' => __( 'キャスト一覧表', 'animewp' ),
			'description' => __( '役名と出演者を並べる、テーマの書体・余白に合わせた表。', 'animewp' ),
			'source' => 'animewp/example-credits',
			'path' => array( 0, 1, 1, 1 ),
			'block' => 'core/table',
			'category' => 'animewp-components',
			'width' => 760,
		),
		'part-credits-columns' => array(
			'title' => __( 'スタッフ・キャスト2列表', 'animewp' ),
			'description' => __( 'スタッフとキャストの一覧表を左右に並べます。', 'animewp' ),
			'source' => 'animewp/example-credits',
			'path' => array( 0, 1 ),
			'block' => 'core/columns',
			'category' => 'animewp-layout-parts',
			'width' => 1180,
		),
		'part-music-opening' => array(
			'title' => __( '楽曲カード：オープニング', 'animewp' ),
			'description' => __( 'ジャケット画像・曲名・アーティスト・配信リンクをまとめたカード。', 'animewp' ),
			'source' => 'animewp/example-music',
			'path' => array( 0, 1, 0, 0 ),
			'block' => 'core/group',
			'category' => 'animewp-components',
			'width' => 620,
		),
		'part-music-ending' => array(
			'title' => __( '楽曲カード：エンディング', 'animewp' ),
			'description' => __( 'ジャケット画像・曲名・アーティスト・配信リンクのもう1つの例。', 'animewp' ),
			'source' => 'animewp/example-music',
			'path' => array( 0, 1, 1, 0 ),
			'block' => 'core/group',
			'category' => 'animewp-components',
			'width' => 620,
		),
		'part-onair-table' => array(
			'title' => __( '放送・配信の日時一覧', 'animewp' ),
			'description' => __( '放送局・配信サービス・開始日時を編集できる情報表。', 'animewp' ),
			'source' => 'animewp/example-on-air',
			'path' => array( 0, 1, 0 ),
			'block' => 'core/table',
			'category' => 'animewp-components',
			'width' => 760,
		),
		'part-onair-details' => array(
			'title' => __( '放送情報：表・注意書き・ボタン', 'animewp' ),
			'description' => __( '日時の表に注意書きと案内ボタンを添えた組み合わせ。', 'animewp' ),
			'source' => 'animewp/example-on-air',
			'path' => array( 0, 1 ),
			'block' => 'core/group',
			'category' => 'animewp-layout-parts',
			'width' => 960,
		),
		'part-onair-buttons' => array(
			'title' => __( '放送・配信への案内ボタン', 'animewp' ),
			'description' => __( '放送・配信の詳細へ誘導するボタンを1つ追加します。', 'animewp' ),
			'source' => 'animewp/example-on-air',
			'path' => array( 0, 1, 2 ),
			'block' => 'core/buttons',
			'category' => 'animewp-components',
			'width' => 560,
		),
		'part-news-button' => array(
			'title' => __( 'お知らせ一覧へのボタン', 'animewp' ),
			'description' => __( 'お知らせの一覧ページに誘導する輪郭線付きボタン。', 'animewp' ),
			'source' => 'animewp/example-news',
			'path' => array( 0, 2 ),
			'block' => 'core/buttons',
			'category' => 'animewp-components',
			'width' => 560,
		),
		'part-closing-buttons' => array(
			'title' => __( '次の行動への2つのボタン', 'animewp' ),
			'description' => __( '公式SNSと放送・配信情報など、2つの行動を並べます。', 'animewp' ),
			'source' => 'animewp/example-closing',
			'path' => array( 0, 0, 2 ),
			'block' => 'core/buttons',
			'category' => 'animewp-components',
			'width' => 620,
		),
		'part-closing-message' => array(
			'title' => __( '締めくくりの見出しとボタン', 'animewp' ),
			'description' => __( '最後のメッセージと案内ボタンの組み合わせ。背景色は配置先で編集します。', 'animewp' ),
			'source' => 'animewp/example-closing',
			'path' => array( 0, 0 ),
			'block' => 'core/group',
			'category' => 'animewp-layout-parts',
			'width' => 900,
		),
		'part-petal-hero' => array(
			'title' => __( '花びらが舞うキービジュアル', 'animewp' ),
			'description' => __( '花びら・星と切り替わるカバー画像を組み合わせた演出。', 'animewp' ),
			'source' => 'animewp/page-drift',
			'path' => array( 0 ),
			'block' => 'core/group',
			'category' => 'animewp-scene-parts',
			'width' => 1280,
		),
		'part-petal-movie' => array(
			'title' => __( '花びら付き映像セクション', 'animewp' ),
			'description' => __( '淡い花びら装飾と映像のカルーセルを組み合わせます。', 'animewp' ),
			'source' => 'animewp/page-drift',
			'path' => array( 3 ),
			'block' => 'core/group',
			'category' => 'animewp-scene-parts',
			'width' => 1280,
		),
		'part-petal-closing' => array(
			'title' => __( '花びら付きエンディング案内', 'animewp' ),
			'description' => __( '濃い色の最終セクションと控えめな花びらの組み合わせ。', 'animewp' ),
			'source' => 'animewp/page-drift',
			'path' => array( 8 ),
			'block' => 'core/group',
			'category' => 'animewp-scene-parts',
			'width' => 1280,
		),
		'part-header-brand' => array(
			'title' => __( 'ヘッダー用ロゴとサイト名', 'animewp' ),
			'description' => __( 'サイトロゴとサイトタイトルだけを、組み替えられる1つのグループにします。', 'animewp' ),
			'source' => 'animewp/header',
			'path' => array( 0, 0 ),
			'block' => 'core/group',
			'category' => 'animewp-layout-parts',
			'width' => 680,
		),
		'part-header-navigation' => array(
			'title' => __( 'ページ内移動メニュー', 'animewp' ),
			'description' => __( 'お知らせ・ストーリー・スタッフなどへのナビゲーションリンク。', 'animewp' ),
			'source' => 'animewp/header-landing',
			'path' => array( 0, 1 ),
			'block' => 'core/navigation',
			'category' => 'animewp-layout-parts',
			'width' => 1120,
		),
		'part-footer-navigation' => array(
			'title' => __( 'フッター用サイトマップ', 'animewp' ),
			'description' => __( '主要ページへのリンクをまとめたナビゲーション。', 'animewp' ),
			'source' => 'animewp/footer-minimal',
			'path' => array( 0, 1, 0 ),
			'block' => 'core/navigation',
			'category' => 'animewp-layout-parts',
			'width' => 1120,
		),
		'part-footer-details' => array(
			'title' => __( 'フッターの案内・権利表記', 'animewp' ),
			'description' => __( '問い合わせ・権利表記・ページ先頭へのリンクをまとめたグループ。', 'animewp' ),
			'source' => 'animewp/footer-minimal',
			'path' => array( 0, 1, 1 ),
			'block' => 'core/group',
			'category' => 'animewp-layout-parts',
			'width' => 880,
		),
		'part-footer-social' => array(
			'title' => __( '公式SNSへの案内', 'animewp' ),
			'description' => __( 'フッターや本文に置ける公式リンクの見出しと案内ボタン。', 'animewp' ),
			'source' => 'animewp/footer-visual',
			'path' => array( 0, 0, 1, 0 ),
			'block' => 'core/group',
			'category' => 'animewp-components',
			'width' => 700,
		),
	);
}

/**
 * Extract a self-contained Core/AnimeWP block, never a parent-bound child
 * such as core/column, core/button or core/navigation-link.
 *
 * @param array<int, array<string, mixed>> $blocks Parsed source blocks.
 * @param array<int, int> $path Index path inside the source.
 * @return array<string, mixed>|null
 */
function animewp_component_node( array $blocks, array $path ): ?array {
	$current = null;
	foreach ( $path as $index ) {
		if ( ! isset( $blocks[ $index ] ) || ! is_array( $blocks[ $index ] ) ) {
			return null;
		}
		$current = $blocks[ $index ];
		$blocks = isset( $current['innerBlocks'] ) && is_array( $current['innerBlocks'] )
			? $current['innerBlocks']
			: array();
	}
	return $current;
}

/** Register fragments after generated sections (init 20) and theme patterns. */
function animewp_register_component_patterns(): void {
	$registry = WP_Block_Patterns_Registry::get_instance();
	$blocks = WP_Block_Type_Registry::get_instance();
	$parsed_sources = array();
	foreach ( animewp_component_catalog() as $slug => $component ) {
		$name = 'animewp/' . $slug;
		if ( $registry->is_registered( $name ) ) {
			continue;
		}
		$source = $component['source'];
		if ( ! array_key_exists( $source, $parsed_sources ) ) {
			$pattern = $registry->get_registered( $source );
			// Plugin-only sources are hidden automatically when the optional
			// plugin is disabled; Core-only components remain available.
			$parsed_sources[ $source ] = is_array( $pattern ) && ! empty( $pattern['content'] )
				? parse_blocks( $pattern['content'] )
				: array();
		}
		$node = animewp_component_node( $parsed_sources[ $source ], $component['path'] );
		if ( ! $node || ( $node['blockName'] ?? null ) !== $component['block']
			|| ! $blocks->is_registered( $component['block'] ) ) {
			continue;
		}
		// serialize_block preserves the original generated HTML and nested
		// block attributes, unlike reimplementing a second copy by hand.
		$content = serialize_block( $node );
		if ( '' === trim( $content ) ) {
			continue;
		}
		register_block_pattern(
			$name,
			array(
				'title' => $component['title'],
				'description' => $component['description'],
				'categories' => array( $component['category'] ),
				'content' => $content,
				'viewportWidth' => $component['width'],
				'inserterEnabled' => true,
			)
		);
	}
}
add_action( 'init', 'animewp_register_component_patterns', 25 );
