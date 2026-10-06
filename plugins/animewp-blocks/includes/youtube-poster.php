<?php
/**
 * Import a YouTube thumbnail into the Media Library on request from the editor.
 *
 * Visitors never contact YouTube for posters: the server downloads the image
 * once, stores it as an attachment, and the block saves its site-local URL.
 * Only i.ytimg.com is ever fetched, only for a validated video ID, and only
 * for users who can upload files.
 */

namespace Animewp\Blocks;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function register_poster_route(): void {
	register_rest_route(
		'animewp/v1',
		'/youtube-poster',
		array(
			'methods'             => 'POST',
			'permission_callback' => static fn() => current_user_can( 'upload_files' ),
			'args'                => array(
				'url' => array(
					'type'     => 'string',
					'required' => true,
				),
			),
			'callback'            => __NAMESPACE__ . '\\import_youtube_poster',
		)
	);
}
add_action( 'rest_api_init', __NAMESPACE__ . '\\register_poster_route' );

/** @return array|\WP_Error */
function import_youtube_poster( \WP_REST_Request $request ) {
	$video = video_provider( 'youtube', (string) $request->get_param( 'url' ) );
	if ( ! $video ) {
		return new \WP_Error( 'animewp_poster_url', __( 'Enter a YouTube video page URL first.', 'animewp-blocks' ), array( 'status' => 400 ) );
	}
	$existing = get_posts(
		array(
			'post_type'   => 'attachment',
			'post_status' => 'inherit',
			'numberposts' => 1,
			'meta_key'    => '_animewp_youtube_id', // phpcs:ignore WordPress.DB.SlowDBQuery -- one indexed lookup per explicit editor action.
			'meta_value'  => $video['id'], // phpcs:ignore WordPress.DB.SlowDBQuery
			'fields'      => 'ids',
		)
	);
	if ( $existing ) {
		return poster_response( (int) $existing[0] );
	}

	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/media.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';

	$file = null;
	foreach ( array( 'maxresdefault', 'hqdefault' ) as $size ) {
		$candidate = download_url( 'https://i.ytimg.com/vi/' . $video['id'] . '/' . $size . '.jpg', 15 );
		if ( ! is_wp_error( $candidate ) ) {
			$file = $candidate;
			break;
		}
	}
	if ( ! $file ) {
		return new \WP_Error( 'animewp_poster_download', __( 'The thumbnail could not be downloaded. Choose an image instead.', 'animewp-blocks' ), array( 'status' => 502 ) );
	}
	$attachment = media_handle_sideload(
		array(
			'name'     => 'youtube-' . $video['id'] . '.jpg',
			'tmp_name' => $file,
		),
		0,
		/* translators: %s: YouTube video ID. */
		sprintf( __( 'YouTube thumbnail %s', 'animewp-blocks' ), $video['id'] )
	);
	if ( is_wp_error( $attachment ) ) {
		wp_delete_file( $file );
		return new \WP_Error( 'animewp_poster_save', $attachment->get_error_message(), array( 'status' => 500 ) );
	}
	update_post_meta( $attachment, '_animewp_youtube_id', $video['id'] );
	return poster_response( (int) $attachment );
}

function poster_response( int $id ): array {
	return array(
		'id'  => $id,
		'url' => (string) wp_get_attachment_image_url( $id, 'full' ),
	);
}
