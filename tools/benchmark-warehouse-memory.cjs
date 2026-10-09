'use strict';

// Separate processes keep each renderer's peak RSS independent of the other variant.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');

const root = path.resolve(__dirname, '..');
const baselineCommit = 'db39ffaca31ebeddec884413c38725f4fd38a5a0';
const repeats = 3;
const warmups = 1;
const digest = value => crypto.createHash('sha256').update(value).digest('hex');

function maximumGeometryFixture(model) {
  let remainingExtraLevels = 500;
  const zones = [], locations = [];
  const objects = Array.from({ length: 150 }, (_, objectIndex) => {
    const rack = model.createRack('shelf-rack', {
      id: 'maximum-rack-' + objectIndex,
      name: 'Synthetic maximum geometry ' + objectIndex,
      bayCount: 30,
      levelCount: 1,
      x: -175000 + objectIndex % 10 * 35000,
      z: -100000 + Math.floor(objectIndex / 10) * 12000,
      rotation: [-35, 0, 90, 180, 12, -270][objectIndex % 6]
    });
    rack.bays.forEach((bay, bayIndex) => {
      bay.id = 'maximum-bay-' + objectIndex + '-' + bayIndex;
      if (remainingExtraLevels > 0) {
        bay.levels.push(Object.assign({}, bay.levels[0]));
        remainingExtraLevels -= 1;
      }
      bay.levels.forEach((level, levelIndex) => {
        level.id = 'maximum-level-' + objectIndex + '-' + bayIndex + '-' + levelIndex;
        const zoneId = 'maximum-zone-' + objectIndex + '-' + bayIndex + '-' + levelIndex;
        zones.push({ id: zoneId, objectId: rack.id, bayId: bay.id, levelId: level.id, usage: 'picking' });
        locations.push({ id: 'maximum-slot-' + objectIndex + '-' + bayIndex + '-' + levelIndex,
          code: 'M' + objectIndex + '-B' + bayIndex + '-L' + levelIndex, zoneId, positionIndex: 0, legacy: false });
      });
    });
    rack.uprights.forEach((upright, uprightIndex) => { upright.id = 'maximum-upright-' + objectIndex + '-' + uprightIndex; });
    return rack;
  });
  assert.equal(remainingExtraLevels, 0);
  return model.normalizeLayout({ version: model.LAYOUT_VERSION, objects, zones, locations });
}

function arrayBytes(scene) {
  return ['opaque', 'edges', 'grid'].reduce((total, key) => total + scene[key].byteLength, 0) +
    scene.transparent.reduce((total, array) => total + array.byteLength, 0);
}

function outputDigests(scene) {
  const full = crypto.createHash('sha256');
  const parts = {};
  function array(key, values) {
    const bytes = Buffer.from(values.buffer, values.byteOffset, values.byteLength);
    parts[key] = digest(bytes);
    full.update(key + ':' + values.byteLength + '\n');
    full.update(bytes);
  }
  ['opaque', 'edges', 'grid'].forEach(key => array(key, scene[key]));
  full.update('transparent-count:' + scene.transparent.length + '\n');
  scene.transparent.forEach((values, index) => array('transparent-' + index, values));
  for (const key of ['pickMap', 'view']) {
    const value = JSON.stringify(scene[key]);
    parts[key] = digest(value);
    full.update(key + ':' + Buffer.byteLength(value) + '\n');
    full.update(value);
  }
  return { fullGeometryAndPickingSha256: full.digest('hex'), parts };
}

function memorySnapshot() {
  const usage = process.memoryUsage();
  return { rssBytes: usage.rss, heapUsedBytes: usage.heapUsed, heapTotalBytes: usage.heapTotal,
    externalBytes: usage.external, arrayBuffersBytes: usage.arrayBuffers };
}

function verifyFrozenBaseline() {
  const hashes = require('../tests/fixtures/warehouse-baseline-hashes.json');
  for (const [file, expected] of Object.entries(hashes)) {
    const bytes = fs.readFileSync(path.join(root, 'tests', 'fixtures', file), 'utf8').replace(/\r\n/g, '\n');
    assert.equal(digest(bytes), expected, 'Frozen baseline hash: ' + file);
  }
}

function child(variant) {
  assert.equal(typeof global.gc, 'function', 'Child must run with --expose-gc');
  assert.ok(variant === 'baseline' || variant === 'current');
  verifyFrozenBaseline();
  // Both renderer variants receive exactly the same current domain/scene contract.
  const model = require('../warehouse.js');
  const renderer = require(variant === 'baseline' ? '../tests/fixtures/warehouse-webgl-baseline.cjs' : '../warehouse-webgl.js');
  const sceneBuilder = require('../warehouse-scene.js');
  const started = performance.now();
  const layout = maximumGeometryFixture(model);
  const boxes = sceneBuilder.buildBoxes(model, layout);
  const fixtureBuildMs = performance.now() - started;
  const slots = model.listSlots(layout).length;
  assert.equal(layout.objects.length, 150);
  assert.equal(slots, 5000);
  assert.equal(boxes.length, 38600);
  const inputSha256 = digest(JSON.stringify(layout));
  const camera = { yaw: -.62, pitch: .62, zoom: 1 };
  const args = [boxes, camera, 1440, 1024, null, null, new Set(), 'transparent'];
  let projected = null;
  global.gc();
  const beforeWarmup = memorySnapshot();
  for (let index = 0; index < warmups; index += 1) projected = renderer.projectScene(...args);
  global.gc();
  const afterWarmup = memorySnapshot();
  const samples = [];
  for (let index = 0; index < repeats; index += 1) {
    global.gc();
    const before = memorySnapshot();
    let previous = projected;
    const sampleStarted = performance.now();
    // Preserve the previous scene until the next RHS returns, as production render() does.
    projected = renderer.projectScene(...args);
    const elapsedMs = performance.now() - sampleStarted;
    const afterProjection = memorySnapshot();
    assert.equal(previous.opaque.byteLength, projected.opaque.byteLength);
    previous = null;
    global.gc();
    const afterGc = memorySnapshot();
    samples.push({ elapsedMs, before, afterProjection, afterGc, cumulativePeakRssKiB: process.resourceUsage().maxRSS });
  }
  const finalArrayBytes = arrayBytes(projected);
  assert.equal(projected.opaque.byteLength, 38600 * 300 * 4);
  assert.equal(projected.edges.byteLength, 38600 * 240 * 4);
  assert.equal(projected.transparent.length, 0);
  const output = outputDigests(projected);
  const values = samples.map(sample => sample.elapsedMs).sort((first, second) => first - second);
  const result = { variant, fixture: { objects: layout.objects.length, slots, bays: 4500, levels: 5000,
    boxes: boxes.length, opaqueBoxes: boxes.length, inputSha256, fixtureBuildMs },
    warmups, repeats, timing: { medianMs: values[Math.floor(values.length / 2)], minMs: values[0], maxMs: values[values.length - 1] },
    memory: { processPeakRssKiB: process.resourceUsage().maxRSS, finalArrayBytes,
      opaqueArrayBytes: projected.opaque.byteLength, edgesArrayBytes: projected.edges.byteLength,
      gridArrayBytes: projected.grid.byteLength, beforeWarmup, afterWarmup, final: memorySnapshot() },
    samples, output };
  process.stdout.write(JSON.stringify(result));
}

function parent() {
  const report = { generatedAt: new Date().toISOString(), baselineCommit, syntheticOnly: true,
    environment: { node: process.version, platform: process.platform, cpu: os.cpus()[0].model,
      totalMemoryBytes: os.totalmem(), freeMemoryBytesBefore: os.freemem() },
    methodology: 'Frozen versus current renderer, both using the same current warehouse/scene modules and layout-v2 input. One independent child process per variant, sequential baseline then current, Node --expose-gc, 1 warmup + 3 projection samples. Explicit GC before each sample and after projection; timings exclude GC. Previous output stays referenced until replacement as production render does. Peak RSS covers imports, fixture build, all warmups/samples and digest verification, not per-call allocations. No browser/GPU/FPS claim.',
    limits: { objects: 150, slots: 5000 },
    fixtureDescription: '150 shelf racks, each 30 bays; 500 bays have two levels and 4000 have one level; each level has one position and a deck. 4*4650 upright boxes + 4*5000 level/slot boxes = 38600 opaque boxes.',
    variants: {} };
  for (const variant of ['baseline', 'current']) {
    const freeBytes = os.freemem();
    assert.ok(freeBytes >= 2.5 * 1024 ** 3, 'At least 2.5 GiB available memory is required before starting ' + variant);
    const result = spawnSync(process.execPath, ['--expose-gc', __filename, '--child', variant], {
      cwd: root, encoding: 'utf8', maxBuffer: 1024 * 1024, timeout: 180000
    });
    assert.equal(result.error, undefined, variant + ': ' + (result.error && result.error.message));
    assert.equal(result.status, 0, variant + ': ' + result.stderr);
    const value = JSON.parse(result.stdout);
    value.freeMemoryBytesBeforeProcess = freeBytes;
    report.variants[variant] = value;
    console.log(variant + ': ' + value.fixture.boxes + ' boxes, peak RSS ' + value.memory.processPeakRssKiB +
      ' KiB, median ' + value.timing.medianMs.toFixed(3) + ' ms, arrays ' + value.memory.finalArrayBytes + ' bytes');
  }
  assert.equal(report.variants.current.fixture.inputSha256, report.variants.baseline.fixture.inputSha256, 'Same valid layout');
  assert.deepEqual(report.variants.current.output, report.variants.baseline.output, 'Complete buffer/picking/framing digest equality');
  assert.equal(report.variants.current.memory.finalArrayBytes, report.variants.baseline.memory.finalArrayBytes);
  report.parity = { inputIdentical: true, fullGeometryPickingFramingIdentical: true,
    sha256: report.variants.current.output.fullGeometryAndPickingSha256 };
  report.sources = {};
  for (const file of ['warehouse.js', 'warehouse-webgl.js', 'warehouse-scene.js',
    'tests/fixtures/warehouse-baseline.cjs', 'tests/fixtures/warehouse-webgl-baseline.cjs',
    'tests/fixtures/warehouse-baseline-hashes.json', 'tools/benchmark-warehouse-memory.cjs']) {
    report.sources[file] = digest(fs.readFileSync(path.join(root, file)));
  }
  const output = path.resolve(process.argv[2] || path.join(root, 'docs', 'performance', 'results', 'warehouse-memory-layout-v2.json'));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log('Full geometry/picking/framing SHA-256 parity passed. Saved ' + output);
}

if (process.argv[2] === '--child') child(process.argv[3]);
else parent();
