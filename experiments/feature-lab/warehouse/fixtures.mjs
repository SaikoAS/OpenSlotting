// Deterministic, synthetic fixtures. No customer files.
export function layoutFixture(model, count, mode = 'spread') {
  const objects = [];
  const areaTypes = ['wall', 'gate', 'door', 'emergency-exit', 'aisle', 'goods-in', 'goods-out'];
  for (let i = 0; i < count; i++) {
    const rack = i % 3 === 0;
    const object = rack ? model.createRack(i % 2 ? 'shelf-rack' : 'pallet-rack', { id: 'object-' + i, bayCount: 3, levelCount: 3 })
      : model.createArea(areaTypes[i % areaTypes.length], { id: 'object-' + i });
    object.name = 'Synthetic ' + i;
    object.x = mode === 'dense' ? -2000 + i % 7 * 20 : mode === 'vertical' ? -1000 : -200000 + i % 25 * 14000;
    object.z = mode === 'dense' ? -1500 + i % 11 * 20 : -200000 + (mode === 'vertical' ? i : Math.floor(i / 25)) * 13000;
    object.rotation = [-35, 0, 90, 180, 12, -270][i % 6];
    object.locked = i % 17 === 0;
    if (rack) {
      object.bays.forEach((bay, bi) => {
        bay.id = `bay-${i}-${bi}`;
        bay.levels.forEach((level, li) => {
          level.id = `level-${i}-${bi}-${li}`;
          level.positions.forEach((slot, si) => { slot.id = `slot-${i}-${bi}-${li}-${si}`; slot.code = `R${i}-B${bi}-L${li}-S${si}`; });
        });
      });
      object.uprights.forEach((stand, ui) => { stand.id = `upright-${i}-${ui}`; });
    }
    objects.push(object);
  }
  return { version: model.LAYOUT_VERSION, objects };
}

export function registryFixture(model, layout, count) {
  const slots = model.listSlots(layout);
  return Array.from({ length: count }, (_, i) => ({ article_id: 'article-' + i,
    master_data: { location: i % 11 === 0 ? '' : i % 13 === 0 ? 'MISSING-' + i : ' ' + slots[i % slots.length].code + ' ',
      article_name: 'Synthetic article ' + i } }));
}

export function profileFixture(columns = 39) {
  return { id: 'profile-synthetic', name: 'Synthetic source', sourceType: 'order-lines',
    headers: Array.from({ length: columns }, (_, i) => 'Column ' + i),
    mapping: { article: 0, quantity: 1, date: 2 }, customFieldMapping: { 'custom-one': 3 },
    preparationRules: {}, sourceRules: [{ sourcePosition: 4, type: 'exclude-empty', name: 'Require source',
      description: 'Synthetic rule', enabled: true, includeInProfile: true }],
    createdAt: '2026-10-04T10:00:00.000Z', updatedAt: '2026-10-04T10:00:00.000Z' };
}
