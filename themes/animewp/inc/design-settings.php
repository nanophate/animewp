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

function animewp_design_menu() {
	add_theme_page( __( 'animewp 書体', 'animewp' ), __( 'animewp 書体', 'animewp' ), 'edit_theme_options', 'animewp-design', 'animewp_design_screen' );
}
add_action( 'admin_menu', 'animewp_design_menu' );

function animewp_design_screen() {
	if ( ! current_user_can( 'edit_theme_options' ) ) { wp_die( esc_html__( 'この操作を行う権限がありません。', 'animewp' ), '', array( 'response' => 403 ) ); }
	$available = animewp_available_font_families();
	$values = animewp_font_role_values();
	$font_url = version_compare( get_bloginfo( 'version' ), '7.0', '>=' ) ? admin_url( 'font-library.php' ) : admin_url( 'site-editor.php?path=/wp_global_styles&canvas=edit' );
	?>
	<div class="wrap" style="max-width:960px">
		<h1><?php esc_html_e( 'animewp 書体', 'animewp' ); ?></h1>
		<?php if ( isset( $_GET['saved'] ) ) : ?><div class="notice notice-success"><p><?php esc_html_e( '設定を保存しました。編集画面を開いている場合は再読み込みしてください。', 'animewp' ); ?></p></div><?php endif; ?>
		<h2><?php esc_html_e( '好きな書体を追加する', 'animewp' ); ?></h2>
		<p><?php esc_html_e( 'WordPress標準のFont Libraryで、Google Fontsを選択してインストールするか、利用許諾のあるTTF・OTF・WOFF・WOFF2をアップロードできます。追加できる書体数をanimewpは制限しません。使用する書体と太さだけを有効にしてください。', 'animewp' ); ?></p>
		<p><?php esc_html_e( 'Google Fontsは管理者が接続を選び、書体をインストールするときに外部へ通信します。インストール済みファイルはWordPress側から配信されます。外部フォントURLの直接登録や別サービスとの自動同期は行いません。', 'animewp' ); ?></p>
		<p><a class="button" href="<?php echo esc_url( $font_url ); ?>"><?php esc_html_e( '標準の書体管理を開く', 'animewp' ); ?></a></p>
		<p><?php esc_html_e( 'WordPress 6.6では「外観 → エディター → スタイル → タイポグラフィ → フォントの管理」、WordPress 7以降では「外観 → フォント」からも管理できます。本文と通常の見出しは標準のグローバルスタイルで設定します。', 'animewp' ); ?></p>
		<h2><?php esc_html_e( '3つの用途に書体を割り当てる', 'animewp' ); ?></h2>
		<p><?php esc_html_e( '本文・見出しに加えた用途の設定です。書体数の上限ではありません。ブロックの標準「フォント」で用途を選ぶと、この割り当てを使います。特定のブロックには別の書体を直接選択できます。', 'animewp' ); ?></p>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="animewp_save_fonts">
			<?php wp_nonce_field( 'animewp_save_fonts', 'animewp_nonce' ); ?>
			<table class="form-table"><tbody>
			<?php foreach ( animewp_font_roles() as $role => $label ) : $value = isset( $values[ $role ] ) ? $values[ $role ] : ''; ?>
				<tr><th scope="row"><label for="animewp-role-<?php echo esc_attr( $role ); ?>"><?php echo esc_html( $label ); ?></label></th><td>
				<select id="animewp-role-<?php echo esc_attr( $role ); ?>" name="animewp_roles[<?php echo esc_attr( $role ); ?>]">
					<option value=""><?php esc_html_e( 'デザインの推奨値へ戻す', 'animewp' ); ?></option>
					<?php foreach ( $available as $slug => $family ) : ?>
					<option value="<?php echo esc_attr( $slug ); ?>" <?php selected( $value, $slug ); ?>><?php echo esc_html( isset( $family['name'] ) ? $family['name'] : $slug ); ?></option>
					<?php endforeach; ?>
				</select>
				<?php if ( $value && ! isset( $available[ $value ] ) ) : ?><p class="description"><?php esc_html_e( '前の書体は削除または無効化されています。現在はデザインの推奨値で表示します。選び直して保存してください。', 'animewp' ); ?></p><?php endif; ?>
				</td></tr>
			<?php endforeach; ?>
			</tbody></table>
			<?php submit_button( __( '用途の書体を保存', 'animewp' ) ); ?>
		</form>
		<p><?php esc_html_e( '初期状態では端末の標準書体を使います。和文は明朝・ゴシックの代替書体でも読める組版です。Shippori Mincho・Klee One・Cormorant Garamondなどは、必要に応じて標準Font Libraryで追加できます。追加フォントの権利と配信条件は利用者が確認してください。', 'animewp' ); ?></p>
	</div>
	<?php
}

function animewp_save_fonts_action() {
	if ( ! current_user_can( 'edit_theme_options' ) ) { wp_die( esc_html__( 'この操作を行う権限がありません。', 'animewp' ), '', array( 'response' => 403 ) ); }
	check_admin_referer( 'animewp_save_fonts', 'animewp_nonce' );
	$values = isset( $_POST['animewp_roles'] ) ? wp_unslash( $_POST['animewp_roles'] ) : array();
	$result = animewp_save_font_roles( $values );
	if ( is_wp_error( $result ) ) { wp_die( esc_html( $result->get_error_message() ), '', array( 'response' => 400, 'back_link' => true ) ); }
	wp_safe_redirect( admin_url( 'themes.php?page=animewp-design&saved=1' ) );
	exit;
}
add_action( 'admin_post_animewp_save_fonts', 'animewp_save_fonts_action' );
