/* AnimeWP Blocks — plain WordPress APIs, no build step or external runtime. */
(function (wp) {
    'use strict';

    var el = wp.element.createElement;
    var Fragment = wp.element.Fragment;
    var blocks = wp.blocks;
    var editor = wp.blockEditor;
    var components = wp.components;
    var __ = wp.i18n.__;
    var domain = 'animewp-blocks';

    function numberValue(value, min, max, fallback) {
        return typeof value === 'number' && Number.isFinite(value)
            ? Math.min(max, Math.max(min, value)) : fallback;
    }
    function enumValue(value, allowed, fallback) {
        return allowed.indexOf(value) !== -1 ? value : fallback;
    }
    function safeText(value, fallback, max) {
        return typeof value === 'string' && value.trim() ? value.trim().slice(0, max || 200) : fallback;
    }
    function safeColor(value, fallback) {
        if (typeof value !== 'string') { return fallback; }
        var color = value.trim();
        // A color only: no URL, variable expansion, declarations, or nested functions.
        if (/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color) ||
            /^[a-z]{1,30}$/i.test(color) ||
            /^(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\([0-9.,%+\-\s/]+\)$/i.test(color)) {
            return color;
        }
        return fallback;
    }
    function safeUrl(value) {
        if (typeof value !== 'string') { return ''; }
        var url = value.trim();
        if (!/^(?:https?:\/\/|\/(?!\/))/i.test(url) || /[\\\u0000-\u0020\u007f<>"`]/.test(url)) { return ''; }
        try {
            var parsed = new URL(url, window.location.origin);
            return /^(?:http:|https:)$/.test(parsed.protocol) && !parsed.username && !parsed.password ? url : '';
        } catch (error) { return ''; }
    }
    function languageValue(value) {
        return typeof value === 'string' && /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(value) ? value : 'ja';
    }
    function coreAttributes(attributes) {
        var result = {};
        ['align', 'anchor', 'backgroundColor', 'textColor', 'fontSize', 'style'].forEach(function (key) {
            if (attributes[key] !== undefined) { result[key] = attributes[key]; }
        });
        return result;
    }
    function spacingValue(value) {
        if (typeof value !== 'string' || !/^(?:0|[\d.]+(?:px|rem|em|vw|vh|%)|var:preset\|spacing\|[a-z0-9-]+)$/i.test(value)) { return undefined; }
        return value.indexOf('var:preset|spacing|') === 0 ? 'var(--wp--preset--spacing--' + value.split('|')[2] + ')' : value;
    }
    function range(attributes, setAttributes, key, label, min, max, fallback, step) {
        return el(components.RangeControl, {
            label: __(label, domain), value: numberValue(attributes[key], min, max, fallback),
            min: min, max: max, step: step || 1,
            onChange: function (value) {
                var update = {}; update[key] = numberValue(value, min, max, fallback); setAttributes(update);
            }
        });
    }
    function select(attributes, setAttributes, key, label, choices, fallback, help) {
        return el(components.SelectControl, {
            label: __(label, domain), help: help ? __(help, domain) : undefined,
            value: enumValue(attributes[key], choices.map(function (choice) { return choice.value; }), fallback),
            options: choices.map(function (choice) { return { label: __(choice.label, domain), value: choice.value }; }),
            onChange: function (value) { var update = {}; update[key] = value; setAttributes(update); }
        });
    }
    function toggle(attributes, setAttributes, key, label, help) {
        return el(components.ToggleControl, {
            label: __(label, domain), help: help ? __(help, domain) : undefined,
            checked: attributes[key] === true,
            onChange: function (value) { var update = {}; update[key] = !!value; setAttributes(update); }
        });
    }

    function panelClass(attributes) {
        var headingLength = (attributes.heading || '').replace(/<[^>]*>/g, '').length;
        var vertical = attributes.verticalHeading === true && headingLength > 0 && headingLength <= 40;
        return [
            'animewp-panel--boundary-' + enumValue(attributes.boundary, ['none', 'wave', 'diagonal'], 'none'),
            'animewp-panel--shadow-' + enumValue(attributes.panelShadow, ['none', 'soft', 'hard'], 'none'),
            'animewp-panel--text-shadow-' + enumValue(attributes.textShadow, ['none', 'soft', 'hard'], 'none'),
            'animewp-panel--highlight-' + enumValue(attributes.highlight, ['none', 'line', 'panel'], 'none'),
            vertical ? 'animewp-panel--vertical-heading' : '',
            attributes.backdropEnabled === true ? 'animewp-panel--backdrop' : ''
        ].filter(Boolean).join(' ');
    }
    function panelStyles(attributes) {
        var styles = {};
        // Retain this serialized legacy variable so existing saved blocks stay valid.
        // Standard backgrounds now paint on the root; the explicit backdrop is separate.
        var color = attributes.style && attributes.style.color && attributes.style.color.background;
        if (color) { styles['--animewp-panel-background'] = safeColor(color, 'transparent'); }
        else if (typeof attributes.backgroundColor === 'string' && /^[a-z0-9-]+$/i.test(attributes.backgroundColor)) {
            styles['--animewp-panel-background'] = 'var(--wp--preset--color--' + attributes.backgroundColor + ')';
        }
        if (attributes.backdropEnabled === true && attributes.backdropColor !== '#e5e5e5') {
            styles['--animewp-panel-backdrop-background'] = safeColor(attributes.backdropColor, '#e5e5e5');
        }
        if (attributes.backgroundSkew) { styles['--animewp-panel-skew'] = numberValue(attributes.backgroundSkew, -12, 12, 0) + 'deg'; }
        if (attributes.rotation) { styles['--animewp-panel-rotation'] = numberValue(attributes.rotation, -8, 8, 0) + 'deg'; }
        if (attributes.backgroundOpacity !== 100) { styles['--animewp-panel-opacity'] = numberValue(attributes.backgroundOpacity, 0, 100, 100) / 100; }
        if (attributes.radius) { styles['--animewp-panel-radius'] = numberValue(attributes.radius, 0, 100, 0) + 'px'; }
        if (attributes.highlightColor !== '#e5e5e5') { styles['--animewp-panel-highlight'] = safeColor(attributes.highlightColor, '#e5e5e5'); }
        if (attributes.highlightPadding !== 0.2) { styles['--animewp-panel-highlight-padding'] = numberValue(attributes.highlightPadding, 0, 2, 0.2) + 'em'; }
        var gap = spacingValue(attributes.style && attributes.style.spacing && attributes.style.spacing.blockGap);
        if (gap !== undefined) { styles['--animewp-panel-gap'] = gap; }
        return styles;
    }
    function panelEdit(props) {
        var a = props.attributes;
        var set = props.setAttributes;
        var rootProps = editor.useBlockProps({ className: panelClass(a), style: panelStyles(a) });
        var innerProps = editor.useInnerBlocksProps({ className: 'animewp-panel__content' }, {
            template: [['core/paragraph', {}]], renderAppender: editor.InnerBlocks.ButtonBlockAppender
        });
        var shadows = [{ label: 'なし', value: 'none' }, { label: '柔らかい影', value: 'soft' }, { label: 'くっきりした影', value: 'hard' }];
        return el(Fragment, null,
            el(editor.InspectorControls, null,
                el(components.PanelBody, { title: __('パネル装飾', domain), initialOpen: false },
                    el('p', null, __('背景・文字の色、余白、文字サイズは標準のスタイル設定で調整します。', domain)),
                    toggle(a, set, 'backdropEnabled', '装飾背景レイヤーを追加', '標準背景の上に別の色面を重ねます。標準背景・グローバルスタイルはそのまま残ります。'),
                    a.backdropEnabled && el(Fragment, null,
                        el(components.BaseControl, { label: __('装飾背景レイヤーの色', domain) },
                            el(editor.ColorPalette, {
                                colors: [{ name: __('白', domain), color: '#ffffff' }, { name: __('灰', domain), color: '#e5e5e5' }, { name: __('黒', domain), color: '#111111' }],
                                value: safeColor(a.backdropColor, '#e5e5e5'),
                                onChange: function (value) { set({ backdropColor: safeColor(value, '#e5e5e5') }); }
                            })
                        ),
                        select(a, set, 'boundary', '装飾背景の境界', [
                            { label: 'なし', value: 'none' }, { label: '波形', value: 'wave' }, { label: '斜め', value: 'diagonal' }
                        ], 'none'),
                        range(a, set, 'backgroundSkew', '装飾背景だけの傾斜（度）', -12, 12, 0),
                        range(a, set, 'backgroundOpacity', '装飾背景の不透明度（%）', 0, 100, 100)
                    ),
                    range(a, set, 'rotation', '全体の回転（度）', -8, 8, 0),
                    range(a, set, 'radius', '角丸（px）', 0, 100, 0),
                    select(a, set, 'panelShadow', 'パネルの影', shadows, 'none'),
                    select(a, set, 'textShadow', '文字の影', shadows, 'none')
                ),
                el(components.PanelBody, { title: __('短い見出し', domain), initialOpen: false },
                    el(components.SelectControl, {
                        label: __('見出しレベル', domain), value: a.headingLevel,
                        options: [2, 3, 4, 5, 6].map(function (value) { return { label: 'H' + value, value: value }; }),
                        onChange: function (value) { set({ headingLevel: Number(value) }); }
                    }),
                    toggle(a, set, 'verticalHeading', '見出しだけ縦書き', '40文字以内で適用。本文とモバイル表示は横書きです。'),
                    select(a, set, 'highlight', '見出しの帯', [
                        { label: 'なし', value: 'none' }, { label: '折り返す各行に帯', value: 'line' }, { label: '余白つきの一枚パネル', value: 'panel' }
                    ], 'none'),
                    a.highlight !== 'none' && el(components.BaseControl, { label: __('帯の色', domain) },
                        el(editor.ColorPalette, {
                            colors: [{ name: __('白', domain), color: '#ffffff' }, { name: __('灰', domain), color: '#e5e5e5' }, { name: __('黒', domain), color: '#111111' }],
                            value: safeColor(a.highlightColor, '#e5e5e5'),
                            onChange: function (value) { set({ highlightColor: safeColor(value, '#e5e5e5') }); }
                        })
                    ),
                    a.highlight !== 'none' && range(a, set, 'highlightPadding', '帯の内側余白（em）', 0, 2, 0.2, 0.05)
                )
            ),
            el('section', rootProps,
                el('h' + enumValue(a.headingLevel, [2, 3, 4, 5, 6], 2), { className: 'animewp-panel__heading' },
                    el(editor.RichText, {
                        tagName: 'span', className: 'animewp-panel__heading-text', value: a.heading,
                        placeholder: __('短い見出し（任意）', domain), allowedFormats: ['core/bold', 'core/italic'],
                        onChange: function (value) { set({ heading: value }); }
                    })
                ),
                el('div', innerProps)
            )
        );
    }
    function panelSave(props) {
        var a = props.attributes;
        return el('section', editor.useBlockProps.save({ className: panelClass(a), style: panelStyles(a) }),
            a.heading && el('h' + enumValue(a.headingLevel, [2, 3, 4, 5, 6], 2), { className: 'animewp-panel__heading' },
                el(editor.RichText.Content, { tagName: 'span', className: 'animewp-panel__heading-text', value: a.heading })
            ),
            el('div', { className: 'animewp-panel__content' }, el(editor.InnerBlocks.Content))
        );
    }

    function mediaClass(a) {
        return 'animewp-media--' + enumValue(a.layoutMode, ['side', 'overlay'], 'side') +
            ' animewp-media--image-' + enumValue(a.imageSide, ['left', 'right'], 'left') +
            (a.crop === true ? ' animewp-media--crop' : '');
    }
    function mediaStyles(a) {
        var styles = {};
        if (a.imageWidth !== 50) { styles['--animewp-media-image-width'] = numberValue(a.imageWidth, 20, 80, 50) + '%'; }
        if (a.crop === true) {
            styles['--animewp-media-focus'] = numberValue(a.focalX, 0, 100, 50) + '% ' + numberValue(a.focalY, 0, 100, 50) + '%';
            styles['--animewp-media-mobile-focus'] = a.independentMobileFocus === true
                ? numberValue(a.mobileFocalX, 0, 100, 50) + '% ' + numberValue(a.mobileFocalY, 0, 100, 50) + '%'
                : styles['--animewp-media-focus'];
            styles['--animewp-media-height'] = numberValue(a.imageHeight, 120, 1200, 400) + 'px';
            styles['--animewp-media-mobile-height'] = numberValue(a.mobileImageHeight, 120, 800, 280) + 'px';
        }
        var gap = spacingValue(a.style && a.style.spacing && a.style.spacing.blockGap);
        if (gap !== undefined) { styles['--animewp-media-gap'] = gap; }
        return styles;
    }
    function mediaEdit(props) {
        var a = props.attributes;
        var set = props.setAttributes;
        var children = wp.data.useSelect(function (selectors) {
            return selectors('core/block-editor').getBlocks(props.clientId);
        }, [props.clientId]);
        var dispatch = wp.data.useDispatch('core/block-editor');
        var rootProps = editor.useBlockProps({ className: mediaClass(a), style: mediaStyles(a) });
        var imageTemplate = ['core/image', { sizeSlug: 'large', linkDestination: 'none' }];
        var bodyTemplate = ['core/group', { templateLock: false, layout: { type: 'default' } }, [
            ['core/heading', { placeholder: __('見出し', domain) }],
            ['core/paragraph', { placeholder: __('本文を入力', domain) }]
        ]];
        var textFirst = children[0] && children[0].name === 'core/group';
        var innerProps = editor.useInnerBlocksProps({ className: 'animewp-media__layout' }, {
            allowedBlocks: ['core/image', 'core/group'], templateLock: 'insert',
            // Apply only when empty. An "all" lock would re-sync nested user content.
            // The insert lock preserves the two containers while allowing reading order changes.
            template: [imageTemplate, bodyTemplate]
        });
        function changeReadingOrder(value) {
            var image = children.find(function (block) { return block.name === 'core/image'; });
            var body = children.find(function (block) { return block.name === 'core/group'; });
            if (!image || !body) { return; }
            var rest = children.filter(function (block) { return block !== image && block !== body; });
            dispatch.replaceInnerBlocks(props.clientId, (value === 'text-first' ? [body, image] : [image, body]).concat(rest), false);
        }
        return el(Fragment, null,
            el(editor.InspectorControls, null,
                el(components.PanelBody, { title: __('画像と本文の配置', domain) },
                    el(components.SelectControl, {
                        label: __('読む順（モバイルと保存HTML）', domain),
                        value: textFirst ? 'text-first' : 'image-first',
                        options: [{ label: __('画像 → 本文', domain), value: 'image-first' }, { label: __('本文 → 画像', domain), value: 'text-first' }],
                        help: __('保存DOMを並べ替えます。読み上げ順とモバイルの表示順は常に同じです。', domain),
                        onChange: changeReadingOrder
                    }),
                    select(a, set, 'layoutMode', 'デスクトップの構図', [{ label: '横並び', value: 'side' }, { label: '画像に本文を重ねる', value: 'overlay' }], 'side', 'モバイルでは重ねず、読む順で縦に並びます。'),
                    a.layoutMode !== 'overlay' && select(a, set, 'imageSide', 'デスクトップの画像位置', [{ label: '左', value: 'left' }, { label: '右', value: 'right' }], 'left', '左右配置は見た目だけの変更です。読み上げ順は「読む順」で設定します。'),
                    a.layoutMode !== 'overlay' && range(a, set, 'imageWidth', '画像の幅（%）', 20, 80, 50),
                    a.layoutMode === 'overlay' && el('p', null, __('文字を読みやすくするため、内側の標準グループで背景色・文字色・余白を設定してください。', domain)),
                    toggle(a, set, 'crop', '画像を一定の高さで切り抜く'),
                    a.crop && el(Fragment, null,
                        range(a, set, 'imageHeight', '画像の高さ（px）', 120, 1200, 400),
                        range(a, set, 'focalX', '焦点の横位置（%）', 0, 100, 50),
                        range(a, set, 'focalY', '焦点の縦位置（%）', 0, 100, 50),
                        range(a, set, 'mobileImageHeight', 'モバイルの画像の高さ（px）', 120, 800, 280),
                        toggle(a, set, 'independentMobileFocus', 'モバイルの焦点を個別設定'),
                        a.independentMobileFocus && range(a, set, 'mobileFocalX', 'モバイル焦点の横位置（%）', 0, 100, 50),
                        a.independentMobileFocus && range(a, set, 'mobileFocalY', 'モバイル焦点の縦位置（%）', 0, 100, 50)
                    )
                )
            ),
            el('div', rootProps, el('div', innerProps))
        );
    }
    function mediaSave(props) {
        return el('div', editor.useBlockProps.save({ className: mediaClass(props.attributes), style: mediaStyles(props.attributes) }),
            el('div', { className: 'animewp-media__layout' }, el(editor.InnerBlocks.Content))
        );
    }

    function videoElement(a) {
        var url = safeUrl(a.videoUrl);
        if (!url) { return null; }
        var track = safeUrl(a.trackUrl);
        return el('video', { controls: true, playsInline: true, preload: 'none', src: url, poster: safeUrl(a.posterUrl) || undefined },
            track && el('track', { kind: 'captions', src: track, srcLang: languageValue(a.trackLanguage), label: safeText(a.trackLabel, '字幕', 80), default: true })
        );
    }
    function videoEdit(props) {
        var a = props.attributes;
        var set = props.setAttributes;
        var rootProps = editor.useBlockProps();
        var innerProps = editor.useInnerBlocksProps({ className: 'animewp-video__content' }, {
            template: [], renderAppender: editor.InnerBlocks.ButtonBlockAppender
        });
        var url = safeUrl(a.videoUrl);
        function field(key, label, help) {
            return el(components.TextControl, {
                label: __(label, domain), help: help ? __(help, domain) : undefined, value: a[key] || '',
                onChange: function (value) { var update = {}; update[key] = value; set(update); }
            });
        }
        return el(Fragment, null,
            el(editor.InspectorControls, null,
                el(components.PanelBody, { title: __('動画と字幕', domain) },
                    field('videoUrl', '動画ファイルのURL', 'HTTP(S)またはサイト内の / で始まるパス。再生可能な動画ファイルを指定します。'),
                    a.videoUrl && !url && el(components.Notice, { status: 'warning', isDismissible: false }, __('このURLは保存時に無効化されます。正しい動画URLを入力してください。', domain)),
                    field('posterUrl', 'ポスター画像のURL（任意）'),
                    field('buttonLabel', '開くボタンの文言'),
                    field('closeLabel', '閉じるボタンの文言'),
                    field('trackUrl', '字幕ファイルのURL（WebVTT・任意）', '動画と同じ配信元を推奨します。字幕の配信設定も確認してください。'),
                    a.trackUrl && !safeUrl(a.trackUrl) && el(components.Notice, { status: 'warning', isDismissible: false }, __('字幕URLが無効です。', domain)),
                    field('trackLanguage', '字幕の言語コード'),
                    field('trackLabel', '字幕の表示名'),
                    el(components.TextareaControl, { label: __('動画の説明', domain), value: a.description, onChange: function (value) { set({ description: value }); } })
                )
            ),
            el('div', rootProps,
                el(editor.MediaUploadCheck, null,
                    el(editor.MediaUpload, {
                        allowedTypes: ['video'], value: numberValue(a.videoId, 0, Number.MAX_SAFE_INTEGER, 0),
                        onSelect: function (media) { set({ videoUrl: safeUrl(media.url), videoId: numberValue(media.id, 0, Number.MAX_SAFE_INTEGER, 0) }); },
                        render: function (control) { return el(components.Button, { variant: 'secondary', onClick: control.open }, __(url ? '動画を変更' : 'メディアから動画を選択', domain)); }
                    })
                ),
                url ? videoElement(a) : el('p', null, __('動画を選択するか、設定欄に動画URLを入力してください。', domain)),
                el('p', { className: 'animewp-video__editor-note' }, __('公開ページではボタンを押すと開きます。説明や文字起こしは下に標準ブロックで追加できます。', domain)),
                a.description && el('p', { className: 'animewp-video__description' }, a.description),
                el('div', innerProps)
            )
        );
    }
    function videoSave(props) {
        var a = props.attributes;
        var url = safeUrl(a.videoUrl);
        return el('div', editor.useBlockProps.save(),
            url && el('button', {
                className: 'animewp-video__trigger', type: 'button', hidden: true,
                'data-animewp-close-label': safeText(a.closeLabel, '閉じる', 80)
            }, safeText(a.buttonLabel, '動画を開く', 100)),
            url && el('div', { className: 'animewp-video__fallback' }, videoElement(a)),
            a.description && el('p', { className: 'animewp-video__description' }, a.description),
            url && el('p', { className: 'animewp-video__link' }, el('a', { href: url }, '動画ファイルを開く')),
            el('div', { className: 'animewp-video__content' }, el(editor.InnerBlocks.Content))
        );
    }

    var definitions = {
        'animewp/panel': {
            edit: panelEdit, save: panelSave,
            transforms: { to: [{ type: 'block', blocks: ['core/group'], transform: function (a, innerBlocks) {
                var contents = innerBlocks.slice();
                if (a.heading) { contents.unshift(blocks.createBlock('core/heading', { content: a.heading, level: enumValue(a.headingLevel, [2, 3, 4, 5, 6], 2) })); }
                return blocks.createBlock('core/group', coreAttributes(a), contents);
            } }] }
        },
        'animewp/media': {
            edit: mediaEdit, save: mediaSave,
            transforms: { to: [
                { type: 'block', blocks: ['core/group'], transform: function (a, innerBlocks) { return blocks.createBlock('core/group', coreAttributes(a), innerBlocks); } },
                { type: 'block', blocks: ['core/media-text'], transform: function (a, innerBlocks) {
                    var image = innerBlocks.find(function (block) { return block.name === 'core/image'; });
                    var body = innerBlocks.find(function (block) { return block.name === 'core/group'; });
                    var contents = body ? [body] : [];
                    if (image && image.attributes.caption) {
                        contents.push(blocks.createBlock('core/paragraph', { content: image.attributes.caption }));
                    }
                    return blocks.createBlock('core/media-text', Object.assign(coreAttributes(a), {
                        mediaId: image ? image.attributes.id : undefined,
                        mediaUrl: image ? safeUrl(image.attributes.url) : '',
                        mediaAlt: image ? image.attributes.alt || '' : '',
                        href: image ? safeUrl(image.attributes.href) || undefined : undefined,
                        linkTarget: image ? image.attributes.linkTarget : undefined,
                        rel: image ? image.attributes.rel : undefined,
                        linkDestination: image ? image.attributes.linkDestination : undefined,
                        mediaSizeSlug: image ? image.attributes.sizeSlug : undefined,
                        mediaType: 'image', mediaPosition: a.imageSide === 'right' ? 'right' : 'left',
                        mediaWidth: numberValue(a.imageWidth, 20, 80, 50), isStackedOnMobile: true
                    }), contents);
                } }
            ] }
        },
        'animewp/video': {
            edit: videoEdit, save: videoSave,
            transforms: { to: [{ type: 'block', blocks: ['core/group'], transform: function (a, innerBlocks) {
                var contents = [];
                var track = safeUrl(a.trackUrl);
                if (safeUrl(a.videoUrl)) {
                    contents.push(blocks.createBlock('core/video', {
                        src: safeUrl(a.videoUrl), id: a.videoId || undefined, poster: safeUrl(a.posterUrl) || undefined,
                        controls: true, playsInline: true, preload: 'none',
                        tracks: track ? [{ src: track, kind: 'captions', srcLang: languageValue(a.trackLanguage), label: safeText(a.trackLabel, '字幕', 80) }] : []
                    }));
                }
                if (a.description) {
                    var text = a.description.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    contents.push(blocks.createBlock('core/paragraph', { content: text }));
                }
                return blocks.createBlock('core/group', coreAttributes(a), contents.concat(innerBlocks));
            } }] }
        }
    };
    (window.animewpBlocksMetadata || []).forEach(function (metadata) {
        if (definitions[metadata.name] && !blocks.getBlockType(metadata.name)) {
            blocks.registerBlockType(metadata, definitions[metadata.name]);
        }
    });
}(window.wp));
