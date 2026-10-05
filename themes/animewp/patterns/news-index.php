<?php
/**
 * Title: ページ送り付きの記事一覧
 * Slug: animewp/news-index
 * Categories: animewp-sections
 * Inserter: no
 * Description: 標準ブロックで編集できる animewp の構成です。
 */
?>
<!-- wp:query {"queryId":0,"query":{"perPage":10,"pages":0,"offset":0,"postType":"post","order":"desc","orderBy":"date","author":"","search":"","exclude":[],"sticky":"","inherit":true},"className":"animewp-news-query"} -->
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
<!-- wp:query-pagination {"layout":{"type":"flex","justifyContent":"space-between"}} -->
<!-- wp:query-pagination-previous /-->
<!-- wp:query-pagination-numbers /-->
<!-- wp:query-pagination-next /-->

<!-- /wp:query-pagination -->
<!-- wp:query-no-results -->
<!-- wp:paragraph -->
<p>表示できるお知らせはありません。</p>
<!-- /wp:paragraph -->

<!-- /wp:query-no-results -->
</div>
<!-- /wp:query -->
