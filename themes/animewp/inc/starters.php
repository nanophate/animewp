<?php
/**
 * Explicit, draft-only starter import. No activation mutations.
 *
 * @package animewp
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function animewp_starters() {
	return array(
		'composition-a' => array( 'pattern' => 'animewp/composition-a', 'title' => __( '作品紹介 — カードと3列', 'animewp' ), 'template' => 'animewp-landing' ),
		'composition-b' => array( 'pattern' => 'animewp/composition-b', 'title' => __( '作品紹介 — 画像と2列', 'animewp' ), 'template' => 'animewp-landing' ),
		'characters'    => array( 'pattern' => 'animewp/characters-page', 'title' => __( '登場人物', 'animewp' ), 'template' => 'default' ),
		'contact'       => array( 'pattern' => 'animewp/contact-page', 'title' => __( 'お問い合わせ', 'animewp' ), 'template' => 'default' ),
		'legal'         => array( 'pattern' => 'animewp/legal-page', 'title' => __( 'ご利用について', 'animewp' ), 'template' => 'default' ),
	);
}

function animewp_can_import() {
	return current_user_can( 'edit_theme_options' ) && current_user_can( 'edit_pages' );
}

/** Expand only this theme's registered patterns, with a strict recursion limit. */
function animewp_pattern_content( $slug, $depth = 0 ) {
	if ( $depth > 8 || 0 !== strpos( $slug, 'animewp/' ) ) {
		return '';
	}
	$pattern = WP_Block_Patterns_Registry::get_instance()->get_registered( $slug );
	if ( ! is_array( $pattern ) || empty( $pattern['content'] ) ) {
		return '';
	}
	return preg_replace_callback(
		'/<!--\s+wp:pattern\s+(\{[^\n]*\})\s+\/-->/',
		static function ( $match ) use ( $depth ) {
			$attributes = json_decode( $match[1], true );
			$reference  = isset( $attributes['slug'] ) && is_string( $attributes['slug'] ) ? $attributes['slug'] : '';
			return animewp_pattern_content( $reference, $depth + 1 );
		},
		$pattern['content']
	);
}

function animewp_starter_menu() {
	add_theme_page( __( 'animewp をはじめる', 'animewp' ), __( 'animewp をはじめる', 'animewp' ), 'edit_theme_options', 'animewp-start', 'animewp_starter_screen' );
}
add_action( 'admin_menu', 'animewp_starter_menu' );

function animewp_starter_screen() {
	if ( ! animewp_can_import() ) {
		wp_die( esc_html__( 'この操作を行う権限がありません。', 'animewp' ), '', array( 'response' => 403 ) );
	}
	?>
	<div class="wrap animewp-onboarding">
		<h1><?php esc_html_e( 'animewp をはじめる', 'animewp' ); ?></h1>
		<p><?php esc_html_e( '標準ブロックで文章・画像・色・メニューを編集できます。まず見本を確認し、必要なページだけ下書きへ追加してください。', 'animewp' ); ?></p>
		<p><strong><?php esc_html_e( '現在のページ・メニュー・ホーム設定は変更しません。同じ見本の再実行では、前に作ったページを開きます。', 'animewp' ); ?></strong></p>
		<p><a class="button" href="<?php echo esc_url( admin_url( 'site-editor.php' ) ); ?>"><?php esc_html_e( 'サイト全体を編集', 'animewp' ); ?></a></p>
		<?php foreach ( animewp_starters() as $key => $starter ) : ?>
		<div class="card" style="max-width:760px">
			<h2><?php echo esc_html( $starter['title'] ); ?></h2>
			<p><a class="button" target="_blank" rel="noopener" href="<?php echo esc_url( wp_nonce_url( add_query_arg( 'animewp_preview', $key, home_url( '/' ) ), 'animewp_preview_' . $key ) ); ?>"><?php esc_html_e( '見本をプレビュー', 'animewp' ); ?></a></p>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="animewp_import_starter">
				<input type="hidden" name="animewp_starter" value="<?php echo esc_attr( $key ); ?>">
				<?php wp_nonce_field( 'animewp_import_starter', 'animewp_nonce' ); ?>
				<p><label><?php esc_html_e( 'ページ名', 'animewp' ); ?> <input type="text" name="animewp_title" maxlength="200" value="<?php echo esc_attr( $starter['title'] ); ?>" class="regular-text"></label></p>
				<?php submit_button( __( '下書きとして追加・開く', 'animewp' ), 'primary', 'submit', false ); ?>
			</form>
		</div>
		<?php endforeach; ?>
		<h2><?php esc_html_e( '編集の流れ', 'animewp' ); ?></h2>
		<ol>
			<li><?php esc_html_e( '作品名、画像、説明を自分の内容へ置き換えます。仮画像は公開前に差し替えてください。', 'animewp' ); ?></li>
			<li><?php esc_html_e( 'リスト表示でセクションを選び、移動・複製・削除します。複製したセクションのHTMLアンカーは一意の名前へ変更してください。', 'animewp' ); ?></li>
			<li><?php esc_html_e( 'メニューはサイトエディターで編集します。左・右・全面表示はヘッダーパターンの置換、またはページのテンプレートから選べます。', 'animewp' ); ?></li>
			<li><?php esc_html_e( '内容を確認して公開します。ホームに使う場合は「設定 → 表示設定」で自分で選びます。', 'animewp' ); ?></li>
		</ol>
		<p><?php esc_html_e( '補助プラグインは任意です。高度な装飾・画像配置・映像ダイアログが必要な場合に有効化してください。一般的なフォームやSEOのプラグインも通常どおり追加できます。', 'animewp' ); ?></p>
	</div>
	<?php
}

/** An option INSERT is atomic. Compare-and-delete only the expired value. */
function animewp_acquire_import_lock() {
	global $wpdb;
	$option = 'animewp_starter_import_lock';
	$lock   = array( 'token' => wp_generate_uuid4(), 'time' => time() );
	if ( add_option( $option, $lock, '', false ) ) {
		return $lock;
	}
	$old = get_option( $option );
	if ( is_array( $old ) && isset( $old['time'] ) && time() - (int) $old['time'] > 120 ) {
		$wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->options} WHERE option_name = %s AND option_value = %s", $option, maybe_serialize( $old ) ) );
		wp_cache_delete( $option, 'options' );
		if ( add_option( $option, $lock, '', false ) ) {
			return $lock;
		}
	}
	return false;
}

function animewp_release_import_lock( $lock ) {
	global $wpdb;
	$option = 'animewp_starter_import_lock';
	$wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->options} WHERE option_name = %s AND option_value = %s", $option, maybe_serialize( $lock ) ) );
	wp_cache_delete( $option, 'options' );
}

/** Called only after permission and nonce checks, or by controlled tests. */
function animewp_import_starter_draft( $key, $title = '' ) {
	$starters = animewp_starters();
	if ( ! animewp_can_import() || ! isset( $starters[ $key ] ) ) {
		return new WP_Error( 'animewp_not_allowed', __( 'この見本を追加できません。', 'animewp' ) );
	}
	$lock = animewp_acquire_import_lock();
	if ( ! $lock ) {
		return new WP_Error( 'animewp_busy', __( '追加処理を実行中です。少し待ってから、もう一度お試しください。', 'animewp' ) );
	}
	try {
		$imports = get_option( 'animewp_starter_imports_v1', array() );
		$imports = is_array( $imports ) ? $imports : array();
		$record  = isset( $imports[ $key ] ) && is_array( $imports[ $key ] ) ? $imports[ $key ] : array();
		if ( ! empty( $record['post_id'] ) && 'page' === get_post_type( (int) $record['post_id'] ) ) {
			return (int) $record['post_id'];
		}
		if ( empty( $record['job_slug'] ) ) {
			$record = array( 'job_slug' => 'animewp-' . $key . '-' . substr( wp_generate_uuid4(), 0, 8 ) );
			$imports[ $key ] = $record;
			update_option( 'animewp_starter_imports_v1', $imports, false );
			$stored = get_option( 'animewp_starter_imports_v1', array() );
			if ( ! isset( $stored[ $key ]['job_slug'] ) || $stored[ $key ]['job_slug'] !== $record['job_slug'] ) {
				return new WP_Error( 'animewp_record_failed', __( '導入記録を保存できませんでした。ページはまだ作成していません。', 'animewp' ) );
			}
		}
		// Recover a page created just before a previous request stopped.
		$existing = get_posts( array( 'name' => $record['job_slug'], 'post_type' => 'page', 'post_status' => array( 'draft', 'pending', 'publish', 'private', 'future', 'trash' ), 'posts_per_page' => 1, 'fields' => 'ids', 'no_found_rows' => true ) );
		if ( $existing ) {
			$post_id = (int) $existing[0];
		} else {
			$content = animewp_pattern_content( $starters[ $key ]['pattern'] );
			if ( '' === trim( $content ) ) {
				return new WP_Error( 'animewp_missing_pattern', __( '見本を読み込めませんでした。テーマのファイルを確認してください。', 'animewp' ) );
			}
			$post_id = wp_insert_post( wp_slash( array(
				'post_type'    => 'page',
				'post_status'  => 'draft',
				'post_title'   => '' !== trim( $title ) ? sanitize_text_field( $title ) : $starters[ $key ]['title'],
				'post_name'    => $record['job_slug'],
				'post_content' => $content,
				'post_author'  => get_current_user_id(),
				'meta_input'   => array( '_wp_page_template' => $starters[ $key ]['template'], '_animewp_starter' => $key ),
			) ), true );
			if ( is_wp_error( $post_id ) ) {
				return $post_id;
			}
		}
		$record['post_id'] = $post_id;
		$imports[ $key ]   = $record;
		update_option( 'animewp_starter_imports_v1', $imports, false );
		return $post_id;
	} finally {
		animewp_release_import_lock( $lock );
	}
}

function animewp_import_starter_action() {
	if ( ! animewp_can_import() ) {
		wp_die( esc_html__( 'この操作を行う権限がありません。', 'animewp' ), '', array( 'response' => 403 ) );
	}
	check_admin_referer( 'animewp_import_starter', 'animewp_nonce' );
	$key   = isset( $_POST['animewp_starter'] ) && is_string( $_POST['animewp_starter'] ) ? sanitize_key( wp_unslash( $_POST['animewp_starter'] ) ) : '';
	$title = isset( $_POST['animewp_title'] ) && is_string( $_POST['animewp_title'] ) ? sanitize_text_field( wp_unslash( $_POST['animewp_title'] ) ) : '';
	$result = animewp_import_starter_draft( $key, $title );
	if ( is_wp_error( $result ) ) {
		wp_die( esc_html( $result->get_error_message() ), '', array( 'response' => 400, 'back_link' => true ) );
	}
	wp_safe_redirect( admin_url( 'post.php?post=' . (int) $result . '&action=edit' ) );
	exit;
}
add_action( 'admin_post_animewp_import_starter', 'animewp_import_starter_action' );

function animewp_starter_preview() {
	if ( ! isset( $_GET['animewp_preview'] ) || ! is_string( $_GET['animewp_preview'] ) ) {
		return;
	}
	$key      = sanitize_key( wp_unslash( $_GET['animewp_preview'] ) );
	$starters = animewp_starters();
	$nonce    = isset( $_GET['_wpnonce'] ) && is_string( $_GET['_wpnonce'] ) ? sanitize_text_field( wp_unslash( $_GET['_wpnonce'] ) ) : '';
	if ( ! animewp_can_import() || ! isset( $starters[ $key ] ) || ! wp_verify_nonce( $nonce, 'animewp_preview_' . $key ) ) {
		wp_die( esc_html__( 'プレビューを開けません。管理画面から開き直してください。', 'animewp' ), '', array( 'response' => 403 ) );
	}
	nocache_headers();
	header( 'X-Robots-Tag: noindex, nofollow', true );
	$header_slug = 'animewp-landing' === $starters[ $key ]['template'] ? 'header-landing' : 'header';
	$header  = do_blocks( '<!-- wp:template-part ' . wp_json_encode( array( 'slug' => $header_slug, 'theme' => 'animewp', 'tagName' => 'header' ) ) . ' /-->' );
	$content = do_blocks( animewp_pattern_content( $starters[ $key ]['pattern'] ) );
	$footer  = do_blocks( '<!-- wp:template-part {"slug":"footer","theme":"animewp","tagName":"footer"} /-->' );
	?><!doctype html><html <?php language_attributes(); ?>><head><meta charset="<?php bloginfo( 'charset' ); ?>"><meta name="viewport" content="width=device-width, initial-scale=1"><?php wp_head(); ?></head><body <?php body_class(); ?>><?php wp_body_open(); ?><div class="wp-site-blocks"><?php echo $header; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- rendered trusted theme blocks. ?><main id="animewp-main" class="wp-block-group animewp-preview-main"><?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- rendered trusted theme blocks. ?></main><?php echo $footer; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- rendered trusted theme blocks. ?></div><?php wp_footer(); ?></body></html><?php
	exit;
}
add_action( 'template_redirect', 'animewp_starter_preview' );
