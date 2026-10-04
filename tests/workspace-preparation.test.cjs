'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const preparation = require('../src/application/workspace-preparation.js');
const core = require('../csv.js');

function file(text, id = 'source') {
  const buffer = new TextEncoder().encode(text).buffer;
  return { id, name: id + '.csv', label: id + '.csv', buffer, size: buffer.byteLength,
    encodingMode: 'auto', sourceType: 'order-lines', preparationRules: {}, sourceRules: [],
    customFieldMapping: {}, confirmedCustomFieldMapping: {}, result: null };
}
function worker() {
  const messages = [];
  const scope = { postMessage(message, transfer) { messages.push({ message, transfer }); } };
  preparation.workspaceWorkerMain(scope);
  return { run(input) { messages.length = 0; scope.onmessage({ data: input }); return messages.slice(); } };
}

test('profiling task preserves duplicate header positions and exact original source bytes', () => {
  const text = 'article_id;quantity;delivery_date;extra;extra\r\n0007;0.1234567;2026-09-02;"x;y";z\r\n';
  const source = file(text); const original = new Uint8Array(source.buffer).slice();
  const expected = structuredClone(source); preparation.decodeFileEntry(expected, { streaming: true });
  const output = worker().run({ taskId: 17, profileFile: source, language: 'de' });
  assert.equal(output.length, 1); assert.equal(output[0].message.taskId, 17);
  const actual = output[0].message.prepared.file;
  assert.deepEqual(actual, expected); assert.deepEqual(new Uint8Array(actual.buffer), original);
  assert.deepEqual(actual.headers, ['article_id', 'quantity', 'delivery_date', 'extra', 'extra']);
  assert.equal(actual.columnCatalog[4].position, 4);
  assert.deepEqual(output[0].transfer, [source.buffer]);
});

test('reanalysis task equals the shared exact calculation and retains original row provenance', () => {
  const source = file('order_id;article_id;quantity;delivery_date\n00001;0007;0.1234567;2026-09-02\n00002;0007;0.0000001;2026-09-03\n00003;0007;1;\n');
  preparation.decodeFileEntry(source, { streaming: true }); source.confirmedMapping = { ...source.mapping };
  const expected = preparation.analyzeFiles([structuredClone(source)], 'de', []);
  const output = worker().run({ taskId: 19, analysisFiles: [source], language: 'de', customFields: [] });
  assert.equal(output[0].message.type, 'progress');
  const actual = output.at(-1).message.prepared;
  assert.deepEqual(actual, expected);
  assert.equal(actual.result.validRows, 2); assert.equal(actual.result.invalidRows, 1);
  assert.equal(actual.analysis.total_quantity, 1234568n);
  assert.deepEqual(actual.result.rows.map(row => row.source_line), [2, 3]);
  assert.equal(actual.result.rows[0].order_id, '00001'); assert.equal(actual.result.rows[0].article_id, '0007');
  assert.equal(core.formatScaledQuantity(actual.analysis.total_quantity, 'en'), '0.1234568');
  assert.deepEqual(output.at(-1).transfer, [source.buffer]);
});

test('sequential worker protocol does not retain a previous task or duplicate transfers', () => {
  const engine = worker();
  const first = engine.run({ taskId: 1, profileFile: file('article_id;quantity;delivery_date\na;1;2026-09-01\n') });
  const second = engine.run({ taskId: 2, profileFile: file('article_id;quantity;delivery_date\nb;2;2026-09-02\n', 'second') });
  assert.equal(first[0].message.taskId, 1); assert.equal(second[0].message.taskId, 2);
  assert.equal(second[0].message.prepared.file.id, 'second');
  const source = second[0].message.prepared.file;
  const shared = structuredClone(source); shared.id = 'third'; shared.buffer = source.buffer;
  const complete = engine.run({ taskId: 3, analysisFiles: [source, shared], language: 'en' }).at(-1);
  assert.equal(complete.message.type, 'complete'); assert.equal(complete.message.taskId, 3);
  assert.equal(complete.transfer.length, 1);
});
