'use strict';
const warehouse = require('../../../tests/fixtures/warehouse-baseline.cjs');
const { clone } = require('./history.cjs');

function layoutFor(count = 150) {
  const objects = [];
  for (let index = 0; index < count; index += 1) {
    const rack = warehouse.createRack(index % 2 ? 'shelf-rack' : 'pallet-rack', { id: 'rack-' + index, name: 'Rack ' + index,
      x: (index % 15) * 10000, z: Math.floor(index / 15) * 4000, bayCount: 3, levelCount: 3 });
    rack.bays.forEach((bay, b) => {
      bay.id = rack.id + '-bay-' + b;
      bay.levels.forEach((level, l) => {
        level.id = bay.id + '-level-' + l;
        level.positions.forEach((slot, s) => { slot.id = level.id + '-slot-' + s; slot.code = String(index).padStart(3, '0') + '-' + b + '-' + l + '-' + s; });
      });
    });
    rack.uprights.forEach((upright, u) => { upright.id = rack.id + '-upright-' + u; });
    objects.push(rack);
  }
  return warehouse.normalizeLayout({ version: 1, objects });
}

function driver(representation, initial, workspace = 'A') {
  const layouts = new Map([[workspace, clone(initial)]]);
  let workspaceId = workspace;
  let selectionId = initial.objects[0] && initial.objects[0].id || null;
  let failNext = false;
  let pendingGate = null;
  let saveCount = 0;
  const { createHistory } = require('./history.cjs');
  const history = createHistory({ representation, getWorkspaceId: () => workspaceId,
    getLayout: () => layouts.get(workspaceId), getSelection: () => selectionId, setSelection: value => { selectionId = value; },
    async save(next) {
      const saveScope = workspaceId;
      if (pendingGate) await pendingGate;
      if (failNext) { failNext = false; throw new Error('Synthetic persistence failure'); }
      layouts.set(saveScope, clone(next)); saveCount += 1;
    } });
  return { history, get layout() { return layouts.get(workspaceId); }, get selection() { return selectionId; },
    get saveCount() { return saveCount; }, select(value) { selectionId = value; }, fail() { failNext = true; },
    gate(value) { pendingGate = value; },
    switchWorkspace(id, layout = warehouse.createLayout()) { if (!layouts.has(id)) layouts.set(id, clone(layout)); workspaceId = id; } };
}

module.exports = { layoutFor, driver };
