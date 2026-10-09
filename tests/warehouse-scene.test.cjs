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

test('levels have distinct functional colors and scope picking without any location markers', () => {
  let layout = model.normalizeLayout({ ...model.createLayout(), objects: [model.createRack('shelf-rack', { bayCount: 1, levelCount: 3 })] });
  layout = model.setZoneUsage(layout, layout.zones[0].id, 'picking');
  layout = model.setZoneUsage(layout, layout.zones[1].id, 'reserve');
  const before = structuredClone(layout);
  const boxes = scene.buildBoxes(model, layout);
  for (const zone of layout.zones) {
    const level = boxes.filter((box) => box.slotRef && box.slotRef.zoneId === zone.id);
    assert.ok(level.length >= 2);
    assert.ok(level.every((box) => box.color === model.USAGE_COLORS[zone.usage]));
  }
  assert.equal(boxes.filter((box) => box.slotRef && box.slotRef.slotId).length, 0);
  assert.deepEqual(layout, before);
});
