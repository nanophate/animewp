<?php
/**
 * Title: 情報カードのヒーロー
 * Slug: animewp/hero-card
 * Categories: animewp-sections
 * Description: 標準ブロックで編集できる animewp の構成です。
 */
?>
<!-- wp:cover {"url":"<?php echo esc_url( get_theme_file_uri( 'assets/images/animewp-key-visual-a.svg' ) ); ?>","dimRatio":30,"overlayColor":"animewp-base","isUserOverlayColor":true,"minHeight":680,"isDark":false,"align":"full","className":"animewp-hero","layout":{"type":"constrained"}} -->
<div class="wp-block-cover alignfull is-light animewp-hero" style="min-height:680px"><span aria-hidden="true" class="wp-block-cover__background has-animewp-base-background-color has-background-dim-30 has-background-dim"></span><img class="wp-block-cover__image-background" alt="" src="<?php echo esc_url( get_theme_file_uri( 'assets/images/animewp-key-visual-a.svg' ) ); ?>" data-object-fit="cover"/><div class="wp-block-cover__inner-container"><!-- wp:group {"layout":{"type":"default"},"className":"animewp-hero-safe","align":"wide"} -->
<div class="wp-block-group alignwide animewp-hero-safe">
<!-- wp:group {"layout":{"type":"constrained"},"className":"animewp-hero-info is-style-animewp-card"} -->
<div class="wp-block-group animewp-hero-info is-style-animewp-card">
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
<!-- /wp:group -->
</div></div>
<!-- /wp:cover -->
