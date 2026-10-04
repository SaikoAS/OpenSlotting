'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { performance } = require('node:perf_hooks');
const warehouse = require('../../../warehouse.js');
const { LIMIT, clone } = require('./history.cjs');
const { layoutFor, driver } = require('./fixtures.cjs');

const median = values => values.slice().sort((a, b) => a - b)[Math.floor(values.length / 2)];
const fixture = layoutFor(150);
async function trial(representation) {
  if (global.gc) global.gc();
  const memoryBefore = process.memoryUsage();
  const start = performance.now();
  const d = driver(representation, fixture);
  const initializationMs = performance.now() - start;
  let layoutAfter30;
  const editStart = performance.now();
  for (let index = 0; index < 50; index += 1) {
    const next = clone(d.layout); const object = next.objects[index];
    if (index % 4 === 0) object.bays[0].levels[0].positions[0].code = 'EDIT-' + String(index).padStart(3, '0');
    else if (index % 4 === 1) object.x += 100;
    else if (index % 4 === 2) next.objects[index] = warehouse.rotateObject(object, 90);
    else object.bays[0].width += 10;
    assert.equal(await d.history.commit(next, { selectionAfter: object.id }), true);
    if (index === 29) layoutAfter30 = clone(d.layout);
  }
  const edit50Ms = performance.now() - editStart;
  const finalLayout = clone(d.layout);
  const retainedAfterEdits = d.history.inspect().retainedJsonBytes;
  assert.equal(d.history.inspect().undo, LIMIT);
  if (global.gc) global.gc();
  const heldMemory = process.memoryUsage();
  const undoStart = performance.now();
  for (let index = 0; index < LIMIT; index += 1) assert.equal(await d.history.undo(), true);
  const undo20Ms = performance.now() - undoStart;
  assert.deepEqual(d.layout, layoutAfter30); assert.equal(d.selection, 'rack-29');
  assert.equal(await d.history.undo(), false);
  const redoStart = performance.now();
  for (let index = 0; index < LIMIT; index += 1) assert.equal(await d.history.redo(), true);
  const redo20Ms = performance.now() - redoStart;
  assert.deepEqual(d.layout, finalLayout); assert.equal(d.selection, 'rack-49');
  assert.equal(d.history.inspect().redo, 0);
  return { initializationMs, edit50Ms, undo20Ms, redo20Ms,
    totalPipelineMs: initializationMs + edit50Ms + undo20Ms + redo20Ms,
    retainedHistoryJsonBytes: retainedAfterEdits,
    heldHeapDeltaBytes: heldMemory.heapUsed - memoryBefore.heapUsed,
    heldRssDeltaBytes: heldMemory.rss - memoryBefore.rss };
}

(async () => {
  // Warm both representations before recorded samples.
  await trial('snapshots'); await trial('deltas');
  const samples = { snapshots: [], deltas: [] };
  for (let repeat = 0; repeat < 5; repeat += 1) {
    for (const representation of repeat % 2 ? ['deltas', 'snapshots'] : ['snapshots', 'deltas']) samples[representation].push(await trial(representation));
  }
  const summaries = Object.fromEntries(Object.entries(samples).map(([representation, values]) => [representation,
    Object.fromEntries(Object.keys(values[0]).map(key => [key, median(values.map(value => value[key]))]))]));
  const report = { createdUtc: new Date().toISOString(), syntheticOnly: true,
    environment: { node: process.version, platform: process.platform, arch: process.arch, cpu: os.cpus()[0].model },
    layoutObjects: fixture.objects.length, layoutSlots: warehouse.listSlots(fixture).length, layoutJsonBytes: Buffer.byteLength(JSON.stringify(fixture), 'utf8'),
    actualHistoryLimit: LIMIT, edits: 50, undo: LIMIT, redo: LIMIT,
    method: '5 warm trials, rotated order; current JSON-clone snapshot representation versus ID-bound before/after object deltas. Both call the original normalizeLayout and lockedEditConflict before mock persistence confirmation. No IndexedDB, browser, DOM or network.',
    samples, medians: summaries,
    processPeakRssBytes: process.resourceUsage().maxRSS * 1024,
    memoryNote: 'Retained history JSON bytes are exact serialization size, not JS heap size. Heap/RSS deltas include driver current layout and temporary retained equality snapshots, are GC-dependent; process peak includes both variants.',
    exactUndoRedoSelectionPassed: true };
  const directory = path.join(__dirname, 'results'); fs.mkdirSync(directory, { recursive: true });
  const destination = path.join(directory, 'node-benchmark.json');
  fs.writeFileSync(destination, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ saved: destination, medians: summaries }));
})().catch(error => { console.error(error); process.exitCode = 1; });
