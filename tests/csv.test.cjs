const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const csv = require('../csv.js');
const encoding = require('../encoding.js');
const QUANTITY_SCALE = csv.QUANTITY_SCALE;

test('release version is defined centrally for the UI and package', () => {
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

  assert.equal(csv.APP_VERSION, '0.1.0');
  assert.match(appSource, /core\.APP_VERSION/);
});

test('runtime source has no mandatory network dependency', () => {
  const runtimeFiles = ['index.html', 'app.css', 'app.js', 'encoding.js', 'csv.js'];
  const forbiddenPattern = /https?:\/\/|\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b|\blocalhost\b|127\.0\.0\.1/;

  runtimeFiles.forEach((fileName) => {
    const source = fs.readFileSync(path.join(__dirname, '..', fileName), 'utf8');
    assert.doesNotMatch(source, forbiddenPattern, fileName);
  });
});

test('release packaging reads files from an explicit Git commit', () => {
  const packagingSource = fs.readFileSync(path.join(__dirname, '..', 'tools', 'package-release.ps1'), 'utf8');

  assert.match(packagingSource, /\$CandidateCommit/);
  assert.match(packagingSource, /git -C \$repositoryRoot @archiveArguments/);
  assert.match(packagingSource, /Candidate commit:/);
  assert.doesNotMatch(packagingSource, /Copy-Item/);
});

function fixture(name) {
  return fs.readFileSync(path.join(__dirname, '..', 'test-data', name), 'utf8');
}

function parseAnalysisExport(articles) {
  const parsed = csv.parseCsv(csv.exportAnalysisCsv(articles));
  assert.deepEqual(parsed.errors, []);
  const headers = parsed.rows[0].values;
  return {
    headers,
    rows: parsed.rows.slice(1).map((row) => Object.fromEntries(
      headers.map((header, index) => [header, row.values[index]])
    ))
  };
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

test('high-confidence German warehouse aliases map to their intended fields', () => {
  const aliasesByField = {
    order_id: ['AuftrNr', 'AuftragNr', 'AuftragsID', 'KundenauftragsNr', 'Kundenauftragsnummer'],
    article_id: ['ArtikelNr', 'MaterialNr', 'Materialnummer', 'ProduktNr', 'Produktnummer', 'SKUNr'],
    article_name: ['Artikelname', 'Produktbezeichnung', 'Materialbezeichnung', 'Warenbezeichnung', 'Produkttext', 'Langtext'],
    quantity: ['GMenge', 'Gesamtmenge', 'MengeGesamt', 'Auftragsmenge', 'Kommissioniermenge', 'Pickmenge', 'Entnahmemenge'],
    order_date: ['LfDat', 'Lieferdatum'],
    customer_id: ['KundenID', 'Debitor', 'DebitorNr', 'DebitorenNr'],
    sales_value: ['VkWert', 'Verkaufswert', 'Umsatzwert', 'Positionswert', 'Nettowert', 'Positionsnettowert'],
    location: ['LgPl', 'Lagerfach', 'LagerfachNr', 'Kommissionierplatz', 'Pickplatz', 'Entnahmeplatz']
  };

  Object.entries(aliasesByField).forEach(([field, aliases]) => {
    aliases.forEach((alias) => {
      assert.equal(csv.detectMapping([alias])[field], 0, `${alias} should map to ${field}`);
    });
  });
});

test('compact German warehouse headers import automatically without ambiguous aliases', () => {
  const bytes = fs.readFileSync(path.join(__dirname, '..', 'test-data', 'compact-german-windows-1252.csv'));
  const result = csv.importCsv(encoding.decodeBuffer(bytes));

  assert.equal(result.validRows, 1);
  assert.equal(result.invalidRows, 0);
  assert.equal(result.rows[0].article_name, 'Größe Ölbehälter');
  assert.equal(result.rows[0].quantity, 25000000n);
  assert.equal(result.rows[0].location, 'Fach-Ä1');

  ['Nummer', 'Preis', 'Einzelpreis', 'EAN', 'GTIN', 'Colli', 'Gebinde', 'VE', 'Lagerort', 'Fach']
    .forEach((header) => assert.deepEqual(
      Object.values(csv.detectMapping([header])).filter(Number.isInteger),
      [],
      `${header} should remain unmapped`
    ));
});

test('article description aliases are detected in English and German', () => {
  const aliases = [
    'article_name',
    'Article Name',
    'Article description',
    'Description',
    'Product Name',
    'Artikelbezeichnung',
    'Bezeichnung',
    'Artikeltext',
    'Kurztext'
  ];

  aliases.forEach((alias) => {
    const mapping = csv.detectMapping(['order_id', 'article_id', alias, 'quantity', 'order_date']);
    assert.equal(mapping.article_name, 2, alias);
  });
  const germanImport = csv.importCsv('AuftragsNr;ArtNr;Artikelbezeichnung;Menge;Datum\nO-1;A-1;Synthetischer Artikel;1;01.09.2026\n');
  assert.equal(germanImport.rows[0].article_name, 'Synthetischer Artikel');
  assert.equal(csv.getFieldLabel('article_name', 'en'), 'Article description');
  assert.equal(csv.getFieldLabel('article_name', 'de'), 'Artikelbezeichnung');
});

test('optional article descriptions import without invalidating empty values', () => {
  const result = csv.importCsv(fixture('article-descriptions.csv'));

  assert.equal(result.validRows, 8);
  assert.equal(result.invalidRows, 0);
  assert.equal(result.rows[0].article_name, 'Citrus Juice 1L');
  assert.equal(result.rows[2].article_name, 'Citrus Juice; "Special" 1 L');
  assert.equal(result.rows[3].article_name, null);
  assert.equal(result.rows[4].article_name, null);
});

test('manual mapping supports article descriptions', () => {
  const text = 'Order;SKU;Readable text;Qty;Date\nO1;A1;Synthetic widget;1;2026-09-01\n';
  const mapping = {
    order_id: 0,
    article_id: 1,
    article_name: 2,
    quantity: 3,
    order_date: 4,
    customer_id: null,
    sales_value: null,
    location: null
  };
  const result = csv.importCsv(text, mapping);

  assert.equal(result.validRows, 1);
  assert.equal(result.rows[0].article_name, 'Synthetic widget');
});

test('article descriptions remain metadata while conflicts and source rows stay traceable', () => {
  const result = csv.importCsv(fixture('article-descriptions.csv'));
  const analysis = csv.analyzeRows(result.rows);
  const conflicting = analysis.articles.find((article) => article.article_id === 'SKU-ALPHA');
  const stable = analysis.articles.find((article) => article.article_id === 'SKU-STABLE');
  const empty = analysis.articles.find((article) => article.article_id === 'SKU-EMPTY');

  assert.equal(conflicting.order_line_count, 4);
  assert.equal(conflicting.article_name, 'Citrus Juice 1L');
  assert.deepEqual(conflicting.article_name_variants, ['Citrus Juice 1L', 'Citrus Juice; "Special" 1 L']);
  assert.equal(conflicting.article_name_conflict, true);
  assert.deepEqual(conflicting.order_lines.map((row) => row.source_line), [2, 3, 4, 5]);
  assert.ok(conflicting.order_lines.every((row) => row.article_id === 'SKU-ALPHA'));
  assert.equal(conflicting.order_lines[0], result.rows[0]);

  assert.equal(stable.article_name, 'Steel Bottle');
  assert.deepEqual(stable.article_name_variants, ['Steel Bottle']);
  assert.equal(stable.article_name_conflict, false);

  assert.equal(empty.article_name, null);
  assert.deepEqual(empty.article_name_variants, []);
  assert.equal(empty.article_name_conflict, false);
});

test('article search matches IDs and descriptions', () => {
  const analysis = csv.analyzeRows(csv.importCsv(fixture('article-descriptions.csv')).rows);
  const article = analysis.articles.find((item) => item.article_id === 'SKU-ALPHA');

  assert.equal(csv.articleMatchesQuery(article, 'sku-alpha', 'en'), true);
  assert.equal(csv.articleMatchesQuery(article, 'citrus juice', 'en'), true);
  assert.equal(csv.articleMatchesQuery(article, 'Special', 'en'), true);
  assert.equal(csv.articleMatchesQuery(article, '  CITRUS  ', 'en'), true);
  assert.equal(csv.articleMatchesQuery(article, 'steel', 'en'), false);
  assert.equal(csv.articleMatchesQuery(article, '', 'de'), true);
});

test('analysis export includes protected article descriptions and conflict metadata', () => {
  const analysis = csv.analyzeRows(csv.importCsv(fixture('article-descriptions.csv')).rows);
  const exported = parseAnalysisExport(analysis.articles);
  const conflicting = exported.rows.find((row) => row.article_id === 'SKU-ALPHA');
  const empty = exported.rows.find((row) => row.article_id === 'SKU-EMPTY');
  const formula = exported.rows.find((row) => row.article_id === 'SKU-FORMULA');

  assert.deepEqual(exported.headers.slice(0, 4), [
    'article_id',
    'article_name',
    'article_name_conflict',
    'article_name_variants'
  ]);
  assert.equal(conflicting.article_name, 'Citrus Juice 1L');
  assert.equal(conflicting.article_name_conflict, 'true');
  assert.deepEqual(JSON.parse(conflicting.article_name_variants), ['Citrus Juice 1L', 'Citrus Juice; "Special" 1 L']);
  assert.equal(empty.article_name, '');
  assert.equal(empty.article_name_conflict, 'false');
  assert.equal(formula.article_name, "'=2+2");
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

test('sales values outside the exact numeric range are rejected', () => {
  const text = 'order_id;article_id;quantity;order_date;sales_value\nO1;A1;1;2026-09-01;9007199254740991\nO2;A2;1;2026-09-01;9007199254740993\n';
  const result = csv.importCsv(text);

  assert.equal(result.validRows, 1);
  assert.equal(result.rows[0].sales_value, Number.MAX_SAFE_INTEGER);
  assert.ok(result.issues.some((issue) => issue.sourceLine === 3 && issue.field === 'sales_value' && issue.code === 'invalid_number'));
});

test('sales values accept a leading decimal separator', () => {
  const text = 'order_id;article_id;quantity;order_date;sales_value\nO1;A1;1;2026-09-01;.5\nO2;A2;1;2026-09-01;-.5\nO3;A3;1;2026-09-01;,5\n';
  const result = csv.importCsv(text);

  assert.equal(result.validRows, 3);
  assert.deepEqual(result.rows.map((row) => row.sales_value), [0.5, -0.5, 0.5]);
});

test('sales values above the supported precision are rejected', () => {
  const text = 'order_id;article_id;quantity;order_date;sales_value\nO1;A1;1;2026-09-01;0.001\n';
  const result = csv.importCsv(text);

  assert.equal(csv.SALES_DECIMAL_PLACES, 2);
  assert.equal(result.validRows, 0);
  assert.equal(result.invalidRows, 1);
  assert.ok(result.issues.some((issue) => issue.code === 'sales_precision_exceeded'));
});

test('sales aggregation preserves exact totals beyond the safe numeric range', () => {
  const text = 'order_id;article_id;quantity;order_date;sales_value\nO1;A1;1;2026-09-01;9007199254740991\nO2;A1;1;2026-09-01;2\n';
  const result = csv.importCsv(text);
  const analysis = csv.analyzeRows(result.rows);
  const article = analysis.articles[0];
  const exportedArticle = parseAnalysisExport(analysis.articles).rows[0];

  assert.equal(article.total_sales, '9007199254740993');
  assert.equal(article.total_sales_exact, '9007199254740993');
  assert.equal(exportedArticle.total_sales, '9007199254740993');
  assert.equal(exportedArticle.sales_value_rows, '2');
});

test('quoted CR-only newlines keep later source lines accurate', () => {
  const text = 'order_id;article_id;quantity;order_date\nO1;"A\rB";1;2026-09-01\rO2;;1;2026-09-01';
  const result = csv.importCsv(text);

  assert.equal(result.validRows, 1);
  assert.ok(result.issues.some((issue) => issue.sourceLine === 4 && issue.field === 'article_id'));
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
  const parsed = csv.parseCsv(malformed);
  const german = csv.importParsedCsv(parsed, undefined, { locale: 'de' });

  assert.match(english.issues.find((issue) => issue.code === 'unterminated_quote').message, /quote was not closed/i);
  assert.match(german.issues.find((issue) => issue.code === 'unterminated_quote').message, /Anführungszeichen/i);
});

test('bare quotes in unquoted fields are rejected', () => {
  const text = 'order_id;article_id;quantity;order_date\nO1;A"BROKEN;1;2026-09-01\n';
  const result = csv.importCsv(text);

  assert.equal(result.validRows, 0);
  assert.equal(result.invalidRows, 1);
  assert.ok(result.issues.some((issue) => issue.code === 'unexpected_quote_in_unquoted_field'));
});

test('parser errors on the header reject all data rows', () => {
  const text = 'order_"id;article_id;quantity;order_date\nO1;A1;1;2026-09-01\n';
  const result = csv.importCsv(text);

  assert.equal(result.validRows, 0);
  assert.equal(result.invalidRows, 1);
  assert.ok(result.issues.some((issue) => issue.sourceLine === 1 && issue.code === 'unexpected_quote_in_unquoted_field'));
});

test('analysis CSV export preserves sales precision and share values', () => {
  const result = csv.importCsv(fixture('basic-orders.csv'));
  const analysis = csv.analyzeRows(result.rows);
  const exported = csv.exportAnalysisCsv(analysis.articles);
  const exportedArticle = parseAnalysisExport(analysis.articles).rows.find((row) => row.article_id === 'SKU-100');

  assert.equal(exportedArticle.order_line_count, '4');
  assert.equal(exportedArticle.total_quantity, '7');
  assert.equal(exportedArticle.total_sales, '69.93');
  assert.equal(exportedArticle.share_of_order_lines, '0.3333333333333333');
  assert.equal(exportedArticle.cumulative_share_of_order_lines, '0.3333333333333333');
  assert.doesNotMatch(exported, /69\.929999/);
  assert.doesNotMatch(exported, /0\.749999;/);
});

test('analysis CSV export rounds half-cent sales like the UI', () => {
  const articles = [{
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
  }];

  assert.equal(parseAnalysisExport(articles).rows[0].total_sales, '1.01');
});

test('sales sorting treats equal displayed totals as equal', () => {
  assert.equal(csv.compareSalesValuesDescending(0.30000000000000004, 0.3), 0);
});

test('quantity sorting is descending for scaled integers', () => {
  assert.equal(csv.compareScaledQuantitiesDescending(20000000n, 10000000n), -1);
  assert.equal(csv.compareScaledQuantitiesDescending(10000000n, 20000000n), 1);
});

test('analysis sorts equal-frequency articles by quantity descending', () => {
  const text = 'order_id;article_id;quantity;order_date\nO1;A1;2;2026-09-01\nO2;A2;10;2026-09-01\n';
  const result = csv.importCsv(text);
  const analysis = csv.analyzeRows(result.rows);

  assert.deepEqual(analysis.articles.map((article) => article.article_id), ['A2', 'A1']);
});

test('analysis CSV export preserves very small shares adaptively', () => {
  const articles = [{
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
  }];

  const exportedArticle = parseAnalysisExport(articles).rows[0];
  assert.equal(exportedArticle.share_of_order_lines, '0.0000001');
  assert.equal(exportedArticle.cumulative_share_of_order_lines, '0.0000001');
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
  const lastExportedArticle = parseAnalysisExport(analysis.articles).rows.find((row) => row.article_id === 'A9');

  assert.equal(lastArticle.cumulative_share_of_order_lines, 1);
  assert.equal(lastExportedArticle.share_of_order_lines, '0.1111111111111111');
  assert.equal(lastExportedArticle.cumulative_share_of_order_lines, '1');
});

test('fixed-point aggregation avoids floating-point quantity artifacts', () => {
  const result = csv.importCsv('order_id;article_id;quantity;order_date\nO1;A1;0.1;2026-09-01\nO2;A1;0.2;2026-09-01\n');
  const analysis = csv.analyzeRows(result.rows);

  assert.equal(result.rows[0].quantity, 1000000n);
  assert.equal(result.rows[1].quantity, 2000000n);
  assert.equal(analysis.total_quantity, 3000000n);
  assert.equal(parseAnalysisExport(analysis.articles).rows[0].total_quantity, '0.3');
});

test('analysis CSV export preserves very small positive quantities', () => {
  const result = csv.importCsv('order_id;article_id;quantity;order_date\nO1;A1;0.0000001;2026-09-01\n');
  const analysis = csv.analyzeRows(result.rows);

  assert.equal(result.rows[0].quantity, 1n);
  assert.equal(parseAnalysisExport(analysis.articles).rows[0].total_quantity, '0.0000001');
});

test('analysis CSV export preserves safe integer quantities exactly', () => {
  const result = csv.importCsv('order_id;article_id;quantity;order_date\nO1;A1;1234567890123456;2026-09-01\n');
  const analysis = csv.analyzeRows(result.rows);

  assert.equal(parseAnalysisExport(analysis.articles).rows[0].total_quantity, '1234567890123456');
});

test('analysis CSV export includes per-article sales-value coverage', () => {
  const analysis = csv.analyzeRows([
    { order_id: 'O1', article_id: 'A1', quantity: 10000000n, order_date: '2026-09-01', customer_id: null, sales_value: 10, location: null },
    { order_id: 'O2', article_id: 'A1', quantity: 10000000n, order_date: '2026-09-02', customer_id: null, sales_value: null, location: null },
    { order_id: 'O3', article_id: 'A2', quantity: 10000000n, order_date: '2026-09-02', customer_id: null, sales_value: null, location: null }
  ]);

  const exported = csv.exportAnalysisCsv(analysis.articles);
  const exportedArticles = parseAnalysisExport(analysis.articles).rows;
  const coveredArticle = exportedArticles.find((article) => article.article_id === 'A1');
  const uncoveredArticle = exportedArticles.find((article) => article.article_id === 'A2');

  assert.match(exported, /total_sales;sales_value_rows;share_of_order_lines/);
  assert.equal(coveredArticle.total_sales, '10');
  assert.equal(coveredArticle.sales_value_rows, '1');
  assert.equal(uncoveredArticle.total_sales, '0');
  assert.equal(uncoveredArticle.sales_value_rows, '0');
});

test('analysis CSV export keeps location boundaries as JSON', () => {
  const articles = [
    {
      article_id: 'ONE',
      order_line_count: 1,
      total_quantity: 10000000n,
      distinct_orders: 1,
      distinct_customers: 0,
      active_days: 1,
      total_sales: 0,
      sales_value_rows: 0,
      share_of_order_lines: 0.5,
      cumulative_share_of_order_lines: 0.5,
      locations: ['A, B']
    },
    {
      article_id: 'TWO',
      order_line_count: 1,
      total_quantity: 10000000n,
      distinct_orders: 1,
      distinct_customers: 0,
      active_days: 1,
      total_sales: 0,
      sales_value_rows: 0,
      share_of_order_lines: 0.5,
      cumulative_share_of_order_lines: 1,
      locations: ['A', 'B']
    }
  ];
  const exportedRows = parseAnalysisExport(articles).rows;
  const locationsByArticle = Object.fromEntries(exportedRows.map((row) => [row.article_id, row.locations]));

  assert.deepEqual(JSON.parse(locationsByArticle.ONE), ['A, B']);
  assert.deepEqual(JSON.parse(locationsByArticle.TWO), ['A', 'B']);
});

test('analysis CSV export protects spreadsheet formula text', () => {
  const analysis = csv.analyzeRows([
    { order_id: 'O1', article_id: '=SUM(1,2)', quantity: 10000000n, order_date: '2026-09-01', customer_id: null, sales_value: null, location: '@ZONE' }
  ]);

  const exported = csv.exportAnalysisCsv(analysis.articles);

  assert.match(exported, /'=SUM\(1,2\);/);
  assert.deepEqual(JSON.parse(parseAnalysisExport(analysis.articles).rows[0].locations), ['@ZONE']);
});
