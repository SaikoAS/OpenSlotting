'use strict';

// Developer-only benchmark. Synthetic rows; no user data, network or installs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const core = require('../../../csv.js');
const periods = require('../../../periods.js');
const terminal = require('../../../terminal.js');
const { mapTotals, createColumnSnapshot } = require('./exact-kernel.cjs');
const { createRangeEngine } = require('./range-engine.cjs');
const { syntheticRows, queries } = require('./fixtures.cjs');

const REPEATS = 5;
let sink = 0n;
function median(values) { const ordered = values.slice().sort((a, b) => a - b); return ordered[Math.floor(ordered.length / 2)]; }
function timed(run) { const start = performance.now(); const value = run(); const ms = performance.now() - start; return { ms, value }; }
function memory() { const value = process.memoryUsage(); return { rssBytes: value.rss, heapBytes: value.heapUsed, externalBytes: value.external, arrayBufferBytes: value.arrayBuffers }; }
function retainedBuild(build) {
  if (global.gc) global.gc();
  const before = memory();
  const result = timed(build);
  if (global.gc) global.gc();
  const after = memory();
  return { object: result.value, ms: result.ms, memoryDelta: Object.fromEntries(Object.keys(before).map(key => [key, after[key] - before[key]])) };
}
function measuredVariants(variants) {
  const samples = Object.fromEntries(Object.keys(variants).map(key => [key, []]));
  const keys = Object.keys(variants);
  for (const key of keys) variants[key]();
  for (let repeat = 0; repeat < REPEATS; repeat += 1) {
    const rotated = keys.slice(repeat % keys.length).concat(keys.slice(0, repeat % keys.length));
    for (const key of rotated) {
      if (global.gc) global.gc();
      const result = timed(variants[key]);
      if (typeof result.value === 'bigint') sink ^= result.value;
      samples[key].push(result.ms);
    }
  }
  return Object.fromEntries(keys.map(key => [key, { samplesMs: samples[key], medianMs: median(samples[key]) }]));
}
function narrowScan(rows, from, to) {
  let quantity = 0n; let lines = 0; const days = new Set();
  for (const row of rows) {
    if (!row.delivery_date || row.delivery_date < from || row.delivery_date > to) continue;
    quantity += row.quantity; lines += 1; days.add(row.delivery_date);
  }
  return { quantity, lines, observedDays: days.size };
}
function breakEven(buildMs, referenceMs, indexedMs, queryCount) {
  const savedPerQuery = (referenceMs - indexedMs) / queryCount;
  return savedPerQuery > 0 ? Math.ceil(buildMs / savedPerQuery) : null;
}

function runCase(count) {
  const rows = syntheticRows(count);
  const settings = queries(32);
  const baselineMemory = memory();
  const buildTimes = measuredVariants({
    columnsBigInt() { const columns = createColumnSnapshot(rows); return columns.quantityTotals().quantity; },
    columnsInt64() { const columns = createColumnSnapshot(rows, { int64: true }); return columns.quantityTotals().quantity; },
    rangeIndex() { const engine = createRangeEngine(rows, { revision: 'benchmark-' + count }); return engine.queryRange('2025-01-01', '2025-12-31').quantity; }
  });
  // Record pure build separately from the above build+first-result measurements.
  const pureBuild = { columnsBigInt: [], columnsInt64: [], rangeIndex: [], dateOnlyIndex: [], articleIndex: [] };
  for (let repeat = 0; repeat < REPEATS; repeat += 1) {
    for (const variant of Object.keys(pureBuild).slice(repeat % 5).concat(Object.keys(pureBuild).slice(0, repeat % 5))) {
      if (global.gc) global.gc();
      const isIndex = ['rangeIndex', 'dateOnlyIndex', 'articleIndex'].includes(variant);
      const measured = timed(() => isIndex ? createRangeEngine(rows, { revision: 'benchmark-' + count,
        scopes: variant === 'dateOnlyIndex' ? [] : variant === 'articleIndex' ? ['article'] : undefined }) : createColumnSnapshot(rows, { int64: variant === 'columnsInt64' }));
      pureBuild[variant].push(measured.ms);
      if (isIndex) measured.value.dispose();
    }
  }
  const bigint = retainedBuild(() => createColumnSnapshot(rows));
  const int64 = retainedBuild(() => createColumnSnapshot(rows, { int64: true }));
  const range = retainedBuild(() => createRangeEngine(rows, { revision: 'benchmark-' + count }));
  const dateOnly = retainedBuild(() => createRangeEngine(rows, { revision: 'benchmark-' + count, scopes: [] }));
  const articleOnly = retainedBuild(() => createRangeEngine(rows, { revision: 'benchmark-' + count, scopes: ['article'] }));
  const engine = range.object;
  const exact = mapTotals(rows);
  assert.deepEqual(bigint.object.quantityTotals(), exact);
  assert.deepEqual(int64.object.quantityTotals(), exact);
  // Full equality is verified outside all timings for every distinct period.
  for (const query of settings) {
    assert.deepEqual(engine.compareFull(query), periods.comparePeriods(rows, query, core.analyzeRows));
    assert.deepEqual(engine.queryRange(query.periodA.start, query.periodA.end), narrowScan(rows, query.periodA.start, query.periodA.end));
  }
  const domainReference = measuredVariants({ currentAnalyzeRows() { return core.analyzeRows(rows).total_quantity; } });
  const quantities = [];
  const periodResults = [];
  const prefixResults = [];
  const entityResults = [];
  for (const queryCount of [1, 8, 32]) {
    const selected = settings.slice(0, queryCount);
    const q = measuredVariants({
      mapExact() { let sum = 0n; for (let index = 0; index < queryCount; index += 1) sum += mapTotals(rows).quantity; return sum; },
      columnBigInt() { let sum = 0n; for (let index = 0; index < queryCount; index += 1) sum += bigint.object.quantityTotals().quantity; return sum; },
      columnInt64() { let sum = 0n; for (let index = 0; index < queryCount; index += 1) sum += int64.object.quantityTotals().quantity; return sum; }
    });
    const bigBuild = median(pureBuild.columnsBigInt);
    const intBuild = median(pureBuild.columnsInt64);
    quantities.push({ queryCount, timings: q,
      buildPlusQueryMs: { columnBigInt: bigBuild + q.columnBigInt.medianMs, columnInt64: intBuild + q.columnInt64.medianMs },
      breakEvenQueries: { columnBigInt: breakEven(bigBuild, q.mapExact.medianMs, q.columnBigInt.medianMs, queryCount),
        columnInt64: breakEven(intBuild, q.mapExact.medianMs, q.columnInt64.medianMs, queryCount) } });
    const p = measuredVariants({
      currentSinglePass() { let sum = 0n; for (const query of selected) sum += periods.comparePeriods(rows, query, core.analyzeRows).analysisA.total_quantity; return sum; },
      indexedFullParity() { let sum = 0n; for (const query of selected) sum += engine.compareFull(query).analysisA.total_quantity; return sum; },
      dateOnlyFullParity() { let sum = 0n; for (const query of selected) sum += dateOnly.object.compareFull(query).analysisA.total_quantity; return sum; }
    });
    const r = measuredVariants({
      narrowExactScan() { let sum = 0n; for (const query of selected) sum += narrowScan(rows, query.periodA.start, query.periodA.end).quantity; return sum; },
      dayPrefix() { let sum = 0n; for (const query of selected) sum += engine.queryRange(query.periodA.start, query.periodA.end).quantity; return sum; }
    });
    const e = measuredVariants({
      currentTerminalSummary() { let sum = 0n; for (let index = 0; index < queryCount; index += 1) sum += terminal.selectedSummary(rows, 'article', 'A' + index, '2025-12-31', 14 + index).quantity; return sum; },
      entityPostingSummary() { let sum = 0n; for (let index = 0; index < queryCount; index += 1) sum += engine.selectedSummary('article', 'A' + index, '2025-12-31', 14 + index).quantity; return sum; },
      articleOnlySummary() { let sum = 0n; for (let index = 0; index < queryCount; index += 1) sum += articleOnly.object.selectedSummary('article', 'A' + index, '2025-12-31', 14 + index).quantity; return sum; }
    });
    for (let index = 0; index < queryCount; index += 1) assert.deepEqual(engine.selectedSummary('article', 'A' + index, '2025-12-31', 14 + index), terminal.selectedSummary(rows, 'article', 'A' + index, '2025-12-31', 14 + index));
    const rangeBuild = median(pureBuild.rangeIndex);
    const dateBuild = median(pureBuild.dateOnlyIndex);
    const articleBuild = median(pureBuild.articleIndex);
    periodResults.push({ queryCount, timings: p, buildPlusQueryMs: rangeBuild + p.indexedFullParity.medianMs,
      dateOnlyBuildPlusQueryMs: dateBuild + p.dateOnlyFullParity.medianMs,
      breakEvenQueries: breakEven(rangeBuild, p.currentSinglePass.medianMs, p.indexedFullParity.medianMs, queryCount),
      dateOnlyBreakEvenQueries: breakEven(dateBuild, p.currentSinglePass.medianMs, p.dateOnlyFullParity.medianMs, queryCount) });
    prefixResults.push({ queryCount, timings: r, buildPlusQueryMs: rangeBuild + r.dayPrefix.medianMs,
      breakEvenQueries: breakEven(rangeBuild, r.narrowExactScan.medianMs, r.dayPrefix.medianMs, queryCount) });
    entityResults.push({ queryCount, timings: e, buildPlusQueryMs: rangeBuild + e.entityPostingSummary.medianMs,
      articleOnlyBuildPlusQueryMs: articleBuild + e.articleOnlySummary.medianMs,
      breakEvenQueries: breakEven(rangeBuild, e.currentTerminalSummary.medianMs, e.entityPostingSummary.medianMs, queryCount),
      articleOnlyBreakEvenQueries: breakEven(articleBuild, e.currentTerminalSummary.medianMs, e.articleOnlySummary.medianMs, queryCount) });
  }
  const output = { rows: count, articles: 200, observedCalendarDays: 365, unknownDateRows: engine.metadata.unknownDateRows,
    exactParityPassed: true, sampleRepetitions: REPEATS,
    build: { samplesMs: pureBuild, medianMs: Object.fromEntries(Object.keys(pureBuild).map(key => [key, median(pureBuild[key])])), buildAndFirstResult: buildTimes },
    memory: { baseline: baselineMemory, retainedDeltas: { columnsBigInt: bigint.memoryDelta, columnsInt64: int64.memoryDelta,
      rangeIndex: range.memoryDelta, dateOnlyIndex: dateOnly.memoryDelta, articleIndex: articleOnly.memoryDelta },
      processPeakRssBytes: process.resourceUsage().maxRSS * 1024,
      note: 'Process high-water RSS covers all variants, validation and retained indexes; it is not an isolated index peak. Retained deltas are after explicit GC, can be negative/noisy.' },
    quantityRepresentations: { bigint: bigint.object.representation, int64: int64.object.representation, int64Metadata: int64.object.metadata },
    domainReference, quantityKernels: quantities, fullPeriodComparison: periodResults, narrowRangeQueries: prefixResults, terminalSummaries: entityResults };
  engine.dispose();
  dateOnly.object.dispose();
  articleOnly.object.dispose();
  return output;
}

if (process.argv.includes('--case')) {
  const count = Number(process.argv[process.argv.indexOf('--case') + 1]);
  process.stdout.write(JSON.stringify(runCase(count)));
} else {
  const cases = [];
  for (const count of [1000, 10000, 50000]) {
    const child = spawnSync(process.execPath, ['--expose-gc', __filename, '--case', String(count)], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 240000 });
    if (child.status !== 0) throw new Error('Benchmark failed at ' + count + ' rows: ' + (child.error && child.error.code || child.signal || child.status) + ' ' + child.stderr);
    const result = JSON.parse(child.stdout);
    cases.push(result);
    const full = result.fullPeriodComparison.find(item => item.queryCount === 32);
    console.log(count + ' rows: full periods 32 distinct queries current=' + full.timings.currentSinglePass.medianMs.toFixed(2) + ' ms, indexed=' + full.timings.indexedFullParity.medianMs.toFixed(2) + ' ms, build=' + result.build.medianMs.rangeIndex.toFixed(2) + ' ms.');
  }
  const report = { createdUtc: new Date().toISOString(), environment: { node: process.version, platform: process.platform, arch: process.arch,
    cpu: os.cpus()[0].model, logicalCpus: os.cpus().length, totalMemoryBytes: os.totalmem() },
    syntheticOnly: true, domainBaseline: 'Current csv.js analyzeRows and periods.js comparePeriods single-pass accumulator',
    method: '5 warm samples, rotated variant order; GC outside timing; distinct period queries. Build and retained memory charged separately. No browser/UI/cache/operational acceptance claim.',
    cases };
  const directory = path.join(__dirname, 'results');
  fs.mkdirSync(directory, { recursive: true });
  const destination = path.join(directory, 'node-benchmark.json');
  fs.writeFileSync(destination, JSON.stringify(report, null, 2) + '\n');
  console.log('Saved ' + destination);
}
