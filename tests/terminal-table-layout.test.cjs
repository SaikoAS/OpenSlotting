'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const start = source.indexOf('  function resizeTerminalTable()');
const end = source.indexOf('  function scheduleWorkspaceFrame()', start);

function fixture(options = {}) {
  const values = new Map(), classes = new Set(), writes = [], calls = [];
  const page = { clientHeight: options.height || 1200, clientTop: options.border || 0,
    scrollTop: options.scroll || 0, getBoundingClientRect: () => ({ top: 120 }),
    classList: { remove: key => classes.delete(key), toggle: (key, enabled) => enabled ? classes.add(key) : classes.delete(key) } };
  const chartHeight = () => parseFloat(values.get('--terminal-chart-height') || '354');
  const table = { scrollTop: 480, getBoundingClientRect: () => ({ top: (options.top || 1000) + chartHeight() - 354 - page.scrollTop }) };
  const context = vm.createContext({ elements: {
    terminalPanel: { closest: () => page, style: {
      getPropertyValue: key => values.get(key) || '',
      setProperty: (key, value) => { values.set(key, value); writes.push([key, value]); },
      removeProperty: key => values.delete(key)
    } },
    terminalLinesScroll: table,
    terminalChart: { getBoundingClientRect: () => ({ height: chartHeight() }) },
    terminalData: { getClientRects: () => options.hidden ? [] : [{}] }
  }, window: { innerWidth: options.width || 1920, getComputedStyle: () => ({ paddingBottom: '16px' }) },
  renderTerminalLineRows: () => calls.push('refill') });
  vm.runInContext(source.slice(start, end), context);
  return { values, classes, writes, calls, page, table, context, resize: () => context.resizeTerminalTable() };
}

test('table fills remaining workspace height instead of extending the page', () => {
  const f = fixture(); f.resize();
  assert.equal(f.values.get('--terminal-chart-height'), '354px');
  assert.equal(f.values.get('--terminal-lines-height'), '302px');
  assert.equal(f.classes.has('terminal-fitted'), true);
  assert.equal(f.page.scrollTop, 0);
  assert.equal(f.table.scrollTop, 480, 'row scrolling is preserved');
  assert.deepEqual(f.calls, ['refill']);
  f.resize();
  assert.equal(f.writes.length, 2, 'stable measurements must not keep writing observed sizes');
});

test('shorter frames shrink the chart first and still keep table rows visible', () => {
  const f = fixture({ height: 900 }); f.resize();
  assert.equal(f.values.get('--terminal-chart-height'), '180px');
  assert.equal(f.values.get('--terminal-lines-height'), '176px');
  assert.equal(f.classes.has('terminal-fitted'), true);
  f.page.clientHeight = 1400; f.resize();
  assert.equal(f.values.get('--terminal-chart-height'), '354px');
  assert.equal(f.values.get('--terminal-lines-height'), '502px');
  assert.equal(f.classes.has('terminal-fitted'), true);
});

test('previous page scrolling does not inflate the available table space', () => {
  const f = fixture({ scroll: 180, border: 2 }); f.resize();
  assert.equal(f.values.get('--terminal-lines-height'), '304px');
  assert.equal(f.page.scrollTop, 0);
});

test('wrapping filters and changed headings are included in the measured height', () => {
  const f = fixture({ top: 1100 }); f.resize();
  assert.equal(f.values.get('--terminal-chart-height'), '336px');
  assert.equal(f.values.get('--terminal-lines-height'), '220px');
  assert.equal(f.classes.has('terminal-fitted'), true);
});

test('very small windows keep controls accessible using a scrolling fallback', () => {
  const f = fixture({ height: 600, scroll: 80 });
  f.values.set('--terminal-lines-height', '300px'); f.classes.add('terminal-fitted'); f.resize();
  assert.equal(f.classes.has('terminal-fitted'), false);
  assert.equal(f.values.get('--terminal-lines-height'), '108px');
  assert.equal(f.values.get('--terminal-chart-height'), '180px');
  assert.equal(f.page.scrollTop, 80);
});

test('narrow and empty desks clear fitted dimensions instead of constraining other pages', () => {
  for (const options of [{ width: 760 }, { hidden: true }]) {
    const f = fixture(options);
    f.values.set('--terminal-lines-height', '300px'); f.values.set('--terminal-chart-height', '200px');
    f.classes.add('terminal-fitted'); f.resize();
    assert.equal(f.classes.has('terminal-fitted'), false);
    assert.equal(f.values.size, 0);
    assert.equal(f.calls.length, 0);
  }
});

test('fitted desk contains scrolling and observes chart, controls and virtual viewport changes', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'terminal-theme.css'), 'utf8');
  assert.match(css, /#main-menu-page\.terminal-fitted\s*\{\s*overflow-y:\s*hidden/);
  assert.match(css, /\.terminal-lines-scroll\s*\{[^}]*--terminal-lines-height/);
  assert.match(css, /\.terminal-lines-scroll\s*\{[^}]*overscroll-behavior:\s*contain/);
  assert.match(source, /resizeTerminalTable\(\);\s*resizeTerminalWatchlist\(\);/);
  assert.match(source, /'\.terminal-titlebar', '\.terminal-chart-panel', '\.terminal-lines-toolbar', '\.terminal-lines-filters', '#terminal-lines-scroll'/);
});
