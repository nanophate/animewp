<?php
/** Two concurrent authenticated HTTP requests to a test-only harness. */
if(!defined('WP_CLI')||!WP_CLI||!getenv('ANIMEWP_HTTP_ORIGIN')||!function_exists('curl_multi_init'))exit(1);
global $results, $wpdb;
wp_set_current_user(1);$imports=get_option('animewp_starter_imports_v1');$copy=$imports;unset($copy['legal']);update_option('animewp_starter_imports_v1',$copy,false);
$token=WP_Session_Tokens::get_instance(1)->create(time()+120);$_COOKIE[LOGGED_IN_COOKIE]=wp_generate_auth_cookie(1,time()+120,'logged_in',$token);
$cookie=LOGGED_IN_COOKIE.'='.$_COOKIE[LOGGED_IN_COOKIE];
$url=rtrim(getenv('ANIMEWP_HTTP_ORIGIN'),'/').'/wp-admin/admin-post.php';$host=wp_parse_url(home_url(),PHP_URL_HOST).':'.wp_parse_url(home_url(),PHP_URL_PORT);
$body=http_build_query(array('action'=>'animewp_qa_race','qa_nonce'=>wp_create_nonce('animewp_qa_race'),'start_at'=>microtime(true)+1.2));
$before=(int)$wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type='page' AND post_status='draft'");$multi=curl_multi_init();$handles=array();$out=array();
try{
 for($i=0;$i<2;$i++){$h=curl_init($url);curl_setopt_array($h,array(CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$body,CURLOPT_HTTPHEADER=>array('Cookie: '.$cookie,'Host: '.$host),CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>15));curl_multi_add_handle($multi,$h);$handles[]=$h;}
 do{$status=curl_multi_exec($multi,$active);if($active)curl_multi_select($multi,.1);}while($active&&$status===CURLM_OK);
 foreach($handles as $h){$out[]=array('status'=>curl_getinfo($h,CURLINFO_RESPONSE_CODE),'response'=>json_decode(curl_multi_getcontent($h),true));curl_multi_remove_handle($multi,$h);curl_close($h);}
 $success=array_values(array_filter($out,static function($r){return $r['status']===200;}));$busy=array_values(array_filter($out,static function($r){return $r['status']===409&&($r['response']['result']??'')==='animewp_busy';}));
 $after=(int)$wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type='page' AND post_status='draft'");
 $overlap=count($success)===1&&count($busy)===1&&$busy[0]['response']['started']<$success[0]['response']['ended'];
 $pass=$overlap&&$after===$before+1;
 WP_CLI::line(wp_json_encode(array('wordpress'=>get_bloginfo('version'),'php'=>PHP_VERSION,'requests'=>$out,'drafts_before'=>$before,'drafts_after'=>$after,'pass'=>$pass),JSON_PRETTY_PRINT));
}finally{curl_multi_close($multi);WP_Session_Tokens::get_instance(1)->destroy($token);update_option('animewp_starter_imports_v1',$imports,false);foreach($out as $r){if($r['status']===200&&is_int($r['response']['result']))wp_delete_post($r['response']['result'],true);}}
if(!$pass)WP_CLI::halt(1);
