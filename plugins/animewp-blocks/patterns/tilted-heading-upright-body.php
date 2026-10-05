<?php
/** Plugin pattern: independently rotated background and heading, with upright body. */
namespace Animewp\Blocks;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

return array(
	'title'         => __( '背景と傾いた見出し・水平本文', 'animewp-blocks' ),
	'description'   => __( '装飾背景は−2度、文字グループの見出しは−3度、外側の本文は水平。パネル全体は0度です。', 'animewp-blocks' ),
	'categories'    => array( 'animewp-blocks' ),
	'viewportWidth' => 1000,
	'content'       => <<<'HTML'
<!-- wp:animewp/panel {"backdropEnabled":true,"backgroundRotation":-2,"style":{"spacing":{"padding":{"top":"2rem","right":"2rem","bottom":"2rem","left":"2rem"}}}} -->
<section class="wp-block-animewp-panel animewp-panel--boundary-none animewp-panel--shadow-none animewp-panel--text-shadow-none animewp-panel--highlight-none animewp-panel--backdrop" style="--animewp-panel-backdrop-rotation:-2deg;padding-top:2rem;padding-right:2rem;padding-bottom:2rem;padding-left:2rem"><div class="animewp-panel__content"><!-- wp:animewp/text-group {"rotation":-3,"style":{"spacing":{"margin":{"bottom":"2rem"}}}} -->
<div class="wp-block-animewp-text-group" style="--animewp-text-group-rotation:-3deg;margin-bottom:2rem"><div class="animewp-text-group__content"><!-- wp:heading -->
<h2 class="wp-block-heading">ここに伝えたい見出し</h2>
<!-- /wp:heading --></div></div>
<!-- /wp:animewp/text-group -->

<!-- wp:paragraph -->
<p>ここに本文を入力します。見出しに動きをつけながら、詳しい説明は水平に保ち、読みやすく届けます。</p>
<!-- /wp:paragraph --></div></section>
<!-- /wp:animewp/panel -->
HTML,
);
