(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.OpenSlottingWarehouseScene = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const COLORS = {
    'pallet-rack': '#6c849b', 'shelf-rack': '#7a91a7', wall: '#647184', gate: '#cb9e54', door: '#b5a56d',
    'emergency-exit': '#42bd8a', aisle: '#336372', 'goods-in': '#477f88', 'goods-out': '#825d7e'
  };

  function buildBoxes(model, warehouse, matches) {
    const boxes = [];
    const matchedSlots = matches && matches.bySlot ? matches.bySlot : new Map();
    const scopeIndex = model.createScopeIndex(warehouse);
    const zones = scopeIndex.zonesByLevel, locationsByZone = scopeIndex.locationsByZone;
    function box(object, x, y, z, width, height, depth, color, slotRef) {
      boxes.push({ object: object, x: x, y: y, z: z, width: width, height: height, depth: depth,
        color: color, slotRef: slotRef || null });
    }
    warehouse.objects.forEach(function (object) {
      if (!model.RACK_TYPES.includes(object.type)) {
        if (object.type === 'gate' || object.type === 'door' || object.type === 'emergency-exit') {
          const post = Math.min(140, object.width / 6);
          box(object, 0, 0, 0, post, object.height, object.depth, COLORS[object.type]);
          box(object, object.width - post, 0, 0, post, object.height, object.depth, COLORS[object.type]);
          box(object, 0, object.height - post, 0, object.width, post, object.depth, COLORS[object.type]);
          if (object.type === 'door') {
            box(object, post, 0, (object.depth - 35) / 2, object.width - 2 * post,
              object.height - post, 35, '#8eaf9e');
          }
        } else {
          box(object, 0, 0, 0, object.width, object.height, object.depth, COLORS[object.type]);
        }
        return;
      }
      let offset = 0;
      object.bays.forEach(function (bay, bayIndex) {
        const upright = object.uprights[bayIndex];
        const postDepth = Math.min(90, upright.depth / 3);
        box(object, offset, 0, 0, upright.width, upright.height, postDepth, '#7790a6');
        box(object, offset, 0, upright.depth - postDepth, upright.width, upright.height, postDepth, '#7790a6');
        box(object, offset, upright.height - 85, 0, upright.width, 85, upright.depth, '#7790a6');
        box(object, offset, 0, 0, upright.width, 75, upright.depth, '#7790a6');
        offset += upright.width;
        let y = 0;
        bay.levels.forEach(function (level, levelIndex) {
          y += level.clearHeight;
          const zone = zones.get(level.id);
          const zoneColor = model.USAGE_COLORS[zone ? zone.usage : 'unassigned'] || model.USAGE_COLORS.unassigned;
          const scopeRef = { objectId: object.id, bayIndex: bayIndex, levelIndex: levelIndex, zoneId: zone && zone.id };
          box(object, offset, y, 0, bay.width, level.thickness, 75, zoneColor, scopeRef);
          box(object, offset, y, bay.depth - 75, bay.width, level.thickness, 75, zoneColor, scopeRef);
          if (level.deck) box(object, offset, y + level.thickness, 0, bay.width, level.deckThickness, bay.depth, zoneColor, scopeRef);
          const locations = zone && locationsByZone.get(zone.id) || [];
          const markerWidth = Math.min(180, bay.width / ((locations.length || 1) * 3));
          locations.forEach(function (slot, index) {
            const markerX = offset + (index + 0.5) * bay.width / locations.length - markerWidth / 2;
            const color = matchedSlots.has(slot.id) ? '#45d3b1' : slot.code ? '#62b3cb' : '#465b69';
            box(object, markerX, y + level.thickness + (level.deck ? level.deckThickness : 0) + 8,
              Math.max(5, bay.depth / 2 - 50), markerWidth, 18, 100, color,
              { objectId: object.id, bayIndex: bayIndex, levelIndex: levelIndex, positionIndex: index, slotId: slot.id });
          });
          y += level.thickness;
        });
        offset += bay.width;
      });
      const end = object.uprights[object.uprights.length - 1];
      const endPostDepth = Math.min(90, end.depth / 3);
      box(object, offset, 0, 0, end.width, end.height, endPostDepth, '#7790a6');
      box(object, offset, 0, end.depth - endPostDepth, end.width, end.height, endPostDepth, '#7790a6');
      box(object, offset, end.height - 85, 0, end.width, 85, end.depth, '#7790a6');
      box(object, offset, 0, 0, end.width, 75, end.depth, '#7790a6');
    });
    return boxes;
  }

  return { buildBoxes: buildBoxes, COLORS: COLORS };
}));
