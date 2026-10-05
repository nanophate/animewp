<?php
/**
 * Title: ホームの導入
 * Slug: animewp/home-intro
 * Categories: animewp-sections
 * Inserter: no
 * Description: 標準ブロックで編集できる animewp の構成です。
 */
?>
<!-- wp:group {"layout":{"type":"default"},"className":"animewp-home-intro","align":"wide"} -->
<div class="wp-block-group alignwide animewp-home-intro">
<!-- wp:columns -->
<div class="wp-block-columns">
<!-- wp:column {"width":"45%"} -->
<div class="wp-block-column" style="flex-basis:45%">
<!-- wp:site-title {"level":1,"isLink":false} /-->
<!-- wp:site-tagline /-->
<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="#animewp-news">お知らせを読む</a></div>
<!-- /wp:button -->
</div>
<!-- /wp:buttons -->
</div>
<!-- /wp:column -->
<!-- wp:column {"width":"55%"} -->
<div class="wp-block-column" style="flex-basis:55%">
<!-- wp:image {"sizeSlug":"full","linkDestination":"none"} -->
<figure class="wp-block-image size-full"><img src="<?php echo esc_url( get_theme_file_uri( 'assets/images/animewp-key-visual-a.svg' ) ); ?>" alt="差し替え用の仮画像"/></figure>
<!-- /wp:image -->
</div>
<!-- /wp:column -->
</div>
<!-- /wp:columns -->
</div>
<!-- /wp:group -->
