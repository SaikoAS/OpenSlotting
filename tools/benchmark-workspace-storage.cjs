'use strict';

const v8 = require('node:v8');
const csv = require('../csv.js');
const workspace = require('../workspace.js');
const storage = require('../storage.js');
const { createFakeIndexedDB } = require('../tests/fake-indexeddb.cjs');

const rowCount = Number(process.argv[2] || 50000);
if (!Number.isInteger(rowCount) || rowCount < 1) {
  throw new Error('Usage: node tools/benchmark-workspace-storage.cjs [positive row count]');
}

function megabytes(value) {
  return Math.round(value / 1024 / 1024 * 10) / 10;
}

function memory() {
  const usage = process.memoryUsage();
  return { rssMb: megabytes(usage.rss), heapUsedMb: megabytes(usage.heapUsed) };
}

function serializedBytes(value) {
  return v8.serialize(value).byteLength;
}

function serializedEqual(left, right) {
  return v8.serialize(left).equals(v8.serialize(right));
}

function elapsed(start) {
  return Math.round(Number(process.hrtime.bigint() - start) / 1000000 * 10) / 10;
}

const lines = new Array(rowCount + 1);
lines[0] = 'order_id;article_id;quantity;order_date';
for (let index = 0; index < rowCount; index += 1) {
  lines[index + 1] = 'O-' + index + ';SKU-' + (index % 1000) + ';1;2026-09-12';
}
const text = lines.join('\n') + '\n';
const bytes = new TextEncoder().encode(text);
const imported = csv.importCsv(text, {
  order_id: 0,
  article_id: 1,
  quantity: 2,
  order_date: 3
}, {
  sourceFile: { id: 'source-1', name: 'benchmark.csv', label: 'benchmark.csv' }
});
const record = workspace.createWorkspace('Storage benchmark', {
  id: 'workspace-benchmark',
  now: '2026-09-12T08:00:00.000Z'
});
record.analyzed = true;
record.files.push({
  id: 'source-1',
  name: 'benchmark.csv',
  label: 'benchmark.csv',
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
const validated = workspace.validateWorkspace(record);
const databaseName = 'storage-benchmark';
const indexedDB = createFakeIndexedDB();
const repository = storage.createRepository({ indexedDB, databaseName });

(async function () {
  const saveStart = process.hrtime.bigint();
  const saved = await repository.createWorkspace(validated);
  const saveMs = elapsed(saveStart);
  const stores = ['workspaceManifests', 'workspaceSources', 'workspaceSourceBytes', 'workspaceRowChunks', 'workspaceIssueChunks'];
  const before = Object.fromEntries(stores.map(function (name) {
    return [name, indexedDB.inspect(databaseName, name)];
  }));
  const metadataStart = process.hrtime.bigint();
  await repository.updateWorkspaceSummary(validated.id, {
    analyzed: true,
    language: 'de',
    periodSettings: validated.periodSettings,
    sourceCount: validated.files.length,
    sourceBytes: bytes.byteLength,
    normalizedRowCount: rowCount
  }, { expectedRevision: saved.storageRevision });
  const metadataMs = elapsed(metadataStart);
  const after = Object.fromEntries(stores.map(function (name) {
    return [name, indexedDB.inspect(databaseName, name)];
  }));
  const loadStart = process.hrtime.bigint();
  const loaded = await repository.loadWorkspace(validated.id);
  const loadMs = elapsed(loadStart);
  const chunkBytes = stores.reduce(function (sum, name) {
    return sum + after[name].reduce(function (bytesTotal, value) { return bytesTotal + serializedBytes(value); }, 0);
  }, 0);
  const monolithicBytes = serializedBytes({ workspaceId: validated.id, files: validated.files });
  const payloadUnchanged = stores.every(function (name) {
    return serializedEqual(before[name], after[name]);
  });
  console.log(JSON.stringify({
    rows: rowCount,
    rowChunkSize: 5000,
    rowChunks: after.workspaceRowChunks.length,
    issueChunks: after.workspaceIssueChunks.length,
    monolithicPayloadBytes: monolithicBytes,
    chunkedPayloadBytes: chunkBytes,
    largestChunkBytes: Math.max.apply(null, after.workspaceRowChunks.concat(after.workspaceIssueChunks).map(serializedBytes)),
    metadataOnlyPayloadUnchanged: payloadUnchanged,
    restoredRows: loaded.files[0].result.rows.length,
    timingsMs: { save: saveMs, metadataOnlyUpdate: metadataMs, load: loadMs },
    memory: memory()
  }, null, 2));
}()).catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
