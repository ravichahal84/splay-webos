(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const app = $('#app'), nav = $('nav');
  let auth = localStorage.getItem('splay.authKey'), addons = [], selected = null, selectedVideo = null;
  const historyKey = 'splay.history';
  const favoritesKey = 'splay.favorites';
  const progressKey = id => 'splay.progress:' + String(id);
  const readHistory = () => { try { const value = JSON.parse(localStorage.getItem(historyKey) || '[]'); return Array.isArray(value) ? value.slice(0, 8) : []; } catch (_) { return []; } };
  const readFavorites = () => { try { const value = JSON.parse(localStorage.getItem(favoritesKey) || '[]'); return Array.isArray(value) ? value.slice(0, 50) : []; } catch (_) { return []; } };
  const isFavorite = item => readFavorites().some(value => value.id === item.id);
  const toggleFavorite = item => {
    const favorites = readFavorites();
    const updated = isFavorite(item)
      ? favorites.filter(value => value.id !== item.id)
      : [{ id: item.id, type: item.type || 'movie', name: item.name, poster: item.poster || '' }, ...favorites].slice(0, 50);
    localStorage.setItem(favoritesKey, JSON.stringify(updated));
  };
  const addToHistory = item => {
    if (!item || !item.id || !item.name) return;
    const entry = { id: item.id, type: item.type || 'movie', name: item.name, poster: item.poster || '', updatedAt: Date.now() };
    localStorage.setItem(historyKey, JSON.stringify([entry, ...readHistory().filter(value => value.id !== entry.id)].slice(0, 8)));
  };
  const readProgress = id => Number(localStorage.getItem(progressKey(id)) || 0) || 0;
  const saveProgress = (id, seconds) => { if (id && Number.isFinite(seconds)) localStorage.setItem(progressKey(id), String(Math.max(0, seconds))); };
  const formatTime = seconds => {
    const value = Math.max(0, Math.floor(seconds));
    return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
  };
  const prefs = () => Object.assign({ maxHeight: 2160, allowHdr: true, preferHdr: false, preferHevc: false, autoPlay: true }, JSON.parse(localStorage.getItem('splay.preferences') || '{}'));
  const savePrefs = value => localStorage.setItem('splay.preferences', JSON.stringify(value));
  const e = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const image = (meta, kind) => SplayApi.normalizeUrl(SplayApi.image(meta[kind] || (kind === 'poster' ? meta.poster || meta.imdb_id : meta.imdb_id), kind));
  const show = html => { app.innerHTML = html; setTimeout(() => ($('button,input,select', app) || app).focus()); };
  const safe = async work => { try { $('#status').textContent = 'Loading…'; await work(); } catch (error) { app.insertAdjacentHTML('afterbegin', `<p class="error">${e(error.message)}</p>`); } finally { $('#status').textContent = ''; } };
  const typeFor = item => item.type === 'series' ? 'series' : 'movie';
  const directAddons = (type, id) => addons.filter(addon => SplayApi.supports(addon, 'stream', type, id));
  const homeSectionsMarkup = () => {
    const continuing = readHistory().filter(item => readProgress(item.id) > 15);
    const favorites = readFavorites();
    return `${favorites.length ? '<section><h2>Favorites</h2><div id="favorites" class="cards"></div></section>' : ''}${continuing.length ? '<section><h2>Continue watching</h2><div id="history" class="cards"></div></section>' : ''}`;
  };
  function showHomeSections() {
    const box = $('#history');
    if (box) cards(box, readHistory().filter(item => readProgress(item.id) > 15));
    const favoriteBox = $('#favorites');
    if (favoriteBox) cards(favoriteBox, readFavorites());
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
    show('<section class="center"><h1>Link your Stremio account</h1><p>Splay uses Stremio’s TV linking page. Your Stremio password is never entered or stored on this TV.</p><button id="link">Create link code</button><div id="code"></div></section>');
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
      const box = $('#rows'); box.innerHTML = homeSectionsMarkup() + result.map((item, index) => `<section><h2>${e(item.catalog.name || item.catalog.id)} <small>${e(item.addon.manifest.name)}</small></h2><div class="cards" id="row-${index}"></div></section>`).join('');
      showHomeSections();
      result.forEach((item, index) => cards($(`#row-${index}`), item.metas));
    });
  }
  async function paintHero(item) {
    const hero = $('#hero'); if (!hero) return;
    const meta = await SplayApi.meta(addons, typeFor(item), item.id).catch(() => null) || item;
    const backdrop = image(meta, 'background');
    hero.style.backgroundImage = backdrop ? `linear-gradient(90deg,rgba(7,12,20,.96),rgba(7,12,20,.25)),url("${backdrop}")` : '';
    hero.innerHTML = `<div>${meta.logo ? `<img class="title-logo" src="${e(meta.logo)}" alt="${e(meta.name)}">` : '<p class="eyebrow">SPLAY FEATURED</p>'}<h1>${e(meta.name || item.name)}</h1><p>${e([meta.year, (meta.genres || []).slice(0, 2).join(' · '), meta.imdbRating && 'IMDb ' + meta.imdbRating].filter(Boolean).join('  ·  '))}</p><p class="hero-copy">${e(meta.description || '')}</p><button id="hero-play">Play best source</button><button class="quiet" id="hero-info">More info</button></div>`;
    $('#hero-play').onclick = () => details(item, true); $('#hero-info').onclick = () => details(item);
  }
  function search() {
    show('<h1>Search</h1><form id="search"><input placeholder="Title" autocomplete="off"><button>Search</button></form><div id="result" class="cards"></div>');
    $('#search').onsubmit = event => { event.preventDefault(); safe(async () => {
      const query = $('input', app).value.trim(); if (!query) return;
      const searchable = rows().filter(item => (item.catalog.extra || item.catalog.extraSupported || []).some(extra => (extra.name || extra) === 'search'));
      const results = await Promise.all(searchable.map(item => SplayApi.catalog(item.addon, item.catalog.type, item.catalog.id, 'search=' + encodeURIComponent(query)).catch(() => [])));
      const unique = new Map(); results.flat().forEach(meta => unique.set(meta.id, meta)); const box = $('#result'); box.innerHTML = ''; cards(box, [...unique.values()]); if (!box.children.length) box.textContent = 'No titles returned.';
    }); };
  }
  async function details(item, playImmediately) {
    selected = item; selectedVideo = item;
    show('<p>Loading title details…</p>');
    const meta = await SplayApi.meta(addons, typeFor(item), item.id).catch(() => null) || item;
    selected = Object.assign({}, item, meta); selectedVideo = selected;
    renderDetails(playImmediately);
  }
  function renderDetails(playImmediately) {
    const meta = selected, backdrop = image(meta, 'background'), poster = image(meta, 'poster');
    show(`<section class="detail" style="--backdrop:url('${e(backdrop)}')"><img src="${e(poster)}" alt=""><div><button class="back">← Back</button> <button class="quiet" id="favorite">${isFavorite(meta) ? 'Remove from favorites' : 'Add to favorites'}</button>${meta.logo ? `<img class="detail-logo" src="${e(meta.logo)}" alt="${e(meta.name)}">` : ''}<h1>${e(meta.name)}</h1><p>${e([meta.year, (meta.genres || []).join(', '), meta.imdbRating && 'IMDb ' + meta.imdbRating].filter(Boolean).join(' · '))}</p><p>${e(meta.description || 'No description provided.')}</p><div id="episodes"></div><button id="best">Play best source</button> <button class="quiet" id="sources">Choose source</button></div></section>`);
    $('.back').onclick = home;
    $('#favorite').onclick = () => {
      toggleFavorite(meta);
      $('#favorite').textContent = isFavorite(meta) ? 'Remove from favorites' : 'Add to favorites';
    };
    const videos = (meta.videos || []).filter(video => video.id);
    if (videos.length) {
      const box = $('#episodes');
      const seasons = [...new Set(videos.map(video => Number(video.season) || 0))].sort((a, b) => a - b);
      const currentVideo = videos.find(video => video.id === selectedVideo.id) || videos[0];
      selectedVideo = Object.assign({}, currentVideo, { type: 'series', poster: currentVideo.thumbnail || meta.poster, background: meta.background, name: currentVideo.title || meta.name });
      box.innerHTML = `<h2>Episodes</h2><label class="season-picker">Season <select id="season">${seasons.map(season => `<option value="${season}">${season ? `Season ${season}` : 'Specials'}</option>`).join('')}</select></label><div class="episodes" id="episode-list"></div>`;
      const seasonPicker = $('#season', box);
      const renderEpisodes = season => {
        const list = $('#episode-list', box), seasonVideos = videos.filter(video => (Number(video.season) || 0) === Number(season));
        list.innerHTML = '';
        if (!seasonVideos.some(video => video.id === selectedVideo.id)) {
          const first = seasonVideos[0];
          selectedVideo = Object.assign({}, first, { type: 'series', poster: first.thumbnail || meta.poster, background: meta.background, name: first.title || meta.name });
        }
        seasonVideos.forEach(video => {
          const button = document.createElement('button');
          button.className = 'episode' + (video.id === selectedVideo.id ? ' selected' : '');
          button.textContent = [video.episode && 'Episode ' + video.episode, video.title || video.name].filter(Boolean).join(' · ') || video.id;
          button.onclick = () => {
            selectedVideo = Object.assign({}, video, { type: 'series', poster: video.thumbnail || meta.poster, background: meta.background, name: video.title || meta.name });
            $$('.episode', list).forEach(value => value.classList.remove('selected'));
            button.classList.add('selected');
          };
          list.append(button);
        });
      };
      seasonPicker.value = String(Number(currentVideo.season) || 0);
      seasonPicker.onchange = () => renderEpisodes(seasonPicker.value);
      renderEpisodes(seasonPicker.value);
    }
    $('#best').onclick = () => streams(selectedVideo, true); $('#sources').onclick = () => streams(selectedVideo, false);
    if (playImmediately) streams(selectedVideo, true);
  }
  function $$(selector, root = document) { return [...root.querySelectorAll(selector)]; }
  function streamLabel(stream) {
    const info = stream.splay || SplayApi.details(stream), format = [info.height && info.height + 'p', info.hdr && 'HDR', info.hevc && 'HEVC', info.audio && 'surround audio'].filter(Boolean).join(' · ');
    return [format, stream.name || stream.title || stream.filename || 'Direct stream'].filter(Boolean).join(' — ');
  }
  async function streams(video, autoPlay) {
    show(`<button class="back">← Back</button><h1>${e(autoPlay ? 'Finding best source…' : 'Choose a source')}</h1><div id="streams"></div>`);
    $('.back').onclick = () => renderDetails(false);
    await safe(async () => {
      const answers = await Promise.all(directAddons(typeFor(video), video.id).map(async addon => (await SplayApi.streams(addon, typeFor(video), video.id).catch(() => [])).map(stream => Object.assign(stream, { provider: addon.manifest.name }))));
      const ordered = SplayApi.rankStreams(answers.flat(), prefs());
      if (!ordered.length) throw Error('No direct, TV-compatible stream was returned. Check your debrid add-on and source settings in Stremio.');
      if (autoPlay && prefs().autoPlay) return playQueue(ordered, 0);
      const box = $('#streams'); box.innerHTML = '<p>Direct sources are ranked for this TV. “Best match” follows your Settings.</p>';
      ordered.forEach((stream, index) => { const button = document.createElement('button'); button.className = 'stream'; button.innerHTML = `${index === 0 ? '<b>BEST MATCH</b> ' : ''}${e(streamLabel(stream))}<small>${e(stream.provider || '')}</small>`; button.onclick = () => playQueue(ordered, index); box.append(button); });
    });
  }
  function playQueue(queue, index, startAt) {
    const id = selectedVideo.id || selected.id;
    if (startAt === undefined) {
      const saved = readProgress(id);
      if (saved > 15) {
        show(`<section class="center"><h1>Continue watching?</h1><p>Saved progress: ${e(formatTime(saved))}</p><button id="resume">Resume</button> <button id="start-over" class="quiet">Start over</button><p><button id="back" class="quiet">Choose a different source</button></p></section>`);
        $('#resume').onclick = () => playQueue(queue, index, saved);
        $('#start-over').onclick = () => { saveProgress(id, 0); playQueue(queue, index, 0); };
        $('#back').onclick = () => streams(selectedVideo, false);
        return;
      }
      startAt = 0;
    }
    const stream = queue[index], label = streamLabel(stream);
    addToHistory(selectedVideo);
    show(`<button class="back">← Back</button><h1>${e(selectedVideo.name || selected.name)}</h1><p id="playing">Starting ${e(label)}…</p><video id="player" controls autoplay src="${e(stream.url)}">This stream is not supported by the TV.</video><div id="player-actions"></div>`);
    $('.back').onclick = () => streams(selectedVideo, false);
    const player = $('#player');
    let lastSaved = 0;
    player.onloadedmetadata = () => { if (startAt > 0 && startAt < player.duration - 15) player.currentTime = startAt; };
    player.ontimeupdate = () => {
      if (player.currentTime - lastSaved >= 10) { lastSaved = player.currentTime; saveProgress(id, player.currentTime); }
    };
    player.onpause = () => { if (player.currentTime > 0) saveProgress(id, player.currentTime); };
    player.onended = () => saveProgress(id, 0);
    player.onerror = () => {
      const position = player.currentTime || startAt;
      if (position > 0) saveProgress(id, position);
      if (index + 1 < queue.length) {
        $('#playing').textContent = 'That format failed. Trying the next compatible source…';
        playQueue(queue, index + 1, position);
        return;
      }
      const errors = { 1: 'Playback was interrupted.', 2: 'The network could not load this stream.', 3: 'The TV could not decode this stream format.', 4: 'This stream format is not supported by the TV.' };
      const code = player.error && player.error.code;
      $('#playing').textContent = `${errors[code] || 'This stream could not be played.'} Try another source or format.`;
      const actions = $('#player-actions'); actions.innerHTML = '';
      const retry = document.createElement('button'); retry.textContent = 'Retry sources'; retry.onclick = () => playQueue(queue, 0, position); actions.append(retry);
      const choose = document.createElement('button'); choose.className = 'quiet'; choose.textContent = 'Choose a source'; choose.onclick = () => streams(selectedVideo, false); actions.append(choose);
      if (position > 0) {
        const restart = document.createElement('button'); restart.className = 'quiet'; restart.textContent = 'Start over'; restart.onclick = () => { saveProgress(id, 0); playQueue(queue, 0, 0); }; actions.append(restart);
      }
    };
    const actions = $('#player-actions');
    if (index + 1 < queue.length) { const next = document.createElement('button'); next.className = 'quiet'; next.textContent = 'Try next source'; next.onclick = () => playQueue(queue, index + 1, player.currentTime || startAt); actions.append(next); }
  }
  function addonView() { show('<h1>Your add-ons</h1>' + addons.map(addon => `<article><h2>${e(addon.manifest.name)}</h2><p>${e(addon.manifest.description || addon.transportUrl)}</p></article>`).join('')); }
  function favoriteView() {
    const favorites = readFavorites();
    show('<h1>Favorites</h1><div id="favorite-list" class="cards"></div>');
    const box = $('#favorite-list');
    if (favorites.length) cards(box, favorites);
    else box.textContent = 'Add titles to Favorites from their details.';
  }
  function settings() {
    const value = prefs();
    show(`<h1>Playback settings</h1><section class="settings"><label>Highest quality <select id="height"><option value="2160">4K</option><option value="1080">1080p</option><option value="720">720p</option><option value="0">No limit</option></select></label><label><input id="hdr" type="checkbox"> Allow HDR / Dolby Vision</label><label><input id="prefer-hdr" type="checkbox"> Prefer HDR</label><label><input id="prefer-hevc" type="checkbox"> Prefer HEVC</label><label><input id="auto" type="checkbox"> Play best source automatically</label><button id="save">Save playback settings</button><button id="refresh" class="quiet">Refresh add-ons</button><button id="out" class="quiet">Sign out</button></section>`);
    $('#height').value = String(value.maxHeight); $('#hdr').checked = value.allowHdr; $('#prefer-hdr').checked = value.preferHdr; $('#prefer-hevc').checked = value.preferHevc; $('#auto').checked = value.autoPlay;
    $('#save').onclick = () => { savePrefs({ maxHeight: Number($('#height').value), allowHdr: $('#hdr').checked, preferHdr: $('#prefer-hdr').checked, preferHevc: $('#prefer-hevc').checked, autoPlay: $('#auto').checked }); $('#status').textContent = 'Saved'; setTimeout(() => $('#status').textContent = '', 1500); };
    $('#refresh').onclick = () => safe(async () => { await load(); addonView(); }); $('#out').onclick = () => { localStorage.removeItem('splay.authKey'); auth = null; addons = []; nav.classList.add('hidden'); link(); };
  }
  nav.onclick = event => { const view = event.target.dataset.v; if (view) ({ home, search, favorites: favoriteView, addons: addonView, settings }[view])(); };
  document.addEventListener('keydown', event => { if (event.keyCode === 461 && auth) home(); });
  auth ? safe(async () => { await load(); home(); }) : link();
})();
