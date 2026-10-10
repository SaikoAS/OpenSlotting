const assert = require('node:assert/strict');
const test = require('node:test');

const csv = require('../csv.js');
const periods = require('../periods.js');
const terminal = require('../terminal.js');

function rows() {
  return csv.importCsv([
    'order_id;article_id;article_name;quantity;delivery_date;customer_id;customer_name',
    'O-1;A-1;Article one;2;2026-08-01;C-1;Customer one',
    'O-1;A-2;Article two;1;2026-08-01;C-1;Customer one',
    'O-1;A-1;Article one;3;2026-09-01;C-2;Customer two',
    'O-2;A-1;Article one;4;2026-09-02;C-1;Customer one',
    ';A-3;Article three;5;2026-09-02;;'
  ].join('\n') + '\n').rows;
}

test('terminal index groups article, customer and composite customer-order identities', () => {
  const index = terminal.buildIndex(rows());
  assert.equal(index.latestDate, '2026-09-02');
  assert.equal(index.earliestDate, '2026-08-01');
  assert.equal(index.entities.article.length, 3);
  assert.equal(index.entities.customer.length, 2);
  assert.equal(index.entities.order.length, 3);
  assert.deepEqual(index.coverage, { total: 5, article: 5, customer: 4, order: 4 });
  assert.equal(index.entities.article.find((entry) => entry.key === 'A-1').quantity, 9n * csv.QUANTITY_SCALE);
  assert.equal(index.entities.order.filter((entry) => entry.label === 'O-1').length, 2);
  assert.ok(index.entities.customer.every((entry) => entry.key));
});

test('terminal range is anchored to the newest delivery date and keeps exact quantities', () => {
  const source = rows();
  const index = terminal.buildIndex(source);
  const summary = terminal.selectedSummary(source, 'article', 'A-1', index.latestDate, '30');
  assert.equal(summary.start, '2026-08-04');
  assert.equal(summary.quantity, 7n * csv.QUANTITY_SCALE);
  assert.equal(summary.lines, 2);
  assert.equal(summary.orders, 2);
  assert.equal(summary.customers, 2);
  assert.deepEqual(summary.points.map((point) => point.date), ['2026-09-01', '2026-09-02']);
  assert.equal(summary.latest[0].delivery_date, '2026-09-02');
  assert.deepEqual(terminal.selectedLines(source, 'article', 'A-1', index.latestDate, '30')
    .map((line) => line.delivery_date), ['2026-09-02', '2026-09-01']);
});

test('terminal can index one analysis level without constructing order and customer lists', () => {
  const index = terminal.buildIndex(rows(), ['article']);
  assert.equal(index.entities.article.length, 3);
  assert.equal(index.entities.customer, undefined);
  assert.equal(index.entities.order, undefined);
  assert.equal(index.coverage.customer, 4);
});

test('overview can expose every selected line with mapped Colli and source evidence', () => {
  const text = ['order_id;article_id;quantity;delivery_date;customer_id;Colli'];
  for (let index = 1; index <= 40; index += 1) {
    text.push('O-' + index + ';A-1;2;2026-09-01;C-1;' + index);
  }
  text.push('OTHER;A-2;2;2026-09-01;C-1;99');
  const source = csv.importCsv(text.join('\n') + '\n', undefined,
    { sourceFile: { id: 'src-1', name: 'orders.csv' } }).rows;
  const index = terminal.buildIndex(source);
  const summary = terminal.selectedSummary(source, 'article', 'A-1', index.latestDate, 'all');
  const all = terminal.selectedLines(source, 'article', 'A-1', index.latestDate, 'all');
  assert.equal(summary.latest.length, 25);
  assert.equal(summary.lines, 40);
  assert.equal(all.length, 40);
  assert.deepEqual(all.slice(0, 25), summary.latest);
  assert.equal(all[0].source_line, 41);
  assert.equal(all[0].sales_unit_count, 40n * csv.QUANTITY_SCALE);
  assert.equal(all[39].source_line, 2);
  assert.equal(all[39].source_file_id, 'src-1');
});

test('overview window spans all rows while keeping only a small visible slice', () => {
  assert.deepEqual(terminal.visibleLineWindow(102, 0, 360, 36, 8),
    { start: 0, end: 18, before: 0, after: 3024 });
  assert.deepEqual(terminal.visibleLineWindow(102, 3312, 360, 36, 8),
    { start: 84, end: 102, before: 3024, after: 0 });
});

test('watchlist ranks all entities by the selected metric and optional period', () => {
  const source = rows();
  const index = terminal.buildIndex(source, ['article']);
  const all = terminal.rankEntities(source, index.entities.article, 'article', index.latestDate, 'all', 'quantity');
  const period = terminal.rankEntities(source, index.entities.article, 'article', index.latestDate, '30', 'quantity');
  assert.deepEqual(all.map((item) => item.key), ['A-1', 'A-3', 'A-2']);
  assert.deepEqual(period.map((item) => item.key), ['A-1', 'A-3', 'A-2']);
  assert.equal(period.find((item) => item.key === 'A-2').quantity, 0n);
  assert.equal(period.find((item) => item.key === 'A-1').quantity, 7n * csv.QUANTITY_SCALE);
  const byLines = terminal.rankEntities(source, index.entities.article, 'article', index.latestDate, 'all', 'lines');
  assert.equal(byLines[0].key, 'A-1');
  assert.equal(byLines[0].lines, 3);
});

test('table filters the full selected range and sorts exact quantities and Colli', () => {
  const text = [
    'order_id;article_id;quantity;delivery_date;customer_id;customer_name;Colli',
    'O-1;A-1;2;2026-09-01;C-1;North;10',
    'O-2;A-1;12;2026-09-02;C-2;South;3',
    'O-3;A-1;5;2026-09-02;C-1;North;20'
  ].join('\n') + '\n';
  const source = csv.importCsv(text, undefined, { sourceFile: { id: 's', name: 'orders.csv' } }).rows;
  const lines = terminal.selectedLines(source, 'article', 'A-1', '2026-09-02', 'all');
  assert.deepEqual(terminal.filterLines(lines, { day: '2026-09-02', customer: 'north', source: 'orders.csv' })
    .map((row) => row.order_id), ['O-3']);
  assert.deepEqual(terminal.filterLines(lines, { from: '2026-09-02', to: '2026-09-02', order: 'O-2' })
    .map((row) => row.order_id), ['O-2']);
  assert.deepEqual(terminal.sortLines(lines, 'quantity', 'desc').map((row) => row.order_id), ['O-2', 'O-3', 'O-1']);
  assert.deepEqual(terminal.sortLines(lines, 'sales_unit_count', 'desc').map((row) => row.order_id), ['O-3', 'O-1', 'O-2']);
});

test('CSV export keeps filtered order, quotes values and protects spreadsheet text', () => {
  const lines = [{ customer: '=SUM(1,2)', quantity: '-1.25', source: 'a"b.csv' }];
  const output = terminal.exportLinesCsv(lines, [
    { key: 'customer', label: 'Customer' },
    { key: 'quantity', label: 'Quantity', number: true },
    { key: 'source', label: 'Source' }
  ], (row, key) => row[key]);
  assert.equal(output, '\uFEFF"Customer";"Quantity";"Source"\r\n"\'=SUM(1,2)";"-1.25";"a""b.csv"\r\n');
});

test('chart drag maps both directions to an inclusive calendar range without adding data points', () => {
  const points = [{ date: '2026-09-01' }, { date: '2026-09-05' }, { date: '2026-09-10' }];
  assert.deepEqual(terminal.chartDateRange(points, 64, 836, 64, 836),
    { from: '2026-09-01', to: '2026-09-10' });
  assert.deepEqual(terminal.chartDateRange(points, 836, 64, 64, 836),
    { from: '2026-09-01', to: '2026-09-10' });
  assert.equal(terminal.chartDateAtX(points, 450, 64, 836), '2026-09-06');
  assert.equal(terminal.chartDateAtX(points, -100, 64, 836), '2026-09-01');
  assert.equal(terminal.chartDateAtX(points, 1000, 64, 836), '2026-09-10');
  assert.equal(terminal.chartDateRange([], 64, 836, 64, 836), null);
});

test('selected chart range summarizes exact values without applying unrelated table filters', () => {
  const source = rows();
  const lines = terminal.selectedLines(source, 'article', 'A-1', '2026-09-02', 'all');
  assert.deepEqual(terminal.summarizeSelection(lines, '2026-09-01', '2026-09-02'), {
    quantity: 7n * csv.QUANTITY_SCALE, lines: 2, orders: 2, customers: 2, days: 2
  });
  assert.deepEqual(terminal.summarizeSelection(lines, '2026-08-02', '2026-08-31'), {
    quantity: 0n, lines: 0, orders: 0, customers: 0, days: 0
  });
  assert.equal(terminal.summarizeSelection(lines, '2026-09-02', '2026-09-02').quantity,
    4n * csv.QUANTITY_SCALE);
});

test('day and week buckets keep missing entity days separate from workspace date coverage', () => {
  const source = csv.importCsv([
    'order_id;article_id;quantity;delivery_date;customer_id',
    'O-1;A-1;1.25;2026-09-01;C-1',
    'O-2;A-2;3;2026-09-02;C-1',
    'O-3;A-1;2.75;2026-09-04;C-2'
  ].join('\n') + '\n').rows;
  const summary = terminal.selectedSummary(source, 'article', 'A-1', '2026-09-04', 'all');
  const coverage = periods.coverageForPeriod(source,
    { start: '2026-09-01', end: '2026-09-04' }, [1, 2, 3, 4, 5]);
  const day = terminal.aggregateChart(summary.points, '2026-09-01', '2026-09-04', 'day',
    coverage.expectedDates, coverage.observedDates);
  assert.deepEqual(day.map((bucket) => [bucket.date, bucket.hasRows, bucket.observedDays]), [
    ['2026-09-01', true, 1], ['2026-09-02', false, 1],
    ['2026-09-03', false, 0], ['2026-09-04', true, 1]
  ]);
  assert.equal(day[1].quantity, 0n);
  assert.equal(day[1].hasRows, false);
  const week = terminal.aggregateChart(summary.points, '2026-09-01', '2026-09-04', 'week',
    coverage.expectedDates, coverage.observedDates);
  assert.equal(week.length, 1);
  assert.deepEqual([week[0].from, week[0].to, week[0].quantity, week[0].lines,
    week[0].expectedDays, week[0].observedDays],
  ['2026-09-01', '2026-09-04', 4n * csv.QUANTITY_SCALE, 2, 4, 3]);
  assert.deepEqual(terminal.coverageCounts(coverage.expectedDates, coverage.observedDates,
    '2026-09-02', '2026-09-03'), { expected: 2, observed: 1, unknown: 1 });
});

test('month buckets, ISO week edges and automatic grouping preserve calendar boundaries', () => {
  const points = [
    { date: '2025-12-31', quantity: 1n, lines: 1 },
    { date: '2026-01-01', quantity: 2n, lines: 1 }
  ];
  const weeks = terminal.aggregateChart(points, '2025-12-30', '2026-01-02', 'week', [], []);
  assert.equal(weeks.length, 1);
  assert.deepEqual([weeks[0].from, weeks[0].to, weeks[0].quantity],
    ['2025-12-30', '2026-01-02', 3n]);
  const months = terminal.aggregateChart(points, '2025-12-30', '2026-01-02', 'month', [], []);
  assert.deepEqual(months.map((bucket) => [bucket.from, bucket.to, bucket.quantity]), [
    ['2025-12-30', '2025-12-31', 1n], ['2026-01-01', '2026-01-02', 2n]
  ]);
  assert.equal(terminal.chartGranularity('2026-09-01', '2026-09-30', 'auto'), 'day');
  assert.equal(terminal.chartGranularity('2026-07-01', '2026-09-30', 'auto'), 'week');
  assert.equal(terminal.chartGranularity('2026-01-01', '2026-09-30', 'auto'), 'month');
  assert.equal(terminal.chartGranularity('2026-01-01', '2026-09-30', 'day'), 'day');
  assert.deepEqual(terminal.aggregateChart([], '9999-12-30', '9999-12-31', 'month', [], [])
    .map((bucket) => [bucket.from, bucket.to]), [['9999-12-30', '9999-12-31']]);
});
