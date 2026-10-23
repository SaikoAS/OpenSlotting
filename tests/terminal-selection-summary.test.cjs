'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const csv = require('../csv.js'), terminal = require('../terminal.js');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const start = source.indexOf('  function renderTerminalSelectionSummary()');
const end = source.indexOf('  function renderTerminalWatchlistWindow(', start);
const render = source.slice(start, end);

function node() {
  return { children: [], textContent: '', hidden: true,
    classList: { toggle(name, value) { this.owner.hidden = value; } },
    appendChild(child) { this.children.push(child); },
    replaceChildren(...children) {
      this.children = children.flatMap(child => child.fragment ? child.children : [child]);
    } };
}

function fixture(scope = 'article') {
  const rows = csv.importCsv([
    'order_id;article_id;quantity;delivery_date;customer_id',
    'O-1;A-1;2;2026-08-01;C-1',
    'O-1;A-2;1;2026-08-01;C-1',
    'O-1;A-1;3;2026-09-01;C-2',
    'O-2;A-1;4;2026-09-02;C-1'
  ].join('\n')).rows;
  const elements = Object.fromEntries(['Summary', 'Title', 'Range', 'Metrics', 'Coverage']
    .map(name => ['terminalSelection' + name, node()]));
  elements.terminalSelectionSummary.classList.owner = elements.terminalSelectionSummary;
  elements.terminalFilterFrom = { value: '' };
  elements.terminalFilterTo = { value: '' };
  const key = scope === 'article' ? 'A-1' : 'C-1';
  // The model owns composite order identities, including the customer.
  const orderKey = terminal.entityKey(rows[0], 'order');
  const terminalView = { day: null, filteredLines: [], lineContext: {
    rows, scope, key: scope === 'order' ? orderKey : key, latestDate: '2026-09-02', range: 'all'
  }, chartData: { start: '2026-08-01', end: '2026-09-02', expectedWeekdaysConfigured: true,
    coverage: { expectedDates: ['2026-08-01', '2026-09-01', '2026-09-02', '2026-09-03'],
      observedDates: ['2026-08-01', '2026-09-01', '2026-09-02'] } } };
  let summaries = 0;
  const context = vm.createContext({ elements, terminalView,
    terminalModel: { ...terminal, summarizeSelection(...args) { summaries++; return terminal.summarizeSelection(...args); } },
    document: { createElement: node, createDocumentFragment: () => ({ ...node(), fragment: true }) },
    translate: (key, values) => key + (values ? JSON.stringify(values) : ''),
    setText: (element, text) => { element.textContent = text; },
    formatCalendarDate: value => value || '', formatNumber: String, formatQuantity: String
  });
  vm.runInContext(render, context);
  return { elements, terminalView, render: () => context.renderTerminalSelectionSummary(),
    summaries: () => summaries, metrics: () => elements.terminalSelectionMetrics.children
      .map(item => item.children.map(child => child.textContent)) };
}

test('period summary is visible initially and includes every displayed date and exact quantity', () => {
  const f = fixture(); f.render();
  assert.equal(f.elements.terminalSelectionSummary.hidden, false);
  assert.equal(f.elements.terminalSelectionTitle.textContent, 'terminal_total_period');
  assert.equal(f.elements.terminalSelectionRange.textContent, '2026-08-01 – 2026-09-02');
  assert.deepEqual(f.metrics(), [
    ['terminal_quantity', String(9n * csv.QUANTITY_SCALE)], ['terminal_lines', '3'],
    ['terminal_distinct_orders', '3'], ['terminal_distinct_customers', '2'], ['terminal_selection_days', '3']
  ]);
  assert.match(f.elements.terminalSelectionCoverage.textContent, /"observed":"3","expected":"3","unknown":"0"/);
});

test('day, custom and open-ended date selection update metrics; clearing returns to full period', () => {
  const f = fixture(); f.terminalView.day = '2026-09-02'; f.render();
  assert.equal(f.elements.terminalSelectionTitle.textContent, 'terminal_selection_title');
  assert.equal(f.metrics()[0][1], String(4n * csv.QUANTITY_SCALE));
  f.terminalView.day = null;
  f.elements.terminalFilterFrom.value = '2026-09-01'; f.render();
  assert.equal(f.metrics()[1][1], '2');
  f.elements.terminalFilterTo.value = '2026-09-01'; f.render();
  assert.equal(f.metrics()[0][1], String(3n * csv.QUANTITY_SCALE));
  f.elements.terminalFilterFrom.value = ''; f.render();
  assert.equal(f.metrics()[1][1], '2');
  f.elements.terminalFilterTo.value = ''; f.render();
  assert.equal(f.elements.terminalSelectionSummary.hidden, false);
  assert.equal(f.elements.terminalSelectionTitle.textContent, 'terminal_total_period');
  assert.equal(f.metrics()[1][1], '3');
});

test('main period bounds and customer/order article counts survive KPI consolidation', () => {
  const f = fixture();
  f.terminalView.lineContext.range = '30'; f.terminalView.chartData.start = '2026-08-04'; f.render();
  assert.equal(f.metrics()[1][1], '2');
  assert.equal(f.metrics()[0][1], String(7n * csv.QUANTITY_SCALE));
  for (const scope of ['customer', 'order']) {
    const scoped = fixture(scope); scoped.render();
    assert.deepEqual(scoped.metrics()[3], ['terminal_distinct_articles', '2']);
    scoped.elements.terminalFilterTo.value = '2026-08-01'; scoped.render();
    assert.deepEqual(scoped.metrics()[3], ['terminal_distinct_articles', '2']);
  }
});

test('non-date table filters do not change the summary or rescan cached lines', () => {
  const f = fixture(); f.render();
  const cache = f.terminalView.selectionCache, metrics = f.metrics();
  f.terminalView.filteredLines = []; f.render();
  assert.equal(f.terminalView.selectionCache, cache);
  assert.equal(f.summaries(), 1);
  assert.deepEqual(f.metrics(), metrics);
  f.elements.terminalFilterFrom.value = '2026-09-02'; f.render();
  assert.equal(f.summaries(), 2);
  assert.match(f.elements.terminalSelectionCoverage.textContent, /terminal_selection_scope_note/);
});

test('empty and invalid selections retain explicit evidence instead of stale metrics', () => {
  const f = fixture(); f.render();
  f.elements.terminalFilterFrom.value = '2026-08-02';
  f.elements.terminalFilterTo.value = '2026-08-31'; f.render();
  assert.equal(f.metrics()[1][1], '0');
  assert.match(f.elements.terminalSelectionCoverage.textContent, /terminal_selection_no_rows/);
  f.elements.terminalFilterFrom.value = '2026-09-02'; f.render();
  assert.equal(f.elements.terminalSelectionSummary.hidden, false);
  assert.equal(f.metrics().length, 0);
  assert.equal(f.elements.terminalSelectionCoverage.textContent, 'terminal_selection_invalid');
  f.terminalView.lineContext = null; f.render();
  assert.equal(f.elements.terminalSelectionSummary.hidden, true);
});

test('summary is the only KPI group on the analysis desk', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'terminal-theme.css'), 'utf8');
  assert.doesNotMatch(html, /terminal-kpis/);
  assert.doesNotMatch(source, /terminalKpis/);
  assert.doesNotMatch(css, /\.terminal-kpis/);
  assert.match(css, /\.terminal-selection-metrics > div\s*\{[^}]*flex-wrap:\s*wrap/);
});
