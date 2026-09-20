const assert = require('node:assert/strict');
const test = require('node:test');

const csv = require('../csv.js');
const periods = require('../periods.js');

function fixtureRows() {
  return csv.importCsv([
    'order_id;article_id;article_name;quantity;delivery_date;sales_value;sales_unit_count;quantity_per_sales_unit',
    'O-1;A-1;Article one;10;2026-09-01;10.10;2;5',
    'O-2;A-1;Article one;5;2026-09-02;5;1;5',
    'O-3;A-1;Article one;8;2026-09-04;20.25;2;4',
    'O-4;A-2;Article two;3;2026-09-04;3;1;3'
  ].join('\n') + '\n').rows;
}

test('coverage reports missing expected days as unknown rather than zero demand', () => {
  const coverage = periods.coverageForPeriod(fixtureRows(), {
    name: 'Week',
    start: '2026-09-01',
    end: '2026-09-04'
  }, [2, 3, 4, 5]);

  assert.equal(coverage.status, 'partial');
  assert.equal(coverage.expectedDayCount, 4);
  assert.equal(coverage.observedDayCount, 3);
  assert.deepEqual(coverage.missingDates, ['2026-09-03']);
  assert.equal(coverage.rowCount, 4);
});

test('coverage returns unavailable for periods longer than the supported window', () => {
  const coverage = periods.coverageForPeriod(fixtureRows(), {
    name: 'Too long',
    start: '1900-01-01',
    end: '2201-01-01'
  }, [0, 1, 2, 3, 4, 5, 6]);

  assert.equal(coverage.status, 'unavailable');
  assert.equal(coverage.rowCount, 4);
});

test('period comparison keeps absolute and relative changes separate', () => {
  const rows = fixtureRows();
  const comparison = periods.comparePeriods(rows, {
    expectedWeekdays: [2, 3, 4, 5],
    periodA: { name: 'Before', start: '2026-09-01', end: '2026-09-02' },
    periodB: { name: 'After', start: '2026-09-03', end: '2026-09-04' }
  }, csv.analyzeRows);

  const articleOne = comparison.articles.find((article) => article.article_id === 'A-1');
  const articleTwo = comparison.articles.find((article) => article.article_id === 'A-2');
  assert.equal(comparison.coverageA.status, 'complete');
  assert.equal(comparison.coverageB.status, 'partial');
  assert.equal(comparison.summary.activeDayChange, -1);
  assert.equal(comparison.summary.salesChangeExact, '8.15');
  assert.equal(comparison.summary.salesRowChange, 0);
  assert.equal(comparison.summary.salesUnitRowChange, 0);
  assert.equal(articleOne.quantity_change, -70000000n);
  assert.equal(articleOne.quantity_percent_change, -46.66);
  assert.equal(articleOne.state, 'decreased');
  assert.equal(articleOne.selling_unit_conflict, true);
  assert.equal(articleTwo.state, 'new');
  assert.equal(articleTwo.quantity_percent_change, null);
  assert.deepEqual(articleOne.article_name_variants, ['Article one']);
  assert.equal(csv.articleMatchesQuery(articleOne, 'article one', 'en'), true);
  assert.deepEqual(articleOne.period_a.order_line_refs.map((index) => rows[index].order_id), ['O-1', 'O-2']);
  assert.deepEqual(articleOne.period_b.order_line_refs.map((index) => rows[index].order_id), ['O-3']);
});

test('period comparison marks order metrics unavailable when order identity is missing', () => {
  const rows = csv.importCsv('article_id;quantity;delivery_date\nA-1;2;2026-09-01\n').rows;
  const readiness = {
    periodComparison: {
      components: { distinctOrders: { status: 'blocked' } }
    }
  };
  const comparison = periods.comparePeriods(rows, {
    expectedWeekdays: [2],
    periodA: { name: 'Before', start: '2026-09-01', end: '2026-09-01' },
    periodB: { name: 'After', start: '2026-09-02', end: '2026-09-02' }
  }, csv.analyzeRows, readiness);

  assert.equal(comparison.order_metrics_status, 'blocked');
  assert.equal(comparison.analysisA.distinct_orders, null);
  assert.equal(comparison.analysisA.average_quantity_per_order, null);
  assert.equal(comparison.summary.orderChange, null);
  assert.equal(comparison.articles[0].period_a.distinct_orders, null);
  assert.match(periods.exportComparisonCsv(comparison, csv), /change_state;order_metrics_status;/);
});

test('single-pass comparison matches the reference metrics and coverage', () => {
  const rows = fixtureRows();
  const settings = {
    expectedWeekdays: [2, 3, 4, 5],
    periodA: { name: 'Before', start: '2026-09-01', end: '2026-09-02' },
    periodB: { name: 'After', start: '2026-09-03', end: '2026-09-04' }
  };
  const optimized = periods.comparePeriods(rows, settings, csv.analyzeRows);
  const referenceAnalyzer = (subset) => csv.analyzeRows(subset);
  const reference = periods.comparePeriods(rows, settings, referenceAnalyzer);
  const compatibilityAnalyzer = (subset, options) => csv.analyzeRows(subset, options);
  const compatibility = periods.comparePeriods(rows, settings, compatibilityAnalyzer);
  const comparablePeriod = (period) => {
    const copy = { ...period };
    delete copy.order_line_refs;
    return copy;
  };
  const comparable = (comparison) => ({
    coverageA: comparison.coverageA,
    coverageB: comparison.coverageB,
    summary: comparison.summary,
    articles: comparison.articles.map((article) => ({
      article_id: article.article_id,
      article_name: article.article_name,
      quantity_change: article.quantity_change,
      quantity_percent_change: article.quantity_percent_change,
      line_change: article.line_change,
      state: article.state,
      selling_unit_conflict: article.selling_unit_conflict,
      selling_unit_partial: article.selling_unit_partial,
      selling_unit_overage: article.selling_unit_overage,
      period_a: comparablePeriod(article.period_a),
      period_b: comparablePeriod(article.period_b)
    }))
  });
  assert.deepEqual(comparable(optimized), comparable(reference));
  const compatibilityArticle = compatibility.articles.find((article) => article.article_id === 'A-1');
  assert.deepEqual(compatibilityArticle.period_a.order_line_refs, [0, 1]);
  assert.deepEqual(compatibilityArticle.period_b.order_line_refs, [2]);
});

test('comparison CSV exports period boundaries, unit metrics, and formula-safe text', () => {
  const comparison = periods.comparePeriods(fixtureRows(), {
    expectedWeekdays: [0, 1, 2, 3, 4, 5, 6],
    periodA: { name: 'Before', start: '2026-09-01', end: '2026-09-02' },
    periodB: { name: 'After', start: '2026-09-03', end: '2026-09-04' }
  }, csv.analyzeRows);
  comparison.articles[0].article_name = '=SUM(A1:A2)';

  const exported = periods.exportComparisonCsv(comparison, csv);
  assert.match(exported, /period_a_start;period_a_end;period_a_lines;period_a_quantity;period_a_orders;period_a_customers;period_a_active_days;period_a_sales;period_a_sales_rows;period_a_sales_units/);
  assert.match(exported, /period_b_orders;period_b_customers;period_b_active_days;period_b_sales;period_b_sales_rows/);
  assert.match(exported, /selling_unit_conflict;selling_unit_partial;selling_unit_overage;period_a_source_files;period_b_source_files/);
  assert.match(exported, /'=SUM\(A1:A2\)/);
});

test('comparison export reports conflicts across period boundaries', () => {
  const rows = fixtureRows();
  rows.find((row) => row.article_id === 'A-1' && row.delivery_date === '2026-09-04').article_name = 'Article one revised';
  const comparison = periods.comparePeriods(rows, {
    expectedWeekdays: [0, 1, 2, 3, 4, 5, 6],
    periodA: { name: 'Before', start: '2026-09-01', end: '2026-09-02' },
    periodB: { name: 'After', start: '2026-09-03', end: '2026-09-04' }
  }, csv.analyzeRows);

  const articleOne = comparison.articles.find((article) => article.article_id === 'A-1');
  assert.equal(articleOne.selling_unit_conflict, true);
  const exported = periods.exportComparisonCsv(comparison, csv);
  const articleLine = exported.split('\r\n').find((line) => line.startsWith('A-1;'));
  assert.match(articleLine, /^A-1;[^;]*;true;/);
});

test('comparison export uses ungrouped invariant numeric values', () => {
  const comparison = periods.comparePeriods(fixtureRows(), {
    expectedWeekdays: [0, 1, 2, 3, 4, 5, 6],
    periodA: { name: 'Before', start: '2026-09-01', end: '2026-09-02' },
    periodB: { name: 'After', start: '2026-09-03', end: '2026-09-04' }
  }, csv.analyzeRows);
  const article = comparison.articles[0];
  article.period_a.total_quantity = 12345000000n;
  article.period_b.total_quantity = 24679000000n;
  article.period_a.total_sales_exact = '1234.56';
  article.period_b.total_sales_exact = '9876.54';
  article.period_a.total_sales_units = 12345000000n;
  article.period_b.total_sales_units = 24679000000n;
  article.quantity_change = 12334000000n;

  const exported = periods.exportComparisonCsv(comparison, csv);
  assert.match(exported, /;1234\.5;/);
  assert.match(exported, /;1234\.56;/);
  assert.match(exported, /;2467\.9;/);
  assert.doesNotMatch(exported, /1,234|2,467|9,876/);
});

test('default periods use the detected ISO calendar week boundaries', () => {
  const settings = periods.defaultSettings(fixtureRows());

  assert.equal(settings.mode, 'weeks');
  assert.deepEqual(settings.periodA, { name: 'KW36/2026', start: '2026-08-31', end: '2026-09-06' });
  assert.deepEqual(settings.periodB, { name: 'KW36/2026', start: '2026-08-31', end: '2026-09-06' });
});

test('calendar-week detection follows ISO years and reports observed rows', () => {
  const weeks = periods.detectedCalendarWeeks([
    { delivery_date: '2026-12-31' },
    { delivery_date: '2027-01-01' },
    { delivery_date: '2027-01-04' }
  ]);

  assert.deepEqual(weeks, [
    { id: '2026-W53', year: 2026, week: 53, start: '2026-12-28', end: '2027-01-03', name: 'KW53/2026', rowCount: 2, observedDayCount: 2 },
    { id: '2027-W01', year: 2027, week: 1, start: '2027-01-04', end: '2027-01-10', name: 'KW01/2027', rowCount: 1, observedDayCount: 1 }
  ]);
});

test('calendar-week detection handles early ISO week-years without the Date.UTC 1900 offset', () => {
  const weeks = periods.detectedCalendarWeeks([{ delivery_date: '0100-01-01' }]);

  assert.equal(weeks.length, 1);
  assert.equal(weeks[0].id, '0099-W53');
  assert.equal(weeks[0].start, '0099-12-28');
  assert.equal(weeks[0].end, '0100-01-03');
});

test('calendar-week detection keeps the upper supported date representable', () => {
  const rows = [{ delivery_date: '9999-12-31' }];
  const weeks = periods.detectedCalendarWeeks(rows);

  assert.equal(weeks.length, 1);
  assert.equal(weeks[0].start, '9999-12-27');
  assert.equal(weeks[0].end, '9999-12-31');
  assert.deepEqual(periods.defaultSettings(rows).periodB, {
    name: weeks[0].name,
    start: weeks[0].start,
    end: weeks[0].end
  });
});

test('default calendar-week comparison selects the latest two detected weeks', () => {
  const settings = periods.defaultSettings([
    { delivery_date: '2026-08-10' },
    { delivery_date: '2026-08-17' },
    { delivery_date: '2026-08-24' }
  ]);

  assert.deepEqual(settings.periodA, { name: 'KW34/2026', start: '2026-08-17', end: '2026-08-23' });
  assert.deepEqual(settings.periodB, { name: 'KW35/2026', start: '2026-08-24', end: '2026-08-30' });
});

test('large period comparisons remain stack-safe and exact', () => {
  const rows = [];
  for (let index = 0; index < 20000; index += 1) {
    rows.push({
      order_id: 'O-' + index,
      article_id: 'A-' + (index % 250),
      article_name: 'Article ' + (index % 250),
      quantity: 10000000n,
      delivery_date: index < 10000 ? '2026-09-01' : '2026-09-02',
      customer_id: null,
      location: null,
      sales_value: null,
      sales_value_exact: null,
      sales_unit_count: 10000000n,
      quantity_per_sales_unit: 10000000n,
      sales_unit_quantity_matches: true,
      sales_unit_quantity_relation: 'exact',
      source_file_id: 'source-1',
      source_file_name: 'large.csv',
      source_file_label: 'large.csv',
      source_line: index + 2,
    });
  }

  const comparison = periods.comparePeriods(rows, {
    expectedWeekdays: [2, 3],
    periodA: { name: 'A', start: '2026-09-01', end: '2026-09-01' },
    periodB: { name: 'B', start: '2026-09-02', end: '2026-09-02' }
  }, csv.analyzeRows);

  assert.equal(comparison.analysisA.total_lines, 10000);
  assert.equal(comparison.analysisB.total_lines, 10000);
  assert.equal(comparison.articles.length, 250);
  assert.equal(comparison.summary.quantityChange, 0n);
});
