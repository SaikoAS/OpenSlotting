const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const csv = require('../csv.js');
const QUANTITY_SCALE = csv.QUANTITY_SCALE;

function fixture(name) {
  return fs.readFileSync(path.join(__dirname, '..', 'test-data', name), 'utf8');
}

test('basic fixture matches its documented metrics', () => {
  const result = csv.importCsv(fixture('basic-orders.csv'));
  const analysis = csv.analyzeRows(result.rows);

  assert.equal(result.validRows, 12);
  assert.equal(result.invalidRows, 0);
  assert.equal(analysis.total_quantity, 32n * QUANTITY_SCALE);
  assert.equal(analysis.distinct_orders, 11);
  assert.equal(analysis.distinct_customers, 6);
  assert.equal(analysis.active_days, 6);
});

test('German headers, dates and decimal commas are detected and normalized', () => {
  const result = csv.importCsv(fixture('german-column-mapping.csv'));

  assert.equal(result.validRows, 5);
  assert.equal(result.invalidRows, 0);
  assert.equal(result.rows[0].order_date, '2026-09-01');
  assert.equal(result.rows[0].sales_value, 19.98);
  assert.equal(result.rows[0].article_id, 'ART-001');
});

test('quantity precision is explicit and enforced during import', () => {
  const text = 'order_id;article_id;quantity;order_date\nO1;A1;0.0000001;2026-09-01\nO2;A2;0.00000001;2026-09-01\n';
  const result = csv.importCsv(text);

  assert.equal(csv.QUANTITY_DECIMAL_PLACES, 7);
  assert.equal(result.validRows, 1);
  assert.equal(result.invalidRows, 1);
  assert.equal(result.rows[0].quantity, 1n);
  assert.equal(csv.formatScaledQuantity(12345678n, 'en'), '1.2345678');
  assert.equal(csv.formatScaledQuantity(12345678n, 'de'), '1,2345678');
  assert.ok(result.issues.some((issue) => issue.sourceLine === 3 && issue.code === 'quantity_precision_exceeded'));
});

test('numeric fields reject internal whitespace and ambiguous separators', () => {
  const text = 'order_id;article_id;quantity;order_date;customer_id;sales_value;location\nO1;A1;1 2;2026-09-01;C1;10;A-01\nO2;A2;1;2026-09-01;C2;1.234,56;A-02\n';
  const result = csv.importCsv(text);

  assert.equal(result.validRows, 0);
  assert.equal(result.invalidRows, 2);
  assert.ok(result.issues.some((issue) => issue.sourceLine === 2 && issue.code === 'quantity_must_be_positive'));
  assert.ok(result.issues.some((issue) => issue.sourceLine === 3 && issue.code === 'invalid_number'));
});

test('quoted semicolons remain inside their fields', () => {
  const result = csv.importCsv(fixture('quoted-fields.csv'));

  assert.equal(result.validRows, 2);
  assert.equal(result.rows[0].customer_id, 'CUST;SPECIAL');
  assert.equal(result.rows[0].location, 'ZONE;01');
});

test('duplicate lines are preserved and aggregated', () => {
  const result = csv.importCsv(fixture('duplicate-lines.csv'));
  const analysis = csv.analyzeRows(result.rows);
  const article = analysis.articles.find((item) => item.article_id === 'SKU-801');

  assert.equal(result.validRows, 5);
  assert.equal(article.order_line_count, 3);
  assert.equal(article.total_quantity, 4n * QUANTITY_SCALE);
});

test('quantity and frequency remain separate metrics', () => {
  const result = csv.importCsv(fixture('quantity-vs-frequency.csv'));
  const analysis = csv.analyzeRows(result.rows);
  const bulk = analysis.articles.find((item) => item.article_id === 'SKU-BULK');
  const frequent = analysis.articles.find((item) => item.article_id === 'SKU-FREQUENT');

  assert.equal(bulk.order_line_count, 1);
  assert.equal(bulk.total_quantity, 500n * QUANTITY_SCALE);
  assert.equal(frequent.order_line_count, 8);
  assert.equal(frequent.total_quantity, 8n * QUANTITY_SCALE);
});

test('invalid values are reported with source lines and excluded from aggregation', () => {
  const result = csv.importCsv(fixture('invalid-values.csv'));

  assert.equal(result.validRows, 1);
  assert.equal(result.invalidRows, 6);
  assert.ok(result.issues.some((issue) => issue.sourceLine === 3 && issue.field === 'article_id'));
  assert.ok(result.issues.some((issue) => issue.sourceLine === 7 && issue.field === 'order_date'));
});

test('malformed column counts are reported without dropping the evidence silently', () => {
  const result = csv.importCsv(fixture('malformed-columns.csv'));

  assert.equal(result.validRows, 1);
  assert.equal(result.invalidRows, 2);
  assert.equal(result.structuralRows, 2);
  assert.ok(result.issues.some((issue) => issue.code === 'column_count_mismatch' && issue.sourceLine === 3));
  assert.ok(result.issues.some((issue) => issue.code === 'column_count_mismatch' && issue.sourceLine === 4));
});

test('delimiter-only and quoted-empty records remain traceable', () => {
  const text = 'order_id;article_id;quantity;order_date\n;;;\n"";"";"";""\n';
  const result = csv.importCsv(text);

  assert.equal(result.totalRows, 2);
  assert.equal(result.validRows, 0);
  assert.equal(result.invalidRows, 2);
  assert.ok(result.issues.some((issue) => issue.sourceLine === 2 && issue.code === 'required_value_missing'));
  assert.ok(result.issues.some((issue) => issue.sourceLine === 3 && issue.code === 'required_value_missing'));
});

test('quoted-empty record at EOF remains traceable without a newline', () => {
  const text = 'order_id;article_id;quantity;order_date\n""';
  const result = csv.importCsv(text);

  assert.equal(result.totalRows, 1);
  assert.equal(result.invalidRows, 1);
  assert.equal(result.structuralRows, 1);
  assert.ok(result.issues.some((issue) => issue.sourceLine === 2 && issue.code === 'column_count_mismatch'));
});

test('reusing one source column for multiple fields is rejected', () => {
  const mapping = {
    order_id: 0,
    article_id: 0,
    quantity: 2,
    order_date: 3,
    customer_id: 4,
    sales_value: 5,
    location: 6
  };
  const result = csv.importCsv(fixture('basic-orders.csv'), mapping);

  assert.equal(result.validRows, 0);
  assert.ok(result.issues.some((issue) => issue.code === 'source_column_reused'));
});

test('empty optional fields stay empty while required fields remain enforced', () => {
  const result = csv.importCsv(fixture('optional-fields.csv'));

  assert.equal(result.validRows, 4);
  assert.equal(result.rows[0].sales_value, null);
  assert.equal(result.rows[1].customer_id, null);
  assert.equal(result.rows[1].location, null);
});

test('English is the default message language and German is selectable', () => {
  const mapping = csv.detectMapping([
    'order_id',
    'article_id',
    'quantity',
    'order_date'
  ]);
  const english = csv.validateMapping({ ...mapping, order_date: null }, 'en');
  const german = csv.validateMapping({ ...mapping, order_date: null }, 'de');

  assert.match(english[0].message, /required field/i);
  assert.match(german[0].message, /erforderliche Feld/i);
  assert.equal(csv.getFieldLabel('article_id', 'en'), 'Article ID');
  assert.equal(csv.getFieldLabel('article_id', 'de'), 'Artikel-ID');

  const englishImport = csv.importCsv(fixture('invalid-values.csv'));
  const germanImport = csv.importCsv(fixture('invalid-values.csv'), undefined, { locale: 'de' });
  assert.match(englishImport.issues.find((issue) => issue.code === 'quantity_must_be_positive').message, /positive number/i);
  assert.match(germanImport.issues.find((issue) => issue.code === 'quantity_must_be_positive').message, /positive Zahl/i);
});

test('CSV parser diagnostics follow the selected locale', () => {
  const malformed = 'order_id;article_id;quantity;order_date\nO1;"A;1;2026-09-01\n';
  const english = csv.importCsv(malformed);
  const german = csv.importCsv(malformed, undefined, { locale: 'de' });

  assert.match(english.issues.find((issue) => issue.code === 'unterminated_quote').message, /quote was not closed/i);
  assert.match(german.issues.find((issue) => issue.code === 'unterminated_quote').message, /Anführungszeichen/i);
});

test('analysis CSV export preserves sales precision and share values', () => {
  const result = csv.importCsv(fixture('basic-orders.csv'));
  const analysis = csv.analyzeRows(result.rows);
  const exported = csv.exportAnalysisCsv(analysis.articles);

  assert.match(exported, /SKU-100;4;7;4;3;3;69\.93;4;0\.3333333333333333;0\.3333333333333333;/);
  assert.doesNotMatch(exported, /69\.929999/);
  assert.doesNotMatch(exported, /0\.749999;/);
});

test('analysis CSV export rounds half-cent sales like the UI', () => {
  const exported = csv.exportAnalysisCsv([{
    article_id: 'A1',
    order_line_count: 1,
    total_quantity: 10000000n,
    distinct_orders: 1,
    distinct_customers: 0,
    active_days: 1,
    total_sales: 1.005,
    sales_value_rows: 1,
    share_of_order_lines: 1,
    cumulative_share_of_order_lines: 1,
    locations: []
  }]);

  assert.match(exported, /A1;1;1;1;0;1;1\.01;1;1;1;\r?\n/);
});

test('analysis CSV export preserves very small shares adaptively', () => {
  const exported = csv.exportAnalysisCsv([{
    article_id: 'A1',
    order_line_count: 1,
    total_quantity: 10000000n,
    distinct_orders: 1,
    distinct_customers: 0,
    active_days: 1,
    total_sales: 0,
    sales_value_rows: 0,
    share_of_order_lines: 0.0000001,
    cumulative_share_of_order_lines: 0.0000001,
    locations: []
  }]);

  assert.match(exported, /A1;1;1;1;0;1;0;0;0\.0000001;0\.0000001;\r?\n/);
});

test('cumulative shares use exact running line counts', () => {
  const rows = Array.from({ length: 9 }, (_, index) => ({
    order_id: 'O' + (index + 1),
    article_id: 'A' + (index + 1),
    quantity: 10000000n,
    order_date: '2026-09-01',
    customer_id: null,
    sales_value: null,
    location: null
  }));
  const analysis = csv.analyzeRows(rows);
  const lastArticle = analysis.articles[analysis.articles.length - 1];

  assert.equal(lastArticle.cumulative_share_of_order_lines, 1);
  assert.match(csv.exportAnalysisCsv(analysis.articles), /A9;1;1;1;0;1;0;0;0\.1111111111111111;1;\r?\n/);
});

test('fixed-point aggregation avoids floating-point quantity artifacts', () => {
  const result = csv.importCsv('order_id;article_id;quantity;order_date\nO1;A1;0.1;2026-09-01\nO2;A1;0.2;2026-09-01\n');
  const analysis = csv.analyzeRows(result.rows);

  assert.equal(result.rows[0].quantity, 1000000n);
  assert.equal(result.rows[1].quantity, 2000000n);
  assert.equal(analysis.total_quantity, 3000000n);
  assert.match(csv.exportAnalysisCsv(analysis.articles), /A1;2;0\.3;2;0;1;0;0;1;1;/);
});

test('analysis CSV export preserves very small positive quantities', () => {
  const result = csv.importCsv('order_id;article_id;quantity;order_date\nO1;A1;0.0000001;2026-09-01\n');
  const analysis = csv.analyzeRows(result.rows);

  assert.equal(result.rows[0].quantity, 1n);
  assert.match(csv.exportAnalysisCsv(analysis.articles), /A1;1;0\.0000001;1;0;1;0;0;1;1;\r?\n/);
});

test('analysis CSV export preserves safe integer quantities exactly', () => {
  const result = csv.importCsv('order_id;article_id;quantity;order_date\nO1;A1;1234567890123456;2026-09-01\n');
  const analysis = csv.analyzeRows(result.rows);

  assert.match(csv.exportAnalysisCsv(analysis.articles), /A1;1;1234567890123456;1;0;1;0;0;1;1;\r?\n/);
});

test('analysis CSV export includes per-article sales-value coverage', () => {
  const analysis = csv.analyzeRows([
    { order_id: 'O1', article_id: 'A1', quantity: 10000000n, order_date: '2026-09-01', customer_id: null, sales_value: 10, location: null },
    { order_id: 'O2', article_id: 'A1', quantity: 10000000n, order_date: '2026-09-02', customer_id: null, sales_value: null, location: null }
  ]);

  const exported = csv.exportAnalysisCsv(analysis.articles);

  assert.match(exported, /total_sales;sales_value_rows;share_of_order_lines/);
  assert.match(exported, /A1;2;2;2;0;2;10;1;1;1;/);
});

test('analysis CSV export protects spreadsheet formula text', () => {
  const analysis = csv.analyzeRows([
    { order_id: 'O1', article_id: '=SUM(1,2)', quantity: 10000000n, order_date: '2026-09-01', customer_id: null, sales_value: null, location: '@ZONE' }
  ]);

  const exported = csv.exportAnalysisCsv(analysis.articles);

  assert.match(exported, /'=SUM\(1,2\);/);
  assert.match(exported, /;'@ZONE\r?\n/);
});
