<?php
/**
 * Title: 音楽：ジャケットと発売情報
 * Slug: animewp/music-release
 * Categories: animewp-sections
 * Description: 標準ブロックで文章・画像・書体・色・余白を編集できる見本です。
 */
?>
<!-- wp:columns {"className":"animewp-media-columns"} -->
<div class="wp-block-columns animewp-media-columns">
<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:image {"sizeSlug":"full","linkDestination":"none","className":"animewp-jacket"} -->
<figure class="wp-block-image size-full animewp-jacket"><img src="<?php echo esc_url( get_theme_file_uri( 'assets/images/animewp-character-c.svg' ) ); ?>" alt="差し替え用ジャケット仮画像"/></figure>
<!-- /wp:image -->
</div>
<!-- /wp:column -->
<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:group {"layout":{"type":"default"}} -->
<div class="wp-block-group">
<!-- wp:paragraph {"className":"animewp-eyebrow","fontFamily":"animewp-role-mono"} -->
<p class="animewp-eyebrow has-animewp-role-mono-font-family">OPENING / ENDING</p>
<!-- /wp:paragraph -->
<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">楽曲名を入力</h3>
<!-- /wp:heading -->
<!-- wp:paragraph {"fontFamily":"animewp-role-accent-hand"} -->
<p class="has-animewp-role-accent-hand-font-family">アーティスト名を入力</p>
<!-- /wp:paragraph -->
<!-- wp:paragraph {"fontFamily":"animewp-role-mono"} -->
<p class="has-animewp-role-mono-font-family">発売日・配信開始日を入力</p>
<!-- /wp:paragraph -->
<!-- wp:paragraph -->
<p>楽曲やアーティストの紹介文を入力します。長い文章にも対応します。</p>
<!-- /wp:paragraph -->
<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="#animewp-music">楽曲の詳細へ</a></div>
<!-- /wp:button -->
</div>
<!-- /wp:buttons -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:column -->
</div>
<!-- /wp:columns -->
