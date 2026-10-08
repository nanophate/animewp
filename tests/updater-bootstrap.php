<?php
/** Isolated loader regression: php tests/updater-bootstrap.php */
define( 'ABSPATH', '/updater-bootstrap-test/' );
$hooks = array();
function add_action( $name, $callback, $priority = 10, $accepted_args = 1 ) {
	$GLOBALS['hooks'][ $name ][] = $callback;
}
function add_filter( $name, $callback, $priority = 10, $accepted_args = 1 ) {
	add_action( $name, $callback, $priority, $accepted_args );
}
$source = dirname( __DIR__ ) . '/shared/distribution-updater.php';
$newer = tempnam( sys_get_temp_dir(), 'animewp-updater-newer-' );
file_put_contents( $newer, str_replace( array( 'Updater_1_0_0', "'1.0.0'" ), array( 'Updater_1_0_1', "'1.0.1'" ), file_get_contents( $source ) ) );
$results = array();
try {
	foreach ( array( 'older-first' => array( $source, $newer ), 'newer-first' => array( $newer, $source ), 'duplicate-copy' => array( $source, $source ) ) as $name => $files ) {
		$hooks = array();
		unset( $GLOBALS['animewp_distribution_implementations_v1'], $GLOBALS['animewp_distribution_bootstrap_v1'], $GLOBALS['animewp_distribution_active_v1'] );
		foreach ( $files as $file ) { require $file; }
		$results[] = array( 'test' => $name . ': registration waits for plugins and theme', 'pass' => ! empty( $hooks['after_setup_theme'] ) && empty( $hooks['update_plugins_github.com'] ) );
		foreach ( $hooks['after_setup_theme'] as $callback ) { $callback(); $callback(); }
		$expected = 'AnimeWP\\Distribution\\Updater_' . ( 'duplicate-copy' === $name ? '1_0_0' : '1_0_1' );
		$results[] = array( 'test' => $name . ': newest version registers each native hook exactly once', 'pass' =>
			$expected === $GLOBALS['animewp_distribution_active_v1'] && 1 === count( $hooks['update_plugins_github.com'] ) &&
			1 === count( $hooks['update_themes_github.com'] ) && 1 === count( $hooks['upgrader_pre_download'] ) &&
			$expected === $hooks['update_plugins_github.com'][0][0] );
	}
} finally {
	unlink( $newer );
}
$failed = false;
foreach ( $results as $row ) {
	echo json_encode( $row, JSON_UNESCAPED_SLASHES ), "\n";
	$failed = $failed || ! $row['pass'];
}
exit( $failed ? 1 : 0 );
