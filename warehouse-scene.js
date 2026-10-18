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
    const usageColors = options && options.colorMode === 'usage';
    const showLocations = !options || options.showLocations !== false;
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
            if (object.type === 'pallet-rack') color = PALLET_PART_COLORS[part.kind] || color;
            if (part.kind === 'deck') color = PALLET_PART_COLORS.deck;
          }
          boxes.push(Object.assign({}, part, { object: frame, color: color, slotRef: scopeRef }));
        });
      });
      if (!model.RACK_TYPES.includes(object.type)) return;
      if (options && options.orientationObjectId === object.id) {
        const footprint = model.objectFootprint(object), width = footprint.width, depth = footprint.depth, color = '#ffd78a';
        boxes.push({ object: object, x: 0, y: 12, z: depth + 5, width: width, height: 12, depth: 25, kind: 'orientation', color: color });
        boxes.push({ object: object, x: width / 2 - 9, y: 12, z: depth, width: 18, height: 12, depth: 600, kind: 'orientation', color: color });
        const tip = model.rackFront(object).tip;
        [-45,45].forEach(function (angle) {
          boxes.push({ object: Object.assign({}, object, { x: tip.x, z: tip.z, rotation: object.rotation + angle }),
            x: -9, y: 12, z: -180, width: 18, height: 12, depth: 180, kind: 'orientation', color: color });
        });
      }
      let x = 0;
      object.bays.forEach(function (bay, bayIndex) {
        x += object.uprights[bayIndex].width;
        let y = 0;
        const displayLevels = bay.ground && bay.ground.enabled ? [model.scopeLevel(object, bayIndex, -1)].concat(bay.levels) : bay.levels;
        displayLevels.forEach(function (level, displayIndex) {
          const levelIndex = level.ground ? -1 : displayIndex - (bay.ground && bay.ground.enabled ? 1 : 0);
          y += level.clearHeight;
          const zone = index.zonesByLevel.get(level.id), locations = zone && index.locationsByZone.get(zone.id) || [];

          if (showLocations && level.ground && !locations.length) boxes.push({ object: object, x: x, y: 0, z: 0, width: bay.width,
            height: 2, depth: bay.depth, partId: level.id, kind: 'ground-scope',
            color: model.USAGE_COLORS[zone ? zone.usage : 'unassigned'] || model.USAGE_COLORS.unassigned,
            slotRef: { objectId: object.id, bayIndex: bayIndex, levelIndex: -1, zoneId: zone && zone.id } });
          (showLocations ? locations : []).forEach(function (location, positionIndex) {
            boxes.push({ object: object, x: x + location.placement.x,
              y: y + level.thickness + (level.deck ? level.deckThickness : 0) + 2, z: location.placement.z,
              width: location.placement.width, height: 8, depth: location.placement.depth, partId: location.id, kind: 'location',
              markerInset: Math.min(12,location.placement.width/8,location.placement.depth/8),
              number: positionIndex + 1,
              color: usageColors ? model.USAGE_COLORS[zone.usage] || '#8795a4' : matchedSlots.has(location.id) ? '#45d3b1' : location.code ? '#62b3cb' : '#607c8b',
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
