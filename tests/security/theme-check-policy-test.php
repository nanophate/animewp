<?php
/** Exercise the adaptation against the actual installed Theme Check implementation. */
if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) { exit( 1 ); }
if ( ! class_exists( 'Style_CSS_Header_Check' ) ) { WP_CLI::error( 'Theme Check must be active.' ); }
require __DIR__ . '/theme-check-policy.php';
$theme = wp_get_theme( 'animewp' );
$path = $theme->get_stylesheet_directory() . '/style.css';
$original = file_get_contents( $path );
$line = 'Update URI: https://github.com/nanophate/animewp/tree/main/themes/animewp';
$results = array();
$run = static function ( $css, $slug = 'animewp' ) use ( $path, $theme ) {
	$check = animewp_theme_check_header_adapter( new Style_CSS_Header_Check(), $path );
	$check->set_context( array( 'theme' => $theme, 'slug' => $slug ) );
	return array( $check->check( array(), $css, array() ), $check->getError() );
};
$raw = new Style_CSS_Header_Check();
$results[] = array( 'test' => 'Upstream check rejects the directory-external Update URI', 'pass' => false === $raw->check( array(), array( $path => $original ), array() ) );
$cases = array(
	'Exact header is the only accepted exception' => array( array( $path => $original ), 'animewp', true ),
	'Missing License remains a failure' => array( array( $path => preg_replace( '/^License:.*$/m', '', $original ) ), 'animewp', false ),
	'Unknown Update URI remains a failure' => array( array( $path => str_replace( $line, 'Update URI: https://example.invalid/theme', $original ) ), 'animewp', false ),
	'Missing Update URI is a failure' => array( array( $path => str_replace( $line, '', $original ) ), 'animewp', false ),
	'Duplicate Update URI is a failure' => array( array( $path => $original . "\n" . $line ), 'animewp', false ),
	'Other stylesheets retain their Update URI finding' => array( array( $path => $original, '/other.css' => $line ), 'animewp', false ),
	'Other theme context does not receive the exception' => array( array( $path => $original ), 'another-theme', false ),
	'Missing expected stylesheet is a failure' => array( array( '/other.css' => $original ), 'animewp', false ),
);
foreach ( $cases as $name => $case ) {
	list( $pass, $errors ) = $run( $case[0], $case[1] );
	$results[] = array( 'test' => $name, 'pass' => $case[2] === (bool) $pass && ( $case[2] ? ! $errors : ! empty( $errors ) ) );
}
$results[] = array( 'test' => 'Distribution stylesheet stays byte-for-byte unchanged', 'pass' => $original === file_get_contents( $path ) );
WP_CLI::line( wp_json_encode( array( 'results' => $results ), JSON_PRETTY_PRINT ) );
foreach ( $results as $result ) { if ( ! $result['pass'] ) { WP_CLI::halt( 1 ); } }
