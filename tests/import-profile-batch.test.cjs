'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const model = require('../workspace.js');
const batch = require('../src/application/import-profile-batch.js');

function file(id, headers = ['SKU', 'Qty', 'Date', 'Status']) {
  return { id, label: 'Synthetic ' + id, headers, parsed: { headers }, sourceType: 'order-lines', buffer: new Uint8Array([1, 2, 3]).buffer,
    mapping: { article_id: 0 }, customFieldMapping: {}, preparationRules: {}, sourceRules: [], confirmedMapping: { article_id: 0 },
    confirmedCustomFieldMapping: {}, result: { rows: [{ source_line: 2 }] } };
}
function profile() {
  const seed = file('seed'); seed.mapping = { article_id: 0, quantity: 1, delivery_date: 2 };
  seed.sourceRules = [{ sourcePosition: 3, type: 'exclude-empty', name: 'Empty status', description: 'Skip incomplete synthetic rows', enabled: true, includeInProfile: true }];
  return model.createImportProfile(seed, 'Synthetic orders', [], { id: 'profile-batch', now: '2026-10-17T10:00:00.000Z' });
}
test('bulk preview uses the existing positional/name contract and skips conflicts without modifying inputs', () => {
  const p = profile(), files = [file('exact'), file('reordered', ['Status', 'Date', 'Qty', 'SKU']), file('missing', ['SKU', 'Date']),
    { ...file('master'), sourceType: 'article-master' }, { ...file('reading'), reading: true }, file('duplicate', ['SKU', 'Qty', 'Qty', 'Date', 'Status'])];
  const before = structuredClone(files), ids = files.map(item => item.id);
  const preview = batch.prepare(model, p, files, ids, []);
  assert.deepEqual(preview.items.map(item => item.status), ['compatible', 'compatible', 'conflict', 'source-type', 'unavailable', 'conflict']);
  const applied = batch.apply(model, p, files, preview, []);
  assert.equal(applied.applied, 2); assert.equal(applied.skipped, 4);
  assert.deepEqual(applied.files[1].mapping, { article_id: 3, quantity: 2, delivery_date: 1 });
  assert.equal(applied.files[1].sourceRules[0].sourcePosition, 0);
  assert.equal(applied.files[0].confirmedMapping, null);
  assert.equal(applied.files[0].appliedImportProfile.profileName, p.name);
  assert.equal(applied.files[0].appliedImportProfile.appliedAt, applied.files[1].appliedImportProfile.appliedAt);
  assert.equal(model.importProfileApplicationState(applied.files[1], [p]).modified, false);
  assert.equal(applied.files[0].buffer, files[0].buffer);
  assert.equal(applied.files[0].result, files[0].result, 'analysis invalidation belongs to the application save operation');
  for (let i = 2; i < files.length; i++) assert.equal(applied.files[i], files[i]);
  assert.deepEqual(files, before);
});
test('preview rejects changed profiles, mappings, headers, rules, custom fields and removed sources', () => {
  for (const change of [
    (p, files) => { files[0].headers[0] = 'Another'; },
    (p, files) => { files[0].mapping.quantity = 2; },
    (p, files) => { files[0].sourceRules = [{ sourcePosition: 0 }]; },
    p => { p.name = 'Changed'; },
    (p, files, fields) => { fields.push({ id: 'new', active: true }); },
    (p, files) => { files.pop(); }
  ]) {
    const p = profile(), files = [file('one')], fields = [];
    const preview = batch.prepare(model, p, files, ['one'], fields);
    change(p, files, fields);
    assert.throws(() => batch.apply(model, p, files, preview, fields), /stale-preview/);
  }
});
test('selection uses stable IDs, ignores duplicates, and never applies to unselected sources', () => {
  const p = profile(), files = [file('first'), file('second')];
  const preview = batch.prepare(model, p, files, ['second', 'second'], []);
  assert.equal(preview.items.length, 1);
  const result = batch.apply(model, p, files, preview, []);
  assert.equal(result.files[0], files[0]); assert.notEqual(result.files[1], files[1]);
  assert.throws(() => batch.prepare(model, p, files, ['absent'], []), /stale-preview/);
  assert.throws(() => batch.apply(model, p, files, batch.prepare(model, p, files, [], []), []), /no-compatible/);
});
test('mutated preview plans cannot inject mappings into the live application', () => {
  const p = profile(), files = [file('first')], preview = batch.prepare(model, p, files, ['first'], []);
  preview.items[0].plan.mapping.article_id = 999;
  assert.equal(batch.apply(model, p, files, preview, []).files[0].mapping.article_id, 0);
});

function stagedApplication() {
  const p = profile(), original = file('one');
  const state = { activeWorkspace: { id: 'workspace-one' }, storageReady: true, workspaceLoading: false,
    files: [original], importProfiles: [p], customFields: [], analysis: { total: 1 }, fileSelectionVersion: 1 };
  let pending, saveOptions, snapshots = [];
  const context = vm.createContext({ state, window: { OpenSlottingImportProfileBatch: batch }, workspaceModel: model,
    renderWorkspaceControls() {}, renderMapping() {}, clearAnalysis() { state.analysis = null; },
    persistActiveWorkspace(key, options) { saveOptions = options; snapshots.push(options.runtimeState); return new Promise((resolve, reject) => { pending = { resolve, reject }; }); }
  });
  const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8').replace(/\r\n/g, '\n');
  const start = source.indexOf('  async function applyImportProfileBatch('), end = source.indexOf('  function updateSelectedImportProfile(', start);
  vm.runInContext(source.slice(start, end), context);
  const preview = batch.prepare(model, p, state.files, ['one'], []); preview.workspaceId = state.activeWorkspace.id;
  return { state, original, snapshots, start: () => context.applyImportProfileBatch(preview),
    fail: () => pending.reject(new Error('synthetic save failure')), commit: () => { saveOptions.onCommitted(); pending.resolve({}); },
    commitWithCatalogFailure: () => { saveOptions.onCommitted(); pending.reject(new Error('catalog refresh failed')); } };
}
test('batch waits for the central atomic save before exposing changed mappings', async () => {
  const h = stagedApplication(), task = h.start();
  assert.equal(h.state.workspaceLoading, true); assert.equal(h.state.files[0], h.original);
  assert.equal(h.original.mapping.quantity, undefined); assert.ok(h.original.result);
  assert.equal(h.original.appliedImportProfile, undefined);
  assert.equal(h.snapshots[0].files[0].buffer, h.original.buffer);
  h.commit(); const result = await task;
  assert.equal(result.applied, 1); assert.equal(h.state.files[0].mapping.quantity, 1);
  assert.equal(h.state.files[0].appliedImportProfile.profileName, 'Synthetic orders');
  assert.equal(h.state.files[0].result, null); assert.equal(h.state.analysis, null); assert.equal(h.state.workspaceLoading, false);
});
test('failed save leaves the previous visible data and analysis intact', async () => {
  const h = stagedApplication(), task = h.start(); h.fail();
  await assert.rejects(task, /synthetic save failure/);
  assert.equal(h.state.files[0], h.original); assert.equal(h.original.mapping.quantity, undefined);
  assert.equal(h.original.appliedImportProfile, undefined);
  assert.ok(h.state.analysis); assert.ok(h.original.result); assert.equal(h.state.workspaceLoading, false);
});
test('a post-commit catalog error does not expose stale pre-commit configuration', async () => {
  const h = stagedApplication(), task = h.start(); h.commitWithCatalogFailure(); await task;
  assert.equal(h.state.files[0].mapping.quantity, 1); assert.equal(h.state.workspaceLoading, false);
});

test('a language refresh retains the active source-column view; explicit analysis opens coverage', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8').replace(/\r\n/g, '\n');
  const start = source.indexOf('  function renderResults('), end = source.indexOf('  function sourceContext(', start);
  const targets = [], state = { language: 'de', activePageTarget: 'mapping-panel', comparison: null, periodSettings: {}, selectedArticleId: null };
  const noop = () => {};
  const context = vm.createContext({ state,
    core: { applyFeatureReadinessToAnalysis: analysis => analysis, enrichAnalysisWithRegistry: analysis => analysis, prepareArticleSearchProjections: noop },
    elements: { articleFilter: {}, exportButton: {}, resultsPanel: { classList: { remove: noop } } },
    invalidateViewCaches: noop, settingsForDetectedCalendarWeeks: settings => settings, renderArticleSearch: noop, showArticleOverview: noop,
    renderIssues: noop, renderQualityOverview: noop, renderBatchWarnings: noop, renderSourceTable: noop, renderCoverage: noop, renderComparison: noop,
    analysisRowCount: () => 1, renderWorkflow: target => targets.push(target)
  });
  vm.runInContext(source.slice(start, end), context);
  const result = { rows: [], articleRegistry: [], issues: [], qualityFindings: [], warnings: [] }, analysis = { articles: [] };
  context.renderResults(result, { preserveView: true, analysis });
  context.renderResults(result, { preserveView: false, analysis });
  assert.deepEqual(targets, ['mapping-panel', 'coverage-panel']);
});

test('application evidence retains the historical profile independently of profile edits or deletion', () => {
  const p = profile(), source = file('one');
  source.appliedImportProfile = model.recordImportProfileApplication(p, source, { now: '2026-10-17T12:00:00.000Z' });
  const snapshot = structuredClone(source.appliedImportProfile);
  p.name = 'Renamed'; p.updatedAt = '2026-10-17T13:00:00.000Z';
  assert.equal(model.importProfileApplicationState(source, [p]).profileChanged, true);
  assert.equal(model.importProfileApplicationState(source, [p]).modified, false);
  assert.equal(model.importProfileApplicationState(source, []).profileMissing, true);
  source.mapping.quantity = 1;
  assert.equal(model.importProfileApplicationState(source, []).modified, true);
  assert.deepEqual(source.appliedImportProfile, snapshot);
  model.createImportProfile(source, 'Save only', []);
  assert.deepEqual(source.appliedImportProfile, snapshot, 'saving a profile cannot mark it as applied');
});

test('configuration comparison ignores key order and unassigned fields but detects every setting category', () => {
  const p = profile(), sources = [file('one')];
  const applied = batch.apply(model, p, sources, batch.prepare(model, p, sources, ['one'], []), []).files[0];
  const equivalent = structuredClone(applied);
  equivalent.mapping = { delivery_date: 2, quantity: 1, article_id: 0, article_name: null };
  equivalent.preparationRules.quantity = [];
  assert.equal(model.importProfileApplicationState(equivalent, [p]).modified, false);
  for (const change of [
    f => { f.mapping.quantity = 3; }, f => { f.sourceType = 'article-master'; },
    f => { f.customFieldMapping['custom-extra'] = 3; },
    f => { f.preparationRules.article_id = [{ type: 'trim', enabled: true }]; },
    f => { f.sourceRules[0].enabled = false; }
  ]) {
    const edited = structuredClone(applied); change(edited);
    assert.equal(model.importProfileApplicationState(edited, [p]).modified, true);
  }
});

test('legacy sources do not infer an application even when they exactly match a saved profile', () => {
  const p = profile(), source = file('one');
  const record = model.createWorkspace('Legacy'); record.schemaVersion = 16; record.importProfiles = [p];
  source.id = 'source-one'; source.name = 'synthetic.csv'; source.size = 3; source.lastModified = 1; source.result = null;
  record.files = [source];
  const migrated = model.migrateWorkspace(record);
  assert.equal(migrated.schemaVersion, model.WORKSPACE_SCHEMA_VERSION);
  assert.equal(migrated.files[0].appliedImportProfile, null);
  const panel = require('../src/ui/import-profile-panel.js');
  assert.equal(panel.applicationDescription(model, migrated.files[0], [p], 'de').title, 'Keine Anwendung dokumentiert');
  assert.equal(panel.applicationDescription(model, migrated.files[0], [p], 'en').title, 'No application recorded');
});

test('reapplying another profile replaces only the last application on compatible selected sources', () => {
  const first = profile(), sources = [file('one'), file('two')];
  const applied = batch.apply(model, first, sources, batch.prepare(model, first, sources, ['one', 'two'], []), []).files;
  const prior = structuredClone(applied[0].appliedImportProfile);
  const next = { ...first, id: 'profile-next', name: 'Next profile', updatedAt: '2026-10-17T14:00:00.000Z' };
  const result = batch.apply(model, next, applied, batch.prepare(model, next, applied, ['one'], []), []);
  assert.equal(result.files[0].appliedImportProfile.profileId, 'profile-next');
  assert.equal(result.files[0].appliedImportProfile.profileName, 'Next profile');
  assert.deepEqual(applied[0].appliedImportProfile, prior);
  assert.equal(result.files[1], applied[1]);
});

test('application metadata rejects corrupt identifiers, timestamps and unbounded settings', () => {
  const valid = model.recordImportProfileApplication(profile(), file('one'));
  for (const update of [{ profileId: 'not-a-profile' }, { profileName: '' }, { appliedAt: 'invalid' },
    { profileUpdatedAt: null }, { configuration: [] },
    { configuration: { mapping: Object.fromEntries(Array.from({ length: 4097 }, (_, i) => ['field' + i, i])) } }]) {
    assert.throws(() => model.normalizeAppliedImportProfile({ ...valid, ...update }), /Applied profile/);
  }
});

test('last application survives chunk storage, activation, reanalysis, trusted capture and backup restore', async () => {
  const storage = require('../storage.js'), preparation = require('../src/application/workspace-preparation.js');
  const { createFakeIndexedDB } = require('./fake-indexeddb.cjs');
  const p = profile(), source = file('source-one');
  source.name = 'synthetic.csv'; source.lastModified = 1;
  source.buffer = new TextEncoder().encode('SKU;Qty;Date;Status\nSYN-1;2;2026-10-17;ready\n').buffer;
  source.size = source.buffer.byteLength; source.result = null;
  const record = model.createWorkspace('Synthetic application'); record.importProfiles = [p];
  record.files = batch.apply(model, p, [source], batch.prepare(model, p, [source], ['source-one'], []), []).files;
  const evidence = structuredClone(record.files[0].appliedImportProfile);
  const repository = storage.createRepository({ indexedDB: createFakeIndexedDB(), databaseName: 'applied-profile-test' });
  await repository.createWorkspace(record);
  const loaded = await repository.loadWorkspace(record.id);
  assert.deepEqual(loaded.files[0].appliedImportProfile, evidence);
  const prepared = preparation.prepareWorkspaceRecord(loaded, 'de', () => {});
  assert.deepEqual(prepared.files[0].appliedImportProfile, evidence);
  const analyzed = preparation.analyzeFiles(prepared.files, 'en', []);
  assert.deepEqual(analyzed.files[0].appliedImportProfile, evidence);
  const persisted = preparation.persistPreparedWorkspace({ ...prepared, files: analyzed.files });
  assert.deepEqual(persisted.files[0].appliedImportProfile, evidence);
  const captured = model.captureWorkspaceTrusted(record, { ...persisted, files: analyzed.files });
  assert.deepEqual(captured.files[0].appliedImportProfile, evidence);
  captured.importProfiles = [];
  const restored = model.parseBackup(model.stringifyBackup(captured));
  assert.deepEqual(restored.files[0].appliedImportProfile, evidence);
  assert.deepEqual(new Uint8Array(restored.files[0].buffer), new Uint8Array(source.buffer));
  assert.equal(model.importProfileApplicationState(restored.files[0], []).modified, false);
  assert.equal(model.importProfileApplicationState(restored.files[0], []).profileMissing, true);
  repository.close();
});
