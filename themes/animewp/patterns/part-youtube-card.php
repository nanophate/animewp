<?php
/**
 * Title: 動画：YouTubeカード
 * Slug: animewp/part-youtube-card
 * Categories: animewp-parts
 * Description: Core見出し・説明と既存動画blockを組み合わせます。タイトル・本文は標準ブロックのまま編集できます。
 */
?>
<!-- wp:group {"className":"is-style-animewp-card","layout":{"type":"constrained"},"metadata":{"name":"YouTubeカード"}} -->
<div class="wp-block-group is-style-animewp-card">
<!-- wp:paragraph {"className":"is-style-animewp-kicker","metadata":{"name":"補助ラベル"}} -->
<p class="is-style-animewp-kicker">VIDEO</p>
<!-- /wp:paragraph -->
<!-- wp:heading {"level":3,"metadata":{"name":"タイトル"}} -->
<h3 class="wp-block-heading">動画タイトルを入力</h3>
<!-- /wp:heading -->
<!-- wp:paragraph {"metadata":{"name":"説明"}} -->
<p>YouTubeのURLを設定してください。外部サービスへ接続するのは再生ボタンを押した後です。</p>
<!-- /wp:paragraph -->
<!-- wp:animewp/video {"source":"youtube","posterUrl":"<?php echo esc_attr( wp_make_link_relative( get_theme_file_uri( 'assets/images/animewp-key-visual-a.svg' ) ) ); ?>","buttonLabel":"YouTubeで再生"} -->
<div class="wp-block-animewp-video"><div class="animewp-video__fallback"><img src="<?php echo esc_url( wp_make_link_relative( get_theme_file_uri( 'assets/images/animewp-key-visual-a.svg' ) ) ); ?>" alt="" loading="lazy"/><p>動画を開くと外部サービスへ接続します。閉じるとプレーヤーを削除します。</p></div><div class="animewp-video__content"></div></div>
<!-- /wp:animewp/video -->
</div>
<!-- /wp:group -->
