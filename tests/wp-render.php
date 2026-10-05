<?php
/** Frontend smoke checks for a disposable site with wp-fixtures.php data. */
if(!defined('WP_CLI')||!WP_CLI||!getenv('ANIMEWP_HTTP_ORIGIN')){exit(1);}
$origin=rtrim(getenv('ANIMEWP_HTTP_ORIGIN'),'/');
$host=wp_parse_url(home_url(),PHP_URL_HOST);$port=wp_parse_url(home_url(),PHP_URL_PORT);if($port)$host.=':'.$port;
function animewp_local_url($url){global $animewp_test_origin;return $animewp_test_origin.wp_parse_url($url,PHP_URL_PATH).(wp_parse_url($url,PHP_URL_QUERY)?'?'.wp_parse_url($url,PHP_URL_QUERY):'');}
$GLOBALS['animewp_test_origin']=$origin;
$fixture=get_posts(array('post_type'=>'page','post_status'=>'publish','meta_key'=>'_animewp_qa_fixture','meta_value'=>'composition-a','numberposts'=>1));
$news=get_posts(array('post_type'=>'post','post_status'=>'publish','meta_key'=>'_animewp_qa_fixture','meta_value'=>'news-1','numberposts'=>1));
$protected=get_posts(array('post_type'=>'page','post_status'=>'publish','meta_key'=>'_animewp_qa_fixture','meta_value'=>'password','numberposts'=>1));
$cases=array(
 array('home',home_url('/'),200,'animewp-news-list'),
 array('page',get_permalink($fixture[0]),200,'animewp-characters'),
 array('news comments',get_permalink($news[0]),200,'コメント欄の表示を確認します。'),
 array('archive',get_category_link(1),200,'animewp-news-list'),
 array('search match',home_url('/?s='.rawurlencode('検証キーワード')),200,'検証お知らせ'),
 array('search empty',home_url('/?s=animewpNoResult987654321'),200,'表示できるお知らせはありません。'),
 array('pagination',home_url('/?paged=2'),200,'wp-block-query-pagination'),
 array('password',get_permalink($protected[0]),200,'post-password-form'),
 array('not found',home_url('/animewp-missing-page-987654321/'),404,'ホームへ戻る')
);
$results=array();
foreach($cases as $case){
 $response=wp_remote_get(animewp_local_url($case[1]),array('headers'=>array('Host'=>$host),'timeout'=>20));
 $html=is_wp_error($response)?'':wp_remote_retrieve_body($response);$status=is_wp_error($response)?0:wp_remote_retrieve_response_code($response);
 $results[]=array('test'=>$case[0],'pass'=>$status===$case[2]&&false!==strpos($html,$case[3]),'status'=>$status);
}
WP_CLI::line(wp_json_encode($results,JSON_PRETTY_PRINT));foreach($results as $r){if(!$r['pass'])WP_CLI::halt(1);}
