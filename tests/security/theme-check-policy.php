<?php
/** Test-only adaptation for a theme distributed outside WordPress.org. */
if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) { exit( 1 ); }

/** Preserve the upstream check; adapt only its in-memory input for our exact header. */
function animewp_theme_check_header_adapter( $check, $stylesheet ) {
	return new class( $check, $stylesheet ) implements themecheck {
		private $check;
		private $stylesheet;
		private $context = array();
		private $errors = array();
		public function __construct( $check, $stylesheet ) { $this->check = $check; $this->stylesheet = $stylesheet; }
		public function set_context( $context ) {
			$this->context = $context;
			if ( is_callable( array( $this->check, 'set_context' ) ) ) { $this->check->set_context( $context ); }
		}
		public function check( $php, $css, $other ) {
			if ( 'animewp' !== ( $this->context['slug'] ?? '' ) ||
				! ( ( $this->context['theme'] ?? null ) instanceof WP_Theme ) ||
				$this->context['theme']->get_stylesheet_directory() . '/style.css' !== $this->stylesheet ) {
				return $this->check->check( $php, $css, $other );
			}
			$line = 'Update URI: https://github.com/nanophate/animewp/tree/main/themes/animewp';
			$cleaned = preg_replace( '/^' . preg_quote( $line, '/' ) . '\r?$/m', '', $css[ $this->stylesheet ] ?? '', -1, $count );
			if ( 1 !== $count ) {
				$this->errors[] = '<span class="tc-lead tc-required">REQUIRED</span> AnimeWP must declare exactly one expected distribution Update URI header.';
				return false;
			}
			$css[ $this->stylesheet ] = $cleaned;
			return $this->check->check( $php, $css, $other );
		}
		public function getError() { return array_merge( $this->errors, (array) $this->check->getError() ); }
	};
}

// --require runs before WordPress loads. The official WP-CLI hook runs after
// Theme Check has populated its documented themecheck_checks_loaded registry.
WP_CLI::add_hook( 'after_wp_load', static function () {
	global $themechecks;
	if ( ! is_array( $themechecks ) || ! interface_exists( 'themecheck' ) ) {
		WP_CLI::error( 'Theme Check did not load its checks.' );
	}
	$matches = 0;
	foreach ( $themechecks as $key => $check ) {
		if ( is_object( $check ) && 'Style_CSS_Header_Check' === get_class( $check ) ) {
			$themechecks[ $key ] = animewp_theme_check_header_adapter( $check, wp_get_theme( 'animewp' )->get_stylesheet_directory() . '/style.css' );
			$matches++;
		}
	}
	if ( 1 !== $matches ) { WP_CLI::error( 'Theme Check header check changed; review the external-distribution adaptation.' ); }
} );
