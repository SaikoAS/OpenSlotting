'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const terminal = require('../terminal.js'), csv = require('../csv.js');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const drawing = source.slice(source.indexOf('  function terminalSvg('), source.indexOf('  function renderTerminalSelectionSummary('));
const interaction = source.slice(source.indexOf('  let terminalChartDrag = null;'), source.indexOf('  elements.terminalLinesHead.addEventListener('));

function fixture(options = {}) {
  const listeners = new Map();
  function node() {
    return { children: [], attributes: {}, dataset: {}, textContent: '', value: '',
      setAttribute(key, value) {
        this.attributes[key] = String(value);
        if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = String(value);
        if (key === 'viewBox') this.viewBox = { baseVal: { width: Number(String(value).split(' ')[2]) } };
      },
      getAttribute(key) { return this.attributes[key]; },
      appendChild(child) { this.children.push(child); },
      replaceChildren(...children) { this.children = children.flatMap(child => child.fragment ? child.children : [child]); },
      querySelector() { return this.children.find(child => child.attributes?.['data-selectable']); },
      setPointerCapture() { this.captured = true; }, hasPointerCapture() { return Boolean(this.captured); },
      releasePointerCapture() { this.captured = false; },
      getBoundingClientRect: () => ({ left: 10, width: options.width || 1200 }),
      remove() {}
    };
  }
  const chart = Object.assign(node(), { clientWidth: options.width || 1200, clientHeight: options.height || 354,
    addEventListener: (type, callback) => listeners.set(type, callback) });
  const elements = { terminalChart: chart, terminalData: { getClientRects: () => [{}] } };
  for (const name of ['ChartDay', 'ChartClear', 'ChartSelectionStatus', 'ChartCoverage', 'FilterFrom', 'FilterTo']) elements['terminal' + name] = node();
  elements.terminalMetric = { value: options.metric || 'quantity' };
  const language = options.language || 'de';
  const dates = ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05'];
  const points = dates.map((date, index) => ({ date, quantity: (options.quantity || 4924164190000n) / BigInt(index + 1), lines: options.lines || 3 }));
  const summary = { points };
  const terminalView = { day: null, lineContext: { summary }, chartData: {
    start: dates[0], end: dates.at(-1), granularity: options.granularity || 'day', expectedWeekdaysConfigured: true,
    coverage: { expectedDayCount: 5, observedDayCount: 5, missingDayCount: 0 },
    buckets: terminal.aggregateChart(points, dates[0], dates.at(-1), options.granularity || 'day', dates, dates)
  } };
  let updates = 0;
  const context = vm.createContext({ elements, terminalView, terminalModel: terminal, core: csv, state: { language },
    window: { innerWidth: options.narrow ? 760 : 1920, getComputedStyle: () => ({ paddingLeft: '8px', paddingRight: '8px', paddingBottom: '4px' }) },
    document: { createElement: node, createElementNS: node, createDocumentFragment: () => ({ ...node(), fragment: true }) },
    setText: (element, text) => { element.textContent = text; }, translate: (key, values) => key + JSON.stringify(values || {}),
    formatNumber: (value, digits = 2) => new Intl.NumberFormat(language, { maximumFractionDigits: digits }).format(value),
    formatQuantity: value => csv.formatScaledQuantity(value, language), formatCalendarDate: date => date,
    updateTerminalFilters: () => { updates++; }
  });
  vm.runInContext(drawing + interaction, context);
  context.renderTerminalChart(summary);
  return { context, chart, elements, terminalView, listeners, updates: () => updates,
    svg: () => chart.querySelector(), labels: () => chart.querySelector().children.filter(child => child.attributes.class === 'terminal-axis-label'),
    event(type, logicalX) {
      const svg = this.svg(), width = svg.viewBox.baseVal.width;
      listeners.get(type)({ button: 0, isPrimary: true, pointerId: 1, target: { closest: () => svg },
        clientX: 10 + logicalX / width * (options.width || 1200), preventDefault() {} });
    } };
}

test('chart uses actual pixel dimensions and preserves text proportions', () => {
  const f = fixture({ width: 1800, height: 180 });
  assert.equal(f.svg().getAttribute('viewBox'), '0 0 1784 176');
  assert.equal(f.svg().getAttribute('preserveAspectRatio'), 'xMinYMin meet');
  assert.equal(f.labels().length, 8);
  for (const label of f.labels()) {
    assert.ok(Number(label.attributes.y) >= 0 && Number(label.attributes.y) <= 176);
  }
});

test('grouped large numbers reserve a wider left gutter and axis fractions stay bounded', () => {
  const f = fixture(), small = fixture({ quantity: 4000000n });
  assert.ok(Number(f.svg().dataset.plotLeft) > Number(small.svg().dataset.plotLeft));
  assert.equal(f.labels()[4].textContent, '492.416,419');
  assert.equal(f.labels()[3].textContent, '369.312,314');
  assert.ok(Number(f.labels()[4].attributes.x) > f.labels()[4].textContent.length * 6);
  const english = fixture({ language: 'en' });
  assert.equal(english.labels()[4].textContent, '492,416.419');
});

test('sub-unit quantities and low line counts retain meaningful distinct ticks', () => {
  const tiny = fixture({ quantity: 1n });
  assert.equal(tiny.labels()[4].textContent, '0,0000001');
  assert.equal(new Set(tiny.labels().slice(0, 5).map(label => label.textContent)).size, 5);
  const counts = fixture({ metric: 'lines', lines: 2 });
  assert.deepEqual(counts.labels().slice(0, 3).map(label => label.textContent), ['0', '1', '2']);
});

test('tooltips keep exact quantity precision despite rounded axis labels', () => {
  const f = fixture({ quantity: 4924164191234n });
  const point = f.svg().children.find(child => child.attributes.class === 'terminal-chart-point');
  assert.match(point.children[0].textContent, /492\.416,4191234/);
  assert.equal(f.labels()[4].textContent, '492.416,419');
});

test('resize redraws changed dimensions once and retains date filters', () => {
  const f = fixture(); f.elements.terminalFilterFrom.value = '2026-08-02';
  f.context.resizeTerminalChart(); assert.equal(f.svg().getAttribute('viewBox'), '0 0 1184 350');
  const previous = f.svg(); f.context.resizeTerminalChart(); assert.equal(f.svg(), previous);
  f.chart.clientWidth = 1600; f.chart.clientHeight = 180; f.context.resizeTerminalChart();
  assert.equal(f.svg().getAttribute('viewBox'), '0 0 1584 176');
  assert.equal(f.elements.terminalFilterFrom.value, '2026-08-02');
  const narrow = fixture({ narrow: true });
  assert.equal(narrow.svg().getAttribute('viewBox'), '0 0 900 300');
});

test('click and drag selection follow dynamic plot bounds after resizing', () => {
  const f = fixture({ width: 1800, height: 180 });
  const left = Number(f.svg().dataset.plotLeft), right = Number(f.svg().dataset.plotRight);
  f.event('pointerdown', left - 1); assert.equal(f.svg().captured, undefined);
  f.event('pointerdown', left); f.event('pointermove', right); f.event('pointerup', right);
  assert.equal(f.elements.terminalFilterFrom.value, '2026-08-01');
  assert.equal(f.elements.terminalFilterTo.value, '2026-08-05');
  f.event('pointerdown', right); f.event('pointerup', right);
  assert.equal(f.terminalView.day, '2026-08-05');
  assert.equal(f.updates(), 2);
});

test('line axes use exact integer intervals and grouped clicks retain bucket date boundaries', () => {
  const counts = fixture({ metric: 'lines', lines: 5 });
  assert.deepEqual(counts.labels().slice(0, 5).map(label => label.textContent), ['0', '2', '4', '6', '8']);
  const week = fixture({ granularity: 'week' });
  const left = Number(week.svg().dataset.plotLeft);
  week.event('pointerdown', left); week.event('pointerup', left);
  assert.equal(week.elements.terminalFilterFrom.value, '2026-08-01');
  assert.equal(week.elements.terminalFilterTo.value, '2026-08-02');
});

test('explained missing days have exact-date markers and reasons in daily, weekly and monthly charts', () => {
  for (const granularity of ['day', 'week', 'month']) {
    const f = fixture({ granularity });
    const data = f.terminalView.chartData;
    const dates = ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05'];
    data.coverage = { expectedDates: dates, observedDates: dates.filter(date => date !== '2026-08-03'),
      expectedDayCount: 5, observedDayCount: 4, missingDayCount: 1 };
    data.coverageNotes = [{ date: '2026-08-03', reason: 'Feiertag' }, { date: '2026-08-02', reason: 'Data exists' }];
    // The selected article has no rows; coverage still uses the entire workspace.
    data.buckets = terminal.aggregateChart([], data.start, data.end, granularity, dates, data.coverage.observedDates);
    f.chart.replaceChildren(); f.context.renderTerminalChart({ points: [] });
    const markers = f.svg().children.filter(child => child.attributes.class === 'terminal-coverage-explained');
    assert.equal(markers.length, 1);
    assert.equal(markers[0].attributes['data-coverage-note-date'], '2026-08-03');
    assert.match(markers[0].children[0].textContent, /Feiertag/);
    assert.match(markers[0].attributes['aria-label'], /2026-08-03/);
    assert.match(f.elements.terminalChartCoverage.textContent, /"unknown":"0","explained":"1"/);
    assert.equal(f.svg().children.some(child => child.attributes.class === 'terminal-chart-point'), false);
  }
});
