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

async function testCatalogSearchPath() {
  const originalFetch = global.fetch;
  const expectedUrl = 'https://addon.example/catalog/movie/top/search=star%20wars%20%26%20beyond.json';
  try {
    global.fetch = async url => {
      assert.equal(url, expectedUrl);
      return { ok: true, json: async () => ({ metas: [{ id: 'tt123', name: 'Star Wars' }] }) };
    };
    const metas = await api.catalog(
      { transportUrl: 'https://addon.example/manifest.json', manifest: {} },
      'movie',
      'top',
      { search: 'star wars & beyond' }
    );
    assert.deepEqual(metas, [{ id: 'tt123', name: 'Star Wars' }]);
  } finally {
    global.fetch = originalFetch;
  }
}

testCatalogSearchPath().then(() => console.log('API tests passed')).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
