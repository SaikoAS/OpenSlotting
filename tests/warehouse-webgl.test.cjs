'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const renderer = require('../warehouse-webgl.js');

const camera = { yaw: 0, pitch: 0.6, zoom: 1 };
const conflicts = new Set();

function box(type, id, z, slotRef) {
  return { object: { type, id, x: 0, z, rotation: 0 }, x: 0, y: 0, z,
    width: 100, height: 100, depth: 100, color: '#7790a6', slotRef: slotRef || null };
}

test('renderer leaves the 2D plan available when WebGL2 cannot be created', () => {
  assert.equal(renderer.create({ getContext: () => null }), null);
  assert.equal(renderer.create({ getContext: () => { throw new Error('disabled'); } }), null);
});

test('3D projection gives nearer geometry a smaller depth value and distinct picking IDs', () => {
  const slotRef = { objectId: 'rack', slotId: 'slot-1' };
  const scene = renderer.projectScene([
    box('pallet-rack', 'rack', 0, slotRef),
    box('pallet-rack', 'rack', 200)
  ], camera, 800, 500, 'rack', 'slot-1', conflicts, 'solid');
  assert.ok(scene.opaque[302] < scene.opaque[2]);
  assert.deepEqual(scene.pickMap.slice(1), [slotRef, { objectId: 'rack' }]);
  assert.deepEqual(renderer.idColor(256), [0, 1 / 255, 0]);
  assert.equal(scene.opaque.length, 600);
  assert.ok(scene.grid.length > 0);
  assert.ok(Math.abs(scene.grid[2] - .999) < .00001);
});

test('wall display modes change only projected geometry, not the saved plan', () => {
  const boxes = [box('wall', 'wall-1', 0), box('pallet-rack', 'rack-1', 300)];
  const solid = renderer.projectScene(boxes, camera, 800, 500, null, null, conflicts, 'solid');
  const transparent = renderer.projectScene(boxes, camera, 800, 500, null, null, conflicts, 'transparent');
  const hidden = renderer.projectScene(boxes, camera, 800, 500, null, null, conflicts, 'hidden');
  assert.equal(solid.opaque.length, 600);
  assert.equal(solid.transparent.length, 0);
  assert.equal(transparent.opaque.length, 300);
  assert.equal(transparent.transparent.length, 1);
  assert.equal(hidden.opaque.length, 300);
  assert.equal(hidden.transparent.length, 0);
  assert.deepEqual(hidden.pickMap.slice(1), [{ objectId: 'rack-1' }]);
  assert.equal(boxes.length, 2);
});
