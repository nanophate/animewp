<?php
/**
 * Title: 画像と文章の紹介
 * Slug: animewp/introduction
 * Categories: animewp-sections
 * Description: 標準ブロックで編集できる animewp の構成です。
 */
?>
<!-- wp:columns {"className":"animewp-media-columns"} -->
<div class="wp-block-columns animewp-media-columns">
<!-- wp:column {"width":"45%"} -->
<div class="wp-block-column" style="flex-basis:45%">
<!-- wp:paragraph {"className":"is-style-animewp-kicker"} -->
<p class="is-style-animewp-kicker">INTRODUCTION</p>
<!-- /wp:paragraph -->
<!-- wp:heading -->
<h2 class="wp-block-heading">紹介文の見出し</h2>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>作品のあらすじや見どころを入力します。長い文章も読みやすく折り返し、内容に合わせて高さが伸びます。</p>
<!-- /wp:paragraph -->
<!-- wp:paragraph -->
<p>世界観、登場人物、物語の始まり。伝えたい順番に、文章や画像のブロックを並べてください。</p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:column -->
<!-- wp:column {"width":"55%"} -->
<div class="wp-block-column" style="flex-basis:55%">
<!-- wp:image {"sizeSlug":"full","linkDestination":"none"} -->
<figure class="wp-block-image size-full"><img src="<?php echo esc_url( get_theme_file_uri( 'assets/images/animewp-key-visual-b.svg' ) ); ?>" alt="差し替え用の仮画像"/></figure>
<!-- /wp:image -->
</div>
<!-- /wp:column -->
</div>
<!-- /wp:columns -->
