<?php
/** Regression integration tests. Run only in the disposable QA databases. */
if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) { exit(1); }
global $results, $wpdb;
wp_set_current_user(1);
$results = array();
function check_v12($name,$pass){global $results;$results[]=array('test'=>$name,'pass'=>(bool)$pass);if(!$pass)WP_CLI::warning($name);}
$imports = get_option('animewp_starter_imports_v1');
$roles = get_option('animewp_font_roles_v1',null);
$styles_id=WP_Theme_JSON_Resolver::get_user_global_styles_post_id();
$original_styles=get_post_field('post_content',$styles_id);
$created=array();
try {
 $copy=$imports;unset($copy['contact']);update_option('animewp_starter_imports_v1',$copy,false);
 $id=animewp_import_starter_draft('contact','Regression trash fixture');$created[]=$id;
 $edited='<!-- wp:paragraph --><p>編集済みの原稿を復元します。</p><!-- /wp:paragraph -->';
 wp_update_post(wp_slash(array('ID'=>$id,'post_status'=>'publish','post_content'=>$edited)));
 wp_trash_post($id);
 $blocked=animewp_import_starter_draft('contact');
 check_v12('F5 trashed import requires an explicit choice',is_wp_error($blocked)&&$blocked->get_error_code()==='animewp_starter_trashed'&&get_post_status($id)==='trash');
 $records=get_option('animewp_starter_imports_v1');unset($records['contact']['post_id']);update_option('animewp_starter_imports_v1',$records,false);
 $recovered=animewp_import_starter_draft('contact');
 check_v12('F5 interrupted import finds a renamed trashed slug',is_wp_error($recovered)&&$recovered->get_error_code()==='animewp_starter_trashed');
 $publish_filter=static function(){return 'publish';};add_filter('wp_untrash_post_status',$publish_filter);
 $restored=animewp_import_starter_draft('contact','','restore');remove_filter('wp_untrash_post_status',$publish_filter);
 check_v12('F5 explicit restore keeps edited content and forces draft',$restored===$id&&get_post_status($id)==='draft'&&get_post_field('post_content',$id)===$edited);
 wp_trash_post($id);$new=animewp_import_starter_draft('contact','','new');$created[]=$new;
 check_v12('F5 new draft leaves old page in trash',$new!==$id&&!is_wp_error($new)&&get_post_status($new)==='draft'&&get_post_status($id)==='trash');
 check_v12('F5 stale repeat form reuses replacement draft',animewp_import_starter_draft('contact','','new')===$new);
 $lock=animewp_acquire_import_lock();animewp_release_import_lock(array('token'=>'wrong','time'=>time()));
 check_v12('F3 wrong owner cannot release live lock',false==animewp_acquire_import_lock());animewp_release_import_lock($lock);
 $expired=array('token'=>'expired-qa','time'=>time()-121);animewp_insert_import_lock($expired);
 $taken=animewp_acquire_import_lock();animewp_release_import_lock($expired);
 check_v12('F3 expired lock takeover retains new ownership',is_array($taken)&&false===animewp_acquire_import_lock());animewp_release_import_lock($taken);
 wp_cache_set('notoptions',array('animewp_starter_import_lock'=>true),'options');$lock=animewp_acquire_import_lock();
 check_v12('F3 cached missing option cannot authorize a second owner',is_array($lock)&&false===animewp_acquire_import_lock());animewp_release_import_lock($lock);
 $families=array();foreach(array('review2','my_font','display','qa-four','qa-five','qa-six','qa-seven','qa-eight','qa-nine',sanitize_title('源ノ角ゴシック')) as $slug){$families[]=array('slug'=>$slug,'name'=>$slug,'fontFamily'=>'Georgia, serif');}
 $families[0]['fontFace']=array(array('fontFamily'=>'Review QA','fontWeight'=>'400','fontStyle'=>'normal','src'=>array('/animewp-artifacts/qa-font.woff2')));
 $data=json_decode($original_styles,true);$data['settings']['typography']['fontFamilies']=array('custom'=>$families);
 $data['settings']['color']['palette']=array('theme'=>array(array('slug'=>'base','name'=>'Base QA','color'=>'#123456')),'custom'=>array(array('slug'=>'custom-qa','name'=>'Custom QA','color'=>'#abcabc')));
 $data['styles']['typography']['fontFamily']='var:preset|font-family|review2';
 $data['styles']['elements']['heading']['typography']['fontFamily']='var:preset|font-family|my_font';
 $data['version']=3;$data['isGlobalStylesUserThemeJSON']=true;
 wp_update_post(wp_slash(array('ID'=>$styles_id,'post_content'=>wp_json_encode($data))));wp_clean_theme_json_cache();
 $available=animewp_available_font_families();
 check_v12('Font Library merged families have no fixed cap',isset($available['qa-nine'],$available['display'],$available['animewp-sans'],$available['animewp-serif'])&&!isset($available['animewp-role-display']));
 $save=animewp_save_font_roles(array('display'=>'review2','accent-hand'=>'my_font','mono'=>'display'));
 check_v12('Role slugs use Core variable normalization',true===$save&&false!==strpos(animewp_role_css(),'font-family--review-2')&&false!==strpos(animewp_role_css(),'font-family--my-font'));
 check_v12('Core percent-encoded Japanese font slugs remain selectable',isset($available[sanitize_title('源ノ角ゴシック')])&&true===animewp_save_font_roles(array('display'=>sanitize_title('源ノ角ゴシック')))&&false!==strpos(animewp_role_css(),_wp_to_kebab_case(sanitize_title('源ノ角ゴシック'))));
 animewp_save_font_roles(array('display'=>'review2','accent-hand'=>'my_font','mono'=>'display'));
 $before_roles=animewp_font_role_values();$bad=animewp_save_font_roles(array('display'=>'evil);color:red;'));
 check_v12('Invalid font role is rejected without partial writes',is_wp_error($bad)&&$before_roles===animewp_font_role_values());
 $font_settings=wp_get_global_settings(array('typography','fontFamilies'));
 check_v12('Added font faces default to swap in rendered settings',($font_settings['custom'][0]['fontFace'][0]['fontDisplay']??'')==='swap');
 $data['settings']['color']['palette']['theme'][0]['color']='#654321';
 wp_update_post(wp_slash(array('ID'=>$styles_id,'post_content'=>wp_json_encode($data))));wp_clean_theme_json_cache();
 $after=json_decode(get_post_field('post_content',$styles_id),true);
 check_v12('Native color edit retains custom swatches',$after['settings']['color']['palette']['custom']===$data['settings']['color']['palette']['custom']);
 check_v12('Native color edit retains complete font settings',$after['settings']['typography']===$data['settings']['typography']);
 check_v12('Native color edit retains explicit typography styles',$after['styles']===$data['styles']);
 check_v12('Native color edit retains role map',$before_roles===animewp_font_role_values());
 check_v12('No custom palette switching action or function exists',!function_exists('animewp_apply_palette')&&!has_action('admin_post_animewp_apply_palette'));
 $after['settings']['typography']['fontFamilies']['custom']=array();wp_update_post(wp_slash(array('ID'=>$styles_id,'post_content'=>wp_json_encode($after))));wp_clean_theme_json_cache();
 check_v12('Deleted assigned families fall back without broken role CSS',animewp_role_css()==='');
 check_v12('F4 author filtered markup retains anonymous crossorigin',false!==strpos(wp_kses_post('<video crossorigin="anonymous" controls src="/film.mp4"><track src="/captions.vtt" kind="captions" /></video>'),'crossorigin="anonymous"'));
 $author=get_user_by('login','animewp-test-author');wp_set_current_user($author->ID);
 check_v12('Author cannot change font roles',is_wp_error(animewp_save_font_roles(array())));
 wp_set_current_user(1);
 check_v12('Role reset clears the option',true===animewp_save_font_roles(array())&&get_option('animewp_font_roles_v1',null)===null);
} finally {
 wp_set_current_user(1);update_option('animewp_starter_imports_v1',$imports,false);
 wp_update_post(wp_slash(array('ID'=>$styles_id,'post_content'=>$original_styles)));wp_clean_theme_json_cache();
 if($roles===null)delete_option('animewp_font_roles_v1');else update_option('animewp_font_roles_v1',$roles,false);
 foreach($created as $id){if(is_int($id)&&$id>0)wp_delete_post($id,true);}
}
WP_CLI::line(wp_json_encode(array('wordpress'=>get_bloginfo('version'),'php'=>PHP_VERSION,'results'=>$results),JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE));
foreach($results as $result){if(!$result['pass'])WP_CLI::halt(1);}
