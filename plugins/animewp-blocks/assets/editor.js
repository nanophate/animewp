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
    function isSameOrigin(value) {
        var url = safeUrl(value);
        return !!url && new URL(url, window.location.origin).origin === window.location.origin;
    }
    function localPosterUrl(value) {
        var url = safeUrl(value);
        if (!url) { return ''; }
        try {
            var parsed = new URL(url, window.location.origin);
            return parsed.origin === window.location.origin ? parsed.pathname + parsed.search + parsed.hash : '';
        } catch (error) { return ''; }
    }
    function coreAttributes(attributes) {
        var result = {};
        ['align', 'anchor', 'backgroundColor', 'textColor', 'gradient', 'fontSize', 'style'].forEach(function (key) {
            if (attributes[key] !== undefined) { result[key] = attributes[key]; }
        });
        return result;
    }
    function spacingValue(value) {
        if (typeof value !== 'string' || !/^(?:0|[\d.]+(?:px|rem|em|vw|vh|%)|var:preset\|spacing\|[a-z0-9-]+)$/i.test(value)) { return undefined; }
        return value.indexOf('var:preset|spacing|') === 0 ? 'var(--wp--preset--spacing--' + value.split('|')[2] + ')' : value;
    }
    function range(attributes, setAttributes, key, label, min, max, fallback, step, help) {
        return el(components.RangeControl, {
            label: __(label, domain), value: numberValue(attributes[key], min, max, fallback),
            help: help ? __(help, domain) : undefined,
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

    function decorationColor(a, prefix) {
        var slug = a[prefix + 'ColorMode'] === 'role' ? enumValue(a[prefix + 'Role'], ['surface', 'accent', 'contrast'], 'surface') : a[prefix + 'Preset'];
        if ((a[prefix + 'ColorMode'] === 'role' || a[prefix + 'ColorMode'] === 'preset') && typeof slug === 'string' && /^[\p{L}\p{N}-]+$/u.test(slug)) {
            var fallback = a[prefix + 'ColorMode'] === 'role' && slug !== 'surface' ? '#202020' : '#e5e5e5';
            return 'var(--wp--preset--color--' + slug + ',' + fallback + ')';
        }
        return safeColor(a[prefix + 'Color'], '#e5e5e5');
    }
    function roleForeground(a, prefix) {
        var role = enumValue(a[prefix + 'Role'], ['surface', 'accent', 'contrast'], 'surface');
        return role === 'surface' ? 'var(--wp--preset--color--contrast,#202020)' : 'var(--wp--preset--color--on-' + role + ',#ffffff)';
    }
    function decorationColorControls(a, set, prefix) {
        var mode = enumValue(a[prefix + 'ColorMode'], ['custom', 'preset', 'role'], 'custom');
        var colors = window.animewpColorPresets || [];
        return el(Fragment, null,
            select(a, set, prefix + 'ColorMode', '色の指定方法', [{ label: '任意の色（既存の色を保持）', value: 'custom' }, { label: 'サイトの色見本に追従', value: 'preset' }, { label: '色の役割に追従', value: 'role' }], 'custom'),
            mode === 'custom' && el(editor.ColorPalette, { colors: colors.filter(function (color) { return !!safeColor(color.color, ''); }), value: safeColor(a[prefix + 'Color'], '#e5e5e5'), onChange: function (value) { var update = {}; update[prefix + 'Color'] = safeColor(value, '#e5e5e5'); set(update); } }),
            mode === 'preset' && el(components.SelectControl, { label: __('色見本', domain), value: a[prefix + 'Preset'], options: [{ label: __('選択してください', domain), value: '' }].concat(colors.map(function (color) { return { label: color.name || color.slug, value: color.variableSlug }; })), onChange: function (value) { var update = {}; update[prefix + 'Preset'] = value; set(update); } }),
            mode === 'role' && select(a, set, prefix + 'Role', '色の役割', [{ label: '淡い背景 / surface', value: 'surface' }, { label: '強調 / accent', value: 'accent' }, { label: '濃い面 / contrast', value: 'contrast' }], 'surface'),
            el('p', null, __('色見本・役割は配色変更に追従します。任意の色はそのまま残ります。役割は対応する文字色も選びます。文字色の個別指定が優先されるため、装飾を変えた後は読みやすさを確認してください。', domain))
        );
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
        if (attributes.backdropEnabled === true && (attributes.backdropColor !== '#e5e5e5' || (attributes.backdropColorMode && attributes.backdropColorMode !== 'custom'))) {
            styles['--animewp-panel-backdrop-background'] = decorationColor(attributes, 'backdrop');
        }
        var explicitText = attributes.textColor || (attributes.style && attributes.style.color && attributes.style.color.text);
        if (!explicitText && attributes.backdropEnabled && attributes.backdropColorMode === 'role') {
            styles['--animewp-panel-role-foreground'] = roleForeground(attributes, 'backdrop');
            styles.color = roleForeground(attributes, 'backdrop');
        }
        if (!explicitText && attributes.highlight !== 'none' && attributes.highlightColorMode === 'role') {
            styles['--animewp-panel-highlight-foreground'] = roleForeground(attributes, 'highlight');
        }
        if (attributes.backgroundSkew) { styles['--animewp-panel-skew'] = numberValue(attributes.backgroundSkew, -12, 12, 0) + 'deg'; }
        // Omit the new default so existing panels do not gain a serialized style.
        if (attributes.backgroundRotation) { styles['--animewp-panel-backdrop-rotation'] = numberValue(attributes.backgroundRotation, -8, 8, 0) + 'deg'; }
        if (attributes.rotation) { styles['--animewp-panel-rotation'] = numberValue(attributes.rotation, -8, 8, 0) + 'deg'; }
        // Older WordPress serializers append px to numeric custom properties.
        if (attributes.backgroundOpacity !== 100) { styles['--animewp-panel-opacity'] = String(numberValue(attributes.backgroundOpacity, 0, 100, 100) / 100); }
        if (attributes.radius) { styles['--animewp-panel-radius'] = numberValue(attributes.radius, 0, 100, 0) + 'px'; }
        if (attributes.highlightColor !== '#e5e5e5' || (attributes.highlightColorMode && attributes.highlightColorMode !== 'custom')) { styles['--animewp-panel-highlight'] = decorationColor(attributes, 'highlight'); }
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
                            decorationColorControls(a, set, 'backdrop')
                        ),
                        select(a, set, 'boundary', '装飾背景の境界', [
                            { label: 'なし', value: 'none' }, { label: '波形', value: 'wave' }, { label: '斜め', value: 'diagonal' }
                        ], 'none'),
                        range(a, set, 'backgroundRotation', '装飾背景だけの回転（度）', -8, 8, 0, 1, '追加した色面だけを回転します。本文の角度は変わりません。'),
                        range(a, set, 'backgroundSkew', '装飾背景だけの傾斜（度）', -12, 12, 0, 1, '色面を斜めにゆがめます。回転とは別の変形です。'),
                        range(a, set, 'backgroundOpacity', '装飾背景の不透明度（%）', 0, 100, 100)
                    ),
                    range(a, set, 'rotation', 'パネル全体の回転（度）', -8, 8, 0, 1, '背景とすべての内側ブロックを一緒に回転します。内側が0度でも親の回転は受けます。'),
                    el('p', null, __('一部の文字だけを傾けるには、全体の回転を0度にして、内側に「AnimeWP 文字グループ」を追加します。水平にしたい段落は文字グループの外に置きます。', domain)),
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
                        decorationColorControls(a, set, 'highlight')
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

    function textGroupStyles(a) {
        var styles = {};
        if (a.rotation) { styles['--animewp-text-group-rotation'] = numberValue(a.rotation, -8, 8, 0) + 'deg'; }
        if (a.mobileRotation) { styles['--animewp-text-group-mobile-rotation'] = numberValue(a.mobileRotation, -8, 8, 0) + 'deg'; }
        var gap = spacingValue(a.style && a.style.spacing && a.style.spacing.blockGap);
        if (gap !== undefined) { styles['--animewp-text-group-gap'] = gap; }
        return styles;
    }
    function textGroupEdit(props) {
        var a = props.attributes;
        var rootProps = editor.useBlockProps({ style: textGroupStyles(a) });
        var innerProps = editor.useInnerBlocksProps({ className: 'animewp-text-group__content' }, {
            template: [['core/paragraph', { placeholder: __('このグループに入れる文章', domain) }]],
            renderAppender: editor.InnerBlocks.ButtonBlockAppender
        });
        return el(Fragment, null,
            el(editor.InspectorControls, null,
                el(components.PanelBody, { title: __('文字グループの回転', domain) },
                    el('p', null, __('内側の段落・見出し・標準グループをまとめて回転します。隣のブロックには適用しません。文字の一部分だけを選択する設定ではありません。', domain)),
                    range(a, props.setAttributes, 'rotation', 'この文字グループの回転（度）', -8, 8, 0, 1, '幅782px以上で適用。0度は水平、マイナスは左、プラスは右に傾きます。'),
                    range(a, props.setAttributes, 'mobileRotation', 'モバイルの回転（度）', -8, 8, 0, 1, '幅781px以下で適用。読みやすさのため初期値は0度です。'),
                    el('p', null, __('親のパネルやグループが回転している場合は、その回転も受けます。文字だけを傾ける構成では親の回転を0度にしてください。', domain)),
                    el('p', null, __('角度を変えるときは、リスト表示や編集画面下の階層から「文字グループ」を選びます。背景・文字色・余白・文字サイズは標準のスタイル設定で調整できます。', domain))
                )
            ),
            el('div', rootProps, el('div', innerProps))
        );
    }
    function textGroupSave(props) {
        return el('div', editor.useBlockProps.save({ style: textGroupStyles(props.attributes) }),
            el('div', { className: 'animewp-text-group__content' }, el(editor.InnerBlocks.Content))
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
        return el('video', { controls: true, playsInline: true, preload: 'none', src: url, poster: safeUrl(a.posterUrl) || undefined,
            crossOrigin: a.crossOriginMode === 'anonymous' ? 'anonymous' : undefined },
            track && el('track', { kind: 'captions', src: track, srcLang: languageValue(a.trackLanguage), label: safeText(a.trackLabel, '字幕', 80), default: true })
        );
    }
    function videoEdit(props) {
        var a = props.attributes;
        var posterSelectionState = wp.element.useState(false);
        var posterSelectionError = posterSelectionState[0];
        var setPosterSelectionError = posterSelectionState[1];
        var set = function (update) {
            if ((update.source === 'youtube' || update.source === 'vimeo') && isSameOrigin(a.posterUrl)) {
                var poster = new URL(a.posterUrl, window.location.href);
                update.posterUrl = poster.pathname + poster.search + poster.hash;
            }
            props.setAttributes(update);
        };
        var rootProps = editor.useBlockProps();
        var innerProps = editor.useInnerBlocksProps({ className: 'animewp-video__content' }, {
            template: [], renderAppender: editor.InnerBlocks.ButtonBlockAppender
        });
        var url = safeUrl(a.videoUrl);
        var external = a.source === 'youtube' || a.source === 'vimeo';
        var provider = external && window.animewpVideoProviders.normalize(a.source, a.videoUrl);
        var localPoster = external ? localPosterUrl(a.posterUrl) : '';
        function posterPicker() {
            var mediaUpload = el(editor.MediaUpload, {
                allowedTypes: ['image'],
                onSelect: function (media) {
                    var selectedPoster = localPosterUrl(media && media.url);
                    if (!selectedPoster) { setPosterSelectionError(true); return; }
                    setPosterSelectionError(false);
                    set({ posterUrl: selectedPoster });
                },
                render: function (control) {
                    return el(components.Button, { variant: 'secondary', onClick: control.open }, __(localPoster ? 'ポスター画像を変更' : 'サイト内のポスター画像を選択', domain));
                }
            });
            return el(Fragment, null,
                el(editor.MediaUploadCheck, null, mediaUpload),
                a.posterUrl && el(components.Button, {
                    variant: 'tertiary', isDestructive: true,
                    onClick: function () { setPosterSelectionError(false); set({ posterUrl: '' }); }
                }, __('ポスター画像をクリア', domain)),
                a.posterUrl && !localPoster && el(components.Notice, { status: 'warning', isDismissible: false }, __('YouTubeとVimeoではサイト内メディアライブラリーの画像だけを使えます。外部画像は読み込みません。', domain)),
                posterSelectionError && el(components.Notice, { status: 'warning', isDismissible: false }, __('選択した画像はサイト内URLではありません。YouTubeとVimeoにはサイト内の画像を選んでください。', domain))
            );
        }
        function externalPreview() {
            return el('div', { className: 'animewp-video__preview', role: 'group', 'aria-label': __('ポスターと再生ボタンの見本', domain) },
                el('div', { className: 'animewp-video__preview-frame' },
                    localPoster && el('img', { src: localPoster, alt: '', loading: 'lazy' }),
                    el('span', { className: 'animewp-video__trigger animewp-video__preview-cta' }, safeText(a.buttonLabel, '動画を開く', 100))
                ),
                !localPoster && el('p', { className: 'animewp-video__preview-hint' }, __('サイト内ポスターを選ぶと、ここに見本を表示します。', domain))
            );
        }
        function field(key, label, help) {
            return el(components.TextControl, {
                label: __(label, domain), help: help ? __(help, domain) : undefined, value: a[key] || '',
                onChange: function (value) {
                    var update = {};
                    if (external && key === 'posterUrl' && isSameOrigin(value)) {
                        var poster = new URL(value, window.location.href);
                        value = poster.pathname + poster.search + poster.hash;
                    }
                    update[key] = value; set(update);
                }
            });
        }
        return el(Fragment, null,
            el(editor.InspectorControls, null,
                el(components.PanelBody, { title: __('動画と字幕', domain) },
                    select(a, set, 'source', '動画の種類', [{ label: '動画ファイル', value: 'file' }, { label: 'YouTube', value: 'youtube' }, { label: 'Vimeo（公開動画）', value: 'vimeo' }], 'file'),
                    field('videoUrl', external ? '動画ページのURL' : '動画ファイルのURL', external ? '選んだサービスのHTTPS URLを入力します。再生開始秒のt/start指定にも対応します。非公開・限定公開Vimeoは元リンクで案内してください。' : 'HTTP(S)またはサイト内の / で始まるパス。再生可能な動画ファイルを指定します。'),
                    external && !a.videoUrl && el(components.Notice, { status: 'info', isDismissible: false }, __('動画ページのURLを入力してください。編集画面では外部サービスへ接続しません。', domain)),
                    external && !provider && a.videoUrl && el(components.Notice, { status: 'warning', isDismissible: false }, __('このサービスの対応URLではありません。元のリンクのみ保存します。', domain)),
                    external && provider && el('p', null, __('外部動画は「接続して開く」操作後に読み込み、閉じるとプレーヤーを削除します。接続後は外部サービスに通信します。字幕は配信サービス側で設定します。', domain)),
                    a.videoUrl && !url && el(components.Notice, { status: 'warning', isDismissible: false }, __('このURLは保存時に無効化されます。正しい動画URLを入力してください。', domain)),
                    external ? posterPicker() : field('posterUrl', 'ポスター画像のURL（任意）'),
                    field('buttonLabel', '開くボタンの文言'),
                    field('closeLabel', '閉じるボタンの文言'),
                    !external && field('trackUrl', '字幕ファイルのURL（WebVTT・任意）', '初期設定では、このページと同じ配信元の字幕を使います。'),
                    !external && select(a, set, 'crossOriginMode', '動画・字幕の配信方法', [
                        { label: '通常（字幕はページと同じ配信元）', value: 'same-origin' },
                        { label: '別配信元を許可（匿名CORS）', value: 'anonymous' }
                    ], 'same-origin', '匿名CORSは動画と字幕の両方に適用します。別配信元のサーバーがAccess-Control-Allow-Originを返す必要があります。認証付き配信は対象外です。'),
                    !external && a.trackUrl && safeUrl(a.trackUrl) && !isSameOrigin(a.trackUrl) && a.crossOriginMode !== 'anonymous' &&
                        el(components.Notice, { status: 'warning', isDismissible: false }, __('字幕がこのページと別の配信元です。字幕をサイト内に置くか、配信サーバーのCORS設定を確認して匿名CORSを選択してください。', domain)),
                    !external && a.crossOriginMode === 'anonymous' && el('p', null, __('標準ブロックへの変換では、CORS属性を保持するため動画部分がカスタムHTMLになります。説明・字幕・リンクは残ります。', domain)),
                    !external && a.trackUrl && !safeUrl(a.trackUrl) && el(components.Notice, { status: 'warning', isDismissible: false }, __('字幕URLが無効です。', domain)),
                    !external && field('trackLanguage', '字幕の言語コード'),
                    !external && field('trackLabel', '字幕の表示名'),
                    el(components.TextareaControl, { label: __('動画の説明', domain), value: a.description, onChange: function (value) { set({ description: value }); } })
                )
            ),
            el('div', rootProps,
                !external && el(editor.MediaUploadCheck, null,
                    el(editor.MediaUpload, {
                        allowedTypes: ['video'], value: numberValue(a.videoId, 0, Number.MAX_SAFE_INTEGER, 0),
                        onSelect: function (media) { set({ videoUrl: safeUrl(media.url), videoId: numberValue(media.id, 0, Number.MAX_SAFE_INTEGER, 0) }); },
                        render: function (control) { return el(components.Button, { variant: 'secondary', onClick: control.open }, __(url ? '動画を変更' : 'メディアから動画を選択', domain)); }
                    })
                ),
                external ? el('p', null, __(provider ? '動画ページのURLを設定済みです。編集画面では接続しません。' : 'YouTubeまたはVimeoの動画ページURLを設定してください。', domain)) : (url ? videoElement(a) : el('p', null, __('動画を選択するか、設定欄に動画URLを入力してください。', domain))),
                external && externalPreview(),
                el('p', { className: 'animewp-video__editor-note' }, __('公開ページではボタンを押すと開きます。説明や文字起こしは下に標準ブロックで追加できます。', domain)),
                a.description && el('p', { className: 'animewp-video__description' }, a.description),
                el('div', innerProps)
            )
        );
    }
    function videoSave(props) {
        var a = props.attributes;
        var url = safeUrl(a.videoUrl);
        if (a.source === 'youtube' || a.source === 'vimeo') {
            var provider = window.animewpVideoProviders.normalize(a.source, a.videoUrl);
            return el('div', editor.useBlockProps.save(),
                provider && el('button', { className: 'animewp-video__trigger', type: 'button', hidden: true,
                    'data-animewp-provider': provider.provider, 'data-animewp-video-id': provider.id,
                    'data-animewp-start': String(provider.start), 'data-animewp-close-label': safeText(a.closeLabel, '閉じる', 80)
                }, safeText(a.buttonLabel, '動画を開く', 100) + '（外部サービスへ接続）'),
                el('div', { className: 'animewp-video__fallback' },
                    safeUrl(a.posterUrl).startsWith('/') && el('img', { src: safeUrl(a.posterUrl), alt: '', loading: 'lazy' }),
                    el('p', null, '動画を開くと外部サービスへ接続します。閉じるとプレーヤーを削除します。')),
                a.description && el('p', { className: 'animewp-video__description' }, a.description),
                url && el('p', { className: 'animewp-video__link' }, el('a', { href: url }, '配信元で動画を見る')),
                el('div', { className: 'animewp-video__content' }, el(editor.InnerBlocks.Content))
            );
        }
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

    // Frozen v1.0.0 schema, support settings and save helpers. Keep this snapshot
    // independent from the current helpers: WP 6.6 saved nonzero opacity with px.
    // Explicit strings reproduce that old HTML on both old and new serializers.
    var panelV100OpacityPx = (function () {
        function numberValue(value, min, max, fallback) {
            return typeof value === 'number' && Number.isFinite(value)
                ? Math.min(max, Math.max(min, value)) : fallback;
        }
        function enumValue(value, allowed, fallback) {
            return allowed.indexOf(value) !== -1 ? value : fallback;
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
        function spacingValue(value) {
            if (typeof value !== 'string' || !/^(?:0|[\d.]+(?:px|rem|em|vw|vh|%)|var:preset\|spacing\|[a-z0-9-]+)$/i.test(value)) { return undefined; }
            return value.indexOf('var:preset|spacing|') === 0 ? 'var(--wp--preset--spacing--' + value.split('|')[2] + ')' : value;
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
            if (attributes.backgroundOpacity !== 100) {
                var opacity = numberValue(attributes.backgroundOpacity, 0, 100, 100) / 100;
                styles['--animewp-panel-opacity'] = opacity === 0 ? '0' : String(opacity) + 'px';
            }
            if (attributes.radius) { styles['--animewp-panel-radius'] = numberValue(attributes.radius, 0, 100, 0) + 'px'; }
            if (attributes.highlightColor !== '#e5e5e5') { styles['--animewp-panel-highlight'] = safeColor(attributes.highlightColor, '#e5e5e5'); }
            if (attributes.highlightPadding !== 0.2) { styles['--animewp-panel-highlight-padding'] = numberValue(attributes.highlightPadding, 0, 2, 0.2) + 'em'; }
            var gap = spacingValue(attributes.style && attributes.style.spacing && attributes.style.spacing.blockGap);
            if (gap !== undefined) { styles['--animewp-panel-gap'] = gap; }
            return styles;
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
        return {
            attributes: {
                "heading": {"type":"string","source":"html","selector":".animewp-panel__heading-text","default":""},
                "headingLevel": {"type":"number","enum":[2,3,4,5,6],"default":2},
                "verticalHeading": {"type":"boolean","default":false},
                "backdropEnabled": {"type":"boolean","default":false},
                "backdropColor": {"type":"string","default":"#e5e5e5"},
                "boundary": {"type":"string","enum":["none","wave","diagonal"],"default":"none"},
                "backgroundSkew": {"type":"number","default":0},
                "rotation": {"type":"number","default":0},
                "backgroundOpacity": {"type":"number","default":100},
                "radius": {"type":"number","default":0},
                "panelShadow": {"type":"string","enum":["none","soft","hard"],"default":"none"},
                "textShadow": {"type":"string","enum":["none","soft","hard"],"default":"none"},
                "highlight": {"type":"string","enum":["none","line","panel"],"default":"none"},
                "highlightColor": {"type":"string","default":"#e5e5e5"},
                "highlightPadding": {"type":"number","default":0.2}
            },
            supports: {
                "html": false,
                "anchor": true,
                "align": ["wide","full"],
                "color": {"background":true,"text":true,"gradients":false},
                "spacing": {"margin":true,"padding":true,"blockGap":true},
                "typography": {"fontSize":true,"lineHeight":true},
                "shadow": true
            },
            save: panelSave,
            migrate: function (attributes, innerBlocks) { return [attributes, innerBlocks]; }
        };
    }());

    var definitions = {
        'animewp/text-group': {
            edit: textGroupEdit, save: textGroupSave,
            transforms: { to: [{ type: 'block', blocks: ['core/group'], transform: function (a, innerBlocks) {
                return blocks.createBlock('core/group', coreAttributes(a), innerBlocks);
            } }] }
        },
        'animewp/panel': {
            edit: panelEdit, save: panelSave,
            deprecated: [panelV100OpacityPx],
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
                if (a.source === 'youtube' || a.source === 'vimeo') {
                    if (safeUrl(a.videoUrl)) { contents.push(blocks.createBlock('core/paragraph', { content: wp.element.renderToString(el('a', { href: safeUrl(a.videoUrl) }, '配信元で動画を見る')) })); }
                    if (a.description) { contents.push(blocks.createBlock('core/paragraph', { content: wp.element.renderToString(a.description) })); }
                    return blocks.createBlock('core/group', coreAttributes(a), contents.concat(innerBlocks));
                }
                if (safeUrl(a.videoUrl)) {
                    if (a.crossOriginMode === 'anonymous') {
                        contents.push(blocks.parse('<!-- wp:html -->' + wp.element.renderToString(videoElement(a)) + '<!-- /wp:html -->')[0]);
                    } else { contents.push(blocks.createBlock('core/video', {
                        src: safeUrl(a.videoUrl), id: a.videoId || undefined, poster: safeUrl(a.posterUrl) || undefined,
                        controls: true, playsInline: true, preload: 'none',
                        tracks: track ? [{ src: track, kind: 'captions', srcLang: languageValue(a.trackLanguage), label: safeText(a.trackLabel, '字幕', 80) }] : []
                    })); }
                    var link = wp.element.renderToString(el('a', { href: safeUrl(a.videoUrl) }, '動画ファイルを開く'));
                    contents.push(blocks.createBlock('core/paragraph', { content: link }));
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
