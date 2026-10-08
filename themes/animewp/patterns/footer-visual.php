<?php
/**
 * Title: フッター：画像とサイトマップ
 * Slug: animewp/footer-visual
 * Categories: animewp-footers
 * Description: 標準ブロックで文章・画像・書体・色・余白を編集できる見本です。
 * Block Types: core/template-part/footer
 */
?>
<!-- wp:cover {"url":"<?php echo esc_url( get_theme_file_uri( 'assets/images/animewp-key-visual-b.svg' ) ); ?>","dimRatio":0,"overlayColor":"base","isUserOverlayColor":true,"minHeight":360,"isDark":false,"align":"full","className":"animewp-footer-visual","layout":{"type":"constrained"}} -->
<div class="wp-block-cover alignfull is-light animewp-footer-visual" style="min-height:360px"><span aria-hidden="true" class="wp-block-cover__background has-base-background-color has-background-dim-0 has-background-dim"></span><img class="wp-block-cover__image-background" alt="" src="<?php echo esc_url( get_theme_file_uri( 'assets/images/animewp-key-visual-b.svg' ) ); ?>" data-object-fit="cover"/><div class="wp-block-cover__inner-container">
<!-- wp:columns {"className":"animewp-media-columns"} -->
<div class="wp-block-columns animewp-media-columns">
<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:group {"layout":{"type":"default"}} -->
<div class="wp-block-group">
<!-- wp:site-title {"level":0} /-->
<!-- wp:paragraph {"fontFamily":"animewp-role-accent-hand"} -->
<p class="has-animewp-role-accent-hand-font-family">作品の余韻を、この先へ。</p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:column -->
<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:group {"layout":{"type":"default"}} -->
<div class="wp-block-group">
<!-- wp:paragraph {"className":"animewp-eyebrow","fontFamily":"animewp-role-display"} -->
<p class="animewp-eyebrow has-animewp-role-display-font-family">OFFICIAL LINKS</p>
<!-- /wp:paragraph -->
<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="#animewp-social">SNSのURLを設定</a></div>
<!-- /wp:button -->
</div>
<!-- /wp:buttons -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:column -->
</div>
<!-- /wp:columns -->
</div></div>
<!-- /wp:cover -->
<!-- wp:group {"layout":{"type":"default"},"align":"wide","className":"animewp-footer-links"} -->
<div class="wp-block-group alignwide animewp-footer-links">
<!-- wp:navigation {"overlayMenu":"never","layout":{"type":"flex","justifyContent":"left"}} -->
<!-- wp:navigation-link {"label":"お知らせ","url":"#news","kind":"custom","isTopLevelLink":true} /-->
<!-- wp:navigation-link {"label":"作品紹介","url":"#introduction","kind":"custom","isTopLevelLink":true} /-->
<!-- wp:navigation-link {"label":"ストーリー","url":"#story","kind":"custom","isTopLevelLink":true} /-->
<!-- wp:navigation-link {"label":"放送・配信","url":"#onair","kind":"custom","isTopLevelLink":true} /-->
<!-- wp:navigation-link {"label":"スタッフ・キャスト","url":"#staff","kind":"custom","isTopLevelLink":true} /-->

<!-- /wp:navigation -->
<!-- wp:group {"layout":{"type":"default"},"className":"animewp-footer-meta"} -->
<div class="wp-block-group animewp-footer-meta">
<!-- wp:paragraph -->
<p>プライバシーポリシー・お問い合わせ：各固定ページを作成し、リンクを設定してください。</p>
<!-- /wp:paragraph -->
<!-- wp:paragraph {"className":"animewp-footer-credit"} -->
<p class="animewp-footer-credit">© 権利者名を入力</p>
<!-- /wp:paragraph -->
<!-- wp:paragraph {"className":"animewp-page-top","fontFamily":"animewp-role-display"} -->
<p class="animewp-page-top has-animewp-role-display-font-family"><a href="#">PAGE TOP ↑</a></p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:group -->
