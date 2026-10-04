'use strict';
// Deterministic synthetic sources only. Output stays in ignored dist/.
const fs = require('node:fs');
const path = require('node:path');
const workspace = require('../../workspace.js');
const root = path.join(__dirname, '..', '..');
const output = path.join(root, 'dist', 'performance-fixtures');
fs.mkdirSync(output, { recursive: true });
const counts = process.argv[2] ? process.argv[2].split(',').map(Number) : [1000, 50000];
for (const count of counts) {
  if (!Number.isInteger(count) || count < 1 || count > 700000) throw new Error('Invalid row count');
  const rows = ['order_id;article_id;quantity;delivery_date;customer_id;customer_city;article_name'];
  for (let index = 0; index < count; index++) {
    const date = index % 997 === 0 ? '' : '2026-09-' + String(index % 28 + 1).padStart(2, '0');
    rows.push(['000' + index, '000' + (index % 211), '0.1234567', date,
      'C-' + (index % 37), 'Synthetic City', 'Synthetic article ' + (index % 211) + ' ' + 'X'.repeat(64)].join(';'));
  }
  const text = rows.join('\r\n') + '\r\n';
  const bytes = new TextEncoder().encode(text);
  const record = workspace.createWorkspace('Synthetic ' + count, { id: 'workspace-synthetic-' + count,
    now: '2026-10-04T12:00:00.000Z', language: 'en' });
  record.analyzed = true;
  record.files.push({ id: 'source-synthetic-' + count, name: 'synthetic-' + count + '.csv', label: 'synthetic-' + count + '.csv',
    size: bytes.byteLength, lastModified: 1, buffer: bytes.buffer,
    encodingMode: 'auto', activeEncoding: 'utf-8', detectedEncoding: 'utf-8', errorKey: null,
    mapping: { order_id: 0, article_id: 1, quantity: 2, delivery_date: 3, customer_id: 4, customer_city: 5, article_name: 6 },
    confirmedMapping: { order_id: 0, article_id: 1, quantity: 2, delivery_date: 3, customer_id: 4, customer_city: 5, article_name: 6 },
    preparationRules: {}, sourceRules: [], customFieldMapping: {}, confirmedCustomFieldMapping: {},
    sourceType: 'order-lines', result: null });
  fs.writeFileSync(path.join(output, 'synthetic-' + count + '.csv'), text);
  fs.writeFileSync(path.join(output, 'synthetic-' + count + '.workspace.json'), workspace.stringifyBackup(record));
  console.log(JSON.stringify({ count, sourceBytes: bytes.byteLength, output }));
}
