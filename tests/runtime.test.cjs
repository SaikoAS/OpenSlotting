'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const runtimeApi = require('../runtime.js');

function createEnvironment(location, overrides) {
  return Object.assign({
    location,
    navigator: {},
    indexedDB: {},
    Worker: function Worker() {},
    BroadcastChannel: function BroadcastChannel() {}
  }, overrides || {});
}

test('detects the direct file runtime as Portable Mode', () => {
  const runtime = runtimeApi.detectRuntime(createEnvironment({
    protocol: 'file:',
    hostname: '',
    origin: 'null'
  }));

  assert.equal(runtime.mode, runtimeApi.RUNTIME_MODES.PORTABLE);
  assert.equal(runtime.origin, 'file:///');
  assert.equal(runtime.supports('indexedDb'), true);
  assert.equal(runtime.supports('sqlite'), false);
  assert.equal(runtime.supports('unknown'), false);
});

test('rejects file URLs hosted on remote shares', () => {
  const runtime = runtimeApi.detectRuntime(createEnvironment({
    protocol: 'file:',
    hostname: 'server',
    origin: 'null'
  }));

  assert.equal(runtime.mode, runtimeApi.RUNTIME_MODES.UNSUPPORTED);
});

test('accepts the explicit local file host alias', () => {
  const runtime = runtimeApi.detectRuntime(createEnvironment({
    protocol: 'file:',
    hostname: ['local', 'host'].join(''),
    origin: 'null'
  }));

  assert.equal(runtime.mode, runtimeApi.RUNTIME_MODES.PORTABLE);
});

test('detects loopback HTTP variants as Enhanced Local Mode', () => {
  const loopbackHosts = [
    ['127', '0', '0', '1'].join('.'),
    ['local', 'host'].join(''),
    '::1'
  ];
  loopbackHosts.forEach((hostname) => {
    const runtime = runtimeApi.detectRuntime(createEnvironment({
      protocol: 'http:',
      hostname,
      origin: 'http://' + (hostname === '::1' ? '[' + hostname + ']' : hostname) + ':8765'
    }));
    assert.equal(runtime.mode, runtimeApi.RUNTIME_MODES.ENHANCED_LOCAL, hostname);
  });
});

test('does not classify arbitrary hosted origins as Enhanced Local Mode', () => {
  const runtime = runtimeApi.detectRuntime(createEnvironment({
    protocol: 'https:',
    hostname: 'example.invalid',
    origin: 'https://example.invalid'
  }));

  assert.equal(runtime.mode, runtimeApi.RUNTIME_MODES.UNSUPPORTED);
  assert.equal(runtime.origin, 'https://example.invalid');
});

test('builds a capability registry from available browser APIs', () => {
  const environment = createEnvironment(
    { protocol: 'file:', hostname: '', origin: 'null' },
    {
      navigator: {
        storage: {
          persist: function persist() {},
          getDirectory: function getDirectory() {}
        },
        locks: { request: function request() {} }
      },
      showOpenFilePicker: function showOpenFilePicker() {}
    }
  );
  const capabilities = runtimeApi.detectCapabilities(environment);

  assert.deepEqual(capabilities, {
    indexedDb: true,
    webWorkers: true,
    persistentStorage: true,
    webLocks: true,
    broadcastChannel: true,
    opfs: true,
    folderAccess: true,
    sqlite: false
  });
  assert.equal(Object.isFrozen(capabilities), true);
});

test('browser integration uses the centralized runtime contract', () => {
  const indexSource = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

  assert.match(indexSource, /<script src="runtime\.js"><\/script>[\s\S]*<script src="app\.js"><\/script>/);
  assert.match(indexSource, /id="runtime-badge"/);
  assert.match(indexSource, /id="runtime-capabilities"/);
  assert.match(appSource, /const runtime = window\.OpenSlottingRuntime/);
  assert.match(appSource, /runtime\.supports\(capabilityName\)/);
  assert.doesNotMatch(appSource, /location\.(?:protocol|hostname|origin)/);
});

test('analysis starts with article search instead of a source-file or article table', () => {
  const indexSource = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const analysisPage = indexSource.match(/<div id="analysis-page"[\s\S]*?<\/main>/)?.[0] || '';

  assert.match(analysisPage, /id="article-filter"[^>]*type="search"|type="search"[^>]*id="article-filter"/);
  assert.match(analysisPage, /id="article-search-results"/);
  assert.match(analysisPage, /id="article-detail-panel"/);
  assert.match(analysisPage, /id="article-section-evidence"/);
  assert.doesNotMatch(analysisPage, /id="source-files-table-body"|id="article-table-body"|id="import-summary"/);
  assert.match(appSource, /function renderArticleSearch\(\)/);
  assert.match(appSource, /function selectArticleDetailTab\(tab\)/);
});
