<?php
/** Explicit design choices. Font files and body/heading styles remain Core-owned. */
if ( ! defined( 'ABSPATH' ) ) { exit; }

function animewp_font_roles() {
	return array( 'display' => __( '英字・大見出し', 'animewp' ), 'accent-hand' => __( '短いアクセント文', 'animewp' ), 'mono' => __( '日付・等幅文字', 'animewp' ) );
}

/** Active merged presets only; installing a family and enabling it are Core actions. */
function animewp_available_font_families() {
	$groups = wp_get_global_settings( array( 'typography', 'fontFamilies' ) );
	$families = array();
	foreach ( is_array( $groups ) ? $groups : array() as $group ) {
		foreach ( is_array( $group ) ? $group : array() as $family ) {
			if ( ! is_array( $family ) || empty( $family['slug'] ) || empty( $family['fontFamily'] ) ||
				! is_string( $family['slug'] ) || ! preg_match( '/^[\p{L}\p{N}-]+$/u', _wp_to_kebab_case( $family['slug'] ) ) ||
				in_array( $family['slug'], array_map( static function ( $role ) { return 'animewp-role-' . $role; }, array_keys( animewp_font_roles() ) ), true ) ) { continue; }
			$families[ $family['slug'] ] = $family;
		}
	}
	return $families;
}

function animewp_font_role_values() {
	$values = get_option( 'animewp_font_roles_v1', array() );
	return is_array( $values ) ? $values : array();
}

/** Validate before storing, so a malformed form never partly replaces settings. */
function animewp_save_font_roles( $values ) {
	if ( ! current_user_can( 'edit_theme_options' ) ) { return new WP_Error( 'animewp_forbidden', __( '設定を保存する権限がありません。', 'animewp' ) ); }
	if ( ! is_array( $values ) ) { return new WP_Error( 'animewp_fonts_invalid', __( '書体の設定を確認してください。', 'animewp' ) ); }
	$available = animewp_available_font_families();
	$clean = array();
	foreach ( animewp_font_roles() as $role => $label ) {
		$slug = isset( $values[ $role ] ) ? $values[ $role ] : '';
		if ( ! is_string( $slug ) || ( '' !== $slug && ! isset( $available[ $slug ] ) ) ) {
			return new WP_Error( 'animewp_font_missing', __( '選択した書体が有効ではありません。Font Libraryで有効化してから選び直してください。', 'animewp' ) );
		}
		if ( '' !== $slug ) { $clean[ $role ] = $slug; }
	}
	if ( $clean ) { update_option( 'animewp_font_roles_v1', $clean, false ); }
	else { delete_option( 'animewp_font_roles_v1' ); }
	return true;
}

function animewp_role_css() {
	$available = animewp_available_font_families();
	$css = '';
	foreach ( animewp_font_role_values() as $role => $slug ) {
		if ( is_string( $slug ) && isset( animewp_font_roles()[ $role ], $available[ $slug ] ) ) {
			$css .= '--animewp-role-' . $role . ':var(--wp--preset--font-family--' . _wp_to_kebab_case( $slug ) . ');';
		}
	}
	return $css ? ':root,.editor-styles-wrapper{' . $css . '}' : '';
}

function animewp_design_assets() {
	$css = animewp_role_css();
	if ( $css ) {
		wp_register_style( 'animewp-role-values', false, array(), wp_get_theme()->get( 'Version' ) );
		wp_enqueue_style( 'animewp-role-values' );
		wp_add_inline_style( 'animewp-role-values', $css );
	}
}
add_action( 'enqueue_block_assets', 'animewp_design_assets' );

/** A rendering default only: user-selected fontDisplay values remain authoritative. */
function animewp_font_display_defaults( $theme_json ) {
	$data = $theme_json->get_data();
	$changed = false;
	if ( isset( $data['settings']['typography']['fontFamilies'] ) ) {
		foreach ( $data['settings']['typography']['fontFamilies'] as &$group ) {
		foreach ( $group as &$family ) {
			if ( ! empty( $family['fontFace'] ) && is_array( $family['fontFace'] ) ) {
				foreach ( $family['fontFace'] as &$face ) {
					if ( ! isset( $face['fontDisplay'] ) ) { $face['fontDisplay'] = 'swap'; $changed = true; }
				}
				unset( $face );
			}
		}
		unset( $family );
		}
		unset( $group );
	}
	if ( $changed ) { $theme_json->update_with( $data ); }
	return $theme_json;
}
add_filter( 'wp_theme_json_data_user', 'animewp_font_display_defaults' );

/**
 * 1.x stored three font "roles" on a separate screen. Fonts are now chosen in
 * the Site Editor (Styles → Typography, and per text style in Styles → Blocks).
 * A saved role map keeps applying to content that uses the old role fonts until
 * the administrator resets it here; nothing is migrated automatically.
 */
function animewp_legacy_font_roles_notice() {
	$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
	if ( ! $screen || 'themes' !== $screen->id || ! current_user_can( 'edit_theme_options' ) || ! animewp_font_role_values() ) { return; }
	?>
	<div class="notice notice-info">
		<p><?php esc_html_e( '以前の「animewp 書体」で選んだ書体は、その書体を使う既存の本文に引き続き適用されています。今後の書体は「外観 → エディター → スタイル」の「タイポグラフィ」と、「ブロック」内の各テキストスタイル（英字ラベル・キャッチコピーなど）で設定します。', 'animewp' ); ?></p>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="animewp_reset_font_roles">
			<?php wp_nonce_field( 'animewp_reset_font_roles', 'animewp_nonce' ); ?>
			<p>
				<a class="button button-primary" href="<?php echo esc_url( admin_url( 'site-editor.php?path=/wp_global_styles' ) ); ?>"><?php esc_html_e( 'スタイルを開く', 'animewp' ); ?></a>
				<?php submit_button( __( '以前の書体設定を解除', 'animewp' ), 'secondary', 'submit', false ); ?>
			</p>
		</form>
	</div>
	<?php
}
add_action( 'admin_notices', 'animewp_legacy_font_roles_notice' );

function animewp_reset_font_roles_action() {
	if ( ! current_user_can( 'edit_theme_options' ) ) { wp_die( esc_html__( 'この操作を行う権限がありません。', 'animewp' ), '', array( 'response' => 403 ) ); }
	check_admin_referer( 'animewp_reset_font_roles', 'animewp_nonce' );
	animewp_save_font_roles( array() );
	wp_safe_redirect( admin_url( 'themes.php' ) );
	exit;
}
add_action( 'admin_post_animewp_reset_font_roles', 'animewp_reset_font_roles_action' );
