<?php
/** Real ZIP upgrade preservation, only in the disposable tests site. */
if ( ! defined( 'WP_CLI' ) || ! WP_CLI || ! defined( 'ANIMEWP_BROWSER_QA' ) || ! ANIMEWP_BROWSER_QA ) { exit( 1 ); }
wp_set_current_user( 1 );
require_once ABSPATH . 'wp-admin/includes/plugin.php';
$file = WP_CONTENT_DIR . '/animewp-qa/upgrade-snapshot.json';
$action = getenv( 'ANIMEWP_QA_ACTION' );
if ( 'seed' === $action ) {
	if ( '1.3.0' !== wp_get_theme( 'animewp' )->get( 'Version' ) ) { WP_CLI::error( 'The baseline theme ZIP must be 1.3.0.' ); }
	$plugin = get_plugin_data( WP_PLUGIN_DIR . '/animewp-blocks/animewp-blocks.php' );
	if ( '1.3.0' !== $plugin['Version'] ) { WP_CLI::error( 'The baseline plugin ZIP must be 1.3.0.' ); }
	$page = wp_insert_post( wp_slash( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => 'Upgrade preservation fixture', 'post_content' => '<!-- wp:paragraph --><p>Saved before the real ZIP replacement.</p><!-- /wp:paragraph -->' ) ), true );
	$template = wp_insert_post( wp_slash( array( 'post_type' => 'wp_template', 'post_status' => 'publish', 'post_name' => 'page', 'post_title' => 'Saved page template', 'post_content' => '<!-- wp:group {"tagName":"main"} --><main class="wp-block-group"><!-- wp:post-title {"level":1} /--><!-- wp:post-content /--></main><!-- /wp:group -->' ) ), true );
	if ( is_wp_error( $page ) || is_wp_error( $template ) ) { WP_CLI::error( 'Unable to seed upgrade fixtures.' ); }
	wp_set_object_terms( $template, 'animewp', 'wp_theme' );
	$styles = WP_Theme_JSON_Resolver::get_user_global_styles_post_id();
	wp_update_post( wp_slash( array( 'ID' => $styles, 'post_content' => wp_json_encode( array( 'version' => 3, 'isGlobalStylesUserThemeJSON' => true, 'settings' => array( 'typography' => array( 'fontFamilies' => array( 'custom' => array( array( 'slug' => 'qa-serif', 'name' => 'Saved QA font', 'fontFamily' => 'Georgia, serif' ) ) ) ) ), 'styles' => array( 'color' => array( 'text' => '#272727' ) ) ) ) ) ) );
	update_option( 'animewp_font_roles_v1', array( 'display' => 'qa-serif' ) );
	update_option( 'show_on_front', 'page' );
	update_option( 'page_on_front', $page );
	$ids = array( 'page' => $page, 'template' => $template, 'styles' => $styles );
} elseif ( 'verify' === $action ) {
	$before = json_decode( file_get_contents( $file ), true );
	$ids = $before['ids'];
} else { WP_CLI::error( 'Choose seed or verify.' ); }
$snapshot = array( 'ids' => $ids, 'posts' => array(), 'options' => array() );
foreach ( $ids as $name => $id ) {
	$post = get_post( $id );
	$snapshot['posts'][ $name ] = array( 'content' => $post->post_content, 'title' => $post->post_title, 'status' => $post->post_status, 'template' => get_post_meta( $id, '_wp_page_template', true ) );
}
foreach ( array( 'show_on_front', 'page_on_front', 'page_for_posts', 'animewp_font_roles_v1' ) as $name ) {
	$value = get_option( $name );
	$snapshot['options'][ $name ] = in_array( $name, array( 'page_on_front', 'page_for_posts' ), true ) ? (int) $value : $value;
}
if ( 'seed' === $action ) {
	file_put_contents( $file, wp_json_encode( $snapshot, JSON_PRETTY_PRINT ) );
} else {
	if ( $snapshot !== $before ) { WP_CLI::error( 'The real ZIP upgrade changed saved content or settings.' ); }
	$expected = trim( file_get_contents( WP_CONTENT_DIR . '/animewp-qa/current-version.txt' ) );
	if ( $expected !== wp_get_theme( 'animewp' )->get( 'Version' ) || $expected !== get_plugin_data( WP_PLUGIN_DIR . '/animewp-blocks/animewp-blocks.php' )['Version'] ) { WP_CLI::error( 'The replacement did not install both current ZIP versions.' ); }
	file_put_contents( WP_CONTENT_DIR . '/animewp-qa/upgrade-result.json', wp_json_encode( array( 'baseline' => '1.3.0', 'theme_after' => wp_get_theme( 'animewp' )->get( 'Version' ), 'plugin_after' => get_plugin_data( WP_PLUGIN_DIR . '/animewp-blocks/animewp-blocks.php' )['Version'], 'saved_posts_and_settings_identical' => true ) ) );
}
WP_CLI::success( 'Upgrade preservation ' . $action . ' completed.' );
