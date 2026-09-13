'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const repositoryRoot = path.join(__dirname, '..');

function read(fileName) {
  return fs.readFileSync(path.join(repositoryRoot, fileName), 'utf8');
}

function extractFunction(source, name, nextName) {
  const marker = '  function ' + name + '(';
  const regularNextMarker = '\n  function ' + nextName + '(';
  const asyncNextMarker = '\n  async function ' + nextName + '(';
  const start = source.indexOf(marker);
  const regularEnd = source.indexOf(regularNextMarker, start);
  const asyncEnd = source.indexOf(asyncNextMarker, start);
  const end = regularEnd === -1 ? asyncEnd : (asyncEnd === -1 ? regularEnd : Math.min(regularEnd, asyncEnd));
  assert.notEqual(start, -1, name);
  assert.notEqual(end, -1, nextName);
  return source.slice(start + 2, end);
}

test('offline worker preparation validates, parses, and analyzes a workspace', () => {
  const messages = [];
  const context = vm.createContext({
    ArrayBuffer,
    TextDecoder,
    TextEncoder,
    Uint8Array,
    console,
    self: {
      postMessage(message) {
        messages.push(message);
      }
    }
  });
  context.globalThis = context;
  vm.runInContext(read('encoding.js'), context);
  vm.runInContext(read('csv.js'), context);
  vm.runInContext(read('workspace.js'), context);

  const appSource = read('app.js');
  const workerFunctions = [
    extractFunction(appSource, 'decodeFileEntry', 'handleFileChange'),
    extractFunction(appSource, 'runtimeFileFromStored', 'prepareWorkspaceRecord'),
    extractFunction(appSource, 'prepareWorkspaceRecord', 'workspaceWorkerMain'),
    extractFunction(appSource, 'workspaceWorkerMain', 'workspaceLoadError')
  ].join('\n');
  const generatedWorkerSource = [
    "'use strict';",
    'const encoding = (' + context.OpenSlottingEncodingFactory.toString() + ')();',
    'const core = (' + context.OpenSlottingCsvFactory.toString() + ')();',
    'const workspaceModel = (' + context.OpenSlottingWorkspaceFactory.toString() + ')();',
    workerFunctions,
    '(' + extractFunction(appSource, 'workspaceWorkerMain', 'workspaceLoadError') + ')();'
  ].join('\n');
  assert.doesNotThrow(() => new vm.Script(generatedWorkerSource));
  vm.runInContext(generatedWorkerSource, context);

  const text = 'order_id;article_id;quantity;order_date\nO-1;SKU-WORKER;0.3;2026-09-12\n';
  vm.runInContext([
    'const workerText = ' + JSON.stringify(text) + ';',
    "const workerBytes = new TextEncoder().encode(workerText);",
    "const workerRecord = workspaceModel.createWorkspace('Worker', { id: 'workspace-worker', now: '2026-09-12T08:00:00.000Z' });",
    'workerRecord.analyzed = true;',
    'workerRecord.files.push({',
    "  id: 'source-worker', name: 'worker.csv', label: 'worker.csv',",
    '  size: workerBytes.byteLength, lastModified: 1, buffer: workerBytes.buffer,',
    "  encodingMode: 'auto', activeEncoding: 'utf-8', detectedEncoding: 'utf-8', errorKey: null,",
    '  mapping: { order_id: 0, article_id: 1, quantity: 2, order_date: 3 },',
    '  confirmedMapping: { order_id: 0, article_id: 1, quantity: 2, order_date: 3 },',
    '  result: null',
    '});',
    "self.onmessage({ data: { record: workerRecord, language: 'en' } });"
  ].join('\n'), context);

  const workerError = messages.find((message) => message.type === 'error');
  assert.equal(workerError, undefined, workerError && workerError.code + ': ' + workerError.message);
  assert.deepEqual(messages.filter((message) => message.type === 'progress').map((message) => message.progress.phase), [
    'validating',
    'file',
    'analysis'
  ]);
  const completed = messages.find((message) => message.type === 'complete');
  assert.ok(completed);
  assert.equal(completed.prepared.result.validRows, 1);
  assert.equal(completed.prepared.result.rows[0].quantity, 3000000n);
  assert.equal(completed.prepared.analysis.total_lines, 1);
  assert.equal(completed.prepared.files[0].parsed.rows.length, 2);

  messages.length = 0;
  vm.runInContext([
    'workerRecord.files[0].mapping.order_id = 9;',
    "self.onmessage({ data: { record: workerRecord, language: 'en' } });"
  ].join('\n'), context);
  const mappingError = messages.find((message) => message.type === 'error');
  assert.equal(mappingError.code, 'invalid_mapping');
});
