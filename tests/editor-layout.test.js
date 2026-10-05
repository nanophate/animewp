'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('themes/animewp/assets/js/editor-layout.js', 'utf8');
let checks = 0;
for (const viewports of [['@base'], ['@mobile', '@tablet', '@desktop']]) {
    let filter;
    const wp = { hooks: { addFilter: (name, id, value) => { filter = value; } }, element: { createElement: (component, props) => props } };
    vm.runInNewContext(source, { window: { wp, animewpEditorLayout: { viewports } } });
    const render = filter(function BlockListBlock() {});
    const all = viewports.map(v => v.slice(1)).join(' ');
    const cases = [
        [{}, all], [{ spacing: { blockGap: 0 } }, undefined],
        [{ spacing: { blockGap: '0px' } }, undefined],
        [{ spacing: { blockGap: { top: '13px', left: '47px' } } }, undefined],
        [{ spacing: { blockGap: { left: '0px' } } }, undefined],
        [{ spacing: { blockGap: 'var:preset|spacing|50' } }, undefined],
        [{ spacing: { blockGap: {} } }, all],
        [{ '@mobile': { spacing: { blockGap: '0px' } } }, viewports.filter(v => v !== '@mobile').map(v => v.slice(1)).join(' ')],
        [{ '@tablet': { spacing: { blockGap: { top: '13px' } } } }, viewports.filter(v => v !== '@tablet').map(v => v.slice(1)).join(' ')]
    ];
    for (const [style, expected] of cases) {
        const attrs = { className: 'other animewp-hero-columns', style };
        const before = JSON.stringify(attrs);
        const result = render({ name: 'core/columns', attributes: attrs, wrapperProps: { 'data-existing': 'kept' } });
        assert.equal(result.wrapperProps['data-animewp-default-gap'], expected);
        assert.equal(result.wrapperProps['data-existing'], 'kept');
        assert.equal(JSON.stringify(attrs), before);
        checks++;
    }
    const unrelated = { name: 'core/group', attributes: { className: 'animewp-hero-columns' } };
    assert.equal(render(unrelated), unrelated);
    checks++;
}
console.log('Editor default-gap contracts passed: ' + checks);
