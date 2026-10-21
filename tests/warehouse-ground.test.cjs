'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../warehouse.js');
const scene = require('../warehouse-scene.js');
const renderer = require('../warehouse-webgl.js');
const workspace = require('../workspace.js');
const storage = require('../storage.js');
const { createFakeIndexedDB } = require('./fake-indexeddb.cjs');

function fresh() {
  return model.normalizeLayout({ ...model.createLayout(), objects: [model.createRack('pallet-rack', { bayCount: 2, levelCount: 2 })] });
}
function groundZone(layout, bay = 0) {
  return model.zoneForLevel(layout, layout.objects[0].bays[bay].ground.id);
}
function configured() {
  let layout = fresh();
  layout = model.setZoneUsage(layout, groundZone(layout).id, 'picking');
  return model.resizeZoneLocations(layout, groundZone(layout).id, 3);
}

test('ground scopes are enabled by default at height zero without implicit locations or beams', () => {
  const layout = fresh(), rack = layout.objects[0];
  assert.ok(rack.bays.every(bay => bay.ground.enabled));
  assert.equal(model.listScopes(layout).filter(scope => scope.ground).length, 2);
  assert.equal(layout.locations.length, 0);
  assert.equal(model.locationScope(layout, groundZone(layout).id).y, 0);
  assert.equal(model.locationScope(layout, groundZone(layout).id).levelIndex, -1);
  assert.ok(model.physicalParts(rack).every(part => part.partId !== rack.bays[0].ground.id));
  assert.deepEqual(model.normalizeLayout(layout), layout);
});

test('ground locations support ten side-by-side slots with independently editable widths and positions', () => {
  let layout = configured(), zone = groundZone(layout).id;
  const key = layout.locations[0].id;
  layout = model.setLocationCode(layout, key, 'FLOOR-01');
  layout = model.setLocationPlacement(layout, key, { x:100, z:0, width:700, depth:1100 });
  assert.deepEqual(layout.locations[0].placement, { x:100, z:0, width:700, depth:1100 });
  assert.equal(layout.locations[0].code, 'FLOOR-01');
  const ten = model.resizeZoneLocations(layout, zone, 10);
  assert.equal(ten.locations.length, 10);
  assert.throws(() => model.addLocation(ten, zone), /10 locations/);
  assert.throws(() => model.setLocationPlacement(layout, key, { x:500, z:0, width:700, depth:1100 }), /overlap/);
});

test('disabling clears only this bay ground scope, keeps its physical ID and respects locks', () => {
  let layout = configured();
  const elevated = layout.zones[0].id;
  layout = model.setZoneUsage(layout, elevated, 'reserve');
  layout = model.resizeZoneLocations(layout, elevated, 1);
  const before = structuredClone(layout), groundId = layout.objects[0].bays[0].ground.id;
  const disabled = model.setGroundEnabled(layout, layout.objects[0].id, 0, false);
  assert.equal(model.zoneForLevel(disabled, groundId), null);
  assert.deepEqual(disabled.locations, layout.locations.filter(item => item.zoneId === elevated));
  assert.equal(model.layoutImpact(layout, disabled, []).removed, 3);
  const enabled = model.setGroundEnabled(disabled, disabled.objects[0].id, 0, true);
  assert.equal(enabled.objects[0].bays[0].ground.id, groundId);
  assert.equal(model.zoneLocations(enabled, groundZone(enabled).id).length, 0);
  assert.deepEqual(layout, before);
  layout.objects[0].locked = true;
  assert.throws(() => model.setGroundEnabled(layout, layout.objects[0].id, 0, false), /Unlock/);
});

test('passages remove ground locations and cannot be re-enabled for floor storage', () => {
  const layout = configured(), rack = layout.objects[0];
  const passage = model.configurePassage(layout, rack.id, 0, 1700, null);
  assert.equal(passage.objects[0].bays[0].ground.enabled, false);
  assert.equal(passage.locations.length, 0);
  assert.equal(passage.objects[0].bays[1].ground.enabled, true);
  assert.throws(() => model.setGroundEnabled(passage, rack.id, 0, true), /passage/);
  const conflict = structuredClone(passage); conflict.objects[0].bays[0].ground.enabled = true;
  assert.throws(() => model.normalizeLayout(conflict), /Disable ground/);
});

test('layout 5 and workspace 19 migration add empty ground scopes without moving elevated locations', () => {
  let layout = fresh();
  layout = model.setZoneUsage(layout, layout.zones[0].id, 'picking');
  layout = model.resizeZoneLocations(layout, layout.zones[0].id, 3);
  const legacy = structuredClone(layout), oldSlots = structuredClone(layout.locations);
  const grounds = new Set(legacy.objects[0].bays.map(bay => bay.ground.id));
  legacy.version = 5;
  legacy.zones = legacy.zones.filter(zone => !grounds.has(zone.levelId));
  legacy.objects[0].bays.forEach(bay => delete bay.ground);
  legacy.objects[0].bays[1].passage = { routeId:null };
  const record = workspace.createWorkspace('Synthetic ground migration');
  record.schemaVersion = 19; record.warehouseLayout = legacy;
  record.coverageNotes = [{ date:'2026-10-03', reason:'Synthetic closure', updatedAt:'2026-10-18T10:00:00.000Z' }];
  const migrated = workspace.migrateWorkspace(record);
  assert.equal(migrated.schemaVersion, workspace.WORKSPACE_SCHEMA_VERSION);
  assert.equal(migrated.warehouseLayout.version, 6);
  assert.deepEqual(migrated.warehouseLayout.locations, oldSlots);
  assert.deepEqual(migrated.coverageNotes, record.coverageNotes);
  assert.equal(migrated.warehouseLayout.objects[0].bays[0].ground.enabled, true);
  assert.equal(migrated.warehouseLayout.objects[0].bays[1].ground.enabled, false);
  assert.deepEqual(migrated.warehouseLayout.objects[0].bays[0].levels, legacy.objects[0].bays[0].levels);
});

test('ground footprints and current article matches share floor elevation in editor and analysis', () => {
  let layout = configured(); layout = model.setLocationCode(layout, layout.locations[0].id, 'FLOOR-01');
  const slot = model.listLocations(layout).find(item => item.code === 'FLOOR-01');
  assert.equal(slot.ground, true);
  const matches = model.matchArticles(layout, [{article_id:'SYNTHETIC-FLOOR',master_data:{location:'FLOOR-01'}}]);
  const box = scene.buildBoxes(model, layout, matches).find(item => item.partId === slot.slotId);
  assert.equal(box.y, 2); assert.equal(box.slotRef.levelIndex, -1);
  assert.equal(box.width, 900); assert.equal(box.depth, 1100); assert.equal(box.color, '#45d3b1');
  assert.equal(model.listLocations(layout).filter(item => item.levelIndex === -1).length, 3);
});

test('ground settings and coordinates survive storage and backup while duplicate structures have new floor IDs', async () => {
  let layout = configured(); layout = model.setGroundEnabled(layout, layout.objects[0].id, 1, false);
  const record = workspace.createWorkspace('Synthetic ground backup'); record.warehouseLayout = layout;
  const repo = storage.createRepository({ indexedDB:createFakeIndexedDB(), databaseName:'ground-test' });
  await repo.createWorkspace(record);
  const loaded = await repo.loadWorkspace(record.id);
  const restored = workspace.parseBackup(workspace.stringifyBackup(loaded));
  assert.deepEqual(restored.warehouseLayout, layout);
  const copy = model.duplicateObject(layout.objects[0]);
  assert.notEqual(copy.bays[0].ground.id, layout.objects[0].bays[0].ground.id);
  assert.equal(copy.bays[1].ground.enabled, false);
  repo.close();
});

test('rack front points out toward the aisle and rotates with the rack without affecting collision geometry', () => {
  const rack = fresh().objects[0];
  for (const angle of [0,90,180,270,37]) {
    rack.rotation = angle; rack.x = 1234; rack.z = -5678;
    const front = model.rackFront(rack), radians = angle * Math.PI / 180;
    assert.ok(Math.abs((front.tip.x-front.center.x) + 600*Math.sin(radians)) < 1e-8);
    assert.ok(Math.abs((front.tip.z-front.center.z) - 600*Math.cos(radians)) < 1e-8);
    const width = model.objectFootprint(rack).width;
    assert.ok(Math.abs(front.right.x-front.left.x-width*Math.cos(radians)) < 1e-8);
  }
  const layout = model.normalizeLayout({...model.createLayout(),objects:[rack]});
  const before = structuredClone(layout), physical = model.physicalParts(rack);
  const boxes = scene.buildBoxes(model,layout,null,{orientationObjectId:rack.id});
  assert.equal(boxes.filter(box => box.kind === 'orientation').length,4);
  const arrows = boxes.filter(box => box.kind === 'orientation');
  const projected = renderer.projectScene(arrows, {yaw:0,pitch:.6,zoom:1}, 800, 600, rack.id, null, new Set([rack.id]), 'solid');
  for (let offset = 0; offset < projected.edges.length; offset += 10) {
    assert.ok(Math.abs(projected.edges[offset+3] - 1) < 1e-6);
    assert.ok(Math.abs(projected.edges[offset+4] - 215/255) < 1e-6);
    assert.ok(Math.abs(projected.edges[offset+5] - 138/255) < 1e-6);
  }
  assert.deepEqual(model.physicalParts(rack),physical);
  assert.deepEqual(layout,before);
});
