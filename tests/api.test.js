'use strict';
const assert = require('node:assert/strict');
const api = require('../app/api.js');
assert.equal(typeof api.createLink, 'function');
assert.equal(typeof api.catalog, 'function');
assert.equal(typeof api.streams, 'function');
assert.equal(typeof api.rankStreams, 'function');
assert.equal(api.isHttpUrl('javascript:alert(1)'), false);
assert.equal(api.isHttpUrl('https://example.test/video.mp4'), true);
const ranked = api.rankStreams([
  { url: 'https://example.invalid/cam.mp4', name: 'CAM 1080p' },
  { url: 'https://example.invalid/4k.mp4', name: 'Movie 2160p HDR HEVC' },
  { url: 'https://example.invalid/1080.mp4', name: 'Movie 1080p WEB' }
], { maxHeight: 1080, allowHdr: true });
assert.equal(ranked.length, 1);
assert.equal(ranked[0].splay.height, 1080);
console.log('API tests passed');
