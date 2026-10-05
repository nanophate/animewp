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
		'showcase'      => array( 'pattern' => 'animewp/home-showcase', 'title' => __( '作品紹介 — 余白の作品紹介', 'animewp' ), 'template' => 'animewp-showcase' ),
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
		<details style="max-width:900px;margin-block:20px">
			<summary><?php esc_html_e( '日本語で編集するための設定', 'animewp' ); ?></summary>
			<p><?php esc_html_e( 'WordPress標準のメニューやブロック設定の表示言語は、サイトとユーザーの言語設定に従います。「設定 → 一般 → サイトの言語」を「日本語」にし、「ユーザー → プロフィール → 言語」も「日本語」または「サイトのデフォルト」にしてください。', 'animewp' ); ?></p>
		</details>
		<?php foreach ( animewp_starters() as $key => $starter ) : ?>
		<div class="card" style="max-width:760px">
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
		<h2><?php esc_html_e( '編集の流れ', 'animewp' ); ?></h2>
		<ol>
			<li><?php esc_html_e( '作品名、画像、説明を自分の内容へ置き換えます。仮画像は公開前に差し替えてください。', 'animewp' ); ?></li>
			<li><?php esc_html_e( 'リスト表示でセクションを選び、移動・複製・削除します。複製したセクションのHTMLアンカーは一意の名前へ変更してください。', 'animewp' ); ?></li>
			<li><?php esc_html_e( 'メニューはサイトエディターで編集します。上部・左固定・右固定・全面表示はヘッダーパターンの置換、またはページのテンプレートから選べます。左・右固定メニューも、狭い画面では上部に表示します。', 'animewp' ); ?></li>
			<li><?php esc_html_e( '内容を確認して公開します。ホームに使う場合は「設定 → 表示設定」で自分で選びます。', 'animewp' ); ?></li>
		</ol>
		<h2><?php esc_html_e( '目的に合った編集場所', 'animewp' ); ?></h2>
		<p><?php esc_html_e( '作品紹介の文章・画像は「固定ページ → 対象ページ → 編集」で変更します。「外観 → エディター → テンプレート」は共通の外枠を編集する場所です。そこに表示される「コンテンツ」の仮文章は本文の差し込み位置を示しており、保存した本文ではありません。', 'animewp' ); ?></p>
		<table class="widefat striped" style="max-width:900px">
			<thead><tr><th scope="col"><?php esc_html_e( '編集したいもの', 'animewp' ); ?></th><th scope="col"><?php esc_html_e( '選び方', 'animewp' ); ?></th></tr></thead>
			<tbody>
				<tr><th scope="row"><?php esc_html_e( 'ページや部品の見本', 'animewp' ); ?></th><td><?php esc_html_e( '編集画面の「＋ → パターン」で「animewp：ページ」「animewp：ページの部品」「animewp：ヘッダー」を選びます。挿入した見本は、文章・画像・色をブロックごとに変更できます。', 'animewp' ); ?></td></tr>
				<tr><th scope="row"><?php esc_html_e( 'ページの型（テンプレート）', 'animewp' ); ?></th><td><?php esc_html_e( '固定ページの設定で「テンプレート」を選びます。作品紹介ページ、自由な全面レイアウト、左固定・右固定・全面表示メニューを用意しています。テンプレート自体を編集すると、その型を使うほかのページにも反映されます。', 'animewp' ); ?></td></tr>
				<tr><th scope="row"><?php esc_html_e( 'サイト全体の雰囲気', 'animewp' ); ?></th><td><?php esc_html_e( '「外観 → エディター → スタイル」でスタイルを参照し、「見出しを明朝に」または「ゆったり余白・丸いボタン」を選びます。色・幅・余白もここで調整できます。', 'animewp' ); ?></td></tr>
				<tr><th scope="row"><?php esc_html_e( '各ブロックの見た目', 'animewp' ); ?></th><td><?php esc_html_e( '見出し・段落・グループ・画像などを選び、ブロック設定の「スタイル」からカード、縦書き見出し、文字の背景ハイライトなどを選びます。表示される種類は選択したブロックによって変わります。', 'animewp' ); ?></td></tr>
				<tr><th scope="row"><?php esc_html_e( '文字の種類と大きさ', 'animewp' ); ?></th><td><?php esc_html_e( 'サイト全体は「スタイル → タイポグラフィ」、一部の文字は対象ブロックの「タイポグラフィ」で変更します。「端末標準ゴシック」「端末標準明朝」は閲覧する端末の書体を使い、外部フォントを読み込みません。', 'animewp' ); ?></td></tr>
			</tbody>
		</table>
		<h2><?php esc_html_e( '背景と文章を別々に整える', 'animewp' ); ?></h2>
		<p style="max-width:900px"><?php esc_html_e( '標準のカバーやグループでは背景・余白を、内側の見出しや段落では文字色・書体・大きさを設定します。リスト表示で編集したい階層を選ぶと、背景と文章を区別しやすくなります。', 'animewp' ); ?></p>
		<p style="max-width:900px"><?php esc_html_e( '任意のAnimeWP Blocksを有効にすると、装飾パネルの背景と、内側の「AnimeWP 文字グループ」の傾きを別々に設定できます。傾けたい見出しや段落だけを文字グループに入れ、水平に残したい本文はその外側に置きます。「パネル全体の回転（度）」は0のまま、背景だけの回転と文字グループの回転を調整してください。文字グループのモバイル用の角度は初期値0度です。', 'animewp' ); ?></p>
		<p style="max-width:900px"><?php esc_html_e( 'プラグイン有効時は「＋ → パターン → AnimeWP ブロック」から「背景と傾いた見出し・水平本文」または「角度の違う2つの文字グループ」を挿入すると、配置の見本をすぐに試せます。', 'animewp' ); ?></p>
		<p style="max-width:900px"><?php esc_html_e( '「縦書き見出し（短文向け）」は短い日本語の見出し用で、狭い画面では横書きに戻ります。長文の縦組みやルビの細かな組版調整は対象外です。文字の形・改行・句読点の見え方は端末やブラウザーで変わるため、実際の画面で確認してください。', 'animewp' ); ?></p>
		<p><?php esc_html_e( '一般的なフォームやSEOのプラグインも通常どおり追加できます。', 'animewp' ); ?></p>
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
