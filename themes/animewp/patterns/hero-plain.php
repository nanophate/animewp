<?php
/**
 * Title: メイン画像：文章と縦書き見出し
 * Slug: animewp/hero-plain
 * Categories: animewp-sections
 * Description: 背景画像に作品名・紹介文と短い縦書き見出しを重ねます。狭い画面では見出しも横書きになります。
 */
?>
<!-- wp:cover {"url":"<?php echo esc_url( get_theme_file_uri( 'assets/images/animewp-key-visual-b.svg' ) ); ?>","dimRatio":60,"overlayColor":"animewp-base","isUserOverlayColor":true,"minHeight":680,"isDark":false,"align":"full","className":"animewp-hero","layout":{"type":"constrained"}} -->
<div class="wp-block-cover alignfull is-light animewp-hero" style="min-height:680px"><span aria-hidden="true" class="wp-block-cover__background has-animewp-base-background-color has-background-dim-60 has-background-dim"></span><img class="wp-block-cover__image-background" alt="" src="<?php echo esc_url( get_theme_file_uri( 'assets/images/animewp-key-visual-b.svg' ) ); ?>" data-object-fit="cover"/><div class="wp-block-cover__inner-container"><!-- wp:group {"layout":{"type":"default"},"className":"animewp-hero-safe","align":"wide"} -->
<div class="wp-block-group alignwide animewp-hero-safe">
<!-- wp:columns -->
<div class="wp-block-columns">
<!-- wp:column {"width":"80%"} -->
<div class="wp-block-column" style="flex-basis:80%">
<!-- wp:group {"layout":{"type":"constrained"},"className":"animewp-hero-info"} -->
<div class="wp-block-group animewp-hero-info">
<!-- wp:paragraph {"className":"is-style-animewp-kicker"} -->
<p class="is-style-animewp-kicker">ここから、物語がはじまる。</p>
<!-- /wp:paragraph -->
<!-- wp:heading {"level":1} -->
<h1 class="wp-block-heading">作品名を入力</h1>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>作品の紹介文を入力します。短い言葉で、この物語の入口を伝えてください。</p>
<!-- /wp:paragraph -->
<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="#animewp-introduction">作品紹介を読む</a></div>
<!-- /wp:button -->
</div>
<!-- /wp:buttons -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:column -->
<!-- wp:column {"width":"20%"} -->
<div class="wp-block-column" style="flex-basis:20%">
<!-- wp:heading {"className":"is-style-animewp-short-vertical"} -->
<h2 class="wp-block-heading is-style-animewp-short-vertical">物語の続きを、ここから。</h2>
<!-- /wp:heading -->
</div>
<!-- /wp:column -->
</div>
<!-- /wp:columns -->
</div>
<!-- /wp:group -->
</div></div>
<!-- /wp:cover -->
