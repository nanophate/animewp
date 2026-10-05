<?php
/**
 * Title: 映像：画像と動画
 * Slug: animewp/video
 * Categories: animewp-sections
 * Description: 画像・映像タイトル・説明と標準動画ブロックをまとめた部品です。動画ファイルを追加して使います。
 */
?>
<!-- wp:group {"layout":{"type":"constrained"},"className":"animewp-video-placeholder"} -->
<div class="wp-block-group animewp-video-placeholder">
<!-- wp:image {"sizeSlug":"full","linkDestination":"none"} -->
<figure class="wp-block-image size-full"><img src="<?php echo esc_url( get_theme_file_uri( 'assets/images/animewp-key-visual-b.svg' ) ); ?>" alt="差し替え用の仮画像"/></figure>
<!-- /wp:image -->
<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">映像タイトル</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>動画ブロックにメディアを追加してください。</p>
<!-- /wp:paragraph -->
<!-- wp:video -->
<figure class="wp-block-video"></figure>
<!-- /wp:video -->
</div>
<!-- /wp:group -->
