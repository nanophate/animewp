<?php
/**
 * Title: 人物紹介：画像と詳細
 * Slug: animewp/character-profile
 * Categories: animewp-sections
 * Description: 標準ブロックで文章・画像・書体・色・余白を編集できる見本です。
 */
?>
<!-- wp:columns {"className":"animewp-media-columns"} -->
<div class="wp-block-columns animewp-media-columns">
<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:image {"sizeSlug":"full","linkDestination":"none","className":"is-style-animewp-portrait"} -->
<figure class="wp-block-image size-full is-style-animewp-portrait"><img src="<?php echo esc_url( get_theme_file_uri( 'assets/images/animewp-character-a.svg' ) ); ?>" alt="登場人物の差し替え用仮画像"/></figure>
<!-- /wp:image -->
</div>
<!-- /wp:column -->
<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:group {"layout":{"type":"default"}} -->
<div class="wp-block-group">
<!-- wp:paragraph {"className":"animewp-eyebrow","fontFamily":"animewp-role-mono"} -->
<p class="animewp-eyebrow has-animewp-role-mono-font-family">CHARACTER 01</p>
<!-- /wp:paragraph -->
<!-- wp:heading -->
<h2 class="wp-block-heading">人物名を入力</h2>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>読みがな / CV：声優名を入力</p>
<!-- /wp:paragraph -->
<!-- wp:paragraph -->
<p>人物の紹介文を入力します。好きなもの、物語での役割、関係性など、伝えたい項目を段落ごとにまとめます。</p>
<!-- /wp:paragraph -->
<!-- wp:paragraph -->
<p>長い名前や複数行の説明でも切り捨てずに表示します。必要な項目だけ残して使ってください。</p>
<!-- /wp:paragraph -->
<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="#animewp-characters">人物一覧へ</a></div>
<!-- /wp:button -->
</div>
<!-- /wp:buttons -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:column -->
</div>
<!-- /wp:columns -->
