(function (g) {
  'use strict';
  const API = 'https://api.strem.io/api/', LINK = 'https://link.stremio.com/api/v2/', CINEMETA = 'https://v3-cinemeta.strem.io/';
  const isHttpUrl = value => {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    try {
      const parsed = new URL(trimmed);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  };
  const normalizeUrl = value => {
    if (!isHttpUrl(value)) return '';
    return new URL(value).href;
  };
  const get = async (url, options) => { const response = await fetch(url, options), body = await response.json(); if (!response.ok || body.error) throw Error((body.error && body.error.message) || `Request failed (${response.status})`); return body; };
  const core = (method, body) => get(API + method, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const baseUrl = addon => {
    if (!addon || !addon.transportUrl) return '';
    const url = normalizeUrl(addon.transportUrl);
    if (!url) return '';
    return url.replace(/\/manifest\.json(?:\?.*)?$/, '').replace(/\/$/, '');
  };
  const part = value => encodeURIComponent(value).replace(/%3A/gi, ':');
  const addonUrl = (addon, resource, type, id, extra) => {
    const url = baseUrl(addon);
    if (!url) throw Error('Invalid add-on URL.');
    return `${url}/${[resource, type, id].filter(Boolean).map(part).join('/')}.json${extra ? `?${extra}` : ''}`;
  };
  function supports(addon, resource, type, id) {
    const entry = (addon.manifest.resources || []).find(value => (typeof value === 'string' ? value : value.name) === resource);
    if (!entry) return false;
    const rule = typeof entry === 'string' ? addon.manifest : entry, types = rule.types || addon.manifest.types || [], prefixes = rule.idPrefixes || addon.manifest.idPrefixes || [];
    return (!types.length || types.includes(type)) && (!prefixes.length || prefixes.some(prefix => id.startsWith(prefix)));
  }
  const streamText = stream => [stream.name, stream.title, stream.description, stream.filename].filter(Boolean).join(' ').toLowerCase();
  const fromText = (value, regex) => { const match = String(value || '').match(regex); return match ? Number(match[1]) : 0; };
  function details(stream) {
    const label = streamText(stream), height = stream.height || fromText(label, /(?:^|\D)(2160|1080|720|576|480)p(?:\D|$)/i), size = stream.size || stream.videoSize || fromText(label, /(?:^|\s)([0-9.]+)\s*(?:gb|mb)/i), audio = /(?:ac3|eac3|dts|truehd|atmos|aac|opus|flac|surround|5\.1|7\.1)/i.test(label);
    return { height, size, hdr: /\b(?:hdr10\+?|dolby vision|\bdv\b|hlg)\b/i.test(label), hevc: /\b(?:hevc|h\.?(?:265)|x265)\b/i.test(label), awkward: /\b(?:cam|telesync|\bts\b|screener|3d|hardcode|hdcam|hdtv|xvid|divx)\b/i.test(label), audio };
  }
  function rankStreams(streams, preferences) {
    const prefs = Object.assign({ maxHeight: 2160, allowHdr: true, preferHdr: false, preferHevc: false }, preferences || {});
    return streams.filter(stream => stream && isHttpUrl(stream.url) && !stream.infoHash).map((stream, index) => ({ stream, index, info: details(stream) }))
      .filter(item => !item.info.awkward && (!prefs.maxHeight || !item.info.height || item.info.height <= prefs.maxHeight) && (prefs.allowHdr || !item.info.hdr))
      .sort((a, b) => {
        const score = item => (item.info.height || 0) / 100 + (prefs.preferHdr && item.info.hdr ? 8 : 0) + (prefs.preferHevc && item.info.hevc ? 3 : 0) + (item.info.audio ? 1 : 0) - (item.info.size || 0) * 0.000001;
        return score(b) - score(a) || a.index - b.index;
      }).map(item => Object.assign({}, item.stream, { splay: item.info }));
  }
  const api = {
    async createLink() { const value = await get(LINK + 'create?type=Create'); return { code: value.code, url: value.link }; },
    async readLink(code) { try { return (await get(LINK + 'read?type=Read&code=' + encodeURIComponent(code))).authKey || null; } catch (error) { if (/101/.test(error.message)) return null; throw error; } },
    async addons(authKey) { return (await core('addonCollectionGet', { type: 'AddonCollectionGet', authKey, update: true })).addons || []; },
    async catalog(addon, type, id, extra) { return (await get(addonUrl(addon, 'catalog', type, id, extra))).metas || []; },
    async streams(addon, type, id) {
      const result = (await get(addonUrl(addon, 'stream', type, id))).streams || [];
      return result.filter(stream => stream && isHttpUrl(stream.url) && !stream.infoHash);
    },
    async meta(addons, type, id) {
      for (const addon of addons.filter(addon => supports(addon, 'meta', type, id))) try { const meta = (await get(addonUrl(addon, 'meta', type, id))).meta; if (meta) return meta; } catch (_) { /* ignore unavailable add-ons */ }
      try { return (await get(`${CINEMETA}meta/${part(type)}/${part(id)}.json`)).meta || null; } catch (_) { return null; }
    },
    supports, rankStreams, details,
    image(value, kind) {
      if (!value) return '';
      const source = String(value).trim();
      if (source.startsWith('http')) return isHttpUrl(source) ? source : '';
      return `https://images.metahub.space/${kind || 'poster'}/large/${part(source.split(':')[0])}/img`;
    },
    isHttpUrl,
    normalizeUrl
  };
  if (typeof module !== 'undefined') module.exports = api;
  g.SplayApi = api;
})(typeof window === 'undefined' ? globalThis : window);
