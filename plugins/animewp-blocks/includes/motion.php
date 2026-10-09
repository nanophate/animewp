<?php
/**
 * Motion for every block.
 *
 * The `animewpMotion` attribute lives in the block comment only. Here it is
 * registered on every block type (so REST and server rendering accept it) and
 * turned into classes and custom properties on the block's first tag at render
 * time. Saved HTML never changes; without this plugin the attribute is simply
 * ignored and the content shows without motion.
 */

namespace Animewp\Blocks;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const MOTION_ATTRIBUTE = 'animewpMotion';
const MOTION_SKIP      = array( 'core/missing', 'core/freeform', 'core/block', 'core/template-part', 'core/post-content', 'animewp/backdrop' );

function motion_register_attribute( array $args, string $name ): array {
	if ( in_array( $name, MOTION_SKIP, true ) ) {
		return $args;
	}
	$args['attributes'] = $args['attributes'] ?? array();
	if ( ! isset( $args['attributes'][ MOTION_ATTRIBUTE ] ) ) {
		$args['attributes'][ MOTION_ATTRIBUTE ] = array( 'type' => 'object' );
	}
	return $args;
}
add_filter( 'register_block_type_args', __NAMESPACE__ . '\\motion_register_attribute', 10, 2 );

/** Same rules as src/motion/shared.js. */
function motion_normalize( $value ): array {
	$m      = is_array( $value ) ? $value : array();
	$choice = static function ( string $key, array $allowed ) use ( $m ) {
		return isset( $m[ $key ] ) && in_array( $m[ $key ], $allowed, true ) ? $m[ $key ] : 'none';
	};
	$number = static function ( string $key, int $min, int $max ) use ( $m ) {
		return isset( $m[ $key ] ) && is_numeric( $m[ $key ] ) ? max( $min, min( $max, (int) round( (float) $m[ $key ] ) ) ) : 0;
	};
	$setting = static function ( string $key, int $min, int $max, int $fallback ) use ( $m ) {
		$value = $m[ $key ] ?? null;
		return ( is_int( $value ) || is_float( $value ) ) && is_finite( (float) $value )
			? (int) round( max( $min, min( $max, $value ) ) ) : $fallback;
	};
	return array(
		'entrance' => $choice( 'entrance', array( 'fade', 'rise', 'slide-start', 'slide-end', 'zoom', 'blur', 'mask', 'letters' ) ),
		'target'   => isset( $m['target'] ) && 'children' === $m['target'] ? 'children' : 'self',
		'delay'    => $number( 'delay', 0, 3000 ),
		'duration' => $number( 'duration', 0, 4000 ),
		'stagger'  => $number( 'stagger', 0, 1000 ),
		'hover'    => $choice( 'hover', array( 'lift', 'zoom', 'glow' ) ),
		'loop'     => $choice( 'loop', array( 'float', 'sway', 'pulse' ) ),
		'parallax' => $number( 'parallax', -50, 50 ),
		'scrolled' => $choice( 'scrolled', array( 'hide', 'show', 'shrink', 'navigation' ) ),
		'scrollTrigger' => isset( $m['scrollTrigger'] ) && 'hero' === $m['scrollTrigger'] ? 'hero' : 'distance',
		'scrollDistance' => $setting( 'scrollDistance', 0, 10000, 64 ),
		'headerAppearance' => isset( $m['headerAppearance'] ) && true === $m['headerAppearance'],
		'headerOpacity' => $setting( 'headerOpacity', 0, 100, 82 ),
		'headerBlur' => $setting( 'headerBlur', 0, 24, 12 ),
		'headerHeight' => $setting( 'headerHeight', 48, 120, 60 ),
	);
}

/** Core solid background for the translucent header surface; same guards as JS. */
function motion_header_background( array $attrs ): string {
	$fallback = 'var(--wp--preset--color--base, #fff)';
	$preset   = $attrs['backgroundColor'] ?? null;
	if ( is_string( $preset ) && preg_match( '/^[a-z0-9-]+$/i', $preset ) ) {
		return 'var(--wp--preset--color--' . $preset . ', ' . $fallback . ')';
	}
	$value = $attrs['style']['color']['background'] ?? null;
	if ( ! is_string( $value ) ) {
		return $fallback;
	}
	$color = trim( $value );
	return preg_match( '/^(?:#[0-9a-f]{3,4}|#[0-9a-f]{6}|#[0-9a-f]{8}|[a-z]{1,30}|(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\([0-9.,%+\-\s\/]+\))$/i', $color )
		? $color : $fallback;
}

/** @return array{classes: string[], style: string, attributes: array<string, string>} */
function motion_markup( array $m, array $attrs = array() ): array {
	$classes = array( 'animewp-motion' );
	$style   = '';
	$attributes = array();
	if ( 'none' !== $m['entrance'] ) {
		$classes[] = 'has-entrance';
		$classes[] = 'has-entrance-' . $m['entrance'];
	}
	if ( 'children' === $m['target'] ) {
		$classes[] = 'is-target-children';
	}
	if ( 'none' !== $m['hover'] ) {
		$classes[] = 'has-hover-' . $m['hover'];
	}
	if ( 'none' !== $m['loop'] ) {
		$classes[] = 'has-loop-' . $m['loop'];
	}
	if ( 0 !== $m['parallax'] ) {
		$classes[] = 'has-parallax';
		$style    .= '--animewp-parallax:' . ( $m['parallax'] / 100 ) . ';';
	}
	if ( 'none' !== $m['scrolled'] ) {
		$classes[] = 'is-scrolled-' . $m['scrolled'];
		$attributes['data-animewp-scroll-trigger'] = $m['scrollTrigger'];
		$attributes['data-animewp-scroll-distance'] = (string) $m['scrollDistance'];
	}
	if ( $m['headerAppearance'] ) {
		$style .= '--animewp-header-opacity:' . $m['headerOpacity'] . '%;';
		$style .= '--animewp-header-blur:' . $m['headerBlur'] . 'px;';
		$style .= '--animewp-header-height:' . $m['headerHeight'] . 'px;';
		$style .= '--animewp-header-background:' . motion_header_background( $attrs ) . ';';
	}
	foreach ( array( 'delay', 'duration', 'stagger' ) as $key ) {
		if ( $m[ $key ] ) {
			$style .= '--animewp-' . $key . ':' . $m[ $key ] . 'ms;';
		}
	}
	return array( 'classes' => $classes, 'style' => $style, 'attributes' => $attributes );
}

function motion_render( string $content, array $block ): string {
	$value = $block['attrs'][ MOTION_ATTRIBUTE ] ?? null;
	if ( ! $value || '' === trim( $content ) ) {
		return $content;
	}
	$markup = motion_markup( motion_normalize( $value ), $block['attrs'] ?? array() );
	if ( count( $markup['classes'] ) === 1 && '' === $markup['style'] ) {
		return $content;
	}
	$html = new \WP_HTML_Tag_Processor( $content );
	if ( ! $html->next_tag() ) {
		return $content;
	}
	foreach ( $markup['classes'] as $class ) {
		$html->add_class( $class );
	}
	foreach ( $markup['attributes'] as $name => $attribute ) {
		$html->set_attribute( $name, $attribute );
	}
	if ( $markup['style'] ) {
		$existing = (string) $html->get_attribute( 'style' );
		$html->set_attribute( 'style', rtrim( $existing, '; ' ) . ( $existing ? ';' : '' ) . $markup['style'] );
	}
	wp_enqueue_style( 'animewp-motion' );
	wp_enqueue_script_module( 'animewp-motion' );
	return $html->get_updated_html();
}
add_filter( 'render_block', __NAMESPACE__ . '\\motion_render', 10, 2 );

function motion_register_assets(): void {
	$dir   = __DIR__ . '/../build/motion/';
	$asset = static function ( string $name ) use ( $dir ): array {
		$file = $dir . $name . '.asset.php';
		return is_readable( $file ) ? require $file : array( 'dependencies' => array(), 'version' => false );
	};
	$style = $asset( 'style' );
	wp_register_style( 'animewp-motion', plugins_url( 'build/motion/style-style.css', dirname( __DIR__ ) . '/animewp-blocks.php' ), array(), $style['version'] );
	$view = $asset( 'view' );
	wp_register_script_module( 'animewp-motion', plugins_url( 'build/motion/view.js', dirname( __DIR__ ) . '/animewp-blocks.php' ), array(), $view['version'] );
}
add_action( 'init', __NAMESPACE__ . '\\motion_register_assets' );

function motion_editor_assets(): void {
	$file = __DIR__ . '/../build/motion/editor.asset.php';
	if ( ! is_readable( $file ) ) {
		return;
	}
	$asset = require $file;
	wp_enqueue_script( 'animewp-motion-editor', plugins_url( 'build/motion/editor.js', dirname( __DIR__ ) . '/animewp-blocks.php' ), $asset['dependencies'], $asset['version'], true );
	wp_set_script_translations( 'animewp-motion-editor', 'animewp-blocks', dirname( __DIR__ ) . '/languages' );
}
add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\\motion_editor_assets' );

/** Editor canvas (iframe): hover, loop and preview styles. */
function motion_canvas_styles(): void {
	if ( is_admin() ) {
		wp_enqueue_style( 'animewp-motion' );
	}
}
add_action( 'enqueue_block_assets', __NAMESPACE__ . '\\motion_canvas_styles' );
