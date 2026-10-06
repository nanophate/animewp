<?php
/**
 * Plugin Name: AnimeWP Blocks
 * Description: Decorated panels, rotated text, image and text layouts, and video buttons for anime and film sites. Saved content stays readable if the plugin is turned off.
 * Version: 1.3.0
 * Requires at least: 6.6
 * Requires PHP: 8.0
 * Author: AnimeWP
 * License: GPL-2.0-or-later
 * Text Domain: animewp-blocks
 * Domain Path: /languages
 */

namespace Animewp\Blocks;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const BLOCKS = array( 'panel', 'text-group', 'media', 'video' );

/** Bundled translations; a translation installed in wp-content/languages takes precedence. */
function load_textdomain(): void {
	load_plugin_textdomain( 'animewp-blocks', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );
}
add_action( 'init', __NAMESPACE__ . '\\load_textdomain', 0 );

/** Register blocks from their built block.json; scripts come from build/, styles are shared. */
function register_blocks(): void {
	$animewp_version = '1.3.0';
	wp_register_style( 'animewp-blocks-style', plugins_url( 'assets/style.css', __FILE__ ), array(), $animewp_version );
	wp_register_style( 'animewp-blocks-editor-style', plugins_url( 'assets/editor.css', __FILE__ ), array( 'animewp-blocks-style' ), $animewp_version );

	foreach ( BLOCKS as $animewp_block ) {
		$animewp_type = register_block_type( __DIR__ . '/build/blocks/' . $animewp_block );
		if ( ! $animewp_type ) {
			continue;
		}
		foreach ( $animewp_type->editor_script_handles as $animewp_handle ) {
			wp_set_script_translations( $animewp_handle, 'animewp-blocks', __DIR__ . '/languages' );
		}
		if ( 'panel' === $animewp_block && $animewp_type->editor_script_handles ) {
			wp_add_inline_script( $animewp_type->editor_script_handles[0], 'window.animewpColorPresets = ' . wp_json_encode( color_presets(), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT ) . ';', 'before' );
		}
	}
}
add_action( 'init', __NAMESPACE__ . '\\register_blocks' );

/** Site palette for the panel decoration picker, keyed by the CSS variable slug Core generates. */
function color_presets(): array {
	$colors = array();
	foreach ( wp_get_global_settings( array( 'color', 'palette' ) ) as $group ) {
		foreach ( $group as $color ) {
			if ( ! empty( $color['slug'] ) && preg_match( '/^[\p{L}\p{N}_-]+$/u', $color['slug'] ) ) {
				$color['variableSlug'] = _wp_to_kebab_case( $color['slug'] );
				$colors[ $color['slug'] ] = $color;
			}
		}
	}
	return array_values( $colors );
}

/** Preserve the explicit media CORS setting through filtered author saves.
 * Core supports this safe HTML media attribute, but its older post allowlist
 * omits it. No script, iframe, arbitrary attribute or broader context is added.
 */
function allow_video_crossorigin( $tags, $context ) {
	if ( 'post' === $context && isset( $tags['video'] ) ) {
		$tags['video']['crossorigin'] = true;
	}
	return $tags;
}
add_filter( 'wp_kses_allowed_html', __NAMESPACE__ . '\\allow_video_crossorigin', 10, 2 );

/** Reusable starting points appear in the inserter; no post content is generated. */
function register_patterns(): void {
	register_block_pattern_category( 'animewp-blocks', array( 'label' => __( 'AnimeWP Blocks', 'animewp-blocks' ) ) );
	foreach ( array( 'tilted-heading-upright-body', 'independent-text-groups' ) as $animewp_pattern ) {
		$animewp_definition = require __DIR__ . '/patterns/' . $animewp_pattern . '.php';
		register_block_pattern( 'animewp-blocks/' . $animewp_pattern, $animewp_definition );
	}
}
add_action( 'init', __NAMESPACE__ . '\\register_patterns' );

// No activation/deactivation hooks: posts, options, menus and rewrite rules are untouched.
