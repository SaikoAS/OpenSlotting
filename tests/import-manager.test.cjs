'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const model = require('../workspace.js'), storage = require('../storage.js'), preparation = require('../src/application/workspace-preparation.js');
const archive = require('../src/application/workspace-archive.js'), manager = require('../src/ui/import-manager.js');
const { fixture } = require('./helpers/workspace-archive-fixture.cjs'), { createFakeIndexedDB } = require('./fake-indexeddb.cjs');
const app = fs.readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8').replace(/\r\n/g, '\n');
function appFunction(name) {
  const start = app.search(new RegExp('  (?:async )?function ' + name + '\\('));
  return app.slice(start, start + 1 + app.slice(start + 1).search(/\n  (?:async )?function \w+\(/));
}
function settings(extra) { return { language: 'de', hasHandle: () => true, ...extra }; }

test('import tags normalize bounded custom values and migrate legacy sources without invented tags', () => {
  assert.deepEqual(model.normalizeImportTags([' August ', 'august', '<Nord>&']), ['August','<Nord>&']);
  for (const value of [[''], ['a'.repeat(41)], Array(21).fill('Tag'), [123], ['two\nlines'], {}]) assert.throws(() => model.normalizeImportTags(value), { code: 'invalid_import_tags' });
  const legacy = fixture(); legacy.schemaVersion = 22;
  assert.ok(model.migrateWorkspace(legacy).files.every(file => file.tags.length === 0));
});

test('100+ imports can be searched, filtered by tags/status/link and sorted without reading data rows', () => {
  const files = Array.from({ length: 125 }, (_, index) => ({ id: 'source-' + index, name: 'Datei ' + index + '.csv', label: 'Datei ' + index + '.csv',
    dataRowCount: index, size: index * 20, tags: [index % 2 ? 'Nord' : 'Süd'], sourceType: index % 2 ? 'article-master' : 'order-lines',
    linkedSource: index % 3 ? { updatedAt: '2026-10-23T10:00:00.000Z' } : null,
    appliedImportProfile: { profileName: 'Profil ' + index }, result: { get rows() { assert.fail('projection must never scan order lines'); } } }));
  const original = files.slice();
  assert.equal(manager.project(files, settings({ query: 'profil 124' }))[0].file.id, 'source-124');
  assert.equal(manager.project(files, settings({ tag: 'Nord' })).length, 62);
  assert.equal(manager.project(files, settings({ query: 'sÜd' })).length, 63);
  assert.equal(manager.project(files, settings({ status: 'ready' })).length, 0);
  assert.equal(manager.project(files, settings({ link: 'snapshot' })).length, 42);
  assert.equal(manager.project(files, settings({ sort: 'rows', direction: 'desc' }))[0].file.id, 'source-124');
  assert.equal(manager.project(files, settings({ sort: 'name' }))[2].file.id, 'source-2');
  assert.deepEqual(files, original);
  assert.equal(manager.project(files, settings({ link: 'reconnect', hasHandle: () => false })).length, 83);
});

test('tag-only saves retain all row chunks, original bytes, links, other sources and workspace isolation', async t => {
  const idb = createFakeIndexedDB(), repo = storage.createRepository({ indexedDB: idb, databaseName: 'tag-tests' }); t.after(() => repo.close());
  const record = fixture(), source = record.files[0];
  source.linkedSource = { name: source.name, updatedAt: '2026-10-23T10:00:00.000Z' };
  const created = await repo.createWorkspace(record, { sourceLinks: [{ sourceId: source.id, handle: { kind: 'file', name: source.name } }] });
  const links = await repo.listSourceLinks(record.id);
  const rows = idb.inspect('tag-tests','workspaceRowChunks'), bytes = idb.inspect('tag-tests','workspaceSourceBytes');
  const next = await repo.updateSourceTags(record.id, source.id, [' August ', 'Nord'], { expectedRevision: created.storageRevision });
  const loaded = await repo.loadWorkspace(record.id);
  assert.deepEqual(loaded.files[0].tags, ['August','Nord']); assert.deepEqual(loaded.files[1].tags, []);
  assert.deepEqual(idb.inspect('tag-tests','workspaceRowChunks'), rows); assert.deepEqual(idb.inspect('tag-tests','workspaceSourceBytes'), bytes);
  assert.deepEqual(await repo.listSourceLinks(record.id), links);
  assert.deepEqual(loaded.warehouseLayout, record.warehouseLayout); assert.equal(next.storageRevision, created.storageRevision + 1);
  await assert.rejects(repo.updateSourceTags(record.id, source.id, ['Changed'], { expectedRevision: created.storageRevision }), { code: 'workspace_conflict' });
  idb.failNextWrite('QuotaExceededError');
  await assert.rejects(repo.updateSourceTags(record.id, source.id, ['Failed'], { expectedRevision: next.storageRevision }));
  assert.deepEqual((await repo.loadWorkspace(record.id)).files[0].tags, ['August','Nord']);
  const other = fixture(); other.id = 'other'; await repo.createWorkspace(other);
  assert.deepEqual((await repo.loadWorkspace(other.id)).files[0].tags, []);
});

test('tags survive worker preparation, trusted saves and portable backup restoration', async t => {
  const repo = storage.createRepository({ indexedDB: createFakeIndexedDB(), databaseName: 'tag-backup' }); t.after(() => repo.close());
  const record = fixture(); record.files[0].tags = ['<Nord>&','August']; await repo.createWorkspace(record);
  const runtime = preparation.prepareWorkspaceRecord(record, 'de', () => {});
  assert.deepEqual(runtime.files[0].tags, record.files[0].tags);
  assert.deepEqual(preparation.persistPreparedWorkspace(runtime).files[0].tags, record.files[0].tags);
  assert.deepEqual(model.captureWorkspaceTrusted(record, { ...record, files: runtime.files, analysis: runtime.analysis }).files[0].tags, record.files[0].tags);
  let blob; await archive.write(repo.readBackupRecords(record.id), archive.blobSink(async value => { blob = value; }));
  const session = await repo.beginBackupStage(), summary = await archive.read(blob, event => repo.stageBackupRecord(session, event));
  await repo.finishBackupStage(session, summary); const restored = await repo.commitBackupStage(session, { mode: 'new' });
  assert.deepEqual((await repo.loadWorkspace(restored.id)).files[0].tags, record.files[0].tags);
});

test('tag edits become visible only after a committed metadata save and retain analysis', async () => {
  for (const mode of ['success','failure','post-commit']) {
    const file = { id: 'source', tags: ['Old'] }, analysis = {}, result = {}, state = { activeWorkspace: { id: 'workspace' }, storageReady: true, workspaceLoading: false, files: [file], analysis, result };
    let saves = 0;
    const context = vm.createContext({ state, workspaceModel: model, renderWorkspaceControls() {},
      persistActiveWorkspace: async (key, options) => {
        saves++; assert.deepEqual(file.tags, ['Old']); assert.equal(state.workspaceLoadCancellable, false);
        assert.equal(options.sourceTags.id, file.id); assert.equal(options.runtimeState, undefined);
        if (mode === 'failure') throw Error('quota'); options.onCommitted(); if (mode === 'post-commit') throw Error('catalog');
      } });
    vm.runInContext(appFunction('saveImportTags'), context);
    if (mode === 'failure') await assert.rejects(context.saveImportTags(file.id, ['New'])); else await context.saveImportTags(file.id, ['New']);
    assert.equal(saves,1); assert.deepEqual(file.tags, mode === 'failure' ? ['Old'] : ['New']);
    assert.equal(state.analysis, analysis); assert.equal(state.result, result); assert.equal(state.workspaceLoading, false);
    state.workspaceLoading = true; await assert.rejects(context.saveImportTags(file.id, ['Blocked'])); assert.equal(saves,1);
  }
});
