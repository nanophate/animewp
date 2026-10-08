<?php
/** Disposable browser fixtures; source patterns remain the product under test. */
if ( ! defined( 'WP_CLI' ) || ! WP_CLI || ! defined( 'ANIMEWP_BROWSER_QA' ) || ! ANIMEWP_BROWSER_QA ) { exit( 1 ); }
wp_set_current_user( 1 );
$pages = array();
$news_id = wp_insert_post( wp_slash( array( 'post_type' => 'post', 'post_status' => 'publish', 'post_title' => 'Browser QA news post', 'post_content' => '<!-- wp:paragraph --><p>Published news belongs in the sample page news list.</p><!-- /wp:paragraph -->' ) ), true );
if ( is_wp_error( $news_id ) ) { WP_CLI::error( 'Cannot create browser news post.' ); }
$pages['news'] = array( 'id' => $news_id, 'title' => 'Browser QA news post', 'url' => get_permalink( $news_id ) );
function animewp_browser_page( $key, $content, $template = 'animewp-canvas' ) {
	$id = wp_insert_post( wp_slash( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => 'Browser QA ' . $key, 'post_content' => $content, 'meta_input' => array( '_wp_page_template' => $template ) ) ), true );
	if ( is_wp_error( $id ) ) { WP_CLI::error( 'Cannot create browser page.' ); }
	return array( 'id' => $id, 'path' => '/?page_id=' . $id, 'title' => 'Browser QA ' . $key );
}
foreach ( array( 'basic', 'simple', 'blur', 'drift' ) as $key ) {
	$pages[ $key ] = animewp_browser_page( $key, animewp_pattern_content( 'animewp/page-' . $key ), 'basic' === $key ? 'animewp-canvas' : 'animewp-showcase' );
}
$interaction = <<<'HTML'
<!-- wp:heading {"level":1} --><h1 class="wp-block-heading">Interaction checks</h1><!-- /wp:heading -->
<!-- wp:animewp/carousel {"navStyle":"text","label":"QA carousel","prevLabel":"Previous","nextLabel":"Next","autoplay":2} -->
<div class="wp-block-animewp-carousel has-nav-text is-effect-slide has-dots-dots" style="--animewp-carousel-slide:100%" data-autoplay="2" data-prev-label="Previous" data-next-label="Next" data-label="QA carousel" data-pause-label="Pause"><div class="animewp-carousel__track">
<!-- wp:group --><div class="wp-block-group"><!-- wp:paragraph --><p>First slide</p><!-- /wp:paragraph --><!-- wp:html --><label>Keyboard input <input class="qa-input" value="keyboard" /></label><!-- /wp:html --></div><!-- /wp:group -->
<!-- wp:group --><div class="wp-block-group"><!-- wp:paragraph --><p>Second slide</p><!-- /wp:paragraph --><!-- wp:paragraph --><p><a href="#qa-motion">Second slide link</a></p><!-- /wp:paragraph --></div><!-- /wp:group -->
</div></div><!-- /wp:animewp/carousel -->
<!-- wp:animewp/video-card {"source":"youtube","url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","title":"QA video","playLabel":"Play","closeLabel":"Close"} -->
<figure style="--animewp-video-card-ratio:16/9" class="wp-block-animewp-video-card"><a class="animewp-video-card__link" href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" data-provider="youtube" data-video-id="dQw4w9WgXcQ" data-start="0" data-close-label="Close" aria-label="Play QA video"><span class="animewp-video-card__frame"><span class="animewp-video-card__play" aria-hidden="true"></span></span></a><figcaption class="animewp-video-card__caption"><span class="animewp-video-card__title">QA video</span></figcaption></figure><!-- /wp:animewp/video-card -->
<!-- wp:group {"anchor":"qa-motion","animewpMotion":{"entrance":"rise","hover":"lift","loop":"float","parallax":20}} --><div id="qa-motion" class="wp-block-group"><!-- wp:paragraph --><p>Motion remains readable.</p><!-- /wp:paragraph --></div><!-- /wp:group -->
<!-- wp:spacer {"height":"400px"} --><div style="height:400px" aria-hidden="true" class="wp-block-spacer"></div><!-- /wp:spacer -->
HTML;
$pages['interaction'] = animewp_browser_page( 'interaction', $interaction );

// Saved Core groups exercise the same Position: Sticky and Motion controls as
// an edited header. An image taller than the fallback token exposes bad offsets.
$header_body = <<<'HTML'
<!-- wp:heading {"level":1} --><h1 class="wp-block-heading">Header layout checks</h1><!-- /wp:heading -->
<!-- wp:paragraph --><p><a href="#qa-header-target">Jump to header target</a></p><!-- /wp:paragraph -->
<!-- wp:spacer {"height":"1000px"} --><div style="height:1000px" aria-hidden="true" class="wp-block-spacer"></div><!-- /wp:spacer -->
<!-- wp:heading {"anchor":"qa-header-target"} --><h2 class="wp-block-heading" id="qa-header-target">Header target stays visible</h2><!-- /wp:heading -->
<!-- wp:paragraph --><p>Content following an in-page link.</p><!-- /wp:paragraph -->
<!-- wp:spacer {"height":"1200px"} --><div style="height:1200px" aria-hidden="true" class="wp-block-spacer"></div><!-- /wp:spacer -->
HTML;
foreach ( array( 'tall' => 144, 'compact' => 44 ) as $variant => $image_height ) {
	$slug = 'qa-header-' . $variant;
	$motion = 'compact' === $variant ? ',"animewpMotion":{"scrolled":"shrink"}' : '';
	$header = '<!-- wp:group {"className":"animewp-header qa-sticky-header","style":{"position":{"type":"sticky","top":"0px"},"spacing":{"padding":{"top":"20px","bottom":"20px"},"margin":{"top":"0","bottom":"0"}}},"layout":{"type":"flex","justifyContent":"space-between"}' . $motion . '} -->'
		. '<div class="wp-block-group animewp-header qa-sticky-header" style="margin-top:0;margin-bottom:0;padding-top:20px;padding-bottom:20px">'
		. '<!-- wp:paragraph --><p>Saved sticky header</p><!-- /wp:paragraph -->'
		. '<!-- wp:html --><img id="qa-header-image" src="' . esc_url( get_theme_file_uri( 'assets/images/animewp-character-a.svg' ) ) . '" alt="" width="44" height="' . $image_height . '" style="height:' . $image_height . 'px;width:44px;object-fit:contain" /><!-- /wp:html -->'
		. '</div><!-- /wp:group -->';
	$part = wp_insert_post( wp_slash( array( 'post_type' => 'wp_template_part', 'post_status' => 'publish', 'post_name' => $slug, 'post_title' => 'Browser QA header ' . $variant, 'post_content' => $header ) ), true );
	if ( is_wp_error( $part ) ) { WP_CLI::error( 'Cannot create saved sticky header.' ); }
	wp_set_object_terms( $part, 'animewp', 'wp_theme' );
	wp_set_object_terms( $part, 'header', 'wp_template_part_area' );
	$content = '<!-- wp:template-part {"slug":"' . $slug . '","theme":"animewp","tagName":"header"} /--><!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} --><main class="wp-block-group"><!-- wp:post-content /--></main><!-- /wp:group -->';
	$template = wp_insert_post( wp_slash( array( 'post_type' => 'wp_template', 'post_status' => 'publish', 'post_name' => $slug, 'post_title' => 'Browser QA layout ' . $variant, 'post_content' => $content ) ), true );
	if ( is_wp_error( $template ) ) { WP_CLI::error( 'Cannot create saved header layout.' ); }
	wp_set_object_terms( $template, 'animewp', 'wp_theme' );
	$pages[ 'header_' . $variant ] = animewp_browser_page( 'header_' . $variant, $header_body, $slug );
}
foreach ( array( 'left', 'right' ) as $side ) {
	$pages[ 'header_' . $side ] = animewp_browser_page( 'header_' . $side, $header_body, 'animewp-' . $side );
}
$template_id = wp_insert_post( wp_slash( array( 'post_type' => 'wp_template', 'post_status' => 'publish', 'post_name' => 'qa-browser', 'post_title' => 'Browser QA template', 'post_content' => '<!-- wp:group {"tagName":"main"} --><main class="wp-block-group"><!-- wp:paragraph --><p>Editable template sentinel.</p><!-- /wp:paragraph --><!-- wp:post-content /--></main><!-- /wp:group -->' ) ), true );
if ( is_wp_error( $template_id ) ) { WP_CLI::error( 'Cannot create browser template.' ); }
wp_set_object_terms( $template_id, 'animewp', 'wp_theme' );
$pages['template'] = array( 'id' => 'animewp//qa-browser' );
file_put_contents( WP_CONTENT_DIR . '/animewp-qa/pages.json', wp_json_encode( $pages, JSON_PRETTY_PRINT ) );
WP_CLI::success( 'Browser fixtures ready.' );
