'use strict';

// Developer benchmark: same full core, exact output, original Git baseline.
// Synthetic normalized rows only. Node/Git are not user runtime dependencies.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const core = require('../csv.js');
const current = require('../periods.js');

const DEFAULT_BASELINE = 'db39ffaca31ebeddec884413c38725f4fd38a5a0';
const root = path.resolve(__dirname, '..');
const baselineFlag = process.argv.indexOf('--baseline-ref');
const baselineRef = baselineFlag >= 0 ? process.argv[baselineFlag + 1] : DEFAULT_BASELINE;
const baselineSource = execFileSync('git', ['show', baselineRef + ':periods.js'], { cwd: root, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
const baselineModule = { exports: {} };
new Function('module', baselineSource)(baselineModule);
const baseline = baselineModule.exports;
const quick = process.argv.includes('--quick');
const sizes = quick ? [1000, 10000] : [1000, 10000, 50000];
const repeats = 3;
const median = values => values.slice().sort((a, b) => a - b)[Math.floor(values.length / 2)];
let digest = 0n;

function fixture(count) {
  const start = Date.parse('2025-01-01T00:00:00Z');
  return Array.from({ length: count }, (_, index) => ({
    article_id: 'A' + index % 200, article_name: 'Article ' + index % 200,
    order_id: 'O' + Math.floor(index / 4), customer_id: 'C' + index % 97,
    quantity: BigInt(index % 19 === 0 ? -index : index % 20000) * core.QUANTITY_SCALE,
    sales_value_exact: index % 71 === 0 ? null : String(index % 50000 - 700) + '.12345', sales_value: null,
    sales_unit_count: index % 5 === 0 ? null : BigInt(index % 21) * core.QUANTITY_SCALE,
    quantity_per_sales_unit: 2n * core.QUANTITY_SCALE,
    delivery_date: new Date(start + index * 37 % 365 * 86400000).toISOString().slice(0, 10),
    location: 'L' + index % 31, source_file_id: 'F' + index % 3, source_file_label: 'Source ' + index % 3,
    source_line: index + 2
  }));
}
function settings(count, broad) {
  const start = Date.parse('2025-01-01T00:00:00Z');
  const date = day => new Date(start + day * 86400000).toISOString().slice(0, 10);
  return Array.from({ length: count }, (_, index) => {
    const day = index * 17 % 325;
    return { expectedWeekdays: [1, 2, 3, 4, 5],
      periodA: { name: 'A' + index, start: date(broad ? index : day), end: date(broad ? 364 - index : day + 13) },
      periodB: { name: 'B' + index, start: date(broad ? index + 3 : day + 7), end: date(broad ? 364 : day + 20) } };
  });
}
function timed(run) { const start = performance.now(); const value = run(); return { ms: performance.now() - start, value }; }
function compareSet(api, rows, queries, options) {
  let total = 0n;
  for (const query of queries) total += api.comparePeriods(rows, query, core.analyzeRows, null, null, options).analysisA.total_quantity;
  digest ^= total;
  return total;
}
function buildIndex(rows, revision) {
  current.invalidateComparisonIndex(rows);
  current.comparePeriods(rows, {}, core.analyzeRows, null, null, { indexRevision: revision });
  current.comparePeriods(rows, {}, core.analyzeRows, null, null, { indexRevision: revision });
}

const cases = [];
for (const count of sizes) {
  const rows = fixture(count);
  const revision = { syntheticRows: count };
  const buildSamplesMs = [];
  for (let sample = 0; sample < repeats; sample += 1) {
    current.invalidateComparisonIndex(rows);
    current.comparePeriods(rows, {}, core.analyzeRows, null, null, { indexRevision: revision });
    if (global.gc) global.gc();
    buildSamplesMs.push(timed(() => current.comparePeriods(rows, {}, core.analyzeRows, null, null, { indexRevision: revision })).ms);
  }
  current.invalidateComparisonIndex(rows);
  if (global.gc) global.gc();
  const before = process.memoryUsage();
  buildIndex(rows, revision);
  if (global.gc) global.gc();
  const after = process.memoryUsage();
  const indexInfo = current.comparisonIndexInfo(rows);
  const workloads = [];
  for (const broad of [false, true]) {
    for (const queryCount of broad ? [1, 8] : [1, 8, 32]) {
      const queries = settings(queryCount, broad);
      buildIndex(rows, revision);
      for (const query of queries) {
        const expected = baseline.comparePeriods(rows, query, core.analyzeRows);
        assert.deepEqual(current.comparePeriods(rows, query, core.analyzeRows), expected);
        assert.deepEqual(current.comparePeriods(rows, query, core.analyzeRows, null, null, { indexRevision: revision }), expected);
      }
      const variants = ['baseline', 'currentScan', 'currentIndexCold', 'currentIndexWarm'];
      const samples = Object.fromEntries(variants.map(variant => [variant, []]));
      for (let repeat = -1; repeat < repeats; repeat += 1) {
        const order = variants.slice((repeat + 1) % variants.length).concat(variants.slice(0, (repeat + 1) % variants.length));
        for (const variant of order) {
          if (variant === 'currentIndexCold') current.invalidateComparisonIndex(rows);
          if (variant === 'currentIndexWarm') buildIndex(rows, revision);
          if (global.gc) global.gc();
          const result = timed(() => compareSet(variant === 'baseline' ? baseline : current, rows, queries,
            variant === 'currentIndexCold' || variant === 'currentIndexWarm' ? { indexRevision: revision } : undefined));
          if (repeat >= 0) samples[variant].push(result.ms);
        }
      }
      const timing = Object.fromEntries(variants.map(variant => [variant, { samplesMs: samples[variant], medianMs: median(samples[variant]) }]));
      const savedPerQuery = (timing.currentScan.medianMs - timing.currentIndexWarm.medianMs) / queryCount;
      workloads.push({ range: broad ? 'broad' : 'selective', queryCount, exactFullOutputPassed: true,
        timings: timing, warmIndexBuildPlusQueryMs: median(buildSamplesMs) + timing.currentIndexWarm.medianMs,
        estimatedBreakEvenVersusCurrentScanQueries: savedPerQuery > 0 ? Math.ceil(median(buildSamplesMs) / savedPerQuery) : null });
    }
  }
  cases.push({ rows: count, dates: indexInfo.dates, index: indexInfo,
    buildSamplesMs, buildMedianMs: median(buildSamplesMs), buildIncludesEmptyComparisonFinalization: true,
    retainedMemoryDeltaBytes: { heap: after.heapUsed - before.heapUsed, external: after.external - before.external,
      arrayBuffers: after.arrayBuffers - before.arrayBuffers, rss: after.rss - before.rss }, workloads });
  current.invalidateComparisonIndex(rows);
  console.log(count + ' rows: selective/broad full-output parity and benchmark complete.');
}
const report = { createdUtc: new Date().toISOString(), baselineRef, syntheticOnly: true, knownDatesOnlyForBaselineParity: true,
  environment: { node: process.version, platform: process.platform, cpu: os.cpus()[0].model, logicalCpus: os.cpus().length },
  method: '3 warm samples, rotated order; unchanged Git baseline versus current uncached single-pass versus adaptive cold and warm bounded date-only indexes. Full output equality checked outside timing. Index build includes only empty comparison finalization. Baseline null-coverage bug has separate regression tests.',
  processPeakRssBytes: process.resourceUsage().maxRSS * 1024,
  memoryNote: 'WeakMap held index is dated refs and offsets only; retained deltas measured after GC. Process RSS peak includes all variant output validation and is not the isolated index peak.',
  comparisonIndexLimits: current.COMPARISON_INDEX_LIMITS, cases, digest: digest.toString() };
const destination = path.join(root, 'docs', 'performance', 'results', 'period-index.json');
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, JSON.stringify(report, null, 2) + '\n');
console.log('Saved ' + destination);
