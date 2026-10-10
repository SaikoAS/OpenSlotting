import test from 'node:test';
import assert from 'node:assert/strict';
// Frozen layout-1 reference for the historical laboratory, never production.
import model from '../../../tests/fixtures/warehouse-baseline.cjs';
import scene from '../../../tests/fixtures/warehouse-scene-baseline.cjs';
import webgl from '../../../tests/fixtures/warehouse-webgl-baseline.cjs';
import workspace from '../../../workspace.js';
import { createAlternatives, batchTransparent, workspaceProjection, createWorkspaceProjectionCache } from './modules.mjs';
import { layoutFixture, registryFixture, profileFixture } from './fixtures.mjs';

const alt = createAlternatives(model, scene, workspace);
const versions = () => ({ workspaceId: 'ws-test', layoutRevision: 0, registryRevision: 0, locale: 'de', kernelVersion: 1 });

test('current supported limits remain unchanged; 1000 objects are future stress only', () => {
  assert.equal(model.normalizeLayout(layoutFixture(model, 150)).objects.length, 150);
  assert.throws(() => model.normalizeLayout(layoutFixture(model, 1000)), /150 objects/);
  const layout = layoutFixture(model, 10);
  const rack = model.createRack('pallet-rack', { bayCount: 30, levelCount: 3 });
  const expanded = model.resizeRack(rack, 30, 12, 4);
  for (const upright of expanded.uprights) upright.height = 20000;
  for (const bay of expanded.bays) for (const level of bay.levels) level.clearHeight = 100;
  layout.objects = [expanded, model.duplicateObject(expanded), model.duplicateObject(expanded), model.duplicateObject(expanded)];
  assert.throws(() => model.normalizeLayout(layout), /5000 positions/);
});

for (const mode of ['spread', 'vertical', 'dense']) test('collision candidates preserve SAT kinds and original ordering: ' + mode, () => {
  for (const size of [0, 10, 100]) {
    const layout = layoutFixture(model, size, mode), expected = model.findCollisions(layout);
    assert.deepEqual(alt.collisionSweep(layout).collisions, expected);
    assert.deepEqual(alt.collisionPreparedSAT(layout).collisions, expected);
    for (const cell of [1000, 10000, 40000]) assert.deepEqual(alt.collisionGrid(layout, cell).collisions, expected);
  }
});

test('collision tolerance, boundaries, rotation and oversized grid fallback are conservative', () => {
  for (const rotation of [-270, -90, -35, 0, 12, 90, 360]) for (const delta of [0, 0.0005, 0.001, 0.002, -0.002]) {
    const a = model.createArea('door', { id: 'a', x: -4000, z: -1000, rotation });
    const b = { ...a, id: 'b', x: a.x + a.width + delta };
    const layout = { version: 1, objects: [a, b] }, expected = model.findCollisions(layout);
    assert.deepEqual(alt.collisionSweep(layout).collisions, expected);
    assert.deepEqual(alt.collisionPreparedSAT(layout).collisions, expected);
    assert.deepEqual(alt.collisionGrid(layout, 100).collisions, expected);
  }
  const layout = layoutFixture(model, 10, 'dense');
  layout.objects[1].width = 50000; layout.objects[1].depth = 50000;
  const result = alt.collisionGrid(layout, 10);
  assert.ok(result.stats.largeObjects > 0);
  assert.deepEqual(result.collisions, model.findCollisions(layout));
  assert.throws(() => alt.collisionGrid(layout, 0), /cell size/);
});

test('deterministic randomized collision layouts preserve full output', () => {
  let state = 928371;
  const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let iteration = 0; iteration < 15; iteration++) {
    const layout = layoutFixture(model, 40);
    for (const object of layout.objects) {
      object.x = Math.round((random() - 0.5) * 12000);
      object.z = Math.round((random() - 0.5) * 12000);
      object.rotation = Math.round((random() - 0.5) * 720);
    }
    const expected = model.findCollisions(layout);
    assert.deepEqual(alt.collisionSweep(layout).collisions, expected);
    assert.deepEqual(alt.collisionPreparedSAT(layout).collisions, expected);
    assert.deepEqual(alt.collisionGrid(layout, 2500).collisions, expected);
  }
});

test('every object type pairing preserves collision categories and exclusions', () => {
  const types = [...model.RACK_TYPES, ...model.AREA_TYPES];
  for (const firstType of types) for (const secondType of types) {
    const create = (type, id) => model.RACK_TYPES.includes(type) ? model.createRack(type, { id, bayCount: 2, levelCount: 2 })
      : model.createArea(type, { id });
    const layout = { version: 1, objects: [create(firstType, 'first'), create(secondType, 'second')] };
    const expected = model.findCollisions(layout);
    assert.deepEqual(alt.collisionSweep(layout).collisions, expected);
    assert.deepEqual(alt.collisionPreparedSAT(layout).collisions, expected);
    assert.deepEqual(alt.collisionGrid(layout).collisions, expected);
  }
});

test('scene cache exact geometry; all revision dimensions and identities invalidate', () => {
  const layout = layoutFixture(model, 10), matches = model.matchArticles(layout, registryFixture(model, layout, 20));
  const cache = alt.createSceneCache(), v = versions(), expected = scene.buildBoxes(model, layout, matches);
  assert.deepEqual(cache.get(layout, matches, v), expected);
  assert.equal(cache.get(layout, matches, v), cache.get(layout, matches, v));
  assert.equal(cache.builds, 1);
  for (const key of Object.keys(v)) {
    const next = { ...v, [key]: key === 'locale' ? 'en' : key === 'workspaceId' ? 'other' : v[key] + 1 };
    assert.deepEqual(cache.get(layout, matches, next), expected);
    assert.deepEqual(cache.get(layout, matches, v), expected);
  }
  const before = cache.builds;
  cache.get(structuredClone(layout), matches, v);
  cache.get(layout, { ...matches }, v);
  assert.equal(cache.builds, before + 2);
  assert.throws(() => cache.get(layout, matches, {}), /versions/);
});

test('content checking catches in-place edits; revision cache requires explicit revision bump', () => {
  const layout = layoutFixture(model, 10), matches = { bySlot: new Map() }, v = versions();
  const scan = alt.createSceneCache({ contentCheck: true }), fast = alt.createSceneCache();
  const prior = fast.get(layout, matches, v);
  scan.get(layout, matches, v);
  layout.objects[0].bays[0].width += 300;
  assert.equal(fast.get(layout, matches, v), prior); // Documented requirement, not self-validating snapshots.
  assert.deepEqual(scan.get(layout, matches, v), scene.buildBoxes(model, layout, matches));
  assert.deepEqual(fast.get(layout, matches, { ...v, layoutRevision: 1 }), scene.buildBoxes(model, layout, matches));
  matches.bySlot.set(layout.objects[0].bays[0].levels[0].positions[0].id, [{ articleId: 'x' }]);
  assert.deepEqual(scan.get(layout, matches, v), scene.buildBoxes(model, layout, matches));
});

test('slot index preserves article ordering, empty/unknown location and exact code lookup', () => {
  const layout = layoutFixture(model, 10), registry = registryFixture(model, layout, 500), index = alt.createSlotIndex(layout);
  registry.push(null, { article_id: 'missing' }, { article_id: 'article-0', master_data: { location: index.slots[0].code } });
  assert.deepEqual(alt.matchArticlesIndexed(index, registry), model.matchArticles(layout, registry));
  for (const code of ['', 'unknown', ...index.slots.map(s => s.code)]) {
    const expected = index.slots.find(s => Boolean(code) && s.code === code);
    assert.deepEqual(index.byCodeFirst.get(code), expected);
  }
});

test('duplicate codes and part IDs retain validation errors; raw prevalidation matching stays exact', () => {
  const layout = layoutFixture(model, 10), slots = model.listSlots(layout);
  layout.objects[0].bays[0].levels[0].positions[1].code = slots[0].code;
  assert.throws(() => model.normalizeLayout(layout), /unique/);
  const index = alt.createSlotIndex(layout), registry = [{ article_id: 'x', master_data: { location: slots[0].code } }];
  assert.deepEqual(alt.matchArticlesIndexed(index, registry), model.matchArticles(layout, registry));
  assert.equal(index.byCodeFirst.get(slots[0].code).slotId, slots[0].slotId);
  assert.notEqual(index.byCodeLast.get(slots[0].code).slotId, slots[0].slotId);
  const duplicate = layoutFixture(model, 10);
  duplicate.objects[0].bays[0].levels[0].positions[1].id = duplicate.objects[0].bays[0].levels[0].positions[0].id;
  assert.throws(() => model.normalizeLayout(duplicate), /IDs must be unique/);
});

test('anchor broad phase preserves preferred snap, ties, rotations and huge-tolerance fallback', () => {
  const targets = Array.from({ length: 50 }, (_, i) => model.createArea(['wall', 'door', 'gate', 'emergency-exit'][i % 4],
    { id: 'target-' + i, x: -5000 + i % 10 * 4000, z: -2000 + Math.floor(i / 10) * 4000, rotation: [-90, 0, 90, 180][i % 4] }));
  const index = alt.createAnchorIndex(targets, 1000);
  for (const target of targets) for (const distance of [0, 50, 100, 149, 150, 151]) {
    const moving = { ...target, id: 'moving', x: target.x + distance, z: target.z + 120 };
    const preferred = target.id + ':1:0';
    for (const preference of [undefined, preferred]) assert.deepEqual(alt.findConnectionSnapIndexed(moving, index, 100, preference),
      model.findConnectionSnap(moving, targets, 100, preference));
  }
  const moving = { ...targets[0], id: 'moving' };
  assert.deepEqual(alt.findConnectionSnapIndexed(moving, index, 100000000), model.findConnectionSnap(moving, targets, 100000000));
  assert.equal(alt.findConnectionSnapIndexed(moving, index, -1), null);
  assert.equal(alt.findConnectionSnapIndexed(model.createArea('aisle'), index, 100), null);
});

test('anchor priority and hysteresis select a preferred target beyond normal tolerance', () => {
  const objects = [0, 100, 200].map((x, i) => model.createArea('wall', { id: 'wall-' + i, x }));
  const moving = model.createArea('wall', { id: 'moving', x: 4210 });
  const index = alt.createAnchorIndex(objects, 1000), preferred = 'wall-1:1:0';
  assert.equal(model.findConnectionSnap(moving, objects, 100).targetId, 'wall-2');
  assert.equal(model.findConnectionSnap(moving, objects, 100, preferred).targetId, 'wall-1');
  assert.deepEqual(alt.findConnectionSnapIndexed(moving, index, 100, preferred), model.findConnectionSnap(moving, objects, 100, preferred));
});

test('indexed lock check preserves nested part edits, deletion, order, toggle and new locked objects', () => {
  const before = layoutFixture(model, 10);
  const variants = [structuredClone(before)];
  for (const object of before.objects) {
    const after = structuredClone(before), chosen = after.objects.find(x => x.id === object.id);
    chosen.x += 10; variants.push(after);
    if (chosen.bays) { const changed = structuredClone(before); changed.objects.find(x => x.id === object.id).bays[0].levels[0].positions[0].code += '-EDIT'; variants.push(changed); }
    const removed = structuredClone(before); removed.objects = removed.objects.filter(x => x.id !== object.id); variants.push(removed);
    const toggle = structuredClone(before); toggle.objects.find(x => x.id === object.id).locked = !object.locked; variants.push(toggle);
  }
  const reordered = structuredClone(before); reordered.objects.reverse(); variants.push(reordered);
  const added = structuredClone(before); added.objects.push({ ...model.createArea('door'), locked: true }); variants.push(added);
  for (const after of variants) for (const toggleId of [undefined, before.objects[0].id, before.objects[1].id])
    assert.equal(alt.lockedEditConflictIndexed(before, after, toggleId), model.lockedEditConflict(before, after, toggleId));
});

test('compiled import profile retains ambiguity, collisions, custom-field state and source rules', () => {
  const profile = profileFixture(), custom = [{ id: 'custom-one', active: true }];
  const profiles = [profile, { ...profile, headers: ['A', 'A', ...profile.headers.slice(2)] },
    { ...profile, mapping: { article: 0, same: 0, quantity: 1 } }];
  for (const source of profiles) {
    const compiled = alt.compileImportProfile(source);
    for (const headers of [source.headers, source.headers.slice().reverse(), source.headers.slice(1),
      source.headers.map(h => ' ' + h.toUpperCase() + ' '), ['A', 'A', 'A']])
      for (const fields of [custom, [], [{ id: 'custom-one', active: false }]])
        assert.deepEqual(compiled.plan({ headers }, fields), workspace.planImportProfile(source, { headers }, fields));
  }
  assert.throws(() => alt.compileImportProfile({ ...profile, id: 'bad-id' }), /metadata/);
  const planner = alt.compileImportProfile(profile);
  const returned = planner.plan({ headers: profile.headers }, custom);
  returned.preparationRules.article = [{ type: 'invented' }];
  assert.deepEqual(planner.plan({ headers: profile.headers }, custom), workspace.planImportProfile(profile, { headers: profile.headers }, custom));
});

test('workspace projection preserves summary counts without persisting caches or mutating files', () => {
  const item = workspace.createWorkspace('Example');
  item.files = [{ buffer: new ArrayBuffer(7), result: { rows: [1, 2] } }, { buffer: new ArrayBuffer(3), result: { rows: [3] } }];
  item.warehouseLayout = layoutFixture(model, 10);
  const cache = createWorkspaceProjectionCache(), projection = workspaceProjection(item);
  assert.equal(projection.sourceBytes, 10); assert.equal(projection.normalizedRowCount, 3);
  assert.deepEqual(cache.get(item, 1), projection);
  item.files.push({ buffer: new ArrayBuffer(9) });
  assert.equal(cache.get(item, 1).sourceCount, 2);
  assert.equal(cache.get(item, 2).sourceCount, 3);
  assert.equal(Object.hasOwn(item, 'projection'), false);
  assert.throws(() => cache.get(item), /revision/);
});

test('transparent packing preserves sorted vertex order, all geometry and picking arrays', () => {
  const layout = layoutFixture(model, 10), boxes = scene.buildBoxes(model, layout, { bySlot: new Map() });
  const projected = webgl.projectScene(boxes, { yaw: -0.6, pitch: 0.7, zoom: 1 }, 1440, 1024, null, null, new Set(), 'transparent');
  const before = projected.transparent.map(array => array.slice()), packed = batchTransparent(projected);
  assert.deepEqual([...packed], projected.transparent.flatMap(array => [...array]));
  assert.deepEqual(projected.transparent, before);
  assert.ok(projected.pickMap.length > 1);
  assert.equal(batchTransparent({ transparent: [] }).length, 0);
});
