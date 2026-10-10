'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const warehouse = require('../../../tests/fixtures/warehouse-baseline.cjs');
const { LIMIT, clone, createDelta, applyDelta } = require('./history.cjs');
const { layoutFor, driver } = require('./fixtures.cjs');

function pair(initial = layoutFor(4)) { return [driver('snapshots', initial), driver('deltas', initial)]; }
function equivalent(drivers) {
  assert.deepEqual(drivers[0].layout, drivers[1].layout);
  assert.equal(drivers[0].selection, drivers[1].selection);
  const a = drivers[0].history.inspect(); const b = drivers[1].history.inspect();
  for (const key of ['undo', 'redo', 'saving', 'lastError', 'workspaceId', 'limit']) assert.equal(a[key], b[key], key);
}
async function editBoth(drivers, transform, settings = {}) {
  const results = [];
  for (const d of drivers) { const next = clone(d.layout); transform(next); results.push(await d.history.commit(next, settings)); }
  assert.equal(results[0], results[1]); equivalent(drivers); return results[0];
}

test('Object-ID deltas restore root fields, exact order, additions, removals and nested changes', () => {
  const before = layoutFor(3);
  before.future = { grid: 100, tags: ['A'] };
  const after = clone(before);
  after.future.grid = 200;
  after.objects[1].bays[0].levels[0].positions[0].code = '000123';
  after.objects.splice(0, 1);
  const added = warehouse.createArea('wall', { id: 'wall-new', name: 'Wall' });
  after.objects.push(added); after.objects.reverse();
  const delta = createDelta(before, after, 'rack-0', 'wall-new');
  assert.deepEqual(applyDelta(before, delta, 'after'), after);
  assert.deepEqual(applyDelta(after, delta, 'before'), before);
  assert.equal(delta.beforeSelection, 'rack-0');
  assert.equal(delta.afterSelection, 'wall-new');
  assert.throws(() => applyDelta(before, delta, 'invalid'), /direction/);
});

test('Move, reorder, resize, code edit, duplicate and deletion undo/redo exactly with selection', async () => {
  const drivers = pair();
  await editBoth(drivers, next => { next.objects[0].x += 100; });
  await editBoth(drivers, next => { next.objects.reverse(); });
  await editBoth(drivers, next => { next.objects[0] = warehouse.resizeRack(next.objects[0], 2, null, null); });
  await editBoth(drivers, next => { next.objects[0].bays[0].levels[0].positions[0].code = '00007'; });
  // Create once, then insert identical normalized input in both variants.
  const duplicate = warehouse.duplicateObject(drivers[0].layout.objects[0], { name: 'Duplicate', objects: drivers[0].layout.objects });
  await editBoth(drivers, next => { next.objects.push(clone(duplicate)); }, { selectionAfter: duplicate.id });
  await editBoth(drivers, next => { next.objects = next.objects.filter(object => object.id !== duplicate.id); }, { selectionAfter: null });
  const finalLayout = clone(drivers[0].layout);
  for (let index = 0; index < 6; index += 1) { for (const d of drivers) assert.equal(await d.history.undo(), true); equivalent(drivers); }
  assert.deepEqual(drivers[0].layout, layoutFor(4));
  assert.equal(drivers[0].selection, 'rack-0');
  for (let index = 0; index < 6; index += 1) { for (const d of drivers) assert.equal(await d.history.redo(), true); equivalent(drivers); }
  assert.deepEqual(drivers[0].layout, finalLayout); assert.equal(drivers[0].selection, null);
});

test('Lock toggles have no history entry; current locks can block undo and survive redo', async () => {
  const drivers = pair();
  await editBoth(drivers, next => { next.objects[0].x += 100; });
  await editBoth(drivers, next => { next.objects[0].locked = true; }, { toggleLockId: 'rack-0', selectionAfter: 'rack-0' });
  assert.equal(drivers[0].history.inspect().undo, 1);
  for (const d of drivers) assert.equal(await d.history.undo(), false);
  equivalent(drivers); assert.equal(drivers[0].layout.objects[0].locked, true);
  await editBoth(drivers, next => { next.objects[0].locked = false; }, { toggleLockId: 'rack-0', selectionAfter: 'rack-0' });
  for (const d of drivers) assert.equal(await d.history.undo(), true);
  equivalent(drivers); assert.equal(drivers[0].layout.objects[0].locked, false);
  // Unchanged object's lock is preserved across a redo.
  await editBoth(drivers, next => { next.objects[1].locked = true; }, { toggleLockId: 'rack-1' });
  for (const d of drivers) assert.equal(await d.history.redo(), true);
  equivalent(drivers); assert.equal(drivers[0].layout.objects[1].locked, true);
});

test('Branch after undo clears redo only after a successfully saved edit', async () => {
  const drivers = pair();
  await editBoth(drivers, next => { next.objects[0].x += 100; });
  await editBoth(drivers, next => { next.objects[0].x += 100; });
  for (const d of drivers) await d.history.undo();
  for (const d of drivers) d.fail();
  assert.equal(await editBoth(drivers, next => { next.objects[1].z += 100; }), false);
  assert.equal(drivers[0].history.inspect().redo, 1);
  assert.equal(await editBoth(drivers, next => { next.objects[1].z += 200; }), true);
  assert.equal(drivers[0].history.inspect().redo, 0);
  for (const d of drivers) assert.equal(await d.history.redo(), false);
});

test('Failed save and validation failures leave layout, selection and both stacks unchanged', async () => {
  const drivers = pair();
  await editBoth(drivers, next => { next.objects[0].x += 100; });
  const before = clone(drivers[0].layout);
  for (const d of drivers) d.fail();
  assert.equal(await editBoth(drivers, next => { next.objects[0].x += 100; }, { selectionAfter: 'rack-1' }), false);
  assert.deepEqual(drivers[0].layout, before); assert.equal(drivers[0].selection, 'rack-0');
  assert.equal(await editBoth(drivers, next => { next.objects[0].x = Infinity; }), false);
  assert.deepEqual(drivers[0].layout, before); assert.equal(drivers[0].history.inspect().undo, 1);
  for (const d of drivers) d.fail();
  for (const d of drivers) assert.equal(await d.history.undo(), false);
  equivalent(drivers); assert.equal(drivers[0].history.inspect().undo, 1); assert.equal(drivers[0].history.inspect().redo, 0);
});

test('Persistence is confirmed before history mutation and concurrent commits are rejected', async () => {
  for (const representation of ['snapshots', 'deltas']) {
    const d = driver(representation, layoutFor(3));
    let resolve;
    d.gate(new Promise(done => { resolve = done; }));
    const next = clone(d.layout); next.objects[0].x += 100;
    const pending = d.history.commit(next, { selectionAfter: 'rack-1' });
    assert.equal(d.history.inspect().saving, true); assert.equal(d.history.inspect().undo, 0); assert.equal(d.selection, 'rack-0');
    assert.equal(await d.history.commit(next), false);
    resolve(); assert.equal(await pending, true);
    assert.equal(d.history.inspect().undo, 1); assert.equal(d.selection, 'rack-1');
  }
});

test('Workspace change clears both stacks including a pending commit finishing in its old scope', async () => {
  for (const representation of ['snapshots', 'deltas']) {
    const d = driver(representation, layoutFor(3));
    const next = clone(d.layout); next.objects[0].x += 100;
    await d.history.commit(next);
    let resolve;
    d.gate(new Promise(done => { resolve = done; }));
    const later = clone(d.layout); later.objects[0].z += 100;
    const pending = d.history.commit(later);
    d.switchWorkspace('B', layoutFor(2));
    assert.equal(d.history.inspect().undo, 0); assert.equal(d.history.inspect().redo, 0);
    resolve(); assert.equal(await pending, true);
    assert.equal(d.history.inspect().workspaceId, 'B'); assert.equal(d.history.inspect().undo, 0);
    assert.deepEqual(d.layout, layoutFor(2));
    assert.equal(await d.history.undo(), false);
  }
});

test('Current 20-entry history limit is preserved after 50 edits', async () => {
  const drivers = pair(layoutFor(3));
  for (let index = 0; index < 50; index += 1) await editBoth(drivers, next => { next.objects[0].x += 100; });
  assert.equal(LIMIT, 20); assert.equal(drivers[0].history.inspect().undo, 20);
  for (let index = 0; index < 20; index += 1) { for (const d of drivers) assert.equal(await d.history.undo(), true); equivalent(drivers); }
  for (const d of drivers) assert.equal(await d.history.undo(), false);
  assert.equal(drivers[0].layout.objects[0].x, 3000);
});

test('Supported 150 objects pass original core validation; a 151st object is rejected', async () => {
  const initial = layoutFor(150);
  assert.equal(initial.objects.length, 150);
  const drivers = pair(initial);
  assert.equal(await editBoth(drivers, next => { next.objects.push(warehouse.createArea('wall', { id: 'extra', name: 'Extra' })); }), false);
  assert.equal(drivers[0].history.inspect().undo, 0);
});

test('No-op and disguised lock mutation create no history; failed redo preserves its target', async () => {
  const drivers = pair();
  assert.equal(await editBoth(drivers, () => {}), false);
  assert.equal(await editBoth(drivers, next => { next.objects[0].locked = true; }), false);
  assert.equal(await editBoth(drivers, next => { next.objects[0].locked = true; next.objects[0].x += 100; }, { toggleLockId: 'rack-0' }), false);
  assert.equal(drivers[0].history.inspect().undo, 0);
  await editBoth(drivers, next => { next.objects[0].x += 100; });
  for (const d of drivers) await d.history.undo();
  const before = clone(drivers[0].layout);
  for (const d of drivers) d.fail();
  for (const d of drivers) assert.equal(await d.history.redo(), false);
  equivalent(drivers);
  assert.deepEqual(drivers[0].layout, before);
  assert.equal(drivers[0].history.inspect().redo, 1);
  assert.equal(drivers[0].history.inspect().undo, 0);
});
