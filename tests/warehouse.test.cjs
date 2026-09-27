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
  const types = ['wall', 'gate', 'emergency-exit', 'aisle', 'goods-in', 'goods-out'];
  const areas = types.map((type) => warehouse.createArea(type));
  const layout = warehouse.normalizeLayout({ version: 1, objects: areas });
  assert.deepEqual(layout.objects.map((object) => object.type), types);
  const rack = warehouse.createRack('shelf-rack', { bayCount: 1, levelCount: 1 });
  rack.bays[0].levels[0].positions[0] = null;
  assert.throws(
    () => warehouse.normalizeLayout({ version: 1, objects: [rack] }),
    (error) => error instanceof warehouse.WarehouseValidationError && /position is invalid/.test(error.message)
  );
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
  const rack = warehouse.createRack('pallet-rack', { bayCount: 1, levelCount: 1 });
  rack.bays[0].levels[0].positions[0].code = 'P-01-01';
  const layout = warehouse.normalizeLayout({ version: 1, objects: [rack] });
  await repository.updateWorkspaceSummary(record.id, { warehouseLayout: layout }, { expectedRevision: created.storageRevision });
  const loaded = await repository.loadWorkspace(record.id);
  assert.equal(loaded.warehouseLayout.objects[0].bays[0].levels[0].positions[0].code, 'P-01-01');
  assert.equal(indexedDB.inspect('warehouse-layout-test', 'workspaceSources').length, 0);
  const backup = workspace.stringifyBackup(loaded, { now: '2026-09-27T10:01:00.000Z' });
  const restored = workspace.parseBackup(backup);
  assert.deepEqual(restored.warehouseLayout, layout);
  repository.close();
});
