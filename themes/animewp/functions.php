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
	add_editor_style( array( 'assets/css/animewp.css', 'assets/css/layout.css', 'assets/css/editor.css' ) );
}
add_action( 'after_setup_theme', 'animewp_setup' );

function animewp_assets() {
	wp_enqueue_style( 'animewp-theme', get_theme_file_uri( 'assets/css/animewp.css' ), array(), wp_get_theme()->get( 'Version' ) );
	wp_enqueue_style( 'animewp-layout', get_theme_file_uri( 'assets/css/layout.css' ), array( 'animewp-theme' ), wp_get_theme()->get( 'Version' ) );
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

/** Use Core's normalized, non-overlapping viewport ranges when available. */
function animewp_editor_gap_viewports() {
	if ( method_exists( 'WP_Theme_JSON', 'get_viewport_media_queries' ) ) {
		$settings = wp_get_global_settings();
		$queries  = WP_Theme_JSON::get_viewport_media_queries( $settings['viewport'] ?? null, array( 'include_desktop' => true ) );
		if ( $queries ) {
			return $queries;
		}
	}
	return array( '@base' => '' );
}

function animewp_editor_layout_assets() {
	wp_enqueue_script( 'animewp-editor-layout', get_theme_file_uri( 'assets/js/editor-layout.js' ), array( 'wp-element', 'wp-hooks' ), wp_get_theme()->get( 'Version' ), true );
	wp_add_inline_script( 'animewp-editor-layout', 'window.animewpEditorLayout=' . wp_json_encode( array( 'viewports' => array_keys( animewp_editor_gap_viewports() ) ) ) . ';', 'before' );
}
add_action( 'enqueue_block_editor_assets', 'animewp_editor_layout_assets' );

function animewp_editor_layout_styles() {
	$css = '';
	foreach ( animewp_editor_gap_viewports() as $key => $query ) {
		$token = sanitize_html_class( ltrim( $key, '@' ) );
		$rule  = '.wp-block-columns[data-animewp-default-gap~="' . $token . '"] { gap: var(--animewp-column-gap); }';
		$css  .= $query ? $query . ' { ' . $rule . ' }' : $rule;
	}
	wp_register_style( 'animewp-editor-layout', false, array(), wp_get_theme()->get( 'Version' ) );
	wp_enqueue_style( 'animewp-editor-layout' );
	wp_add_inline_style( 'animewp-editor-layout', $css );
}
add_action( 'enqueue_block_assets', 'animewp_editor_layout_styles' );

/** Mirror the editor's default-gap marker without modifying saved block content. */
function animewp_has_column_gap( $value ) {
	if ( is_array( $value ) ) {
		return animewp_has_column_gap( $value['top'] ?? null ) || animewp_has_column_gap( $value['left'] ?? null );
	}
	return is_int( $value ) || is_float( $value ) || ( is_string( $value ) && '' !== trim( $value ) );
}

function animewp_render_column_gap_defaults( $content, $block ) {
	$attrs = $block['attrs'] ?? array();
	$class = $attrs['className'] ?? '';
	if ( ! is_string( $class ) || ! preg_match( '/(?:^|\s)animewp-(?:hero-columns|media-columns|character-grid)(?:\s|$)/', $class ) ) {
		return $content;
	}
	$style = isset( $attrs['style'] ) && is_array( $attrs['style'] ) ? $attrs['style'] : array();
	$gap   = $style['spacing']['blockGap'] ?? null;
	$tokens = array();
	foreach ( animewp_editor_gap_viewports() as $key => $query ) {
		$override = $style[ $key ]['spacing']['blockGap'] ?? null;
		if ( ! animewp_has_column_gap( $gap ) && ! animewp_has_column_gap( $override ) ) {
			$tokens[] = sanitize_html_class( ltrim( $key, '@' ) );
		}
	}
	if ( $tokens ) {
		$html = new WP_HTML_Tag_Processor( $content );
		if ( $html->next_tag( array( 'class_name' => 'wp-block-columns' ) ) ) {
			$html->set_attribute( 'data-animewp-default-gap', implode( ' ', $tokens ) );
			return $html->get_updated_html();
		}
	}
	return $content;
}
add_filter( 'render_block_core/columns', 'animewp_render_column_gap_defaults', 10, 2 );
