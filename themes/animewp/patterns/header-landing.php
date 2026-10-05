<?php
/**
 * Title: ヘッダー：ページ内メニュー
 * Slug: animewp/header-landing
 * Categories: animewp-headers
 * Block Types: core/template-part/header
 * Description: 作品紹介ページの各セクションへ移動する上部メニューです。リンク先のHTMLアンカーを合わせて使います。
 */
?>
<!-- wp:group {"layout":{"type":"flex"},"className":"animewp-header animewp-header--top","align":"full"} -->
<div class="wp-block-group alignfull animewp-header animewp-header--top">
<!-- wp:group {"layout":{"type":"flex"},"className":"animewp-brand"} -->
<div class="wp-block-group animewp-brand">
<!-- wp:site-logo {"width":42} /-->
<!-- wp:site-title {"level":0} /-->
</div>
<!-- /wp:group -->
<!-- wp:navigation {"overlayMenu":"mobile","layout":{"type":"flex","justifyContent":"right"}} -->
<!-- wp:navigation-link {"label":"お知らせ","url":"#animewp-news","kind":"custom","isTopLevelLink":true} /-->
<!-- wp:navigation-link {"label":"作品紹介","url":"#animewp-introduction","kind":"custom","isTopLevelLink":true} /-->
<!-- wp:navigation-link {"label":"人物","url":"#animewp-characters","kind":"custom","isTopLevelLink":true} /-->
<!-- wp:navigation-link {"label":"画像","url":"#animewp-gallery","kind":"custom","isTopLevelLink":true} /-->
<!-- wp:navigation-link {"label":"映像","url":"#animewp-movie","kind":"custom","isTopLevelLink":true} /-->

<!-- /wp:navigation -->
</div>
<!-- /wp:group -->
