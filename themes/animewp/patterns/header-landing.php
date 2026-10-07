<?php
/**
 * Title: ヘッダー：ページ内メニュー
 * Slug: animewp/header-landing
 * Categories: animewp-headers
 * Block Types: core/template-part/header
 * Description: 作品紹介ページの各セクションへ移動する上部メニューです。リンク先のHTMLアンカーを合わせて使います。
 */
?>
<!-- wp:group {"align":"full","className":"animewp-header animewp-header\u002d\u002dtop","style":{"spacing":{"padding":{"top":"clamp(14px, 2vw, 20px)","right":"clamp(20px, 4vw, 64px)","bottom":"clamp(14px, 2vw, 20px)","left":"clamp(20px, 4vw, 64px)"},"blockGap":"clamp(16px, 2vw, 24px)","margin":{"top":"0","bottom":"0"}}},"layout":{"justifyContent":"space-between","flexWrap":"wrap","type":"flex"}} -->
<div class="wp-block-group alignfull animewp-header animewp-header--top" id="top" style="margin-top:0;margin-bottom:0;padding-top:clamp(14px, 2vw, 20px);padding-right:clamp(20px, 4vw, 64px);padding-bottom:clamp(14px, 2vw, 20px);padding-left:clamp(20px, 4vw, 64px)"><!-- wp:group {"className":"animewp-brand","style":{"spacing":{"blockGap":"12px"}},"layout":{"type":"flex"}} -->
<div class="wp-block-group animewp-brand"><!-- wp:site-logo {"width":42} /-->

<!-- wp:site-title {"level":0} /--></div>
<!-- /wp:group -->

<!-- wp:navigation {"style":{"spacing":{"blockGap":"clamp(18px, 1.875vw, 24px)"}},"layout":{"type":"flex","justifyContent":"right"}} -->
<!-- wp:navigation-link {"label":"お知らせ","url":"#animewp-news","kind":"custom","isTopLevelLink":true} /-->

<!-- wp:navigation-link {"label":"作品紹介","url":"#animewp-introduction","kind":"custom","isTopLevelLink":true} /-->

<!-- wp:navigation-link {"label":"人物","url":"#animewp-characters","kind":"custom","isTopLevelLink":true} /-->

<!-- wp:navigation-link {"label":"画像","url":"#animewp-gallery","kind":"custom","isTopLevelLink":true} /-->

<!-- wp:navigation-link {"label":"映像","url":"#animewp-movie","kind":"custom","isTopLevelLink":true} /-->
<!-- /wp:navigation --></div>
<!-- /wp:group -->
