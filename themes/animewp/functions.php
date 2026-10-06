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
	add_editor_style( array( 'assets/css/compat.css', 'assets/css/animewp.css', 'assets/css/layout.css', 'assets/css/editor.css' ) );
}
add_action( 'after_setup_theme', 'animewp_setup' );

function animewp_assets() {
	wp_enqueue_style( 'animewp-compat', get_theme_file_uri( 'assets/css/compat.css' ), array(), wp_get_theme()->get( 'Version' ) );
	wp_enqueue_style( 'animewp-theme', get_theme_file_uri( 'assets/css/animewp.css' ), array( 'animewp-compat' ), wp_get_theme()->get( 'Version' ) );
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
	register_block_pattern_category( 'animewp-parts', array( 'label' => __( 'animewp：小さな部品', 'animewp' ) ) );
	register_block_pattern_category( 'animewp-headers', array( 'label' => __( 'animewp：ヘッダー', 'animewp' ) ) );
	register_block_pattern_category( 'animewp-footers', array( 'label' => __( 'animewp：フッター', 'animewp' ) ) );
	// Text and section styles with editable typography/colors live in styles/*.json
	// (Styles → Blocks → …). These remaining styles are decorative behaviour only.
	$styles = array(
		'core/group'     => array( 'animewp-reveal' => __( 'animewp：控えめに表示', 'animewp' ), 'animewp-texture' => __( 'animewp：細い罫線のテクスチャ', 'animewp' ) ),
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
	$css       = '';
	$viewports = animewp_editor_gap_viewports();
	foreach ( $viewports as $key => $query ) {
		$token = sanitize_html_class( ltrim( $key, '@' ) );
		$rules = array(
			'.wp-block-columns[data-animewp-default-gap~="' . $token . '"] { gap: var(--animewp-column-gap); }',
			'.animewp-header[data-animewp-default-gap~="' . $token . '"] { --wp--style--block-gap: var(--animewp-default-header-gap, 24px); gap: var(--wp--style--block-gap, 24px); }',
			'.animewp-brand[data-animewp-default-gap~="' . $token . '"] { --wp--style--block-gap: var(--animewp-default-brand-gap, 12px); gap: var(--wp--style--block-gap, 12px); }',
			'.animewp-header .wp-block-navigation[data-animewp-default-gap~="' . $token . '"] { --wp--style--block-gap: var(--animewp-default-navigation-gap, 24px); }',
			'.animewp-header .wp-block-navigation[data-animewp-default-gap~="' . $token . '"] .wp-block-navigation__container { gap: var(--wp--style--block-gap, 24px); }',
			'.animewp-header[data-animewp-default-justify~="' . $token . '"] { justify-content: var(--animewp-default-header-justify, space-between); }',
			'.animewp-header[data-animewp-default-orientation~="' . $token . '"] { flex-direction: var(--animewp-default-header-orientation, row); }',
			'.animewp-header[data-animewp-default-wrap~="' . $token . '"] { flex-wrap: var(--animewp-default-header-wrap, wrap); }',
		);
		$sidebar_rules = array(
			'.animewp-theme :is(.animewp-header--left, .animewp-header--right)[data-animewp-default-justify~="' . $token . '"] { justify-content: var(--animewp-default-header-justify, flex-start); }',
			'.animewp-theme :is(.animewp-header--left, .animewp-header--right)[data-animewp-default-orientation~="' . $token . '"] { flex-direction: var(--animewp-default-header-orientation, column); }',
			'.animewp-theme :is(.animewp-header--left, .animewp-header--right)[data-animewp-default-align~="' . $token . '"] { align-items: var(--animewp-default-header-align, stretch); }',
			'.animewp-theme :is(.animewp-header--left, .animewp-header--right) .wp-block-navigation[data-animewp-default-gap~="' . $token . '"] { --wp--style--block-gap: var(--animewp-default-navigation-gap, 20px); }',
			'.animewp-theme :is(.animewp-header--left, .animewp-header--right) .wp-block-navigation[data-animewp-default-orientation~="' . $token . '"] .wp-block-navigation__container { --navigation-layout-direction: var(--animewp-default-navigation-orientation, column); --navigation-layout-justify: initial; --navigation-layout-align: var(--navigation-layout-justification-setting, flex-start); text-align: var(--navigation-layout-text-align, inherit); }',
		);
		$padding = array(
			'top'    => 'var(--animewp-default-header-padding-top, 20px)',
			'right'  => 'var(--animewp-default-header-padding-right, clamp(20px, 4vw, 64px))',
			'bottom' => 'var(--animewp-default-header-padding-bottom, 20px)',
			'left'   => 'var(--animewp-default-header-padding-left, clamp(20px, 4vw, 64px))',
		);
		foreach ( $padding as $side => $value ) {
			$rules[] = '.animewp-header[data-animewp-default-padding-' . $side . '~="' . $token . '"] { padding-' . $side . ': ' . $value . '; }';
		}
		foreach ( array( 'top' => 'block-start', 'bottom' => 'block-end' ) as $side => $logical_side ) {
			$rules[] = '.animewp-header[data-animewp-default-margin-' . $side . '~="' . $token . '"] { margin-' . $logical_side . ': 0; }';
		}
		$menu_rule = '.animewp-header .wp-block-navigation[data-animewp-default-gap~="' . $token . '"] .wp-block-navigation__responsive-container.is-menu-open .wp-block-navigation__container { --wp--style--block-gap: 24px; gap: 24px; }';
		$rule = implode( ' ', $rules );
		$css .= $query ? $query . ' { ' . $rule . ' }' : $rule;
		$sidebar_rule = implode( ' ', $sidebar_rules );
		$css .= ' @media (min-width: 1001px) { ' . ( $query ? $query . ' { ' . $sidebar_rule . ' }' : $sidebar_rule ) . ' }';
		$css .= ' @media (max-width: 781px) { ' . ( $query ? $query . ' { ' . $menu_rule . ' }' : $menu_rule ) . ' }';
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

/** Treat explicit values, including zero and preset references, as user settings. */
function animewp_has_design_style_value( $value ) {
	if ( is_array( $value ) ) {
		foreach ( $value as $item ) {
			if ( animewp_has_design_style_value( $item ) ) {
				return true;
			}
		}
		return false;
	}
	return is_int( $value ) || is_float( $value ) || ( is_string( $value ) && '' !== trim( $value ) );
}

function animewp_has_design_box_side( $value, $side ) {
	if ( ! is_array( $value ) ) {
		return animewp_has_design_style_value( $value );
	}
	$axis = in_array( $side, array( 'top', 'bottom' ), true ) ? 'block' : 'inline';
	return animewp_has_design_style_value( $value[ $side ] ?? null ) || animewp_has_design_style_value( $value[ $axis ] ?? null );
}

function animewp_has_design_layout_value( $attrs, $property, $viewport = '@base' ) {
	$properties = array(
		'justify'     => array( 'justifyContent' ),
		'orientation' => array( 'orientation' ),
		'wrap'        => array( 'flexWrap' ),
		'align'       => array( 'verticalAlignment', 'alignItems' ),
	);
	$keys  = $properties[ $property ] ?? array();
	$style = isset( $attrs['style'] ) && is_array( $attrs['style'] ) ? $attrs['style'] : array();
	foreach ( $keys as $key ) {
		$values = array(
			$attrs[ $key ] ?? null,
			$attrs['layout'][ $key ] ?? null,
			$style['layout'][ $key ] ?? null,
		);
		if ( '@base' !== $viewport ) {
			$values[] = $style[ $viewport ]['layout'][ $key ] ?? null;
			$values[] = $style[ $viewport ][ $key ] ?? null;
			$values[] = $attrs['layout'][ $viewport ][ $key ] ?? null;
			$values[] = $attrs[ $viewport ]['layout'][ $key ] ?? null;
			$values[] = $attrs[ $viewport ][ $key ] ?? null;
		}
		foreach ( $values as $value ) {
			if ( animewp_has_design_style_value( $value ) ) {
				return true;
			}
		}
	}
	return false;
}

function animewp_design_default_tokens( $attrs, $property, $side = null ) {
	$style    = isset( $attrs['style'] ) && is_array( $attrs['style'] ) ? $attrs['style'] : array();
	$tokens   = array();
	if ( in_array( $property, array( 'justify', 'orientation', 'wrap', 'align' ), true ) ) {
		$has_base = animewp_has_design_layout_value( $attrs, $property, '@base' );
		foreach ( animewp_editor_gap_viewports() as $key => $query ) {
			$has_view = '@base' !== $key && animewp_has_design_layout_value( $attrs, $property, $key );
			if ( ! $has_base && ! $has_view ) {
				$tokens[] = sanitize_html_class( ltrim( $key, '@' ) );
			}
		}
		return $tokens;
	}
	$path     = 'justify' === $property ? null : ( 'gap' === $property ? array( 'spacing', 'blockGap' ) : array( 'spacing', $property ) );
	$base     = null;
	if ( 'justify' === $property ) {
		$base = $attrs['layout']['justifyContent'] ?? $style['layout']['justifyContent'] ?? null;
	} elseif ( $side ) {
		$base = $style['spacing'][ $property ][ $side ] ?? $style['spacing'][ $property ][ 'top' === $side || 'bottom' === $side ? 'block' : 'inline' ] ?? $style['spacing'][ $property ] ?? null;
	} else {
		$base = $path ? $style[ $path[0] ][ $path[1] ] ?? null : null;
	}
	foreach ( animewp_editor_gap_viewports() as $key => $query ) {
		$override = null;
		if ( '@base' !== $key ) {
			if ( 'justify' === $property ) {
				$override = $style[ $key ]['layout']['justifyContent'] ?? $attrs['layout'][ $key ]['justifyContent'] ?? null;
			} elseif ( $side ) {
				$box = $style[ $key ]['spacing'][ $property ] ?? null;
				$override = is_array( $box ) ? ( $box[ $side ] ?? $box[ 'top' === $side || 'bottom' === $side ? 'block' : 'inline' ] ?? null ) : $box;
			} elseif ( $path ) {
				$override = $style[ $key ][ $path[0] ][ $path[1] ] ?? null;
			}
		}
		$has_base = $side ? animewp_has_design_box_side( $style['spacing'][ $property ] ?? null, $side ) : animewp_has_design_style_value( $base );
		$has_view = $side ? animewp_has_design_box_side( $style[ $key ]['spacing'][ $property ] ?? null, $side ) : animewp_has_design_style_value( $override );
		if ( ! $has_base && ! $has_view ) {
			$tokens[] = sanitize_html_class( ltrim( $key, '@' ) );
		}
	}
	return $tokens;
}

function animewp_render_layout_defaults( $content, $block ) {
	$attrs = $block['attrs'] ?? array();
	$class = $attrs['className'] ?? '';
	$name  = $block['blockName'] ?? '';
	if ( 'core/group' === $name && is_string( $class ) && preg_match( '/(?:^|\s)animewp-(?:header|brand)(?:\s|$)/', $class ) ) {
		$html = new WP_HTML_Tag_Processor( $content );
		if ( ! $html->next_tag( array( 'class_name' => 'wp-block-group' ) ) ) {
			return $content;
		}
		animewp_set_layout_default_marker( $html, $attrs, 'data-animewp-default-gap', 'gap' );
		if ( preg_match( '/(?:^|\s)animewp-header(?:\s|$)/', $class ) ) {
			animewp_set_layout_default_marker( $html, $attrs, 'data-animewp-default-justify', 'justify' );
			animewp_set_layout_default_marker( $html, $attrs, 'data-animewp-default-orientation', 'orientation' );
			animewp_set_layout_default_marker( $html, $attrs, 'data-animewp-default-wrap', 'wrap' );
			animewp_set_layout_default_marker( $html, $attrs, 'data-animewp-default-align', 'align' );
			foreach ( array( 'top', 'right', 'bottom', 'left' ) as $side ) {
				animewp_set_layout_default_marker( $html, $attrs, 'data-animewp-default-padding-' . $side, 'padding', $side );
			}
			foreach ( array( 'top', 'bottom' ) as $side ) {
				animewp_set_layout_default_marker( $html, $attrs, 'data-animewp-default-margin-' . $side, 'margin', $side );
			}
		}
		return $html->get_updated_html();
	}
	if ( 'core/navigation' === $name ) {
		$html = new WP_HTML_Tag_Processor( $content );
		if ( $html->next_tag( array( 'class_name' => 'wp-block-navigation' ) ) ) {
			animewp_set_layout_default_marker( $html, $attrs, 'data-animewp-default-gap', 'gap' );
			animewp_set_layout_default_marker( $html, $attrs, 'data-animewp-default-orientation', 'orientation' );
			return $html->get_updated_html();
		}
	}
	return $content;
}

function animewp_set_layout_default_marker( $html, $attrs, $attribute, $property, $side = null ) {
	$tokens = animewp_design_default_tokens( $attrs, $property, $side );
	if ( $tokens ) {
		$html->set_attribute( $attribute, implode( ' ', $tokens ) );
	}
}
add_filter( 'render_block_core/group', 'animewp_render_layout_defaults', 10, 2 );
add_filter( 'render_block_core/navigation', 'animewp_render_layout_defaults', 10, 2 );
