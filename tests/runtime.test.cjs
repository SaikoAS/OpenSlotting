'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const runtimeApi = require('../runtime.js');
const core = require('../csv.js');
const workspace = require('../workspace.js');
const warehouse = require('../warehouse.js');

test('build diagnostics use actual data formats and an honest unpackaged fallback', () => {
  for (const metadata of [undefined, null, {}, { status: 'release', commit: 'invalid' }]) {
    const build = runtimeApi.describeBuild({ APP_VERSION: core.APP_VERSION, APP_BUILD: metadata }, workspace, warehouse);
    assert.equal(build.version, core.APP_VERSION);
    assert.equal(build.status, 'development');
    assert.equal(build.commit, null);
    assert.equal(build.workspaceSchema, workspace.WORKSPACE_SCHEMA_VERSION);
    assert.equal(build.layoutSchema, warehouse.LAYOUT_VERSION);
    assert.equal(build.backupFormat, workspace.BACKUP_FORMAT_VERSION);
  }
});

test('packaged builds retain the candidate identity without inferring a release', () => {
  const commit = 'a'.repeat(40);
  for (const status of ['development', 'release', 'unexpected']) {
    const build = runtimeApi.describeBuild({ APP_VERSION: core.APP_VERSION, APP_BUILD: { status, commit } }, workspace, warehouse);
    assert.equal(build.commit, commit);
    assert.equal(build.status, status === 'release' ? 'release' : 'development');
    assert.equal(Object.isFrozen(build), true);
  }
  assert.equal(core.APP_BUILD.status, 'development');
  assert.equal(core.APP_BUILD.commit, null);
});

function createEnvironment(location, overrides) {
  return Object.assign({
    location,
    navigator: {},
    indexedDB: {},
    Worker: function Worker() {},
    BroadcastChannel: function BroadcastChannel() {}
  }, overrides || {});
}

test('marks the paused direct-file runtime as unsupported', () => {
  const runtime = runtimeApi.detectRuntime(createEnvironment({
    protocol: 'file:',
    hostname: '',
    origin: 'null'
  }));

  assert.equal(runtime.mode, runtimeApi.RUNTIME_MODES.UNSUPPORTED);
  assert.equal(runtime.reason, 'portable-paused');
  assert.equal(runtime.origin, '—');
  assert.match(runtime.startupNotice('de-DE').message, /unbestimmte Zeit pausiert/);
  assert.match(runtime.startupNotice('en').instruction, /Start-OpenSlotting\.cmd/);
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
  assert.equal(runtime.reason, 'unsupported-origin');
});

test('also pauses the explicit local file host alias', () => {
  const runtime = runtimeApi.detectRuntime(createEnvironment({
    protocol: 'file:',
    hostname: ['local', 'host'].join(''),
    origin: 'null'
  }));

  assert.equal(runtime.mode, runtimeApi.RUNTIME_MODES.UNSUPPORTED);
  assert.equal(runtime.reason, 'portable-paused');
});

test('accepts only loopback HTTP variants as the active localhost runtime', () => {
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
    assert.equal(runtime.mode, runtimeApi.RUNTIME_MODES.LOCALHOST, hostname);
    assert.equal(runtime.reason, null);
  });
});

test('rejects arbitrary hosted origins', () => {
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
    { protocol: 'http:', hostname: '127.0.0.1', origin: 'http://127.0.0.1:8765' },
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

test('unsupported startup shows a bilingual notice before any workspace API is accessed', () => {
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  for (const [location, language] of [
    [{ protocol: 'file:', hostname: '', origin: 'null' }, 'de-DE'],
    [{ protocol: 'https:', hostname: 'example.invalid', origin: 'https://example.invalid' }, 'en']
  ]) {
    const runtime = runtimeApi.detectRuntime(createEnvironment(location));
    const window = { OpenSlottingRuntime: runtime, navigator: { language } };
    Object.defineProperty(window, 'OpenSlottingStorage', {
      get() { throw new Error('Workspace storage must not be accessed on a rejected origin.'); }
    });
    let rendered;
    const document = {
      documentElement: {},
      createElement(tag) { return { tag, children: [], appendChild(child) { this.children.push(child); } }; },
      body: { replaceChildren(main) { rendered = main; } }
    };
    vm.runInNewContext(appSource, { window, document });
    assert.equal(rendered.children.length, 3);
    assert.equal(document.documentElement.lang, language === 'de-DE' ? 'de' : 'en');
    assert.match(rendered.children[2].textContent, /Start-OpenSlotting\.cmd/);
  }
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
