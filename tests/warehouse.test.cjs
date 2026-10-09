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
const legacy = require('./fixtures/warehouse-layout-v1.json');

function fresh(bays = 2, levels = 2) {
  return warehouse.normalizeLayout({ ...warehouse.createLayout(),
    objects: [warehouse.createRack('shelf-rack', { bayCount: bays, levelCount: levels })] });
}
function configure(layout, index, usage, count, prefix = '') {
  let next = warehouse.setZoneUsage(layout, layout.zones[index].id, usage);
  next = warehouse.resizeZoneLocations(next, layout.zones[index].id, count);
  if (prefix) warehouse.zoneLocations(next, layout.zones[index].id).forEach((location, i) => {
    location.code = prefix + (i + 1);
  });
  return warehouse.normalizeLayout(next);
}

test('fresh geometry has stable physical scopes and zero locations or codes', () => {
  let layout = fresh();
  assert.equal(layout.version, 2);
  assert.equal(layout.zones.length, 4);
  assert.deepEqual(layout.locations, []);
  assert.ok(layout.zones.every((zone) => zone.usage === 'unassigned'));
  assert.ok(layout.objects[0].bays.every((bay) => bay.levels.every((level) => !('positions' in level))));
  const ids = layout.zones.map((zone) => zone.id);
  assert.deepEqual(warehouse.normalizeLayout(layout).zones.map((zone) => zone.id), ids);
  assert.throws(() => warehouse.resizeZoneLocations(layout, ids[0], 2), /Classify/);
  layout = warehouse.setZoneUsage(layout, ids[0], 'picking');
  assert.equal(layout.locations.length, 0, 'classification alone never creates locations');
});

test('mixed uses and independent subdivision allow partial completion', () => {
  let layout = configure(fresh(), 0, 'picking', 3, 'P-');
  layout = configure(layout, 1, 'reserve', 1, 'R-');
  assert.deepEqual(warehouse.listScopes(layout).map((scope) => [scope.usage, scope.locationCount]),
    [['picking', 3], ['reserve', 1], ['unassigned', 0], ['unassigned', 0]]);
  const first = structuredClone(warehouse.zoneLocations(layout, layout.zones[0].id));
  const expanded = warehouse.resizeZoneLocations(layout, layout.zones[1].id, 4);
  assert.deepEqual(warehouse.zoneLocations(expanded, layout.zones[0].id), first);
  assert.equal(warehouse.zoneLocations(expanded, layout.zones[1].id)[0].id, layout.locations[3].id);
  assert.equal(warehouse.zoneLocations(expanded, layout.zones[1].id)[0].code, 'R-1');
  assert.throws(() => warehouse.resizeZoneLocations(layout, layout.zones[0].id, 5), /0–4/);
  assert.throws(() => warehouse.resizeZoneLocations(layout, layout.zones[0].id, 1.5), /0–4/);
  assert.equal(warehouse.resizeZoneLocations(layout, layout.zones[0].id, 0).locations.length, 1);
  assert.equal(warehouse.setZoneUsage(layout, layout.zones[2].id, 'future-use').zones[2].usage, 'future-use');
});

test('geometry growth preserves existing IDs, assignments and codes; new scopes remain empty', () => {
  let layout = configure(fresh(), 0, 'picking', 2, 'P-');
  layout.objects[0].bays[1].width = 1300;
  layout.objects[0] = warehouse.resizeBayLevels(layout.objects[0], 1, 3);
  layout = warehouse.reconcileLayout(layout);
  const original = structuredClone(layout);
  layout.objects[0] = warehouse.resizeRack(layout.objects[0], 3, null);
  const grown = warehouse.reconcileLayout(layout);
  assert.deepEqual(grown.objects[0].bays.map((bay) => bay.levels.length), [2, 3, 2]);
  assert.deepEqual(grown.locations, original.locations);
  assert.deepEqual(grown.zones.slice(0, original.zones.length), original.zones);
  assert.equal(grown.objects[0].bays[1].width, 1300);
  assert.ok(grown.zones.slice(original.zones.length).every((zone) => zone.usage === 'unassigned'));
  assert.throws(() => warehouse.resizeBayLevels(grown.objects[0], 1, 13), /1–12/);
});

test('validation rejects duplicate codes, duplicate or orphaned references, and invalid geometry', () => {
  const layout = configure(fresh(), 0, 'picking', 2, 'A-');
  function invalid(change, pattern) {
    const candidate = structuredClone(layout); change(candidate);
    assert.throws(() => warehouse.normalizeLayout(candidate), pattern);
  }
  invalid((next) => { next.locations[1].code = ' A-1 '; }, /unique/);
  invalid((next) => { next.locations[1].id = next.locations[0].id; }, /IDs must be unique/);
  invalid((next) => { next.locations[1].positionIndex = 0; }, /unique within/);
  invalid((next) => { next.locations.splice(0, 1); }, /consecutive/);
  invalid((next) => { next.locations[0].zoneId = 'missing'; }, /unknown functional/);
  invalid((next) => { next.zones[0].bayId = 'missing'; }, /unknown physical/);
  invalid((next) => { next.zones.push({ ...next.zones[0], id: 'other-zone' }); }, /one functional/);
  invalid((next) => { next.zones[0].usage = 'Invalid type'; }, /usage is invalid/);
  invalid((next) => { next.objects[0].uprights[1].height = 300; }, /exceed/);
  invalid((next) => { next.objects[0].bays[0].levels[0].positions = []; }, /migration/);
  invalid((next) => { next.locations[0].code = 'x'.repeat(81); }, /too long/);
  const orphan = structuredClone(layout); orphan.locations[0].zoneId = 'missing';
  assert.throws(() => warehouse.reconcileLayout(orphan), /unknown functional/);
  assert.throws(() => warehouse.normalizeLayout({ ...layout, version: 99 }), /format/);
  assert.equal(warehouse.normalizeLayout({ ...warehouse.createLayout(),
    objects: warehouse.AREA_TYPES.map((type) => warehouse.createArea(type)) }).zones.length, 0);
});

test('physical geometry is independent of the workspace-wide location limit', () => {
  const objects = Array.from({ length: 11 }, () => warehouse.createRack('shelf-rack', { bayCount: 30, levelCount: 4 }));
  const layout = warehouse.normalizeLayout({ ...warehouse.createLayout(), objects });
  assert.equal(layout.zones.length, 1320);
  assert.equal(layout.locations.length, 0);
  layout.zones.forEach((zone) => {
    zone.usage = 'picking';
    for (let index = 0; index < 4; index++) layout.locations.push({ id: zone.id + '-' + index, zoneId: zone.id, positionIndex: index, code: '' });
  });
  assert.throws(() => warehouse.normalizeLayout(layout), /5000 locations/);
});

test('legacy migration preserves physical IDs, location IDs, codes and exact article matches without guessing usage', () => {
  const before = JSON.stringify(legacy);
  const layout = warehouse.migrateLayout(legacy);
  assert.equal(JSON.stringify(legacy), before, 'input is not mutated');
  assert.deepEqual(layout.locations.map((location) => [location.id, location.code, location.legacy]),
    [['legacy-location-a', 'R01-03-02-01', true], ['legacy-location-b', 'A-002', true], ['legacy-location-c', '', true]]);
  assert.ok(layout.zones.every((zone) => zone.usage === 'unassigned'));
  assert.equal(layout.objects[0].bays[0].levels[0].id, 'legacy-lower');
  assert.deepEqual(warehouse.migrateLayout(layout), layout, 'migration is idempotent');
  const edited = warehouse.setLocationCode(layout, 'legacy-location-c', 'C-003');
  assert.equal(edited.locations[2].id, 'legacy-location-c');
  assert.equal(edited.locations[2].code, 'C-003');
  assert.throws(() => warehouse.resizeZoneLocations(layout, layout.zones[0].id, 3), /Classify/);
  const broken = structuredClone(legacy); broken.objects[0].bays[0].levels[0].positions[0] = null;
  assert.throws(() => warehouse.migrateLayout(broken), /position is invalid/);
  const source = { id: 'warehouse-master', name: 'warehouse-master.csv', label: 'warehouse-master.csv', sourceType: 'article-master' };
  const content = fs.readFileSync(path.join(__dirname, 'fixtures', 'warehouse-master.csv'), 'utf8');
  const result = csv.importCsv(content, { article_id: 0, article_name: 1, location: 2 }, { sourceFile: source });
  const registry = csv.combineImportResults([{ ...source, result }]).articleRegistry;
  const matches = warehouse.matchArticles(layout, registry);
  assert.equal(matches.matched, 1);
  assert.deepEqual(matches.byLocation.get('legacy-location-a').map((item) => item.articleId), ['SKU-300']);
  assert.deepEqual(matches.unmatched.map((item) => item.code), ['OUTSIDE-01']);
});

test('impact identifies affected locations, codes and articles while preserving untouched scopes', () => {
  const layout = configure(configure(fresh(), 0, 'picking', 2, 'P-'), 2, 'reserve', 1, 'R-');
  const registry = [{ article_id: 'SKU-1', master_data: { location: 'P-1' } },
    { article_id: 'SKU-2', master_data: { location: ' P-1 ' } }];
  const changed = structuredClone(layout);
  changed.objects[0].bays[0].levels[0].clearHeight += 100;
  assert.deepEqual(warehouse.layoutImpact(layout, changed, registry),
    { locations: 2, codes: 2, articles: 2, removed: 0, removedObjects: 0 });
  changed.objects[0].name = 'Renamed';
  assert.deepEqual(changed.locations, layout.locations);
  const renamed = structuredClone(layout); renamed.objects[0].name = 'Only name';
  assert.equal(warehouse.layoutImpact(layout, renamed, registry).locations, 0);
  const uncoded = configure(fresh(1, 1), 0, 'picking', 1);
  const firstCode = warehouse.setLocationCode(uncoded, uncoded.locations[0].id, 'NEW-001');
  assert.equal(warehouse.layoutImpact(uncoded, firstCode, registry).locations, 0,
    'initial code entry does not warn about replacing existing codes');
  const replacement = warehouse.setLocationCode(firstCode, firstCode.locations[0].id, 'NEW-002');
  assert.equal(warehouse.layoutImpact(firstCode, replacement, registry).codes, 1);
  const resized = warehouse.resizeZoneLocations(layout, layout.zones[0].id, 1);
  assert.equal(warehouse.layoutImpact(layout, resized, registry).removed, 1);
  assert.equal(resized.locations.find((location) => location.code === 'R-1').id,
    layout.locations.find((location) => location.code === 'R-1').id);
  const removed = structuredClone(layout);
  removed.objects[0] = warehouse.resizeRack(removed.objects[0], 1, null);
  assert.throws(() => warehouse.normalizeLayout(removed), /unknown physical/);
  const candidate = warehouse.reconcileLayout(removed);
  assert.equal(warehouse.layoutImpact(layout, candidate, registry).removed, 1);
  assert.deepEqual(candidate.locations, layout.locations.slice(0, 2));
  const unassigned = warehouse.setZoneUsage(layout, layout.zones[0].id, 'unassigned');
  assert.deepEqual(unassigned.locations, layout.locations);
  assert.equal(warehouse.layoutImpact(layout, unassigned, registry).locations, 2);
  assert.throws(() => warehouse.setLocationCode(unassigned, unassigned.locations[0].id, 'X'), /Classify/);
});

test('locks cover geometry, functional zones and locations; toggling cannot change other data', () => {
  const layout = configure(fresh(), 0, 'picking', 2, 'P-');
  const locked = structuredClone(layout); locked.objects[0].locked = true;
  const rackId = layout.objects[0].id;
  assert.equal(warehouse.lockedEditConflict(layout, locked, rackId), null);
  assert.equal(warehouse.lockedEditConflict(layout, locked), rackId);
  for (const change of [
    (next) => { next.objects[0].x += 100; },
    (next) => { next.zones[0].usage = 'reserve'; },
    (next) => { next.locations[0].code = 'Changed'; },
    (next) => { next.objects = []; next.zones = []; next.locations = []; }
  ]) {
    const next = structuredClone(locked); change(next);
    assert.equal(warehouse.lockedEditConflict(locked, next), rackId);
  }
  assert.throws(() => warehouse.setZoneUsage(locked, locked.zones[0].id, 'reserve'), /Unlock/);
  assert.throws(() => warehouse.resizeZoneLocations(locked, locked.zones[0].id, 3), /Unlock/);
  assert.throws(() => warehouse.setLocationCode(locked, locked.locations[0].id, 'X'), /Unlock/);
  const unlocked = structuredClone(locked); unlocked.objects[0].locked = false;
  assert.equal(warehouse.lockedEditConflict(locked, unlocked, rackId), null);
  unlocked.locations[0].code = 'Changed';
  assert.equal(warehouse.lockedEditConflict(locked, unlocked, rackId), rackId);
});

test('duplicates copy geometry into independent unassigned empty scopes and retain original codes', () => {
  const layout = configure(fresh(), 0, 'picking', 2, 'P-');
  const original = layout.objects[0];
  const copy = warehouse.duplicateObject({ ...original, locked: true }, { objects: layout.objects });
  const next = warehouse.normalizeLayout({ ...layout, objects: [...layout.objects, copy] });
  assert.equal(copy.locked, false);
  assert.notEqual(copy.id, original.id);
  assert.equal(copy.bays[0].width, original.bays[0].width);
  assert.ok(copy.bays.every((bay) => !original.bays.some((old) => old.id === bay.id)));
  assert.ok(next.zones.filter((zone) => zone.objectId === copy.id).every((zone) => zone.usage === 'unassigned'));
  assert.deepEqual(next.locations, layout.locations);
  assert.equal(warehouse.listLocations(next).length, 2);
  assert.equal(warehouse.rotateObject({ rotation: 360 }, 90).rotation, 90);
});

test('matching trims edges but preserves case and leading zeros', () => {
  const layout = configure(fresh(1, 1), 0, 'picking', 1, 'A-00');
  const result = warehouse.matchArticles(layout, [
    { article_id: 'SKU-1', master_data: { location: ' A-001 ' } },
    { article_id: 'SKU-2', master_data: { location: 'A-01' } },
    { article_id: 'SKU-3', master_data: { location: 'a-001' } },
    { article_id: 'SKU-4', master_data: {} }
  ]);
  assert.equal(result.withLocation, 3);
  assert.equal(result.matched, 1);
  assert.deepEqual(result.unmatched.map((item) => item.code), ['A-01', 'a-001']);
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


test('metadata-only save and backup retain layout, original bytes and stored analysis chunks', async () => {
  const indexedDB = createFakeIndexedDB();
  const repository = storage.createRepository({ indexedDB, databaseName: 'warehouse-layout-test' });
  const record = workspace.createWorkspace('Warehouse', { id: 'workspace-warehouse', now: '2026-10-09T10:00:00.000Z' });
  const text = `order_id;article_id;quantity;delivery_date
O-1;SKU-1;1;2026-10-09
`;
  const bytes = new TextEncoder().encode(text);
  const source = { id: 'source-1', name: 'synthetic.csv', label: 'synthetic.csv' };
  const imported = csv.importCsv(text, { order_id: 0, article_id: 1, quantity: 2, delivery_date: 3 }, { sourceFile: source });
  record.analyzed = true;
  record.files.push({ ...source, size: bytes.byteLength, lastModified: 1, buffer: bytes.buffer,
    encodingMode: 'auto', activeEncoding: 'utf-8', detectedEncoding: 'utf-8', mapping: imported.mapping,
    confirmedMapping: imported.mapping, result: imported });
  const created = await repository.createWorkspace(record);
  const sourcesBefore = structuredClone(indexedDB.inspect('warehouse-layout-test', 'workspaceSources'));
  const bytesBefore = structuredClone(indexedDB.inspect('warehouse-layout-test', 'workspaceSourceBytes'));
  const rowsBefore = structuredClone(indexedDB.inspect('warehouse-layout-test', 'workspaceRowChunks'));
  assert.equal(rowsBefore.length, 1);
  assert.equal(bytesBefore.length, 1);
  const layout = configure(fresh(), 1, 'reserve', 2, 'R-');
  layout.objects[0].locked = true;
  await repository.updateWorkspaceSummary(record.id, { warehouseLayout: layout }, { expectedRevision: created.storageRevision });
  assert.deepEqual(indexedDB.inspect('warehouse-layout-test', 'workspaceSources'), sourcesBefore);
  assert.deepEqual(indexedDB.inspect('warehouse-layout-test', 'workspaceSourceBytes'), bytesBefore);
  assert.deepEqual(indexedDB.inspect('warehouse-layout-test', 'workspaceRowChunks'), rowsBefore);
  const loaded = await repository.loadWorkspace(record.id);
  assert.deepEqual(loaded.warehouseLayout, layout);
  assert.deepEqual(new Uint8Array(loaded.files[0].buffer), bytes);
  assert.equal(loaded.files[0].result.rows[0].article_id, 'SKU-1');
  const restored = workspace.parseBackup(workspace.stringifyBackup(loaded));
  assert.deepEqual(restored.warehouseLayout, layout);
  assert.deepEqual(new Uint8Array(restored.files[0].buffer), bytes);
  repository.close();
});
