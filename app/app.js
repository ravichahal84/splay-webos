(() => {
  'use strict';
  const storageKey = 'splay.serverUrl';
  const form = document.querySelector('#server-form');
  const input = document.querySelector('#server-url');
  const message = document.querySelector('#form-message');
  const home = document.querySelector('#home-screen');
  const saved = document.querySelector('#saved-screen');
  const serverName = document.querySelector('#server-name');

  function normalizeUrl(value) {
    return window.SplayApi.normalizeServerUrl(value);
  }

  function showConnected(url) {
    serverName.textContent = new URL(url).host;
    home.classList.add('hidden');
    saved.classList.remove('hidden');
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      const url = normalizeUrl(input.value);
      localStorage.setItem(storageKey, url);
      message.textContent = '';
      showConnected(url);
    } catch (error) {
      message.textContent = error.message;
      input.focus();
    }
  });

  document.querySelector('#open-server').addEventListener('click', () => {
    const url = localStorage.getItem(storageKey);
    if (url) window.location.assign(url);
  });
  document.querySelector('#change-server').addEventListener('click', () => {
    saved.classList.add('hidden'); home.classList.remove('hidden'); input.focus();
  });
  window.addEventListener('keydown', (event) => {
    if (event.keyCode === 461 && !saved.classList.contains('hidden')) document.querySelector('#change-server').click();
  });

  const stored = localStorage.getItem(storageKey);
  if (stored) { try { showConnected(normalizeUrl(stored)); } catch { localStorage.removeItem(storageKey); } }
  else input.focus();
})();
