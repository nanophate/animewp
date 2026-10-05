'use strict';
const assert = require('node:assert/strict');
const {normalize, embedUrl} = require('../plugins/animewp-blocks/assets/providers.js');
const valid = [
    ['youtube', 'https://youtu.be/jNQXAC9IVRw?t=1m2s', 'jNQXAC9IVRw', 62],
    ['youtube', 'https://www.youtube.com/watch?v=jNQXAC9IVRw&start=30', 'jNQXAC9IVRw', 30],
    ['youtube', 'https://m.youtube.com/shorts/jNQXAC9IVRw', 'jNQXAC9IVRw', 0],
    ['youtube', 'https://www.youtube-nocookie.com/embed/jNQXAC9IVRw', 'jNQXAC9IVRw', 0],
    ['vimeo', 'https://vimeo.com/76979871#t=1m', '76979871', 60],
    ['vimeo', 'https://player.vimeo.com/video/76979871', '76979871', 0]
];
for (const [type, url, id, start] of valid) {
    const result = normalize(type, url);
    assert.equal(result.id, id); assert.equal(result.start, start);
    assert.equal(new URL(embedUrl(type, id, start)).hostname, type === 'youtube' ? 'www.youtube-nocookie.com' : 'player.vimeo.com');
}
const rejected = [
    ['youtube', 'javascript:alert(1)'], ['youtube', 'http://youtu.be/jNQXAC9IVRw'],
    ['youtube', 'https://www.youtube.com.evil.invalid/watch?v=jNQXAC9IVRw'],
    ['youtube', 'https://user:pass@www.youtube.com/watch?v=jNQXAC9IVRw'],
    ['youtube', 'https://www.youtube.com:8443/watch?v=jNQXAC9IVRw'],
    ['youtube', 'https://youtu.be/jNQXAC9IVRw/extra'],
    ['youtube', 'https://youtu.be/jNQXAC9IVRw?t=-1'],
    ['youtube', 'https://youtu.be/jNQXAC9IVRw?t=abc'],
    ['youtube', 'https://youtu.be/jNQXAC9IVRw\n?x=1'],
    ['vimeo', 'https://vimeo.com/76979871?h=private'],
    ['vimeo', 'https://vimeo.com/76979871/private'],
    ['other', 'https://youtu.be/jNQXAC9IVRw']
];
for (const [type,url] of rejected) assert.equal(normalize(type,url), null, url);
for (const args of [['youtube','bad',0], ['youtube','jNQXAC9IVRw',-1], ['vimeo','76979871',1.5], ['bad','123',0]]) assert.equal(embedUrl(...args), '');
console.log(`Provider tests passed: ${valid.length + rejected.length + 4} cases.`);
