'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const workspace = require('../workspace.js');
const calendar = require('../src/ui/coverage-calendar.js');
const periods = require('../periods.js');
const preparation = require('../src/application/workspace-preparation.js');
const storage = require('../storage.js');
const core = require('../csv.js');
const { createFakeIndexedDB } = require('./fake-indexeddb.cjs');
const note = (date = '2026-10-03', reason = 'Feiertag – keine Auslieferung') => ({ date, reason, updatedAt: '2026-10-17T12:00:00.000Z' });
const appSource = fs.readFileSync(require('node:path').join(__dirname, '..', 'app.js'), 'utf8').replace(/\r\n/g, '\n');
function appFunction(name) {
  const start = appSource.indexOf('  function ' + name + '(');
  assert.ok(start >= 0, name);
  const end = appSource.slice(start + 1).search(/\n  (?:async )?function \w+\(/);
  return appSource.slice(start, start + end + 1);
}

function coverageView(result, notes = []) {
  const state = { activeWorkspace: { id: 'synthetic-coverage' }, files: result ? result.files : [], result,
    coverageNotes: notes, warehouseLayout: { objects: [] }, periodSettings: periods.normalizeSettings(), comparison: null };
  function element() {
    const classes = new Set(['hidden']);
    return { classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) },
      children: [], appendChild(child) { this.children.push(child); }, replaceChildren() { this.children = []; } };
  }
  const elements = Object.fromEntries(['coveragePanel', 'coverageOverview', 'periodAStatus', 'periodBStatus', 'comparePeriods'].map(key => [key, element()]));
  const root = { innerHTML: '', addEventListener() {} };
  const coverageCalendar = calendar.create({ root, getWorkspaceId: () => state.activeWorkspace.id,
    getLanguage: () => 'en', getNotes: () => state.coverageNotes,
    getExpectedWeekdays: () => state.periodSettings.expectedWeekdays, isLocked: () => false });
  let renderedData;
  const context = vm.createContext({ state, elements, periods, core, coverageCalendar,
    document: { createElement: element }, setText: (node, text) => { node.textContent = text; }, translate: key => key,
    renderCoverageSources: data => { renderedData = data; }, renderCoverageDates() {}, renderCoverageDrilldown() {}, renderPeriodControls() {},
    coverageText: () => '', closeMappingDrawer() {}, PAGE_CONFIG: { 'coverage-panel': {}, 'mapping-panel': {}, 'main-menu-panel': {}, 'workspace-panel': {} } });
  for (const name of ['analysisRowCount', 'resultHasRetainedData', 'buildCoverageData', 'hasCoverageContent', 'renderCoverage']) {
    vm.runInContext(appFunction(name), context);
  }
  const start = appSource.indexOf('  function renderWorkflow('), end = appSource.indexOf('    document.body.classList.toggle', start);
  vm.runInContext(appSource.slice(start, end) + 'return availability; }', context);
  return { state, elements, root, context, data: () => renderedData };
}

test('issue-only imports can enter coverage and show invalid or excluded evidence without enabling comparisons', () => {
  for (const excluded of [false, true]) {
    const record = sourceWorkspace();
    const text = 'article_id;quantity;delivery_date;flag\nSYN-1;' + (excluded ? '2' : 'invalid') + ';2026-10-03;skip\n';
    record.files[0].buffer = new TextEncoder().encode(text).buffer;
    record.files[0].size = record.files[0].buffer.byteLength;
    record.files[0].sourceRules = excluded ? [{ sourcePosition: 3, type: 'exclude-equals', value: 'skip', name: 'Synthetic exclusion', description: 'Skip synthetic rows', enabled: true }] : [];
    const prepared = preparation.prepareWorkspaceRecord(record, 'en', () => {});
    assert.equal(prepared.result.rows.length, 0);
    const view = coverageView(prepared.result);
    assert.equal(view.context.renderWorkflow('coverage-panel')['coverage-panel'], true);
    assert.equal(view.state.activePageTarget, 'coverage-panel');
    assert.equal(view.elements.coveragePanel.classList.contains('hidden'), false);
    assert.match(view.root.innerHTML, /coverage-calendar-day issues[^>]*data-calendar-date="2026-10-03"/);
    assert.equal(view.data().dates[0][excluded ? 'filteredLines' : 'invalidLines'].size, 1);
    assert.equal(view.elements.comparePeriods.disabled, true);
    view.context.renderWorkflow('unavailable-page');
    assert.equal(view.state.activePageTarget, 'coverage-panel');
  }
});

test('retained reasons remain accessible without an analysis result or source files', () => {
  const view = coverageView(null, [note()]);
  assert.equal(view.context.renderWorkflow('coverage-panel')['coverage-panel'], true);
  assert.equal(view.state.activePageTarget, 'coverage-panel');
  assert.equal(view.elements.coveragePanel.classList.contains('hidden'), false);
  assert.match(view.root.innerHTML, /Feiertag/);
  assert.equal(view.data().dates.length, 0);
  assert.equal(view.elements.comparePeriods.disabled, true);
  assert.equal(view.state.result, null);
});

test('empty workspaces and undated, advisory or article-master issues do not unlock coverage', () => {
  for (const result of [null, { files: [], rows: [], issues: [] },
    { files: [{ id: 'order' }, { id: 'master', sourceType: 'article-master' }], rows: [], analysisRows: 0, issues: [
      { sourceFileId: 'order', deliveryDate: 'invalid', sourceLine: 2 },
      { sourceFileId: 'order', deliveryDate: '2026-10-03', sourceLine: 3, blocking: false },
      { sourceFileId: 'master', deliveryDate: '2026-10-03', sourceLine: 2 }
    ] }]) {
    const view = coverageView(result);
    assert.equal(view.context.renderWorkflow('coverage-panel')['coverage-panel'], false);
    assert.notEqual(view.state.activePageTarget, 'coverage-panel');
    view.context.renderCoverage();
    assert.equal(view.elements.coveragePanel.classList.contains('hidden'), true);
  }
});

test('calendar uses 42 Monday-first cells and handles leap days and year boundaries', () => {
  const days = calendar.monthDays('2024-02');
  assert.equal(days.length, 42); assert.equal(days[0], '2024-01-29');
  assert.ok(days.includes('2024-02-29')); assert.equal(days.at(-1), '2024-03-10');
  assert.equal(calendar.shiftMonth('2026-01', -1), '2025-12');
  assert.equal(calendar.shiftMonth('2026-12', 1), '2027-01');
  assert.equal(calendar.shiftMonth('0001-01', -1), null);
  assert.equal(calendar.shiftMonth('9999-12', 1), null);
  assert.ok(calendar.monthDays('0001-01').filter(Boolean).every(date => date >= '0001-01-01'));
  assert.ok(calendar.monthDays('9999-12').filter(Boolean).every(date => date <= '9999-12-31'));
  for (const value of ['', '2026-13', '0000-01', '2026-1']) assert.throws(() => calendar.monthDays(value));
});

test('calendar rows show shared ISO week numbers and week-years across month and year boundaries', () => {
  const january = calendar.calendarWeeks('2021-01');
  assert.deepEqual(january.map(week => week && [week.week, week.year]), [[53, 2020], [1, 2021], [2, 2021], [3, 2021], [4, 2021], [5, 2021]]);
  const december = calendar.calendarWeeks('2024-12');
  assert.deepEqual(december.at(-1) && [december.at(-1).week, december.at(-1).year], [1, 2025]);
  for (const month of ['0001-01', '2024-02', '2026-10', '9999-12']) {
    const days = calendar.monthDays(month), weeks = calendar.calendarWeeks(month);
    assert.equal(weeks.length, 6);
    days.forEach((date, index) => {
      if (date) assert.deepEqual(weeks[Math.floor(index / 7)], periods.calendarWeekForDate(date));
    });
  }
});

test('reasons explain a date without creating valid data or changing expected weekdays', () => {
  const entry = { validRows: 0, invalidLines: new Set([2]), filteredLines: new Set([3]) };
  assert.equal(calendar.dayState('2026-10-03', null, null, [1, 2, 3, 4, 5]).expected, false);
  assert.equal(calendar.dayState('2026-10-03', null, null, [6]).kind, 'missing');
  const explained = calendar.dayState('2026-10-03', entry, note(), [6]);
  assert.equal(explained.kind, 'explained'); assert.equal(explained.valid, 0);
  assert.equal(explained.invalid, 1); assert.equal(explained.filtered, 1);
  assert.equal(calendar.dayState('2026-10-03', entry, null, [6]).kind, 'issues');
  assert.equal(calendar.dayState('2026-10-18', null, null, [0], { first: '2026-10-02', last: '2026-10-16' }).kind, 'outside');
  assert.equal(calendar.dayState('2026-10-03', { ...entry, validRows: 3 }, note(), [6]).kind, 'observed');
});

test('coverage notes validate real unique calendar dates and bounded nonempty text', () => {
  assert.deepEqual(workspace.normalizeCoverageNotes([note('2026-12-25', '  Feiertag  '), note()]), [note(), note('2026-12-25', 'Feiertag')]);
  for (const values of [[note('2026-02-30')], [note('0000-01-01')], [note('03.10.2026')], [note(), note()],
    [note('2026-10-03', ' ')], [note('2026-10-03', 'x'.repeat(501))], [{ ...note(), updatedAt: 'invalid' }], Array(4097).fill(note())]) {
    assert.throws(() => workspace.normalizeCoverageNotes(values), { code: 'invalid_coverage_notes' });
  }
});

function sourceWorkspace() {
  const text = 'article_id;quantity;delivery_date\nSYN-1;2;2026-10-02\nSYN-1;3;2026-10-04\n';
  const buffer = new TextEncoder().encode(text).buffer;
  const source = { id: 'source-calendar', name: 'synthetic.csv', label: 'synthetic.csv', buffer, size: buffer.byteLength,
    lastModified: 1, sourceType: 'order-lines', encodingMode: 'auto', mapping: { article_id: 0, quantity: 1, delivery_date: 2 },
    customFieldMapping: {}, preparationRules: {}, sourceRules: [], confirmedMapping: { article_id: 0, quantity: 1, delivery_date: 2 } };
  const record = workspace.createWorkspace('Synthetic coverage'); record.files = [source]; record.analyzed = true;
  return record;
}

test('notes persist through metadata-only saves, worker activation, backup restore and workspace isolation', async () => {
  const indexedDB = createFakeIndexedDB(), databaseName = 'calendar-test';
  let repository = storage.createRepository({ indexedDB, databaseName });
  const record = sourceWorkspace(); await repository.createWorkspace(record);
  const bytesBefore = structuredClone(indexedDB.inspect(databaseName, 'workspaceSourceBytes'));
  const loaded = await repository.loadWorkspace(record.id);
  const current = (await repository.listWorkspaces())[0];
  await repository.updateWorkspaceSummary(record.id, { ...current, coverageNotes: [note()] }, { expectedRevision: current.storageRevision });
  assert.deepEqual(indexedDB.inspect(databaseName, 'workspaceSourceBytes'), bytesBefore);
  repository.close(); repository = storage.createRepository({ indexedDB, databaseName });
  const reopened = await repository.loadWorkspace(record.id);
  assert.deepEqual(reopened.coverageNotes, [note()]);
  const prepared = preparation.prepareWorkspaceRecord(reopened, 'de', () => {});
  assert.deepEqual(prepared.workspace.coverageNotes, [note()]);
  const persisted = preparation.persistPreparedWorkspace(prepared);
  assert.deepEqual(persisted.coverageNotes, [note()]);
  const captured = workspace.captureWorkspaceTrusted(record, { ...persisted, files: prepared.files, analysis: prepared.analysis });
  assert.deepEqual(captured.coverageNotes, [note()]);
  const restored = workspace.parseBackup(workspace.stringifyBackup(captured));
  assert.deepEqual(restored.coverageNotes, [note()]);
  assert.deepEqual(new Uint8Array(restored.files[0].buffer), new Uint8Array(record.files[0].buffer));
  assert.deepEqual(workspace.createWorkspace('Another workspace').coverageNotes, []);
  const period = { start: '2026-10-02', end: '2026-10-04' };
  const before = periods.coverageForPeriod(prepared.result.rows, period, [0, 1, 2, 3, 4, 5, 6]);
  const after = periods.coverageForPeriod(preparation.prepareWorkspaceRecord(restored, 'de', () => {}).result.rows, period, [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(after, before); assert.equal(after.status, 'partial');
  assert.deepEqual(loaded.coverageNotes, []);
  repository.close();
});

test('schema 17 migration adds no invented reasons and preserves profile application metadata', () => {
  const record = sourceWorkspace(), source = { ...record.files[0], headers: ['article_id', 'quantity', 'delivery_date'] };
  const profile = workspace.createImportProfile(source, 'Synthetic profile', []);
  record.schemaVersion = 17;
  record.files[0].appliedImportProfile = workspace.recordImportProfileApplication(profile, source);
  const migrated = workspace.migrateWorkspace(record);
  assert.equal(migrated.schemaVersion, 18); assert.deepEqual(migrated.coverageNotes, []);
  assert.deepEqual(migrated.files[0].appliedImportProfile, record.files[0].appliedImportProfile);
});

function stagedSave() {
  const state = { activeWorkspace: { id: 'workspace-one' }, storageReady: true, workspaceLoading: false,
    files: [], coverageNotes: [note()], analysis: { unchanged: true } };
  let saveOptions, finish;
  // The extracted function creates objects in the VM's realm. Structured clone
  // models the normal same-realm application boundary for the strict validator.
  const context = vm.createContext({ state, periods, workspaceModel: { normalizeCoverageNotes: value => workspace.normalizeCoverageNotes(structuredClone(value)) }, renderWorkspaceControls() {},
    persistActiveWorkspace(key, options) { saveOptions = options; return new Promise((resolve, reject) => { finish = { resolve, reject }; }); }
  });
  const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'app.js'), 'utf8').replace(/\r\n/g, '\n');
  vm.runInContext(source.slice(source.indexOf('  async function saveCoverageNote('), source.indexOf('  function buildCoverageData(')), context);
  return { state, save: (date, reason) => context.saveCoverageNote(date, reason),
    commit() { assert.equal(saveOptions.metadataOnly, true); assert.equal(saveOptions.allowWhileLoading, true); saveOptions.onCommitted(); finish.resolve({}); },
    fail() { finish.reject(new Error('synthetic failure')); },
    postCommitFailure() { saveOptions.onCommitted(); finish.reject(new Error('catalog failure')); } };
}

test('reason changes and removals become visible only after a successful save and retain analysis', async () => {
  const h = stagedSave(), task = h.save('2026-10-03', 'Betriebsruhe');
  assert.equal(h.state.coverageNotes[0].reason, note().reason); h.commit(); await task;
  assert.equal(h.state.coverageNotes[0].reason, 'Betriebsruhe'); assert.ok(h.state.analysis.unchanged);
  const removal = h.save('2026-10-03', ''); h.commit(); await removal;
  assert.equal(h.state.coverageNotes.length, 0); assert.equal(h.state.workspaceLoading, false);
});

test('failed reason saves retain committed notes; a post-commit catalog failure retains the saved note', async () => {
  const h = stagedSave(), task = h.save('2026-10-03', 'New draft'); h.fail();
  await assert.rejects(task, /synthetic failure/); assert.equal(h.state.coverageNotes[0].reason, note().reason);
  assert.equal(h.state.workspaceLoading, false);
  const second = h.save('2026-10-03', 'Saved'); h.postCommitFailure(); await second;
  assert.equal(h.state.coverageNotes[0].reason, 'Saved');
});

test('entering coverage refreshes calendar controls after background activation unlocks', () => {
  const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'app.js'), 'utf8').replace(/\r\n/g, '\n');
  const start = source.indexOf('  function renderWorkflow('), end = source.indexOf('    document.body.classList.toggle', start);
  const state = { activeWorkspace: { id: 'workspace-one' }, warehouseLayout: { objects: [] }, files: [],
    result: { rows: [{}] }, activePageTarget: 'main-menu-panel', workspaceLoading: true };
  const locks = [];
  const context = vm.createContext({ state, PAGE_CONFIG: { 'coverage-panel': {}, 'main-menu-panel': {} },
    analysisRowCount: result => result.rows.length, resultHasRetainedData: () => true, hasCoverageContent: () => true,
    renderCoverage: () => locks.push(state.workspaceLoading), closeMappingDrawer() {} });
  vm.runInContext(source.slice(start, end) + '  }', context);
  context.renderWorkflow('coverage-panel'); state.workspaceLoading = false; context.renderWorkflow('coverage-panel');
  assert.deepEqual(locks, [true, false]);
});
