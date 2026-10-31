'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../warehouse.js');
const scene = require('../warehouse-scene.js');

test('technical and analysis views share geometry while article matches change only marker colors', () => {
  const rack = model.createRack('pallet-rack', { bayCount: 1, levelCount: 1 });
  let layout = model.normalizeLayout({ ...model.createLayout(), objects: [rack, model.createArea('wall')] });
  layout = model.setZoneUsage(layout, layout.zones[0].id, 'picking');
  layout = model.resizeZoneLocations(layout, layout.zones[0].id, 1);
  const slot = layout.locations[0];
  slot.code = 'R-01';
  const before = JSON.stringify(layout);
  const technical = scene.buildBoxes(model, layout);
  const matches = model.matchArticles(layout, [
    { article_id: 'A-1', master_data: { location: 'R-01', article_name: 'Test article' } }
  ]);
  const analysis = scene.buildBoxes(model, layout, matches);
  const technicalSlot = technical.find((box) => box.slotRef && box.slotRef.slotId === slot.id);
  const analysisSlot = analysis.find((box) => box.slotRef && box.slotRef.slotId === slot.id);

  assert.equal(technical.length, analysis.length);
  assert.deepEqual(technicalSlot.slotRef, analysisSlot.slotRef);
  assert.equal(technicalSlot.color, '#62b3cb');
  assert.equal(analysisSlot.color, '#45d3b1');
  assert.equal(JSON.stringify(layout), before);
});

test('physical decks remain gray and scopes remain pickable without configured locations', () => {
  let layout = model.normalizeLayout({ ...model.createLayout(), objects: [model.createRack('shelf-rack', { bayCount: 1, levelCount: 3 })] });
  layout = model.setZoneUsage(layout, layout.zones[0].id, 'picking');
  layout = model.setZoneUsage(layout, layout.zones[1].id, 'reserve');
  const before = structuredClone(layout);
  const boxes = scene.buildBoxes(model, layout);
  for (const zone of layout.zones) {
    const level = boxes.filter((box) => box.slotRef && box.slotRef.zoneId === zone.id);
    assert.ok(level.length >= (zone.levelId === layout.objects[0].bays[0].ground.id ? 1 : 2));
    assert.ok(level.filter(box => box.kind === 'deck').every(box => box.color === scene.PALLET_PART_COLORS.deck));
    assert.ok(level.filter(box => box.kind === 'ground-scope').every(box => box.color === model.USAGE_COLORS[zone.usage]));
  }
  assert.equal(boxes.filter((box) => box.slotRef && box.slotRef.slotId).length, 0);
  assert.deepEqual(layout, before);
});

test('access-side paint can show every rotated rack without changing physical or location geometry',()=>{
  const objects=[model.createRack('pallet-rack',{bayCount:2,levelCount:2}),model.createRack('shelf-rack',{bayCount:1,levelCount:2}),model.createArea('wall')];
  objects[0].rotation=37;objects[1].rotation=90;objects[1].x=10000;
  const value=model.normalizeLayout({...model.createLayout(),objects}),before=structuredClone(value);
  const plain=scene.buildBoxes(model,value),marked=scene.buildBoxes(model,value,null,{showOrientation:true});
  assert.deepEqual(marked.filter(b=>b.kind!=='orientation'),plain);assert.deepEqual(value,before);
  const paint=marked.filter(b=>b.kind==='orientation');assert.equal(paint.length,8);assert.ok(paint.every(b=>b.color==='#ffd78a'));
  for(const rack of value.objects.filter(o=>model.RACK_TYPES.includes(o.type))){
    const stripe=paint.find(b=>b.object.id===rack.id),size=model.objectFootprint(rack);
    assert.equal(stripe.width,size.width);assert.equal(stripe.z,size.depth+5);assert.equal(stripe.object.rotation,rack.rotation);
  }
  assert.equal(scene.buildBoxes(model,value,null,{orientationObjectId:value.objects[0].id}).filter(b=>b.kind==='orientation').length,4);
});
