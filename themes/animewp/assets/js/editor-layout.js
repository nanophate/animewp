/* Editor wrappers only: never modify block attributes or serialized content. */
(function (wp) {
    'use strict';
    var columnPattern = /(?:^|\s)animewp-(?:hero-columns|media-columns|character-grid)(?:\s|$)/;
    var headerPattern = /(?:^|\s)animewp-header(?:\s|$)/;
    var brandPattern = /(?:^|\s)animewp-brand(?:\s|$)/;
    function hasValue(value) {
        if (value && typeof value === 'object') {
            return Object.keys(value).some(function (key) { return hasValue(value[key]); });
        }
        return typeof value === 'number' || (typeof value === 'string' && value.trim() !== '');
    }
    function valueAt(object, path) {
        return path.reduce(function (value, key) {
            return value && typeof value === 'object' ? value[key] : undefined;
        }, object);
    }
    function hasStyleAt(attrs, path, viewport) {
        var style = attrs.style || {};
        return hasValue(valueAt(style, path)) || (viewport !== '@base' && hasValue(valueAt(style[viewport] || {}, path)));
    }
    function hasBoxSide(value, side) {
        if (!value || typeof value !== 'object') {
            return hasValue(value);
        }
        var axis = side === 'top' || side === 'bottom' ? 'block' : 'inline';
        return hasValue(value[side]) || hasValue(value[axis]);
    }
    function hasBoxSideAt(attrs, property, side, viewport) {
        var style = attrs.style || {};
        var baseValue = valueAt(style, ['spacing', property]);
        var overrideValue = viewport === '@base' ? undefined : valueAt(style[viewport] || {}, ['spacing', property]);
        return hasBoxSide(baseValue, side) || hasBoxSide(overrideValue, side);
    }
    function hasLayoutValueAt(attrs, property, viewport) {
        var style = attrs.style || {};
        var values = [
            valueAt(attrs, [property]),
            valueAt(attrs, ['layout', property]),
            valueAt(style, ['layout', property])
        ];
        if (viewport !== '@base') {
            values = values.concat([
                valueAt(style, [viewport, 'layout', property]),
                valueAt(style, [viewport, property]),
                valueAt(attrs, ['layout', viewport, property]),
                valueAt(attrs, [viewport, 'layout', property]),
                valueAt(attrs, [viewport, property])
            ]);
        }
        return values.some(hasValue);
    }
    function defaultTokens(attrs, viewports, predicate) {
        return viewports.filter(function (viewport) { return !predicate(attrs, viewport); })
            .map(function (viewport) { return viewport.slice(1); }).join(' ') || undefined;
    }
    wp.hooks.addFilter('editor.BlockListBlock', 'animewp/default-column-gap', function (BlockListBlock) {
        return function (props) {
            var attrs = props.attributes || {};
            var className = attrs.className || '';
            var viewports = (window.animewpEditorLayout || {}).viewports || ['@base'];
            var wrapperProps = Object.assign({}, props.wrapperProps);

            if (props.name === 'core/columns' && columnPattern.test(className)) {
                var defaults = defaultTokens(attrs, viewports, function (attributes, viewport) {
                    return hasStyleAt(attributes, ['spacing', 'blockGap'], viewport);
                });
                wrapperProps['data-animewp-default-gap'] = defaults;
                return wp.element.createElement(BlockListBlock, Object.assign({}, props, { wrapperProps: wrapperProps }));
            }

            if (props.name === 'core/group' && headerPattern.test(className)) {
                wrapperProps['data-animewp-default-gap'] = defaultTokens(attrs, viewports, function (attributes, viewport) {
                    return hasStyleAt(attributes, ['spacing', 'blockGap'], viewport);
                });
                wrapperProps['data-animewp-default-justify'] = defaultTokens(attrs, viewports, function (attributes, viewport) {
                    return hasLayoutValueAt(attributes, 'justifyContent', viewport);
                });
                wrapperProps['data-animewp-default-orientation'] = defaultTokens(attrs, viewports, function (attributes, viewport) {
                    return hasLayoutValueAt(attributes, 'orientation', viewport);
                });
                wrapperProps['data-animewp-default-wrap'] = defaultTokens(attrs, viewports, function (attributes, viewport) {
                    return hasLayoutValueAt(attributes, 'flexWrap', viewport);
                });
                wrapperProps['data-animewp-default-align'] = defaultTokens(attrs, viewports, function (attributes, viewport) {
                    return hasLayoutValueAt(attributes, 'verticalAlignment', viewport) || hasLayoutValueAt(attributes, 'alignItems', viewport);
                });
                ['top', 'right', 'bottom', 'left'].forEach(function (side) {
                    wrapperProps['data-animewp-default-padding-' + side] = defaultTokens(attrs, viewports, function (attributes, viewport) {
                        return hasBoxSideAt(attributes, 'padding', side, viewport);
                    });
                    wrapperProps['data-animewp-default-margin-' + side] = defaultTokens(attrs, viewports, function (attributes, viewport) {
                        return hasBoxSideAt(attributes, 'margin', side, viewport);
                    });
                });
                return wp.element.createElement(BlockListBlock, Object.assign({}, props, { wrapperProps: wrapperProps }));
            }

            if (props.name === 'core/group' && brandPattern.test(className)) {
                wrapperProps['data-animewp-default-gap'] = defaultTokens(attrs, viewports, function (attributes, viewport) {
                    return hasStyleAt(attributes, ['spacing', 'blockGap'], viewport);
                });
                return wp.element.createElement(BlockListBlock, Object.assign({}, props, { wrapperProps: wrapperProps }));
            }

            if (props.name === 'core/navigation') {
                wrapperProps['data-animewp-default-gap'] = defaultTokens(attrs, viewports, function (attributes, viewport) {
                    return hasStyleAt(attributes, ['spacing', 'blockGap'], viewport);
                });
                wrapperProps['data-animewp-default-orientation'] = defaultTokens(attrs, viewports, function (attributes, viewport) {
                    return hasLayoutValueAt(attributes, 'orientation', viewport);
                });
                wrapperProps['data-animewp-default-justify'] = defaultTokens(attrs, viewports, function (attributes, viewport) {
                    return hasLayoutValueAt(attributes, 'justifyContent', viewport);
                });
                return wp.element.createElement(BlockListBlock, Object.assign({}, props, { wrapperProps: wrapperProps }));
            }

            return wp.element.createElement(BlockListBlock, props);
        };
    });
})(window.wp);
