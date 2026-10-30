'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs');
const archive = require('../src/application/workspace-archive.js'), model = require('../workspace.js'), storage = require('../storage.js');
const { fixture } = require('./helpers/workspace-archive-fixture.cjs'), { createFakeIndexedDB } = require('./fake-indexeddb.cjs');
const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'app.js'), 'utf8');
function appFunction(name) {
  const start = source.search(new RegExp('  (?:async )?function ' + name + '\\('));
  assert.ok(start >= 0);
  const next = source.slice(start + 1).search(/\n  (?:async )?function \w+\(/);
  return source.slice(start, start + next + 1);
}
function context(repository, original) {
  const calls = [], parts = [];
  const state = { storageReady: true, workspaceLoading: false, files: [], workspaces: [{ storageRevision: 1, ...original }], selectedWorkspaceId: original.id, activeWorkspace: original, customFields: original.customFields };
  const ctx = vm.createContext({
    state, workspaceLoadRevision: 0, workspaceRepository: repository, workspaceArchive: archive, workspaceModel: model,
    workspaceSaveChain: Promise.resolve(), core: { APP_VERSION: '0.2.1' }, window: {},
    document: { body: { appendChild() {} }, createElement: () => ({ click: () => calls.push('download'), remove() {} }) },
    URL: { createObjectURL: () => 'blob:synthetic', revokeObjectURL() {} }, setTimeout() {},
    renderWorkspaceControls() {}, updateWorkspaceLoadProgress() {}, persistActiveWorkspace: async () => { calls.push('save'); },
    setWorkspaceMessage: key => calls.push(key), showWorkspaceError: error => calls.push(error.code || error.name),
    workspaceLoadError: code => Object.assign(new Error(code), { code }), refreshWorkspaceCatalog: async () => {},
    scheduleStorageEstimateRefresh() {}, clearWorkspaceView: () => calls.push('cleared'),
    activateWorkspace: async id => calls.push('activate:' + id), translate: key => key
  });
  ctx.window.showSaveFilePicker = async () => { calls.push('picker'); return { createWritable: async () => ({
    write: async value => parts.push(value), close: async () => calls.push('close'), abort: async () => calls.push('abort')
  }) }; };
  vm.runInContext(appFunction('exportWorkspaceBackup') + '\n' + appFunction('restoreWorkspaceArchive'), ctx);
  return { ctx, calls, parts, state };
}
test('backup UI opens the picker before autosave and reports success after closing the complete archive', async () => {
  const original = fixture(), repository = storage.createRepository({ indexedDB: createFakeIndexedDB(), databaseName: 'archive-ui-native' });
  await repository.createWorkspace(original);
  const { ctx, calls, parts, state } = context(repository, original);
  await ctx.exportWorkspaceBackup();
  assert.ok(calls.indexOf('picker') < calls.indexOf('save'));
  assert.ok(calls.indexOf('close') < calls.indexOf('workspace_backup_exported'));
  assert.equal(await archive.isArchive(new Blob(parts)), true);
  assert.equal(state.workspaceLoading, false);
  assert.equal(calls.includes('abort'), false);
});
test('backup UI falls back to downloads when the native picker is blocked, while picker cancellation creates no download', async () => {
  const original = fixture(), repository = storage.createRepository({ indexedDB: createFakeIndexedDB(), databaseName: 'archive-ui-fallback' });
  await repository.createWorkspace(original);
  for (const name of ['SecurityError', 'NotAllowedError', 'AbortError']) {
    const { ctx, calls } = context(repository, original);
    ctx.window.showSaveFilePicker = async () => { throw Object.assign(new Error('Synthetic policy'), { name }); };
    await ctx.exportWorkspaceBackup();
    assert.equal(calls.includes('download'), name !== 'AbortError');
    assert.equal(calls.includes('workspace_backup_download_started'), name !== 'AbortError');
    assert.equal(calls.includes('workspace_backup_exported'), false);
  }
});

test('settings backup targets the open workspace even when another catalog entry is selected', async () => {
  const original = fixture(), repository = storage.createRepository({ indexedDB: createFakeIndexedDB(), databaseName: 'archive-ui-settings' });
  await repository.createWorkspace(original);
  const readIds = [];
  const tracked = { ...repository, readBackupRecords(id, options) { readIds.push(id); return repository.readBackupRecords(id, options); } };
  const { ctx, state, calls, parts } = context(tracked, original);
  state.workspaces.push({ id: 'other-workspace', name: 'Other workspace' });
  state.selectedWorkspaceId = 'other-workspace';
  await ctx.exportWorkspaceBackup(state.activeWorkspace.id);
  assert.deepEqual(readIds, [original.id]);
  assert.equal(state.selectedWorkspaceId, 'other-workspace');
  assert.ok(calls.includes('save'));
  assert.ok(calls.includes('workspace_backup_exported'));
  assert.equal(await archive.isArchive(new Blob(parts)), true);
});

test('backup export rejects unavailable storage, concurrent work and missing targets before opening a picker', async () => {
  for (const patch of [{ storageReady: false }, { workspaceLoading: true }, { files: [{ reading: true }] }, { selectedWorkspaceId: null }]) {
    const original = fixture(), { ctx, state, calls } = context({}, original);
    Object.assign(state, patch);
    await ctx.exportWorkspaceBackup();
    assert.deepEqual(calls, []);
  }
});
test('archive restore UI confirms only after validation; cancelling retains the old view and removes staging', async () => {
  const indexedDB = createFakeIndexedDB(), original = fixture(), repository = storage.createRepository({ indexedDB, databaseName: 'archive-ui-restore' });
  await repository.createWorkspace(original);
  let blob;
  await archive.write(repository.readBackupRecords(original.id), archive.blobSink(async value => { blob = value; }));
  const { ctx, calls } = context(repository, original);
  ctx.window.confirm = () => { calls.push('confirm'); return false; };
  await ctx.restoreWorkspaceArchive(blob, 'replace', 0);
  assert.deepEqual(calls, ['confirm']);
  assert.deepEqual(await repository.loadWorkspace(original.id), original);
  assert.equal(indexedDB.inspect('archive-ui-restore', 'workspaceBackupStaging').length, 0);
  ctx.window.confirm = () => { calls.push('confirm'); return true; };
  await ctx.restoreWorkspaceArchive(blob, 'replace', 0);
  assert.ok(calls.includes('cleared'));
  assert.ok(calls.includes('activate:' + original.id));
});
