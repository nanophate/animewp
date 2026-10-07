<?php
/** Run with wp eval-file in a disposable database only. */
if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) { exit( 1 ); }
$GLOBALS['animewp_results'] = array();
function animewp_test( $label, $condition ) {
	global $animewp_results;
	$animewp_results[] = array( 'test' => $label, 'pass' => (bool) $condition );
	if ( ! $condition ) { WP_CLI::warning( $label ); }
}
wp_set_current_user( 1 );
$animewp_original = array( 'show_on_front' => get_option( 'show_on_front' ), 'page_on_front' => get_option( 'page_on_front' ), 'page_for_posts' => get_option( 'page_for_posts' ) );
$animewp_existing = wp_insert_post( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => '既存ホームの検証', 'post_content' => '<!-- wp:paragraph --><p>既存本文を保持する検証です。</p><!-- /wp:paragraph -->' ) );
$animewp_menu = wp_insert_post( array( 'post_type' => 'wp_navigation', 'post_status' => 'publish', 'post_title' => '既存メニューの検証', 'post_content' => '<!-- wp:navigation-link {"label":"既存ホーム","url":"' . esc_url( get_permalink( $animewp_existing ) ) . '","kind":"custom"} /-->' ) );
update_option( 'show_on_front', 'page' ); update_option( 'page_on_front', $animewp_existing );
$animewp_before_page = get_post( $animewp_existing )->post_content;
$animewp_before_menu = get_post( $animewp_menu )->post_content;
$animewp_other_themes = array_values( array_filter( array_keys( wp_get_themes() ), static function( $slug ) { return 'animewp' !== $slug; } ) );
if ( $animewp_other_themes ) { switch_theme( $animewp_other_themes[0] ); switch_theme( 'animewp' ); }
animewp_test( 'existing static homepage option preserved on theme switch', 'page' === get_option( 'show_on_front' ) && (int) get_option( 'page_on_front' ) === $animewp_existing );
animewp_test( 'existing page and navigation content preserved', $animewp_before_page === get_post( $animewp_existing )->post_content && $animewp_before_menu === get_post( $animewp_menu )->post_content );
animewp_test( 'no overriding front page template', ! file_exists( get_theme_file_path( 'templates/front-page.html' ) ) );
$animewp_option_snapshot = array( get_option( 'show_on_front' ), get_option( 'page_on_front' ), get_option( 'page_for_posts' ) );
$animewp_imports = array();
foreach ( array_keys( animewp_starters() ) as $animewp_key ) {
	$animewp_records = get_option( 'animewp_starter_imports_v1', array() );
	$animewp_prior = isset( $animewp_records[ $animewp_key ] ) ? animewp_find_starter_page( $animewp_records[ $animewp_key ] ) : 0;
	$animewp_expected_status = $animewp_prior ? get_post_status( $animewp_prior ) : 'draft';
	$animewp_id = animewp_import_starter_draft( $animewp_key );
	$animewp_repeat = animewp_import_starter_draft( $animewp_key );
	$animewp_ok = ! is_wp_error( $animewp_id );
	animewp_test( 'starter ' . $animewp_key . ' creates draft or preserves existing status', $animewp_ok && $animewp_expected_status === get_post_status( $animewp_id ) );
	animewp_test( 'starter ' . $animewp_key . ' repeated import reuses one page', $animewp_ok && $animewp_id === $animewp_repeat );
	if ( $animewp_ok ) {
		$animewp_imports[ $animewp_key ] = $animewp_id;
		$animewp_content = get_post_field( 'post_content', $animewp_id );
		animewp_test( 'starter ' . $animewp_key . ' stores editable blocks without pattern references', has_blocks( $animewp_content ) && false === strpos( $animewp_content, '<!-- wp:pattern' ) );
		preg_match_all( '/\sid="([^"]+)"/', $animewp_content, $animewp_anchors );
		animewp_test( 'starter ' . $animewp_key . ' has unique saved IDs', count( $animewp_anchors[1] ) === count( array_unique( $animewp_anchors[1] ) ) );
	}
}
animewp_test( 'import does not alter reading settings', $animewp_option_snapshot === array( get_option( 'show_on_front' ), get_option( 'page_on_front' ), get_option( 'page_for_posts' ) ) );
animewp_test( 'unknown starter is rejected', is_wp_error( animewp_import_starter_draft( '../unknown' ) ) );
$animewp_lock = animewp_acquire_import_lock();
animewp_test( 'concurrent starter request is rejected while locked', false !== $animewp_lock && is_wp_error( animewp_import_starter_draft( 'basic' ) ) );
if ( $animewp_lock ) { animewp_release_import_lock( $animewp_lock ); }
$animewp_saved_imports = get_option( 'animewp_starter_imports_v1' );
$animewp_recovery = $animewp_saved_imports;
unset( $animewp_recovery['basic']['post_id'] );
update_option( 'animewp_starter_imports_v1', $animewp_recovery, false );
animewp_test( 'interrupted import recovers page by job slug', $animewp_imports['basic'] === animewp_import_starter_draft( 'basic' ) );
$animewp_contact_id=$animewp_imports['contact'];
$animewp_contact_before=get_post_field('post_content',$animewp_contact_id);
wp_update_post(array('ID'=>$animewp_contact_id,'post_content'=>'<!-- wp:paragraph --><p>Edited starter content stays here.</p><!-- /wp:paragraph -->'));
animewp_import_starter_draft('contact','Replacement must not overwrite');
animewp_test('reimport preserves manually edited starter body',false!==strpos(get_post_field('post_content',$animewp_contact_id),'Edited starter content stays here.'));
wp_update_post(array('ID'=>$animewp_contact_id,'post_content'=>$animewp_contact_before));
$animewp_records_before=get_option('animewp_starter_imports_v1');
$animewp_records_missing=$animewp_records_before;unset($animewp_records_missing['legal']);
update_option('animewp_starter_imports_v1',$animewp_records_missing,false);
$animewp_page_count=(int)wp_count_posts('page')->draft;
$animewp_reject_write=static function($value,$old){return $old;};
add_filter('pre_update_option_animewp_starter_imports_v1',$animewp_reject_write,10,2);
$animewp_failed_import=animewp_import_starter_draft('legal');
remove_filter('pre_update_option_animewp_starter_imports_v1',$animewp_reject_write,10);
animewp_test('failed job record write returns error before page insert',is_wp_error($animewp_failed_import)&&'animewp_record_failed'===$animewp_failed_import->get_error_code()&&(int)wp_count_posts('page')->draft===$animewp_page_count);
update_option('animewp_starter_imports_v1',$animewp_records_before,false);
$animewp_author = get_user_by( 'login', 'animewp-test-author' );
$animewp_author_id = $animewp_author ? $animewp_author->ID : wp_insert_user( array( 'user_login' => 'animewp-test-author', 'user_pass' => wp_generate_password( 40 ), 'role' => 'author', 'user_email' => 'animewp-author@example.invalid' ) );
wp_set_current_user( $animewp_author_id );
animewp_test( 'author cannot import starter', is_wp_error( animewp_import_starter_draft( 'basic' ) ) );
wp_set_current_user( 1 );
foreach ( array( 'index','home','single','page','archive','search','404','animewp-landing','animewp-left','animewp-right','animewp-overlay' ) as $animewp_template ) {
	$animewp_t = get_block_template( 'animewp//' . $animewp_template, 'wp_template' );
	animewp_test( 'template ' . $animewp_template . ' resolves', $animewp_t && ! empty( $animewp_t->content ) );
}
$animewp_style_post = wp_insert_post( array( 'post_type'=>'wp_template', 'post_status'=>'publish','post_name'=>'page','post_title'=>'Edited page template','post_content'=>'<!-- wp:paragraph --><p>Saved template customization</p><!-- /wp:paragraph -->' ) );
wp_set_object_terms( $animewp_style_post, 'animewp', 'wp_theme' );
if ( $animewp_other_themes ) { switch_theme( $animewp_other_themes[0] ); switch_theme( 'animewp' ); }
animewp_test( 'site editor customization survives theme switching', false !== strpos( get_block_template( 'animewp//page', 'wp_template' )->content, 'Saved template customization' ) );
wp_delete_post( $animewp_style_post, true );
foreach ( $animewp_original as $animewp_name => $animewp_value ) { update_option( $animewp_name, $animewp_value ); }
$animewp_data = array( 'wordpress' => get_bloginfo( 'version' ), 'php' => PHP_VERSION, 'existing_page' => $animewp_existing, 'navigation' => $animewp_menu, 'author_id' => $animewp_author_id, 'imports' => $animewp_imports, 'results' => $GLOBALS['animewp_results'] );
WP_CLI::line( wp_json_encode( $animewp_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE ) );
foreach ( $GLOBALS['animewp_results'] as $animewp_result ) { if ( ! $animewp_result['pass'] ) { WP_CLI::halt(1); } }
