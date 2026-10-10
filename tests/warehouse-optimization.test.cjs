'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const model = require('../warehouse.js');
const scene = require('../warehouse-scene.js');
const renderer = require('../warehouse-webgl.js');
// Exact frozen production files from db39ffaca31ebeddec884413c38725f4fd38a5a0.
// These references are test-only and never part of the release runtime.
const original = require('./fixtures/warehouse-baseline.cjs');
const originalRenderer = require('./fixtures/warehouse-webgl-baseline.cjs');
const { layoutFixture } = require('./fixtures/warehouse-performance.cjs');

function buffersEqual(actual, expected, name) {
  assert.equal(actual.constructor, Float32Array, name + ' type');
  assert.equal(actual.byteLength, expected.byteLength, name + ' bytes');
  assert.equal(Buffer.from(actual.buffer, actual.byteOffset, actual.byteLength).equals(
    Buffer.from(expected.buffer, expected.byteOffset, expected.byteLength)), true, name + ' exact Float32 bits');
}

function sameProjection(actual, expected) {
  for (const field of ['opaque', 'edges', 'grid']) buffersEqual(actual[field], expected[field], field);
  assert.equal(actual.transparent.length, expected.transparent.length);
  actual.transparent.forEach(function (vertices, index) {
    const legacy = expected.transparent[index];
    buffersEqual(actual.pickTransparent[index], legacy, 'picking-' + index);
    // Routes now display their top face only; picking retains all original faces.
    buffersEqual(vertices, actual.routeCoverage[index] ? legacy.subarray(0, 60) : legacy, 'transparent-' + index);
  });
  assert.deepEqual(actual.pickMap, expected.pickMap);
  assert.deepEqual(actual.view, expected.view);
}

// Independent quadratic reference: no broad-phase sweep, vertical bins or caches.
// The shared physical description and SAT footprint contract are public domain APIs.
function collisionReference(layout) {
  const result = [], objects = layout.objects;
  const parts = object => model.physicalParts(object).map(part => ({ ...part, ...model.localPoint(object, part.x, part.z),
    id: object.id, type: 'wall', rotation: object.rotation }));
  for (const route of objects.filter(object => object.type === 'aisle')) {
    const r = route.route || {};
    if (r.requiredWidth == null || r.requiredHeight == null) result.push({ firstId: route.id, secondId: route.id, kind: 'unverified-route', severity: 'info' });
    if (r.requiredWidth && r.requiredWidth + 2 * (r.widthMargin || 0) > route.depth)
      result.push({ firstId: route.id, secondId: route.id, kind: 'route-too-narrow', obstacleId: route.id });
  }
  for (let i = 0; i < objects.length; i++) for (let j = i + 1; j < objects.length; j++) {
    const first = objects[i], second = objects[j];
    if ([first, second].some(object => ['goods-in', 'goods-out'].includes(object.type))) continue;
    if (first.type === 'aisle' && second.type === 'aisle') continue;
    if (!model.RACK_TYPES.includes(first.type) && !model.RACK_TYPES.includes(second.type) &&
      (first.type === 'wall' && ['wall', 'gate', 'emergency-exit'].includes(second.type) ||
       second.type === 'wall' && ['gate', 'emergency-exit'].includes(first.type))) continue;
    if (!model.footprintsOverlap(first, second)) continue;
    const route = first.type === 'aisle' ? first : second.type === 'aisle' ? second : null;
    let finding;
    if (route) {
      const obstacle = route === first ? second : first, floor = route.elevation || 0, r = route.route || {};
      const height = Number.isFinite(r.requiredHeight) ? r.requiredHeight + (r.heightMargin || 0) : null;
      const part = parts(obstacle).find(part => part.y + part.height > floor + .001 &&
        (height === null ? part.y <= floor + .001 : part.y < floor + height - .001) &&
        model.routeSegments(route).some(segment => model.footprintsOverlap(segment, part)));
      if (part) finding = { kind: ['beam', 'deck', 'header'].includes(part.kind) ? 'route-too-low' :
        ['upright', 'frame'].includes(part.kind) ? 'route-too-narrow' : 'blocked-aisle',
        partId: part.partId, partKind: part.kind, bayIndex: part.bayIndex, levelIndex: part.levelIndex,
        obstacleId: obstacle.id, availableHeight: Math.max(0, part.y - floor), requiredHeight: height };
    } else {
      outer: for (const a of parts(first)) for (const b of parts(second)) {
        if (Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) <= .001 || !model.footprintsOverlap(a, b)) continue;
        finding = { kind: 'overlap', partId: a.partId, secondPartId: b.partId, obstacleId: first.id }; break outer;
      }
    }
    if (finding) result.push({ firstId: first.id, secondId: second.id, ...finding });
  }
  return result;
}
function assertCollisions(layout, message) {
  // Multiple colliding second parts are valid. Vertical-bin traversal may
  // report a different second part than an exhaustive scan; validate it too.
  const actual = model.findCollisions(layout);
  for (const finding of actual.filter(item => item.secondPartId)) {
    const first = layout.objects.find(object => object.id === finding.firstId);
    const second = layout.objects.find(object => object.id === finding.secondId);
    const worldParts = object => model.physicalParts(object).map(part => ({ ...part, ...model.localPoint(object, part.x, part.z), type: 'wall', rotation: object.rotation }));
    assert.ok(worldParts(first).filter(part => part.partId === finding.partId).some(a =>
      worldParts(second).filter(part => part.partId === finding.secondPartId).some(b =>
        Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > .001 && model.footprintsOverlap(a, b))));
  }
  const semantic = records => records.map(({ secondPartId, ...record }) => record);
  assert.deepEqual(semantic(actual), semantic(collisionReference(layout)), message);
}

test('production collision sweep equals physical-part reference in sparse/dense/vertical layouts', () => {
  for (const count of [0, 10, 23, 24, 100, 150]) for (const mode of ['spread', 'dense', 'vertical']) {
    const layout = layoutFixture(model, count, mode), before = JSON.stringify(layout);
    assertCollisions(layout, count + '/' + mode);
    assert.equal(JSON.stringify(layout), before);
    const reversed = { ...layout, objects: layout.objects.slice().reverse() };
    assertCollisions(reversed);
  }
});

test('production SAT footprints preserve frozen contact tolerance and rotations for all object types', () => {
  function create(type, id) {
    return model.RACK_TYPES.includes(type) ? model.createRack(type, { id, bayCount: 1, levelCount: 1 }) : model.createArea(type, { id });
  }
  const types = model.RACK_TYPES.concat(model.AREA_TYPES);
  for (const firstType of types) for (const secondType of types) {
    const first = create(firstType, 'first'), second = create(secondType, 'second');
    for (const rotation of [-360, -270, -35, 0, 12, 90, 360]) for (const delta of [-0.002, 0, 0.0005, 0.001, 0.002]) {
      first.x = -2000; first.z = -1200; first.rotation = rotation;
      second.x = first.x + model.objectFootprint(first).width + delta; second.z = first.z; second.rotation = rotation;
      const layout = { objects: [first, second] };
      assert.equal(model.footprintsOverlap(first, second), original.footprintsOverlap(first, second));
      assertCollisions(layout);
    }
  }
});

test('production collision sweep preserves input ordering in randomized, edge and overlay layouts', () => {
  let seed = 8219823;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let iteration = 0; iteration < 25; iteration += 1) {
    const layout = layoutFixture(model, 100);
    layout.objects.forEach(function (object, index) {
      object.x = Math.round((random() - .5) * (iteration % 2 ? 20000 : 1000000));
      object.z = Math.round((random() - .5) * (iteration % 2 ? 20000 : 1000000));
      object.rotation = Math.round((random() - .5) * 720);
      object.id = 'unordered-' + (100 - index);
    });
    assertCollisions(layout);
  }
  const overlays = layoutFixture(model, 150, 'dense');
  overlays.objects.forEach(function (object) { object.type = 'goods-in'; });
  assertCollisions(overlays);
});

test('production projection preserves frozen geometry/picking and renders routes as top surfaces', () => {
  const layout = layoutFixture(model, 10), boxes = scene.buildBoxes(model, layout), before = JSON.stringify(boxes);
  const slot = boxes.find(function (item) { return item.slotRef && item.slotRef.slotId; });
  for (const mode of ['solid', 'transparent', 'hidden']) for (const yaw of [-1.2, 0, .47]) {
    const camera = { yaw, pitch: .72, zoom: 1.3, target: { x: -180000, y: 1700, z: -195000 }, baseScale: .05 };
    for (const selections of [[null, null, new Set()], [slot.object.id, slot.slotRef.slotId, new Set(['object-1', 'object-2'])]]) {
      const args = [boxes, camera, 1440, 1024, selections[0], selections[1], selections[2], mode];
      sameProjection(renderer.projectScene(...args), originalRenderer.projectScene(...args));
    }
  }
  sameProjection(renderer.projectScene([], { yaw: 0, pitch: .6, zoom: 1 }, 800, 500, null, null, new Set(), 'hidden'),
    originalRenderer.projectScene([], { yaw: 0, pitch: .6, zoom: 1 }, 800, 500, null, null, new Set(), 'hidden'));
  assert.equal(JSON.stringify(boxes), before);
});

test('production changes remain exact at both supported object and slot limits', () => {
  const layout = layoutFixture(model, 150, 'spread', true);
  assert.equal(model.listSlots(layout).length, 5000);
  assertCollisions(layout);
  const matches = { bySlot: new Map([[layout.locations[0].id, [{ articleId: 'A' }]]]) };
  const boxes = scene.buildBoxes(model, layout, matches);
  const args = [boxes, { yaw: -.62, pitch: .62, zoom: 1 }, 1440, 1024, 'object-0', null, new Set(['object-3']), 'transparent'];
  sameProjection(renderer.projectScene(...args), originalRenderer.projectScene(...args));
  assert.equal(layout.objects[0].locked, true);
  assert.throws(() => model.normalizeLayout({ version: model.LAYOUT_VERSION, objects: Array(151).fill(layout.objects[0]), zones: [], locations: [] }), /150 objects/);
});

test('frame-local optimizations immediately reflect mutable inputs without requiring revisions', () => {
  const layout = layoutFixture(model, 30), boxes = scene.buildBoxes(model, layout);
  const camera = { yaw: .2, pitch: .6, zoom: 1 }, conflicts = new Set();
  const args = [boxes, camera, 800, 500, null, null, conflicts, 'solid'];
  renderer.projectScene(...args); model.findCollisions(layout);
  layout.objects[0].x += 9000; layout.objects[0].rotation += 17;
  boxes[0].width += 300; boxes[0].color = '#123456'; camera.yaw += .2; camera.pitch += .1; conflicts.add(layout.objects[0].id);
  sameProjection(renderer.projectScene(...args), originalRenderer.projectScene(...args));
  assertCollisions(layout);
});

test('frozen baseline fixtures retain their source identity', () => {
  const hashes = require('./fixtures/warehouse-baseline-hashes.json');
  for (const file of Object.keys(hashes)) {
    const canonical = fs.readFileSync(path.join(__dirname, 'fixtures', file), 'utf8').replace(/\r\n/g, '\n');
    assert.equal(crypto.createHash('sha256').update(canonical).digest('hex'), hashes[file]);
  }
});
