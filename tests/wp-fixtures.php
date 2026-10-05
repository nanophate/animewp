<?php
/** Disposable local/CI fixtures. Never run against a live site. */
if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) { exit(1); }
wp_set_current_user(1);
function animewp_fixture($key,$args){
 $found=get_posts(array('post_type'=>array('post','page'),'post_status'=>'any','meta_key'=>'_animewp_qa_fixture','meta_value'=>$key,'numberposts'=>1));
 if($found){$args['ID']=$found[0]->ID;}
 $id=wp_insert_post(array_merge(array('post_type'=>'page','post_status'=>'publish','meta_input'=>array('_animewp_qa_fixture'=>$key)),$args));
 return $id;
}
$out=array();
foreach(animewp_starters() as $key=>$starter){
 $out[$key]=animewp_fixture($key,array('post_title'=>'検証：'.$starter['title'],'post_content'=>animewp_pattern_content($starter['pattern']),'meta_input'=>array('_animewp_qa_fixture'=>$key,'_wp_page_template'=>$starter['template'])));
}
$fixture=ABSPATH.'animewp-artifacts/plugin-fixture.html';
if(file_exists($fixture) && !get_posts(array('post_type'=>'page','meta_key'=>'_animewp_qa_fixture','meta_value'=>'blocks','numberposts'=>1))){$out['blocks']=animewp_fixture('blocks',array('post_title'=>'補助ブロック検証','post_content'=>file_get_contents($fixture)));}
$out['password']=animewp_fixture('password',array('post_title'=>'保護された検証ページ','post_password'=>'animewp-local-test','post_content'=>'<!-- wp:paragraph --><p>保護された本文</p><!-- /wp:paragraph -->'));
for($i=1;$i<=12;$i++){$out['news-'.$i]=animewp_fixture('news-'.$i,array('post_type'=>'post','post_title'=>'検証お知らせ '.$i.($i===12?' — 長いタイトルが複数行に折り返しても余白を保つことを確認するための文章':''),'post_content'=>'<!-- wp:paragraph --><p>検索確認用の本文。検証キーワード。</p><!-- /wp:paragraph -->','comment_status'=>'open'));}
if(!get_comments(array('post_id'=>$out['news-1'],'count'=>true))){wp_insert_comment(array('comment_post_ID'=>$out['news-1'],'comment_author'=>'検証コメント','comment_content'=>'コメント欄の表示を確認します。','comment_approved'=>1));}
$out['reading']=get_option('show_on_front');
WP_CLI::line(wp_json_encode($out,JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE));
