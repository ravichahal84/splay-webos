'use strict';
const assert = require('node:assert/strict');
const { normalizeServerUrl } = require('../app/api.js');
assert.equal(normalizeServerUrl('https://media.example.nz/'), 'https://media.example.nz');
assert.equal(normalizeServerUrl('http://localhost:11470'), 'http://localhost:11470');
assert.throws(() => normalizeServerUrl('ftp://example.nz'), /http or https/);
console.log('API tests passed');
