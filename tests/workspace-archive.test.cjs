'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const model = require('../workspace.js'), storage = require('../storage.js');
const archive = require('../src/application/workspace-archive.js');
const { fixture } = require('./helpers/workspace-archive-fixture.cjs');
const { createFakeIndexedDB } = require('./fake-indexeddb.cjs');
function repo(indexedDB = createFakeIndexedDB()) { return storage.createRepository({ indexedDB, databaseName: 'archive-tests' }); }
async function blobFor(records, options) {
  let blob;
  await archive.write(records, archive.blobSink(async value => { blob = value; }), options);
  return blob;
}
async function stageBlob(repository, blob, options) {
  const session = await repository.beginBackupStage();
  try {
    const summary = await archive.read(blob, record => repository.stageBackupRecord(session, record), options);
    await repository.finishBackupStage(session, summary);
    return session;
  } catch (error) { await repository.discardBackupStage(session); throw error; }
}
test('archive restores the complete workspace, original bytes and all preferences without altering another workspace', async () => {
  const original = fixture(), repository = repo();
  await repository.createWorkspace(original);
  const blob = await blobFor(repository.readBackupRecords(original.id));
  assert.equal(await archive.isArchive(blob), true);
  assert.equal(await archive.isArchive(new Blob([model.stringifyBackup(original)])), false);
  const session = await stageBlob(repository, blob);
  assert.equal((await repository.listWorkspaces()).length, 1, 'stage stays invisible');
  const committed = await repository.commitBackupStage(session, { mode: 'new', targetId: 'workspace-restored' });
  assert.deepEqual(await repository.loadWorkspace(committed.id), { ...original, id: committed.id, updatedAt: committed.updatedAt });
  assert.deepEqual(await repository.loadWorkspace(original.id), original);
  assert.equal(await repository.getActiveWorkspaceId(), null);
});
test('archive preserves fragmented registry provenance and unreadable source metadata', async () => {
  const original = fixture(), repository = repo();
  original.articleRegistry[0].master_row_refs = Array.from({ length: 200 }, (_, i) => ({ source_file_id: 'source-orders', source_line: i + 2 }));
  original.files.push({ ...original.files[0], id: 'source-unreadable', name: 'unreadable.csv', buffer: null, errorKey: 'file_read_failed', result: null, columnCatalog: [] });
  await repository.createWorkspace(original);
  const session = await stageBlob(repository, await blobFor(repository.readBackupRecords(original.id)));
  const saved = await repository.commitBackupStage(session, { mode: 'new' }), loaded = await repository.loadWorkspace(saved.id);
  assert.deepEqual(loaded.articleRegistry, original.articleRegistry);
  assert.equal(loaded.files[2].buffer, null);
  assert.equal(loaded.files[2].errorKey, 'file_read_failed');
});
test('checksums, truncated archives and appended bytes reject restore and preserve the existing workspace', async () => {
  const repository = repo(), original = fixture();
  await repository.createWorkspace(original);
  const blob = await blobFor(repository.readBackupRecords(original.id));
  const bytes = new Uint8Array(await blob.arrayBuffer()); bytes[bytes.length - 20] ^= 1;
  const sourceDamage = new Uint8Array(await blob.arrayBuffer()), frames = [];
  let offset = archive.MAGIC.length;
  while (offset < sourceDamage.length) {
    const newline = sourceDamage.indexOf(10, offset);
    const header = JSON.parse(new TextDecoder().decode(sourceDamage.subarray(offset, newline)));
    frames.push(blob.slice(offset, newline + 1 + header.length));
    if (header.kind === 'bytes') sourceDamage[newline + 1] ^= 1;
    offset = newline + 1 + header.length;
  }
  const reordered = new Blob([archive.MAGIC, frames[1], frames[0], ...frames.slice(2)]);
  for (const damaged of [new Blob([bytes]), new Blob([sourceDamage]), reordered, blob.slice(0, blob.size - 100), new Blob([blob, 'extra'])]) {
    await assert.rejects(stageBlob(repository, damaged), error => error.code.startsWith('invalid_backup'));
    assert.deepEqual(await repository.loadWorkspace(original.id), original);
    assert.equal((await repository.listWorkspaces()).length, 1);
  }
});
test('source and workspace inventories reject lost rows, missing bytes and invalid provenance', async () => {
  for (const change of [
    records => { records.find(record => record.kind === 'rows').data.pop(); },
    records => { records.find(record => record.kind === 'bytes').data = new Uint8Array([1]); },
    records => { records.find(record => record.kind === 'rows').data[0].source_file_id = 'source-other'; },
    records => { records.find(record => record.kind === 'workspace').data.sourceCount++; }
  ]) {
    const records = [];
    for await (const record of storage.backupRecordsFromWorkspace(fixture())) records.push(record);
    change(records);
    await assert.rejects(blobFor(records), error => /invalid/.test(error.code));
  }
});
test('export rejects missing stored blocks and concurrent changes', async () => {
  const indexedDB = createFakeIndexedDB(), repository = repo(indexedDB), original = fixture();
  const saved = await repository.createWorkspace(original);
  const chunk = indexedDB.inspect('archive-tests', 'workspaceRowChunks')[0];
  indexedDB.seedRecord('archive-tests', 'workspaceRowChunks', { ...chunk, rows: [] });
  await assert.rejects(blobFor(repository.readBackupRecords(original.id)), { code: 'invalid_backup' });
  await repository.replaceWorkspace(original, { expectedRevision: saved.storageRevision });
  const records = repository.readBackupRecords(original.id);
  await records.next();
  await repository.renameWorkspace(original.id, 'Newer', { expectedRevision: 2 });
  await assert.rejects(records.next(), { code: 'workspace_conflict' });
});
test('cancel, quota failure and stale revisions cannot partially replace a workspace', async () => {
  const indexedDB = createFakeIndexedDB(), repository = repo(indexedDB), original = fixture();
  const saved = await repository.createWorkspace(original), blob = await blobFor(repository.readBackupRecords(original.id));
  let calls = 0;
  await assert.rejects(stageBlob(repository, blob, { isCurrent: () => ++calls < 4 }), { code: 'workspace_load_cancelled' });
  const session = await stageBlob(repository, blob);
  await assert.rejects(repository.commitBackupStage(session, { mode: 'replace', targetId: original.id, expectedRevision: 0 }), { code: 'workspace_conflict' });
  assert.deepEqual(await repository.loadWorkspace(original.id), original);
  indexedDB.failNextWrite('QuotaExceededError');
  await assert.rejects(repository.commitBackupStage(session, { mode: 'replace', targetId: original.id, expectedRevision: saved.storageRevision }), { code: 'quota_exceeded' });
  assert.deepEqual(await repository.loadWorkspace(original.id), original);
  const replaced = await repository.commitBackupStage(session, { mode: 'replace', targetId: original.id, expectedRevision: saved.storageRevision });
  assert.equal(replaced.storageRevision, 2);
  assert.equal((await repository.listWorkspaces()).length, 1);
  assert.equal(indexedDB.inspect('archive-tests', 'workspaceBackupStaging').length, 0);
});
test('export cancellation aborts the destination without closing a successful file', async () => {
  let aborted = false, closed = false, calls = 0;
  await assert.rejects(archive.write(storage.backupRecordsFromWorkspace(fixture()), {
    write: async () => {}, close: async () => { closed = true; }, abort: async () => { aborted = true; }
  }, { isCurrent: () => ++calls < 5 }), { code: 'workspace_load_cancelled' });
  assert.equal(aborted, true); assert.equal(closed, false);
});

test('a cancelled read cannot report stale progress after an asynchronous staging callback', async () => {
  const blob = await blobFor(storage.backupRecordsFromWorkspace(fixture()));
  let current = true, progress = 0;
  await assert.rejects(archive.read(blob, async () => { current = false; }, {
    isCurrent: () => current, onProgress: () => { progress++; }
  }), { code: 'workspace_load_cancelled' });
  assert.equal(progress, 0);
});
test('legacy JSON backup decoding remains available and exact', () => {
  const original = fixture();
  assert.deepEqual(model.parseBackup(model.stringifyBackup(original)), original);
});

test('missing native compression APIs use identity frames; compressed restore fails clearly without a decoder', async () => {
  const original = fixture();
  const compressed = await blobFor(storage.backupRecordsFromWorkspace(original));
  const compression = globalThis.CompressionStream, decompression = globalThis.DecompressionStream;
  try {
    globalThis.CompressionStream = undefined;
    globalThis.DecompressionStream = undefined;
    const identity = await blobFor(storage.backupRecordsFromWorkspace(original));
    assert.ok(identity.size > compressed.size);
    const summary = await archive.read(identity, async () => {});
    assert.equal(summary.totals.sources, original.files.length);
    await assert.rejects(archive.read(compressed, async () => {}), { code: 'backup_compression_unavailable' });
  } finally {
    globalThis.CompressionStream = compression;
    globalThis.DecompressionStream = decompression;
  }
});


test('compressed and identity archives restore identically and unsupported archive versions fail early', async () => {
  const original = fixture(), repository = repo();
  await repository.createWorkspace(original);
  const compressed = await blobFor(repository.readBackupRecords(original.id));
  const identity = await blobFor(repository.readBackupRecords(original.id), { compression: false });
  assert.ok(compressed.size < identity.size);
  for (const blob of [compressed, identity]) {
    const session = await stageBlob(repository, blob);
    const committed = await repository.commitBackupStage(session, { mode: 'new' });
    assert.deepEqual(await repository.loadWorkspace(committed.id), { ...original, id: committed.id, updatedAt: committed.updatedAt });
  }
  await assert.rejects(archive.isArchive(new Blob(['OpenSlotting Workspace Archive 3\n'])), { code: 'unsupported_backup_version' });
});
test('older chunked schemas migrate for archive export without editing the stored workspace', async () => {
  const repository = repo(), original = fixture(), old = { ...original, schemaVersion: 20 };
  delete old.tablePreferences; delete old.walkPreferences;
  await repository.createWorkspace(old, { validated: true });
  const blob = await blobFor(repository.readBackupRecords(old.id));
  const summary = await archive.read(blob, async () => {});
  assert.equal(summary.metadata.schemaVersion, model.WORKSPACE_SCHEMA_VERSION);
  assert.equal((await repository.listWorkspaces())[0].schemaVersion, 20);
});
test('an unverified stage cannot be committed and a staging write failure cleans up without changing targets', async () => {
  const indexedDB = createFakeIndexedDB(), repository = repo(indexedDB), original = fixture();
  await repository.createWorkspace(original);
  const session = await repository.beginBackupStage();
  await assert.rejects(repository.commitBackupStage(session, { mode: 'new' }), { code: 'invalid_backup' });
  await repository.discardBackupStage(session);
  const blob = await blobFor(repository.readBackupRecords(original.id));
  let reads = 0;
  const failedStage = await repository.beginBackupStage();
  try {
    await assert.rejects(archive.read(blob, async record => {
      if (++reads === 2) indexedDB.failNextWrite('QuotaExceededError');
      await repository.stageBackupRecord(failedStage, record);
    }), { code: 'quota_exceeded' });
  } finally { await repository.discardBackupStage(failedStage); }
  assert.deepEqual(await repository.loadWorkspace(original.id), original);
  assert.equal(indexedDB.inspect('archive-tests', 'workspaceBackupStaging').length, 0);
});
