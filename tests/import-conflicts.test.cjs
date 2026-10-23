'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const linked = require('../src/application/linked-sources.js'), prep = require('../src/application/workspace-preparation.js');
const csv = require('../csv.js');
const initial = 'article_id;quantity;delivery_date\nOLD;1;2026-08-03\n';
const changed = 'article_id;quantity;delivery_date\nNEW;2;2026-08-04\n';
function source(id = 'source-one') {
  const buffer = new TextEncoder().encode(initial).buffer;
  const file = { id, name: 'same.csv', label: 'same.csv', buffer, size: buffer.byteLength, lastModified: 1, encodingMode: 'auto', sourceType: 'order-lines', tags: ['Nord'], preparationRules: {}, sourceRules: [], customFieldMapping: {} };
  prep.decodeFileEntry(file, { streaming: true }); file.confirmedMapping = { ...file.mapping };
  return file;
}
function incoming(name = 'same.csv', text = changed, linked = false) {
  return { name, linked, handle: { name, getFile: async () => ({ name, lastModified: 2, arrayBuffer: async () => new TextEncoder().encode(text).buffer }) } };
}
function options(resolve) { let id = 0; return { check() {}, createId: () => 'source-new-' + (++id), resolve }; }
async function refresh(files, operations, extra = {}) {
  let saved;
  await linked.refresh({ files, operations, customFields: [], analyzed: false, isCurrent: () => true, onFile() {},
    profile: async candidate => { prep.decodeFileEntry(candidate, { streaming: true }); return candidate; },
    finalize: linked.finalizeImports, commit: async prepared => { saved = prepared; }, ...extra });
  return saved;
}
test('duplicate replacement targets the chosen source and retains its identity, mappings and tags', async () => {
  const files = [source(), source('source-two')], before = structuredClone(files);
  const plan = await linked.planImports(files, [incoming()], options(async (item, matches) => {
    assert.equal(matches.length, 2); return { action: 'replace', id: 'source-two' };
  }));
  const saved = await refresh(files, plan), replacement = saved.files[1];
  assert.equal(saved.files.length, 2); assert.equal(replacement.id, 'source-two');
  assert.deepEqual(replacement.tags, ['Nord']); assert.deepEqual(replacement.confirmedMapping, before[1].confirmedMapping);
  assert.equal(replacement.linkedSource, null); assert.equal(plan[0].linked, false);
  assert.equal(new TextDecoder().decode(replacement.buffer), changed); assert.deepEqual(files, before);
});
test('import anyway uses numbered display labels and updates copied column ownership without mutating originals', async () => {
  const file = source(), before = structuredClone(file);
  const plan = await linked.planImports([file], [incoming()], options(async () => ({ action: 'keep' })));
  const saved = await refresh([file], plan);
  assert.deepEqual(saved.files.map(file => file.label), ['same.csv (1/2)','same.csv (2/2)']);
  assert.equal(saved.files[0].columnCatalog[0].sourceFileLabel, 'same.csv (1/2)'); assert.deepEqual(file, before);
  const result = prep.analyzeFiles(saved.files, 'en', []).result;
  assert.deepEqual(result.rows.map(row => row.source_file_label), ['same.csv (1/2)','same.csv (2/2)']);
  assert.equal(result.rows[0].source_file_id, file.id); assert.notEqual(result.rows[1].source_file_id, file.id);
});
test('cancelling a later conflict discards the entire selection before any source is read', async () => {
  const file = source(), before = structuredClone(file); let reads = 0;
  const unique = incoming('new.csv'); unique.handle.getFile = async () => { reads++; throw Error('must not read'); };
  await assert.rejects(linked.planImports([file], [unique, incoming()], options(async () => ({ action: 'cancel' }))), { code: 'workspace_load_cancelled' });
  assert.equal(reads, 0); assert.deepEqual(file, before);
});
test('conflicts within one selection are resolved too; replacing a staged file reads only its final version', async () => {
  const plan = await linked.planImports([], [incoming(), incoming()], options(async () => ({ action: 'replace', id: 'source-new-1' })));
  assert.equal(plan.length, 1); assert.equal(plan[0].create, true);
  assert.equal((await refresh([], plan)).files.length, 1);
  const both = await linked.planImports([], [incoming(), incoming()], options(async () => ({ action: 'keep' })));
  assert.deepEqual((await refresh([], both)).files.map(file => file.label), ['same.csv (1/2)','same.csv (2/2)']);
});
test('name checks include case variants; cancellation and invalid targets cannot silently choose another source', async () => {
  const file = source(); let conflicts = 0;
  await assert.rejects(linked.planImports([file], [incoming('SAME.csv')], options(async () => { conflicts++; return { action: 'replace', id: 'wrong' }; })), { code: 'linked_missing' });
  assert.equal(conflicts, 1);
  const settings = options(async () => ({ action: 'keep' })); let current = true;
  settings.check = () => { if (!current) throw Object.assign(Error('cancel'), { code: 'workspace_load_cancelled' }); };
  settings.resolve = async () => { current = false; return { action: 'replace', id: file.id }; };
  await assert.rejects(linked.planImports([file], [incoming()], settings), { code: 'workspace_load_cancelled' });
});
test('malformed new snapshots remain inspectable, but malformed replacements preserve the previous source', async () => {
  const invalid = incoming('same.csv', '');
  const create = await linked.planImports([], [invalid], options());
  const saved = await refresh([], create, { allowInvalidNew: true }); assert.ok(saved.files[0].errorKey);
  const file = source(), before = structuredClone(file);
  const replace = await linked.planImports([file], [invalid], options(async () => ({ action: 'replace', id: file.id })));
  await assert.rejects(refresh([file], replace, { allowInvalidNew: true }), { code: 'linked_invalid_csv' }); assert.deepEqual(file, before);
});
