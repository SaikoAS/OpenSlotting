'use strict';

function syntheticRows(count, options = {}) {
  const rows = [];
  const start = Date.parse('2025-01-01T00:00:00Z');
  for (let index = 0; index < count; index += 1) {
    const day = (index * 37) % 365;
    const date = new Date(start + day * 86400000).toISOString().slice(0, 10);
    const quantity = BigInt((index * 13) % 20000 - (index % 19 === 0 ? 30000 : 0)) * 1000000n;
    rows.push({ article_id: 'A' + (index % (options.articles || 200)), article_name: 'Article ' + (index % 200),
      customer_id: 'C' + (index % 97), customer_name: 'Customer ' + (index % 97),
      order_id: 'O' + (Math.floor(index / 4) % 10000), quantity,
      delivery_date: index % 101 === 0 ? null : date,
      sales_value_exact: index % 71 === 0 ? null : ((index * 17) % 50000 - (index % 19 === 0 ? 70000 : 0)) + '.12345',
      sales_value: null, sales_unit_count: index % 5 === 0 ? null : BigInt(index % 21) * 1000000n,
      quantity_per_sales_unit: 2500000n, location: 'L' + (index % 31),
      source_file_id: 'F' + (index % 3), source_file_label: 'Source ' + (index % 3),
      source_line: index + 2, source_type: 'order-lines', source_subtype: index % 19 === 0 ? 'credit' : 'sales' });
  }
  return rows;
}

function queries(count = 24) {
  const start = Date.parse('2025-01-01T00:00:00Z');
  const dateAt = day => new Date(start + day * 86400000).toISOString().slice(0, 10);
  return Array.from({ length: count }, (_, index) => {
    const day = (index * 17) % 325;
    return { mode: 'custom', expectedWeekdays: [1, 2, 3, 4, 5],
      periodA: { name: 'A', start: dateAt(day), end: dateAt(day + 13) },
      periodB: { name: 'B', start: dateAt(day + 7), end: dateAt(day + 20) } };
  });
}

module.exports = { syntheticRows, queries };
