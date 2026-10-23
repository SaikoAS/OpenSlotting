'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const linked = require('../src/application/linked-sources.js');
const preparation = require('../src/application/workspace-preparation.js'), workspace = require('../workspace.js');
function file(text, id = 'source-one') {
  const buffer = new TextEncoder().encode(text).buffer;
  const source = { id, name: id + '.csv', label: id + '.csv', buffer, size: buffer.byteLength, lastModified: 1,
    encodingMode: 'auto', sourceType: 'order-lines', preparationRules: {}, sourceRules: [], customFieldMapping: {} };
  preparation.decodeFileEntry(source, { streaming: true }); source.confirmedMapping = { ...source.mapping };
  return source;
}
function handle(text, options = {}) {
  const permissions = [];
  return { kind: 'file', name: 'linked.csv', permissions,
    async queryPermission(value) { permissions.push(value.mode); return options.permission || 'granted'; },
    async requestPermission(value) { permissions.push(value.mode); return options.answer || 'granted'; },
    async getFile() {
      if (options.error) throw options.error;
      return { name: 'linked.csv', lastModified: 2, async arrayBuffer() { return new TextEncoder().encode(text).buffer; } };
    } };
}
const initial = 'article_id;quantity;delivery_date\nSYN-A;1;2026-08-03\nSYN-B;2;2026-08-04\n';
const changed = 'article_id;quantity;delivery_date\nSYN-C;3;2026-08-05\n';
function options(files, operations) {
  const commits = [];
  return { files, operations, customFields: [], analyzed: true, isCurrent: () => true, onFile() {}, commits,
    async profile(candidate) { preparation.decodeFileEntry(candidate, { streaming: true }); return candidate; },
    async analyze(sources) { return preparation.analyzeFiles(sources, 'en', []); },
    async commit(prepared, links) { commits.push({ prepared, links }); } };
}
test('a linked update replaces only its source, removes deleted rows and preserves provenance and old objects', async () => {
  const original = file(initial), other = file(initial, 'source-other'); original.tags = ['Nord','August'];
  const before = structuredClone(original);
  const opts = options([original, other], [{ id: original.id, handle: handle(changed) }]);
  const prepared = await linked.refresh(opts);
  assert.equal(opts.commits.length, 1); assert.equal(prepared.files.length, 2);
  assert.deepEqual(original, before); assert.equal(prepared.files[0].id, original.id);
  const own = prepared.result.rows.filter(row => row.source_file_id === original.id);
  assert.equal(own.length, 1); assert.equal(own[0].article_id, 'SYN-C'); assert.equal(own[0].source_line, 2);
  assert.equal(prepared.result.rows.filter(row => row.source_file_id === other.id).length, 2);
  assert.ok(prepared.files[0].linkedSource.updatedAt);
  assert.deepEqual(prepared.files[0].mapping, before.mapping);
  assert.deepEqual(prepared.files[0].tags, before.tags);
});
test('reordered columns retain mapped fields, source rules excluded from profiles, and transformation settings', async () => {
  const original = file(initial); original.sourceRules = [{ type: 'exclude-equals', sourcePosition: 0, value: 'SYN-B', includeInProfile: false, name: 'Rule', description: 'Synthetic exclusion' }];
  const before = structuredClone(original);
  const opts = options([original], [{ id: original.id, handle: handle('delivery_date;article_id;quantity\n2026-08-05;SYN-C;3\n') }]);
  const prepared = await linked.refresh(opts);
  assert.equal(prepared.files[0].mapping.article_id, 1); assert.equal(prepared.files[0].sourceRules[0].sourcePosition, 1);
  assert.equal(prepared.files[0].sourceRules[0].includeInProfile, false); assert.deepEqual(original, before);
});

test('new filenames receive unique labels and later updates keep the same duplicate label', async () => {
  const original = file(initial), other = file(initial, 'source-other');
  other.name = other.label = 'linked.csv';
  const opts = options([original, other], [{ id: original.id, handle: handle(changed) }]);
  const prepared = await linked.refresh(opts), replacement = prepared.files[0];
  assert.equal(replacement.name, 'linked.csv'); assert.equal(replacement.label, 'linked.csv (2)');
  assert.equal(prepared.result.rows[0].source_file_label, 'linked.csv (2)');
  assert.equal(prepared.files[1].name, 'linked.csv'); assert.equal(prepared.files[1].label, 'linked.csv');
  const repeated = await linked.refresh(options(prepared.files, [{ id: original.id, handle: handle(changed) }]));
  assert.equal(repeated.files[0].label, 'linked.csv (2)');
  assert.equal(original.name, 'source-one.csv'); assert.equal(original.label, 'source-one.csv');
});
test('a missing required column, malformed CSV, read failure or save failure retains original data', async () => {
  for (const [text, error] of [['wrong;quantity;delivery_date\nX;3;2026-08-05\n', null], ['article_id;quantity;delivery_date\n"broken', null], [changed, new Error('read failed')]]) {
    const original = file(initial), before = structuredClone(original), opts = options([original], [{ id: original.id, handle: handle(text, { error }) }]);
    await assert.rejects(linked.refresh(opts)); assert.equal(opts.commits.length, 0); assert.deepEqual(original, before);
  }
  const original = file(initial), before = structuredClone(original), opts = options([original], [{ id: original.id, handle: handle(changed) }]);
  opts.commit = async () => { throw new Error('quota'); };
  await assert.rejects(linked.refresh(opts), /quota/); assert.deepEqual(original, before);
});
test('batch refresh commits none of the sources if a later file fails', async () => {
  const files = [file(initial), file(initial, 'source-two')], before = structuredClone(files);
  const opts = options(files, [{ id: files[0].id, handle: handle(changed) }, { id: files[1].id, handle: handle('wrong\nvalue\n') }]);
  await assert.rejects(linked.refresh(opts), { code: 'linked_schema_changed' });
  assert.equal(opts.commits.length, 0); assert.deepEqual(files, before);
});
test('cancellation after reading or preparing a file never commits a partial update', async () => {
  const original = file(initial), opts = options([original], [{ id: original.id, handle: handle(changed) }]);
  let active = true; opts.isCurrent = () => active;
  opts.profile = async candidate => { preparation.decodeFileEntry(candidate, { streaming: true }); active = false; return candidate; };
  await assert.rejects(linked.refresh(opts), { code: 'workspace_load_cancelled' }); assert.equal(opts.commits.length, 0);
});
test('a new linked source is profiled without inventing an analysis or changing existing sources', async () => {
  const original = file(initial), opts = options([original], [{ id: 'source-new', handle: handle(changed), create: true }]);
  opts.analyzed = false; opts.analyze = () => assert.fail('new imports need mapping review');
  const prepared = await linked.refresh(opts);
  assert.equal(prepared.files.length, 2); assert.equal(prepared.files[0], original); assert.equal(prepared.analysis, null);
  assert.equal(prepared.files[1].id, 'source-new'); assert.ok(prepared.files[1].parsed);
});
test('read permissions are requested without write access and denial/missing handles fail clearly', async () => {
  const source = handle(changed, { permission: 'prompt' }); await linked.requestRead(source);
  assert.deepEqual(source.permissions, ['read', 'read']);
  await assert.rejects(linked.requestRead(handle(changed, { permission: 'prompt', answer: 'denied' })), { code: 'linked_permission' });
  await assert.rejects(linked.requestRead(null), { code: 'linked_missing' });
});
test('schema-21 workspaces gain no invented links and link metadata is normalized without capabilities', () => {
  const record = workspace.createWorkspace('Synthetic'); record.schemaVersion = 21; record.files = [file(initial)];
  const migrated = workspace.migrateWorkspace(record);
  assert.equal(migrated.schemaVersion, workspace.WORKSPACE_SCHEMA_VERSION); assert.equal(migrated.files[0].linkedSource, null);
  const metadata = workspace.normalizeLinkedSource({ name: 'linked.csv', updatedAt: '2026-10-23T10:00:00.000Z', handle: 'not portable' });
  assert.deepEqual(Object.keys(metadata), ['name', 'updatedAt']);
  assert.throws(() => workspace.normalizeLinkedSource({ name: 'linked.csv', updatedAt: 'invalid' }), { code: 'invalid_linked_source' });
});
