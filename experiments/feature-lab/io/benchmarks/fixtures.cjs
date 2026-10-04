'use strict';

const csv = require('../../../../csv.js');

const sourceFile = Object.freeze({ id: 'synthetic-io', name: 'synthetic-io.csv', label: 'synthetic-io.csv', sourceType: 'order-lines' });
const columns = Object.freeze([
  { key: 'article_id', label: 'Artikel' },
  { key: 'article_name', label: 'Bezeichnung' },
  { key: 'quantity', label: 'Menge', number: true },
  { key: 'delivery_date', label: 'Datum' },
  { key: 'source_file_name', label: 'Quelldatei' },
  { key: 'source_line', label: 'Quellzeile', number: true }
]);

function quote(value) { return '"' + String(value).replace(/"/g, '""') + '"'; }

function makeFixture(count) {
  const headers = ['Auftragsnr', 'ArtNr', 'Bezeichnung', 'GMenge', 'Lieferdatum', 'KdNr', 'Nettowert', 'Lagerplatz', 'Extra', 'Extra'];
  const records = [headers.join(';')];
  for (let index = 0; index < count; index += 1) {
    const article = String(index % Math.max(10, Math.round(count / 10))).padStart(8, '0');
    const name = index % 127 === 0 ? '=Formel;\r\n"Übersicht"' : 'Artikel ÄÖÜ ' + (index % 701);
    const quantity = index % 193 === 0 ? 'defekt' : index % 257 === 0 ? '1,12345678' : (index % 23 === 0 ? '-' : '') + (index % 999) + ',1234567';
    const date = index % 211 === 0 ? '31.02.2026' : '2026-09-' + String(index % 28 + 1).padStart(2, '0');
    const fields = ['O' + (index >> 2), ' ' + article + ' ', name, quantity, date, 'K' + (index % 501), (index % 3000) + ',99', 'L-' + (index % 31), index % 389 === 0 ? 'hold' : ' cold ', index % 293 === 0 ? 'bad' : '1,25'];
    if (index % 419 === 0) fields.pop();
    records.push(fields.map(quote).join(';'));
  }
  const text = records.join('\r\n') + '\r\n';
  const bytes = Buffer.from(text, 'utf8');
  const mapping = csv.detectMapping(headers, sourceFile.sourceType);
  return { text, bytes, mapping, headers, options: {
    locale: 'de', sourceFile,
    preparationRules: { article_id: [{ type: 'trim', enabled: true }], zone: [{ type: 'trim', enabled: true }, { type: 'case-normalization', mode: 'upper', enabled: true }] },
    sourceRules: [{ sourcePosition: 8, type: 'exclude-equals', value: 'hold', name: 'synthetisch-gehalten' }],
    customFields: [{ id: 'zone', name: 'Zone', type: 'text', active: true }, { id: 'weight', name: 'Weight', type: 'number', active: true }],
    customFieldMapping: { zone: 8, weight: 9 }
  } };
}

function makeExportFixture(count) {
  const lines = Array.from({ length: count }, (_, index) => ({
    article_id: index % 31 === 0 ? '=CMD()' : 'SKU-' + index,
    article_name: index % 127 === 0 ? '\t+FORMEL;\r\n"Übersicht" 😀' : 'Artikel Ä ' + index,
    quantity: BigInt(index) * 10000000n - 1234567n,
    delivery_date: '2026-09-01', source_file_name: index % 41 === 0 ? '@Quelle.csv' : 'synthetic.csv', source_line: index + 2,
    order_id: 'O-' + (index >> 2), customer_id: 'K-' + (index % 71),
    sales_value: index / 100, sales_value_exact: (index / 100).toFixed(2), location: 'L-' + (index % 10)
  }));
  const valueForColumn = (row, key) => key === 'quantity' ? scaledQuantity(row[key]) : row[key];
  // Analyse selbst liegt außerhalb der Exportmessung.
  const analysis = csv.analyzeRows(lines, { locale: 'de' });
  return { lines, articles: analysis.articles, columns, valueForColumn };
}

function interpretationCases() {
  return require('../fixtures/interpretation-ground-truth.cjs');
}

function caseCatalog(item) {
  const text = [item.headers, ...item.rows].map(row => row.map(quote).join(';')).join('\r\n');
  return csv.profileCsvStreamingChunks([text], { sourceFile }).columnCatalog;
}

function scaledQuantity(value) {
  const sign = value < 0n ? '-' : '';
  const absolute = value < 0n ? -value : value;
  const whole = absolute / csv.QUANTITY_SCALE;
  const fraction = String(absolute % csv.QUANTITY_SCALE).padStart(7, '0').replace(/0+$/, '');
  return sign + whole + (fraction ? '.' + fraction : '');
}

module.exports = { sourceFile, columns, makeFixture, makeExportFixture, interpretationCases, caseCatalog, scaledQuantity };
