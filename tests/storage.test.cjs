'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const workspace = require('../workspace.js');
const storage = require('../storage.js');
const { createFakeIndexedDB } = require('./fake-indexeddb.cjs');

function workspaceWithSource(id, name, articleId) {
  const record = workspace.createWorkspace(name, {
    id,
    now: '2026-09-12T08:00:00.000Z'
  });
  const bytes = new TextEncoder().encode('order_id;article_id;quantity;order_date\nO-1;' + articleId + ';1;2026-09-12\n');
  record.files.push({
    id: 'source-1',
    name: articleId + '.csv',
    label: articleId + '.csv',
    size: bytes.byteLength,
    lastModified: 1,
    buffer: bytes.buffer,
    encodingMode: 'auto',
    activeEncoding: 'utf-8',
    detectedEncoding: 'utf-8',
    errorKey: null,
    mapping: { order_id: 0, article_id: 1, quantity: 2, order_date: 3 },
    confirmedMapping: null,
    result: null
  });
  return workspace.validateWorkspace(record);
}

test('persists isolated workspaces and the active selection across repository instances', async () => {
  const indexedDB = createFakeIndexedDB();
  const first = storage.createRepository({ indexedDB, databaseName: 'isolation-test' });
  const north = workspaceWithSource('workspace-north', 'North', 'SKU-N');
  const south = workspaceWithSource('workspace-south', 'South', 'SKU-S');

  await first.createWorkspace(north);
  await first.createWorkspace(south);
  await first.setActiveWorkspace(north.id);
  first.close();

  const reopened = storage.createRepository({ indexedDB, databaseName: 'isolation-test' });
  assert.equal(await reopened.getActiveWorkspaceId(), north.id);
  assert.equal((await reopened.loadWorkspace(north.id)).files[0].name, 'SKU-N.csv');
  assert.equal((await reopened.loadWorkspace(south.id)).files[0].name, 'SKU-S.csv');

  const listed = await reopened.listWorkspaces();
  assert.equal(listed.length, 2);
  assert.ok(listed.every((item) => item.sourceCount === 1));
  assert.ok(listed.every((item) => item.sourceBytes > 0));
  assert.ok(listed.every((item) => item.normalizedRowCount === 0));
});

test('renaming and replacing one workspace does not alter another workspace', async () => {
  const indexedDB = createFakeIndexedDB();
  const repository = storage.createRepository({ indexedDB, databaseName: 'replace-test' });
  const first = workspaceWithSource('workspace-1', 'First', 'SKU-1');
  const second = workspaceWithSource('workspace-2', 'Second', 'SKU-2');
  const savedFirst = await repository.createWorkspace(first);
  await repository.createWorkspace(second);

  const renamed = await repository.renameWorkspace(first.id, 'Renamed', {
    expectedRevision: savedFirst.storageRevision,
    now: '2026-09-12T09:00:00.000Z'
  });
  const backupContent = workspaceWithSource('workspace-backup', 'Backup', 'SKU-NEW');
  const replacement = workspace.prepareRestore(backupContent, {
    mode: 'replace',
    targetId: first.id,
    now: '2026-09-12T10:00:00.000Z'
  });
  await repository.replaceWorkspace(replacement, { expectedRevision: renamed.storageRevision });

  assert.equal((await repository.loadWorkspace(first.id)).files[0].name, 'SKU-NEW.csv');
  assert.equal((await repository.loadWorkspace(second.id)).files[0].name, 'SKU-2.csv');
});

test('renaming metadata does not load or rewrite the large workspace payload', async () => {
  const indexedDB = createFakeIndexedDB();
  const databaseName = 'metadata-rename-test';
  const repository = storage.createRepository({ indexedDB, databaseName });
  const record = workspaceWithSource('workspace-1', 'Before', 'SKU-1');
  const saved = await repository.createWorkspace(record);
  const payloadBefore = indexedDB.inspect(databaseName, 'workspacePayloads')[0];

  const renamed = await repository.renameWorkspace(record.id, 'After', {
    expectedRevision: saved.storageRevision,
    now: '2026-09-12T09:00:00.000Z'
  });
  await repository.updateWorkspaceSummary(record.id, {
    analyzed: true,
    sourceCount: 1,
    sourceBytes: 1234,
    normalizedRowCount: 5678
  }, {
    expectedRevision: renamed.storageRevision
  });
  const payloadAfter = indexedDB.inspect(databaseName, 'workspacePayloads')[0];
  const listed = (await repository.listWorkspaces())[0];

  assert.equal(renamed.name, 'After');
  assert.deepEqual(payloadAfter, payloadBefore);
  assert.equal(listed.name, 'After');
  assert.equal(listed.sourceBytes, 1234);
  assert.equal(listed.normalizedRowCount, 5678);
});

test('workspace activation commits its summary and active marker atomically', async () => {
  const indexedDB = createFakeIndexedDB();
  const databaseName = 'atomic-activation-test';
  const repository = storage.createRepository({ indexedDB, databaseName });
  const first = workspaceWithSource('workspace-1', 'First', 'SKU-1');
  const second = workspaceWithSource('workspace-2', 'Second', 'SKU-2');
  await repository.createWorkspace(first);
  await repository.createWorkspace(second);
  await repository.setActiveWorkspace(first.id);

  await repository.commitWorkspaceActivation(second.id, {
    analyzed: true,
    sourceCount: 1,
    sourceBytes: 222,
    normalizedRowCount: 10
  }, {
    expectedRevision: 1
  });

  assert.equal(await repository.getActiveWorkspaceId(), second.id);
  assert.equal((await repository.listWorkspaces()).find((item) => item.id === second.id).normalizedRowCount, 10);

  await assert.rejects(
    repository.commitWorkspaceActivation(second.id, {
      analyzed: false,
      sourceCount: 0,
      sourceBytes: 0,
      normalizedRowCount: 0
    }, {
      expectedRevision: 1
    }),
    (error) => error.code === 'workspace_conflict'
  );

  indexedDB.failNextWrite('QuotaExceededError');
  await assert.rejects(
    repository.commitWorkspaceActivation(first.id, {
      analyzed: true,
      sourceCount: 1,
      sourceBytes: 999,
      normalizedRowCount: 99
    }, {
      expectedRevision: 1
    }),
    (error) => error.code === 'quota_exceeded'
  );

  assert.equal(await repository.getActiveWorkspaceId(), second.id);
  assert.notEqual((await repository.listWorkspaces()).find((item) => item.id === first.id).sourceBytes, 999);
});

test('stale updates cannot recreate deleted workspaces or overwrite newer metadata', async () => {
  const indexedDB = createFakeIndexedDB();
  const repository = storage.createRepository({ indexedDB, databaseName: 'stale-update-test' });
  const original = workspaceWithSource('workspace-1', 'Original', 'SKU-1');
  const created = await repository.createWorkspace(original);

  await assert.rejects(
    repository.createWorkspace(original),
    (error) => error.code === 'workspace_conflict'
  );

  const updated = await repository.updateWorkspace(original, {
    expectedRevision: created.storageRevision
  });
  const renamed = await repository.renameWorkspace(original.id, 'Renamed elsewhere', {
    expectedRevision: updated.storageRevision,
    now: '2026-09-12T10:00:00.000Z'
  });

  await assert.rejects(
    repository.updateWorkspace(original, {
      expectedRevision: updated.storageRevision
    }),
    (error) => error.code === 'workspace_conflict'
  );
  assert.equal((await repository.loadWorkspace(original.id)).name, 'Renamed elsewhere');

  await repository.deleteWorkspace(original.id);
  await assert.rejects(
    repository.updateWorkspace(original, {
      expectedRevision: renamed.storageRevision
    }),
    (error) => error.code === 'workspace_not_found'
  );
  assert.equal(await repository.loadWorkspace(original.id), null);
});

test('deleting the active workspace clears only its selection and data', async () => {
  const indexedDB = createFakeIndexedDB();
  const repository = storage.createRepository({ indexedDB, databaseName: 'delete-test' });
  const first = workspaceWithSource('workspace-1', 'First', 'SKU-1');
  const second = workspaceWithSource('workspace-2', 'Second', 'SKU-2');
  await repository.createWorkspace(first);
  await repository.createWorkspace(second);
  await repository.setActiveWorkspace(first.id);

  await repository.deleteWorkspace(first.id);

  assert.equal(await repository.loadWorkspace(first.id), null);
  assert.equal(await repository.getActiveWorkspaceId(), null);
  assert.equal((await repository.loadWorkspace(second.id)).name, 'Second');
});

test('quota failures are surfaced and an aborted write leaves no partial workspace', async () => {
  const indexedDB = createFakeIndexedDB();
  const repository = storage.createRepository({ indexedDB, databaseName: 'quota-test' });
  indexedDB.failNextWrite('QuotaExceededError');

  await assert.rejects(
    repository.createWorkspace(workspaceWithSource('workspace-1', 'First', 'SKU-1')),
    (error) => error.code === 'quota_exceeded'
  );
  assert.equal(await repository.loadWorkspace('workspace-1'), null);
});

test('storage estimates report values, unavailable APIs, and failures without inventing quota', async () => {
  const indexedDB = createFakeIndexedDB();
  const available = storage.createRepository({
    indexedDB,
    databaseName: 'estimate-available',
    storageManager: { estimate: async () => ({ usage: 250, quota: 1000 }) }
  });
  const unavailable = storage.createRepository({
    indexedDB,
    databaseName: 'estimate-unavailable',
    storageManager: null
  });
  const failed = storage.createRepository({
    indexedDB,
    databaseName: 'estimate-failed',
    storageManager: { estimate: async () => { throw new Error('blocked'); } }
  });

  assert.deepEqual(await available.estimateStorage(), {
    available: true,
    usage: 250,
    quota: 1000,
    remaining: 750
  });
  assert.deepEqual(await unavailable.estimateStorage(), { available: false, reason: 'unavailable' });
  assert.deepEqual(await failed.estimateStorage(), { available: false, reason: 'failed' });
});

test('loading persisted schema zero records applies the workspace migration', async () => {
  const indexedDB = createFakeIndexedDB();
  const databaseName = 'migration-test';
  const initializer = storage.createRepository({ indexedDB, databaseName });
  await initializer.open();
  initializer.close();

  const legacy = workspaceWithSource('workspace-legacy', 'Legacy', 'SKU-OLD');
  indexedDB.seedRecord(databaseName, 'workspaces', {
    id: legacy.id,
    name: legacy.name,
    schemaVersion: 0,
    createdAt: legacy.createdAt,
    updatedAt: legacy.updatedAt,
    sourceCount: legacy.files.length
  });
  indexedDB.seedRecord(databaseName, 'workspacePayloads', {
    workspaceId: legacy.id,
    files: legacy.files
  });

  const repository = storage.createRepository({ indexedDB, databaseName });
  const raw = await repository.loadWorkspaceRaw(legacy.id);
  assert.equal(raw.schemaVersion, 0);
  const loaded = await repository.loadWorkspace(legacy.id);
  assert.equal(loaded.schemaVersion, workspace.WORKSPACE_SCHEMA_VERSION);
  assert.equal(loaded.language, 'en');
  assert.equal(loaded.analyzed, false);
  assert.equal(loaded.files[0].name, 'SKU-OLD.csv');
});
