<?php
/** Plugin pattern: two sibling text groups with independent angles. */
namespace Animewp\Blocks;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

return array(
	'title'         => __( '角度の違う2つの文字グループ', 'animewp-blocks' ),
	'description'   => __( '左へ−3度と右へ4度の文字グループを同じパネル内に配置。モバイルは両方0度です。', 'animewp-blocks' ),
	'categories'    => array( 'animewp-blocks' ),
	'viewportWidth' => 1000,
	'content'       => <<<'HTML'
<!-- wp:animewp/panel {"style":{"spacing":{"padding":{"top":"2rem","right":"2rem","bottom":"2rem","left":"2rem"}}}} -->
<section class="wp-block-animewp-panel animewp-panel--boundary-none animewp-panel--shadow-none animewp-panel--text-shadow-none animewp-panel--highlight-none" style="padding-top:2rem;padding-right:2rem;padding-bottom:2rem;padding-left:2rem"><div class="animewp-panel__content"><!-- wp:animewp/text-group {"rotation":-3,"style":{"spacing":{"margin":{"bottom":"3rem"}}}} -->
<div class="wp-block-animewp-text-group" style="--animewp-text-group-rotation:-3deg;margin-bottom:3rem"><div class="animewp-text-group__content"><!-- wp:heading -->
<h2 class="wp-block-heading">ひとつ目のメッセージ</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>見出しと説明を一緒に、左へ少し傾けています。</p>
<!-- /wp:paragraph --></div></div>
<!-- /wp:animewp/text-group -->

<!-- wp:animewp/text-group {"rotation":4} -->
<div class="wp-block-animewp-text-group" style="--animewp-text-group-rotation:4deg"><div class="animewp-text-group__content"><!-- wp:heading -->
<h2 class="wp-block-heading">ふたつ目のメッセージ</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>こちらは右へ少し。内容に合わせて角度を個別に変えられます。</p>
<!-- /wp:paragraph --></div></div>
<!-- /wp:animewp/text-group --></div></section>
<!-- /wp:animewp/panel -->
HTML,
);
