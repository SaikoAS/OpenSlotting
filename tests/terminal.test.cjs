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
});

test('terminal can index one analysis level without constructing order and customer lists', () => {
  const index = terminal.buildIndex(rows(), ['article']);
  assert.equal(index.entities.article.length, 3);
  assert.equal(index.entities.customer, undefined);
  assert.equal(index.entities.order, undefined);
  assert.equal(index.coverage.customer, 4);
});
