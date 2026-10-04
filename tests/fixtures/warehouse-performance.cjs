'use strict';

// Deterministic synthetic inputs, shared by parity tests and production benchmarks.
function layoutFixture(model, count, mode = 'spread', maxSlots = false) {
  const objects = [];
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
          level.positions.forEach(function (slot, slotIndex) {
            slot.id = 'slot-' + index + '-' + bayIndex + '-' + levelIndex + '-' + slotIndex;
            slot.code = 'R' + index + '-B' + bayIndex + '-L' + levelIndex + '-S' + slotIndex;
          });
        });
      });
      object.uprights.forEach(function (stand, uprightIndex) { stand.id = 'upright-' + index + '-' + uprightIndex; });
    }
    objects.push(object);
  }
  return model.normalizeLayout({ version: model.LAYOUT_VERSION, objects: objects });
}

module.exports = { layoutFixture };
