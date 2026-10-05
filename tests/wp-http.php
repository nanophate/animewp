<?php
/** HTTP capability/nonce checks against a disposable local site only. */
if ( ! defined('WP_CLI') || ! WP_CLI || ! getenv('ANIMEWP_HTTP_ORIGIN') ) { exit(1); }
$origin=rtrim(getenv('ANIMEWP_HTTP_ORIGIN'),'/');
$results=array();
function animewp_http_check($name,$response,$status){global $animewp_http_results;$code=is_wp_error($response)?0:wp_remote_retrieve_response_code($response);$animewp_http_results[]=array('test'=>$name,'pass'=>$code===$status,'status'=>$code);}
$GLOBALS['animewp_http_results']=array();
wp_set_current_user(1);
$token=WP_Session_Tokens::get_instance(1)->create(time()+300);
$_COOKIE[LOGGED_IN_COOKIE]=wp_generate_auth_cookie(1,time()+300,'logged_in',$token);
$cookie=LOGGED_IN_COOKIE.'='.$_COOKIE[LOGGED_IN_COOKIE];
$body=array('action'=>'animewp_import_starter','animewp_starter'=>'contact');
$base=array('timeout'=>20,'redirection'=>0,'headers'=>array('Cookie'=>$cookie,'Host'=>wp_parse_url(home_url(),PHP_URL_HOST).':'.wp_parse_url(home_url(),PHP_URL_PORT)));
animewp_http_check('admin import without nonce rejected',wp_remote_post($origin.'/wp-admin/admin-post.php',array_merge($base,array('body'=>$body))),403);
$body['animewp_nonce']='invalid-local-nonce';
animewp_http_check('admin import invalid nonce rejected',wp_remote_post($origin.'/wp-admin/admin-post.php',array_merge($base,array('body'=>$body))),403);
$body['animewp_nonce']=wp_create_nonce('animewp_import_starter');
animewp_http_check('admin valid nonce reopens existing draft',wp_remote_post($origin.'/wp-admin/admin-post.php',array_merge($base,array('body'=>$body))),302);
$author=get_user_by('login','animewp-test-author');wp_set_current_user($author->ID);
$author_token=WP_Session_Tokens::get_instance($author->ID)->create(time()+300);
$_COOKIE[LOGGED_IN_COOKIE]=wp_generate_auth_cookie($author->ID,time()+300,'logged_in',$author_token);
$base['headers']['Cookie']=LOGGED_IN_COOKIE.'='.$_COOKIE[LOGGED_IN_COOKIE];
$body['animewp_nonce']=wp_create_nonce('animewp_import_starter');
animewp_http_check('author import with own valid nonce rejected',wp_remote_post($origin.'/wp-admin/admin-post.php',array_merge($base,array('body'=>$body))),403);
animewp_http_check('unauthenticated preview rejected',wp_remote_get($origin.'/?animewp_preview=composition-a',array('redirection'=>0,'headers'=>array('Host'=>$base['headers']['Host']))),403);
wp_set_current_user(1);$_COOKIE[LOGGED_IN_COOKIE]=substr($cookie,strlen(LOGGED_IN_COOKIE)+1);$base['headers']['Cookie']=$cookie;
animewp_http_check('admin invalid preview nonce rejected',wp_remote_get($origin.'/?animewp_preview=composition-a&_wpnonce=bad',$base),403);
$preview=wp_remote_get($origin.'/?animewp_preview=composition-a&_wpnonce='.wp_create_nonce('animewp_preview_composition-a'),$base);
animewp_http_check('admin valid preview available',$preview,200);
$GLOBALS['animewp_http_results'][]=array('test'=>'preview noindex header','pass'=>!is_wp_error($preview)&&strpos(wp_remote_retrieve_header($preview,'x-robots-tag'),'noindex')!==false);
$preview_html=is_wp_error($preview)?'':wp_remote_retrieve_body($preview);
preg_match('~<head>(.*?)</head>~s',$preview_html,$preview_head);
$GLOBALS['animewp_http_results'][]=array('test'=>'preview has exactly one document title','pass'=>substr_count($preview_head[1]??'', '<title>')===1);
WP_Session_Tokens::get_instance(1)->destroy($token);
WP_Session_Tokens::get_instance($author->ID)->destroy($author_token);
WP_CLI::line(wp_json_encode($GLOBALS['animewp_http_results'],JSON_PRETTY_PRINT));
foreach($GLOBALS['animewp_http_results'] as $result){if(!$result['pass'])WP_CLI::halt(1);}
