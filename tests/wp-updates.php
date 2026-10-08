<?php
/** Native updater integration. Run only on the disposable wp-env tests site. */
if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) { exit( 1 ); }
wp_set_current_user( 1 );
require_once ABSPATH . 'wp-admin/includes/plugin.php';
require_once ABSPATH . 'wp-admin/includes/plugin-install.php';
require_once ABSPATH . 'wp-admin/includes/theme.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';

$updater = $GLOBALS['animewp_distribution_active_v1'] ?? null;
if ( ! $updater ) { WP_CLI::error( 'Activate AnimeWP or AnimeWP Blocks before running this suite.' ); }
$results = array();
function animewp_update_check( $name, $pass ) {
	global $results;
	$results[] = array( 'test' => $name, 'pass' => (bool) $pass );
}
function animewp_update_feed( $type, $hash ) {
	$slug = 'theme' === $type ? 'animewp' : 'animewp-blocks';
	return array(
		'schema_version' => 1, 'status' => 'published', 'type' => $type, 'slug' => $slug,
		'name' => 'theme' === $type ? 'AnimeWP' : 'AnimeWP Blocks', 'version' => '99.0.0',
		'requires' => '6.6', 'requires_php' => '8.0', 'tested' => '7.1',
		'homepage' => 'https://github.com/nanophate/animewp',
		'download_url' => 'https://github.com/nanophate/animewp/releases/download/v99.0.0/' . $slug . '-99.0.0.zip',
		'sha256' => $hash, 'last_updated' => '2026-10-08T01:23:45Z',
		'sections' => array( 'description' => '<p>Test fixture.</p>', 'changelog' => '<p>Test update.</p>' ),
	);
}
// Tiny, deterministic ZIP with only a version.txt file; never installed as a real component.
$zip = base64_decode( 'UEsDBBQAAAAAAAAAIVxZtHgABwAAAAcAAAAjAAAAYW5pbWV3cC11cGRhdGVyLWZpeHR1cmUvdmVyc2lvbi50eHQ5OS4wLjAKUEsBAhQDFAAAAAAAAAAhXFm0eAAHAAAABwAAACMAAAAAAAAAAAAAAIABAAAAAGFuaW1ld3AtdXBkYXRlci1maXh0dXJlL3ZlcnNpb24udHh0UEsFBgAAAAABAAEAUQAAAEgAAAAAAA==', true );
$feeds = array( 'theme' => animewp_update_feed( 'theme', hash( 'sha256', $zip ) ), 'plugin' => animewp_update_feed( 'plugin', hash( 'sha256', $zip ) ) );
$counts = array( 'theme' => 0, 'plugin' => 0, 'package' => 0 );
$mode = 'valid';
$download_mode = 'valid';
$download_body = $zip;
$redirect = 'https://release-assets.githubusercontent.com/github-production-release-asset/test?sig=fixture';
$temps = array();
$working = array();
$saved_transients = array();
$saved_options = array();
foreach ( array( 'update_plugins', 'update_themes', $updater::CACHE . 'theme', $updater::CACHE . 'plugin' ) as $key ) {
	$saved_transients[ $key ] = get_site_transient( $key );
}
foreach ( array( $updater::GOOD . 'theme', $updater::GOOD . 'plugin', 'auto_update_plugins', 'auto_update_themes' ) as $key ) {
	$saved_options[ $key ] = get_site_option( $key, null );
}
$http = static function ( $pre, $args, $url ) use ( &$feeds, &$counts, &$mode, &$download_mode, &$download_body, &$redirect, &$temps, $updater ) {
	$response = static function ( $body, $code = 200, $headers = array() ) {
		return array( 'headers' => $headers, 'body' => $body, 'response' => array( 'code' => $code, 'message' => 'QA fixture' ), 'cookies' => array(), 'filename' => null );
	};
	foreach ( array( 'theme', 'plugin' ) as $type ) {
		if ( $updater::FEED . $type . '.json' === $url ) {
			$counts[ $type ]++;
			if ( 'timeout' === $mode ) { return new WP_Error( 'qa_timeout', 'Injected timeout' ); }
			if ( 'malformed' === $mode ) { return $response( '{' ); }
			return $response( wp_json_encode( $feeds[ $type ] ) );
		}
	}
	if ( in_array( $url, array( $feeds['plugin']['download_url'], $feeds['theme']['download_url'], $redirect ), true ) ) {
		$counts['package']++;
		if ( empty( $args['stream'] ) || empty( $args['filename'] ) || 0 !== $args['redirection'] ) {
			return new WP_Error( 'qa_stream', 'Expected explicit streamed download without automatic redirects' );
		}
		$temps[] = $args['filename'];
		if ( 'timeout' === $download_mode ) { return new WP_Error( 'qa_timeout', 'Injected timeout' ); }
		if ( 'redirect' === $download_mode && $url !== $redirect ) { return $response( '', 302, array( 'location' => $redirect ) ); }
		file_put_contents( $args['filename'], $download_body );
		return $response( '', '404' === $download_mode ? 404 : 200 );
	}
	// Core must receive a successful response before it invokes custom Update URI filters.
	if ( preg_match( '#\Ahttps?://api\.wordpress\.org/(plugins|themes)/update-check/#', $url ) ) {
		return $response( wp_json_encode( array( 'plugins' => (object) array(), 'themes' => (object) array(), 'no_update' => (object) array(), 'translations' => array() ) ) );
	}
	return new WP_Error( 'qa_external_http', 'Unexpected HTTP request: ' . $url );
};
add_filter( 'pre_http_request', $http, 999, 3 );
try {
	foreach ( array( 'theme', 'plugin' ) as $type ) {
		delete_site_transient( $updater::CACHE . $type );
		delete_site_option( $updater::GOOD . $type );
		animewp_update_check( $type . ' published schema accepted', null !== $updater::validate( $feeds[ $type ], $type ) );
		$headers = 'plugin' === $type ? get_plugin_data( WP_PLUGIN_DIR . '/' . $updater::PLUGIN, false, false ) : wp_get_theme( 'animewp' )->get( 'UpdateURI' );
		animewp_update_check( $type . ' has its own Update URI header', $updater::uri( $type ) === ( is_array( $headers ) ? $headers['UpdateURI'] : $headers ) );
	}
	$invalid = array(
		'http package' => array( 'download_url', str_replace( 'https:', 'http:', $feeds['plugin']['download_url'] ) ),
		'foreign host' => array( 'download_url', str_replace( 'github.com', 'example.invalid', $feeds['plugin']['download_url'] ) ),
		'userinfo' => array( 'download_url', str_replace( 'github.com', 'user@github.com', $feeds['plugin']['download_url'] ) ),
		'explicit port' => array( 'download_url', str_replace( 'github.com', 'github.com:443', $feeds['plugin']['download_url'] ) ),
		'query' => array( 'download_url', $feeds['plugin']['download_url'] . '?download=1' ),
		'fragment' => array( 'download_url', $feeds['plugin']['download_url'] . '#x' ),
		'foreign owner' => array( 'download_url', str_replace( '/nanophate/', '/other/', $feeds['plugin']['download_url'] ) ),
		'mismatched asset' => array( 'download_url', str_replace( 'blocks-99', 'blocks-98', $feeds['plugin']['download_url'] ) ),
		'prerelease' => array( 'version', '99.0.0-beta' ), 'leading zero' => array( 'version', '099.0.0' ),
		'uppercase checksum' => array( 'sha256', str_repeat( 'A', 64 ) ), 'wrong schema' => array( 'schema_version', '1' ),
		'wrong type' => array( 'type', 'theme' ), 'wrong slug' => array( 'slug', 'other' ),
		'bad date' => array( 'last_updated', '2026-02-31T01:23:45Z' ), 'invalid requirement' => array( 'requires_php', '<8.0' ),
		'null byte date' => array( 'last_updated', "2026-10-08T01:23:45Z\0" ),
	);
	foreach ( $invalid as $label => $change ) {
		$bad = $feeds['plugin']; $bad[ $change[0] ] = $change[1];
		animewp_update_check( 'Reject ' . $label, null === $updater::validate( $bad, 'plugin' ) );
	}
	$unsafe = $feeds['plugin']; $unsafe['sections']['description'] = '<script>alert(1)</script><p onclick="x()">Safe</p>';
	$safe = $updater::validate( $unsafe, 'plugin' );
	animewp_update_check( 'Metadata HTML is sanitized', false === strpos( $safe['sections']['description'], '<script' ) && false === strpos( $safe['sections']['description'], 'onclick' ) );
	$updater::metadata( 'plugin' ); $updater::metadata( 'plugin' );
	animewp_update_check( 'Fresh feed is requested once', 1 === $counts['plugin'] );
	$good = get_site_option( $updater::GOOD . 'plugin' );
	delete_site_transient( 'update_plugins' );
	animewp_update_check( 'Native Check again clears fresh cache and preserves last good', false === get_site_transient( $updater::CACHE . 'plugin' ) && $good === get_site_option( $updater::GOOD . 'plugin' ) );
	$mode = 'timeout';
	animewp_update_check( 'Feed outage uses last known good', '99.0.0' === ( $updater::metadata( 'plugin' )['version'] ?? '' ) );
	$before = $counts['plugin']; $updater::metadata( 'plugin' );
	animewp_update_check( 'Repeated outage does not repeat HTTP', $before === $counts['plugin'] );
	$good['time'] = time() - 8 * DAY_IN_SECONDS; update_site_option( $updater::GOOD . 'plugin', $good );
	animewp_update_check( 'Expired last good is not offered', null === $updater::metadata( 'plugin' ) );
	$mode = 'valid'; delete_site_transient( $updater::CACHE . 'plugin' ); $updater::metadata( 'plugin' );
	$published = $feeds['plugin'];
	$feeds['plugin'] = array_intersect_key( $published, array_flip( array( 'schema_version', 'status', 'type', 'slug' ) ) ); $feeds['plugin']['status'] = 'unpublished';
	delete_site_transient( $updater::CACHE . 'plugin' );
	animewp_update_check( 'Unpublished feed clears last good and offers no update', null === $updater::metadata( 'plugin' ) && false === get_site_option( $updater::GOOD . 'plugin' ) );
	$feeds['plugin'] = $published; $mode = 'malformed'; delete_site_transient( $updater::CACHE . 'plugin' );
	animewp_update_check( 'Malformed feed without last good fails quietly', null === $updater::metadata( 'plugin' ) );
	$mode = 'valid';
	delete_site_transient( 'update_plugins' ); delete_site_transient( 'update_themes' );
	wp_update_plugins(); wp_update_themes();
	$plugin_update = get_site_transient( 'update_plugins' )->response[ $updater::PLUGIN ] ?? null;
	$theme_update = get_site_transient( 'update_themes' )->response['animewp'] ?? null;
	animewp_update_check( 'Native plugin check offers the release', $plugin_update && '99.0.0' === $plugin_update->new_version && $feeds['plugin']['download_url'] === $plugin_update->package );
	animewp_update_check( 'Native theme check offers the release', $theme_update && '99.0.0' === $theme_update['new_version'] && $feeds['theme']['download_url'] === $theme_update['package'] );
	$info = plugins_api( 'plugin_information', (object) array( 'slug' => 'animewp-blocks' ) );
	animewp_update_check( 'Native plugin info uses the same release', ! is_wp_error( $info ) && '99.0.0' === $info->version && $feeds['plugin']['download_url'] === $info->download_link );
	$info = themes_api( 'theme_information', (object) array( 'slug' => 'animewp' ) );
	animewp_update_check( 'Native theme info uses the same release', ! is_wp_error( $info ) && '99.0.0' === $info->version );
	require_once ABSPATH . 'wp-admin/includes/template.php';
	require_once ABSPATH . 'wp-admin/includes/class-wp-screen.php';
	require_once ABSPATH . 'wp-admin/includes/screen.php';
	global $themes_allowedtags;
	require_once ABSPATH . 'wp-admin/includes/theme-install.php';
	require_once ABSPATH . 'wp-admin/includes/class-wp-list-table.php';
	require_once ABSPATH . 'wp-admin/includes/class-wp-themes-list-table.php';
	require_once ABSPATH . 'wp-admin/includes/class-wp-theme-install-list-table.php';
	$ui_errors = array();
	set_error_handler( static function ( $severity, $message ) use ( &$ui_errors ) { $ui_errors[] = $message; return true; } );
	ob_start();
	try { $list = new WP_Theme_Install_List_Table( array( 'screen' => 'theme-install' ) ); $list->theme_installer_single( $info ); }
	finally { $html = ob_get_clean(); restore_error_handler(); }
	animewp_update_check( 'Native theme info modal renders without PHP diagnostics', ! $ui_errors && false !== strpos( $html, 'Test fixture.' ) && false !== strpos( $html, 'wp_theme_preview=animewp' ) );
	if ( $ui_errors ) { $results[ count( $results ) - 1 ]['diagnostics'] = $ui_errors; }
	$other = (object) array( 'keep' => true );
	animewp_update_check( 'Other publishers are untouched', $other === $updater::plugin_update( $other, array( 'UpdateURI' => 'https://github.com/other/repo' ), 'other/other.php', array() ) && $other === $updater::theme_info( $other, 'theme_information', (object) array( 'slug' => 'other' ) ) );
	$published_feeds = $feeds;
	foreach ( array( 'theme', 'plugin' ) as $type ) {
		$installed = 'theme' === $type ? wp_get_theme( 'animewp' )->get( 'Version' ) : get_plugin_data( WP_PLUGIN_DIR . '/' . $updater::PLUGIN, false, false )['Version'];
		$feeds[ $type ]['version'] = $installed;
		$feeds[ $type ]['download_url'] = str_replace( '99.0.0', $installed, $feeds[ $type ]['download_url'] );
	}
	delete_site_transient( 'update_plugins' ); delete_site_transient( 'update_themes' ); wp_update_plugins(); wp_update_themes();
	$plugin_current = get_site_transient( 'update_plugins' ); $theme_current = get_site_transient( 'update_themes' );
	animewp_update_check( 'Installed plugin version goes to native no_update', ! isset( $plugin_current->response[ $updater::PLUGIN ] ) && isset( $plugin_current->no_update[ $updater::PLUGIN ] ) );
	animewp_update_check( 'Installed theme version goes to native no_update', ! isset( $theme_current->response['animewp'] ) && isset( $theme_current->no_update['animewp'] ) );
	$feeds = $published_feeds;
	delete_site_transient( 'update_plugins' ); delete_site_transient( 'update_themes' );
	foreach ( array( 'auto_update_plugins', 'auto_update_themes' ) as $key ) {
		animewp_update_check( $key . ' preference stays unchanged', $saved_options[ $key ] === get_site_option( $key, null ) );
	}
	$before_hooks = $GLOBALS['wp_filter']['update_plugins_github.com']->callbacks;
	require get_theme_root() . '/animewp/inc/distribution-updater.php';
	require WP_PLUGIN_DIR . '/animewp-blocks/includes/distribution-updater.php';
	animewp_update_check( 'Both embedded copies can reload without duplicate hooks', $before_hooks === $GLOBALS['wp_filter']['update_plugins_github.com']->callbacks );
	WP_Filesystem();
	$native = new WP_Upgrader( new Automatic_Upgrader_Skin() ); $native->init();
	$extra = array( 'plugin' => $updater::PLUGIN, 'type' => 'plugin', 'action' => 'update' );
	$package = $feeds['plugin']['download_url'];
	$file = $native->download_package( $package, false, $extra );
	animewp_update_check( 'Native upgrader downloads a checksum-verified ZIP', is_string( $file ) && is_file( $file ) && hash( 'sha256', $zip ) === hash_file( 'sha256', $file ) );
	if ( is_string( $file ) ) {
		$unpacked = $native->unpack_package( $file );
		if ( is_string( $unpacked ) ) { $working[] = $unpacked; }
		animewp_update_check( 'Native upgrader extracts verified bytes and removes ZIP', is_string( $unpacked ) && '99.0.0' === trim( file_get_contents( $unpacked . '/animewp-updater-fixture/version.txt' ) ) && ! file_exists( $file ) );
	}
	$manual = wp_tempnam( 'animewp-manual.zip' ); file_put_contents( $manual, $zip ); $temps[] = $manual;
	$before = $counts['package'];
	animewp_update_check( 'Manual local ZIP install and overwrite remain available', $manual === $native->download_package( $manual, false, array( 'type' => 'plugin', 'action' => 'install' ) ) && $manual === $native->download_package( $manual, false, array( 'type' => 'theme', 'action' => 'install' ) ) && $before === $counts['package'] );
	$download_body = 'corrupt ZIP';
	$error = $native->download_package( $package, false, $extra );
	animewp_update_check( 'Checksum mismatch rejects update and removes temp', is_wp_error( $error ) && 'animewp_update_checksum' === $error->get_error_code() && ! file_exists( end( $temps ) ) );
	$download_body = $zip;
	foreach ( array( 'timeout', '404' ) as $download_mode ) {
		$error = $native->download_package( $package, false, $extra );
		animewp_update_check( 'Package ' . $download_mode . ' rejects and removes temp', is_wp_error( $error ) && ! file_exists( end( $temps ) ) );
	}
	$download_mode = 'redirect';
	$file = $native->download_package( $package, false, $extra );
	animewp_update_check( 'Signed HTTPS GitHub release CDN redirect works', is_string( $file ) && is_file( $file ) );
	foreach ( array( 'https://example.invalid/package.zip', 'http://release-assets.githubusercontent.com/package.zip', 'https://user@release-assets.githubusercontent.com/package.zip', 'https://release-assets.githubusercontent.com:443/package.zip' ) as $redirect ) {
		$before = $counts['package']; $error = $native->download_package( $package, false, $extra );
		animewp_update_check( 'Reject redirect ' . $redirect, is_wp_error( $error ) && 1 === $counts['package'] - $before && ! file_exists( end( $temps ) ) );
	}
	$download_mode = 'valid';
	$bad_target = $native->download_package( $package, false, array( 'plugin' => 'other/other.php', 'type' => 'plugin' ) );
	animewp_update_check( 'Own release cannot replace another component', is_wp_error( $bad_target ) && 'animewp_update_target' === $bad_target->get_error_code() );
	$prior = $updater::download( $manual, $package, $native, $extra );
	animewp_update_check( 'Earlier downloader still requires the matching checksum', $manual === $prior );
	file_put_contents( $manual, 'corrupt' );
	$prior = $updater::download( $manual, $package, $native, $extra );
	animewp_update_check( 'Earlier downloader cannot bypass checksum or lose its file', is_wp_error( $prior ) && file_exists( $manual ) );
	foreach ( array( 'requires', 'requires_php' ) as $requirement ) {
		$feeds['plugin'][ $requirement ] = '999.0'; delete_site_transient( 'update_plugins' ); wp_update_plugins();
		$offer = get_site_transient( 'update_plugins' )->response[ $updater::PLUGIN ] ?? null;
		$before = $counts['package']; $error = $native->download_package( $package, false, $extra );
		animewp_update_check( $requirement . ' reaches UI and blocks installation', $offer && '999.0' === $offer->$requirement && '' === $offer->package && is_wp_error( $error ) && 'animewp_update_requirements' === $error->get_error_code() && $before === $counts['package'] );
		$feeds['plugin'] = $published;
	}
} finally {
	remove_filter( 'pre_http_request', $http, 999 );
	foreach ( array_unique( $temps ) as $temp ) { if ( is_file( $temp ) ) { wp_delete_file( $temp ); } }
	global $wp_filesystem;
	foreach ( $working as $dir ) { $wp_filesystem->delete( $dir, true ); }
	// Native transient deletions invalidate short caches; restore native values first.
	foreach ( $saved_transients as $key => $value ) { delete_site_transient( $key ); if ( false !== $value ) { set_site_transient( $key, $value, HOUR_IN_SECONDS ); } }
	foreach ( $saved_options as $key => $value ) { if ( null === $value ) { delete_site_option( $key ); } else { update_site_option( $key, $value ); } }
}
WP_CLI::line( wp_json_encode( array( 'wordpress' => get_bloginfo( 'version' ), 'php' => PHP_VERSION, 'results' => $results ), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE ) );
foreach ( $results as $result ) { if ( ! $result['pass'] ) { WP_CLI::halt( 1 ); } }
