'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const core = require('../csv.js');
const periods = require('../periods.js');

function makeRows(count = 2000) {
  const start = Date.parse('2025-01-01T00:00:00Z');
  return Array.from({ length: count }, (_, index) => ({
    article_id: 'A' + index % 37, article_name: index % 43 === 0 ? 'Conflicting name' : 'Article ' + index % 37,
    order_id: 'O' + Math.floor(index / 3), customer_id: 'C' + index % 11,
    quantity: BigInt(index % 17 === 0 ? -index : index) * core.QUANTITY_SCALE,
    sales_value_exact: index % 23 === 0 ? null : String(index - 70) + '.123456789', sales_value: null,
    sales_unit_count: BigInt(index % 6) * core.QUANTITY_SCALE, quantity_per_sales_unit: 3n * core.QUANTITY_SCALE,
    delivery_date: index % 101 === 0 ? null : new Date(start + index % 365 * 86400000).toISOString().slice(0, 10),
    location: 'L' + index % 7, source_file_id: 'F' + index % 3, source_file_label: 'Source ' + index % 3,
    source_line: index + 2, source_type: 'order-lines'
  }));
}
const settings = { expectedWeekdays: [1, 2, 3, 4, 5],
  periodA: { start: '2025-02-01', end: '2025-02-14' }, periodB: { start: '2025-02-08', end: '2025-02-21' } };

function warmCompare(rows, selectedSettings = settings, analyze = core.analyzeRows, readiness, registry, revision = 'v1') {
  periods.comparePeriods(rows, selectedSettings, analyze, readiness, registry, { indexRevision: revision });
  return periods.comparePeriods(rows, selectedSettings, analyze, readiness, registry, { indexRevision: revision });
}

test('Unknown dates never enter period coverage, including direct and comparison paths', () => {
  const known = makeRows(1)[0]; known.delivery_date = '2025-02-02';
  const rows = [known, ...[null, undefined, '', false, 0].map(delivery_date => ({ ...known, delivery_date, source_file_id: 'unknown', source_file_label: 'Unknown source' }))];
  const coverage = periods.coverageForPeriod(rows, settings.periodA, settings.expectedWeekdays);
  assert.equal(coverage.rowCount, 1); assert.deepEqual(coverage.sourceFiles, ['Source 0']);
  const comparison = periods.comparePeriods(rows, settings, core.analyzeRows);
  assert.equal(comparison.analysisA.total_lines, 1); assert.equal(comparison.coverageA.rowCount, 1);
  assert.equal(comparison.analysisB.total_lines, 0); assert.equal(comparison.coverageB.rowCount, 0);
  const unknownOnly = periods.coverageForPeriod(rows.slice(1), settings.periodA, settings.expectedWeekdays);
  assert.equal(unknownOnly.status, 'empty'); assert.equal(unknownOnly.rowCount, 0);
});

test('Revisioned date-only index preserves every full metric and original detail reference', () => {
  const rows = makeRows();
  rows[402].quantity = 10n ** 90n; rows[403].quantity = -(10n ** 89n);
  rows[405].sales_value_exact = '123456789012345678901234567890.000000001';
  rows.push({ ...rows[405] }); // Source duplicate remains a separate input position.
  rows[407].delivery_date = '2025-02-30'; // Preserve existing lexical handling of malformed string dates.
  const readiness = { periodComparison: { components: { distinctOrders: { status: 'blocked' }, customers: { status: 'partial' } } } };
  const registry = [{ article_id: 'A1', has_master_data: true, master_data: { article_name: 'Master name' }, article_name: 'Master name' }];
  const expected = periods.comparePeriods(rows, settings, core.analyzeRows, readiness, registry);
  const actual = warmCompare(rows, settings, core.analyzeRows, readiness, registry);
  assert.deepEqual(actual, expected);
  assert.equal(actual.overlapping, true);
  const info = periods.comparisonIndexInfo(rows);
  assert.equal(info.status, 'ready'); assert.equal(info.lastStrategy, 'indexed');
  assert.ok(info.typedArrayBytes <= (rows.length + info.dates + 1) * 4);
  for (const period of [actual.analysisA, actual.analysisB]) for (const article of period.articles) {
    assert.deepEqual(article.order_line_refs, article.order_line_refs.slice().sort((a, b) => a - b));
    for (const ref of article.order_line_refs) assert.equal(rows[ref].article_id, article.article_id);
  }
});

test('Empty, reversed and disjoint indexed ranges equal the scan without counting unknown dates', () => {
  const rows = makeRows();
  for (const query of [
    { periodA: { start: '2024-01-01', end: '2024-01-31' }, periodB: { start: '2026-01-01', end: '2026-01-31' } },
    { periodA: { start: '2025-03-01', end: '2025-02-01' }, periodB: { start: null, end: null } },
    { periodA: { start: '2025-01-03', end: '2025-01-04' }, periodB: { start: '2025-12-20', end: '2025-12-25' } }
  ]) assert.deepEqual(warmCompare(rows, query), periods.comparePeriods(rows, query, core.analyzeRows));
});

test('Analyzer compatibility fallback retains original indexes and full coverage when indexed', () => {
  const rows = makeRows();
  const fallback = (subset, options) => core.analyzeRows(subset, options);
  const expected = periods.comparePeriods(rows, settings, core.analyzeRows);
  const actual = warmCompare(rows, settings, fallback);
  assert.deepEqual(actual, expected);
  assert.equal(periods.comparisonIndexInfo(rows).lastStrategy, 'indexed');
});

test('Broad queries use direct scan even when a small bounded date index is ready', () => {
  const rows = makeRows(); warmCompare(rows);
  const broad = { periodA: { start: '2025-01-01', end: '2025-12-31' }, periodB: { start: '2025-01-01', end: '2025-12-31' } };
  assert.deepEqual(periods.comparePeriods(rows, broad, core.analyzeRows, null, null, { indexRevision: 'v1' }), periods.comparePeriods(rows, broad, core.analyzeRows));
  assert.equal(periods.comparisonIndexInfo(rows).lastStrategy, 'scan');
  assert.equal(periods.comparisonIndexInfo(rows).status, 'ready');
});

test('Mutable arrays are uncached by default; revision and explicit invalidation rebuild dates', () => {
  const rows = makeRows();
  periods.comparePeriods(rows, settings, core.analyzeRows);
  assert.equal(periods.comparisonIndexInfo(rows).status, 'absent');
  warmCompare(rows);
  rows[650].delivery_date = '2025-02-02';
  assert.equal(periods.invalidateComparisonIndex(rows), true);
  assert.equal(periods.comparisonIndexInfo(rows).status, 'absent');
  const afterInvalidation = warmCompare(rows);
  assert.deepEqual(afterInvalidation, periods.comparePeriods(rows, settings, core.analyzeRows));
  rows[651].delivery_date = '2025-02-02';
  const changedRevision = periods.comparePeriods(rows, settings, core.analyzeRows, null, null, { indexRevision: 'v2' });
  assert.deepEqual(changedRevision, periods.comparePeriods(rows, settings, core.analyzeRows));
  assert.equal(periods.comparisonIndexInfo(rows).status, 'pending');
  rows.push({ ...rows[650] });
  const afterAppend = periods.comparePeriods(rows, settings, core.analyzeRows, null, null, { indexRevision: 'v2' });
  assert.deepEqual(afterAppend, periods.comparePeriods(rows, settings, core.analyzeRows));
  assert.equal(periods.comparisonIndexInfo(rows).calls, 1);
  rows.splice(100);
  periods.comparePeriods(rows, settings, core.analyzeRows, null, null, { indexRevision: 'v2' });
  assert.equal(periods.comparisonIndexInfo(rows).status, 'absent');
});

test('Bounds prevent retained index allocation for huge row counts and date cardinalities', () => {
  const tooManyRows = new Array(periods.COMPARISON_INDEX_LIMITS.maxRows + 1).fill(null);
  warmCompare(tooManyRows);
  const rowInfo = periods.comparisonIndexInfo(tooManyRows);
  assert.equal(rowInfo.status, 'unsupported'); assert.equal(rowInfo.typedArrayBytes, 0);
  const rows = makeRows(periods.COMPARISON_INDEX_LIMITS.maxDates + 1);
  const start = Date.parse('2010-01-01T00:00:00Z');
  rows.forEach((row, index) => { row.delivery_date = new Date(start + index * 86400000).toISOString().slice(0, 10); });
  warmCompare(rows);
  const dateInfo = periods.comparisonIndexInfo(rows);
  assert.equal(dateInfo.status, 'unsupported'); assert.equal(dateInfo.typedArrayBytes, 0);
  assert.equal(periods.invalidateComparisonIndex(rows), true);
  assert.equal(periods.comparisonIndexInfo(rows).status, 'absent');
});

test('Unexpected date representations use scan fallback instead of changing legacy coercion', () => {
  const rows = makeRows(); rows[90].delivery_date = new Date('2025-02-02T00:00:00Z');
  assert.deepEqual(warmCompare(rows), periods.comparePeriods(rows, settings, core.analyzeRows));
  assert.equal(periods.comparisonIndexInfo(rows).status, 'unsupported');
});

test('Date index never caches quantities, names, sales, readiness or registry outputs', () => {
  const rows = makeRows(); warmCompare(rows);
  const target = rows.find(row => row.delivery_date >= settings.periodA.start && row.delivery_date <= settings.periodA.end);
  target.quantity = -(10n ** 100n); target.sales_value_exact = '99999999999999999999999.000000000001';
  target.article_name = 'Name changed after date indexing';
  const readiness = { periodComparison: { components: { customers: { status: 'blocked' } } } };
  const registry = [{ article_id: target.article_id, has_master_data: true, master_data: { article_name: 'Updated master' } }];
  assert.deepEqual(periods.comparePeriods(rows, settings, core.analyzeRows, readiness, registry, { indexRevision: 'v1' }),
    periods.comparePeriods(rows, settings, core.analyzeRows, readiness, registry));
  assert.equal(periods.comparisonIndexInfo(rows).lastStrategy, 'indexed');
});

test('Revision replaces same-length reordered input and source indexes follow its current ordering', () => {
  const rows = makeRows(); warmCompare(rows);
  rows.reverse();
  const current = warmCompare(rows, settings, core.analyzeRows, null, null, 'reordered-v2');
  assert.deepEqual(current, periods.comparePeriods(rows, settings, core.analyzeRows));
  for (const article of current.analysisA.articles) for (const ref of article.order_line_refs) assert.equal(rows[ref].article_id, article.article_id);
});

test('Weak cache does not retain released analysis input even when its revision refers back to rows', () => {
  const script = [
    "const periods = require(process.argv[1]); const core = require(process.argv[2]);",
    "let rows = Array.from({length: 512}, (_, i) => ({article_id:'A',quantity:1n,delivery_date:'2025-02-02',order_id:'O'+i}));",
    "let revision = {rows}; const query = {periodA:{start:'2025-02-01',end:'2025-02-03'},periodB:{start:'2025-03-01',end:'2025-03-03'}};",
    "periods.comparePeriods(rows,query,core.analyzeRows,null,null,{indexRevision:revision}); periods.comparePeriods(rows,query,core.analyzeRows,null,null,{indexRevision:revision});",
    "if(periods.comparisonIndexInfo(rows).status !== 'ready') throw Error('index not built');",
    "const reference = new WeakRef(rows); rows = null; revision = null; let attempt = 0;",
    "function collect(){ global.gc(); if(!reference.deref()){process.stdout.write('collected');return;} if(++attempt === 20) throw Error('input retained'); setImmediate(collect); } setImmediate(collect);"
  ].join('\n');
  const output = execFileSync(process.execPath, ['--expose-gc', '-e', script, path.resolve(__dirname, '..', 'periods.js'), path.resolve(__dirname, '..', 'csv.js')],
    { encoding: 'utf8', timeout: 10000 });
  assert.equal(output, 'collected');
});
