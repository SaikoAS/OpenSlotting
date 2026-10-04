'use strict';

const { performance } = require('node:perf_hooks');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const current = require('../warehouse.js');
const scene = require('../warehouse-scene.js');
const renderer = require('../warehouse-webgl.js');
const original = require('../tests/fixtures/warehouse-baseline.cjs');
const originalRenderer = require('../tests/fixtures/warehouse-webgl-baseline.cjs');
const { layoutFixture } = require('../tests/fixtures/warehouse-performance.cjs');

const baselineCommit = 'db39ffaca31ebeddec884413c38725f4fd38a5a0';
const repeats = 7;
let sink = 0;
function consume(value) { sink += value.opaque ? value.opaque.length : value.length; }
function compare(first, second, iterations) {
  const samples = { baseline: [], current: [] };
  first(); second(); first(); second();
  for (let repeat = 0; repeat < repeats; repeat += 1) {
    const order = repeat % 2 ? [['current', second], ['baseline', first]] : [['baseline', first], ['current', second]];
    for (const [key, fn] of order) {
      const started = performance.now();
      for (let iteration = 0; iteration < iterations; iteration += 1) consume(fn());
      samples[key].push((performance.now() - started) / iterations);
    }
  }
  const summarize = values => ({ medianMs: values.slice().sort((a, b) => a - b)[Math.floor(values.length / 2)],
    minMs: Math.min(...values), maxMs: Math.max(...values), samplesMs: values });
  return { baseline: summarize(samples.baseline), current: summarize(samples.current), repeats, iterations };
}
const report = { generatedAt: new Date().toISOString(), baselineCommit, syntheticOnly: true,
  environment: { node: process.version, platform: process.platform, cpu: os.cpus()[0].model },
  methodology: 'Actual frozen production baseline versus modified production functions; 2 warmups, 7 samples, alternating order; cold invocation costs included. Node CPU only, no GPU/FPS claim.',
  limits: { objects: 150, slots: 5000 }, collisions: [], projection: [], history: {
    decision: 'Keep existing snapshot history. Experimental object deltas retained less JSON but took longer for complete validated edit/undo/redo pipelines.',
    reference: 'experiments/feature-lab/history/results/node-benchmark.json',
    safety: 'No representation, selection, lock, save-failure or workspace-scope changes.' } };

for (const count of [10, 100, 150]) for (const mode of ['spread', 'vertical', 'dense']) {
  const layout = layoutFixture(current, count, mode), before = JSON.stringify(layout);
  const baseline = original.findCollisions(layout), optimized = current.findCollisions(layout);
  assert.deepEqual(optimized, baseline); assert.equal(JSON.stringify(layout), before);
  const timing = compare(() => original.findCollisions(layout), () => current.findCollisions(layout), count === 10 ? 30 : 5);
  report.collisions.push({ count, mode, slots: current.listSlots(layout).length, collisionCount: baseline.length, ...timing });
  console.log('Collisions', count, mode, timing.baseline.medianMs.toFixed(3), '->', timing.current.medianMs.toFixed(3));
}

for (const [count, maxSlots] of [[10, false], [100, false], [150, false], [150, true]]) {
  const layout = layoutFixture(current, count, 'spread', maxSlots), boxes = scene.buildBoxes(current, layout);
  const args = [boxes, { yaw: -.62, pitch: .62, zoom: 1 }, 1440, 1024, null, null, new Set(), 'transparent'];
  const baseline = originalRenderer.projectScene(...args), optimized = renderer.projectScene(...args);
  for (const field of ['opaque', 'edges', 'grid']) {
    assert.equal(Buffer.from(baseline[field].buffer).equals(Buffer.from(optimized[field].buffer)), true, field);
  }
  assert.deepEqual(optimized.pickMap, baseline.pickMap); assert.deepEqual(optimized.view, baseline.view);
  assert.equal(optimized.transparent.length, baseline.transparent.length);
  optimized.transparent.forEach((vertices, i) => assert.equal(Buffer.from(vertices.buffer).equals(Buffer.from(baseline.transparent[i].buffer)), true));
  const timing = compare(() => originalRenderer.projectScene(...args), () => renderer.projectScene(...args), maxSlots ? 1 : 3);
  report.projection.push({ count, slots: current.listSlots(layout).length, boxes: boxes.length,
    finalBufferBytes: ['opaque', 'edges', 'grid'].reduce((bytes, field) => bytes + optimized[field].byteLength, 0) +
      optimized.transparent.reduce((bytes, vertices) => bytes + vertices.byteLength, 0), ...timing });
  console.log('Projection', count, maxSlots ? '5000 slots' : '', timing.baseline.medianMs.toFixed(3), '->', timing.current.medianMs.toFixed(3));
}

report.sources = {};
for (const file of ['warehouse.js', 'warehouse-webgl.js', 'warehouse-scene.js', 'warehouse-editor.js',
  'tests/fixtures/warehouse-baseline.cjs', 'tests/fixtures/warehouse-webgl-baseline.cjs', 'tools/benchmark-warehouse.cjs']) {
  report.sources[file] = crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, '..', file))).digest('hex');
}
report.memory = { wholeRunPeakRssKiB: process.resourceUsage().maxRSS, finalRssBytes: process.memoryUsage().rss,
  caveat: 'Cumulative whole-run Node RSS; no isolated per-variant peak. Direct Float32 buffers remove transient number-array staging; final geometry size unchanged.', sink };
const output = path.resolve(process.argv[2] || path.join(__dirname, '..', 'docs', 'performance', 'results', 'warehouse.json'));
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log('Saved ' + output);
