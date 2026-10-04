'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../../../csv.js');
const periods = require('../../../periods.js');
const terminal = require('../../../terminal.js');
const { INT64_MAX, movementEntries, mapTotals, createColumnSnapshot } = require('./exact-kernel.cjs');
const { createRangeEngine } = require('./range-engine.cjs');
const { syntheticRows, queries } = require('./fixtures.cjs');
const { createDistinctIndex, countSet, popcount } = require('./distinct-engine.cjs');

function canonicalGroups(result) {
  return Object.assign({}, result, { groups: result.groups.slice().sort((a, b) => String(a.article_id).localeCompare(String(b.article_id))) });
}

function baselineCompare(rows, settings, readiness, registry, locale = 'en') {
  const { entries } = movementEntries(rows);
  const adapter = function (subset, options) { return core.analyzeRows(subset, options); };
  adapter.createAnalysisAccumulator = function () {
    const accumulator = core.createAnalysisAccumulator({ locale });
    return { consume(row, index) { accumulator.consume(row, entries[index].detailIndex); }, finish() { return accumulator.finish({ locale }); } };
  };
  return periods.comparePeriods(entries.map(entry => entry.row), settings, adapter, readiness, registry);
}

test('Dictionary BigInt and proven Int64 kernels agree with current exact totals', () => {
  for (const count of [0, 1, 100, 10000]) {
    const rows = syntheticRows(count);
    const baseline = core.analyzeRows(rows);
    const expected = canonicalGroups(mapTotals(rows));
    for (const int64 of [false, true]) {
      const snapshot = createColumnSnapshot(rows, { int64 });
      assert.deepEqual(canonicalGroups(snapshot.quantityTotals()), expected);
      assert.equal(snapshot.quantityTotals().quantity, baseline.total_quantity);
      assert.equal(snapshot.quantityTotals().lines, baseline.total_lines);
      for (const article of baseline.articles) {
        const group = expected.groups.find(group => group.article_id === article.article_id);
        assert.equal(group.quantity, article.total_quantity);
        assert.equal(group.lines, article.order_line_count);
      }
    }
  }
});

test('Int64 boundary proof prevents wrapping even for cancellation and huge negative values', () => {
  const row = quantity => ({ article_id: '__proto__', quantity });
  assert.equal(createColumnSnapshot([row(INT64_MAX)], { int64: true }).representation, 'int64-proven');
  for (const quantities of [[INT64_MAX, 1n], [INT64_MAX, -INT64_MAX], [-(1n << 63n)], [10n ** 90n, -(10n ** 89n)]]) {
    const rows = quantities.map(row);
    const snapshot = createColumnSnapshot(rows, { int64: true });
    assert.equal(snapshot.representation, 'bigint-unbounded');
    assert.deepEqual(snapshot.quantityTotals(), mapTotals(rows));
  }
});

test('Master rows are separate from movement metrics and source duplicates are retained', () => {
  const duplicate = syntheticRows(1)[0];
  duplicate.delivery_date = '2025-01-05';
  const rows = [duplicate, { article_id: 'MASTER', source_type: 'article-master', quantity: null }, duplicate];
  assert.equal(mapTotals(rows).lines, 2);
  assert.equal(mapTotals(rows).excludedMasters, 1);
  const engine = createRangeEngine(rows, { revision: 'duplicate' });
  const settings = { periodA: { start: '2025-01-01', end: '2025-01-09' }, periodB: { start: '2025-01-05', end: '2025-01-10' } };
  const result = engine.compareFull(settings);
  assert.deepEqual(result, baselineCompare(rows, settings));
  assert.deepEqual(result.analysisA.articles[0].order_line_refs, [0, 2]);
  assert.equal(result.analysisA.total_lines, 2);
  assert.equal(result.analysisB.total_lines, 2);
  assert.equal(result.overlapping, true);
});

test('Prefix range mathematics agrees with exact source row sums including negatives', () => {
  const rows = syntheticRows(10000);
  rows[51].quantity = 10n ** 70n;
  const engine = createRangeEngine(rows, { revision: 'ranges' });
  for (const settings of queries(40)) {
    const { start, end } = settings.periodA;
    const selected = rows.filter(row => periods.validDate(row.delivery_date) && row.delivery_date >= start && row.delivery_date <= end);
    const expected = { quantity: selected.reduce((sum, row) => sum + row.quantity, 0n), lines: selected.length,
      observedDays: new Set(selected.map(row => row.delivery_date)).size };
    assert.deepEqual(engine.queryRange(start, end), expected);
  }
  assert.deepEqual(engine.queryRange('2025-02-30', '2025-03-01'), { quantity: 0n, lines: 0, observedDays: 0 });
  assert.deepEqual(engine.queryRange('2025-06-01', '2025-01-01'), { quantity: 0n, lines: 0, observedDays: 0 });
  assert.equal(engine.metadata.unknownDateRows, rows.filter(row => !row.delivery_date).length);
});

test('Full indexed adapter equals current single-pass engine with currencies, readiness, registry and locale', () => {
  const rows = syntheticRows(5000);
  rows[51].quantity = -(10n ** 60n);
  rows[51].sales_value_exact = '123456789012345678901234567890.000000001';
  rows[2].article_name = 'Conflict';
  rows[3].delivery_date = '2025-02-30';
  rows.push({ article_id: 'A1', article_name: 'Master name', source_type: 'article-master', quantity: null });
  const registry = [{ article_id: 'A1', has_master_data: true, article_name: 'Master name', master_data: { article_name: 'Master name' } }];
  const readiness = { periodComparison: { components: { distinctOrders: { status: 'blocked' }, customers: { status: 'partial' } } } };
  const engine = createRangeEngine(rows, { revision: 'domain' });
  for (const settings of queries(16)) {
    for (const locale of ['de', 'en']) assert.deepEqual(engine.compareFull(settings, readiness, registry, { locale }), baselineCompare(rows, settings, readiness, registry, locale));
  }
  assert.equal(engine.metadata.invalidDateRows, 1);
});

test('Entity postings preserve current terminal summary, chart points and latest line order', () => {
  const rows = syntheticRows(7000);
  const engine = createRangeEngine(rows, { revision: 'terminal' });
  for (const scope of ['article', 'customer', 'order']) {
    const key = terminal.entityKey(rows[43], scope);
    for (const days of ['all', 14, 365]) {
      assert.deepEqual(engine.selectedSummary(scope, key, '2025-12-31', days), terminal.selectedSummary(rows, scope, key, '2025-12-31', days));
      const start = terminal.rangeStart('2025-12-31', days) || '2025-01-01';
      const selected = rows.filter(row => terminal.entityKey(row, scope) === key && periods.validDate(row.delivery_date) && row.delivery_date >= start && row.delivery_date <= '2025-12-31');
      assert.deepEqual(engine.queryEntity(scope, key, start, '2025-12-31'), { quantity: selected.reduce((sum, row) => sum + row.quantity, 0n), lines: selected.length,
        observedDays: new Set(selected.map(row => row.delivery_date)).size });
    }
    const allRows = rows.filter(row => terminal.entityKey(row, scope) === key);
    assert.deepEqual(engine.queryEntityAll(scope, key), { quantity: allRows.reduce((sum, row) => sum + row.quantity, 0n), lines: allRows.length });
  }
});

test('Chart day/week/month buckets preserve expected-versus-observed missingness', () => {
  const rows = syntheticRows(1700);
  const engine = createRangeEngine(rows, { revision: 'chart' });
  const dates = new Map();
  for (const row of rows) {
    if (!periods.validDate(row.delivery_date)) continue;
    const point = dates.get(row.delivery_date) || { date: row.delivery_date, quantity: 0n, lines: 0 };
    point.quantity += row.quantity; point.lines += 1; dates.set(row.delivery_date, point);
  }
  const expectedDates = ['2025-01-03', '2025-01-04', '2025-01-05'];
  const observedDates = ['2025-01-03', '2025-01-05'];
  for (const granularity of ['day', 'week', 'month']) {
    assert.deepEqual(engine.queryChart('2025-01-01', '2025-01-31', granularity, expectedDates, observedDates),
      terminal.aggregateChart(Array.from(dates.values()), '2025-01-01', '2025-01-31', granularity, expectedDates, observedDates));
  }
});

test('Snapshot isolation, explicit revision and disposal prevent stale metric reuse', () => {
  const rows = syntheticRows(100);
  const engine = createRangeEngine(rows, { revision: 'v1' });
  const before = engine.queryRange('2025-01-01', '2025-12-31');
  rows[7].quantity = 10n ** 70n; rows[7].delivery_date = '2025-01-02';
  assert.deepEqual(engine.queryRange('2025-01-01', '2025-12-31'), before);
  assert.throws(() => engine.queryRange('2025-01-01', '2025-12-31', 'v2'), /Stale/);
  assert.throws(() => createRangeEngine(rows), /revision/);
  engine.dispose();
  assert.throws(() => engine.queryRange('2025-01-01', '2025-12-31'), /disposed/);
});

test('Malformed quantities are rejected instead of silently converted to Number', () => {
  for (const quantity of [0, 1.01, '1000000', null, undefined]) {
    assert.throws(() => createColumnSnapshot([{ article_id: 'A', quantity }]), /BigInt/);
    assert.throws(() => createRangeEngine([{ article_id: 'A', quantity }], { revision: 'bad' }), /BigInt/);
  }
});

test('Empty ranges and missing entity keys are deterministic and have no inferred sales', () => {
  const engine = createRangeEngine([], { revision: 'empty' });
  assert.deepEqual(engine.queryRange('2025-01-01', '2025-02-01'), { quantity: 0n, lines: 0, observedDays: 0 });
  assert.deepEqual(engine.queryEntity('article', 'missing', '2025-01-01', '2025-02-01'), { quantity: 0n, lines: 0, observedDays: 0 });
  assert.deepEqual(engine.compareFull(queries(1)[0]), baselineCompare([], queries(1)[0]));
  assert.throws(() => engine.queryEntity('wrong', 'A', '2025-01-01', '2025-02-01'), /scope/);
});

test('Selective date/article indexes preserve full parity and reject unbuilt scopes', () => {
  const rows = syntheticRows(1000);
  const full = createRangeEngine(rows, { revision: 'scopes' });
  for (const scopes of [[], ['article']]) {
    const selective = createRangeEngine(rows, { revision: 'scopes', scopes });
    assert.deepEqual(selective.queryRange('2025-01-01', '2025-01-31'), full.queryRange('2025-01-01', '2025-01-31'));
    assert.deepEqual(selective.compareFull(queries(1)[0]), full.compareFull(queries(1)[0]));
    assert.throws(() => selective.queryEntity('customer', 'C1', '2025-01-01', '2025-01-31'), /not indexed/);
  }
  assert.throws(() => createRangeEngine(rows, { revision: 'scopes', scopes: ['bad'] }), /scopes/);
});

test('Exact dictionary-bitset distinct counts preserve different core and terminal order keys', () => {
  const rows = syntheticRows(10000);
  rows.push({ ...rows[43], customer_id: 'OTHER', order_id: rows[43].order_id });
  rows.push({ article_id: 'MASTER', quantity: null, source_type: 'article-master' });
  for (const scope of ['core-orders', 'terminal-orders', 'customers']) {
    const index = createDistinctIndex(rows, scope);
    assert.equal(index.count(), countSet(rows, scope));
    for (const query of queries(8)) assert.equal(index.count(query.periodA.start, query.periodA.end), countSet(rows, scope, query.periodA.start, query.periodA.end));
  }
  const coreOrders = createDistinctIndex(rows, 'core-orders').count();
  const terminalOrders = createDistinctIndex(rows, 'terminal-orders').count();
  assert.ok(terminalOrders > coreOrders);
  assert.equal(popcount(0xffffffff), 32);
  assert.equal(popcount(0x80000000), 1);
  assert.equal(popcount(0), 0);
});

test('Current unknown-date coverage discrepancy is visible, not silently changed by full adapter', () => {
  const rows = syntheticRows(2);
  rows[0].delivery_date = null;
  rows[1].delivery_date = '2025-01-03';
  const settings = { periodA: { start: '2025-01-01', end: '2025-01-07' }, periodB: { start: '2025-01-08', end: '2025-01-14' } };
  const baseline = periods.comparePeriods(rows, settings, core.analyzeRows);
  const engine = createRangeEngine(rows, { revision: 'unknown' });
  assert.equal(baseline.analysisA.total_lines, 1);
  assert.equal(baseline.coverageA.rowCount, 2);
  assert.equal(baseline.analysisB.total_lines, 0);
  assert.equal(baseline.coverageB.rowCount, 1);
  assert.deepEqual(engine.compareFull(settings), baseline);
  assert.equal(engine.metadata.unknownDateRows, 1);
  assert.equal(engine.queryRange('2025-01-01', '2025-01-07').lines, 1);
});
