'use strict';

// Deterministic synthetic inputs, shared by parity tests and production benchmarks.
function layoutFixture(model, count, mode = 'spread', maxSlots = false) {
  const objects = [];
  const zones = [], locations = [];
  const areas = ['wall', 'gate', 'door', 'emergency-exit', 'aisle', 'goods-in', 'goods-out'];
  for (let index = 0; index < count; index += 1) {
    const rack = index % 3 === 0;
    let object = rack ? model.createRack(maxSlots ? 'pallet-rack' : index % 2 ? 'shelf-rack' : 'pallet-rack',
      { id: 'object-' + index, bayCount: maxSlots ? 5 : 3, levelCount: maxSlots ? 5 : 3 }) :
      model.createArea(areas[index % areas.length], { id: 'object-' + index });
    if (rack && maxSlots) {
      object = model.resizeRack(object, 5, 5, 4);
      object.uprights.forEach(function (upright) { upright.height = 9000; });
    }
    object.name = 'Synthetic ' + index;
    object.x = mode === 'dense' ? -2000 + index % 7 * 20 : mode === 'vertical' ? -1000 : -200000 + index % 25 * 18000;
    object.z = mode === 'dense' ? -1500 + index % 11 * 20 : -200000 + (mode === 'vertical' ? index * 3000 : Math.floor(index / 25) * 18000);
    object.rotation = [-35, 0, 90, 180, 12, -270][index % 6];
    object.locked = index % 17 === 0;
    if (rack) {
      object.bays.forEach(function (bay, bayIndex) {
        bay.id = 'bay-' + index + '-' + bayIndex;
        bay.levels.forEach(function (level, levelIndex) {
          level.id = 'level-' + index + '-' + bayIndex + '-' + levelIndex;
          const slots = level.positions || Array.from({ length: maxSlots ? 4 : object.type === 'pallet-rack' ? 2 : 1 }, function () { return {}; });
          const zoneId = 'zone-' + index + '-' + bayIndex + '-' + levelIndex;
          if (model.LAYOUT_VERSION >= 2) zones.push({ id: zoneId, objectId: object.id, bayId: bay.id,
            levelId: level.id, usage: levelIndex % 2 ? 'reserve' : 'picking' });
          slots.forEach(function (slot, slotIndex) {
            slot.id = 'slot-' + index + '-' + bayIndex + '-' + levelIndex + '-' + slotIndex;
            slot.code = 'R' + index + '-B' + bayIndex + '-L' + levelIndex + '-S' + slotIndex;
            if (model.LAYOUT_VERSION >= 2) locations.push({ id: slot.id, code: slot.code, zoneId, positionIndex: slotIndex, legacy: false });
          });
        });
      });
      object.uprights.forEach(function (stand, uprightIndex) { stand.id = 'upright-' + index + '-' + uprightIndex; });
    }
    objects.push(object);
  }
  return model.normalizeLayout(model.LAYOUT_VERSION >= 2
    ? { version: model.LAYOUT_VERSION, objects, zones, locations }
    : { version: model.LAYOUT_VERSION, objects });
}

function uncodedScopeFixture(model) {
  const objects = [], zones = [];
  for (let index = 0; index < 150; index++) {
    const rack = model.createRack('shelf-rack', { id: 'scope-rack-' + index, bayCount: 30, levelCount: 12 });
    rack.x = index % 10 * 35000; rack.z = Math.floor(index / 10) * 12000;
    rack.uprights.forEach(function (upright, stand) { upright.id = 'scope-upright-' + index + '-' + stand; upright.height = 9000; });
    rack.bays.forEach(function (bay, bayIndex) {
      bay.id = 'scope-bay-' + index + '-' + bayIndex;
      bay.levels.forEach(function (level, levelIndex) {
        level.id = 'scope-level-' + index + '-' + bayIndex + '-' + levelIndex;
        zones.push({ id: 'scope-zone-' + index + '-' + bayIndex + '-' + levelIndex,
          objectId: rack.id, bayId: bay.id, levelId: level.id, usage: 'unassigned' });
      });
    });
    objects.push(rack);
  }
  return model.normalizeLayout({ version: model.LAYOUT_VERSION, objects, zones, locations: [] });
}

module.exports = { layoutFixture, uncodedScopeFixture };
