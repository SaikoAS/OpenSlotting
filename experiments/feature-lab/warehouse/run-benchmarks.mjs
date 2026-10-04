import { performance } from 'node:perf_hooks';
import { cpus, totalmem, platform, release } from 'node:os';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import model from '../../../warehouse.js';
import scene from '../../../warehouse-scene.js';
import webgl from '../../../warehouse-webgl.js';
import workspace from '../../../workspace.js';
import { createAlternatives, batchTransparent, workspaceProjection, createWorkspaceProjectionCache } from './modules.mjs';
import { layoutFixture, registryFixture, profileFixture } from './fixtures.mjs';

const alt = createAlternatives(model, scene, workspace), repeats = 7;
const version = { workspaceId: 'synthetic', layoutRevision: 1, registryRevision: 1, locale: 'de', kernelVersion: 1 };
const median = a => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
let sink = 0;
function consume(value) {
  if (Array.isArray(value)) sink += value.length;
  else if (value?.collisions) sink += value.collisions.length;
  else if (value?.bySlot && typeof value.withLocation === 'number') sink += value.withLocation;
  else if (value?.matchedCount !== undefined) sink += value.matchedCount;
  else if (typeof value === 'number') sink += value;
}
function measure(fn, iterations = 1) {
  fn(); fn(); // Common warmup outside recorded samples.
  const samplesMs = [];
  for (let r = 0; r < repeats; r++) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) consume(fn());
    samplesMs.push((performance.now() - start) / iterations);
  }
  return { medianMs: median(samplesMs), minMs: Math.min(...samplesMs), maxMs: Math.max(...samplesMs), samplesMs, iterations, repeats };
}
const report = {
  generatedAt: new Date().toISOString(), baselineCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: new URL('../../../', import.meta.url), encoding: 'utf8' }).trim(),
  environment: { node: process.version, os: platform() + ' ' + release(), cpu: cpus()[0]?.model,
    logicalCpus: cpus().length, totalMemoryBytes: totalmem() },
  supportedLimits: { objects: 150, slots: 5000, futureStressObjects: 1000 },
  methodology: { fixtures: 'synthetic deterministic, original domain SAT and scene kernels', repeats, warmup: 2,
    timedCosts: 'cold alternatives include index/build/sort; warm index/cache costs separate; correctness assertions outside timing',
    memory: 'process peak RSS is cumulative for whole run, not per-algorithm attribution', browser: false },
  collisions: [], scene: [], slots: [], snaps: [], locks: [], profiles: [], projections: [], geometry: []
};

for (const count of [10, 100, 150, 1000]) for (const mode of ['spread', 'vertical', 'dense']) {
  const layout = layoutFixture(model, count, mode), expected = model.findCollisions(layout);
  const sweep = alt.collisionSweep(layout), grid = alt.collisionGrid(layout), prepared = alt.collisionPreparedSAT(layout);
  assert.deepEqual(sweep.collisions, expected); assert.deepEqual(grid.collisions, expected);
  assert.deepEqual(prepared.collisions, expected);
  report.collisions.push({ count, mode, scope: count <= 150 && mode === 'spread' ? 'supported-layout' : count <= 150 && mode === 'dense' ? 'supported-layout' : 'stress-fixture',
    collisionCount: expected.length, sweepStats: sweep.stats, gridStats: grid.stats, preparedStats: prepared.stats,
    baseline: measure(() => model.findCollisions(layout), count <= 100 ? 3 : 1),
    sweep: measure(() => alt.collisionSweep(layout), count <= 100 ? 3 : 1),
    grid: measure(() => alt.collisionGrid(layout), count <= 100 ? 3 : 1),
    prepared: measure(() => alt.collisionPreparedSAT(layout), count <= 100 ? 3 : 1) });
  console.log('collisions', count, mode, expected.length);
}

for (const count of [10, 100, 150, 1000]) {
  const layout = layoutFixture(model, count), registry = registryFixture(model, layout, count * 100), matches = model.matchArticles(layout, registry);
  const cache = alt.createSceneCache(), scan = alt.createSceneCache({ contentCheck: true });
  const boxes = scene.buildBoxes(model, layout, matches);
  assert.deepEqual(cache.get(layout, matches, version), boxes);
  report.scene.push({ count, boxCount: boxes.length, slotCount: model.listSlots(layout).length,
    baseline: measure(() => scene.buildBoxes(model, layout, matches), 10),
    revisionCold: measure(() => alt.createSceneCache().get(layout, matches, version), 10),
    revisionWarm: measure(() => cache.get(layout, matches, version), 1000),
    scanCold: measure(() => alt.createSceneCache({ contentCheck: true }).get(layout, matches, version), 3),
    scanWarm: measure(() => scan.get(layout, matches, version), 3) });
  const index = alt.createSlotIndex(layout);
  assert.deepEqual(alt.matchArticlesIndexed(index, registry), matches);
  const queryCodes = index.slots.slice(-Math.min(index.slots.length, 100)).map(slot => slot.code);
  function lookupLinear() { let total = 0; for (const code of queryCodes) if (index.slots.find(slot => slot.code === code)) total++; return total; }
  function lookupIndexed() { let total = 0; for (const code of queryCodes) if (index.byCodeFirst.get(code)) total++; return total; }
  assert.equal(lookupLinear(), lookupIndexed());
  report.slots.push({ count, articleCount: registry.length, slotCount: index.slots.length, queriesPerBatch: queryCodes.length,
    indexBuild: measure(() => alt.createSlotIndex(layout), 10),
    matchBaseline: measure(() => model.matchArticles(layout, registry), 3),
    matchCold: measure(() => alt.matchArticlesIndexed(alt.createSlotIndex(layout), registry), 3),
    matchWarm: measure(() => alt.matchArticlesIndexed(index, registry), 3),
    lookupLinear: measure(lookupLinear, 10), lookupIndexed: measure(lookupIndexed, 100) });
  const before = structuredClone(layout); for (const object of before.objects) object.locked = false;
  const after = structuredClone(before); after.objects[1].x += 20;
  assert.equal(alt.lockedEditConflictIndexed(before, after), model.lockedEditConflict(before, after));
  report.locks.push({ count, baseline: measure(() => model.lockedEditConflict(before, after), 10),
    indexed: measure(() => alt.lockedEditConflictIndexed(before, after), 10) });
  const camera = { yaw: -0.62, pitch: 0.62, zoom: 1 };
  const projected = webgl.projectScene(boxes, camera, 1440, 1024, null, null, new Set(), 'transparent');
  const transparent = batchTransparent(projected);
  let offset = 0;
  for (const vertices of projected.transparent) { assert.deepEqual(transparent.subarray(offset, offset + vertices.length), vertices); offset += vertices.length; }
  report.geometry.push({ count, boxCount: boxes.length, opaqueBytes: projected.opaque.byteLength,
    transparentBytes: transparent.byteLength, transparentBoxCount: projected.transparent.length,
    transparentDrawSubmissionsCurrent: projected.transparent.length,
    transparentDrawSubmissionsPackedCandidate: projected.transparent.length ? 1 : 0,
    projectBaseline: measure(() => webgl.projectScene(boxes, camera, 1440, 1024, null, null, new Set(), 'transparent'), count < 1000 ? 3 : 1),
    packAlreadyProjected: measure(() => batchTransparent(projected), 10),
    actualGpuMeasurement: false });
  console.log('scene/slots/geometry', count, boxes.length);
}

for (const count of [10, 100, 150, 1000]) {
  const targets = Array.from({ length: count }, (_, i) => model.createArea('wall', { id: 'anchor-' + i, x: -200000 + i % 25 * 6000,
    z: -200000 + Math.floor(i / 25) * 6000, rotation: i % 2 ? 0 : 90 }));
  const chosen = targets[Math.floor(count / 2)], moving = { ...chosen, id: 'moving', x: chosen.x + 4000 + 40 }, index = alt.createAnchorIndex(targets);
  assert.deepEqual(alt.findConnectionSnapIndexed(moving, index, 300), model.findConnectionSnap(moving, targets, 300));
  report.snaps.push({ count, baseline: measure(() => model.findConnectionSnap(moving, targets, 300), 100),
    indexBuild: measure(() => alt.createAnchorIndex(targets), 10),
    cold: measure(() => alt.findConnectionSnapIndexed(moving, alt.createAnchorIndex(targets), 300), 10),
    warm: measure(() => alt.findConnectionSnapIndexed(moving, index, 300), 100) });
}

for (const columns of [39, 512, 4096]) {
  const profile = profileFixture(columns), file = { headers: profile.headers.slice().reverse() }, customFields = [{ id: 'custom-one', active: true }], compiled = alt.compileImportProfile(profile);
  assert.deepEqual(compiled.plan(file, customFields), workspace.planImportProfile(profile, file, customFields));
  report.profiles.push({ columns, targets: 4, baseline: measure(() => workspace.planImportProfile(profile, file, customFields), 10),
    compile: measure(() => alt.compileImportProfile(profile), 10),
    cold: measure(() => alt.compileImportProfile(profile).plan(file, customFields), 10),
    warm: measure(() => compiled.plan(file, customFields), 10) });
}

for (const fileCount of [10, 100, 1000]) {
  const item = workspace.createWorkspace('Synthetic');
  const rows = Array(1000).fill(null);
  item.files = Array.from({ length: fileCount }, () => ({ buffer: new ArrayBuffer(1024), result: { rows } }));
  const cache = createWorkspaceProjectionCache();
  assert.deepEqual(cache.get(item, 1), workspaceProjection(item));
  report.projections.push({ fileCount, baseline: measure(() => workspaceProjection(item), 100),
    cold: measure(() => createWorkspaceProjectionCache().get(item, 1), 100),
    warm: measure(() => cache.get(item, 1), 1000) });
}

report.memory = { wholeRunPeakRssKiB: process.resourceUsage().maxRSS, finalRssBytes: process.memoryUsage().rss, sink };
report.sources = {};
for (const file of ['modules.mjs', 'fixtures.mjs', 'run-benchmarks.mjs', '../../../warehouse.js', '../../../warehouse-scene.js', '../../../warehouse-webgl.js', '../../../workspace.js']) {
  report.sources[file] = createHash('sha256').update(await readFile(new URL(file, import.meta.url))).digest('hex');
}
await mkdir(new URL('results/', import.meta.url), { recursive: true });
await writeFile(new URL('results/node-warehouse.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log('Saved experiments/feature-lab/warehouse/results/node-warehouse.json');
