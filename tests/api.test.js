'use strict';
const assert = require('node:assert/strict');
const api = require('../app/api.js');
assert.equal(typeof api.createLink, 'function');
assert.equal(typeof api.catalog, 'function');
assert.equal(typeof api.streams, 'function');
assert.equal(typeof api.subtitles, 'function');
assert.equal(typeof api.library, 'function');
assert.equal(typeof api.libraryMetas, 'function');
assert.equal(typeof api.filterSubtitles, 'function');
assert.equal(typeof api.orderEpisodes, 'function');
assert.equal(typeof api.sortRecent, 'function');
assert.equal(typeof api.audioLanguages, 'function');
assert.equal(typeof api.audioLanguageCode, 'function');
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

function testAudioLanguagePreferences() {
  const streams = [
    { url: 'https://example.test/english.mkv', name: 'Movie 1080p English' },
    { url: 'https://example.test/hindi.mkv', title: 'Hindi 720p' },
    { url: 'https://example.test/punjabi.mkv', description: 'Panjabi audio' },
    { url: 'https://example.test/french.mkv', name: 'French 4K' },
    { url: 'https://example.test/unknown.mkv', name: 'Movie 4K' }
  ];
  assert.deepEqual(api.audioLanguages(streams[0]), ['eng']);
  assert.deepEqual(api.audioLanguages(streams[1]), ['hin']);
  assert.deepEqual(api.audioLanguages(streams[2]), ['pan']);
  assert.deepEqual(api.audioLanguages({ audio: [{ language: 'Hindi' }] }), ['hin']);
  assert.deepEqual(api.audioLanguages({ name: 'Penguin movie' }), []);
  assert.deepEqual(api.audioLanguages({ name: 'French 4K' }), ['fra']);
  assert.equal(api.audioLanguageCode('eng'), 'eng');
  assert.equal(api.audioLanguageCode('English (United States)'), 'eng');
  assert.equal(api.audioLanguageCode('Hindi'), 'hin');
  assert.equal(api.audioLanguageCode('pa'), 'pan');
  assert.equal(api.audioLanguageCode('unknown'), '');
  const preferred = api.rankStreams(streams, { preferredAudioLanguages: ['eng', 'hin', 'pan'] });
  assert.deepEqual(preferred.map(stream => stream.url), [
    'https://example.test/english.mkv',
    'https://example.test/hindi.mkv',
    'https://example.test/punjabi.mkv',
    'https://example.test/unknown.mkv'
  ]);
  assert(!preferred.some(stream => stream.url.includes('french')));
  assert.equal(api.rankStreams(streams, { preferredAudioLanguages: ['hin'] })[0].url, 'https://example.test/hindi.mkv');
}

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

async function testStremioLibrary() {
  const originalFetch = global.fetch;
  try {
    global.fetch = async (url, options) => {
      assert.equal(url, 'https://api.strem.io/api/libraryGet');
      assert.equal(options.method, 'POST');
      assert.deepEqual(JSON.parse(options.body), { type: 'LibraryGet', authKey: 'test-auth' });
      return { ok: true, json: async () => ({ result: [{ item: { id: 'tt123', type: 'movie', name: 'Example' } }] }) };
    };
    assert.deepEqual(await api.library('test-auth'), [{ item: { id: 'tt123', type: 'movie', name: 'Example' } }]);
  } finally {
    global.fetch = originalFetch;
  }
}

function testStremioLibraryItemNormalization() {
  const entries = [
    { _id: 'internal-id-1', type: 'movie', item: { imdb_id: 'tt123', name: 'Film', poster: 'https://img.example/film.jpg' } },
    { id: 'catalog:series:1', type: 'series', name: 'Show' },
    { _id: 'internal-id-only', type: 'movie', name: 'No external id' }
  ];
  assert.deepEqual(api.libraryMetas(entries), [
    { id: 'tt123', type: 'movie', name: 'Film', poster: 'https://img.example/film.jpg', background: '' },
    { id: 'catalog:series:1', type: 'series', name: 'Show', poster: '', background: '' }
  ]);
}

function testSubtitleLanguageFilter() {
  const subtitles = [
    { lang: 'eng', url: 'https://subs.example/one.vtt' },
    { lang: 'spa', url: 'https://subs.example/two.vtt' }
  ];
  assert.deepEqual(api.filterSubtitles(subtitles, null), subtitles);
  assert.deepEqual(api.filterSubtitles(subtitles, ['spa']), [subtitles[1]]);
  assert.deepEqual(api.filterSubtitles(subtitles, []), []);
}

function testEpisodeOrdering() {
  const episodes = [
    { id: 's2e2', season: 2, episode: 2 },
    { id: 'special', season: 0, episode: 1 },
    { id: 's1e10', season: 1, episode: 10 },
    { id: 's1e2', season: 1, episode: 2 },
    { id: 's2e1', season: 2, episode: 1 }
  ];
  assert.deepEqual(api.orderEpisodes(episodes).map(video => video.id), ['special', 's1e2', 's1e10', 's2e1', 's2e2']);
  assert.deepEqual(api.orderEpisodes(episodes).slice(3, 5), [{ id: 's2e1', season: 2, episode: 1 }, { id: 's2e2', season: 2, episode: 2 }]);
}

function testRecentCatalogueOrdering() {
  const metas = [
    { id: 'old', year: '2019' },
    { id: 'new', releaseInfo: '2025-08-01' },
    { id: 'unknown', name: 'No release date' },
    { id: 'same-year', year: 2025 }
  ];
  assert.deepEqual(api.sortRecent(metas).map(meta => meta.id), ['new', 'same-year', 'old', 'unknown']);
  assert.deepEqual(api.sortRecent([{ id: 'first', year: 2024 }, { id: 'second', year: '2024' }]).map(meta => meta.id), ['first', 'second']);
}

Promise.all([testCatalogSearchPath(), testSubtitleLookup(), testStremioLibrary()]).then(() => {
  testAudioLanguagePreferences();
  testSubtitleLanguageFilter();
  testEpisodeOrdering();
  testRecentCatalogueOrdering();
  testStremioLibraryItemNormalization();
  console.log('API tests passed');
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
