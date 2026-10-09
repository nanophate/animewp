<?php
/**
 * Title: ヘッダー：キービジュアルを見せるメニュー
 * Slug: animewp/header-hero
 * Categories: animewp-headers
 * Block Types: core/template-part/header
 * Description: 最初は右上の小さなメニューボタンだけを表示し、キービジュアルを通過すると薄い半透明のナビゲーションを表示します。ロゴとサイト名は含みません。スクロールでの切り替えには AnimeWP Blocks が必要です。
 */
?>
<!-- wp:group {"align":"full","className":"animewp-header animewp-header\u002d\u002dhero animewp-header\u002d\u002dpetal","metadata":{"name":"スクロールで切り替えるヘッダー"},"animewpMotion":{"scrolled":"navigation","scrollTrigger":"hero","headerAppearance":true,"headerOpacity":76,"headerBlur":14,"headerHeight":56},"style":{"spacing":{"padding":{"top":"6px","right":"clamp(16px, 4vw, 48px)","bottom":"6px","left":"clamp(16px, 4vw, 48px)"},"blockGap":"16px","margin":{"top":"0","bottom":"0"}}},"layout":{"type":"flex","justifyContent":"center","flexWrap":"nowrap"}} -->
<div class="wp-block-group alignfull animewp-header animewp-header--hero animewp-header--petal" style="margin-top:0;margin-bottom:0;padding-top:6px;padding-right:clamp(16px, 4vw, 48px);padding-bottom:6px;padding-left:clamp(16px, 4vw, 48px)"><!-- wp:navigation {"overlayMenu":"mobile","hasIcon":false,"overlayBackgroundColor":"base","overlayTextColor":"contrast","metadata":{"name":"ヘッダーメニュー"},"style":{"spacing":{"blockGap":"clamp(16px, 2.2vw, 32px)"}},"layout":{"type":"flex","justifyContent":"center"}} -->
<!-- wp:navigation-link {"label":"お知らせ","url":"#news","kind":"custom","isTopLevelLink":true} /-->

<!-- wp:navigation-link {"label":"作品紹介","url":"#introduction","kind":"custom","isTopLevelLink":true} /-->

<!-- wp:navigation-link {"label":"ストーリー","url":"#story","kind":"custom","isTopLevelLink":true} /-->

<!-- wp:navigation-link {"label":"スタッフ・キャスト","url":"#staff","kind":"custom","isTopLevelLink":true} /-->

<!-- wp:navigation-link {"label":"放送・配信","url":"#onair","kind":"custom","isTopLevelLink":true} /-->
<!-- /wp:navigation --></div>
<!-- /wp:group -->
