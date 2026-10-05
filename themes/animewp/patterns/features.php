<?php
/**
 * Title: 特集の2列
 * Slug: animewp/features
 * Categories: animewp-sections
 * Description: 標準ブロックで編集できる animewp の構成です。
 */
?>
<!-- wp:columns -->
<div class="wp-block-columns">
<!-- wp:column {"width":"60%"} -->
<div class="wp-block-column" style="flex-basis:60%">
<!-- wp:group {"layout":{"type":"constrained"},"className":"is-style-animewp-card"} -->
<div class="wp-block-group is-style-animewp-card">
<!-- wp:image {"sizeSlug":"full","linkDestination":"none"} -->
<figure class="wp-block-image size-full"><img src="<?php echo esc_url( get_theme_file_uri( 'assets/images/animewp-key-visual-a.svg' ) ); ?>" alt="差し替え用の仮画像"/></figure>
<!-- /wp:image -->
<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">特集タイトル</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>この特集の内容を紹介します。</p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:column -->
<!-- wp:column {"width":"40%"} -->
<div class="wp-block-column" style="flex-basis:40%">
<!-- wp:group {"layout":{"type":"constrained"},"className":"is-style-animewp-card"} -->
<div class="wp-block-group is-style-animewp-card">
<!-- wp:image {"sizeSlug":"full","linkDestination":"none"} -->
<figure class="wp-block-image size-full"><img src="<?php echo esc_url( get_theme_file_uri( 'assets/images/animewp-key-visual-b.svg' ) ); ?>" alt="差し替え用の仮画像"/></figure>
<!-- /wp:image -->
<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">別の特集</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>文章、画像、ボタンを自由に追加できます。</p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:column -->
</div>
<!-- /wp:columns -->
