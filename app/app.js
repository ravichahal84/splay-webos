(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const app = $('#app'), nav = $('nav');
  let auth = localStorage.getItem('splay.authKey'), addons = [], selected = null, selectedVideo = null;
  const historyKey = 'splay.history';
  const progressKey = id => 'splay.progress:' + String(id);
  const readHistory = () => {
    try {
      const value = JSON.parse(localStorage.getItem(historyKey) || '[]');
      return Array.isArray(value) ? value.filter(Boolean) : [];
    } catch {
      return [];
    }
  };
  const writeHistory = items => localStorage.setItem(historyKey, JSON.stringify((items || []).slice(0, 8)));
  const addToHistory = item => {
    if (!item || !item.id || !item.name) return;
    const entry = {
      id: item.id,
      type: item.type || 'movie',
      name: item.name || item.title || 'Untitled',
      poster: item.poster || item.image || '',
      updatedAt: Date.now()
    };
    const list = readHistory().filter(existing => existing.id !== entry.id);
    list.unshift(entry);
    writeHistory(list);
  };
  const saveProgress = (id, position) => {
    if (!id) return;
    localStorage.setItem(progressKey(id), String(Math.max(0, Number(position) || 0)));
  };
  const readProgress = id => {
    if (!id) return 0;
    const value = Number(localStorage.getItem(progressKey(id)) || 0);
    return Number.isFinite(value) ? value : 0;
  };
  const prefs = () => Object.assign({ maxHeight: 2160, allowHdr: true, preferHdr: false, preferHevc: false, autoPlay: true }, JSON.parse(localStorage.getItem('splay.preferences') || '{}'));
  const savePrefs = value => localStorage.setItem('splay.preferences', JSON.stringify(value));
  const e = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const image = (meta, kind) => SplayApi.image(meta[kind] || (kind === 'poster' ? meta.poster || meta.imdb_id : meta.imdb_id), kind);
  const show = html => { app.innerHTML = html; setTimeout(() => ($('button,input,select', app) || app).focus()); };
  const safe = async work => { try { $('#status').textContent = 'Loading…'; await work(); } catch (error) { app.insertAdjacentHTML('afterbegin', `<p class="error">${e(error.message)}</p>`); } finally { $('#status').textContent = ''; } };
  const typeFor = item => item.type === 'series' ? 'series' : 'movie';
  const directAddons = (type, id) => addons.filter(addon => SplayApi.supports(addon, 'stream', type, id));

  function renderHistory() {
    const history = readHistory();
    if (!history.length) return '';
    return `
      <section>
        <h2>Continue watching</h2>
        <div class="cards">
          ${history.slice(0, 4).map(item => `
            <button class="card history-item" data-id="${e(item.id)}" data-type="${e(item.type || 'movie')}" data-name="${e(item.name)}">
              <img src="${e(item.poster || '')}" alt="${e(item.name)}">
              <span>${e(item.name)}</span>
            </button>
          `).join('')}
        </div>
      </section>
    `;
  }

  function cards(box, items) {
    items.forEach(meta => {
      const card = $('#card').content.firstElementChild.cloneNode(true), poster = $('img', card);
      poster.src = image(meta, 'poster'); poster.alt = meta.name || ''; $('span', card).textContent = meta.name || meta.id;
      card.onclick = () => details(meta); box.append(card);
    });
  }
  function rows() {
    return addons.flatMap(addon => (addon.manifest.catalogs || []).filter(catalog => catalog.type && catalog.id).slice(0, 3).map(catalog => ({ addon, catalog }))).slice(0, 10);
  }
  async function link() {
    show('<section class="center"><h1>Link your Stremio account</h1><p>Splay uses Stremio’s TV linking page. Your Stremio password is never entered or stored on this TV.</p><button id="link">Create code</button><p id="code"></p></section>');
    $('#link').onclick = () => safe(async () => {
      const link = await SplayApi.createLink();
      $('#code').innerHTML = `<h2>${e(link.code)}</h2><p>Open ${e(link.url)} on your phone, approve this code, then select Check connection.</p><button id="check">Check connection</button>`;
      $('#check').onclick = () => safe(async () => { const key = await SplayApi.readLink(link.code); if (!key) throw Error('Still waiting for approval.'); auth = key; localStorage.setItem('splay.authKey', key); await load(); home(); });
    });
  }
  async function load() { addons = (await SplayApi.addons(auth)).filter(addon => addon.manifest && addon.manifest.catalogs); nav.classList.remove('hidden'); }
  async function home() {
    show('<section id="hero" class="hero"><div><p class="eyebrow">SPLAY</p><h1>Loading your Stremio home…</h1></div></section><div id="rows"><p>Loading catalogues…</p></div>');
    await safe(async () => {
      const result = await Promise.all(rows().map(async item => Object.assign({}, item, { metas: await SplayApi.catalog(item.addon, item.catalog.type, item.catalog.id).catch(() => []) })));
      const first = result.flatMap(item => item.metas)[0]; if (first) paintHero(first);
      const box = $('#rows');
      box.innerHTML = `${renderHistory()}${result.map((item, index) => `<section><h2>${e(item.catalog.name || item.catalog.id)} <small>${e(item.addon.manifest.name)}</small></h2><div id="row-${index}" class="cards"></div></section>`).join('')}`;
      const historyButtons = [...document.querySelectorAll('.history-item')];
      historyButtons.forEach(button => {
        button.onclick = () => {
          const item = {
            id: button.dataset.id,
            type: button.dataset.type || 'movie',
            name: button.dataset.name || 'Untitled'
          };
          details(item, false);
        };
      });
      result.forEach((item, index) => cards($(`#row-${index}`), item.metas));
    });
  }
  async function paintHero(item) {
    const hero = $('#hero'); if (!hero) return;
    const meta = await SplayApi.meta(addons, typeFor(item), item.id).catch(() => null) || item;
    const backdrop = image(meta, 'background');
    hero.style.backgroundImage = backdrop ? `linear-gradient(90deg,rgba(7,12,20,.96),rgba(7,12,20,.25)),url("${backdrop}")` : '';
    hero.innerHTML = `<div>${meta.logo ? `<img class="title-logo" src="${e(meta.logo)}" alt="${e(meta.name)}">` : '<p class="eyebrow">SPLAY FEATURED</p>'}<h1>${e(meta.name || item.name)}</h1><p>${e((meta.tagline || meta.description || '').slice(0, 200))}</p><div class="actions"><button id="hero-play">Play</button><button id="hero-info" class="quiet">Info</button></div></div>`;
    $('#hero-play').onclick = () => details(item, true); $('#hero-info').onclick = () => details(item);
  }
  function search() {
    show('<h1>Search</h1><form id="search"><input placeholder="Title" autocomplete="off"><button>Search</button></form><div id="result" class="cards"></div>');
    $('#search').onsubmit = event => { event.preventDefault(); safe(async () => {
      const query = $('input', app).value.trim(); if (!query) return;
      const searchable = rows().filter(item => (item.catalog.extra || item.catalog.extraSupported || []).some(extra => (extra.name || extra) === 'search'));
      const results = await Promise.all(searchable.map(item => SplayApi.catalog(item.addon, item.catalog.type, item.catalog.id, 'search=' + encodeURIComponent(query)).catch(() => [])));
      const unique = new Map(); results.flat().forEach(meta => unique.set(meta.id, meta)); const box = $('#result'); box.innerHTML = ''; cards(box, [...unique.values()]); if (!box.children.length) box.innerHTML = '<p>No results found.</p>';
    }); };
  }
  async function details(item, playImmediately) {
    selected = item; selectedVideo = item;
    show('<p>Loading title details…</p>');
    const meta = await SplayApi.meta(addons, typeFor(item), item.id).catch(() => null) || item;
    selected = Object.assign({}, item, meta); selectedVideo = selected;
    addToHistory(selected);
    renderDetails(playImmediately);
  }
  function renderDetails(playImmediately) {
    const meta = selected, backdrop = image(meta, 'background'), poster = image(meta, 'poster');
    show(`<section class="detail" style="--backdrop:url('${e(backdrop)}')"><img src="${e(poster)}" alt=""><div><button class="back">← Back</button>${meta.logo ? `<img class="detail-logo" src="${e(meta.logo)}" alt="${e(meta.name || '')}">` : ''}<h1>${e(meta.name || '')}</h1><p>${e((meta.description || '').slice(0, 300))}</p><div class="actions"><button id="best">Best match</button><button id="sources">Choose source</button></div></div></section><div id="episodes"></div>`);
    $('.back').onclick = home;
    const videos = (meta.videos || []).filter(video => video.id);
    if (videos.length) {
      const box = $('#episodes');
      box.innerHTML = '<h2>Episodes</h2><div class="episodes"></div>';
      const list = $('.episodes', box);
      videos.slice(0, 100).forEach(video => { const button = document.createElement('button'); button.className = 'episode' + (video.id === selectedVideo.id ? ' selected' : ''); button.textContent = video.name || video.title || video.id; button.onclick = () => { selectedVideo = Object.assign({}, selected, video); renderDetails(false); }; list.append(button); });
    }
    $('#best').onclick = () => streams(selectedVideo, true); $('#sources').onclick = () => streams(selectedVideo, false);
    if (playImmediately) streams(selectedVideo, true);
  }
  function $$(selector, root = document) { return [...root.querySelectorAll(selector)]; }
  function streamLabel(stream) {
    const info = stream.splay || SplayApi.details(stream), format = [info.height && info.height + 'p', info.hdr && 'HDR', info.hevc && 'HEVC', info.audio && 'surround audio'].filter(Boolean).join(' • ');
    return [format, stream.name || stream.title || stream.filename || 'Direct stream'].filter(Boolean).join(' — ');
  }
  async function streams(video, autoPlay) {
    show(`<button class="back">← Back</button><h1>${e(autoPlay ? 'Finding best source…' : 'Choose a source')}</h1><div id="streams"></div>`);
    $('.back').onclick = () => renderDetails(false);
    await safe(async () => {
      const answers = await Promise.all(directAddons(typeFor(video), video.id).map(async addon => (await SplayApi.streams(addon, typeFor(video), video.id).catch(() => [])).map(stream => Object.assign({}, stream, { addon }))));
      const ordered = SplayApi.rankStreams(answers.flat(), prefs());
      if (!ordered.length) throw Error('No direct, TV-compatible stream was returned. Check your debrid add-on and source settings in Stremio.');
      if (autoPlay && prefs().autoPlay) return playQueue(ordered, 0);
      const box = $('#streams'); box.innerHTML = '<p>Direct sources are ranked for this TV. “Best match” follows your Settings.</p>';
      ordered.forEach((stream, index) => { const button = document.createElement('button'); button.className = 'stream'; button.innerHTML = `${index === 0 ? '<b>BEST MATCH</b> ' : ''}${e(streamLabel(stream))}`; button.onclick = () => playQueue([stream], 0); box.append(button); });
    });
  }
  function playQueue(queue, index) {
    const stream = queue[index]; if (!stream) return;
    const mediaUrl = stream.url; const label = streamLabel(stream);
    const resumeAt = readProgress(selectedVideo.id || selected.id || selectedVideo.name);
    show(`<button class="back">← Back</button><h1>${e(selectedVideo.name || selected.name)}</h1><p id="playing">Starting ${e(label)}…</p><video id="player" controls autoplay src="${e(mediaUrl)}"></video><div id="player-actions"></div>`);
    $('.back').onclick = () => streams(selectedVideo, false);
    const player = $('#player');
    if (resumeAt > 0) {
      player.onloadedmetadata = () => { player.currentTime = resumeAt; };
    }
    player.ontimeupdate = () => {
      if (Number.isFinite(player.currentTime)) saveProgress(selectedVideo.id || selected.id || selectedVideo.name, player.currentTime);
    };
    player.onerror = () => { if (index + 1 < queue.length) { $('#playing').textContent = 'That format failed. Trying the next compatible source…'; playQueue(queue, index + 1); } else { $('#playing').textContent = 'No compatible stream could play. Try a different source.'; } };
    const actions = $('#player-actions');
    if (index + 1 < queue.length) { const next = document.createElement('button'); next.className = 'quiet'; next.textContent = 'Try next source'; next.onclick = () => playQueue(queue, index + 1); actions.append(next); }
  }
  function addonView() { show('<h1>Your add-ons</h1>' + addons.map(addon => `<article><h2>${e(addon.manifest.name)}</h2><p>${e(addon.manifest.description || addon.transportUrl)}</p></article>`).join('')); }
  function settings() {
    const value = prefs();
    show(`<h1>Playback settings</h1><section class="settings"><label>Highest quality <select id="height"><option value="2160">4K</option><option value="1080">1080p</option><option value="720">720p</option><option value="480">480p</option></select></label><label><input id="hdr" type="checkbox"> Allow HDR</label><label><input id="prefer-hdr" type="checkbox"> Prefer HDR</label><label><input id="prefer-hevc" type="checkbox"> Prefer HEVC</label><label><input id="auto" type="checkbox"> Auto-play best match</label></section><button id="save">Save</button><button id="refresh" class="quiet">Refresh add-ons</button><button id="out" class="quiet">Log out</button>`);
    $('#height').value = String(value.maxHeight); $('#hdr').checked = value.allowHdr; $('#prefer-hdr').checked = value.preferHdr; $('#prefer-hevc').checked = value.preferHevc; $('#auto').checked = value.autoPlay;
    $('#save').onclick = () => { savePrefs({ maxHeight: Number($('#height').value), allowHdr: $('#hdr').checked, preferHdr: $('#prefer-hdr').checked, preferHevc: $('#prefer-hevc').checked, autoPlay: $('#auto').checked }); home(); };
    $('#refresh').onclick = () => safe(async () => { await load(); addonView(); }); $('#out').onclick = () => { localStorage.removeItem('splay.authKey'); auth = null; addons = []; nav.classList.add('hidden'); link(); };
  }
  nav.onclick = event => { const view = event.target.dataset.v; if (view) ({ home, search, addons: addonView, settings }[view])(); };
  document.addEventListener('keydown', event => { if (event.keyCode === 461 && auth) home(); });
  auth ? safe(async () => { await load(); home(); }) : link();
})();
