'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const model = require('../workspace.js'), storage = require('../storage.js'), preparation = require('../src/application/workspace-preparation.js');
const archive = require('../src/application/workspace-archive.js');
const { fixture } = require('./helpers/workspace-archive-fixture.cjs'), { createFakeIndexedDB } = require('./fake-indexeddb.cjs');
function record() {
  const value = fixture(); value.files[0].linkedSource = { name: 'synthetic.csv', updatedAt: '2026-10-23T10:00:00.000Z' };
  return model.validateWorkspace(value);
}
function repository() { return storage.createRepository({ indexedDB: createFakeIndexedDB(), databaseName: 'linked-tests' }); }
const token = { kind: 'file', name: 'synthetic.csv', syntheticCapability: 'LOCAL-ONLY-CAPABILITY' };
test('links and source data commit together and remain scoped to their workspace', async () => {
  const repo = repository(), first = record();
  const created = await repo.createWorkspace(first, { sourceLinks: [{ sourceId: first.files[0].id, handle: token }] });
  assert.equal((await repo.listSourceLinks(first.id))[0].sourceId, first.files[0].id);
  assert.deepEqual((await repo.listSourceLinks(first.id))[0].handle, token);
  assert.deepEqual(await repo.listSourceLinks('other'), []);
  const loaded = await repo.loadWorkspace(first.id);
  assert.deepEqual(loaded.files[0].linkedSource, first.files[0].linkedSource);
  assert.equal(model.stringifyBackup(loaded).includes('LOCAL-ONLY-CAPABILITY'), false);
  assert.equal(created.storageRevision, 1);
});
test('invalid capabilities abort late writes without replacing the old source data or revision', async () => {
  const repo = repository(), first = record(), created = await repo.createWorkspace(first, { sourceLinks: [{ sourceId: first.files[0].id, handle: token }] });
  const next = structuredClone(first); next.files[0].linkedSource.updatedAt = '2026-10-24T10:00:00.000Z';
  await assert.rejects(repo.updateWorkspace(next, { expectedRevision: created.storageRevision,
    sourceLinks: [{ sourceId: first.files[0].id, handle: { kind: 'directory' } }] }), { code: 'invalid_linked_source' });
  assert.deepEqual(await repo.loadWorkspace(first.id), first);
  assert.deepEqual((await repo.listSourceLinks(first.id))[0].handle, token);
  assert.equal((await repo.listWorkspaces())[0].storageRevision, 1);
});
test('unlinking and removing a source delete its capability while preserving other workspace data', async () => {
  for (const remove of [false, true]) {
    const repo = repository(), first = record(), created = await repo.createWorkspace(first, { sourceLinks: [{ sourceId: first.files[0].id, handle: token }] });
    if (remove) { first.files = []; first.articleRegistry = []; first.analyzed = false; }
    else first.files[0].linkedSource = null;
    await repo.updateWorkspace(first, { expectedRevision: created.storageRevision });
    assert.deepEqual(await repo.listSourceLinks(first.id), []);
    assert.deepEqual((await repo.loadWorkspace(first.id)).warehouseLayout, first.warehouseLayout);
  }
});
test('backup and worker activation preserve link metadata without transferring file capabilities', async () => {
  const repo = repository(), first = record(), created = await repo.createWorkspace(first, { sourceLinks: [{ sourceId: first.files[0].id, handle: token }] });
  const runtime = preparation.prepareWorkspaceRecord(first, 'de', () => {});
  assert.deepEqual(runtime.files[0].linkedSource, first.files[0].linkedSource);
  assert.deepEqual(preparation.persistPreparedWorkspace(runtime).files[0].linkedSource, first.files[0].linkedSource);
  const captured = model.captureWorkspaceTrusted(first, { ...first, analysis: runtime.analysis, files: runtime.files });
  assert.deepEqual(captured.files[0].linkedSource, first.files[0].linkedSource);
  let blob; await archive.write(repo.readBackupRecords(first.id), archive.blobSink(async value => { blob = value; }));
  assert.equal((await blob.text()).includes('LOCAL-ONLY-CAPABILITY'), false);
  const session = await repo.beginBackupStage();
  const summary = await archive.read(blob, event => repo.stageBackupRecord(session, event)); await repo.finishBackupStage(session, summary);
  await repo.commitBackupStage(session, { mode: 'replace', targetId: first.id, expectedRevision: created.storageRevision });
  assert.deepEqual((await repo.loadWorkspace(first.id)).files[0].linkedSource, first.files[0].linkedSource);
  assert.deepEqual(await repo.listSourceLinks(first.id), []);
});
test('legacy restore and workspace deletion discard capabilities', async () => {
  const repo = repository(), first = record(), created = await repo.createWorkspace(first, { sourceLinks: [{ sourceId: first.files[0].id, handle: token }] });
  await repo.replaceWorkspace(first, { expectedRevision: created.storageRevision });
  assert.deepEqual(await repo.listSourceLinks(first.id), []);
  const revision = (await repo.listWorkspaces())[0].storageRevision;
  await repo.updateWorkspace(first, { expectedRevision: revision, sourceLinks: [{ sourceId: first.files[0].id, handle: token }] });
  await repo.deleteWorkspace(first.id, { expectedRevision: revision + 1 });
  assert.deepEqual(await repo.listSourceLinks(first.id), []);
});
