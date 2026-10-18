'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../warehouse.js');
const scene = require('../warehouse-scene.js');
const renderer = require('../warehouse-webgl.js');
const baseline = require('./fixtures/warehouse-webgl-baseline.cjs');
const camera = { yaw:0, pitch:.6, zoom:1, baseScale:.1 };

function fixture() {
  const rack = model.createRack('pallet-rack',{bayCount:1,levelCount:2});
  rack.bays[0].levels[0].deck = true;
  let layout = model.normalizeLayout({...model.createLayout(),objects:[rack]});
  for (const zone of layout.zones) {
    layout = model.setZoneUsage(layout,zone.id,'picking');
    layout = model.resizeZoneLocations(layout,zone.id,3);
  }
  return layout;
}

test('gray physical decks and component colors remain visible in every marker color mode', () => {
  const layout=fixture(), before=structuredClone(layout);
  for (const colorMode of ['structure','usage']) {
    const boxes=scene.buildBoxes(model,layout,null,{colorMode});
    assert.ok(boxes.filter(box=>box.kind==='deck').every(box=>box.color===scene.PALLET_PART_COLORS.deck));
    assert.ok(boxes.filter(box=>box.kind==='beam').every(box=>box.color===scene.PALLET_PART_COLORS.beam));
    assert.ok(boxes.filter(box=>box.kind==='location').every(box=>box.markerInset>0));
    assert.equal(boxes.filter(box=>box.kind==='deck').length,1,'no deck is invented for the other level');
  }
  const hidden=scene.buildBoxes(model,layout,null,{showLocations:false});
  assert.ok(!hidden.some(box=>box.kind==='location'||box.kind==='ground-scope'));
  assert.deepEqual(hidden,scene.buildBoxes(model,layout).filter(box=>box.kind!=='location'&&box.kind!=='ground-scope'));
  assert.deepEqual(layout,before);
});

test('location display is only inset outline geometry while full original faces remain pickable', () => {
  const layout=fixture(), boxes=scene.buildBoxes(model,layout).filter(box=>box.kind==='location');
  const original=baseline.projectScene(boxes,camera,1440,1024,null,null,new Set(),'solid');
  const actual=renderer.projectScene(boxes,camera,1440,1024,null,null,new Set(),'solid');
  assert.equal(actual.opaque.length,0);
  assert.equal(actual.transparent.length,0,'no per-location transparent draw calls');
  assert.equal(actual.markerSelection.length,0);
  assert.deepEqual(actual.pickMarkers,original.opaque);
  assert.deepEqual(actual.pickMap,original.pickMap);
  assert.deepEqual(actual.view,original.view);
  assert.ok(actual.edges.length>0);
});

test('only the selected location receives a faint surface tint and rack selection retains dark material edges', () => {
  const layout=fixture(), boxes=scene.buildBoxes(model,layout), location=layout.locations[0];
  const selected=renderer.projectScene(boxes,camera,1440,1024,layout.objects[0].id,location.id,new Set(),'solid');
  assert.equal(selected.markerSelection.length,60);
  for(let index=6;index<selected.markerSelection.length;index+=10) assert.ok(Math.abs(selected.markerSelection[index]-.14)<1e-6);
  const physical=boxes.filter(box=>box.kind!=='location'&&box.kind!=='ground-scope');
  const plain=renderer.projectScene(physical,camera,1440,1024,null,null,new Set(),'solid');
  const rackSelected=renderer.projectScene(physical,camera,1440,1024,layout.objects[0].id,null,new Set(),'solid');
  assert.deepEqual(rackSelected.opaque,plain.opaque);
  assert.deepEqual(rackSelected.edges,plain.edges);
});

test('position numbers are drawn only at readable zoom and visual insets do not shrink picking', () => {
  const layout=fixture(), box=scene.buildBoxes(model,layout).find(box=>box.kind==='location');
  const numbered={...box,number:10};
  const close=renderer.projectScene([numbered],camera,800,600,null,null,new Set(),'solid');
  assert.equal(close.edges.length,240,'four outline edges plus eight digit segments');
  const far=renderer.projectScene([numbered],{...camera,baseScale:.01},800,600,null,null,new Set(),'solid');
  assert.equal(far.edges.length,80,'only four outline edges at a distance');
  const unnumbered=renderer.projectScene([{...numbered,number:null}],camera,800,600,null,null,new Set(),'solid');
  const xs=buffer=>Array.from(buffer).filter((_,index)=>index%10===0);
  assert.ok(Math.min(...xs(unnumbered.edges))>Math.min(...xs(unnumbered.pickMarkers)));
  assert.ok(Math.max(...xs(unnumbered.edges))<Math.max(...xs(unnumbered.pickMarkers)));
});

test('level and bay highlighting changes outlines only, preserves picking and excludes location surface tints', () => {
  const layout=fixture(), boxes=scene.buildBoxes(model,layout), object=layout.objects[0];
  const plain=renderer.projectScene(boxes,camera,800,600,object.id,null,new Set(),'solid');
  for(const levelIndex of [-1,0,1,undefined]) {
    const highlighted=renderer.projectScene(boxes,camera,800,600,object.id,{objectId:object.id,bayIndex:0,levelIndex},new Set(),'solid');
    assert.deepEqual(highlighted.opaque,plain.opaque);
    assert.deepEqual(highlighted.pickMarkers,plain.pickMarkers);
    assert.deepEqual(highlighted.pickMap,plain.pickMap);
    assert.equal(highlighted.markerSelection.length,0,'scoped selection never floods all slot surfaces');
    if(levelIndex!==-1) assert.notDeepEqual(highlighted.edges,plain.edges);
  }
});
