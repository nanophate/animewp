<?php
/** Exercise Core's real script-catalog lookup in a disposable WordPress site. */
if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) {
	exit( 1 );
}

$animewp_i18n_results = array();
function animewp_i18n_test( string $label, bool $condition ): void {
	global $animewp_i18n_results;
	$animewp_i18n_results[] = array( 'test' => $label, 'pass' => $condition );
	if ( ! $condition ) {
		WP_CLI::warning( $label );
	}
}

// The plugin bundles its own Japanese catalogs; testing them must not depend
// on downloading a Core language pack or changing the site's saved language.
$animewp_japanese = static function () { return 'ja'; };
add_filter( 'locale', $animewp_japanese );
add_filter( 'determine_locale', $animewp_japanese );
unload_textdomain( 'animewp-blocks', true );
\Animewp\Blocks\load_textdomain();
animewp_i18n_test(
	'Bundled PHP translations load in Japanese',
	'角度の違う2つの文字グループ' === __( 'Two text blocks at different angles', 'animewp-blocks' )
);

// This is the callback used by the editor, including its actual handle,
// textdomain, translations directory and script URL. In particular, a browser
// can load a URL containing includes/../ while Core cannot find its JSON hash.
\Animewp\Blocks\motion_editor_assets();
$animewp_sources = array( 'animewp-motion-editor' => 'build/motion/editor.js' );
foreach ( \Animewp\Blocks\BLOCKS as $animewp_block ) {
	$animewp_type = WP_Block_Type_Registry::get_instance()->get_registered( 'animewp/' . $animewp_block );
	animewp_i18n_test( $animewp_block . ' has a registered editor script', $animewp_type && ! empty( $animewp_type->editor_script_handles ) );
	foreach ( $animewp_type->editor_script_handles ?? array() as $animewp_handle ) {
		$animewp_sources[ $animewp_handle ] = 'build/blocks/' . $animewp_block . '/index.js';
	}
}

$animewp_probes = array(
	'build/motion/editor.js'               => array(
		'Motion'                 => 'モーション',
		'After scrolling down'   => '下にスクロールした後',
		'Scroll trigger'         => '切り替えのきっかけ',
		'After the first cover'  => 'キービジュアルを通過した後',
		'Expand the navigation'  => 'メニューを展開する',
		'Header appearance'      => 'ヘッダーの見た目',
		'Minimum height (px)'    => '最小の高さ（px）',
	),
	'build/blocks/panel/index.js'          => array( 'Color source' => '色の指定方法' ),
	'build/blocks/text-group/index.js'     => array( 'Text to rotate' => 'このグループに入れる文章' ),
	'build/blocks/media/index.js'          => array( 'Heading' => '見出し' ),
	'build/blocks/video/index.js'          => array( 'Replace poster image' => 'ポスター画像を変更' ),
	'build/blocks/carousel/index.js'       => array( 'Auto-advance (seconds)' => '自動で切り替え（秒）' ),
	'build/blocks/video-card/index.js'     => array( 'Source' => '動画の種類' ),
	'build/blocks/backdrop/index.js'       => array( 'Video file URL' => '動画ファイルのURL' ),
	'build/blocks/decoration/index.js'     => array( 'Decoration' => '装飾' ),
);

foreach ( $animewp_sources as $animewp_handle => $animewp_source ) {
	$animewp_script = wp_scripts()->registered[ $animewp_handle ] ?? null;
	animewp_i18n_test( $animewp_handle . ' has a translation-enabled script', null !== $animewp_script && 'animewp-blocks' === ( $animewp_script->textdomain ?? '' ) );
	if ( ! $animewp_script ) {
		continue;
	}
	$animewp_path = wp_parse_url( $animewp_script->src, PHP_URL_PATH );
	animewp_i18n_test( $animewp_handle . ' URL has no unresolved dot segments', is_string( $animewp_path ) && ! preg_match( '~/(?:\.|\.\.)(?:/|$)~', $animewp_path ) );

	$animewp_json = load_script_textdomain( $animewp_handle, $animewp_script->textdomain ?? '', $animewp_script->translations_path ?? '' );
	$animewp_catalog = $animewp_json ? json_decode( $animewp_json, true ) : array();
	$animewp_messages = $animewp_catalog['locale_data']['messages'] ?? array();
	animewp_i18n_test(
		$animewp_handle . ' resolves the bundled catalog for its built script',
		$animewp_source === ( $animewp_catalog['source'] ?? '' ) && 'ja' === ( $animewp_messages['']['lang'] ?? '' )
	);
	foreach ( $animewp_probes[ $animewp_source ] as $animewp_english => $animewp_translation ) {
		animewp_i18n_test( $animewp_handle . ' translates ' . $animewp_english, $animewp_translation === ( $animewp_messages[ $animewp_english ][0] ?? '' ) );
	}
}

remove_filter( 'locale', $animewp_japanese );
remove_filter( 'determine_locale', $animewp_japanese );
unload_textdomain( 'animewp-blocks', true );
WP_CLI::line( wp_json_encode( array( 'wordpress' => get_bloginfo( 'version' ), 'results' => $animewp_i18n_results ), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE ) );
foreach ( $animewp_i18n_results as $animewp_result ) {
	if ( ! $animewp_result['pass'] ) {
		WP_CLI::halt( 1 );
	}
}
