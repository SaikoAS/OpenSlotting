'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const core = require('../csv.js'), periods = require('../periods.js');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8').replace(/\r\n/g, '\n');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function appFunction(name) {
  const start = source.search(new RegExp('  (?:async )?function ' + name + '\\('));
  assert.ok(start >= 0, name);
  const next = source.slice(start + 1).search(/\n  (?:async )?function \w+\(/);
  return source.slice(start, start + next + 1);
}
function element(id = '') {
  const classes = new Set(), handlers = {};
  return { id, dataset: {}, value: '', checked: false, children: [], textContent: '', handlers,
    classList: { add: key => classes.add(key), remove: key => classes.delete(key), contains: key => classes.has(key),
      toggle: (key, on) => on ? classes.add(key) : classes.delete(key) },
    setAttribute() {}, removeAttribute() {}, scrollIntoView() {}, focus() { this.focused = true; },
    replaceChildren() { this.children = []; this.value = ''; }, appendChild(child) { this.children.push(child); },
    addEventListener(type, handler) { handlers[type] = handler; } };
}
function fixture(result = null, options = {}) {
  const state = { activeWorkspace: { id: 'synthetic' }, storageReady: true, workspaceLoading: false, files: [], language: 'en',
    result, comparison: null, periodSettings: result ? periods.defaultSettings(result.rows) : periods.normalizeSettings(),
    coverageNotes: [], warehouseLayout: { objects: [] }, activePageTarget: 'main-menu-panel', articleRegistry: null, ...options };
  const ids = ['comparisonSetupHint', 'comparisonSetupAction', 'periodAStatus', 'periodBStatus', 'comparePeriods', 'resetPeriods',
    'periodAWeek', 'periodBWeek', 'periodAName', 'periodAStart', 'periodAEnd', 'periodBName', 'periodBStart', 'periodBEnd',
    'periodAWeekFields', 'periodBWeekFields', 'periodACustomFields', 'periodBCustomFields', 'calendarWeekSummary',
    'comparisonPanel', 'comparisonSetup', 'editPeriods', 'coveragePanel', 'periodMessage', 'pageContextKicker',
    'pageContextTitle', 'pageContextStatus', 'returnMainMenu', 'returnWorkspaceSelection'];
  const elements = Object.fromEntries(ids.map(id => [id, element(id)]));
  elements.periodModes = ['weeks', 'custom'].map(value => Object.assign(element(), { value }));
  elements.expectedWeekdays = Array.from({ length: 7 }, (_, day) => Object.assign(element(), { value: String(day) }));
  elements.pageViews = ['comparison-page', 'coverage-page', 'workspace-page', 'main-menu-page'].map(element);
  elements.workflowSteps = ['comparison-panel', 'coverage-panel', 'workspace-panel', 'main-menu-panel'].map(target =>
    Object.assign(element(), { dataset: { workflowTarget: target } }));
  const messages = [], saves = [], body = element();
  const context = vm.createContext({ state, elements, core, periods, comparisonSetupCache: periods.createPeriodViewCache(), document: { body, createElement: () => element() },
    translate: key => key, setText: (node, text) => { node.textContent = text; }, formatCalendarDate: value => value,
    coverageText: coverage => coverage.status, invalidateViewCaches() {},
    hasCoverageContent: () => Boolean(state.result), resultHasRetainedData: result => result.rows.length > 0,
    analysisRowCount: result => result.rows.length, renderMappingViews() {}, renderTerminal() {}, closeMappingDrawer() {},
    scheduleWorkspaceFrame() {}, coverageCalendar: null,
    renderCoverage: () => context.renderComparisonSetup(),
    renderComparison: () => elements.comparisonPanel.classList.toggle('hidden', !state.comparison),
    showPeriodMessage: key => messages.push(key),
    persistActiveWorkspace: (...args) => { saves.push(args); return Promise.resolve(); } });
  vm.runInContext('const PAGE_CONFIG = ' + source.match(/const PAGE_CONFIG = ({[\s\S]*?});/)[1] + ';\n' +
    ['selectedPeriodMode', 'calendarWeekPeriod', 'periodSettingsFromControls', 'periodSettingsValid', 'periodSettingsStorable',
      'populateCalendarWeekSelect', 'renderPeriodControls', 'settingsForDetectedCalendarWeeks', 'renderComparisonSetup', 'handlePeriodSettingsChange',
      'compareSelectedPeriods', 'renderWorkflow'].map(appFunction).join('\n'), context);
  const start = source.indexOf("  elements.resetPeriods.addEventListener('click'");
  vm.runInContext(source.slice(start, source.indexOf('  elements.periodModes.forEach', start)), context);
  return { state, elements, context, messages, saves };
}
function datedResult() {
  return core.importCsv('sku;qty;date\nSYN-1;2;2026-08-03\nSYN-1;5;2026-08-10\n',
    { article_id: 0, quantity: 1, delivery_date: 2 });
}

test('comparison navigation opens the setup without an existing result or workspace', () => {
  for (const activeWorkspace of [null, { id: 'empty' }]) {
    const f = fixture(null, { activeWorkspace });
    f.context.renderWorkflow('comparison-panel');
    assert.equal(f.state.activePageTarget, 'comparison-panel');
    assert.equal(f.elements.workflowSteps[0].disabled, false);
    assert.equal(f.elements.pageViews[0].classList.contains('hidden'), false);
    assert.equal(f.elements.comparePeriods.disabled, true);
    assert.equal(f.elements.comparisonSetupHint.textContent, activeWorkspace ? 'comparison_setup_no_data' : 'comparison_setup_no_workspace');
    assert.equal(f.elements.comparisonSetupAction.dataset.workflowTarget, activeWorkspace ? 'import-panel' : 'workspace-panel');
  }
});

test('period selectors and weekday settings belong to comparison with one copy of every control', () => {
  const coverage = html.slice(html.indexOf('id="coverage-page"'), html.indexOf('id="comparison-page"'));
  const comparison = html.slice(html.indexOf('id="comparison-page"'), html.indexOf('id="analysis-page"'));
  for (const id of ['comparison-setup', 'period-a-week', 'period-b-week', 'period-a-start', 'period-b-end', 'compare-periods', 'reset-periods']) {
    assert.match(comparison, new RegExp('id="' + id + '"'));
    assert.doesNotMatch(coverage, new RegExp('id="' + id + '"'));
    assert.equal(html.split('id="' + id + '"').length - 1, 1);
  }
  assert.match(comparison, /<details class="comparison-calendar-options">[\s\S]*name="expected-weekday"/);
  assert.match(coverage, /data-workflow-target="comparison-panel"/);
});

test('detected weeks can be compared and changed in place, invalidating previous results', () => {
  const f = fixture(datedResult()); f.context.renderWorkflow('comparison-panel');
  assert.equal(f.elements.periodAWeek.value, '2026-W32');
  assert.equal(f.elements.periodBWeek.value, '2026-W33');
  assert.equal(f.elements.comparePeriods.disabled, false);
  f.context.compareSelectedPeriods();
  assert.ok(f.state.comparison); assert.equal(f.state.activePageTarget, 'comparison-panel');
  f.elements.periodAWeek.value = '2026-W33'; f.context.handlePeriodSettingsChange();
  assert.equal(f.state.comparison, null);
  assert.equal(f.state.periodSettings.periodA.start, '2026-08-10');
  assert.equal(f.state.activePageTarget, 'comparison-panel');
  assert.equal(f.elements.comparisonPanel.classList.contains('hidden'), true);
  assert.ok(f.saves.length > 0);
  f.context.compareSelectedPeriods();
  assert.ok(f.messages.includes('period_overlap'));
});

test('custom periods and weekdays remain editable on comparison and invalid ranges cannot be submitted', () => {
  const f = fixture(datedResult()); f.context.renderWorkflow('comparison-panel');
  f.elements.periodModes.forEach(control => { control.checked = control.value === 'custom'; });
  f.elements.periodAStart.value = '2026-08-03'; f.elements.periodAEnd.value = '2026-08-03';
  f.elements.periodBStart.value = '2026-08-10'; f.elements.periodBEnd.value = '2026-08-10';
  f.context.handlePeriodSettingsChange(); f.context.compareSelectedPeriods();
  assert.equal(f.state.comparison.settings.mode, 'custom');
  assert.equal(f.state.activePageTarget, 'comparison-panel');
  f.elements.periodAStart.value = '2026-08-11'; f.context.handlePeriodSettingsChange();
  assert.equal(f.elements.comparePeriods.disabled, true); assert.equal(f.state.comparison, null);
  f.elements.expectedWeekdays.forEach(control => { control.checked = false; });
  f.context.handlePeriodSettingsChange(); assert.ok(f.messages.includes('weekdays_required'));
  assert.equal(f.state.activePageTarget, 'comparison-panel');
});

test('reset and edit periods remain on comparison; editing focuses the selector', () => {
  const f = fixture(datedResult()); f.context.renderWorkflow('comparison-panel'); f.context.compareSelectedPeriods();
  f.elements.editPeriods.handlers.click();
  assert.equal(f.state.activePageTarget, 'comparison-panel'); assert.equal(f.elements.periodAWeek.focused, true);
  f.elements.resetPeriods.handlers.click();
  assert.equal(f.state.comparison, null); assert.equal(f.state.activePageTarget, 'comparison-panel');
  assert.equal(f.elements.periodAWeek.value, '2026-W32');
});

test('busy workspaces lock period controls and reject edits, comparison and reset', () => {
  for (const patch of [{ storageReady: false }, { workspaceLoading: true }, { files: [{ reading: true }] }]) {
    const f = fixture(datedResult(), patch), original = f.state.periodSettings;
    f.context.renderWorkflow('comparison-panel');
    assert.equal(f.elements.workflowSteps[0].disabled, false);
    assert.equal(f.elements.comparePeriods.disabled, true); assert.equal(f.elements.resetPeriods.disabled, true);
    assert.equal(f.elements.periodModes[0].disabled, true); assert.equal(f.elements.expectedWeekdays[0].disabled, true);
    f.context.handlePeriodSettingsChange(); f.context.compareSelectedPeriods(); f.elements.resetPeriods.handlers.click();
    assert.equal(f.state.periodSettings, original); assert.equal(f.state.comparison, null); assert.equal(f.saves.length, 0);
  }
});

test('undated or issue-only data keeps the page accessible and points to source mapping', () => {
  const f = fixture({ rows: [], featureReadiness: {} }, { files: [{ id: 'source' }] });
  f.context.renderWorkflow('comparison-panel');
  assert.equal(f.elements.comparisonSetupHint.textContent, 'comparison_setup_no_dates');
  assert.equal(f.elements.comparisonSetupAction.dataset.workflowTarget, 'mapping-panel');
  assert.equal(f.elements.comparePeriods.disabled, true);
  f.context.compareSelectedPeriods();
  assert.equal(f.state.comparison, null);
  assert.ok(f.messages.includes('comparison_setup_no_dates'));
});

test('menu reopening and language changes do not scan source rows again', () => {
  const result = datedResult(); let reads = 0;
  result.rows = result.rows.map(row => {
    const date = row.delivery_date;
    return { ...row, get delivery_date() { reads++; return date; } };
  });
  const f = fixture(result);
  f.state.periodSettings = f.context.settingsForDetectedCalendarWeeks(f.state.periodSettings, result);
  f.context.renderComparisonSetup();
  reads = 0;
  f.context.renderWorkflow('main-menu-panel'); f.context.renderWorkflow('comparison-panel');
  f.context.renderWorkflow('main-menu-panel'); f.context.renderWorkflow('comparison-panel');
  assert.equal(reads, 0, 'navigation must reuse detected weeks and both coverage projections');
  f.state.language = 'de'; f.context.translate = key => 'DE:' + key;
  f.context.renderWorkflow('comparison-panel');
  assert.equal(reads, 0, 'localized labels must not invalidate numerical projections');
  assert.match(f.elements.periodAWeek.children[0].textContent, /^DE:calendar_week_option/);
  f.elements.periodAName.value = 'Renamed'; f.context.handlePeriodSettingsChange();
  assert.equal(reads, 0, 'renaming a period does not change coverage');
  f.elements.expectedWeekdays[0].checked = false; f.context.handlePeriodSettingsChange();
  assert.ok(reads > 0, 'changed expected weekdays must recompute coverage');
  reads = 0; f.context.renderWorkflow('comparison-panel'); assert.equal(reads, 0);
});
