<?php
/**
 * Title: 物語：文章とフェード画像
 * Slug: animewp/story-bleed
 * Categories: animewp-sections
 * Description: 標準ブロックで文章・画像・書体・色・余白を編集できる見本です。
 */
?>
<!-- wp:columns {"className":"animewp-media-columns"} -->
<div class="wp-block-columns animewp-media-columns">
<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:group {"layout":{"type":"constrained"},"className":"animewp-story-copy"} -->
<div class="wp-block-group animewp-story-copy">
<!-- wp:paragraph {"className":"animewp-eyebrow","fontFamily":"animewp-role-display"} -->
<p class="animewp-eyebrow has-animewp-role-display-font-family">STORY</p>
<!-- /wp:paragraph -->
<!-- wp:heading -->
<h2 class="wp-block-heading">出会いの、その先を。</h2>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>あらすじの見出しを入力します。言葉と風景が響き合うよう、余白をゆったり使った紹介です。</p>
<!-- /wp:paragraph -->
<!-- wp:paragraph -->
<p>ここは作品紹介の仮文です。公開する内容に合わせて、文章を差し替えてください。長いあらすじは段落を分け、見出しを添えて読みやすく整えます。</p>
<!-- /wp:paragraph -->
<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="#animewp-characters">物語を読む</a></div>
<!-- /wp:button -->
</div>
<!-- /wp:buttons -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:column -->
<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:image {"sizeSlug":"full","linkDestination":"none","className":"is-style-animewp-fade-start"} -->
<figure class="wp-block-image size-full is-style-animewp-fade-start"><img src="<?php echo esc_url( get_theme_file_uri( 'assets/images/animewp-key-visual-b.svg' ) ); ?>" alt="差し替え用のオリジナル仮画像"/></figure>
<!-- /wp:image -->
</div>
<!-- /wp:column -->
</div>
<!-- /wp:columns -->
