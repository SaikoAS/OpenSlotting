(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.OpenSlottingWarehouseScene = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const COLORS = {
    'pallet-rack': '#6c849b', 'shelf-rack': '#7a91a7', wall: '#647184', gate: '#cb9e54', door: '#b5a56d',
    'emergency-exit': '#42bd8a', aisle: '#336372', 'goods-in': '#477f88', 'goods-out': '#825d7e'
  };
  const PALLET_PART_COLORS = {
    upright: '#397fc4', header: '#397fc4', base: '#397fc4', beam: '#f28b35', deck: '#b8c2ca'
  };
  function buildBoxes(model, warehouse, matches, options) {
    const boxes = [], matchedSlots = matches && matches.bySlot || new Map();
    const structureColors = options && options.colorMode === 'structure';
    const index = model.createScopeIndex(warehouse);
    warehouse.objects.forEach(function (object) {
      const frames = object.type === 'aisle' ? model.routeSegments(object) : [object];
      frames.forEach(function (frame) {
        model.physicalParts(frame).forEach(function (part) {
          let color = part.kind === 'leaf' ? '#8eaf9e' : COLORS[object.type], scopeRef = null;
          if (model.RACK_TYPES.includes(object.type)) {
            color = '#7790a6';
            if (part.bayIndex !== undefined) {
              const level = object.bays[part.bayIndex].levels[part.levelIndex], zone = index.zonesByLevel.get(level.id);
              color = model.USAGE_COLORS[zone ? zone.usage : 'unassigned'] || model.USAGE_COLORS.unassigned;
              scopeRef = { objectId: object.id, bayIndex: part.bayIndex, levelIndex: part.levelIndex, zoneId: zone && zone.id };
            }
            if (structureColors && object.type === 'pallet-rack') color = PALLET_PART_COLORS[part.kind] || color;
          }
          boxes.push(Object.assign({}, part, { object: frame, color: color, slotRef: scopeRef }));
        });
      });
      if (!model.RACK_TYPES.includes(object.type)) return;
      let x = 0;
      object.bays.forEach(function (bay, bayIndex) {
        x += object.uprights[bayIndex].width;
        let y = 0;
        bay.levels.forEach(function (level, levelIndex) {
          y += level.clearHeight;
          const zone = index.zonesByLevel.get(level.id), locations = zone && index.locationsByZone.get(zone.id) || [];
          const width = Math.min(180, bay.width / ((locations.length || 1) * 3));
          locations.forEach(function (location, positionIndex) {
            boxes.push({ object: object, x: x + (positionIndex + 0.5) * bay.width / locations.length - width / 2,
              y: y + level.thickness + (level.deck ? level.deckThickness : 0) + 8, z: Math.max(5, bay.depth / 2 - 50),
              width: width, height: 18, depth: 100, partId: location.id,
              color: matchedSlots.has(location.id) ? '#45d3b1' : location.code ? '#62b3cb' : '#465b69',
              slotRef: { objectId: object.id, bayIndex: bayIndex, levelIndex: levelIndex, positionIndex: positionIndex, slotId: location.id } });
          });
          y += level.thickness;
        });
        x += bay.width;
      });
    });
    return boxes;
  }
  return { buildBoxes: buildBoxes, COLORS: COLORS, PALLET_PART_COLORS: PALLET_PART_COLORS };
}));
