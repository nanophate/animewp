<?php
/**
 * Title: 最新のお知らせ3件
 * Slug: animewp/news-latest
 * Categories: animewp-examples
 * Inserter: no
 * Description: 固定ページ内で通常の投稿を新しい順に3件表示します。
 */
if ( ! defined( 'ABSPATH' ) ) { exit; }
?>
<!-- wp:query {"queryId":1,"query":{"perPage":3,"pages":0,"offset":0,"postType":"post","order":"desc","orderBy":"date","author":"","search":"","exclude":[],"sticky":"","inherit":false},"className":"animewp-news-query"} -->
<div class="wp-block-query animewp-news-query"><!-- wp:post-template {"className":"animewp-news-list"} -->
<!-- wp:group {"layout":{"type":"constrained"},"className":"animewp-news-row"} -->
<div class="wp-block-group animewp-news-row">
<!-- wp:post-date {"format":"Y.m.d"} /-->
<!-- wp:group {"layout":{"type":"constrained"},"className":"animewp-news-copy"} -->
<div class="wp-block-group animewp-news-copy">
<!-- wp:post-title {"isLink":true,"level":3} /-->
<!-- wp:post-terms {"term":"category"} /-->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:group -->
<!-- /wp:post-template -->
<!-- wp:query-no-results -->
<!-- wp:paragraph -->
<p>表示できるお知らせはありません。</p>
<!-- /wp:paragraph -->
<!-- /wp:query-no-results -->
</div>
<!-- /wp:query -->
