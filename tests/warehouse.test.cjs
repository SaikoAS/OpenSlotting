'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const csv = require('../csv.js');
const warehouse = require('../warehouse.js');
const workspace = require('../workspace.js');
const storage = require('../storage.js');
const { createFakeIndexedDB } = require('./fake-indexeddb.cjs');

test('object locks survive normalization and reject edits until explicitly toggled', () => {
  const rack = warehouse.createRack('pallet-rack', { bayCount: 1, levelCount: 1 });
  const wall = warehouse.createArea('wall');
  assert.equal(rack.locked, false);
  assert.equal(wall.locked, false);
  delete wall.locked;
  const legacy = warehouse.normalizeLayout({ version: 1, objects: [rack, wall] });
  assert.equal(legacy.objects[1].locked, false);
  const locked = structuredClone(legacy);
  locked.objects[0].locked = true;
  assert.equal(warehouse.lockedEditConflict(legacy, locked, rack.id), null);
  const saved = warehouse.normalizeLayout(locked);
  assert.equal(saved.objects[0].locked, true);
  assert.equal(warehouse.lockedEditConflict(legacy, saved), rack.id);
  const moved = structuredClone(saved);
  moved.objects[0].x = 100;
  assert.equal(warehouse.lockedEditConflict(saved, moved), rack.id);
  const coded = structuredClone(saved);
  coded.objects[0].bays[0].levels[0].positions[0].code = 'R-01';
  assert.equal(warehouse.lockedEditConflict(saved, coded), rack.id);
  const deleted = structuredClone(saved);
  deleted.objects.shift();
  assert.equal(warehouse.lockedEditConflict(saved, deleted), rack.id);
  const unrelated = structuredClone(saved);
  unrelated.objects[1].x = 500;
  assert.equal(warehouse.lockedEditConflict(saved, unrelated), null);
  const unlocked = structuredClone(saved);
  unlocked.objects[0].locked = false;
  assert.equal(warehouse.lockedEditConflict(saved, unlocked, rack.id), null);
  assert.equal(warehouse.lockedEditConflict(saved, unlocked), rack.id);
  const mixedToggle = structuredClone(unlocked);
  mixedToggle.objects[1].x = 100;
  assert.equal(warehouse.lockedEditConflict(saved, mixedToggle, rack.id), wall.id);
  const copy = warehouse.duplicateObject(saved.objects[0]);
  assert.equal(copy.locked, false);
});

test('rack recipe keeps stable position IDs and codes when counts grow', () => {
  const rack = warehouse.createRack('pallet-rack', { bayCount: 2, levelCount: 2 });
  rack.bays[0].levels[0].positions[0].code = 'R01-01-01-01';
  rack.bays[1].width = 3000;
  rack.uprights[2].height = 6500;
  const originalId = rack.bays[0].levels[0].positions[0].id;
  const expanded = warehouse.resizeRack(rack, 3, 3, 3);
  const layout = warehouse.normalizeLayout({ version: 1, objects: [expanded] });
  assert.equal(layout.objects[0].bays[0].levels[0].positions[0].id, originalId);
  assert.equal(layout.objects[0].bays[0].levels[0].positions[0].code, 'R01-01-01-01');
  assert.equal(layout.objects[0].bays[1].width, 3000);
  assert.equal(layout.objects[0].uprights[2].height, 6500);
  assert.equal(warehouse.listSlots(layout).length, 27);
});

test('individual bay levels and level positions survive later rack resizing', () => {
  const rack = warehouse.createRack('pallet-rack', { bayCount: 2, levelCount: 2 });
  const firstId = rack.bays[0].levels[0].positions[0].id;
  const secondId = rack.bays[1].levels[0].positions[0].id;
  rack.bays[1].levels[0].positions[0].code = 'B-01';
  const expanded = warehouse.resizeBayLevels(rack, 1, 3);
  assert.deepEqual(expanded.bays.map((bay) => bay.levels.length), [2, 3]);
  assert.equal(expanded.bays[0].levels[0].positions[0].id, firstId);
  const positioned = warehouse.resizeLevelPositions(expanded, 1, 0, 3);
  assert.equal(positioned.bays[1].levels[0].positions[0].id, secondId);
  assert.equal(positioned.bays[1].levels[0].positions[0].code, 'B-01');
  assert.equal(positioned.bays[1].levels[0].positions.length, 3);
  assert.equal(positioned.bays[0].levels[0].positions.length, 2);
  const grown = warehouse.resizeRack(positioned, 3, null, null);
  const layout = warehouse.normalizeLayout({ version: 1, objects: [grown] });
  assert.deepEqual(layout.objects[0].bays.map((bay) => bay.levels.length), [2, 3, 2]);
  assert.equal(layout.objects[0].bays[1].levels[0].positions.length, 3);
  assert.equal(layout.objects[0].bays[1].levels[0].positions[0].code, 'B-01');
  assert.equal(layout.objects[0].bays[1].levels[0].positions[0].id, secondId);
  const reduced = warehouse.resizeBayLevels(grown, 1, 1);
  assert.deepEqual(reduced.bays.map((bay) => bay.levels.length), [2, 1, 2]);
  assert.throws(() => warehouse.resizeBayLevels(grown, 1, 13), /1–12/);
  assert.throws(() => warehouse.resizeLevelPositions(grown, 1, 0, 5), /1–4/);
});

test('layout rejects duplicate codes and levels taller than adjacent uprights', () => {
  const rack = warehouse.createRack('shelf-rack', { bayCount: 1, levelCount: 2 });
  rack.bays[0].levels[0].positions[0].code = 'A-01';
  rack.bays[0].levels[1].positions[0].code = 'A-01';
  assert.throws(() => warehouse.normalizeLayout({ version: 1, objects: [rack] }), /unique/);
  rack.bays[0].levels[1].positions[0].code = 'A-02';
  rack.uprights[1].height = 300;
  assert.throws(() => warehouse.normalizeLayout({ version: 1, objects: [rack] }), /exceed/);
});

test('area recipes normalize and malformed rack parts fail as validation errors', () => {
  const types = ['wall', 'gate', 'door', 'emergency-exit', 'aisle', 'goods-in', 'goods-out'];
  const areas = types.map((type) => warehouse.createArea(type));
  const layout = warehouse.normalizeLayout({ version: 1, objects: areas });
  assert.deepEqual(layout.objects.map((object) => object.type), types);
  assert.deepEqual([areas[2].width, areas[2].depth, areas[2].height], [1000, 160, 2100]);
  const rack = warehouse.createRack('shelf-rack', { bayCount: 1, levelCount: 1 });
  rack.bays[0].levels[0].positions[0] = null;
  assert.throws(
    () => warehouse.normalizeLayout({ version: 1, objects: [rack] }),
    (error) => error instanceof warehouse.WarehouseValidationError && /position is invalid/.test(error.message)
  );
});

test('magnetic connectors align wall, gate and door ends without changing dimensions', () => {
  const wall = warehouse.createArea('wall');
  wall.locked = true;
  const door = warehouse.createArea('door');
  door.x = 4025; door.z = -20;
  const result = warehouse.findConnectionSnap(door, [wall, door], 100);
  assert.deepEqual([result.x, result.z], [4000, -20]);
  assert.deepEqual(result.point, { x: 4000, z: 60 });
  assert.equal(result.targetId, wall.id);
  assert.equal(door.width, 1000);
  assert.equal(warehouse.findCollisions({ objects: [wall, { ...door, x: 0 }] })[0].kind, 'overlap');
  assert.deepEqual(warehouse.findCollisions({ objects: [wall, { ...door, x: result.x, z: result.z }] }), []);
  assert.equal(warehouse.findConnectionSnap(door, [wall], 20), null);
  assert.equal(warehouse.findConnectionSnap({ ...door, x: 25 }, [wall], 100), null);

  const gate = warehouse.createArea('gate');
  gate.x = 4950; gate.z = -20;
  const gateSnap = warehouse.findConnectionSnap(gate, [{ ...door, x: 4000 }], 100);
  assert.deepEqual([gateSnap.x, gateSnap.z], [5000, -20]);
  assert.equal(warehouse.findConnectionSnap({ ...door, rotation: 90 }, [wall], 100), null);
  assert.equal(warehouse.findConnectionSnap(warehouse.createArea('aisle'), [wall], 100), null);
  const pending = { ...door, x: 4175 };
  assert.equal(warehouse.findConnectionSnap(pending, [wall], 120), null);
  const retained = warehouse.findConnectionSnap(pending, [wall], 120, result.key);
  assert.deepEqual([retained.x, retained.z], [4000, -20]);
});

test('magnetic connectors support right-angle and rotated walls', () => {
  const wall = warehouse.createArea('wall');
  const turn = warehouse.createArea('wall');
  turn.rotation = 90; turn.x = 4060; turn.z = 85;
  const corner = warehouse.findConnectionSnap(turn, [wall], 100);
  assert.deepEqual([corner.x, corner.z], [4060, 60]);
  const joined = { ...turn, x: corner.x, z: corner.z };
  const wallEnd = warehouse.connectionAnchors(wall)[1];
  const turnStart = warehouse.connectionAnchors(joined)[0];
  assert.ok(Math.hypot(wallEnd.x - turnStart.x, wallEnd.z - turnStart.z) < 0.01);

  wall.rotation = 30;
  const end = warehouse.connectionAnchors(wall)[1];
  const angled = warehouse.createArea('wall');
  angled.rotation = 30;
  angled.x = Math.round(end.x + Math.sin(Math.PI / 6) * angled.depth / 2 + 30);
  angled.z = Math.round(end.z - Math.cos(Math.PI / 6) * angled.depth / 2 - 20);
  const snapped = warehouse.findConnectionSnap(angled, [wall], 100);
  assert.ok(snapped);
  const aligned = warehouse.connectionAnchors({ ...angled, x: snapped.x, z: snapped.z })[0];
  assert.ok(Math.hypot(end.x - aligned.x, end.z - aligned.z) < 1);
});

test('floor footprints respect rack dimensions and rotation while grid moves preserve codes', () => {
  const rack = warehouse.createRack('pallet-rack', { bayCount: 2, levelCount: 1 });
  rack.bays[0].width = 2900;
  rack.x = 1000; rack.z = 2000; rack.rotation = 90;
  rack.bays[0].levels[0].positions[0].code = 'P-01';
  assert.deepEqual(warehouse.objectFootprint(rack), { width: 5900, depth: 1100 });
  assert.deepEqual(warehouse.footprintCorners(rack).map((point) => [Math.round(point.x), Math.round(point.z)]),
    [[1000, 2000], [1000, 7900], [-100, 7900], [-100, 2000]]);
  rack.x = warehouse.snapCoordinate(1234, 100);
  rack.z = warehouse.snapCoordinate(-167, 100);
  const moved = warehouse.normalizeLayout({ version: 1, objects: [rack] }).objects[0];
  assert.equal(moved.x, 1200);
  assert.equal(moved.z, -200);
  assert.equal(moved.bays[0].levels[0].positions[0].code, 'P-01');
  assert.throws(() => warehouse.snapCoordinate(100, 0), /Grid/);
});

test('collision checks use rotated footprints and ignore touching edges and intentional overlays', () => {
  const rack = warehouse.createRack('shelf-rack', { bayCount: 1, levelCount: 1 });
  const other = warehouse.createRack('shelf-rack', { bayCount: 1, levelCount: 1 });
  other.x = warehouse.objectFootprint(rack).width;
  assert.equal(warehouse.footprintsOverlap(rack, other), false);
  other.x -= 1;
  assert.deepEqual(warehouse.findCollisions({ objects: [rack, other] }),
    [{ firstId: rack.id, secondId: other.id, kind: 'overlap' }]);
  rack.rotation = 45; other.rotation = 45; other.x = -424; other.z = 424;
  assert.equal(warehouse.footprintsOverlap(rack, other), false);

  const wall = warehouse.createArea('wall');
  wall.x = 1200; wall.z = 400; wall.rotation = 90;
  rack.rotation = 0;
  assert.equal(warehouse.footprintsOverlap(rack, wall), true);
  const aisle = warehouse.createArea('aisle');
  assert.equal(warehouse.findCollisions({ objects: [rack, aisle] })[0].kind, 'blocked-aisle');
  const gate = warehouse.createArea('gate');
  assert.deepEqual(warehouse.findCollisions({ objects: [wall, gate] }), []);
  assert.deepEqual(warehouse.findCollisions({ objects: [rack, warehouse.createArea('goods-in')] }), []);
});

test('duplicating a rack retains measurements but creates independent empty-coded positions', () => {
  const original = warehouse.createRack('pallet-rack', { bayCount: 2, levelCount: 2 });
  original.bays[0].width = 3200;
  original.uprights[1].height = 6800;
  original.bays[0].levels[0].positions[0].code = 'R01-01-01-01';
  const copy = warehouse.duplicateObject(original, { name: 'Kopie von Palettenregal' });
  const secondCopy = warehouse.duplicateObject(original, { objects: [original, copy] });
  const rotated = warehouse.rotateObject(copy, 90);
  const layout = warehouse.normalizeLayout({ version: 1, objects: [original, rotated] });
  const originalIds = new Set([
    original.id,
    ...original.uprights.map((part) => part.id),
    ...original.bays.flatMap((bay) => [bay.id, ...bay.levels.flatMap((level) =>
      [level.id, ...level.positions.map((position) => position.id)])])
  ]);
  const copyIds = [rotated.id,
    ...rotated.uprights.map((part) => part.id),
    ...rotated.bays.flatMap((bay) => [bay.id, ...bay.levels.flatMap((level) =>
      [level.id, ...level.positions.map((position) => position.id)])])];
  assert.equal(copyIds.some((partId) => originalIds.has(partId)), false);
  assert.equal(new Set(copyIds).size, copyIds.length);
  assert.equal(layout.objects[1].bays[0].width, 3200);
  assert.equal(layout.objects[1].uprights[1].height, 6800);
  assert.equal(layout.objects[1].rotation, 90);
  assert.equal(layout.objects[1].x, 6700);
  assert.equal(secondCopy.x, 13400);
  assert.equal(layout.objects[0].bays[0].levels[0].positions[0].code, 'R01-01-01-01');
  assert.equal(warehouse.listSlots(layout).filter((slot) => slot.code).length, 1);
  assert.equal(warehouse.rotateObject({ rotation: 360 }, 90).rotation, 90);
});

test('article-master locations match exactly while unmatched codes remain visible', () => {
  const rack = warehouse.createRack('shelf-rack', { bayCount: 1, levelCount: 1 });
  const slot = rack.bays[0].levels[0].positions[0];
  slot.code = 'A-001';
  const layout = warehouse.normalizeLayout({ version: 1, objects: [rack] });
  const result = warehouse.matchArticles(layout, [
    { article_id: 'SKU-1', article_name: 'Widget', master_data: { location: ' A-001 ' } },
    { article_id: 'SKU-2', master_data: { location: 'A-01' } },
    { article_id: 'SKU-3', master_data: {} }
  ]);
  assert.equal(result.withLocation, 2);
  assert.equal(result.matched, 1);
  assert.equal(result.bySlot.get(slot.id)[0].articleId, 'SKU-1');
  assert.deepEqual(result.unmatched.map((item) => item.code), ['A-01']);
});

test('imported article-master CSV links modeled location and reports unmatched location', () => {
  const source = { id: 'warehouse-master', name: 'warehouse-master.csv', label: 'warehouse-master.csv', sourceType: 'article-master' };
  const content = fs.readFileSync(path.join(__dirname, 'fixtures', 'warehouse-master.csv'), 'utf8');
  const imported = csv.importCsv(content, { article_id: 0, article_name: 1, location: 2 }, { sourceFile: source });
  const combined = csv.combineImportResults([{ ...source, result: imported }]);
  const rack = warehouse.createRack('pallet-rack', { bayCount: 1, levelCount: 1 });
  rack.bays[0].levels[0].positions[0].code = 'R01-03-02-01';
  const layout = warehouse.normalizeLayout({ version: 1, objects: [rack] });
  const matches = warehouse.matchArticles(layout, combined.articleRegistry);
  assert.equal(matches.matched, 1);
  assert.deepEqual(matches.bySlot.get(rack.bays[0].levels[0].positions[0].id).map((item) => item.articleId), ['SKU-300']);
  assert.deepEqual(matches.unmatched.map((item) => item.code), ['OUTSIDE-01']);
});

test('layout survives metadata-only save and workspace backup without rewriting sources', async () => {
  const indexedDB = createFakeIndexedDB();
  const repository = storage.createRepository({ indexedDB, databaseName: 'warehouse-layout-test' });
  const record = workspace.createWorkspace('Warehouse', { id: 'workspace-warehouse', now: '2026-09-27T10:00:00.000Z' });
  const created = await repository.createWorkspace(record);
  const rack = warehouse.resizeBayLevels(warehouse.createRack('pallet-rack', { bayCount: 2, levelCount: 1 }), 1, 2);
  rack.locked = true;
  rack.bays[1].levels[1].positions[0].code = 'P-02-02';
  const layout = warehouse.normalizeLayout({ version: 1, objects: [rack] });
  await repository.updateWorkspaceSummary(record.id, { warehouseLayout: layout }, { expectedRevision: created.storageRevision });
  const loaded = await repository.loadWorkspace(record.id);
  assert.deepEqual(loaded.warehouseLayout.objects[0].bays.map((bay) => bay.levels.length), [1, 2]);
  assert.equal(loaded.warehouseLayout.objects[0].bays[1].levels[1].positions[0].code, 'P-02-02');
  assert.equal(loaded.warehouseLayout.objects[0].locked, true);
  assert.equal(indexedDB.inspect('warehouse-layout-test', 'workspaceSources').length, 0);
  const backup = workspace.stringifyBackup(loaded, { now: '2026-09-27T10:01:00.000Z' });
  const restored = workspace.parseBackup(backup);
  assert.deepEqual(restored.warehouseLayout, layout);
  repository.close();
});
