/* Shared URL validation for the Splay webOS client. */
(function (global) {
  'use strict';
  function normalizeServerUrl(value) {
    var url = new URL(String(value || '').trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error('Use an http or https server address.');
    }
    return url.href.replace(/\/$/, '');
  }
  var api = { normalizeServerUrl: normalizeServerUrl };
  if (typeof module !== 'undefined') module.exports = api;
  global.SplayApi = api;
})(typeof window === 'undefined' ? globalThis : window);
