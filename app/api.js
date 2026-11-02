(function (g) {
  'use strict';
  const API = 'https://api.strem.io/api/', LINK = 'https://link.stremio.com/api/v2/', CINEMETA = 'https://v3-cinemeta.strem.io/';
  const isHttpUrl = value => {
    try { const url = new URL(String(value || '').trim()); return url.protocol === 'https:' || url.protocol === 'http:'; } catch (_) { return false; }
  };
  const normalizeUrl = value => isHttpUrl(value) ? new URL(value).href : '';
  const get = async (url, options) => { const response = await fetch(url, options), body = await response.json(); if (!response.ok || body.error) throw Error((body.error && body.error.message) || `Request failed (${response.status})`); return body.result || body; };
  const core = (method, body) => get(API + method, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const baseUrl = addon => {
    const url = normalizeUrl(addon && addon.transportUrl);
    if (!url) throw Error('Invalid add-on URL.');
    return url.replace(/\/manifest\.json(?:\?.*)?$/, '').replace(/\/$/, '');
  };
  const part = value => encodeURIComponent(value).replace(/%3A/gi, ':');
  const addonUrl = (addon, resource, type, id, extra) => {
    const path = [resource, type, id].filter(Boolean).map(part);
    if (extra) path.push(Object.entries(extra).map(([key, value]) => `${part(key)}=${part(value)}`).join('&'));
    return `${baseUrl(addon)}/${path.join('/')}.json`;
  };
  function supports(addon, resource, type, id) {
    const entry = (addon.manifest.resources || []).find(value => (typeof value === 'string' ? value : value.name) === resource);
    if (!entry) return false;
    const rule = typeof entry === 'string' ? addon.manifest : entry, types = rule.types || addon.manifest.types || [], prefixes = rule.idPrefixes || addon.manifest.idPrefixes || [];
    return (!types.length || types.includes(type)) && (!prefixes.length || prefixes.some(prefix => id.startsWith(prefix)));
  }
  const streamText = stream => {
    const hints = stream.behaviorHints || {};
    const audio = Array.isArray(stream.audio)
      ? stream.audio.map(track => track && (track.language || track.lang || track.name)).filter(value => typeof value === 'string').join(' ')
      : typeof stream.audio === 'string' ? stream.audio : '';
    const audioLanguages = Array.isArray(stream.audioLanguages) ? stream.audioLanguages.join(' ') : '';
    return [stream.name, stream.title, stream.description, stream.filename, hints.filename, stream.audioLanguage, stream.audioLang, stream.lang, stream.language, audio, audioLanguages]
      .filter(value => typeof value === 'string' && value).join(' ').toLowerCase();
  };
  const fromText = (value, regex) => { const match = String(value || '').match(regex); return match ? Number(match[1]) : 0; };
  const audioLanguagePatterns = [
    ['eng', /(?:^|[^a-z])(?:english|eng|en)(?=$|[^a-z])/i],
    ['hin', /(?:^|[^a-z])(?:hindi|hin)(?=$|[^a-z])/i],
    ['pan', /(?:^|[^a-z])(?:punjabi|panjabi|pan|pun|pa)(?=$|[^a-z])/i],
    ['spa', /(?:^|[^a-z])(?:spanish|spa|es)(?=$|[^a-z])/i],
    ['fra', /(?:^|[^a-z])(?:french|fra|fre|fr)(?=$|[^a-z])/i],
    ['deu', /(?:^|[^a-z])(?:german|deu|ger|de)(?=$|[^a-z])/i],
    ['ita', /(?:^|[^a-z])(?:italian|ita|it)(?=$|[^a-z])/i],
    ['por', /(?:^|[^a-z])(?:portuguese|por|pt)(?=$|[^a-z])/i],
    ['rus', /(?:^|[^a-z])(?:russian|rus|ru)(?=$|[^a-z])/i],
    ['jpn', /(?:^|[^a-z])(?:japanese|jpn|ja)(?=$|[^a-z])/i],
    ['kor', /(?:^|[^a-z])(?:korean|kor|ko)(?=$|[^a-z])/i],
    ['zho', /(?:^|[^a-z])(?:chinese|zho|chi|zh)(?=$|[^a-z])/i],
    ['ara', /(?:^|[^a-z])(?:arabic|ara|ar)(?=$|[^a-z])/i],
    ['tur', /(?:^|[^a-z])(?:turkish|tur|tr)(?=$|[^a-z])/i],
    ['tam', /(?:^|[^a-z])(?:tamil|tam)(?=$|[^a-z])/i],
    ['tel', /(?:^|[^a-z])(?:telugu|tel)(?=$|[^a-z])/i],
    ['mar', /(?:^|[^a-z])(?:marathi|mar)(?=$|[^a-z])/i],
    ['ben', /(?:^|[^a-z])(?:bengali|ben)(?=$|[^a-z])/i],
    ['urd', /(?:^|[^a-z])(?:urdu|urd)(?=$|[^a-z])/i],
    ['vie', /(?:^|[^a-z])(?:vietnamese|vie|vi)(?=$|[^a-z])/i],
    ['tha', /(?:^|[^a-z])(?:thai|tha)(?=$|[^a-z])/i],
    ['ind', /(?:^|[^a-z])(?:indonesian|ind|id)(?=$|[^a-z])/i],
    ['nld', /(?:^|[^a-z])(?:dutch|nld|dut|nl)(?=$|[^a-z])/i],
    ['pol', /(?:^|[^a-z])(?:polish|pol|pl)(?=$|[^a-z])/i],
    ['swe', /(?:^|[^a-z])(?:swedish|swe|sv)(?=$|[^a-z])/i],
    ['nor', /(?:^|[^a-z])(?:norwegian|nor|no)(?=$|[^a-z])/i],
    ['dan', /(?:^|[^a-z])(?:danish|dan|da)(?=$|[^a-z])/i],
    ['fin', /(?:^|[^a-z])(?:finnish|fin|fi)(?=$|[^a-z])/i],
    ['ell', /(?:^|[^a-z])(?:greek|ell|gre|el)(?=$|[^a-z])/i],
    ['heb', /(?:^|[^a-z])(?:hebrew|heb|he)(?=$|[^a-z])/i],
    ['ukr', /(?:^|[^a-z])(?:ukrainian|ukr|uk)(?=$|[^a-z])/i]
  ];
  const audioLanguages = stream => {
    const text = streamText(stream);
    return audioLanguagePatterns.filter(([, pattern]) => pattern.test(text)).map(([language]) => language);
  };
  const audioLanguageCode = value => {
    const text = String(value || '').trim().toLowerCase();
    const match = audioLanguagePatterns.find(([, pattern]) => pattern.test(text));
    return match ? match[0] : '';
  };
  function details(stream) {
    const label = streamText(stream), height = stream.height || fromText(label, /(?:^|\D)(2160|1080|720|576|480)p(?:\D|$)/i), size = stream.size || stream.videoSize || fromText(label, /(?:^|\s)([\d.]+)\s*(?:gb|gib)/i) * 1073741824 || fromText(label, /(?:^|\s)([\d.]+)\s*(?:mb|mib)/i) * 1048576;
    return { height, size, hdr: /\b(?:hdr10\+?|dolby vision|\bdv\b|hlg)\b/i.test(label), hevc: /\b(?:hevc|h\.?(?:265)|x265)\b/i.test(label), awkward: /\b(?:cam|telesync|\bts\b|screener|3d|hardcoded|hc\b)\b/i.test(label), audio: /\b(?:atmos|truehd|dts(?:-hd)?|5\.1|7\.1)\b/i.test(label), audioLanguages: audioLanguages(stream) };
  }
  function rankStreams(streams, preferences) {
    const prefs = Object.assign({ maxHeight: 2160, allowHdr: true, preferHdr: false, preferHevc: false, preferredAudioLanguages: [] }, preferences || {});
    const preferredAudioLanguages = Array.isArray(prefs.preferredAudioLanguages) ? prefs.preferredAudioLanguages : [];
    return streams.filter(stream => stream && isHttpUrl(stream.url) && !stream.infoHash).map((stream, index) => ({ stream, index, info: details(stream) }))
      .filter(item => !item.info.awkward && (!prefs.maxHeight || !item.info.height || item.info.height <= prefs.maxHeight) && (prefs.allowHdr || !item.info.hdr)
        && (!preferredAudioLanguages.length || !item.info.audioLanguages.length || item.info.audioLanguages.some(language => preferredAudioLanguages.includes(language))))
      .sort((a, b) => {
        const score = item => (preferredAudioLanguages.length && item.info.audioLanguages.length ? 25 : 0) + (item.info.height || 0) / 100 + (prefs.preferHdr && item.info.hdr ? 8 : 0) + (prefs.preferHevc && item.info.hevc ? 3 : 0) + (item.info.audio ? 1 : 0) - (item.info.size ? item.info.size / 1073741824 / 100 : 0);
        return score(b) - score(a) || a.index - b.index;
      }).map(item => Object.assign({}, item.stream, { splay: item.info }));
  }
  const subtitleLanguage = subtitle => String(subtitle.lang || subtitle.label || 'und').trim().toLowerCase();
  const filterSubtitles = (subtitles, languages) => languages === null
    ? subtitles
    : subtitles.filter(subtitle => languages.includes(subtitleLanguage(subtitle)));
  const orderEpisodes = videos => (videos || []).filter(video => video && video.id).map((video, index) => ({ video, index }))
    .sort((a, b) => (Number(a.video.season) || 0) - (Number(b.video.season) || 0)
      || (Number(a.video.episode) || 0) - (Number(b.video.episode) || 0)
      || a.index - b.index)
    .map(item => item.video);
  const api = {
    async createLink() { const value = await get(LINK + 'create?type=Create'); return { code: value.code, url: value.link }; },
    async readLink(code) { try { return (await get(LINK + 'read?type=Read&code=' + encodeURIComponent(code))).authKey || null; } catch (error) { if (/101/.test(error.message)) return null; throw error; } },
    async addons(authKey) { return (await core('addonCollectionGet', { type: 'AddonCollectionGet', authKey, update: true })).addons || []; },
    async library(authKey) {
      const result = await core('libraryGet', { type: 'LibraryGet', authKey });
      if (Array.isArray(result)) return result;
      if (result && Array.isArray(result.items)) return result.items;
      throw Error('Stremio returned an unexpected library response.');
    },
    async catalog(addon, type, id, extra) { return (await get(addonUrl(addon, 'catalog', type, id, extra))).metas || []; },
    async streams(addon, type, id) { return ((await get(addonUrl(addon, 'stream', type, id))).streams || []).filter(stream => stream && isHttpUrl(stream.url) && !stream.infoHash); },
    async subtitles(addon, type, id) { return ((await get(addonUrl(addon, 'subtitles', type, id))).subtitles || []).filter(subtitle => subtitle && isHttpUrl(subtitle.url)); },
    async meta(addons, type, id) {
      for (const addon of addons.filter(addon => supports(addon, 'meta', type, id))) try { const meta = (await get(addonUrl(addon, 'meta', type, id))).meta; if (meta) return meta; } catch (_) { /* try next add-on */ }
      try { return (await get(`${CINEMETA}meta/${part(type)}/${part(id)}.json`)).meta || null; } catch (_) { return null; }
    },
    supports, rankStreams, details, audioLanguages, audioLanguageCode, subtitleLanguage, filterSubtitles, orderEpisodes, isHttpUrl, normalizeUrl,
    image(value, kind) { if (!value) return ''; const source = String(value).trim(); if (source.startsWith('http')) return normalizeUrl(source); return `https://images.metahub.space/${kind || 'poster'}/large/${part(source.split(':')[0])}/img`; }
  };
  if (typeof module !== 'undefined') module.exports = api;
  g.SplayApi = api;
})(typeof window === 'undefined' ? globalThis : window);
