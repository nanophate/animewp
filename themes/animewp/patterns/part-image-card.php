<?php
/**
 * Title: カード：画像と説明
 * Slug: animewp/part-image-card
 * Categories: animewp-parts
 * Description: 画像・見出し・本文・ボタンがすべて標準ブロックのカードです。
 */
?>
<!-- wp:group {"className":"is-style-animewp-card","layout":{"type":"constrained"},"metadata":{"name":"画像カード"}} -->
<div class="wp-block-group is-style-animewp-card">
<!-- wp:image {"sizeSlug":"large","linkDestination":"none","metadata":{"name":"画像"}} -->
<figure class="wp-block-image size-large"><img src="<?php echo esc_url( get_theme_file_uri( 'assets/images/animewp-key-visual-a.svg' ) ); ?>" alt="差し替え用の画像"/></figure>
<!-- /wp:image -->
<!-- wp:heading {"level":3,"metadata":{"name":"見出し"}} -->
<h3 class="wp-block-heading">カードの見出し</h3>
<!-- /wp:heading -->
<!-- wp:paragraph {"metadata":{"name":"説明"}} -->
<p>画像に添える紹介文を入力します。</p>
<!-- /wp:paragraph -->
<!-- wp:buttons {"metadata":{"name":"リンク"}} -->
<div class="wp-block-buttons"><!-- wp:button --><div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="#">リンク先を設定してください</a></div><!-- /wp:button --></div>
<!-- /wp:buttons -->
</div>
<!-- /wp:group -->
