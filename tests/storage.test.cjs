'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const workspace = require('../workspace.js');
const storage = require('../storage.js');
const csv = require('../csv.js');
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

function workspaceWithRows(id, rowCount) {
  const lines = ['order_id;article_id;quantity;order_date'];
  for (let index = 0; index < rowCount; index += 1) {
    lines.push('O-' + index + ';SKU-' + index + ';1;2026-09-12');
  }
  const text = lines.join('\n') + '\n';
  const bytes = new TextEncoder().encode(text);
  const imported = csv.importCsv(text, { order_id: 0, article_id: 1, quantity: 2, order_date: 3 }, {
    sourceFile: { id: 'source-1', name: 'rows.csv', label: 'rows.csv' }
  });
  const record = workspace.createWorkspace('Chunked', { id, now: '2026-09-12T08:00:00.000Z' });
  record.analyzed = true;
  record.files.push({
    id: 'source-1',
    name: 'rows.csv',
    label: 'rows.csv',
    size: bytes.byteLength,
    lastModified: 1,
    buffer: bytes.buffer,
    encodingMode: 'auto',
    activeEncoding: 'utf-8',
    detectedEncoding: 'utf-8',
    errorKey: null,
    mapping: imported.mapping,
    confirmedMapping: imported.mapping,
    result: imported
  });
  return workspace.validateWorkspace(record);
}

test('persists isolated workspaces and the active selection across repository instances', async () => {
  const indexedDB = createFakeIndexedDB();
  const first = storage.createRepository({ indexedDB, databaseName: 'isolation-test' });
  const north = workspaceWithSource('workspace-north', 'North', 'SKU-N');
  const south = workspaceWithSource('workspace-south', 'South', 'SKU-S');
  north.periodSettings = {
    mode: 'custom',
    expectedWeekdays: [1, 2, 3, 4, 5],
    periodA: { name: 'Before', start: '2026-09-01', end: '2026-09-05' },
    periodB: { name: 'After', start: '2026-09-08', end: '2026-09-12' }
  };

  await first.createWorkspace(north);
  await first.createWorkspace(south);
  await first.setActiveWorkspace(north.id);
  first.close();

  const reopened = storage.createRepository({ indexedDB, databaseName: 'isolation-test' });
  assert.equal(await reopened.getActiveWorkspaceId(), north.id);
  const reopenedNorth = await reopened.loadWorkspace(north.id);
  assert.equal(reopenedNorth.files[0].name, 'SKU-N.csv');
  assert.deepEqual(reopenedNorth.periodSettings, north.periodSettings);
  assert.equal((await reopened.loadWorkspace(south.id)).files[0].name, 'SKU-S.csv');

  const listed = await reopened.listWorkspaces();
  assert.equal(listed.length, 2);
  assert.ok(listed.every((item) => item.sourceCount === 1));
  assert.ok(listed.every((item) => item.sourceBytes > 0));
  assert.ok(listed.every((item) => item.normalizedRowCount === 0));
  assert.equal(indexedDB.inspect('isolation-test', 'workspacePayloads').length, 0);
  assert.equal(indexedDB.inspect('isolation-test', 'workspaceManifests').length, 2);
});

test('persists large results as independently addressable row and issue chunks', async () => {
  const indexedDB = createFakeIndexedDB();
  const databaseName = 'chunked-results-test';
  const repository = storage.createRepository({ indexedDB, databaseName });
  const original = workspaceWithRows('workspace-chunked', 10001);
  await repository.createWorkspace(original);

  assert.equal(indexedDB.inspect(databaseName, 'workspacePayloads').length, 0);
  assert.equal(indexedDB.inspect(databaseName, 'workspaceSources').length, 1);
  assert.equal(indexedDB.inspect(databaseName, 'workspaceSourceBytes').length, 1);
  assert.equal(indexedDB.inspect(databaseName, 'workspaceRowChunks').length, 3);
  assert.equal(indexedDB.inspect(databaseName, 'workspaceIssueChunks').length, 0);

  const restored = await repository.loadWorkspace(original.id);
  assert.equal(restored.files[0].result.rows.length, 10001);
  assert.equal(restored.files[0].result.rows[10000].article_id, 'SKU-10000');
});

test('chunked storage round trip preserves the explicit source type', async () => {
  const indexedDB = createFakeIndexedDB();
  const databaseName = 'source-type-storage-test';
  const repository = storage.createRepository({ indexedDB, databaseName });
  const original = workspaceWithSource('workspace-source-type', 'Source type', 'SKU-MASTER');
  original.files[0].sourceType = 'article-master';
  const validated = workspace.validateWorkspace(original);

  await repository.createWorkspace(validated);

  const storedSource = indexedDB.inspect(databaseName, 'workspaceSources')[0];
  assert.equal(storedSource.sourceType, 'article-master');
  const restored = await repository.loadWorkspace(validated.id);
  assert.equal(restored.files[0].sourceType, 'article-master');
});

test('chunked storage round trip preserves the source column catalog', async () => {
  const indexedDB = createFakeIndexedDB();
  const databaseName = 'column-catalog-storage-test';
  const repository = storage.createRepository({ indexedDB, databaseName });
  const original = workspaceWithSource('workspace-column-catalog', 'Column catalog', 'SKU-CATALOG');
  original.files[0].columnCatalog = [
    { position: 0, header: 'order_id', normalizedHeader: 'orderid', occurrence: 1, isDuplicate: false, sourceFileId: 'source-1', sourceFileName: 'rows.csv', sourceFileLabel: 'rows.csv', profile: { totalRows: 2, nonEmptyCount: 2, emptyCount: 0, numericCompatibleCount: 0, dateCompatibleCount: 0, textCompatibleCount: 2, incompatibleCount: 2, distinctValueCount: 2, distinctValueCountExact: false, sampleValues: [{ value: 'O-1', truncated: false }], frequentValues: [{ value: 'O-1', truncated: false, count: 2, countIsEstimate: true }] } },
    { position: 1, header: 'article_id', normalizedHeader: 'articleid', occurrence: 1, isDuplicate: false, sourceFileId: 'source-1', sourceFileName: 'rows.csv', sourceFileLabel: 'rows.csv' }
  ];
  const validated = workspace.validateWorkspace(original);

  await repository.createWorkspace(validated);

  const storedSource = indexedDB.inspect(databaseName, 'workspaceSources')[0];
  assert.equal(storedSource.columnCatalog.length, 2);
  const restored = await repository.loadWorkspace(validated.id);
  assert.equal(restored.files[0].columnCatalog[1].header, 'article_id');
  assert.equal(restored.files[0].columnCatalog[0].profile.totalRows, 2);
  assert.equal(restored.files[0].columnCatalog[0].profile.frequentValues[0].countIsEstimate, true);
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
  const payloadBefore = indexedDB.inspect(databaseName, 'workspaceManifests')[0];

  const renamed = await repository.renameWorkspace(record.id, 'After', {
    expectedRevision: saved.storageRevision,
    now: '2026-09-12T09:00:00.000Z'
  });
  await repository.updateWorkspaceSummary(record.id, {
    analyzed: true,
    language: 'de',
    sourceCount: 1,
    sourceBytes: 1234,
    normalizedRowCount: 5678
  }, {
    expectedRevision: renamed.storageRevision,
    now: '2026-09-12T10:00:00.000Z'
  });
  const payloadAfter = indexedDB.inspect(databaseName, 'workspaceManifests')[0];
  const listed = (await repository.listWorkspaces())[0];

  assert.equal(renamed.name, 'After');
  assert.deepEqual(payloadAfter, payloadBefore);
  assert.equal(listed.name, 'After');
  assert.equal(listed.updatedAt, '2026-09-12T10:00:00.000Z');
  assert.equal(listed.language, 'de');
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

  const persistedWorkspace = workspaceWithSource(second.id, 'Second compact', 'SKU-COMPACT');
  persistedWorkspace.files[0].label = 'compact-source.csv';

  await repository.commitWorkspaceActivation(second.id, {
    analyzed: true,
    sourceCount: 1,
    sourceBytes: 222,
    normalizedRowCount: 10
  }, {
    expectedRevision: 1,
    persistedWorkspace
  });

  assert.equal(await repository.getActiveWorkspaceId(), second.id);
  const listedSecond = (await repository.listWorkspaces()).find((item) => item.id === second.id);
  assert.equal(listedSecond.normalizedRowCount, 10);
  assert.equal(listedSecond.schemaVersion, workspace.WORKSPACE_SCHEMA_VERSION);
  assert.equal((await repository.loadWorkspace(second.id)).files[0].label, 'compact-source.csv');

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

  await repository.deleteWorkspace(original.id, { expectedRevision: renamed.storageRevision });
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
  const savedFirst = await repository.createWorkspace(first);
  await repository.createWorkspace(second);
  await repository.setActiveWorkspace(first.id);

  await repository.deleteWorkspace(first.id, { expectedRevision: savedFirst.storageRevision });

  assert.equal(await repository.loadWorkspace(first.id), null);
  assert.equal(await repository.getActiveWorkspaceId(), null);
  assert.equal((await repository.loadWorkspace(second.id)).name, 'Second');
});

test('deleting a workspace rejects stale revisions and preserves the newer record', async () => {
  const indexedDB = createFakeIndexedDB();
  const repository = storage.createRepository({ indexedDB, databaseName: 'stale-delete-test' });
  const original = workspaceWithSource('workspace-1', 'Original', 'SKU-1');
  const created = await repository.createWorkspace(original);
  const renamed = await repository.renameWorkspace(original.id, 'Renamed elsewhere', {
    expectedRevision: created.storageRevision,
    now: '2026-09-12T10:00:00.000Z'
  });

  await assert.rejects(
    repository.deleteWorkspace(original.id, { expectedRevision: created.storageRevision }),
    (error) => error.code === 'workspace_conflict'
  );
  assert.equal((await repository.loadWorkspace(original.id)).name, 'Renamed elsewhere');

  await repository.deleteWorkspace(original.id, { expectedRevision: renamed.storageRevision });
  assert.equal(await repository.loadWorkspace(original.id), null);
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

test('loading persisted schema zero records leaves raw migration for the caller', async () => {
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

test('activation load can omit stored result chunks while retaining source bytes', async () => {
  const indexedDB = createFakeIndexedDB();
  const databaseName = 'source-only-load-test';
  const repository = storage.createRepository({ indexedDB, databaseName });
  await repository.createWorkspace(workspaceWithRows('workspace-source-only', 10001));

  const sourceOnly = await repository.loadWorkspaceRaw('workspace-source-only', { includeResults: false });
  assert.equal(sourceOnly.files[0].result, null);
  assert.ok(sourceOnly.files[0].buffer instanceof ArrayBuffer);
  const full = await repository.loadWorkspaceRaw('workspace-source-only');
  assert.equal(full.files[0].result.rows.length, 10001);
});

test('failed chunked updates leave the previous workspace version intact', async () => {
  const indexedDB = createFakeIndexedDB();
  const databaseName = 'chunked-failure-test';
  const repository = storage.createRepository({ indexedDB, databaseName });
  const original = workspaceWithRows('workspace-failure', 10001);
  await repository.createWorkspace(original);
  const before = indexedDB.inspect(databaseName, 'workspaceRowChunks');

  indexedDB.failNextWrite('QuotaExceededError');
  await assert.rejects(
    repository.updateWorkspace(original, { expectedRevision: 1 }),
    (error) => error.code === 'quota_exceeded'
  );

  assert.deepEqual(indexedDB.inspect(databaseName, 'workspaceRowChunks'), before);
  assert.equal((await repository.loadWorkspace(original.id)).files[0].result.rows.length, 10001);
});

test('workspace activation persists migrated schema-zero language metadata', async () => {
  const indexedDB = createFakeIndexedDB();
  const databaseName = 'migration-activation-language-test';
  const initializer = storage.createRepository({ indexedDB, databaseName });
  await initializer.open();
  initializer.close();

  const legacy = workspaceWithSource('workspace-language-legacy', 'Legacy language', 'SKU-LANGUAGE');
  indexedDB.seedRecord(databaseName, 'workspaces', {
    id: legacy.id,
    name: legacy.name,
    schemaVersion: 0,
    createdAt: legacy.createdAt,
    updatedAt: legacy.updatedAt,
    analyzed: false,
    periodSettings: legacy.periodSettings,
    sourceCount: legacy.files.length,
    sourceBytes: legacy.files[0].size,
    normalizedRowCount: 0,
    storageRevision: 0
  });
  indexedDB.seedRecord(databaseName, 'workspacePayloads', {
    workspaceId: legacy.id,
    files: legacy.files
  });

  const migrated = workspace.createWorkspace(legacy.name, {
    id: legacy.id,
    language: 'en',
    now: legacy.createdAt,
    periodSettings: legacy.periodSettings
  });
  migrated.files = legacy.files;
  const repository = storage.createRepository({ indexedDB, databaseName });
  await repository.commitWorkspaceActivation(legacy.id, {
    analyzed: false,
    periodSettings: migrated.periodSettings,
    sourceCount: migrated.files.length,
    sourceBytes: migrated.files[0].size,
    normalizedRowCount: 0
  }, {
    expectedRevision: 0,
    persistedWorkspace: migrated
  });

  const listed = (await repository.listWorkspaces())[0];
  assert.equal(listed.schemaVersion, workspace.WORKSPACE_SCHEMA_VERSION);
  assert.equal(listed.language, 'en');
  assert.equal((await repository.loadWorkspace(legacy.id)).language, 'en');
});
