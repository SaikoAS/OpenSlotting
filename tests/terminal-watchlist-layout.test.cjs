'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const start = source.indexOf('  function resizeTerminalWatchlist()');
const end = source.indexOf('  function scheduleWorkspaceFrame()', start);
const resize = source.slice(start, end);

function fixture(options = {}) {
  const values = new Map(), calls = [];
  const watchlist = { style: {
    setProperty: (key, value) => { values.set(key, value); calls.push('write'); },
    getPropertyValue: key => values.get(key) || '', removeProperty: key => values.delete(key)
  } };
  const page = { clientHeight: options.height || 1000, clientTop: options.border || 0, getBoundingClientRect: () => ({ top: 120 }) };
  const context = vm.createContext({
    window: { innerWidth: options.width || 1920, getComputedStyle: () => ({ paddingTop: '16px', paddingBottom: '16px' }) },
    elements: {
      terminalWatchlistRows: { closest: () => watchlist, scrollTop: 480 },
      terminalPanel: { closest: () => page },
      terminalData: { querySelector: () => ({ getBoundingClientRect: () => ({ top: options.top === undefined ? 210 : options.top }) }),
        getClientRects: () => options.hidden ? [] : [{}] }
    },
    terminalView: { scope: 'article', selected: { article: 'synthetic-selected' } },
    renderTerminalWatchlistWindow: selected => calls.push(selected && selected.key)
  });
  vm.runInContext(resize, context);
  return { context, values, calls };
}
test('desktop watchlist fills the frame below its toolbar without the former 750px cap', () => {
  const { context, values, calls } = fixture();
  context.resizeTerminalWatchlist();
  assert.equal(values.get('--terminal-watchlist-height'), '894px');
  assert.deepEqual(calls, ['write', 'synthetic-selected']);
  assert.equal(context.elements.terminalWatchlistRows.scrollTop, 480);
  context.resizeTerminalWatchlist();
  assert.equal(calls.filter(call => call === 'write').length, 1, 'stable measurements do not trigger observer loops');
});
test('page scroll, short windows and borders are included in the available list height', () => {
  for (const [options, expected] of [
    [{ top: 80 }, '968px'], [{ height: 600 }, '494px'],
    [{ height: 100 }, '180px'], [{ border: 2 }, '896px']
  ]) {
    const { context, values } = fixture(options);
    context.resizeTerminalWatchlist();
    assert.equal(values.get('--terminal-watchlist-height'), expected);
  }
});
test('hidden pages are not measured and narrow layouts retain their independent list height', () => {
  const hidden = fixture({ hidden: true });
  hidden.context.resizeTerminalWatchlist();
  assert.equal(hidden.calls.length, 0);
  const narrow = fixture({ width: 760 });
  narrow.values.set('--terminal-watchlist-height', '894px');
  narrow.context.resizeTerminalWatchlist();
  assert.equal(narrow.values.has('--terminal-watchlist-height'), false);
  assert.deepEqual(narrow.calls, ['synthetic-selected']);
});
test('list scrolling remains contained and the measured height applies only to desktop columns', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'terminal-theme.css'), 'utf8');
  assert.doesNotMatch(css, /height:\s*min\(750px/);
  assert.match(css, /\.terminal-watchlist-rows\s*\{[^}]*overscroll-behavior:\s*contain/);
  assert.match(css, /@media \(min-width: 761px\)\s*\{\s*\.terminal-watchlist\s*\{[^}]*--terminal-watchlist-height/);
});
