<?php
/**
 * Plugin Name: AnimeWP Blocks
 * Description: 保存HTMLを残す装飾パネル、文字グループ、画像と本文、動画ダイアログの任意ブロック。
 * Version: 1.1.0
 * Requires at least: 6.6
 * Requires PHP: 8.0
 * Author: AnimeWP
 * License: GPL-2.0-or-later
 * Text Domain: animewp-blocks
 */

namespace Animewp\Blocks;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Register assets once; metadata supplies both PHP and browser definitions. */
function register_blocks(): void {
	$animewp_version = '1.1.0';
	wp_register_script(
		'animewp-blocks-editor',
		plugins_url( 'assets/editor.js', __FILE__ ),
		array( 'wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-i18n', 'wp-data' ),
		$animewp_version,
		true
	);
	wp_register_script(
		'animewp-blocks-video-view',
		plugins_url( 'assets/video.js', __FILE__ ),
		array(),
		$animewp_version,
		array( 'in_footer' => true, 'strategy' => 'defer' )
	);
	wp_register_style( 'animewp-blocks-style', plugins_url( 'assets/style.css', __FILE__ ), array(), $animewp_version );
	wp_register_style( 'animewp-blocks-editor-style', plugins_url( 'assets/editor.css', __FILE__ ), array( 'animewp-blocks-style' ), $animewp_version );

	$animewp_metadata = array();
	foreach ( array( 'panel', 'text-group', 'media', 'video' ) as $animewp_block ) {
		$animewp_directory = __DIR__ . '/blocks/' . $animewp_block;
		register_block_type( $animewp_directory );
		$animewp_definition = wp_json_file_decode( $animewp_directory . '/block.json', array( 'associative' => true ) );
		if ( is_array( $animewp_definition ) ) {
			$animewp_metadata[] = array_intersect_key(
				$animewp_definition,
				array_flip( array( 'apiVersion', 'name', 'title', 'category', 'icon', 'description', 'keywords', 'attributes', 'supports', 'textdomain' ) )
			);
		}
	}
	wp_add_inline_script(
		'animewp-blocks-editor',
		'window.animewpBlocksMetadata = ' . wp_json_encode( $animewp_metadata, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT ) . ';',
		'before'
	);
	wp_set_script_translations( 'animewp-blocks-editor', 'animewp-blocks' );
}
add_action( 'init', __NAMESPACE__ . '\\register_blocks' );

/** Reusable starting points appear in the inserter; no post content is generated. */
function register_patterns(): void {
	register_block_pattern_category( 'animewp-blocks', array( 'label' => __( 'AnimeWP ブロック', 'animewp-blocks' ) ) );
	foreach ( array( 'tilted-heading-upright-body', 'independent-text-groups' ) as $animewp_pattern ) {
		$animewp_definition = require __DIR__ . '/patterns/' . $animewp_pattern . '.php';
		register_block_pattern( 'animewp-blocks/' . $animewp_pattern, $animewp_definition );
	}
}
add_action( 'init', __NAMESPACE__ . '\\register_patterns' );

// No activation/deactivation hooks: posts, options, menus and rewrite rules are untouched.
