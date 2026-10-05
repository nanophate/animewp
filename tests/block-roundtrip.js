/* Run in the local QA admin screen after WordPress core and AnimeWP are registered. */
(function () {
    'use strict';
    if (!wp.blocks.getBlockType('core/paragraph')) { wp.blockLibrary.registerCoreBlocks(); }
    document.getElementById('animewp-run-qa').addEventListener('click', function () {
        var results = [], canonical = {};
        function inspect(items, path, failures) {
            items.forEach(function (block, index) {
                if (!block.isValid) { failures.push({ path: path + '/' + index, name: block.name }); }
                inspect(block.innerBlocks || [], path + '/' + index, failures);
            });
        }
        function check(name, content) {
            var blocks = wp.blocks.parse(content), failures = [];
            inspect(blocks, name, failures);
            canonical[name] = wp.blocks.serialize(blocks);
            inspect(wp.blocks.parse(canonical[name]), name + '/resaved', failures);
            results.push({ name: name, blocks: blocks.length, invalid: failures });
        }
        function attributeAt(value, path) {
            return path.split('.').reduce(function (current, key) { return current && current[key]; }, value);
        }
        function reportAttributes(name, block, expected) {
            var failures = [];
            expected.forEach(function (item) {
                if (attributeAt(block && block.attributes, item.path) !== item.value) {
                    failures.push({ name: item.path, expected: item.value, actual: attributeAt(block && block.attributes, item.path) });
                }
            });
            results.push({ name: name, blocks: block ? 1 : 0, invalid: failures });
        }
        Object.entries(window.animewpQAData).forEach(function (entry) { check(entry[0], entry[1]); });
        Object.entries(window.animewpLegacyContent).forEach(function (entry) { check('legacy/' + entry[0], entry[1]); });
        Object.entries(window.animewpVideoLegacyContent || {}).forEach(function (entry) { check('legacy/video/' + entry[0], entry[1]); });
        var make = wp.blocks.createBlock;
        function paragraph(text, className) { return make('core/paragraph', { content: text || '入れ子本文を保持します。', className: className }); }
        function heading(text) { return make('core/heading', { level: 2, content: text }); }
        function textGroup(angle, text, className, extra) {
            return make('animewp/text-group', Object.assign({ rotation: angle, className: className }, extra || {}), [heading(text), paragraph('文字グループ内の説明です。')]);
        }
        var pad = { spacing: { padding: { top: '2rem', right: '2rem', bottom: '2rem', left: '2rem' }, margin: { top: '3rem', bottom: '3rem' } } };
        var variants = [
            make('animewp/panel', { className: 'qa-separated', backdropEnabled: true, backdropColor: '#eeeeee', backgroundSkew: -2, backgroundRotation: 1, style: pad }, [
                make('animewp/text-group', { rotation: 3, className: 'qa-heading-only' }, [heading('傾ける見出し — 日本語の編集確認')]),
                paragraph('こちらの本文は水平です。背景と見出しを別々に調整できます。', 'qa-upright')
            ]),
            make('core/group', { className: 'qa-two-groups', style: pad }, [
                textGroup(-3, '左へ傾く文字グループ', 'qa-angle-a'),
                textGroup(4, '右へ傾く文字グループ', 'qa-angle-b')
            ]),
            make('animewp/panel', { className: 'qa-nested-parent', rotation: 3, backgroundSkew: 5, backgroundRotation: 4, backdropEnabled: true, backdropColor: '#cccccc', backgroundOpacity: 40, radius: 30, highlight: 'panel', highlightColor: '#cccccc', highlightPadding: 1, heading: '外側パネルは3度', style: pad }, [
                make('animewp/panel', { className: 'qa-nested-child', backdropEnabled: true, heading: '内側は既定値' }, [paragraph('親の回転には従いますが、子自身の回転は0度です。')])
            ]),
            make('animewp/text-group', { rotation: -2, mobileRotation: 1, className: 'qa-nested-text' }, [
                make('animewp/text-group', { className: 'qa-text-child' }, [paragraph('文字グループの入れ子も既定値0度です。')])
            ]),
            textGroup(0, '既定値の文字グループ', 'qa-default-text'),
            textGroup(8, '文字の大きさと余白', 'qa-styled-text', { align: 'wide', fontSize: 'large', style: { color: { text: '#202020' }, spacing: { padding: { top: '1rem', bottom: '1rem' }, blockGap: '2rem' }, typography: { lineHeight: '1.8' } } }),
            make('animewp/panel', { className: 'qa-panel-gap', style: { spacing: { blockGap: '3rem' } } }, [
                paragraph('次のパネルまで3remの間隔を指定。'),
                make('animewp/panel', { className: 'qa-panel-gap-child' }, [paragraph('内側は既定値です。'), paragraph('内側の間隔は1emです。', 'qa-inner-panel-gap')])
            ]),
            make('animewp/text-group', { className: 'qa-text-gap', style: { spacing: { blockGap: '3rem' } } }, [
                paragraph('次の文字グループまで3remの間隔を指定。'),
                make('animewp/text-group', { className: 'qa-text-gap-child' }, [paragraph('内側は既定値です。'), paragraph('内側の間隔は1emです。', 'qa-inner-text-gap')])
            ]),
            make('animewp/panel', { backdropEnabled: true, backgroundOpacity: 0 }, [paragraph('背景の不透明度0%')]),
            make('animewp/panel', { backdropEnabled: true, backgroundOpacity: 100 }, [paragraph('背景の不透明度100%')])
        ];
        variants.push(
            make('animewp/panel', {className:'qa-support-preset-gradient',gradient:'animewp-wash',style:{typography:{textAlign:'center'}}}, [paragraph('プリセットgradientと文字揃えを保持します。')]),
            make('animewp/panel', {className:'qa-support-custom-gradient',style:{color:{gradient:'linear-gradient(135deg, rgb(20, 20, 20) 0%, rgb(245, 245, 245) 100%)'},typography:{textAlign:'right'}}}, [paragraph('任意gradientと文字揃えを保持します。')]),
            make('animewp/panel', {backdropEnabled:true,backdropColorMode:'preset',backdropPreset:'accent',highlight:'panel',highlightColorMode:'role',highlightRole:'surface'}, [paragraph('配色追従')]),
            make('animewp/media', {className:'qa-media-parent',crop:true,imageHeight:600,mobileImageHeight:420,imageWidth:70,focalX:80,focalY:20,style:{spacing:{blockGap:"3rem"}}}, [make('core/image',{url:location.origin+'/wp-content/themes/animewp/assets/images/animewp-character-a.svg',alt:'QA'}),make('core/group',{},[make('animewp/media', {className:'qa-media-child',crop:true}, [make('core/image',{url:location.origin+'/wp-content/themes/animewp/assets/images/animewp-character-a.svg',alt:'QA child'}),make('core/group',{},[paragraph('内側の既定値')])])])]),
            make('animewp/video', {videoUrl:location.origin+'/animewp-artifacts/test-video.mp4',trackUrl:location.origin+'/animewp-artifacts/test-captions.vtt',crossOriginMode:'anonymous',description:'字幕CORS変換テスト'}, [paragraph('本文')]),
            make('animewp/video', {source:'youtube',videoUrl:'https://www.youtube.com/watch?v=jNQXAC9IVRw&t=2',description:'外部接続の同意を検証するサンプル'}, [paragraph('外部映像サンプル・作品素材ではありません。')]),
            make('animewp/video', {source:'youtube',videoUrl:'https://www.youtube.com/watch?v=jNQXAC9IVRw&t=2',posterUrl:'/wp-content/uploads/animewp-local-poster.jpg',buttonLabel:'この動画の内容を説明する長い再生ボタンの文言',style:{color:{text:'#202020',background:'#eeeeee'}}}, [heading('複数行になっても個別編集できる動画タイトル'),paragraph('説明や文字起こしを標準ブロックで追加できます。')]),
            make('core/group', {}, [
                make('animewp/video', {source:'youtube',videoUrl:'https://youtu.be/jNQXAC9IVRw',posterUrl:'/wp-content/uploads/animewp-local-poster-a.jpg',buttonLabel:'YouTubeで再生'}, [paragraph('一つ目の動画')]),
                make('animewp/video', {source:'youtube',videoUrl:'https://www.youtube.com/shorts/jNQXAC9IVRw',posterUrl:'/wp-content/uploads/animewp-local-poster-b.jpg',buttonLabel:'別の動画を再生'}, [paragraph('二つ目の動画')])
            ]),
            make('animewp/video', {source:'youtube',posterUrl:'/wp-content/uploads/animewp-local-poster.jpg',buttonLabel:'YouTubeで再生'}, [heading('URL未設定'),paragraph('動画ページのURLを入力してください。')]),
            make('animewp/video', {source:'vimeo',videoUrl:'https://vimeo.com/76979871',description:'Vimeoサンプル'}, []),
            make('animewp/video', {source:'youtube',videoUrl:'https://youtube.com.evil.invalid/watch?v=jNQXAC9IVRw'}, []),
            textGroup(3, 'デスクトップのみ', 'qa-desktop-only'),
            textGroup(0, 'モバイルのみ', 'qa-mobile-only', {mobileRotation:2}),
            make('animewp/panel',{className:'qa-fixed-parent'},[wp.blocks.parse('<!-- wp:html --><div class="qa-fixed" style="position:fixed;left:7px;top:9px;width:2px;height:2px"></div><!-- /wp:html -->')[0],paragraph('0度パネル')]),
            make('animewp/text-group',{className:'qa-fixed-text-parent'},[wp.blocks.parse('<!-- wp:html --><div class="qa-fixed-text" style="position:fixed;left:11px;top:13px;width:2px;height:2px"></div><!-- /wp:html -->')[0],paragraph('0度文字')]),
            make('animewp/panel',{className:'qa-role-contrast',heading:'読みやすい濃い面',backdropEnabled:true,backdropColorMode:'role',backdropRole:'contrast'},[paragraph('対応する前景')])
        );
        variants.forEach(function (block, index) {
            var serializedBlock = wp.blocks.serialize([block]);
            check('rotation/' + index, serializedBlock);
            var gradientCases = {
                'qa-support-preset-gradient': [
                    {path:'gradient',value:'animewp-wash'},
                    {path:'style.typography.textAlign',value:'center'}
                ],
                'qa-support-custom-gradient': [
                    {path:'style.color.gradient',value:'linear-gradient(135deg, rgb(20, 20, 20) 0%, rgb(245, 245, 245) 100%)'},
                    {path:'style.typography.textAlign',value:'right'}
                ]
            };
            var gradientExpectations = gradientCases[block.attributes.className];
            if (gradientExpectations) {
                reportAttributes('attributes/roundtrip/' + block.attributes.className, wp.blocks.parse(serializedBlock)[0], gradientExpectations);
            }
            var type = wp.blocks.getBlockType(block.name);
            ((type.transforms && type.transforms.to) || []).forEach(function (transform, offset) {
                var transformed = transform.transform(block.attributes, block.innerBlocks);
                var savedTransform = wp.blocks.serialize(Array.isArray(transformed) ? transformed : [transformed]);
                check('transform/' + index + '/' + offset, savedTransform);
                if (gradientExpectations) {
                    reportAttributes('attributes/transform/' + block.attributes.className, wp.blocks.parse(savedTransform)[0], gradientExpectations);
                }
                if (block.name === 'animewp/video' && block.attributes.crossOriginMode === 'anonymous') {
                    results.push({name:'CORS transformed video content survives',blocks:1,invalid:/<video[^>]*crossorigin="anonymous"/.test(savedTransform)&&/<track/.test(savedTransform)?[]:[{name:'missing video or track'}]});
                }
            });
        });
        canonical['rotation-fixture'] = variants.map(function (block) { return wp.blocks.serialize([block]); }).join('\n\n');
        document.getElementById('animewp-qa-result').textContent = JSON.stringify(results, null, 2);
        document.getElementById('animewp-qa-canonical').value = JSON.stringify(canonical);
    });
})();
