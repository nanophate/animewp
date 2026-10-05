<?php
/**
 * Title: お知らせと映像を並べる
 * Slug: animewp/news-and-pv
 * Categories: animewp-sections
 * Description: 標準ブロックで文章・画像・書体・色・余白を編集できる見本です。
 */
?>
<!-- wp:columns {"className":"animewp-media-columns"} -->
<div class="wp-block-columns animewp-media-columns">
<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:group {"layout":{"type":"default"}} -->
<div class="wp-block-group">
<!-- wp:group {"layout":{"type":"default"},"align":"wide","className":"animewp-section-heading"} -->
<div class="wp-block-group alignwide animewp-section-heading">
<!-- wp:paragraph {"className":"animewp-eyebrow","fontFamily":"animewp-role-display"} -->
<p class="animewp-eyebrow has-animewp-role-display-font-family">NEWS</p>
<!-- /wp:paragraph -->
<!-- wp:heading -->
<h2 class="wp-block-heading">お知らせ</h2>
<!-- /wp:heading -->
</div>
<!-- /wp:group -->
<!-- wp:pattern {"slug":"animewp/news"} /-->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:column -->
<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:group {"layout":{"type":"default"}} -->
<div class="wp-block-group">
<!-- wp:image {"sizeSlug":"full","linkDestination":"none"} -->
<figure class="wp-block-image size-full"><img src="<?php echo esc_url( get_theme_file_uri( 'assets/images/animewp-key-visual-b.svg' ) ); ?>" alt="差し替え用のオリジナル仮画像"/></figure>
<!-- /wp:image -->
<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">最新映像</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>画像とリンクを差し替えて、公開中の映像を案内します。</p>
<!-- /wp:paragraph -->
<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="#animewp-movie">映像一覧へ</a></div>
<!-- /wp:button -->
</div>
<!-- /wp:buttons -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:column -->
</div>
<!-- /wp:columns -->
