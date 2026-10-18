'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const warehouse = require('../warehouse.js');
const workspace = require('../workspace.js');
const preparation = require('../src/application/workspace-preparation.js');
const legacy = require('./fixtures/warehouse-layout-v1.json');

function engine() {
  const messages = [];
  const scope = { postMessage(message, transfer) { messages.push({ message, transfer }); } };
  preparation.workspaceWorkerMain(scope);
  return input => { messages.length = 0; scope.onmessage({ data: input }); return messages.at(-1); };
}

test('localhost worker migrates a populated schema-13 workspace, exports and restores all source/layout evidence', () => {
  const bytes = new TextEncoder().encode('order_id;article_id;quantity;delivery_date\r\n00001;0007;0.1234567;2026-10-01\r\n');
  const record = workspace.createWorkspace('Synthetic legacy', { id: 'legacy-worker' });
  record.schemaVersion = 13; record.warehouseLayout = structuredClone(legacy); record.analyzed = true;
  record.files = [{ id: 'source-legacy', name: 'synthetic.csv', label: 'synthetic.csv', size: bytes.byteLength,
    lastModified: 1, buffer: bytes.buffer, encodingMode: 'auto', activeEncoding: 'utf-8', detectedEncoding: 'utf-8',
    errorKey: null, sourceType: 'order-lines', mapping: { order_id: 0, article_id: 1, quantity: 2, delivery_date: 3 },
    confirmedMapping: { order_id: 0, article_id: 1, quantity: 2, delivery_date: 3 },
    preparationRules: {}, sourceRules: [], customFieldMapping: {}, confirmedCustomFieldMapping: {}, result: null }];
  const before = structuredClone(record), run = engine();
  const response = run({ taskId: 101, record: structuredClone(record), language: 'de' });
  assert.equal(response.message.type, 'complete', response.message.type === 'error' ? JSON.stringify(response.message) : '');
  assert.equal(response.message.taskId, 101);
  const prepared = response.message.prepared;
  assert.equal(prepared.workspace.schemaVersion, workspace.WORKSPACE_SCHEMA_VERSION); assert.equal(prepared.workspace.warehouseLayout.version, warehouse.LAYOUT_VERSION);
  assert.deepEqual(prepared.workspace.warehouseLayout.locations.map(location => location.id),
    ['legacy-location-a', 'legacy-location-b', 'legacy-location-c']);
  assert.equal(prepared.workspace.warehouseLayout.locations[0].code, 'R01-03-02-01');
  assert.ok(prepared.workspace.warehouseLayout.zones.every(zone => zone.usage === 'unassigned'));
  assert.deepEqual(new Uint8Array(prepared.files[0].buffer), bytes);
  assert.equal(prepared.analysis.total_quantity, 1234567n);
  assert.equal(prepared.result.rows[0].article_id, '0007'); assert.equal(prepared.result.rows[0].source_line, 2);
  const persisted = preparation.persistPreparedWorkspace(prepared);
  const backup = run({ taskId: 102, backupExport: persisted });
  assert.equal(backup.message.type, 'backup');
  const parsed = workspace.parseBackup(backup.message.text);
  assert.deepEqual(parsed.warehouseLayout, prepared.workspace.warehouseLayout);
  const restored = run({ taskId: 103, backupText: backup.message.text, mode: 'new', newId: 'restored-worker' });
  assert.equal(restored.message.type, 'complete');
  assert.deepEqual(restored.message.prepared.workspace.warehouseLayout, parsed.warehouseLayout);
  assert.deepEqual(new Uint8Array(restored.message.prepared.runtime.files[0].buffer), bytes);
  assert.equal(restored.message.prepared.runtime.analysis.total_quantity, 1234567n);
  assert.deepEqual(record, before);
});

test('per-pass scope indexes preserve ordered locations, empty physical scopes and source layout', () => {
  const layout = warehouse.migrateLayout(legacy), before = structuredClone(layout);
  layout.locations.reverse();
  const index = warehouse.createScopeIndex(layout);
  for (const zone of layout.zones) {
    assert.equal(index.zonesByLevel.get(zone.levelId), zone);
    assert.deepEqual(index.locationsByZone.get(zone.id) || [], warehouse.zoneLocations(layout, zone.id));
  }
  const reversed = layout.locations.map(location => location.id);
  assert.deepEqual(layout.locations, before.locations.slice().reverse());
  layout.zones[0].usage = 'picking';
  const next = warehouse.createScopeIndex(layout);
  assert.notEqual(next, index);
  assert.equal(next.zonesByLevel.get(layout.zones[0].levelId).usage, 'picking');
  assert.deepEqual(before.locations.map(location => location.id).reverse(), reversed);
});

test('rack code generation respects legacy/classification, locks and global code uniqueness', () => {
  let layout = warehouse.migrateLayout(legacy);
  layout.locations.forEach(location => { location.code = ''; });
  const objectId = layout.objects[0].id;
  const generated = warehouse.fillLocationCodes(layout, objectId, 'R01');
  assert.ok(generated.locations.every(location => location.code));
  assert.ok(layout.locations.every(location => !location.code));
  assert.deepEqual(generated.locations.map(location => location.id), layout.locations.map(location => location.id));
  layout.locations[0].legacy = false;
  assert.equal(warehouse.fillLocationCodes(layout, objectId, 'R02').locations[0].code, '');
  layout.locations[1].code = 'R03-01-01-01'; layout.locations[0].legacy = true;
  assert.throws(() => warehouse.fillLocationCodes(layout, objectId, 'R03'), /unique/);
  layout.objects[0].locked = true;
  assert.throws(() => warehouse.fillLocationCodes(layout, objectId, 'R04'), /Unlock/);
});

test('physical capacity is independent of the 5000 logical-location limit', () => {
  const { uncodedScopeFixture } = require('./fixtures/warehouse-performance.cjs');
  const layout = uncodedScopeFixture(warehouse);
  assert.equal(layout.objects.length, 150); assert.equal(layout.zones.length, 58500);
  assert.equal(layout.locations.length, 0);
  const index = warehouse.createScopeIndex(layout);
  assert.equal(index.zonesByLevel.size, 58500); assert.equal(index.locationsByZone.size, 0);
  assert.equal(warehouse.listLocations(layout).length, 0);
});
