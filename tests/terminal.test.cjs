const assert = require('node:assert/strict');
const test = require('node:test');

const csv = require('../csv.js');
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
