'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('themes/animewp/assets/js/editor-layout.js', 'utf8');
let checks = 0;

for (const viewports of [['@base'], ['@mobile', '@tablet', '@desktop']]) {
    let filter;
    const wp = {
        hooks: { addFilter: (name, id, value) => { filter = value; } },
        element: { createElement: (component, props) => props }
    };
    vm.runInNewContext(source, { window: { wp, animewpEditorLayout: { viewports } } });
    const render = filter(function BlockListBlock() {});
    const all = viewports.map((viewport) => viewport.slice(1)).join(' ');
    const without = (viewport) => viewports.filter((key) => key !== viewport).map((key) => key.slice(1)).join(' ') || undefined;
    const withoutMany = (...excluded) => viewports.filter((key) => !excluded.includes(key)).map((key) => key.slice(1)).join(' ') || undefined;

    function check({ name, className, style, layout, attributes = {}, expected = {} }) {
        const attrs = Object.assign({}, attributes, { className });
        if (style !== undefined) attrs.style = style;
        if (layout !== undefined) attrs.layout = layout;
        const props = {
            name,
            attributes: attrs,
            wrapperProps: { 'data-existing': 'kept', className: 'wrapper-class' }
        };
        const attrsBefore = JSON.stringify(attrs);
        const wrapperBefore = JSON.stringify(props.wrapperProps);
        const result = render(props);

        assert.equal(result.wrapperProps['data-existing'], 'kept');
        assert.equal(result.wrapperProps.className, 'wrapper-class');
        for (const [key, value] of Object.entries(expected)) {
            assert.equal(result.wrapperProps[key], value, name + ' ' + key);
        }
        assert.equal(JSON.stringify(attrs), attrsBefore, name + ' attributes changed');
        assert.equal(JSON.stringify(props.wrapperProps), wrapperBefore, name + ' mutated wrapperProps');
        assert.notStrictEqual(result.wrapperProps, props.wrapperProps, name + ' must copy wrapperProps');
        checks++;
        return result;
    }

    const columnCases = [
        [{}, all],
        [{ spacing: { blockGap: 0 } }, undefined],
        [{ spacing: { blockGap: '0px' } }, undefined],
        [{ spacing: { blockGap: { top: '13px', left: '47px' } } }, undefined],
        [{ spacing: { blockGap: { left: '0px' } } }, undefined],
        [{ spacing: { blockGap: 'var:preset|spacing|50' } }, undefined],
        [{ spacing: { blockGap: {} } }, all],
        [{ '@mobile': { spacing: { blockGap: '0px' } } }, without('@mobile')],
        [{ '@tablet': { spacing: { blockGap: { top: '13px' } } } }, without('@tablet')]
    ];
    for (const [style, expectedGap] of columnCases) {
        check({
            name: 'core/columns',
            className: 'other animewp-hero-columns',
            style,
            expected: { 'data-animewp-default-gap': expectedGap }
        });
    }

    const allHeaderDefaults = {
        'data-animewp-default-gap': all,
        'data-animewp-default-justify': all,
        'data-animewp-default-orientation': all,
        'data-animewp-default-wrap': all,
        'data-animewp-default-align': all,
        'data-animewp-default-padding-top': all,
        'data-animewp-default-padding-right': all,
        'data-animewp-default-padding-bottom': all,
        'data-animewp-default-padding-left': all,
        'data-animewp-default-margin-top': all,
        'data-animewp-default-margin-bottom': all
    };

    check({ name: 'core/group', className: 'animewp-header', expected: allHeaderDefaults });
    check({
        name: 'core/group', className: 'animewp-header',
        style: { spacing: { blockGap: 0 } },
        expected: Object.assign({}, allHeaderDefaults, { 'data-animewp-default-gap': undefined })
    });
    check({
        name: 'core/group', className: 'animewp-header',
        style: { spacing: { blockGap: 'var:preset|spacing|50' } },
        expected: Object.assign({}, allHeaderDefaults, { 'data-animewp-default-gap': undefined })
    });
    check({
        name: 'core/group', className: 'animewp-header',
        style: { spacing: { padding: { top: '13px', right: '47px' } } },
        expected: Object.assign({}, allHeaderDefaults, {
            'data-animewp-default-padding-top': undefined,
            'data-animewp-default-padding-right': undefined
        })
    });
    check({
        name: 'core/group', className: 'animewp-header',
        layout: { justifyContent: 'center', orientation: 'vertical', flexWrap: 'nowrap', verticalAlignment: 'center' },
        expected: Object.assign({}, allHeaderDefaults, {
            'data-animewp-default-justify': undefined,
            'data-animewp-default-orientation': undefined,
            'data-animewp-default-wrap': undefined,
            'data-animewp-default-align': undefined
        })
    });
    check({
        name: 'core/group', className: 'animewp-header',
        style: {
            '@mobile': { spacing: { blockGap: '0px', padding: { block: '14px' } } },
            '@tablet': { layout: { justifyContent: 'right', orientation: 'vertical', flexWrap: 'wrap', verticalAlignment: 'center' } }
        },
        expected: Object.assign({}, allHeaderDefaults, {
            'data-animewp-default-gap': without('@mobile'),
            'data-animewp-default-padding-top': without('@mobile'),
            'data-animewp-default-padding-bottom': without('@mobile'),
            'data-animewp-default-justify': without('@tablet'),
            'data-animewp-default-orientation': without('@tablet'),
            'data-animewp-default-wrap': without('@tablet'),
            'data-animewp-default-align': without('@tablet')
        })
    });
    check({
        name: 'core/group', className: 'animewp-header',
        layout: { '@tablet': { justifyContent: 'center', orientation: 'vertical', flexWrap: 'nowrap', verticalAlignment: 'center' } },
        expected: Object.assign({}, allHeaderDefaults, {
            'data-animewp-default-justify': without('@tablet'),
            'data-animewp-default-orientation': without('@tablet'),
            'data-animewp-default-wrap': without('@tablet'),
            'data-animewp-default-align': without('@tablet')
        })
    });

    const allGapDefaults = { 'data-animewp-default-gap': all };
    check({ name: 'core/group', className: 'animewp-brand', expected: allGapDefaults });
    check({ name: 'core/group', className: 'animewp-brand', style: { spacing: { blockGap: 0 } }, expected: { 'data-animewp-default-gap': undefined } });
    check({ name: 'core/group', className: 'animewp-brand', style: { spacing: { blockGap: 'var:preset|spacing|50' } }, expected: { 'data-animewp-default-gap': undefined } });
    check({ name: 'core/group', className: 'animewp-brand', style: { '@mobile': { spacing: { blockGap: { top: '0px' } } } }, expected: { 'data-animewp-default-gap': without('@mobile') } });

    check({ name: 'core/navigation', className: undefined, expected: {
        'data-animewp-default-gap': all,
        'data-animewp-default-orientation': all
    } });
    check({ name: 'core/navigation', style: { spacing: { blockGap: 0 } }, expected: {
        'data-animewp-default-gap': undefined,
        'data-animewp-default-orientation': all
    } });
    check({ name: 'core/navigation', style: { spacing: { blockGap: 'var:preset|spacing|50' } }, expected: {
        'data-animewp-default-gap': undefined,
        'data-animewp-default-orientation': all
    } });
    check({ name: 'core/navigation', style: { spacing: { blockGap: { top: '13px', left: '47px' } } }, expected: {
        'data-animewp-default-gap': undefined,
        'data-animewp-default-orientation': all
    } });
    check({ name: 'core/navigation', layout: { orientation: 'vertical' }, expected: {
        'data-animewp-default-gap': all,
        'data-animewp-default-orientation': undefined
    } });
    check({ name: 'core/navigation', layout: { justifyContent: 'right' }, expected: {
        'data-animewp-default-gap': all,
        'data-animewp-default-orientation': all
    } });
    check({ name: 'core/navigation', layout: { orientation: 'vertical', justifyContent: 'right' }, expected: {
        'data-animewp-default-gap': all,
        'data-animewp-default-orientation': undefined
    } });
    check({ name: 'core/navigation', style: {
        '@mobile': { spacing: { blockGap: 0 } },
        '@tablet': { spacing: { blockGap: 'var:preset|spacing|50' }, layout: { orientation: 'vertical' } }
    }, expected: {
        'data-animewp-default-gap': withoutMany('@mobile', '@tablet'),
        'data-animewp-default-orientation': without('@tablet')
    } });

    const unrelated = { name: 'core/group', attributes: { className: 'animewp-hero-columns' } };
    assert.strictEqual(render(unrelated), unrelated);
    checks++;
    const unrelatedColumns = { name: 'core/columns', attributes: { className: 'animewp-section' } };
    assert.strictEqual(render(unrelatedColumns), unrelatedColumns);
    checks++;
}

console.log('Editor native-layout contracts passed: ' + checks);
