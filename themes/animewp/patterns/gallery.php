<?php
/**
 * Title: 画像ギャラリー
 * Slug: animewp/gallery
 * Categories: animewp-sections
 * Description: 作品の画像を並べる標準ギャラリーブロックです。画像と代替テキストを差し替えて使います。
 */
?>
<!-- wp:gallery {"columns":4,"linkTo":"none"} -->
<figure class="wp-block-gallery has-nested-images columns-4 is-cropped"><!-- wp:image {"sizeSlug":"full","linkDestination":"none","lightbox":{"enabled":true}} -->
<figure class="wp-block-image size-full"><img src="<?php echo esc_url( get_theme_file_uri( 'assets/images/animewp-key-visual-a.svg' ) ); ?>" alt="差し替え用のギャラリー画像"/></figure>
<!-- /wp:image -->
<!-- wp:image {"sizeSlug":"full","linkDestination":"none","lightbox":{"enabled":true}} -->
<figure class="wp-block-image size-full"><img src="<?php echo esc_url( get_theme_file_uri( 'assets/images/animewp-key-visual-b.svg' ) ); ?>" alt="差し替え用のギャラリー画像"/></figure>
<!-- /wp:image -->
<!-- wp:image {"sizeSlug":"full","linkDestination":"none","lightbox":{"enabled":true}} -->
<figure class="wp-block-image size-full"><img src="<?php echo esc_url( get_theme_file_uri( 'assets/images/animewp-key-visual-a.svg' ) ); ?>" alt="差し替え用のギャラリー画像"/></figure>
<!-- /wp:image -->
<!-- wp:image {"sizeSlug":"full","linkDestination":"none","lightbox":{"enabled":true}} -->
<figure class="wp-block-image size-full"><img src="<?php echo esc_url( get_theme_file_uri( 'assets/images/animewp-key-visual-b.svg' ) ); ?>" alt="差し替え用のギャラリー画像"/></figure>
<!-- /wp:image -->
</figure>
<!-- /wp:gallery -->
