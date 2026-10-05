<?php
/**
 * Theme setup and presentation.
 *
 * @package animewp
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function animewp_setup() {
	load_theme_textdomain( 'animewp', get_template_directory() . '/languages' );
	// Block template canvas renders the document title.
	add_theme_support( 'automatic-feed-links' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'responsive-embeds' );
	add_theme_support( 'wp-block-styles' );
	add_theme_support( 'align-wide' );
	add_theme_support( 'editor-styles' );
	add_theme_support( 'html5', array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script' ) );
	add_theme_support( 'custom-logo', array( 'height' => 80, 'width' => 240, 'flex-height' => true, 'flex-width' => true ) );
	add_editor_style( array( 'assets/css/animewp.css', 'assets/css/editor.css' ) );
}
add_action( 'after_setup_theme', 'animewp_setup' );

function animewp_assets() {
	wp_enqueue_style( 'animewp-theme', get_theme_file_uri( 'assets/css/animewp.css' ), array(), wp_get_theme()->get( 'Version' ) );
	wp_enqueue_script( 'animewp-presentation', get_theme_file_uri( 'assets/js/presentation.js' ), array(), wp_get_theme()->get( 'Version' ), array( 'in_footer' => true, 'strategy' => 'defer' ) );
	if ( is_singular() && comments_open() && get_option( 'thread_comments' ) ) {
		wp_enqueue_script( 'comment-reply' );
	}
}
add_action( 'wp_enqueue_scripts', 'animewp_assets' );

function animewp_body_classes( $classes ) {
	$classes[] = 'animewp-theme';
	return $classes;
}
add_filter( 'body_class', 'animewp_body_classes' );

function animewp_register_designs() {
	register_block_pattern_category( 'animewp-pages', array( 'label' => __( 'animewp：ページ', 'animewp' ) ) );
	register_block_pattern_category( 'animewp-sections', array( 'label' => __( 'animewp：ページの部品', 'animewp' ) ) );
	register_block_pattern_category( 'animewp-headers', array( 'label' => __( 'animewp：ヘッダー', 'animewp' ) ) );
	register_block_pattern_category( 'animewp-footers', array( 'label' => __( 'animewp：フッター', 'animewp' ) ) );
	$styles = array(
		'core/group'     => array( 'animewp-card' => __( 'animewp：カード', 'animewp' ), 'animewp-soft-panel' => __( 'animewp：淡い背景', 'animewp' ), 'animewp-reveal' => __( 'animewp：控えめに表示', 'animewp' ), 'animewp-texture' => __( 'animewp：細い罫線のテクスチャ', 'animewp' ) ),
		'core/heading'   => array( 'animewp-short-vertical' => __( 'animewp：縦書き見出し（短文向け）', 'animewp' ) ),
		'core/paragraph' => array( 'animewp-kicker' => __( 'animewp：小さな補助見出し', 'animewp' ), 'animewp-highlight' => __( 'animewp：文字の背景ハイライト', 'animewp' ) ),
		'core/details'   => array( 'animewp-details' => __( 'animewp：開閉カード', 'animewp' ) ),
		'core/image'     => array( 'animewp-portrait' => __( 'animewp：人物画像', 'animewp' ), 'animewp-fade-start' => __( 'animewp：左端をフェード', 'animewp' ), 'animewp-fade-bottom' => __( 'animewp：下端をフェード', 'animewp' ) ),
	);
	foreach ( $styles as $block_name => $definitions ) {
		foreach ( $definitions as $name => $label ) {
			register_block_style( $block_name, array( 'name' => $name, 'label' => $label ) );
		}
	}
}
add_action( 'init', 'animewp_register_designs' );

require_once get_theme_file_path( 'inc/starters.php' );
require_once get_theme_file_path( 'inc/design-settings.php' );
