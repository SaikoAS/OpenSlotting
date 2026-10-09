'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const model = require('../warehouse.js');

// Small DOM adapter for testing the real controller's user actions and save boundary.
// Canvas/WebGL appearance is covered by scene tests and browser acceptance.
function harness(initial, registry = [], activeModel = model, draw = false) {
  const listeners = {}, controls = new Map(), warnings = [], saves = [];
  const canvas = { className: '', clientWidth: 800, clientHeight: 600, setAttribute() {},
    getContext(kind) { return draw && kind === '2d' ? new Proxy({}, { get(_, name) {
      return name === 'measureText' ? () => ({ width: 20 }) : () => {};
    } }) : null; }, addEventListener() {} };
  const root = { innerHTML: '', classList: { add() {}, remove() {} }, contains() { return false; },
    addEventListener(type, callback) { listeners[type] = callback; }, setAttribute() {}, removeAttribute() {},
    querySelector(selector) {
      if (selector === 'canvas.is-top') return canvas;
      if (!controls.has(selector)) controls.set(selector, { value: '', focus() {}, appendChild() {}, disabled: false });
      return controls.get(selector);
    }, querySelectorAll() { return []; } };
  const h = { layout: structuredClone(initial), workspaceId: 'synthetic', root, warnings, saves, accept: true, failSave: false };
  const context = vm.createContext({ document: { createElement() { return canvas; }, activeElement: null },
    window: { addEventListener() {}, confirm(message) { warnings.push(message); return h.accept; } } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'warehouse-editor.js'), 'utf8'), context);
  const editor = context.OpenSlottingWarehouseEditor.create({ root, model: activeModel,
    getLayout: () => h.layout, getRegistry: () => registry, getWorkspaceId: () => h.workspaceId, getLanguage: () => 'en',
    save: async (layout) => {
      if (h.failSave) throw new Error('Synthetic save failure');
      h.layout = structuredClone(layout); saves.push(structuredClone(layout));
    } });
  h.render = editor.render;
  h.control = (selector, value) => { root.querySelector(selector).value = String(value); };
  h.action = async (type, dataset, value, inputType = 'text') => {
    const target = { dataset, value: String(value === undefined ? '' : value), type: inputType,
      closest(selector) {
        const keys = { '[data-mode]': 'mode', '[data-action]': 'action', '[data-object]': 'object',
          '[data-wizard-action]': 'wizardAction', '[data-scope-bay]': 'scopeBay' };
        return keys[selector] && dataset[keys[selector]] !== undefined ? target : null;
      }, setAttribute() {}, removeAttribute() {} };
    await listeners[type]({ target });
    await new Promise((resolve) => setImmediate(resolve));
  };
  h.click = (dataset) => h.action('click', dataset);
  h.change = (dataset, value, type) => h.action('change', dataset, value, type);
  editor.render();
  return h;
}
function fresh() {
  return model.normalizeLayout({ ...model.createLayout(), objects: [model.createRack('shelf-rack', { bayCount: 1, levelCount: 2 })] });
}

test('level and rack code actions retain existing codes, scope boundaries, undo and failed-save state', async () => {
  let layout = fresh();
  for (const zone of layout.zones) {
    layout = model.setZoneUsage(layout, zone.id, 'picking');
    layout = model.resizeZoneLocations(layout, zone.id, 2);
  }
  layout.locations[0].code = 'EXISTING-0001';
  const h = harness(layout);
  await h.click({ mode: 'locations' });
  assert.match(h.root.innerHTML, /data-action="generate-rack"/);
  await h.change({ field: 'prefix' }, ' R01 ');
  await h.click({ action: 'generate' });
  assert.deepEqual(h.layout.locations.map(location => location.code), ['EXISTING-0001', 'R01-01-01-02', '', '']);
  const levelOnly = structuredClone(h.layout);
  await h.click({ action: 'generate-rack' });
  assert.deepEqual(h.layout.locations.map(location => location.code), ['EXISTING-0001', 'R01-01-01-02', 'R01-01-02-01', 'R01-01-02-02']);
  assert.deepEqual(h.layout.locations.map(location => location.id), layout.locations.map(location => location.id));
  await h.click({ action: 'undo' });
  assert.deepEqual(h.layout, levelOnly);
  h.failSave = true;
  await h.click({ action: 'generate-rack' });
  assert.deepEqual(h.layout, levelOnly);
  h.failSave = false;
  await h.click({ action: 'toggle-lock' });
  const locked = structuredClone(h.layout);
  await h.click({ action: 'generate-rack' });
  assert.deepEqual(h.layout, locked);
});

test('top-plan drawing indexes scopes per pass and does not call lookup scans per level', async () => {
  const layout = model.normalizeLayout({ ...model.createLayout(), objects: [model.createRack('shelf-rack', { bayCount: 20, levelCount: 3 })] });
  let indexes = 0, zoneScans = 0, locationScans = 0;
  const counted = { ...model,
    createScopeIndex(value) { indexes++; return model.createScopeIndex(value); },
    zoneForLevel(...args) { zoneScans++; return model.zoneForLevel(...args); },
    zoneLocations(...args) { locationScans++; return model.zoneLocations(...args); } };
  const h = harness(layout, [], counted, true);
  assert.equal(indexes, 1); assert.equal(zoneScans, 0); assert.equal(locationScans, 0);
  indexes = 0; zoneScans = 0; locationScans = 0;
  await h.click({ mode: 'zones' });
  assert.equal(indexes, 1); assert.equal(zoneScans, 1); assert.equal(locationScans, 1);
  h.layout.zones[0].usage = 'reserve';
  h.render();
  assert.equal(indexes, 2);
  assert.match(h.root.innerHTML, /Reserve/);
});

test('rack wizard saves geometry alone and cancel leaves the layout untouched', async () => {
  const h = harness(model.createLayout());
  h.control('#wh-recipe', 'shelf-rack');
  await h.click({ action: 'add' });
  assert.doesNotMatch(h.root.innerHTML, /data-wizard-field="level.positions"/);
  await h.click({ wizardAction: 'cancel' });
  assert.equal(h.saves.length, 0);
  await h.click({ action: 'add' });
  await h.change({ wizardField: 'bayCount' }, 1, 'number');
  await h.click({ wizardAction: 'next' });
  await h.click({ wizardAction: 'next' });
  await h.click({ wizardAction: 'finish' });
  assert.equal(h.layout.objects.length, 1);
  assert.equal(h.layout.locations.length, 0);
  assert.ok(h.layout.zones.every((zone) => zone.usage === 'unassigned'));
  assert.equal(h.saves.length, 1);
});

test('modes preserve scope selection, gate subdivision, and allow partially completed racks', async () => {
  const h = harness(fresh());
  await h.click({ mode: 'locations' });
  assert.match(h.root.innerHTML, /Classify this level in Zones/);
  assert.match(h.root.innerHTML, /data-action="resize-locations" disabled/);
  await h.click({ mode: 'zones' });
  await h.change({ zone: h.layout.zones[0].id }, 'picking');
  assert.equal(h.layout.locations.length, 0);
  await h.change({ zone: h.layout.zones[1].id }, 'reserve');
  await h.click({ scopeBay: '0', scopeLevel: '1' });
  await h.click({ mode: 'locations' });
  h.control('[data-field="count.locations"]', 3);
  await h.click({ action: 'resize-locations' });
  assert.equal(model.zoneLocations(h.layout, h.layout.zones[1].id).length, 3);
  assert.equal(model.zoneLocations(h.layout, h.layout.zones[0].id).length, 0);
  await h.change({ field: 'prefix' }, 'R');
  await h.click({ action: 'generate' });
  assert.deepEqual(h.layout.locations.map((location) => location.code), ['R-01-02-01', 'R-01-02-02', 'R-01-02-03']);
  const before = structuredClone(h.layout);
  await h.click({ mode: 'structure' });
  await h.click({ mode: 'zones' });
  await h.click({ mode: 'locations' });
  assert.deepEqual(h.layout, before);
  assert.match(h.root.innerHTML, /3\/3 locations configured/);
});

test('impact confirmation can cancel geometry changes, deletion and zone changes without losing IDs or codes', async () => {
  let layout = fresh();
  layout = model.setZoneUsage(layout, layout.zones[0].id, 'picking');
  layout = model.resizeZoneLocations(layout, layout.zones[0].id, 2);
  layout.locations[0].code = 'P-001';
  const h = harness(layout, [{ article_id: 'SYNTHETIC', master_data: { location: 'P-001' } }]);
  h.accept = false;
  await h.change({ field: 'bay.width' }, 1200, 'number');
  assert.deepEqual(h.layout, layout);
  assert.match(h.warnings[0], /2 existing locations, 1 codes and 1 current article matches/);
  await h.click({ mode: 'zones' });
  await h.change({ zone: layout.zones[0].id }, 'reserve');
  assert.deepEqual(h.layout, layout);
  await h.click({ mode: 'structure' });
  await h.click({ action: 'delete' });
  assert.deepEqual(h.layout, layout);
  assert.match(h.warnings.at(-1), /2 locations will be removed/);
  h.accept = true;
  await h.change({ field: 'bay.width' }, 1200, 'number');
  assert.equal(h.layout.objects[0].bays[0].width, 1200);
  assert.deepEqual(h.layout.locations, layout.locations);
  assert.deepEqual(h.layout.zones, layout.zones);
  await h.click({ action: 'delete' });
  assert.equal(h.layout.locations.length, 0);
  await h.click({ action: 'undo' });
  assert.deepEqual(h.layout.locations, layout.locations);
});

test('undo and redo keep IDs and current locks; failed saves do not advance history', async () => {
  const h = harness(fresh());
  await h.click({ mode: 'zones' });
  const zoneId = h.layout.zones[0].id;
  await h.change({ zone: zoneId }, 'picking');
  await h.click({ mode: 'locations' });
  h.control('[data-field="count.locations"]', 2);
  await h.click({ action: 'resize-locations' });
  const before = structuredClone(h.layout);
  await h.change({ location: h.layout.locations[0].id }, 'P-1');
  const coded = structuredClone(h.layout);
  await h.click({ action: 'toggle-lock' });
  const saveCount = h.saves.length;
  await h.click({ action: 'undo' });
  assert.equal(h.saves.length, saveCount);
  assert.equal(h.layout.locations[0].code, 'P-1');
  assert.equal(h.layout.objects[0].locked, true);
  await h.click({ action: 'toggle-lock' });
  await h.click({ action: 'undo' });
  assert.deepEqual(h.layout, before);
  await h.click({ action: 'redo' });
  assert.deepEqual(h.layout, coded);
  h.failSave = true;
  await h.change({ location: h.layout.locations[0].id }, 'FAILED');
  assert.deepEqual(h.layout, coded);
  assert.match(h.root.innerHTML, /Synthetic save failure/);
  h.failSave = false;
  await h.click({ action: 'undo' });
  assert.deepEqual(h.layout, before);
});

test('legacy unassigned codes remain editable; classification preserves them and duplication creates empty scopes', async () => {
  const layout = model.migrateLayout(require('./fixtures/warehouse-layout-v1.json'));
  const h = harness(layout);
  await h.click({ mode: 'locations' });
  assert.match(h.root.innerHTML, /Migrated locations keep their IDs and codes/);
  await h.change({ location: 'legacy-location-a' }, 'CHANGED');
  assert.equal(h.layout.locations[0].id, 'legacy-location-a');
  assert.equal(h.layout.locations[0].code, 'CHANGED');
  await h.click({ mode: 'zones' });
  await h.change({ zone: layout.zones[0].id }, 'picking');
  assert.equal(h.layout.locations[0].code, 'CHANGED');
  await h.click({ mode: 'structure' });
  const locations = structuredClone(h.layout.locations);
  await h.click({ action: 'duplicate' });
  assert.equal(h.layout.objects.length, 2);
  assert.deepEqual(h.layout.locations, locations);
  const duplicateId = h.layout.objects[1].id;
  assert.ok(h.layout.zones.filter((zone) => zone.objectId === duplicateId).every((zone) => zone.usage === 'unassigned'));
  h.workspaceId = 'different-workspace';
  h.layout = model.createLayout(); h.render();
  const count = h.saves.length;
  await h.click({ action: 'undo' });
  assert.equal(h.saves.length, count, 'history never crosses workspace boundaries');
});

test('analysis inspector shows exact migrated matches without changing the layout or registry', () => {
  const layout = model.migrateLayout(require('./fixtures/warehouse-layout-v1.json'));
  const registry = [{ article_id: 'SYNTHETIC-1', master_data: { location: 'R01-03-02-01' } },
    { article_id: 'SYNTHETIC-2', master_data: { location: 'OUTSIDE-01' } }];
  const before = structuredClone({ layout, registry });
  const listeners = {}, search = { value: 'R01-03-02-01' };
  const root = { innerHTML: '', addEventListener(type, callback) { listeners[type] = callback; },
    querySelector(selector) { return selector === '[data-field="search"]' ? search : { appendChild() {} }; } };
  const context = vm.createContext({ document: { createElement() { return { setAttribute() {}, addEventListener() {} }; } }, window: { addEventListener() {} } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'warehouse-analysis.js'), 'utf8'), context);
  const analysis = context.OpenSlottingWarehouseAnalysis.create({ root, model, getLayout: () => layout,
    getRegistry: () => registry, getWorkspaceId: () => 'synthetic', getLanguage: () => 'en' });
  analysis.render();
  listeners.input({ target: { dataset: { field: 'search' }, value: search.value } });
  listeners.click({ target: { closest() { return { dataset: { action: 'find' } }; } } });
  assert.match(root.innerHTML, /SYNTHETIC-1/);
  assert.match(root.innerHTML, /OUTSIDE-01/);
  assert.match(root.innerHTML, /Unassigned/);
  assert.deepEqual({ layout, registry }, before);
});
