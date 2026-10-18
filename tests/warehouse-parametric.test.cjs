'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../warehouse.js');
const scene = require('../warehouse-scene.js');
const workspace = require('../workspace.js');
const layoutOf = (...objects) => model.normalizeLayout({ ...model.createLayout(), objects });
const warnings = layout => model.findCollisions(layout).filter(item => item.severity !== 'info');

test('common rack depth preserves scopes and extends at either end with consistent depth', () => {
  const rack = model.createRack('pallet-rack', { bayCount: 2, levelCount: 2 });
  rack.bays[1].depth = 800;
  assert.equal(model.rackDepth(rack), null);
  const mixed = layoutOf(rack);
  assert.equal(mixed.objects[0].bays[1].depth, 800);
  const uniform = model.setRackDepth(mixed.objects[0], 900);
  assert.equal(model.rackDepth(uniform), 900);
  assert.deepEqual(uniform.bays.map(bay => bay.id), rack.bays.map(bay => bay.id));
  for (const end of ['start', 'end']) {
    const grown = model.reconcileLayout(model.extendRack(layoutOf(uniform), rack.id, end));
    assert.equal(model.rackDepth(grown.objects[0]), 900);
    assert.equal(grown.objects[0].bays.length, 3);
    assert.equal(grown.locations.length, 0);
  }
  assert.throws(() => model.setRackDepth({ ...uniform, locked: true }, 1100), /Unlock/);
});

test('junction recipes retain stable ports, disjoint arm geometry and reject incompatible/occupied ports', () => {
  for (const family of ['aisle', 'wall']) for (const shape of ['corner', 'tee', 'cross']) {
    const junction = model.createRecipe(family + '-' + shape);
    const normalized = layoutOf(junction).objects[0];
    const ports = model.connectionAnchors(normalized);
    assert.equal(ports.length, model.JUNCTION_DIRECTIONS[shape].length);
    assert.equal(model.physicalParts(normalized).length, ports.length + 1);
    assert.deepEqual(ports.map(port => port.direction), model.JUNCTION_DIRECTIONS[shape]);
    const edited = structuredClone(normalized);
    edited.junction.arms.west += 700;
    assert.equal(model.connectionAnchors(edited)[0].x, ports[0].x - 700);
  }
  const a = model.createRecipe('aisle-corner'), b = model.createRecipe('aisle-tee', { x: 20000 });
  const linked = model.connectObjects(layoutOf(a, b), a.id, b.id, 0, 1, 'ports');
  assert.equal(linked.connections.length, 1);
  const pa = model.connectionAnchors(linked.objects[0])[0], pb = model.connectionAnchors(linked.objects[1])[1];
  assert.ok(Math.hypot(pa.x - pb.x, pa.z - pb.z) <= 2);
  assert.ok(pa.outwardX * pb.outwardX + pa.outwardZ * pb.outwardZ < -.985);
  const third = model.createArea('aisle', { x: pa.x, z: pa.z - 1500 });
  const snap = model.findConnectionSnap(third, [linked.objects[0]], 10, null, linked.connections);
  assert.equal(snap, null);
  assert.equal(model.canConnect(a, model.createArea('wall')), false);
  assert.equal(model.canConnect(a, { ...b, depth: b.depth + 100 }), false);
});

test('distance connection compiles ordinary pieces without moving endpoints and preserves backup state', () => {
  const a = model.createArea('aisle'), b = model.createArea('aisle', { x: 12000 });
  const layout = layoutOf(a, b), before = structuredClone(layout);
  const linked = model.createDistanceConnection(layout, a.id, b.id, 1, 0, { variant: 'straight', requiredWidth: 2000, requiredHeight: 2500 });
  assert.deepEqual(layout, before);
  assert.deepEqual(linked.objects.slice(0, 2), before.objects);
  assert.equal(linked.objects.length, 3);
  assert.equal(linked.connections.length, 2);
  const bridge = linked.objects[2];
  assert.equal(bridge.width, 6000);
  assert.equal(bridge.route.requiredHeight, 2500);
  assert.equal(bridge.route.path, null);
  assert.deepEqual(warnings(linked), []);
  const record = workspace.createWorkspace('Synthetic connected layout'); record.warehouseLayout = linked;
  assert.deepEqual(workspace.parseBackup(workspace.stringifyBackup(record)).warehouseLayout, linked);
  assert.throws(() => model.createDistanceConnection(linked, a.id, b.id, 1, 0), error => error.code === 'bridgeSeparate');
});

test('distance bridge rejects a ground obstacle and keeps unknown overhead height explicitly unverified', () => {
  const a = model.createArea('aisle'), b = model.createArea('aisle', { x: 14000 });
  const wall = model.createArea('wall', { x: 10000, z: -1000, rotation: 90 });
  assert.throws(() => model.createDistanceConnection(layoutOf(a, b, wall), a.id, b.id, 1, 0, { variant: 'straight' }),
    error => error.code === 'bridgeNoFit' && error.obstruction.objectId === wall.id);
  wall.elevation = 3500;
  const layout = layoutOf(a, b, wall);
  const unknown = model.createDistanceConnection(layout, a.id, b.id, 1, 0, { variant: 'straight' });
  assert.deepEqual(warnings(unknown), []);
  assert.ok(model.findCollisions(unknown).some(item => item.kind === 'unverified-route' && item.firstId === unknown.objects[3].id));
  const cleared = model.createDistanceConnection(layout, a.id, b.id, 1, 0, { variant: 'straight', requiredHeight: 3000 });
  assert.deepEqual(warnings(cleared), []);
  assert.throws(() => model.createDistanceConnection(layout, a.id, b.id, 1, 0, { variant: 'straight', requiredHeight: 4000 }),
    error => error.code === 'bridgeNoFit');
});

test('existing rack accepts a route beneath its beams and reports real width/height obstructions', () => {
  const rack = model.createRack('pallet-rack', { bayCount: 1, levelCount: 2 });
  const aisle = model.createArea('aisle', { x: 1850, z: -4000, rotation: 90 }); aisle.depth = 800;
  const layout = layoutOf(rack, aisle);
  const passage = model.configurePassage(layout, rack.id, 0, 3500, aisle.id);
  assert.equal(layout.objects[0].bays[0].levels[0].clearHeight, 1500);
  assert.deepEqual(warnings(passage), []);
  passage.objects[1].route.requiredHeight = 3000;
  assert.deepEqual(warnings(passage), []);
  passage.objects[1].route.requiredHeight = 3600;
  assert.ok(warnings(passage).some(item => item.kind === 'route-too-low' && item.availableHeight === 3500));
  passage.objects[1].x = 400;
  assert.ok(warnings(passage).some(item => item.kind === 'route-too-narrow'));
});

test('groups move as an assembly, preserve IDs and expose affected locked objects', () => {
  const a = model.createArea('wall'), b = model.createArea('wall', { x: 6000 });
  const grouped = model.groupObjects(layoutOf(a, b), [a.id, b.id], 'Synthetic walls');
  assert.equal(model.relatedObjects(grouped, a.id).size, 2);
  const next = structuredClone(grouped); next.objects[0].x += 1000;
  model.applyAssemblyChanges(grouped, next);
  assert.equal(next.objects[1].x, b.x + 1000);
  assert.deepEqual(next.objects.map(object => object.id), grouped.objects.map(object => object.id));
  grouped.objects[1].locked = true; next.objects[1].locked = true;
  assert.ok(model.lockedEditConflict(grouped, next));
  assert.throws(() => model.groupObjects(grouped, [a.id, b.id], 'Again'), /Unlock/);
});

test('wall opening creates side walls and a raised lintel; open doors do not block the passage', () => {
  const wall = model.createArea('wall'), layout = layoutOf(wall);
  const opened = model.normalizeLayout(model.insertWallOpening(layout, wall.id, 'door', 1200, 1000, 2100));
  assert.equal(opened.objects.length, 4);
  assert.equal(opened.objects[0].id, wall.id);
  assert.equal(opened.groups.length, 1);
  const door = opened.objects.find(object => object.type === 'door');
  assert.equal(door.open, true);
  assert.equal(model.physicalParts(door).some(part => part.kind === 'leaf'), false);
  assert.equal(model.physicalParts({ ...door, open: false }).some(part => part.kind === 'leaf'), true);
  const lintel = opened.objects.find(object => object.elevation === 2100);
  assert.equal(lintel.height, 900);
  assert.throws(() => model.insertWallOpening(layout, wall.id, 'door', 50, 1000, 2100), /100 mm/);
  assert.deepEqual(layout.objects, [layoutOf(wall).objects[0]]);
});

test('layout 2/3 migrations retain source geometry and codes through workspace 14/15 backup restore', () => {
  let layout = layoutOf(model.createRack('shelf-rack', { bayCount: 1, levelCount: 1 }));
  layout = model.setZoneUsage(layout, layout.zones[0].id, 'reserve');
  layout = model.resizeZoneLocations(layout, layout.zones[0].id, 1); layout.locations[0].code = 'SYNTHETIC-01';
  for (const [schema, version] of [[14, 2], [15, 3]]) {
    const record = workspace.createWorkspace('Synthetic legacy');
    record.schemaVersion = schema; record.warehouseLayout = { ...structuredClone(layout), version };
    if (version === 2) { delete record.warehouseLayout.groups; delete record.warehouseLayout.connections; }
    const before = structuredClone(record), migrated = workspace.migrateWorkspace(record);
    assert.equal(migrated.schemaVersion, workspace.WORKSPACE_SCHEMA_VERSION); assert.equal(migrated.warehouseLayout.version, 4);
    assert.deepEqual(migrated.warehouseLayout.objects, layout.objects);
    assert.deepEqual(migrated.warehouseLayout.locations, layout.locations);
    assert.deepEqual(migrated.warehouseLayout.zones, layout.zones);
    assert.deepEqual(workspace.parseBackup(workspace.stringifyBackup(migrated)).warehouseLayout, migrated.warehouseLayout);
    assert.deepEqual(record, before);
  }
});

test('component/usage palettes share geometry and retain article/location marker colors', () => {
  const rack = model.createRack('pallet-rack', { bayCount: 1, levelCount: 1 }); rack.bays[0].levels[0].deck = true;
  let layout = layoutOf(rack); layout = model.setZoneUsage(layout, layout.zones[0].id, 'picking');
  layout = model.resizeZoneLocations(layout, layout.zones[0].id, 1); layout.locations[0].code = 'P-1';
  const matches = { bySlot: new Map([[layout.locations[0].id, [{}]]]) }, before = structuredClone(layout);
  const structure = scene.buildBoxes(model, layout, matches, { colorMode: 'structure' });
  const usage = scene.buildBoxes(model, layout, matches, { colorMode: 'usage' });
  assert.deepEqual(structure.map(({ color, ...part }) => part), usage.map(({ color, ...part }) => part));
  assert.equal(structure.find(part => part.kind === 'upright').color, scene.PALLET_PART_COLORS.upright);
  assert.equal(structure.find(part => part.kind === 'beam').color, scene.PALLET_PART_COLORS.beam);
  assert.equal(structure.find(part => part.kind === 'deck').color, scene.PALLET_PART_COLORS.deck);
  assert.equal(usage.find(part => part.kind === 'beam').color, model.USAGE_COLORS.picking);
  assert.equal(structure.find(part => part.slotRef && part.slotRef.slotId).color, '#45d3b1');
  assert.equal(usage.find(part => part.slotRef && part.slotRef.slotId).color, '#45d3b1');
  assert.deepEqual(layout, before);
});
