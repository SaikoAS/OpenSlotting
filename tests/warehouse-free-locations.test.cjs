'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../warehouse.js');
const scene = require('../warehouse-scene.js');
const workspace = require('../workspace.js');
const storage = require('../storage.js');
const preparation = require('../src/application/workspace-preparation.js');
const { createFakeIndexedDB } = require('./fake-indexeddb.cjs');

function fresh() {
  let layout = model.normalizeLayout({ ...model.createLayout(), objects: [model.createRack('pallet-rack', { bayCount: 2, levelCount: 2 })] });
  layout = model.setZoneUsage(layout, layout.zones[0].id, 'picking');
  return model.setZoneUsage(layout, layout.zones[1].id, 'reserve');
}
const area = (x = 100, z = 0, width = 600, depth = 1100) => ({ x, z, width, depth });

test('each level supports zero through ten locations and equal partition retains stable identities and codes', () => {
  let layout = fresh(), zone = layout.zones[0].id;
  layout = model.resizeZoneLocations(layout, zone, 3);
  layout = model.setLocationCode(layout, layout.locations[0].id, 'SYN-001');
  const original = structuredClone(layout.locations);
  const expanded = model.resizeZoneLocations(layout, zone, 10);
  assert.equal(expanded.locations.length, 10);
  assert.deepEqual(expanded.locations.slice(0,3).map(item => [item.id,item.code]), original.map(item => [item.id,item.code]));
  assert.deepEqual(expanded.locations.at(-1).placement, { x:2430,z:0,width:270,depth:1100 });
  for (const count of [-1, 11, 2.5, NaN]) assert.throws(() => model.resizeZoneLocations(layout, zone, count));
  assert.equal(model.resizeZoneLocations(expanded, zone, 0).locations.length, 0);
  assert.deepEqual(layout.locations, original);
});

test('front-row locations support unequal widths, exact offsets and independent levels', () => {
  let layout = fresh(), zone = layout.zones[0].id;
  layout = model.addLocation(layout, zone, area());
  layout = model.addLocation(layout, zone, area(900,0,1000,1100));
  layout = model.addLocation(layout, zone, area(2100,0,500,1100));
  layout = model.addLocation(layout, layout.zones[1].id, area());
  assert.equal(layout.locations.length, 4);
  const originalId = layout.locations[0].id;
  layout = model.setLocationCode(layout, originalId, 'EXACT-CODE');
  const before = structuredClone(layout);
  const moved = model.setLocationPlacement(layout, originalId, area(125,0,605,1100));
  assert.equal(moved.locations[0].id, originalId); assert.equal(moved.locations[0].code, 'EXACT-CODE');
  assert.deepEqual(moved.locations[0].placement, area(125,0,605,1100));
  assert.deepEqual(layout, before);
  assert.equal(model.layoutImpact(layout,moved,[]).locations, 1);
});

test('out-of-bounds, invalid and overlapping areas cannot be saved; touching edges are allowed', () => {
  let layout = fresh(), zone = layout.zones[0].id;
  layout = model.addLocation(layout,zone,area(0,0,600,1100));
  const before=structuredClone(layout);
  for(const value of [area(-1,0),area(2600,0),area(0,1000),area(0,0,0,50),area(NaN,0),area(100,100,20,20)]) {
    assert.throws(()=>model.addLocation(layout,zone,value));
  }
  const touching=model.addLocation(layout,zone,area(600,0,600,1100)); assert.equal(touching.locations.length,2);
  assert.throws(()=>model.setLocationPlacement(touching,touching.locations[1].id,area(599,0,600,1100)),/overlap/);
  const narrowed=structuredClone(layout); narrowed.objects[0].bays[0].width=500;
  assert.throws(()=>model.normalizeLayout(narrowed),/bounds/);
  const excessive=structuredClone(layout); excessive.locations=Array(5001).fill(layout.locations[0]);
  assert.throws(()=>model.normalizeLayout(excessive),/5000 locations/);
  assert.deepEqual(layout,before);
});

test('limits, locks and classification are enforced for all location operations', () => {
  let layout = fresh(), zone = layout.zones[0].id;
  for (let index=0; index<10; index++) layout = model.addLocation(layout,zone,area(index*100,0,100,1100));
  const first = layout.locations[0].id;
  assert.throws(() => model.addLocation(layout,zone,area(2000,0,100,1100)), /10 locations/);
  assert.throws(() => model.duplicateLocation(layout,first), /10 locations/);
  layout.objects[0].locked = true;
  for (const operation of [() => model.setLocationPlacement(layout,first,area()), () => model.removeLocation(layout,first),
    () => model.duplicateLocation(layout,first), () => model.resizeZoneLocations(layout,zone,2)]) assert.throws(operation,/Unlock/);
  const unassigned = model.normalizeLayout({ ...model.createLayout(), objects:[model.createRack('shelf-rack')] });
  assert.throws(() => model.addLocation(unassigned,unassigned.zones[0].id,area(0,0,50,50)),/Classify/);
});

test('duplication finds free space with a new ID and empty code; removal preserves other coordinates', () => {
  let layout = fresh(), zone = layout.zones[0].id;
  layout = model.addLocation(layout,zone,area(0,0,600,1100));
  layout = model.setLocationCode(layout,layout.locations[0].id,'FIRST');
  const copied = model.duplicateLocation(layout,layout.locations[0].id);
  assert.equal(copied.locations.length,2); assert.equal(copied.locations[1].code,'');
  assert.notEqual(copied.locations[1].id,copied.locations[0].id);
  const remaining = structuredClone(copied.locations[1]);
  const removed = model.removeLocation(copied,copied.locations[0].id);
  assert.equal(removed.locations[0].positionIndex,0);
  assert.equal(removed.locations[0].id,remaining.id);
  assert.deepEqual(removed.locations[0].placement,remaining.placement);
});

test('layout-4 migration makes the implied equal subdivisions explicit and retains geometry, IDs and codes', () => {
  let legacy=fresh(); legacy=model.resizeZoneLocations(legacy,legacy.zones[0].id,3);
  legacy=model.setLocationCode(legacy,legacy.locations[0].id,'KEEP-THIS');
  legacy.version=4; legacy.locations.forEach(item=>delete item.placement);
  const before=structuredClone(legacy), migrated=model.migrateLayout(legacy);
  assert.equal(migrated.version,model.LAYOUT_VERSION); assert.deepEqual(migrated.objects,legacy.objects);
  assert.deepEqual(migrated.locations.map(item=>[item.id,item.code]),legacy.locations.map(item=>[item.id,item.code]));
  assert.deepEqual(migrated.locations.map(item=>item.placement),[area(0,0,900,1100),area(900,0,900,1100),area(1800,0,900,1100)]);
  assert.deepEqual(legacy,before);
  const record=workspace.createWorkspace('Legacy storage'); record.schemaVersion=18; record.warehouseLayout=legacy;
  record.coverageNotes=[{date:'2026-10-03',reason:'Keep note',updatedAt:'2026-10-18T10:00:00.000Z'}];
  const upgraded=workspace.migrateWorkspace(record);
  assert.equal(upgraded.schemaVersion,workspace.WORKSPACE_SCHEMA_VERSION); assert.deepEqual(upgraded.warehouseLayout,migrated);
  assert.deepEqual(upgraded.coverageNotes,record.coverageNotes);
});

test('technical and read-only scenes visualize the same local areas and preserve identity when a rack moves', () => {
  let layout = fresh(); layout = model.addLocation(layout,layout.zones[0].id,area(125,0,605,1100));
  layout = model.setLocationCode(layout,layout.locations[0].id,'SYN-SPACE');
  const slot = layout.locations[0];
  const box = scene.buildBoxes(model,layout).find(item=>item.partId===slot.id);
  assert.equal(box.x,model.locationScope(layout,slot.zoneId).x+125);
  assert.deepEqual([box.z,box.width,box.depth],[0,605,1100]);
  const matches = model.matchArticles(layout,[{article_id:'SYN-A',master_data:{location:'SYN-SPACE'}}]);
  const analysisBox = scene.buildBoxes(model,layout,matches).find(item=>item.partId===slot.id);
  assert.deepEqual({...box,color:null},{...analysisBox,color:null}); assert.notEqual(box.color,analysisBox.color);
  const moved=structuredClone(layout); moved.objects[0].x=10000; moved.objects[0].z=3000; moved.objects[0].rotation=90;
  const movedBox=scene.buildBoxes(model,model.normalizeLayout(moved)).find(item=>item.partId===slot.id);
  assert.deepEqual([movedBox.x,movedBox.z,movedBox.width,movedBox.depth],[box.x,box.z,box.width,box.depth]);
  assert.deepEqual(model.normalizeLayout(moved).locations,layout.locations);
});

test('storage, activation and backup preserve free placements together with coverage reasons from schema 18', async () => {
  let layout=fresh(); layout=model.addLocation(layout,layout.zones[0].id,area(137,0,623,1100));
  const record=workspace.createWorkspace('Synthetic free placements'); record.warehouseLayout=layout;
  record.coverageNotes=[{date:'2026-10-03',reason:'Synthetic closure',updatedAt:'2026-10-18T10:00:00.000Z'}];
  const repo=storage.createRepository({indexedDB:createFakeIndexedDB(),databaseName:'free-placement-test'});
  await repo.createWorkspace(record);
  const loaded=await repo.loadWorkspace(record.id), prepared=preparation.prepareWorkspaceRecord(loaded,'de',()=>{});
  assert.deepEqual(prepared.workspace.warehouseLayout.locations,layout.locations);
  const restored=workspace.parseBackup(workspace.stringifyBackup(loaded));
  assert.deepEqual(restored.warehouseLayout.locations,layout.locations);
  assert.deepEqual(restored.coverageNotes,record.coverageNotes); repo.close();
});

test('automatic adding and duplication never fall back to a second depth row', () => {
  let layout = fresh(), zone = layout.zones[0].id;
  layout = model.addLocation(layout, zone);
  layout = model.addLocation(layout, zone);
  layout = model.addLocation(layout, zone);
  assert.deepEqual(layout.locations.map(item => item.placement.x), [0, 800, 1600]);
  assert.ok(layout.locations.every(item => item.placement.z === 0 && item.placement.depth === 1100));
  assert.throws(() => model.addLocation(layout, zone), /No free location area/);
  assert.throws(() => model.duplicateLocation(layout, layout.locations[0].id), /No free location area/);
  const empty = fresh();
  assert.throws(() => model.addLocation(empty, empty.zones[0].id, area(0, 100, 100, 500)), /one row/);
});

test('earlier prototype depth rows load unchanged until explicitly divided side by side', () => {
  let layout = fresh(), zone = layout.zones[0].id;
  layout = model.resizeZoneLocations(layout, zone, 2);
  layout.locations[0].code = 'KEEP-A'; layout.locations[1].code = 'KEEP-B';
  layout.locations[0].placement = area(100, 0, 600, 400);
  layout.locations[1].placement = area(100, 600, 600, 400);
  const before = structuredClone(layout), readable = model.normalizeLayout(layout);
  assert.deepEqual(readable, before);
  const aligned = model.resizeZoneLocations(readable, zone, 2);
  assert.deepEqual(aligned.locations.map(item => [item.id,item.code]), before.locations.map(item => [item.id,item.code]));
  assert.deepEqual(aligned.locations.map(item => item.placement), [area(0,0,1350,1100),area(1350,0,1350,1100)]);
});

test('front-row locations inherit changed rack depth without changing widths, IDs or codes', () => {
  let layout = fresh();
  layout = model.addLocation(layout, layout.zones[0].id, area());
  layout = model.setLocationCode(layout, layout.locations[0].id, 'KEEP-DEPTH');
  const original = structuredClone(layout.locations[0]);
  for (const depth of [1500, 800]) {
    const next = structuredClone(layout);
    next.objects[0] = model.setRackDepth(next.objects[0], depth);
    const updated = model.reconcileLayout(next, layout);
    assert.deepEqual(updated.locations[0], { ...original, placement: { ...original.placement, depth } });
  }
  assert.deepEqual(layout.locations[0], original);
});
