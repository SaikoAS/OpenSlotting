'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
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
