'use strict';
const assert = require('node:assert/strict');
const api = require('../app/api.js');
assert.equal(typeof api.createLink, 'function');
assert.equal(typeof api.catalog, 'function');
assert.equal(typeof api.streams, 'function');
assert.equal(typeof api.subtitles, 'function');
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

async function testSubtitleLookup() {
  const originalFetch = global.fetch;
  const expectedUrl = 'https://addon.example/subtitles/series/tt123:1:2.json';
  try {
    global.fetch = async url => {
      assert.equal(url, expectedUrl);
      return {
        ok: true,
        json: async () => ({ subtitles: [
          { id: 'en', lang: 'eng', url: 'https://subs.example/episode.vtt' },
          { id: 'bad', lang: 'eng', url: 'javascript:alert(1)' }
        ] })
      };
    };
    const subtitles = await api.subtitles(
      { transportUrl: 'https://addon.example/manifest.json', manifest: {} },
      'series',
      'tt123:1:2'
    );
    assert.deepEqual(subtitles, [{ id: 'en', lang: 'eng', url: 'https://subs.example/episode.vtt' }]);
  } finally {
    global.fetch = originalFetch;
  }
}

Promise.all([testCatalogSearchPath(), testSubtitleLookup()]).then(() => console.log('API tests passed')).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
