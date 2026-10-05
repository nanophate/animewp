<?php
/**
 * Title: 作品紹介：カードと3列
 * Slug: animewp/composition-a
 * Categories: animewp-pages
 * Description: 情報カード付きのメイン画像と3列の紹介を組み合わせたページ全体の見本です。
 */
?>
<!-- wp:pattern {"slug":"animewp/hero-card"} /-->
<!-- wp:group {"tagName":"section","align":"full","className":"animewp-section","layout":{"type":"constrained"},"anchor":"animewp-news"} -->
<section id="animewp-news" class="wp-block-group alignfull animewp-section"><!-- wp:group {"layout":{"type":"default"},"className":"animewp-section-heading","align":"wide"} -->
<div class="wp-block-group alignwide animewp-section-heading">
<!-- wp:heading -->
<h2 class="wp-block-heading">お知らせ</h2>
<!-- /wp:heading -->
</div>
<!-- /wp:group -->
<!-- wp:group {"layout":{"type":"default"},"align":"wide"} -->
<div class="wp-block-group alignwide">
<!-- wp:columns -->
<div class="wp-block-columns">
<!-- wp:column {"width":"36%"} -->
<div class="wp-block-column" style="flex-basis:36%">
<!-- wp:pattern {"slug":"animewp/news"} /-->
</div>
<!-- /wp:column -->
<!-- wp:column {"width":"28%"} -->
<div class="wp-block-column" style="flex-basis:28%">
<!-- wp:image {"sizeSlug":"full","linkDestination":"none"} -->
<figure class="wp-block-image size-full"><img src="<?php echo esc_url( get_theme_file_uri( 'assets/images/animewp-key-visual-b.svg' ) ); ?>" alt="差し替え用の仮画像"/></figure>
<!-- /wp:image -->
</div>
<!-- /wp:column -->
<!-- wp:column {"width":"36%"} -->
<div class="wp-block-column" style="flex-basis:36%">
<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">紹介</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>作品の説明を入力します。</p>
<!-- /wp:paragraph -->
<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="#animewp-introduction">紹介を読む</a></div>
<!-- /wp:button -->
</div>
<!-- /wp:buttons -->
</div>
<!-- /wp:column -->
</div>
<!-- /wp:columns -->
</div>
<!-- /wp:group -->
</section>
<!-- /wp:group -->
<!-- wp:group {"tagName":"section","align":"full","className":"animewp-section","layout":{"type":"constrained"},"anchor":"animewp-introduction"} -->
<section id="animewp-introduction" class="wp-block-group alignfull animewp-section"><!-- wp:group {"layout":{"type":"default"},"className":"animewp-section-heading","align":"wide"} -->
<div class="wp-block-group alignwide animewp-section-heading">
<!-- wp:heading -->
<h2 class="wp-block-heading">作品紹介</h2>
<!-- /wp:heading -->
</div>
<!-- /wp:group -->
<!-- wp:group {"layout":{"type":"default"},"align":"wide"} -->
<div class="wp-block-group alignwide">
<!-- wp:pattern {"slug":"animewp/introduction"} /-->
</div>
<!-- /wp:group -->
</section>
<!-- /wp:group -->
<!-- wp:group {"tagName":"section","align":"full","className":"animewp-section","layout":{"type":"constrained"},"anchor":"animewp-characters"} -->
<section id="animewp-characters" class="wp-block-group alignfull animewp-section"><!-- wp:group {"layout":{"type":"default"},"className":"animewp-section-heading","align":"wide"} -->
<div class="wp-block-group alignwide animewp-section-heading">
<!-- wp:heading -->
<h2 class="wp-block-heading">登場人物</h2>
<!-- /wp:heading -->
</div>
<!-- /wp:group -->
<!-- wp:group {"layout":{"type":"default"},"align":"wide"} -->
<div class="wp-block-group alignwide">
<!-- wp:pattern {"slug":"animewp/characters-four"} /-->
</div>
<!-- /wp:group -->
</section>
<!-- /wp:group -->
<!-- wp:group {"tagName":"section","align":"full","className":"animewp-section","layout":{"type":"constrained"},"anchor":"animewp-special"} -->
<section id="animewp-special" class="wp-block-group alignfull animewp-section"><!-- wp:group {"layout":{"type":"default"},"className":"animewp-section-heading","align":"wide"} -->
<div class="wp-block-group alignwide animewp-section-heading">
<!-- wp:heading -->
<h2 class="wp-block-heading">特集</h2>
<!-- /wp:heading -->
</div>
<!-- /wp:group -->
<!-- wp:group {"layout":{"type":"default"},"align":"wide"} -->
<div class="wp-block-group alignwide">
<!-- wp:pattern {"slug":"animewp/features"} /-->
</div>
<!-- /wp:group -->
</section>
<!-- /wp:group -->
<!-- wp:group {"tagName":"section","align":"full","className":"animewp-section","layout":{"type":"constrained"},"anchor":"animewp-gallery"} -->
<section id="animewp-gallery" class="wp-block-group alignfull animewp-section"><!-- wp:group {"layout":{"type":"default"},"className":"animewp-section-heading","align":"wide"} -->
<div class="wp-block-group alignwide animewp-section-heading">
<!-- wp:heading -->
<h2 class="wp-block-heading">ギャラリー</h2>
<!-- /wp:heading -->
</div>
<!-- /wp:group -->
<!-- wp:group {"layout":{"type":"default"},"align":"wide"} -->
<div class="wp-block-group alignwide">
<!-- wp:pattern {"slug":"animewp/gallery"} /-->
</div>
<!-- /wp:group -->
</section>
<!-- /wp:group -->
<!-- wp:group {"tagName":"section","align":"full","className":"animewp-section","layout":{"type":"constrained"},"anchor":"animewp-movie"} -->
<section id="animewp-movie" class="wp-block-group alignfull animewp-section"><!-- wp:group {"layout":{"type":"default"},"className":"animewp-section-heading","align":"wide"} -->
<div class="wp-block-group alignwide animewp-section-heading">
<!-- wp:heading -->
<h2 class="wp-block-heading">映像</h2>
<!-- /wp:heading -->
</div>
<!-- /wp:group -->
<!-- wp:group {"layout":{"type":"default"},"align":"wide"} -->
<div class="wp-block-group alignwide">
<!-- wp:pattern {"slug":"animewp/video"} /-->
</div>
<!-- /wp:group -->
</section>
<!-- /wp:group -->
<!-- wp:group {"tagName":"section","align":"full","className":"animewp-section","layout":{"type":"constrained"},"anchor":"animewp-credits"} -->
<section id="animewp-credits" class="wp-block-group alignfull animewp-section"><!-- wp:group {"layout":{"type":"default"},"className":"animewp-section-heading","align":"wide"} -->
<div class="wp-block-group alignwide animewp-section-heading">
<!-- wp:heading -->
<h2 class="wp-block-heading">キャスト・スタッフ</h2>
<!-- /wp:heading -->
</div>
<!-- /wp:group -->
<!-- wp:group {"layout":{"type":"default"},"align":"wide"} -->
<div class="wp-block-group alignwide">
<!-- wp:pattern {"slug":"animewp/credits"} /-->
</div>
<!-- /wp:group -->
</section>
<!-- /wp:group -->
<!-- wp:group {"tagName":"section","align":"full","className":"animewp-section","layout":{"type":"constrained"},"anchor":"animewp-information"} -->
<section id="animewp-information" class="wp-block-group alignfull animewp-section"><!-- wp:group {"layout":{"type":"default"},"className":"animewp-section-heading","align":"wide"} -->
<div class="wp-block-group alignwide animewp-section-heading">
<!-- wp:heading -->
<h2 class="wp-block-heading">作品情報</h2>
<!-- /wp:heading -->
</div>
<!-- /wp:group -->
<!-- wp:group {"layout":{"type":"default"},"align":"wide"} -->
<div class="wp-block-group alignwide">
<!-- wp:pattern {"slug":"animewp/optional-info"} /-->
</div>
<!-- /wp:group -->
</section>
<!-- /wp:group -->
