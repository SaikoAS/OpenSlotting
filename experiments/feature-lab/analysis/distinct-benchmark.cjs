'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { syntheticRows, queries } = require('./fixtures.cjs');
const { countSet, createDistinctIndex } = require('./distinct-engine.cjs');

const median = samples => samples.slice().sort((a, b) => a - b)[Math.floor(samples.length / 2)];
const time = run => { const start = performance.now(); const result = run(); return { ms: performance.now() - start, result }; };
const cases = [];
let checksum = 0;
for (const count of [1000, 10000, 50000]) {
  const rows = syntheticRows(count);
  const settings = queries(32);
  const scopes = [];
  for (const scope of ['customers', 'core-orders', 'terminal-orders']) {
    const buildSamples = [];
    for (let sample = 0; sample < 5; sample += 1) { if (global.gc) global.gc(); buildSamples.push(time(() => createDistinctIndex(rows, scope)).ms); }
    if (global.gc) global.gc();
    const before = process.memoryUsage();
    const index = createDistinctIndex(rows, scope);
    if (global.gc) global.gc();
    const after = process.memoryUsage();
    for (const query of settings) assert.equal(index.count(query.periodA.start, query.periodA.end), countSet(rows, scope, query.periodA.start, query.periodA.end));
    const measurements = [];
    for (const queryCount of [1, 8, 32]) {
      const selected = settings.slice(0, queryCount);
      const samples = { set: [], bitset: [] };
      const runs = {
        set() { let value = 0; for (const query of selected) value += countSet(rows, scope, query.periodA.start, query.periodA.end); return value; },
        bitset() { let value = 0; for (const query of selected) value += index.count(query.periodA.start, query.periodA.end); return value; }
      };
      runs.set(); runs.bitset();
      for (let repeat = 0; repeat < 5; repeat += 1) {
        for (const variant of repeat % 2 ? ['bitset', 'set'] : ['set', 'bitset']) {
          if (global.gc) global.gc();
          const measured = time(runs[variant]); samples[variant].push(measured.ms); checksum ^= measured.result;
        }
      }
      const setMs = median(samples.set);
      const bitsetMs = median(samples.bitset);
      const buildMs = median(buildSamples);
      measurements.push({ queryCount, setMs, bitsetMs, samplesMs: samples,
        buildPlusBitsetMs: buildMs + bitsetMs,
        breakEvenQueries: setMs > bitsetMs ? Math.ceil(buildMs / ((setMs - bitsetMs) / queryCount)) : null });
    }
    scopes.push({ scope, metadata: index.metadata, buildSamplesMs: buildSamples, buildMedianMs: median(buildSamples),
      retainedDeltaBytes: { heap: after.heapUsed - before.heapUsed, external: after.external - before.external, arrayBuffers: after.arrayBuffers - before.arrayBuffers },
      exactParityPassed: true, measurements });
  }
  cases.push({ rows: count, scopes });
  console.log(count + ' rows: exact Set/bitset distinct comparisons passed.');
}
const report = { createdUtc: new Date().toISOString(), node: process.version, syntheticOnly: true,
  method: 'Same exact keys, same nonempty date selection, 5 warm samples in rotated order; 1/8/32 distinct ranges. Current full core does more work and is not the Set kernel timing.',
  processPeakRssBytes: process.resourceUsage().maxRSS * 1024, cases, checksum };
const directory = path.join(__dirname, 'results'); fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(path.join(directory, 'distinct-benchmark.json'), JSON.stringify(report, null, 2) + '\n');
