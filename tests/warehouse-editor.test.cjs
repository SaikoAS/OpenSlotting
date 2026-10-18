'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const model = require('../warehouse.js');
const scene = require('../warehouse-scene.js');

// Small DOM adapter for testing the real controller's user actions and save boundary.
// Canvas/WebGL appearance is covered by scene tests and browser acceptance.
function harness(initial, registry = [], activeModel = model, draw = false, navigation = false) {
  const listeners = {}, controls = new Map(), warnings = [], saves = [];
  const pointerListeners = {}, rendered = [], paintedText = [];
  const canvas = { className: '', clientWidth: 800, clientHeight: 600, setAttribute() {},
    isConnected: true, focus() {}, setPointerCapture() {}, releasePointerCapture() {}, hasPointerCapture() { return true; },
    getBoundingClientRect() { return { left:0,top:0,width:800,height:600 }; },
    getContext(kind) { return draw && kind === '2d' ? new Proxy({}, { get(_, name) {
      return name === 'measureText' ? () => ({ width: 20 }) : name === 'fillText' ? (...args) => paintedText.push(args) : () => {};
    } }) : null; }, addEventListener(type, callback) { pointerListeners[type] = callback; } };
  const root = { innerHTML: '', closest() { return null; }, classList: { add() {}, remove() {} }, contains() { return false; },
    addEventListener(type, callback) { listeners[type] = callback; }, setAttribute() {}, removeAttribute() {},
    querySelector(selector) {
      if (selector === 'canvas.is-top') return canvas;
      if (!controls.has(selector)) controls.set(selector, { value: '', focus() {}, appendChild() {}, disabled: false });
      return controls.get(selector);
    }, querySelectorAll() { return []; } };
  const h = { layout: structuredClone(initial), workspaceId: 'synthetic', root, warnings, saves, rendered, paintedText, accept: true, failSave: false };
  const context = vm.createContext({ document: { createElement() { return canvas; }, activeElement: null },
    window: { OpenSlottingWarehouseScene: scene,
      OpenSlottingWarehouseWebGL: navigation ? { projectScene: require('../warehouse-webgl.js').projectScene,
        create() { return { available() { return true; }, pick() { return h.pick; },
          view() { return { fitTarget:{x:0,y:0,z:0},fitScale:.1 }; },
          render(boxes,camera,objectId,selection) { rendered.push({boxes,camera:structuredClone(camera),objectId,selection:structuredClone(selection)}); }
        }; } } : undefined,
      addEventListener() {}, confirm(message) { warnings.push(message); return h.accept; } } });
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
    const target = { dataset, value: String(value === undefined ? '' : value), type: inputType, checked: value === true,
      closest(selector) {
        const keys = { '[data-mode]': 'mode', '[data-action]': 'action', '[data-object]': 'object',
          '[data-wizard-action]': 'wizardAction', '[data-scope-bay]': 'scopeBay',
          '[data-nav-kind]':'navKind', '[data-placement-select]':'placementSelect' };
        return keys[selector] && dataset[keys[selector]] !== undefined ? target : null;
      }, setAttribute() {}, removeAttribute() {} };
    await listeners[type]({ target });
    await new Promise((resolve) => setImmediate(resolve));
  };
  h.click = (dataset) => h.action('click', dataset);
  h.change = (dataset, value, type) => h.action('change', dataset, value, type);
  h.pointer = (type, extra = {}) => pointerListeners[type]({ clientX:100,clientY:100,button:0,pointerId:1,preventDefault() {},...extra });
  const placementSvg = { setPointerCapture() {}, getScreenCTM() { return { inverse() { return {}; } }; },
    createSVGPoint() { return { x:0,y:0,matrixTransform() { return {x:this.x,y:this.y}; } }; },
    querySelector() { return {setAttribute() {},classList:{toggle() {}}}; } };
  h.placement = async (type, id, extra = {}) => {
    const target = { dataset:{placementRect:id}, closest(selector) {
      return selector === '[data-placement-plane]' ? placementSvg : selector === '[data-placement-rect]' && id ? target : null;
    }, classList:{contains() { return false; }} };
    await listeners[type]({target,clientX:100,clientY:100,button:0,pointerId:1,preventDefault() {},...extra});
    await new Promise(resolve=>setImmediate(resolve));
  };
  editor.render();
  return h;
}
function fresh() {
  return model.normalizeLayout({ ...model.createLayout(), objects: [model.createRack('shelf-rack', { bayCount: 1, levelCount: 2 })] });
}

function placementLayout() {
  let value=fresh();
  value=model.setZoneUsage(value,value.zones[0].id,'picking');
  return model.addLocation(value,value.zones[0].id,{x:0,z:0,width:200,depth:value.objects[0].bays[0].depth});
}
function assertSlotSelection(h,id) {
  assert.match(h.root.innerHTML,/data-nav-kind="slot" aria-current="true"/);
  assert.equal(h.rendered.at(-1).selection,id);
}

test('area keyboard and pointer choices promote level navigation to exact slot selection without saving', async () => {
  const h=harness(placementLayout(),[],model,false,true),slot=h.layout.locations[0];
  await h.click({mode:'locations'});await h.click({action:'location-open'});
  for(const key of ['Enter',' ']) {
    await h.click({navKind:'level'});
    await h.placement('keydown',slot.id,{key});
    assertSlotSelection(h,slot.id);
    await h.click({action:'focus'});
    const actual=h.rendered.at(-1),boxes=actual.boxes.filter(box=>box.partId===slot.id);
    const expected=require('../warehouse-webgl.js').projectScene(boxes,{...actual.camera,target:null,baseScale:null,zoom:1},800,600,null,null,new Set(),'solid').view;
    assert.deepEqual(actual.camera.target,expected.fitTarget);
    assert.equal(actual.camera.baseScale,expected.fitScale);
  }
  await h.click({navKind:'level'});
  await h.placement('pointerdown',slot.id);await h.placement('pointerup',slot.id);
  assertSlotSelection(h,slot.id);assert.equal(h.saves.length,0);
});

test('area add duplicate and draw select the resulting slot; removal returns navigation to its level', async () => {
  for(const action of ['location-add','location-duplicate','draw']) {
    const h=harness(placementLayout(),[],model,false,true);
    await h.click({mode:'locations'});await h.click({action:'location-open'});await h.click({navKind:'level'});
    if(action==='draw') {
      await h.click({action:'location-draw'});
      await h.placement('pointerdown',null,{clientX:400});
      await h.placement('pointermove',null,{clientX:600});
      await h.placement('pointerup',null,{clientX:600});
    } else await h.click({action});
    assert.equal(h.layout.locations.length,2,action);
    assertSlotSelection(h,h.layout.locations[1].id);
    await h.click({action:'location-remove'});
    assert.equal(h.layout.locations.length,1);
    assert.match(h.root.innerHTML,/data-nav-kind="level" aria-current="true"/);
    assert.doesNotMatch(h.root.innerHTML,/data-nav-kind="slot"/);
    assert.equal(h.rendered.at(-1).selection.levelIndex,0);
  }
});

test('failed area creation and removal restore both the selected ID and navigation kind', async () => {
  const h=harness(placementLayout(),[],model,false,true),slot=h.layout.locations[0];
  await h.click({mode:'locations'});await h.click({action:'location-open'});await h.click({navKind:'level'});
  h.failSave=true;await h.click({action:'location-add'});
  assert.equal(h.layout.locations.length,1);
  assert.match(h.root.innerHTML,/data-nav-kind="level" aria-current="true"/);
  assert.equal(h.rendered.at(-1).selection.levelIndex,0);
  await h.placement('keydown',slot.id,{key:'Enter'});
  await h.click({action:'location-remove'});
  assertSlotSelection(h,slot.id);assert.equal(h.layout.locations.length,1);
  assert.equal(h.saves.length,0);
});

test('top view defaults to panning over objects without editing or changing selection; explicit move saves one edit', async () => {
  const initial=fresh(),h=harness(initial,[],model,true);
  assert.match(h.root.innerHTML,/data-action="top-pan" aria-pressed="true"/);
  assert.match(h.root.innerHTML,/data-top-drag="pan"/);
  const before=h.paintedText.filter(item=>item[0]==='L1').at(-1);
  assert.ok(before,'synthetic level band is visible');
  h.pointer('pointerdown',{clientX:400,clientY:300});
  h.pointer('pointermove',{clientX:520,clientY:350});
  h.pointer('pointerup',{clientX:520,clientY:350});
  const after=h.paintedText.filter(item=>item[0]==='L1').at(-1);
  assert.ok(Math.abs(after[1]-before[1]-120)<.001);assert.ok(Math.abs(after[2]-before[2]-50)<.001);
  assert.deepEqual(h.layout,initial);assert.equal(h.saves.length,0);assert.equal(h.warnings.length,0);
  assert.match(h.root.innerHTML,/data-nav-kind="object" aria-current="true"/);
  await h.click({action:'top-move'});
  assert.match(h.root.innerHTML,/data-action="top-move" aria-pressed="true"/);
  h.pointer('pointerdown',{clientX:520,clientY:350});
  h.pointer('pointermove',{clientX:620,clientY:350});
  h.pointer('pointerup',{clientX:620,clientY:350});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.layout.objects[0].x,600);assert.equal(h.layout.objects[0].z,0);assert.equal(h.saves.length,1);
  await h.click({action:'undo'});assert.deepEqual(h.layout,initial);
});

test('top interaction choice survives redraws, forces pan outside Structure, and resets per workspace', async () => {
  const h=harness(fresh(),[],model,true);
  h.pointer('pointerdown',{clientX:400,clientY:300});h.pointer('pointerup',{clientX:400,clientY:300});
  assert.match(h.root.innerHTML,/data-nav-kind="level" aria-current="true"/,'a click in pan mode still selects');
  await h.click({action:'top-move'});await h.click({action:'markers'});
  assert.match(h.root.innerHTML,/data-top-drag="move"/);
  for(const mode of ['zones','locations']) {
    await h.click({mode});
    assert.match(h.root.innerHTML,/data-top-drag="pan"/);
    assert.match(h.root.innerHTML,/data-action="top-move"[^>]* disabled/);
    await h.click({action:'top-move'});assert.match(h.root.innerHTML,/data-top-drag="pan"/);
  }
  await h.click({mode:'structure'});assert.match(h.root.innerHTML,/data-top-drag="move"/);
  h.workspaceId='other';h.render();assert.match(h.root.innerHTML,/data-top-drag="pan"/);
  assert.equal(h.saves.length,0);
});

test('explicit top object mode honors locks and cancel; switching to pan never saves a pending drag', async () => {
  const locked=fresh();locked.objects[0].locked=true;
  const h=harness(locked,[],model,true);await h.click({action:'top-move'});
  h.pointer('pointerdown',{clientX:400,clientY:300});h.pointer('pointermove',{clientX:500,clientY:300});h.pointer('pointerup',{clientX:500,clientY:300});
  assert.deepEqual(h.layout,locked);assert.equal(h.saves.length,0);
  const free=harness(fresh(),[],model,true);await free.click({action:'top-move'});
  free.pointer('pointerdown',{clientX:400,clientY:300});free.pointer('pointermove',{clientX:500,clientY:300});free.pointer('pointercancel');
  assert.equal(free.saves.length,0);assert.equal(free.layout.objects[0].x,0);
  await free.click({action:'top-pan'});assert.match(free.root.innerHTML,/data-top-drag="pan"/);
  await free.click({action:'top-move'});
  free.pointer('pointerdown',{clientX:400,clientY:300});free.pointer('pointermove',{clientX:500,clientY:300});
  await free.click({action:'top-pan'});free.pointer('pointerup',{clientX:500,clientY:300});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(free.saves.length,0);assert.equal(free.layout.objects[0].x,0);
});

test('model clicks select contextual scope, retain it across modes and never save navigation', async () => {
  let layout=fresh();
  for(const zone of layout.zones) { layout=model.setZoneUsage(layout,zone.id,'picking'); layout=model.resizeZoneLocations(layout,zone.id,3); }
  const h=harness(layout,[],model,false,true), object=h.layout.objects[0];
  const zone=model.zoneForLevel(h.layout,object.bays[0].levels[1].id), slot=model.zoneLocations(h.layout,zone.id)[2];
  h.pick={objectId:object.id,bayIndex:0,levelIndex:1,slotId:slot.id};
  h.pointer('pointerdown'); h.pointer('pointerup');
  assert.match(h.root.innerHTML,/data-nav-kind="slot" aria-current="true">Location 3/);
  assert.match(h.root.innerHTML,/data-select="level">.*value="1" selected/s);
  await h.click({mode:'locations'});
  assert.match(h.root.innerHTML,/data-nav-kind="slot" aria-current="true">Location 3/);
  assert.equal(h.rendered.at(-1).selection,slot.id);
  await h.click({mode:'zones'}); await h.click({mode:'structure'});
  assert.match(h.root.innerHTML,/data-nav-kind="slot" aria-current="true">Location 3/);
  await h.click({navKind:'level'});
  assert.equal(h.rendered.at(-1).selection.levelIndex,1);
  await h.click({navKind:'bay'});
  assert.equal(h.rendered.at(-1).selection.bayIndex,0);
  assert.equal(h.rendered.at(-1).selection.levelIndex,undefined);
  assert.equal(h.saves.length,0); assert.deepEqual(h.layout,layout);
});

test('ground selection survives Structure without elevated geometry controls or data writes', async () => {
  const h=harness(fresh(),[],model,false,true), object=h.layout.objects[0];
  h.pick={objectId:object.id,bayIndex:0,levelIndex:-1};
  h.pointer('pointerdown'); h.pointer('pointerup');
  assert.match(h.root.innerHTML,/data-nav-kind="level" aria-current="true">Ground \(level 0\)/);
  assert.doesNotMatch(h.root.innerHTML,/data-field="level\.(clearHeight|thickness|deck|deckThickness)"/);
  for(const mode of ['zones','locations','structure']) {
    await h.click({mode});
    assert.match(h.root.innerHTML,/value="-1" selected/);
    assert.equal(h.rendered.at(-1).selection.levelIndex,-1);
  }
  assert.equal(h.saves.length,0);
});

test('rapid clicks focus across property redraws and scope navigation still works on locked racks', async () => {
  const layout=fresh(); layout.objects[0].locked=true;
  const h=harness(layout,[],model,false,true), object=h.layout.objects[0];
  h.pick={objectId:object.id,bayIndex:0,levelIndex:1};
  h.pointer('pointerdown'); h.pointer('pointerup');
  const before=h.rendered.at(-1).camera;
  h.pointer('pointerdown'); h.pointer('pointerup');
  assert.notDeepEqual(h.rendered.at(-1).camera.target,before.target);
  await h.click({mode:'zones'});
  assert.match(h.root.innerHTML,/data-nav-kind="level" aria-current="true">Level 2/);
  await h.click({navKind:'bay'});
  assert.match(h.root.innerHTML,/data-nav-kind="bay" aria-current="true"/);
  assert.deepEqual(h.layout,layout); assert.equal(h.saves.length,0);
});

test('double click focuses the exact slot or level; orbit drag keeps the prior selection', () => {
  let layout=fresh(); layout=model.setZoneUsage(layout,layout.zones[0].id,'picking'); layout=model.resizeZoneLocations(layout,layout.zones[0].id,3);
  const h=harness(layout,[],model,false,true), object=h.layout.objects[0], slot=h.layout.locations[0];
  h.pick={objectId:object.id,bayIndex:0,levelIndex:0,slotId:slot.id};
  h.pointer('dblclick');
  const first=h.rendered.at(-1), targetBoxes=first.boxes.filter(box=>box.partId===slot.id);
  const expected=require('../warehouse-webgl.js').projectScene(targetBoxes,{...first.camera,target:null,baseScale:null,zoom:1},800,600,null,null,new Set(),'solid').view;
  assert.deepEqual(first.camera.target,expected.fitTarget);
  assert.equal(first.camera.baseScale,expected.fitScale);
  h.pick={objectId:object.id,bayIndex:0,levelIndex:1};
  h.pointer('pointerdown'); h.pointer('pointermove',{clientX:140}); h.pointer('pointerup',{clientX:140});
  assert.equal(h.rendered.at(-1).selection,slot.id);
  h.pointer('dblclick');
  assert.equal(h.rendered.at(-1).selection.levelIndex,1);
  assert.equal(h.saves.length,0);
});

test('free placement edits retain codes without an extra confirmation; failed saves retain geometry', async () => {
  let layout=fresh(); layout=model.setZoneUsage(layout,layout.zones[0].id,'picking');
  layout=model.addLocation(layout,layout.zones[0].id,{x:0,z:0,width:200,depth:layout.objects[0].bays[0].depth});
  layout=model.setLocationCode(layout,layout.locations[0].id,'KEEP-CODE');
  const h=harness(layout); await h.click({mode:'locations'}); await h.click({action:'location-open'});
  assert.match(h.root.innerHTML,/data-placement-plane/);
  assert.match(h.root.innerHTML,/Locations · front view/);
  assert.doesNotMatch(h.root.innerHTML,/data-field="location\.(z|depth)"/);
  await h.change({field:'location.x'},150);
  assert.equal(h.layout.locations[0].placement.x,150); assert.equal(h.layout.locations[0].code,'KEEP-CODE');
  assert.equal(h.warnings.length,0);
  const saved=structuredClone(h.layout); h.failSave=true; await h.change({field:'location.x'},160);
  assert.deepEqual(h.layout,saved);
  h.failSave=false; await h.change({field:'location.width'},2000);
  assert.deepEqual(h.layout,saved); assert.match(h.root.innerHTML,/bounds/);
  await h.click({action:'location-duplicate'});
  assert.equal(h.layout.locations.length,2); assert.equal(h.layout.locations[1].code,'');
  assert.equal(h.warnings.length,0);
});

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
  assert.deepEqual(h.layout.locations.map(location => location.code), ['EXISTING-0001', 'R01-01-01-02', '', '', '', '']);
  const levelOnly = structuredClone(h.layout);
  await h.click({ action: 'generate-rack' });
  assert.deepEqual(h.layout.locations.map(location => location.code), ['EXISTING-0001', 'R01-01-01-02', 'R01-01-02-01', 'R01-01-02-02', 'R01-01-00-01', 'R01-01-00-02']);
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
  layout.objects[0].type = 'pallet-rack';
  const registry = [{ article_id: 'SYNTHETIC-1', master_data: { location: 'R01-03-02-01' } },
    { article_id: 'SYNTHETIC-2', master_data: { location: 'OUTSIDE-01' } }];
  const before = structuredClone({ layout, registry });
  const listeners = {}, search = { value: 'R01-03-02-01' }, painted = [];
  const root = { innerHTML: '', addEventListener(type, callback) { listeners[type] = callback; },
    querySelector(selector) { return selector === '[data-field="search"]' ? search : { appendChild() {}, focus() {} }; } };
  const canvas = { isConnected: true, setAttribute() {}, addEventListener() {} };
  const context = vm.createContext({ document: { createElement() { return canvas; } }, window: {
    OpenSlottingWarehouseScene: scene, addEventListener() {}, OpenSlottingWarehouseWebGL: {
      create() { return { available: () => true, render(boxes) { painted.push(boxes); } }; },
      projectScene() { return { view: { fitTarget: { x: 0, y: 0, z: 0 }, fitScale: 1 } }; }
    }
  } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'warehouse-analysis.js'), 'utf8'), context);
  const analysis = context.OpenSlottingWarehouseAnalysis.create({ root, model, getLayout: () => layout,
    getRegistry: () => registry, getWorkspaceId: () => 'synthetic', getLanguage: () => 'en' });
  analysis.render();
  listeners.input({ target: { dataset: { field: 'search' }, value: search.value } });
  listeners.click({ target: { closest() { return { dataset: { action: 'find' } }; } } });
  assert.match(root.innerHTML, /SYNTHETIC-1/);
  assert.match(root.innerHTML, /OUTSIDE-01/);
  assert.match(root.innerHTML, /Unassigned/);
  assert.match(root.innerHTML, /data-color-mode="structure" aria-pressed="true"/);
  assert.equal(painted.at(-1).find(part => part.kind === 'beam').color, scene.PALLET_PART_COLORS.beam);
  const matchedMarker = painted.at(-1).find(part => part.slotRef && part.slotRef.slotId === layout.locations[0].id);
  assert.equal(matchedMarker.color, '#45d3b1');
  listeners.click({ target: { closest() { return { dataset: { action: 'colors', colorMode: 'usage' } }; } } });
  assert.match(root.innerHTML, /data-color-mode="usage" aria-pressed="true"/);
  assert.equal(painted.at(-1).find(part => part.kind === 'beam').color, scene.PALLET_PART_COLORS.beam);
  assert.equal(painted.at(-1).find(part => part.slotRef && part.slotRef.slotId === layout.locations[0].id).color, model.USAGE_COLORS.unassigned);
  listeners.click({target:{closest(){return {dataset:{action:'markers'}};}}});
  assert.match(root.innerHTML,/data-action="markers" aria-pressed="false"/);
  assert.ok(!painted.at(-1).some(part=>part.kind==='location'||part.kind==='ground-scope'));
  listeners.click({target:{closest(){return {dataset:{action:'markers'}};}}});
  assert.ok(painted.at(-1).some(part=>part.kind==='location'));
  assert.deepEqual({ layout, registry }, before);
});


test('ground controls preserve codes, confirm disabling, support undo and protect failed saves', async () => {
  let layout=fresh();
  const zone=model.zoneForLevel(layout,layout.objects[0].bays[0].ground.id);
  layout=model.setZoneUsage(layout,zone.id,'picking');
  layout=model.resizeZoneLocations(layout,zone.id,3);
  layout=model.setLocationCode(layout,layout.locations[0].id,'FLOOR-01');
  const h=harness(layout); await h.click({mode:'locations'});
  await h.change({select:'level'},-1);
  assert.match(h.root.innerHTML,/Ground \(level 0\)/);
  await h.change({field:'location.width'},200);
  await h.change({field:'location.x'},100);
  assert.equal(h.layout.locations[0].code,'FLOOR-01');
  assert.equal(h.layout.locations[0].placement.x,100);
  const before=structuredClone(h.layout);
  h.accept=false; await h.change({field:'ground.enabled'},false,'checkbox');
  assert.deepEqual(h.layout,before);
  h.accept=true; h.failSave=true; await h.change({field:'ground.enabled'},false,'checkbox');
  assert.deepEqual(h.layout,before);
  h.failSave=false; await h.change({field:'ground.enabled'},false,'checkbox');
  assert.equal(h.layout.locations.length,0);
  assert.equal(h.layout.objects[0].bays[0].ground.enabled,false);
  await h.click({action:'undo'}); assert.deepEqual(h.layout,before);
});

function groundSelectionLayout() {
  let value=fresh();
  for(const zone of value.zones) {
    value=model.setZoneUsage(value,zone.id,'picking');
    value=model.resizeZoneLocations(value,zone.id,2);
  }
  return value;
}

async function groundPassagePreview() {
  const initial=groundSelectionLayout(),h=harness(initial,[],model,false,true),object=h.layout.objects[0];
  const slot=model.zoneLocations(h.layout,model.zoneForLevel(h.layout,object.bays[0].ground.id).id)[1];
  h.pick={objectId:object.id,bayIndex:0,levelIndex:-1,slotId:slot.id};h.pointer('pointerdown');h.pointer('pointerup');
  h.control('[data-tool="passage-height"]',1200);h.control('[data-tool="passage-levels"]',2);
  h.control('[data-tool="passage-route"]','');h.root.querySelector('[data-tool="grow-frames"]').checked=true;
  await h.click({action:'preview-passage'});
  assert.match(h.root.innerHTML,/data-action="apply-preview"/);
  return {h,initial,slot};
}

function assertPreviewGroundSelection(h) {
  assert.match(h.root.innerHTML,/data-nav-kind="slot" aria-current="true">Location 2/);
  assert.match(h.root.innerHTML,/data-nav-kind="level">Ground \(level 0\)/);
  assert.equal(h.rendered.at(-1).selection,null,'preview highlights its candidate object instead of a hidden original slot');
}

test('destructive passage previews preserve ground slot navigation through redraw and cancellation', async () => {
  for(const cancellation of ['button','escape']) {
    const {h,initial,slot}=await groundPassagePreview();
    assertPreviewGroundSelection(h);assert.deepEqual(h.layout,initial);assert.equal(h.saves.length,0);
    assert.ok(!h.rendered.at(-1).boxes.some(box=>box.partId===slot.id),'preview actually removes the ground location');
    h.render();await h.click({action:'markers'});await h.click({action:'markers'});
    assertPreviewGroundSelection(h);
    if(cancellation==='button') await h.click({action:'cancel-preview'});
    else await h.placement('keydown',null,{key:'Escape'});
    assert.doesNotMatch(h.root.innerHTML,/data-action="apply-preview"/);
    assertSlotSelection(h,slot.id);assert.deepEqual(h.layout,initial);assert.equal(h.saves.length,0);
    await h.click({action:'focus'});
    const actual=h.rendered.at(-1),boxes=actual.boxes.filter(box=>box.partId===slot.id);
    const expected=require('../warehouse-webgl.js').projectScene(boxes,{...actual.camera,target:null,baseScale:null,zoom:1},800,600,null,null,new Set(),'solid').view;
    assert.deepEqual(actual.camera.target,expected.fitTarget);assert.equal(actual.camera.baseScale,expected.fitScale);
  }
});

test('failed or unconfirmed passage saves preserve the ground slot through subsequent cancellation', async () => {
  for(const failure of ['save','confirmation']) {
    const {h,initial,slot}=await groundPassagePreview();
    h.failSave=failure==='save';h.accept=failure!=='confirmation';
    await h.click({action:'apply-preview'});
    assert.deepEqual(h.layout,initial);assert.equal(h.saves.length,0);assertPreviewGroundSelection(h);
    assert.match(h.root.innerHTML,/data-action="apply-preview"/);
    await h.click({action:'cancel-preview'});assertSlotSelection(h,slot.id);assert.deepEqual(h.layout,initial);
  }
});

test('successfully applying a passage reconciles the removed ground selection only after save', async () => {
  const {h,initial,slot}=await groundPassagePreview();
  assertPreviewGroundSelection(h);
  await h.click({action:'apply-preview'});
  assert.equal(h.saves.length,1);assert.equal(h.layout.objects[0].bays[0].ground.enabled,false);
  assert.doesNotMatch(h.root.innerHTML,/data-action="apply-preview"|data-nav-kind="slot"/);
  assert.match(h.root.innerHTML,/data-nav-kind="level" aria-current="true"/);
  assert.equal(h.rendered.at(-1).selection.levelIndex,0);
  await h.click({action:'undo'});assert.deepEqual(h.layout,initial);
});

test('disabling the selected ground scope returns breadcrumb, highlight and focus to an existing level', async () => {
  for(const mode of ['structure','zones','locations']) {
    const initial=groundSelectionLayout(),h=harness(initial,[],model,false,true),object=h.layout.objects[0];
    const groundZone=model.zoneForLevel(h.layout,object.bays[0].ground.id),slot=model.zoneLocations(h.layout,groundZone.id)[1];
    h.pick={objectId:object.id,bayIndex:0,levelIndex:-1,slotId:slot.id};
    h.pointer('pointerdown');h.pointer('pointerup');await h.click({mode});
    assertSlotSelection(h,slot.id);
    await h.change({field:'ground.enabled'},false,'checkbox');
    assert.equal(h.layout.objects[0].bays[0].ground.enabled,false);
    assert.ok(!h.layout.locations.some(item=>item.id===slot.id));
    assert.match(h.root.innerHTML,/data-nav-kind="level" aria-current="true">Level 1/);
    assert.doesNotMatch(h.root.innerHTML,/data-nav-kind="slot"/);
    assert.equal(h.rendered.at(-1).selection.levelIndex,0);
    await h.click({action:'focus'});
    const actual=h.rendered.at(-1),boxes=actual.boxes.filter(box=>box.object.id===object.id&&box.slotRef&&box.slotRef.bayIndex===0&&box.slotRef.levelIndex===0);
    const expected=require('../warehouse-webgl.js').projectScene(boxes,{...actual.camera,target:null,baseScale:null,zoom:1},800,600,null,null,new Set(),'solid').view;
    assert.deepEqual(actual.camera.target,expected.fitTarget);assert.equal(actual.camera.baseScale,expected.fitScale);
    await h.click({action:'undo'});assert.deepEqual(h.layout,initial);
    await h.click({action:'redo'});
    assert.match(h.root.innerHTML,/data-nav-kind="level" aria-current="true"/);
    assert.equal(h.rendered.at(-1).selection.levelIndex,0);
  }
});

test('cancelled, failed and locked ground disables retain the selected ground location', async () => {
  const initial=groundSelectionLayout(),h=harness(initial,[],model,false,true),object=h.layout.objects[0];
  const slot=model.zoneLocations(h.layout,model.zoneForLevel(h.layout,object.bays[0].ground.id).id)[1];
  h.pick={objectId:object.id,bayIndex:0,levelIndex:-1,slotId:slot.id};h.pointer('pointerdown');h.pointer('pointerup');
  await h.click({mode:'locations'});
  h.accept=false;await h.change({field:'ground.enabled'},false,'checkbox');
  assert.deepEqual(h.layout,initial);assertSlotSelection(h,slot.id);
  h.accept=true;h.failSave=true;await h.change({field:'ground.enabled'},false,'checkbox');
  assert.deepEqual(h.layout,initial);assertSlotSelection(h,slot.id);
  h.failSave=false;await h.click({action:'toggle-lock'});
  const locked=structuredClone(h.layout);await h.change({field:'ground.enabled'},false,'checkbox');
  assert.deepEqual(h.layout,locked);assertSlotSelection(h,slot.id);
  assert.equal(h.saves.length,1,'only the explicit lock change was saved');
});

test('ground toggles preserve a selected elevated location', async () => {
  const h=harness(groundSelectionLayout(),[],model,false,true),object=h.layout.objects[0];
  const slot=model.zoneLocations(h.layout,model.zoneForLevel(h.layout,object.bays[0].levels[1].id).id)[1];
  h.pick={objectId:object.id,bayIndex:0,levelIndex:1,slotId:slot.id};h.pointer('pointerdown');h.pointer('pointerup');
  await h.click({mode:'locations'});
  for(const enabled of [false,true]) {
    await h.change({field:'ground.enabled'},enabled,'checkbox');
    assert.equal(h.layout.objects[0].bays[0].ground.enabled,enabled);
    assertSlotSelection(h,slot.id);
  }
});

test('rack builder shows front orientation before insertion and retains ground choices per bay', async () => {
  const h=harness(model.createLayout());
  h.control('#wh-recipe','shelf-rack');
  await h.click({action:'add'});
  assert.match(h.root.innerHTML,/Orientation in the hall plan/);
  assert.match(h.root.innerHTML,/Gold marks the access side/);
  await h.change({wizardField:'rotation'},90,'number');
  await h.click({wizardAction:'next'});
  assert.match(h.root.innerHTML,/rotate\(90\)/);
  assert.match(h.root.innerHTML,/data-wizard-field="bay.groundEnabled"/);
  await h.change({wizardField:'bay.groundEnabled',index:'0'},false,'checkbox');
  await h.click({wizardAction:'next'}); await h.click({wizardAction:'finish'});
  assert.equal(h.layout.objects[0].rotation,90);
  assert.equal(h.layout.objects[0].bays[0].ground.enabled,false);
  assert.equal(h.layout.objects[0].bays[1].ground.enabled,true);
  assert.equal(h.layout.locations.length,0);
});


test('marker visibility is a session display preference and never enters saves or undo', async () => {
  let layout=fresh(); layout=model.setZoneUsage(layout,layout.zones[0].id,'picking');
  layout=model.resizeZoneLocations(layout,layout.zones[0].id,3);
  const h=harness(layout), before=structuredClone(layout);
  assert.match(h.root.innerHTML,/data-action="markers" aria-pressed="true"/);
  await h.click({action:'markers'});
  assert.match(h.root.innerHTML,/data-action="markers" aria-pressed="false"/);
  await h.click({mode:'locations'});
  assert.match(h.root.innerHTML,/data-action="markers" aria-pressed="false"/);
  assert.deepEqual(h.layout,before); assert.equal(h.saves.length,0);
  h.workspaceId='another-workspace'; h.render();
  assert.match(h.root.innerHTML,/data-action="markers" aria-pressed="true"/);
});
