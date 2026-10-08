<?php
/** HTTP replacement for isolated browser QA only. Never ship in either package. */
if ( ! defined( 'ABSPATH' ) || ! defined( 'ANIMEWP_BROWSER_QA' ) || true !== ANIMEWP_BROWSER_QA ) { return; }
add_filter( 'pre_http_request', static function ( $pre, $args, $url ) {
	$mode = get_option( 'animewp_browser_feed_mode', 'off' );
	$feeds = json_decode( file_get_contents( WP_CONTENT_DIR . '/animewp-qa/feeds.json' ), true );
	foreach ( array( 'theme' => 'wp-theme.json', 'plugin' => 'wp-plugin.json' ) as $kind => $name ) {
		if ( $url === 'https://raw.githubusercontent.com/nanophate/animewp/main/' . $name ) {
			$feed = $feeds[ $kind ];
			// Keep every browser test isolated from the live release feed, including teardown.
			if ( ! in_array( $mode, array( 'valid', 'bad-hash' ), true ) ) { $feed = array( 'schema_version' => 1, 'status' => 'unpublished', 'type' => $kind, 'slug' => $feeds[ $kind ]['slug'] ); }
			if ( 'bad-hash' === $mode ) { $feed['sha256'] = str_repeat( '0', 64 ); }
			return array( 'headers' => array( 'content-type' => 'application/json' ), 'body' => wp_json_encode( $feed ), 'response' => array( 'code' => 200, 'message' => 'OK' ), 'cookies' => array() );
		}
		if ( $url === $feeds[ $kind ]['download_url'] ) {
			$file = WP_CONTENT_DIR . '/animewp-qa/future-' . $kind . '.zip';
			if ( ! empty( $args['stream'] ) && ! empty( $args['filename'] ) ) {
				if ( ! copy( $file, $args['filename'] ) ) { return new WP_Error( 'qa_stream_failed', 'Unable to write the test ZIP.' ); }
				$body = '';
			} else { $body = file_get_contents( $file ); }
			return array( 'headers' => array( 'content-type' => 'application/zip', 'content-length' => filesize( $file ) ), 'body' => $body, 'filename' => $args['filename'] ?? '', 'response' => array( 'code' => 200, 'message' => 'OK' ), 'cookies' => array() );
		}
	}
	return $pre;
}, 10, 3 );
