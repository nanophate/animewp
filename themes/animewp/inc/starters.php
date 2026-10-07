<?php
/**
 * Explicit, draft-only starter import. No activation mutations.
 *
 * @package animewp
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Pages that can be added as drafts. The full example pages need AnimeWP
 * Blocks; without it only the pages built from core blocks are offered.
 */
function animewp_starters() {
	$starters = array(
		'basic'       => array( 'pattern' => 'animewp/page-basic', 'title' => __( '作品紹介 — テーマだけで作る', 'animewp' ), 'template' => 'animewp-canvas' ),
		'simple'      => array( 'pattern' => 'animewp/page-simple', 'title' => __( '作品紹介 — シンプル', 'animewp' ), 'template' => 'animewp-canvas' ),
		'blur'        => array( 'pattern' => 'animewp/page-blur', 'title' => __( '作品紹介 — ぼかしから現れる', 'animewp' ), 'template' => 'animewp-canvas' ),
		'drift'       => array( 'pattern' => 'animewp/page-drift', 'title' => __( '作品紹介 — 花びらが舞う', 'animewp' ), 'template' => 'animewp-canvas' ),
		'style-guide' => array( 'pattern' => 'animewp/style-guide', 'title' => __( 'スタイル見本', 'animewp' ), 'template' => 'animewp-canvas' ),
		'contact'     => array( 'pattern' => 'animewp/contact-page', 'title' => __( 'お問い合わせ', 'animewp' ), 'template' => 'default' ),
		'legal'       => array( 'pattern' => 'animewp/legal-page', 'title' => __( 'ご利用について', 'animewp' ), 'template' => 'default' ),
	);
	$registry = WP_Block_Patterns_Registry::get_instance();
	return array_filter( $starters, static fn( $starter ) => $registry->is_registered( $starter['pattern'] ) );
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
	<style>
		.animewp-onboarding__steps { max-width: 760px; line-height: 1.9; }
		.animewp-onboarding__lang { max-width: 760px; margin-block: 16px 24px; }
		.animewp-onboarding__cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; max-width: 1100px; }
		.animewp-onboarding__cards .card { max-width: none; margin: 0; }
		.animewp-onboarding__cards .regular-text { width: 100%; }
	</style>
	<div class="wrap animewp-onboarding">
		<h1><?php esc_html_e( 'animewp をはじめる', 'animewp' ); ?></h1>
		<p><?php esc_html_e( '見本のページを下書きに追加し、文章と画像を差し替えるところから始めます。ページ・メニュー・ホーム設定は、ここで選ぶまで変更しません。', 'animewp' ); ?></p>
		<ol class="animewp-onboarding__steps">
			<li><strong><?php esc_html_e( 'ページを追加', 'animewp' ); ?></strong> — <?php esc_html_e( '下の見本から選び、下書きとして追加します。', 'animewp' ); ?></li>
			<li><strong><?php esc_html_e( '配色を選ぶ', 'animewp' ); ?></strong> — <a href="<?php echo esc_url( admin_url( 'site-editor.php?path=/wp_global_styles' ) ); ?>"><?php esc_html_e( 'スタイル', 'animewp' ); ?></a> <?php esc_html_e( 'の「パレット」で白黒・夜空・桜・青空・夕暮れから選び、各色を自由に変えます。', 'animewp' ); ?></li>
			<li><strong><?php esc_html_e( '文字のスタイルを整える', 'animewp' ); ?></strong> — <?php esc_html_e( 'スタイル → ブロック → 段落／見出しで、英字ラベル・キャッチコピー・大見出しなどの書体と字間をまとめて変えます。', 'animewp' ); ?></li>
			<li><strong><?php esc_html_e( '動きを付ける（任意）', 'animewp' ); ?></strong> — <?php esc_html_e( 'ブロックを選び、右側の「モーション」で登場の動きを選びます。グループに付けると中身が順に動きます。（AnimeWP Blocks が必要です）', 'animewp' ); ?></li>
		</ol>
		<details class="animewp-onboarding__lang">
			<summary><?php esc_html_e( '編集画面を日本語で表示するには', 'animewp' ); ?></summary>
			<p><?php esc_html_e( '「設定 → 一般 → サイトの言語」と「ユーザー → プロフィール → 言語」を日本語にします。', 'animewp' ); ?></p>
		</details>
		<h2><?php esc_html_e( '見本のページ', 'animewp' ); ?></h2>
		<?php if ( ! WP_Block_Type_Registry::get_instance()->is_registered( 'animewp/carousel' ) ) : ?>
			<p><?php esc_html_e( 'AnimeWP Blocks を有効にすると、キービジュアル・映像・キャラクターを含む見本ページとスタイル見本も追加できます。', 'animewp' ); ?></p>
		<?php endif; ?>
		<div class="animewp-onboarding__cards">
		<?php foreach ( animewp_starters() as $key => $starter ) : ?>
		<div class="card">
			<h2><?php echo esc_html( $starter['title'] ); ?></h2>
			<p><a class="button" target="_blank" rel="noopener" href="<?php echo esc_url( wp_nonce_url( add_query_arg( 'animewp_preview', $key, home_url( '/' ) ), 'animewp_preview_' . $key ) ); ?>"><?php esc_html_e( '見本をプレビュー', 'animewp' ); ?></a></p>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="animewp_import_starter">
				<input type="hidden" name="animewp_starter" value="<?php echo esc_attr( $key ); ?>">
				<?php wp_nonce_field( 'animewp_import_starter', 'animewp_nonce' ); ?>
				<p><label><?php esc_html_e( 'ページ名', 'animewp' ); ?> <input type="text" name="animewp_title" maxlength="200" value="<?php echo esc_attr( $starter['title'] ); ?>" class="regular-text"></label></p>
				<?php
				$imports = get_option( 'animewp_starter_imports_v1', array() );
				$record  = isset( $imports[ $key ] ) && is_array( $imports[ $key ] ) ? $imports[ $key ] : array();
				$previous = animewp_find_starter_page( $record );
				if ( $previous && 'trash' === get_post_status( $previous ) ) :
				?>
					<p><?php esc_html_e( '前に追加したページはゴミ箱にあります。復元すると下書きになります。内容を残したまま、新しい見本を追加することもできます。', 'animewp' ); ?></p>
					<button type="submit" name="animewp_recovery" value="restore" class="button button-primary"><?php esc_html_e( '前のページを下書きへ復元', 'animewp' ); ?></button>
					<button type="submit" name="animewp_recovery" value="new" class="button"><?php esc_html_e( '新しい下書きを追加', 'animewp' ); ?></button>
				<?php else : ?>
					<?php submit_button( __( '下書きとして追加・開く', 'animewp' ), 'primary', 'submit', false ); ?>
				<?php endif; ?>
			</form>
		</div>
		<?php endforeach; ?>
		</div>
		<p><?php esc_html_e( '書体・色・CSS変数による細かな調整は、テーマフォルダー内の docs/customizing.md にまとめています。', 'animewp' ); ?></p>
	</div>
	<?php
}

/** Invalidate both positive and negative option caches after direct lock SQL. */
function animewp_clear_import_lock_cache() {
	wp_cache_delete( 'animewp_starter_import_lock', 'options' );
	wp_cache_delete( 'notoptions', 'options' );
}

/** INSERT IGNORE never overwrites a competing request's lock. */
function animewp_insert_import_lock( $lock ) {
	global $wpdb;
	$result = $wpdb->query( $wpdb->prepare(
		"INSERT IGNORE INTO {$wpdb->options} (option_name, option_value, autoload) VALUES (%s, %s, %s)",
		'animewp_starter_import_lock', maybe_serialize( $lock ), 'no'
	) );
	animewp_clear_import_lock_cache();
	return 1 === $result;
}

/** Read lock ownership from the database; caches cannot authorize takeover. */
function animewp_acquire_import_lock() {
	global $wpdb;
	$option = 'animewp_starter_import_lock';
	$lock   = array( 'token' => wp_generate_uuid4(), 'time' => time() );
	if ( animewp_insert_import_lock( $lock ) ) {
		return $lock;
	}
	$old_value = $wpdb->get_var( $wpdb->prepare( "SELECT option_value FROM {$wpdb->options} WHERE option_name = %s", $option ) );
	$old = maybe_unserialize( $old_value );
	if ( is_array( $old ) && isset( $old['time'] ) && time() - (int) $old['time'] > 120 ) {
		$wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->options} WHERE option_name = %s AND option_value = %s", $option, $old_value ) );
		animewp_clear_import_lock_cache();
		if ( animewp_insert_import_lock( $lock ) ) {
			return $lock;
		}
	}
	return false;
}

function animewp_release_import_lock( $lock ) {
	global $wpdb;
	$option = 'animewp_starter_import_lock';
	$wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->options} WHERE option_name = %s AND option_value = %s", $option, maybe_serialize( $lock ) ) );
	animewp_clear_import_lock_cache();
}

/** Find both normal and trashed pages, including an interrupted import. */
function animewp_find_starter_page( $record ) {
	if ( ! empty( $record['post_id'] ) && 'page' === get_post_type( (int) $record['post_id'] ) ) {
		return (int) $record['post_id'];
	}
	if ( empty( $record['job_slug'] ) || ! is_string( $record['job_slug'] ) ) {
		return 0;
	}
	$args = array( 'post_type' => 'page', 'posts_per_page' => 1, 'fields' => 'ids', 'no_found_rows' => true );
	$found = get_posts( array_merge( $args, array( 'name' => $record['job_slug'], 'post_status' => array( 'draft', 'pending', 'publish', 'private', 'future', 'trash' ) ) ) );
	if ( ! $found ) {
		// WordPress suffixes trashed slugs and records the original in this meta.
		$found = get_posts( array_merge( $args, array( 'post_status' => 'trash', 'meta_key' => '_wp_desired_post_slug', 'meta_value' => $record['job_slug'] ) ) );
	}
	return $found ? (int) $found[0] : 0;
}

/** Called only after permission and nonce checks, or by controlled tests. */
function animewp_import_starter_draft( $key, $title = '', $recovery = 'ask' ) {
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
		$previous = animewp_find_starter_page( $record );
		if ( $previous && 'trash' === get_post_status( $previous ) ) {
			if ( 'restore' === $recovery && current_user_can( 'edit_post', $previous ) ) {
				$draft_status = static function () { return 'draft'; };
				add_filter( 'wp_untrash_post_status', $draft_status, PHP_INT_MAX );
				try { $restored = wp_untrash_post( $previous ); }
				finally { remove_filter( 'wp_untrash_post_status', $draft_status, PHP_INT_MAX ); }
				if ( ! $restored || 'draft' !== get_post_status( $previous ) ) {
					return new WP_Error( 'animewp_restore_failed', __( 'ページを復元できませんでした。ゴミ箱から状態を確認してください。', 'animewp' ) );
				}
			} elseif ( 'new' === $recovery ) {
				$record = array();
				$previous = 0;
			} else {
				return new WP_Error( 'animewp_starter_trashed', __( '前のページはゴミ箱にあります。「animewp をはじめる」で復元または新しい下書きを選んでください。', 'animewp' ) );
			}
		}
		if ( $previous ) {
			$record['post_id'] = $previous;
			$imports[ $key ] = $record;
			update_option( 'animewp_starter_imports_v1', $imports, false );
			return $previous;
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
		$existing = animewp_find_starter_page( $record );
		if ( $existing ) {
			$post_id = $existing;
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
	$recovery = isset( $_POST['animewp_recovery'] ) && is_string( $_POST['animewp_recovery'] ) ? sanitize_key( wp_unslash( $_POST['animewp_recovery'] ) ) : 'ask';
	$result = animewp_import_starter_draft( $key, $title, $recovery );
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
	$header_slug = 'animewp-showcase' === $starters[ $key ]['template'] ? 'header-glass' : $header_slug;
	$footer_slug = 'animewp-showcase' === $starters[ $key ]['template'] ? 'footer-visual' : 'footer';
	$header  = do_blocks( '<!-- wp:template-part ' . wp_json_encode( array( 'slug' => $header_slug, 'theme' => 'animewp', 'tagName' => 'header' ) ) . ' /-->' );
	$content = do_blocks( animewp_pattern_content( $starters[ $key ]['pattern'] ) );
	$footer  = do_blocks( '<!-- wp:template-part ' . wp_json_encode( array( 'slug' => $footer_slug, 'theme' => 'animewp', 'tagName' => 'footer' ) ) . ' /-->' );
	?><!doctype html><html <?php language_attributes(); ?>><head><title><?php echo esc_html( get_bloginfo( 'name' ) . ' — ' . __( '見本のプレビュー', 'animewp' ) ); ?></title><meta charset="<?php bloginfo( 'charset' ); ?>"><meta name="viewport" content="width=device-width, initial-scale=1"><?php wp_head(); ?></head><body <?php body_class(); ?>><?php wp_body_open(); ?><div class="wp-site-blocks"><?php echo $header; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- rendered trusted theme blocks. ?><main id="animewp-main" class="wp-block-group animewp-preview-main"><?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- rendered trusted theme blocks. ?></main><?php echo $footer; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- rendered trusted theme blocks. ?></div><?php wp_footer(); ?></body></html><?php
	exit;
}
add_action( 'template_redirect', 'animewp_starter_preview' );
