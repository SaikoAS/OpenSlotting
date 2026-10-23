'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const terminal = require('../terminal.js'), csv = require('../csv.js');
const source = fs.readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8').replace(/\r\n/g, '\n');
function fn(name) {
  const start = source.search(new RegExp('  (?:async )?function ' + name + '\\('));
  return source.slice(start, start + 1 + source.slice(start + 1).search(/\n  (?:async )?function \w+\(/));
}
function view() {
  const context = vm.createContext({ state: { customFields: [] }, translate: key => key,
    optionalText: value => value == null || value === '' ? '—' : String(value) });
  vm.runInContext(['terminalOptionalColumns','terminalColumnCatalog','terminalLineValue'].map(fn).join('\n'), context);
  return context;
}
function imports() {
  const without = csv.importCsv('order_id;article_id;quantity;delivery_date;customer_id;customer_name\nO-NO;SKU;1;2026-08-03;0012;Unassigned source name\n', { order_id: 0, article_id: 1, quantity: 2, delivery_date: 3, customer_id: 4 }, { sourceFile: { id: 'source-without', name: 'without.csv' } });
  const withName = csv.importCsv('order_id;article_id;quantity;delivery_date;customer_id;customer_name\nO-YES;SKU;2;2026-08-04;0012;Nord GmbH\n', undefined, { sourceFile: { id: 'source-with', name: 'with.csv' } });
  return csv.combineImportResults([{ id: 'source-without', name: 'without.csv', result: without }, { id: 'source-with', name: 'with.csv', result: withName }]).rows;
}

test('customer-name display distinguishes mixed imports with and without a mapped name for the same customer ID', () => {
  const context = view(), rows = imports(), before = structuredClone(rows);
  const without = rows.find(row => row.order_id === 'O-NO'), withName = rows.find(row => row.order_id === 'O-YES');
  assert.equal(context.terminalLineValue(without, 'customer'), '—');
  assert.equal(context.terminalLineValue(withName, 'customer'), 'Nord GmbH');
  for (const row of rows) assert.equal(context.terminalLineValue(row, 'customer_id'), '0012');
  assert.deepEqual(rows, before);
  const columns = context.terminalColumnCatalog().filter(column => ['customer','customer_id'].includes(column.key));
  assert.equal(columns[0].label, 'detail_customer_name');
  const output = terminal.exportLinesCsv(rows, columns, (row, key) => context.terminalLineValue(row, key));
  assert.match(output, /"—";"0012"/); assert.match(output, /"Nord GmbH";"0012"/);
});

test('sorting the customer-name column does not substitute IDs for missing names', () => {
  const lines = [{ customer_id: '999', customer_name: null }, { customer_id: '001', customer_name: 'ABC' }];
  const before = structuredClone(lines);
  assert.equal(terminal.sortLines(lines, 'customer', 'asc')[0].customer_id, '999');
  assert.equal(terminal.sortLines(lines, 'customer_id', 'asc')[0].customer_id, '001');
  assert.deepEqual(lines, before);
});
