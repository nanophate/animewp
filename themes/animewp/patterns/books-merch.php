<?php
/**
 * Title: 書籍・グッズ：商品カード
 * Slug: animewp/books-merch
 * Categories: animewp-sections
 * Description: 標準ブロックで文章・画像・書体・色・余白を編集できる見本です。
 */
?>
<!-- wp:columns {"className":"animewp-media-columns"} -->
<div class="wp-block-columns animewp-media-columns">
<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:group {"layout":{"type":"constrained"},"className":"is-style-animewp-frame"} -->
<div class="wp-block-group is-style-animewp-frame">
<!-- wp:image {"sizeSlug":"full","linkDestination":"none","className":"animewp-jacket"} -->
<figure class="wp-block-image size-full animewp-jacket"><img src="<?php echo esc_url( get_theme_file_uri( 'assets/images/animewp-character-b.svg' ) ); ?>" alt="商品画像の仮画像"/></figure>
<!-- /wp:image -->
<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">商品名を入力</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>発売日・価格・仕様を入力</p>
<!-- /wp:paragraph -->
<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="#animewp-products">商品情報へ</a></div>
<!-- /wp:button -->
</div>
<!-- /wp:buttons -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:column -->
<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:group {"layout":{"type":"constrained"},"className":"is-style-animewp-frame"} -->
<div class="wp-block-group is-style-animewp-frame">
<!-- wp:image {"sizeSlug":"full","linkDestination":"none","className":"animewp-jacket"} -->
<figure class="wp-block-image size-full animewp-jacket"><img src="<?php echo esc_url( get_theme_file_uri( 'assets/images/animewp-character-c.svg' ) ); ?>" alt="商品画像の仮画像"/></figure>
<!-- /wp:image -->
<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">長い商品名も折り返して表示します</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>内容と購入先のURLを入力。表示内容を公開前に確認してください。</p>
<!-- /wp:paragraph -->
<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="#animewp-products">商品情報へ</a></div>
<!-- /wp:button -->
</div>
<!-- /wp:buttons -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:column -->
</div>
<!-- /wp:columns -->
