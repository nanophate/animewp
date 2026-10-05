<?php
/**
 * Title: 動画：横並び紹介
 * Slug: animewp/part-youtube-feature
 * Categories: animewp-parts
 * Description: 標準Columnsで紹介文と既存YouTube blockを並べます。モバイルでは縦に並びます。
 */
?>
<!-- wp:columns {"metadata":{"name":"動画の横並び紹介"}} -->
<div class="wp-block-columns">
<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:paragraph {"className":"is-style-animewp-kicker","metadata":{"name":"補助ラベル"}} -->
<p class="is-style-animewp-kicker">FEATURED VIDEO</p>
<!-- /wp:paragraph -->
<!-- wp:heading {"level":2,"metadata":{"name":"タイトル"}} -->
<h2 class="wp-block-heading">動画タイトルを入力</h2>
<!-- /wp:heading -->
<!-- wp:paragraph {"metadata":{"name":"説明"}} -->
<p>動画の内容や見どころを説明します。タイトルと説明は標準ブロックとして個別に編集できます。</p>
<!-- /wp:paragraph -->
<!-- wp:buttons --><div class="wp-block-buttons"><!-- wp:button {"className":"is-style-outline"} --><div class="wp-block-button is-style-outline"><a class="wp-block-button__link wp-element-button" href="#">関連情報</a></div><!-- /wp:button --></div><!-- /wp:buttons -->
</div>
<!-- /wp:column -->
<!-- wp:column -->
<div class="wp-block-column"><!-- wp:animewp/video {"source":"youtube","posterUrl":"<?php echo esc_attr( wp_make_link_relative( get_theme_file_uri( 'assets/images/animewp-key-visual-b.svg' ) ) ); ?>","buttonLabel":"YouTubeで再生"} -->
<div class="wp-block-animewp-video"><div class="animewp-video__fallback"><img src="<?php echo esc_url( wp_make_link_relative( get_theme_file_uri( 'assets/images/animewp-key-visual-b.svg' ) ) ); ?>" alt="" loading="lazy"/><p>動画を開くと外部サービスへ接続します。閉じるとプレーヤーを削除します。</p></div><div class="animewp-video__content"></div></div>
<!-- /wp:animewp/video --></div>
<!-- /wp:column -->
</div>
<!-- /wp:columns -->
