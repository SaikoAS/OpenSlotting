'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../warehouse.js');
const scene = require('../warehouse-scene.js');

test('technical and analysis views share geometry while article matches change only marker colors', () => {
  const rack = model.createRack('pallet-rack', { bayCount: 1, levelCount: 1 });
  const slot = rack.bays[0].levels[0].positions[0];
  slot.code = 'R-01';
  const layout = { version: model.LAYOUT_VERSION, objects: [rack, model.createArea('wall')] };
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
