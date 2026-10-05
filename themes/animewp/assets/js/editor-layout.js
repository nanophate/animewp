/* Editor wrappers only: never modify block attributes or serialized content. */
(function (wp) {
    'use strict';
    var pattern = /(?:^|\s)animewp-(?:hero-columns|media-columns|character-grid)(?:\s|$)/;
    function hasGap(value) {
        if (value && typeof value === 'object') {
            return hasGap(value.top) || hasGap(value.left);
        }
        return typeof value === 'number' || (typeof value === 'string' && value.trim() !== '');
    }
    wp.hooks.addFilter('editor.BlockListBlock', 'animewp/default-column-gap', function (BlockListBlock) {
        return function (props) {
            var attrs = props.attributes || {};
            if (props.name !== 'core/columns' || !pattern.test(attrs.className || '')) {
                return wp.element.createElement(BlockListBlock, props);
            }
            var gap = attrs.style && attrs.style.spacing && attrs.style.spacing.blockGap;
            var viewports = (window.animewpEditorLayout || {}).viewports || ['@base'];
            var defaults = viewports.filter(function (key) {
                var style = attrs.style && attrs.style[key];
                var override = style && style.spacing && style.spacing.blockGap;
                return !hasGap(gap) && !hasGap(override);
            }).map(function (key) { return key.slice(1); });
            var wrapperProps = Object.assign({}, props.wrapperProps, {
                'data-animewp-default-gap': defaults.length ? defaults.join(' ') : undefined
            });
            return wp.element.createElement(BlockListBlock, Object.assign({}, props, { wrapperProps: wrapperProps }));
        };
    });
})(window.wp);
