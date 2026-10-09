<?php
/** Motion attributes must survive Core rendering with bounded, per-block values. */
if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) { exit( 1 ); }
if ( ! function_exists( 'Animewp\\Blocks\\motion_normalize' ) ) { WP_CLI::error( 'AnimeWP Blocks must be active for motion regressions.' ); }
$GLOBALS['animewp_motion_results'] = array();
function animewp_motion_check( $name, $pass ) {
	$GLOBALS['animewp_motion_results'][] = array( 'test' => $name, 'pass' => (bool) $pass );
	if ( ! $pass ) { WP_CLI::warning( $name ); }
}
function animewp_motion_fixture( $motion, $core_attributes = array() ) {
	$attrs = array_merge( $core_attributes, array( 'className' => 'qa-original', 'animewpMotion' => $motion ) );
	$source = '<!-- wp:group ' . wp_json_encode( $attrs ) . ' --><div class="wp-block-group qa-original" style="margin-top:13px"><!-- wp:paragraph --><p><a href="#news">Navigation remains editable</a></p><!-- /wp:paragraph --></div><!-- /wp:group -->';
	$rendered = do_blocks( $source );
	$tag = new WP_HTML_Tag_Processor( $rendered );
	$tag->next_tag();
	return array(
		'html' => $rendered,
		'class' => (string) $tag->get_attribute( 'class' ),
		'trigger' => $tag->get_attribute( 'data-animewp-scroll-trigger' ),
		'distance' => $tag->get_attribute( 'data-animewp-scroll-distance' ),
		'style' => (string) $tag->get_attribute( 'style' ),
	);
}

$legacy = animewp_motion_fixture( array( 'scrolled' => 'show' ) );
animewp_motion_check( 'legacy scroll settings retain their 64px distance', 'distance' === $legacy['trigger'] && '64' === $legacy['distance'] && str_contains( $legacy['class'], 'is-scrolled-show' ) );
animewp_motion_check( 'motion rendering preserves original classes, inline styles and navigation text', str_contains( $legacy['class'], 'qa-original' ) && str_contains( $legacy['style'], 'margin-top:13px' ) && str_contains( $legacy['html'], '<a href="#news">Navigation remains editable</a>' ) );
animewp_motion_check( 'server markup remains visible until the scroll controller is ready', ! str_contains( $legacy['class'], 'animewp-scroll-ready' ) && ! str_contains( $legacy['html'], ' hidden' ) && ! str_contains( $legacy['style'], 'display:none' ) );

foreach ( array( array( -100, 0 ), array( 0, 0 ), array( 360.6, 361 ), array( 10001, 10000 ), array( '1e309', 64 ) ) as $case ) {
	$rendered = animewp_motion_fixture( array( 'scrolled' => 'show', 'scrollDistance' => $case[0] ) );
	animewp_motion_check( 'scroll distance ' . $case[0] . ' renders as ' . $case[1], (string) $case[1] === $rendered['distance'] );
}
$early = animewp_motion_fixture( array( 'scrolled' => 'show', 'scrollDistance' => 240 ) );
$late = animewp_motion_fixture( array( 'scrolled' => 'hide', 'scrollDistance' => 720 ) );
animewp_motion_check( 'blocks carry independent scroll distances', '240' === $early['distance'] && '720' === $late['distance'] );

$hero = animewp_motion_fixture( array( 'scrolled' => 'navigation', 'scrollTrigger' => 'hero', 'headerAppearance' => true ) );
animewp_motion_check( 'hero navigation emits its own action and trigger', 'hero' === $hero['trigger'] && str_contains( $hero['class'], 'is-scrolled-navigation' ) );
animewp_motion_check( 'header appearance defaults are available to the theme', str_contains( $hero['style'], '--animewp-header-opacity:82%;' ) && str_contains( $hero['style'], '--animewp-header-blur:12px;' ) && str_contains( $hero['style'], '--animewp-header-height:60px;' ) );
$transparent = animewp_motion_fixture( array( 'scrolled' => 'navigation', 'headerAppearance' => true, 'headerOpacity' => -5, 'headerBlur' => 0, 'headerHeight' => 0 ) );
animewp_motion_check( 'transparent headers retain explicit zero opacity and blur', str_contains( $transparent['style'], '--animewp-header-opacity:0%;' ) && str_contains( $transparent['style'], '--animewp-header-blur:0px;' ) && str_contains( $transparent['style'], '--animewp-header-height:48px;' ) );
$maximum = animewp_motion_fixture( array( 'scrolled' => 'navigation', 'headerAppearance' => true, 'headerOpacity' => 200, 'headerBlur' => 99, 'headerHeight' => 999 ) );
animewp_motion_check( 'header appearance cannot exceed its supported ranges', str_contains( $maximum['style'], '--animewp-header-opacity:100%;' ) && str_contains( $maximum['style'], '--animewp-header-blur:24px;' ) && str_contains( $maximum['style'], '--animewp-header-height:120px;' ) );
$disabled = animewp_motion_fixture( array( 'scrolled' => 'show', 'headerAppearance' => false, 'headerOpacity' => 5 ) );
animewp_motion_check( 'appearance values do not alter blocks when the appearance control is disabled', ! str_contains( $disabled['style'], '--animewp-header-' ) );

$invalid = animewp_motion_fixture( array( 'scrolled' => 'show', 'scrollTrigger' => 'hero" onmouseover="alert(1)', 'scrollDistance' => '0;display:none', 'headerAppearance' => true, 'headerOpacity' => '20%;background:red', 'headerBlur' => array( 10 ), 'headerHeight' => false ) );
animewp_motion_check( 'malformed motion attributes use bounded defaults without injecting markup or CSS', 'distance' === $invalid['trigger'] && '64' === $invalid['distance'] && str_contains( $invalid['style'], '--animewp-header-opacity:82%;' ) && str_contains( $invalid['style'], '--animewp-header-blur:12px;' ) && str_contains( $invalid['style'], '--animewp-header-height:60px;' ) && ! str_contains( $invalid['html'], 'onmouseover' ) && ! str_contains( $invalid['style'], 'display:none' ) && ! str_contains( $invalid['style'], 'background:red' ) );

$fallback = 'var(--wp--preset--color--base, #fff)';
foreach ( array(
	array( 'preset color', array( 'backgroundColor' => 'accent' ), 'var(--wp--preset--color--accent, ' . $fallback . ')' ),
	array( 'custom solid color', array( 'style' => array( 'color' => array( 'background' => '#123456' ) ) ), '#123456' ),
	array( 'invalid preset with valid solid fallback', array( 'backgroundColor' => 'accent);color:red', 'style' => array( 'color' => array( 'background' => 'rgb(10 20 30 / 50%)' ) ) ), 'rgb(10 20 30 / 50%)' ),
	array( 'injected CSS fallback', array( 'backgroundColor' => 'bad;slug', 'style' => array( 'color' => array( 'background' => '#fff;opacity:0' ) ) ), $fallback ),
) as $case ) {
	$rendered = animewp_motion_fixture( array( 'scrolled' => 'navigation', 'headerAppearance' => true ), $case[1] );
	animewp_motion_check( 'header surface carries the native ' . $case[0], str_contains( $rendered['style'], '--animewp-header-background:' . $case[2] . ';' ) );
}

WP_CLI::line( wp_json_encode( array( 'results' => $GLOBALS['animewp_motion_results'] ), JSON_PRETTY_PRINT ) );
foreach ( $GLOBALS['animewp_motion_results'] as $result ) { if ( ! $result['pass'] ) { WP_CLI::halt( 1 ); } }
