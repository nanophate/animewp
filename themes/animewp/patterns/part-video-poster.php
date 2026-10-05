<?php
/**
 * Title: 動画：ポスターと再生
 * Slug: animewp/part-video-poster
 * Categories: animewp-parts
 * Description: ローカル仮ポスターを設定した最小の既存動画blockです。YouTube URLを入力すると利用できます。
 */
?>
<!-- wp:animewp/video {"source":"youtube","posterUrl":"<?php echo esc_attr( wp_make_link_relative( get_theme_file_uri( 'assets/images/animewp-key-visual-a.svg' ) ) ); ?>","buttonLabel":"YouTubeで再生"} -->
<div class="wp-block-animewp-video"><div class="animewp-video__fallback"><img src="<?php echo esc_url( wp_make_link_relative( get_theme_file_uri( 'assets/images/animewp-key-visual-a.svg' ) ) ); ?>" alt="" loading="lazy"/><p>動画を開くと外部サービスへ接続します。閉じるとプレーヤーを削除します。</p></div><div class="animewp-video__content"></div></div>
<!-- /wp:animewp/video -->
