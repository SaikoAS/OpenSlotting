(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.OpenSlottingWarehouseFactory = factory;
    root.OpenSlottingWarehouse = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const LAYOUT_VERSION = 2;
  const USAGES = ['unassigned', 'picking', 'reserve'];
  const USAGE_COLORS = { unassigned: '#8795a4', picking: '#55c69c', reserve: '#c7a0ef' };
  const RACK_TYPES = ['pallet-rack', 'shelf-rack'];
  const AREA_TYPES = ['wall', 'gate', 'door', 'emergency-exit', 'aisle', 'goods-in', 'goods-out'];
  const CONNECTOR_TYPES = ['wall', 'gate', 'door', 'emergency-exit'];
  const ALL_TYPES = RACK_TYPES.concat(AREA_TYPES);
  let nextId = 0;

  class WarehouseValidationError extends Error {
    constructor(message) {
      super(message);
      this.name = 'WarehouseValidationError';
    }
  }

  function fail(message) { throw new WarehouseValidationError(message); }
  function id(prefix) {
    nextId += 1;
    const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
    return prefix + '-' + random + '-' + nextId;
  }
  function text(value, label, max) {
    const result = String(value === undefined || value === null ? '' : value).trim();
    if (!result || result.length > max) fail(label + ' must contain 1–' + max + ' characters.');
    return result;
  }
  function measure(value, label, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < min || number > max) {
      fail(label + ' must be between ' + min + ' and ' + max + '.');
    }
    return Math.round(number);
  }
  function position(value, label) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < -500000 || number > 500000) {
      fail(label + ' must be between -500000 and 500000 mm.');
    }
    return Math.round(number);
  }
  function objectId(value, used) {
    const result = text(value, 'ID', 128);
    if (used.has(result)) fail('Object and part IDs must be unique.');
    used.add(result);
    return result;
  }
  function createLayout() { return { version: LAYOUT_VERSION, objects: [], zones: [], locations: [] }; }

  function createRack(type, options) {
    if (!RACK_TYPES.includes(type)) fail('Unsupported rack type.');
    const settings = options || {};
    const pallet = type === 'pallet-rack';
    const bayCount = Number.isInteger(settings.bayCount) ? settings.bayCount : 3;
    const levelCount = Number.isInteger(settings.levelCount) ? settings.levelCount : pallet ? 3 : 4;
    if (bayCount < 1 || bayCount > 30 || levelCount < 1 || levelCount > 12) fail('Rack size is outside the supported range.');
    const bays = Array.from({ length: bayCount }, function () {
      return {
        id: id('bay'), width: pallet ? 2700 : 1000, depth: pallet ? 1100 : 450,
        levels: Array.from({ length: levelCount }, function () {
          return {
            id: id('level'), clearHeight: pallet ? 1500 : 450,
            thickness: pallet ? 100 : 35, deck: !pallet, deckThickness: pallet ? 35 : 25
          };
        })
      };
    });
    return {
      id: settings.id || id('rack'), type: type, locked: false,
      name: settings.name || (pallet ? 'Palettenregal' : 'Fachbodenregal'),
      x: settings.x || 0, z: settings.z || 0, rotation: settings.rotation || 0,
      bays: bays,
      uprights: Array.from({ length: bayCount + 1 }, function () {
        return { id: id('upright'), width: pallet ? 100 : 45, depth: pallet ? 1100 : 450, height: pallet ? 6000 : 2400 };
      })
    };
  }

  function createArea(type, options) {
    if (!AREA_TYPES.includes(type)) fail('Unsupported area type.');
    const settings = options || {};
    const defaults = {
      wall: [4000, 120, 3000], gate: [3000, 160, 3000], door: [1000, 160, 2100],
      'emergency-exit': [1200, 160, 2200], aisle: [6000, 3000, 15],
      'goods-in': [4000, 3000, 15], 'goods-out': [4000, 3000, 15]
    }[type];
    return {
      id: settings.id || id('area'), type: type, locked: false, name: settings.name || type,
      x: settings.x || 0, z: settings.z || 0, rotation: settings.rotation || 0,
      width: defaults[0], depth: defaults[1], height: defaults[2]
    };
  }

  function resizeRack(rack, bayCount, levelCount) {
    const count = Number(bayCount);
    const levels = levelCount === null ? null : Number(levelCount);
    if (!Number.isInteger(count) || count < 1 || count > 30 ||
      (levels !== null && (!Number.isInteger(levels) || levels < 1 || levels > 12))) {
      fail('Use 1–30 bays and 1–12 levels.');
    }
    const seedLevels = levels === null ? rack.bays[0].levels.length : levels;
    const fresh = createRack(rack.type, { bayCount: count, levelCount: seedLevels });
    const updated = Object.assign({}, rack, {
      bays: Array.from({ length: count }, function (_, bayIndex) {
        const oldBay = rack.bays[bayIndex];
        const newBay = fresh.bays[bayIndex];
        if (!oldBay) return newBay;
        return Object.assign({}, oldBay, {
          levels: Array.from({ length: levels === null ? oldBay.levels.length : levels }, function (_, levelIndex) {
            const oldLevel = oldBay.levels[levelIndex];
            const newLevel = newBay.levels[levelIndex] || createRack(rack.type, { bayCount: 1, levelCount: 1 }).bays[0].levels[0];
            return oldLevel || newLevel;
          })
        });
      }),
      uprights: Array.from({ length: count + 1 }, function (_, index) {
        return rack.uprights[index] || fresh.uprights[index];
      })
    });
    return updated;
  }

  function resizeBayLevels(rack, bayIndex, levelCount) {
    const index = Number(bayIndex), count = Number(levelCount);
    if (!Number.isInteger(index) || index < 0 || index >= rack.bays.length ||
      !Number.isInteger(count) || count < 1 || count > 12) fail('Choose a bay and 1–12 levels.');
    const fresh = createRack(rack.type, { bayCount: 1, levelCount: count }).bays[0].levels;
    return Object.assign({}, rack, {
      bays: rack.bays.map(function (bay, current) {
        if (current !== index) return bay;
        return Object.assign({}, bay, {
          levels: Array.from({ length: count }, function (_, levelIndex) { return bay.levels[levelIndex] || fresh[levelIndex]; })
        });
      })
    });
  }

  function normalizeLayout(layout) {
    if (!layout || typeof layout !== 'object' || Array.isArray(layout) || layout.version !== LAYOUT_VERSION ||
      !Array.isArray(layout.objects) || !Array.isArray(layout.zones) || !Array.isArray(layout.locations)) {
      fail('Warehouse layout format is invalid.');
    }
    if (layout.objects.length > 150) fail('A layout can contain at most 150 objects.');
    const usedIds = new Set();
    const usedCodes = new Set();
    const objects = layout.objects.map(function (source) {
      if (!source || typeof source !== 'object' || !ALL_TYPES.includes(source.type)) fail('Warehouse object type is invalid.');
      const base = {
        id: objectId(source.id, usedIds), type: source.type,
        locked: source.locked === true,
        name: text(source.name, 'Name', 120),
        x: position(source.x, 'X'), z: position(source.z, 'Z'),
        rotation: measure(source.rotation, 'Rotation', -360, 360)
      };
      if (!RACK_TYPES.includes(source.type)) {
        return Object.assign(base, {
          width: measure(source.width, 'Width', 100, 50000),
          depth: measure(source.depth, 'Depth', 10, 50000),
          height: measure(source.height, 'Height', 1, 15000)
        });
      }
      if (!Array.isArray(source.bays) || source.bays.length < 1 || source.bays.length > 30 ||
        !Array.isArray(source.uprights) || source.uprights.length !== source.bays.length + 1) {
        fail('Rack bays and uprights do not match.');
      }
      const uprights = source.uprights.map(function (stand) {
        if (!stand || typeof stand !== 'object' || Array.isArray(stand)) fail('Rack upright is invalid.');
        return {
          id: objectId(stand.id, usedIds),
          width: measure(stand.width, 'Upright width', 20, 500),
          depth: measure(stand.depth, 'Upright depth', 100, 3000),
          height: measure(stand.height, 'Upright height', 200, 20000)
        };
      });
      const bays = source.bays.map(function (bay, bayIndex) {
        if (!bay || typeof bay !== 'object' || Array.isArray(bay)) fail('Rack bay is invalid.');
        if (!Array.isArray(bay.levels) || bay.levels.length < 1 || bay.levels.length > 12) fail('A bay needs 1–12 levels.');
        const levels = bay.levels.map(function (level) {
          if (!level || typeof level !== 'object' || Array.isArray(level)) fail('Rack level is invalid.');
          if (level.positions !== undefined) fail('Legacy positions require layout migration.');
          return {
            id: objectId(level.id, usedIds),
            clearHeight: measure(level.clearHeight, 'Level height', 100, 8000),
            thickness: measure(level.thickness, 'Beam or shelf thickness', 10, 300),
            deck: Boolean(level.deck),
            deckThickness: measure(level.deckThickness, 'Deck thickness', 10, 200)
          };
        });
        const totalHeight = levels.reduce(function (sum, level) { return sum + level.clearHeight + level.thickness; }, 0);
        if (totalHeight > Math.min(uprights[bayIndex].height, uprights[bayIndex + 1].height)) {
          fail('The levels exceed the height of an adjacent upright in bay ' + (bayIndex + 1) + '.');
        }
        return {
          id: objectId(bay.id, usedIds),
          width: measure(bay.width, 'Bay width', 300, 6000),
          depth: measure(bay.depth, 'Bay depth', 200, 3000),
          levels: levels
        };
      });
      return Object.assign(base, { bays: bays, uprights: uprights });
    });
    const scopes = physicalScopes({ objects: objects });
    const byLevel = new Map(scopes.map(function (scope) { return [scope.levelId, scope]; }));
    const assigned = new Set();
    const zones = layout.zones.map(function (zone) {
      if (!zone || typeof zone !== 'object' || Array.isArray(zone)) fail('Functional zone is invalid.');
      const scope = byLevel.get(zone.levelId);
      if (!scope || scope.objectId !== zone.objectId || scope.bayId !== zone.bayId) fail('Functional zone references an unknown physical scope.');
      if (assigned.has(zone.levelId)) fail('A level can have only one functional zone.');
      assigned.add(zone.levelId);
      const usage = String(zone.usage || '');
      if (!/^[a-z][a-z0-9-]{0,39}$/.test(usage)) fail('Functional usage is invalid.');
      return { id: objectId(zone.id, usedIds), objectId: scope.objectId, bayId: scope.bayId,
        levelId: scope.levelId, usage: usage };
    });
    // A new physical level receives an unassigned scope, never a location.
    scopes.forEach(function (scope) {
      if (!assigned.has(scope.levelId)) zones.push({ id: objectId(id('zone'), usedIds),
        objectId: scope.objectId, bayId: scope.bayId, levelId: scope.levelId, usage: 'unassigned' });
    });
    const byZone = new Map(zones.map(function (zone) { return [zone.id, zone]; }));
    const indices = new Map();
    if (layout.locations.length > 5000) fail('A layout can contain at most 5000 locations.');
    const locations = layout.locations.map(function (location) {
      if (!location || typeof location !== 'object' || Array.isArray(location)) fail('Location is invalid.');
      if (!byZone.has(location.zoneId)) fail('Location references an unknown functional zone.');
      if (!Number.isInteger(location.positionIndex) || location.positionIndex < 0 || location.positionIndex > 3) fail('A level supports up to 4 locations.');
      if (!indices.has(location.zoneId)) indices.set(location.zoneId, new Set());
      const used = indices.get(location.zoneId);
      if (used.has(location.positionIndex)) fail('Location subdivisions must be unique within a zone.');
      used.add(location.positionIndex);
      const code = String(location.code === undefined || location.code === null ? '' : location.code).trim();
      if (code.length > 80) fail('Location code is too long.');
      if (code && usedCodes.has(code)) fail('Location codes must be unique: ' + code);
      if (code) usedCodes.add(code);
      return { id: objectId(location.id, usedIds), zoneId: location.zoneId, positionIndex: location.positionIndex,
        code: code, legacy: location.legacy === true };
    });
    indices.forEach(function (used) {
      for (let index = 0; index < used.size; index += 1) if (!used.has(index)) fail('Location subdivisions must be consecutive.');
    });
    return { version: LAYOUT_VERSION, objects: objects, zones: zones, locations: locations };
  }

  function physicalScopes(layout) {
    const scopes = [];
    (layout.objects || []).forEach(function (object) {
      if (!RACK_TYPES.includes(object.type)) return;
      object.bays.forEach(function (bay, bayIndex) {
        bay.levels.forEach(function (level, levelIndex) {
          scopes.push({ objectId: object.id, objectName: object.name, bayId: bay.id, levelId: level.id,
            bayIndex: bayIndex, levelIndex: levelIndex });
        });
      });
    });
    return scopes;
  }

  function zoneForLevel(layout, levelId) {
    return (layout.zones || []).find(function (zone) { return zone.levelId === levelId; }) || null;
  }
  function zoneLocations(layout, zoneId) {
    return (layout.locations || []).filter(function (location) { return location.zoneId === zoneId; })
      .sort(function (a, b) { return a.positionIndex - b.positionIndex; });
  }
  function listScopes(layout) {
    const byLevel = new Map((layout.zones || []).map(function (zone) { return [zone.levelId, zone]; }));
    const counts = new Map();
    (layout.locations || []).forEach(function (location) {
      if (!counts.has(location.zoneId)) counts.set(location.zoneId, { total: 0, coded: 0 });
      const count = counts.get(location.zoneId); count.total += 1; if (location.code) count.coded += 1;
    });
    return physicalScopes(layout).map(function (scope) {
      const zone = byLevel.get(scope.levelId);
      const count = zone && counts.get(zone.id) || { total: 0, coded: 0 };
      return Object.assign({}, scope, { zoneId: zone && zone.id, usage: zone ? zone.usage : 'unassigned',
        locationCount: count.total, codedCount: count.coded });
    });
  }
  function listLocations(layout) {
    const byZone = new Map(listScopes(layout).map(function (scope) { return [scope.zoneId, scope]; }));
    const objectOrder = new Map((layout.objects || []).map(function (object, index) { return [object.id, index]; }));
    return (layout.locations || []).map(function (location) {
      return Object.assign({}, byZone.get(location.zoneId), { locationId: location.id, slotId: location.id,
        code: location.code, positionIndex: location.positionIndex, legacy: location.legacy });
    }).sort(function (a, b) {
      return objectOrder.get(a.objectId) - objectOrder.get(b.objectId) || a.bayIndex - b.bayIndex ||
        a.levelIndex - b.levelIndex || a.positionIndex - b.positionIndex;
    });
  }
  function setZoneUsage(layout, zoneId, usage) {
    const next = JSON.parse(JSON.stringify(layout));
    const zone = next.zones.find(function (item) { return item.id === zoneId; });
    if (!zone) fail('Choose a functional zone.');
    const object = next.objects.find(function (item) { return item.id === zone.objectId; });
    if (object.locked) fail('Unlock the object before editing it.');
    zone.usage = usage;
    return normalizeLayout(next);
  }
  function resizeZoneLocations(layout, zoneId, count) {
    const next = JSON.parse(JSON.stringify(layout));
    const zone = next.zones.find(function (item) { return item.id === zoneId; });
    if (!zone || zone.usage === 'unassigned') fail('Classify the scope before creating or resizing locations.');
    if (next.objects.find(function (item) { return item.id === zone.objectId; }).locked) fail('Unlock the object before editing it.');
    if (!Number.isInteger(count) || count < 0 || count > 4) fail('Choose 0–4 locations in this level.');
    const old = zoneLocations(next, zoneId);
    next.locations = next.locations.filter(function (item) { return item.zoneId !== zoneId; }).concat(
      Array.from({ length: count }, function (_, index) {
        return old[index] || { id: id('location'), zoneId: zoneId, positionIndex: index, code: '', legacy: false };
      }));
    return normalizeLayout(next);
  }
  function setLocationCode(layout, locationId, code) {
    const next = JSON.parse(JSON.stringify(layout));
    const location = next.locations.find(function (item) { return item.id === locationId; });
    if (!location) fail('Choose a location.');
    const zone = next.zones.find(function (item) { return item.id === location.zoneId; });
    if (zone.usage === 'unassigned' && !location.legacy) fail('Classify the scope before editing locations.');
    if (next.objects.find(function (item) { return item.id === zone.objectId; }).locked) fail('Unlock the object before editing it.');
    location.code = code;
    return normalizeLayout(next);
  }

  function migrateLayout(layout) {
    if (layout && layout.version === LAYOUT_VERSION) return normalizeLayout(layout);
    if (!layout || layout.version !== 1 || !Array.isArray(layout.objects)) fail('Warehouse layout format is invalid.');
    const next = JSON.parse(JSON.stringify(layout));
    next.version = LAYOUT_VERSION; next.zones = []; next.locations = [];
    next.objects.forEach(function (object) {
      if (!object || !RACK_TYPES.includes(object.type)) return;
      if (!Array.isArray(object.bays)) fail('Rack bays and uprights do not match.');
      object.bays.forEach(function (bay) {
        if (!bay || !Array.isArray(bay.levels)) fail('A bay needs 1–12 levels.');
        bay.levels.forEach(function (level) {
          if (!level || !Array.isArray(level.positions) || level.positions.length < 1 || level.positions.length > 4) fail('Legacy level needs 1–4 positions.');
          const zone = { id: id('zone'), objectId: object.id, bayId: bay.id, levelId: level.id, usage: 'unassigned' };
          next.zones.push(zone);
          level.positions.forEach(function (position, index) {
            if (!position || typeof position !== 'object' || Array.isArray(position)) fail('Rack position is invalid.');
            next.locations.push({ id: position.id, code: position.code, zoneId: zone.id, positionIndex: index, legacy: true });
          });
          delete level.positions;
        });
      });
    });
    return normalizeLayout(next);
  }

  // Produces a destructive candidate; the editor must confirm its impact before saving.
  // Validation itself never drops orphaned references.
  function reconcileLayout(layout) {
    const levels = new Set(physicalScopes(layout).map(function (scope) { return scope.levelId; }));
    const zones = (layout.zones || []).filter(function (zone) { return levels.has(zone.levelId); });
    const removed = new Set((layout.zones || []).filter(function (zone) { return !levels.has(zone.levelId); })
      .map(function (zone) { return zone.id; }));
    return normalizeLayout(Object.assign({}, layout, { zones: zones,
      locations: (layout.locations || []).filter(function (location) { return !removed.has(location.zoneId); }) }));
  }

  function layoutImpact(before, after, registry) {
    function signatures(layout) {
      const result = new Map();
      const byLevel = new Map(listScopes(layout).map(function (scope) { return [scope.levelId, scope]; }));
      layout.objects.filter(function (object) { return RACK_TYPES.includes(object.type); }).forEach(function (object) {
        let x = 0;
        object.bays.forEach(function (bay, bayIndex) {
          x += object.uprights[bayIndex].width;
          let y = 0;
          bay.levels.forEach(function (level) {
            const scope = byLevel.get(level.id);
            result.set(level.id, JSON.stringify([object.x, object.z, object.rotation, x, y, bay.width, bay.depth,
              level, object.uprights[bayIndex], object.uprights[bayIndex + 1], scope.usage, scope.locationCount]));
            y += level.clearHeight + level.thickness;
          });
          x += bay.width;
        });
      });
      return result;
    }
    const oldGeometry = signatures(before), newGeometry = signatures(after);
    const proposed = new Map(listLocations(after).map(function (location) { return [location.locationId, location]; }));
    const affected = listLocations(before).filter(function (location) {
      const next = proposed.get(location.locationId);
      return !next || location.zoneId !== next.zoneId || (location.code && location.code !== next.code) ||
        location.positionIndex !== next.positionIndex || oldGeometry.get(location.levelId) !== newGeometry.get(next.levelId);
    });
    const matches = matchArticles(before, registry);
    return { locations: affected.length, codes: affected.filter(function (location) { return location.code; }).length,
      articles: affected.reduce(function (sum, location) { return sum + (matches.bySlot.get(location.locationId) || []).length; }, 0),
      removed: affected.filter(function (location) { return !proposed.has(location.locationId); }).length,
      removedObjects: before.objects.filter(function (object) { return !after.objects.some(function (item) { return item.id === object.id; }); }).length };
  }

  function objectFootprint(object) {
    if (RACK_TYPES.includes(object.type)) {
      return {
        width: object.bays.reduce(function (total, bay) { return total + bay.width; }, 0) +
          object.uprights.reduce(function (total, upright) { return total + upright.width; }, 0),
        depth: Math.max.apply(null, object.bays.map(function (bay) { return bay.depth; })
          .concat(object.uprights.map(function (upright) { return upright.depth; })))
      };
    }
    return { width: object.width, depth: object.depth };
  }

  function footprintCorners(object) {
    const size = objectFootprint(object);
    const angle = object.rotation * Math.PI / 180;
    const cosine = Math.cos(angle), sine = Math.sin(angle);
    return [[0, 0], [size.width, 0], [size.width, size.depth], [0, size.depth]].map(function (corner) {
      return { x: object.x + cosine * corner[0] - sine * corner[1],
        z: object.z + sine * corner[0] + cosine * corner[1] };
    });
  }

  function connectionAnchors(object) {
    if (!CONNECTOR_TYPES.includes(object.type)) return [];
    const angle = object.rotation * Math.PI / 180;
    const alongX = Math.cos(angle), alongZ = Math.sin(angle);
    const startX = object.x - alongZ * object.depth / 2;
    const startZ = object.z + alongX * object.depth / 2;
    return [
      { index: 0, x: startX, z: startZ, outwardX: -alongX, outwardZ: -alongZ },
      { index: 1, x: startX + alongX * object.width, z: startZ + alongZ * object.width,
        outwardX: alongX, outwardZ: alongZ }
    ];
  }

  function findConnectionSnap(moving, objects, tolerance, preferredKey) {
    if (!CONNECTOR_TYPES.includes(moving.type)) return null;
    const limit = Number(tolerance);
    if (!Number.isFinite(limit) || limit <= 0) return null;
    const movingAnchors = connectionAnchors(moving);
    let best = null;
    let preferred = null;
    (objects || []).forEach(function (target) {
      if (target.id === moving.id || !CONNECTOR_TYPES.includes(target.type)) return;
      connectionAnchors(target).forEach(function (end) {
        movingAnchors.forEach(function (start) {
          const dot = start.outwardX * end.outwardX + start.outwardZ * end.outwardZ;
          const straight = moving.type !== 'wall' || target.type !== 'wall';
          if (dot > (straight ? -0.985 : 0.15)) return;
          const distance = Math.hypot(end.x - start.x, end.z - start.z);
          const key = target.id + ':' + end.index + ':' + start.index;
          if (distance > limit * (key === preferredKey ? 1.5 : 1)) return;
          const x = Math.round(moving.x + end.x - start.x);
          const z = Math.round(moving.z + end.z - start.z);
          if (x < -500000 || x > 500000 || z < -500000 || z > 500000) return;
          const candidate = { key: key, targetId: target.id, x: x, z: z,
            point: { x: end.x, z: end.z }, distance: distance };
          if (key === preferredKey) preferred = candidate;
          if (!best || distance < best.distance) best = candidate;
        });
      });
    });
    return preferred || best;
  }

  function footprintsOverlap(first, second) {
    const corners = [footprintCorners(first), footprintCorners(second)];
    for (const polygon of corners) {
      for (let index = 0; index < polygon.length; index += 1) {
        const start = polygon[index], end = polygon[(index + 1) % polygon.length];
        const axisX = start.z - end.z, axisZ = end.x - start.x;
        const axisLength = Math.hypot(axisX, axisZ);
        const projections = corners.map(function (points) {
          const values = points.map(function (point) { return point.x * axisX + point.z * axisZ; });
          return { min: Math.min.apply(null, values), max: Math.max.apply(null, values) };
        });
        if (Math.min(projections[0].max, projections[1].max) -
            Math.max(projections[0].min, projections[1].min) <= axisLength * 0.001) return false;
      }
    }
    return true;
  }

  function collisionKind(first, second) {
    if (['goods-in', 'goods-out'].includes(first.type) || ['goods-in', 'goods-out'].includes(second.type)) return null;
    const rack = RACK_TYPES.includes(first.type) || RACK_TYPES.includes(second.type);
    if (first.type === 'aisle' || second.type === 'aisle') {
      return rack || first.type === 'wall' || second.type === 'wall' ? 'blocked-aisle' : null;
    }
    if (rack) return 'overlap';
    if (first.type === 'wall' && second.type === 'wall') return null;
    if ((first.type === 'wall' && ['gate', 'emergency-exit'].includes(second.type)) ||
        (second.type === 'wall' && ['gate', 'emergency-exit'].includes(first.type))) return null;
    return 'overlap';
  }

  function findCollisions(layout) {
    const objects = layout.objects || [];
    const collisions = [];
    for (let first = 0; first < objects.length; first += 1) {
      for (let second = first + 1; second < objects.length; second += 1) {
        const kind = collisionKind(objects[first], objects[second]);
        if (kind && footprintsOverlap(objects[first], objects[second])) {
          collisions.push({ firstId: objects[first].id, secondId: objects[second].id, kind: kind });
        }
      }
    }
    return collisions;
  }

  function duplicateObject(object, options) {
    const copy = JSON.parse(JSON.stringify(object));
    copy.locked = false;
    const settings = options || {};
    const suffix = ' copy';
    copy.name = String(settings.name || (object.name.slice(0, 120 - suffix.length) + suffix));
    copy.id = id(RACK_TYPES.includes(copy.type) ? 'rack' : 'area');
    const offset = Math.ceil((objectFootprint(object).width + 500) / 100) * 100;
    const occupied = Array.isArray(settings.objects) ? settings.objects : [];
    let available = false;
    for (const axis of ['x', 'z']) {
      for (const direction of [1, -1]) {
        for (let step = 1; step <= occupied.length + 1; step += 1) {
          const coordinate = object[axis] + direction * step * offset;
          if (coordinate < -500000 || coordinate > 500000) break;
          const x = axis === 'x' ? coordinate : object.x;
          const z = axis === 'z' ? coordinate : object.z;
          if (occupied.some(function (other) { return other.x === x && other.z === z; })) continue;
          copy.x = x; copy.z = z; available = true; break;
        }
        if (available) break;
      }
      if (available) break;
    }
    if (RACK_TYPES.includes(copy.type)) {
      copy.uprights.forEach(function (upright) { upright.id = id('upright'); });
      copy.bays.forEach(function (bay) {
        bay.id = id('bay');
        bay.levels.forEach(function (level) {
          level.id = id('level');
        });
      });
    }
    return copy;
  }

  function rotateObject(object, degrees) {
    const angle = Number(degrees);
    if (!Number.isFinite(angle)) fail('Rotation step is invalid.');
    const rotation = (object.rotation + angle) % 360;
    return Object.assign({}, object, { rotation: rotation === 0 ? 0 : rotation });
  }

  function snapCoordinate(value, step) {
    const number = Number(value);
    const grid = Number(step);
    if (!Number.isFinite(number) || !Number.isInteger(grid) || grid < 1 || grid > 10000) {
      fail('Grid position or spacing is invalid.');
    }
    return Math.round(number / grid) * grid;
  }

  function matchArticles(layout, registry) {
    const byCode = new Map();
    listLocations(layout).forEach(function (slot) { if (slot.code) byCode.set(slot.code, slot); });
    const bySlot = new Map();
    const unmatched = [];
    let withLocation = 0;
    (registry || []).forEach(function (article) {
      const code = String(article && article.master_data && article.master_data.location || '').trim();
      if (!code) return;
      withLocation += 1;
      const slot = byCode.get(code);
      const item = { articleId: String(article.article_id || ''), name: article.master_data.article_name || article.article_name || '', code: code };
      if (!slot) { unmatched.push(item); return; }
      if (!bySlot.has(slot.slotId)) bySlot.set(slot.slotId, []);
      bySlot.get(slot.slotId).push(item);
    });
    return { byLocation: bySlot, bySlot: bySlot, unmatched: unmatched, withLocation: withLocation, matched: withLocation - unmatched.length };
  }

  function lockedEditConflict(before, after, toggleId) {
    const previous = before.objects || [];
    const proposed = after.objects || [];
    const byId = new Map(proposed.map(function (object) { return [object.id, object]; }));
    function assignments(layout, objectId) {
      const zones = (layout.zones || []).filter(function (zone) { return zone.objectId === objectId; });
      const ids = new Set(zones.map(function (zone) { return zone.id; }));
      return JSON.stringify([zones, (layout.locations || []).filter(function (location) { return ids.has(location.zoneId); })]);
    }
    if (toggleId && (previous.length !== proposed.length ||
      previous.some(function (object, index) { return proposed[index].id !== object.id; }))) return toggleId;
    for (const object of previous) {
      const next = byId.get(object.id);
      if (!next) { if (object.locked || toggleId) return object.id; continue; }
      if (toggleId) {
        const beforeData = Object.assign({}, object, { locked: false });
        const afterData = Object.assign({}, next, { locked: false });
        if (JSON.stringify(beforeData) !== JSON.stringify(afterData) || assignments(before, object.id) !== assignments(after, object.id) ||
          (object.id !== toggleId && object.locked !== next.locked) ||
          (object.id === toggleId && object.locked === next.locked)) return object.id;
      } else if ((object.locked && (JSON.stringify(object) !== JSON.stringify(next) ||
        assignments(before, object.id) !== assignments(after, object.id))) ||
        object.locked !== next.locked) return object.id;
    }
    if (proposed.some(function (object) { return !previous.some(function (old) { return old.id === object.id; }) && object.locked; })) {
      return proposed.find(function (object) { return !previous.some(function (old) { return old.id === object.id; }) && object.locked; }).id;
    }
    return null;
  }

  return {
    LAYOUT_VERSION: LAYOUT_VERSION, RACK_TYPES: RACK_TYPES, AREA_TYPES: AREA_TYPES,
    USAGES: USAGES, USAGE_COLORS: USAGE_COLORS,
    CONNECTOR_TYPES: CONNECTOR_TYPES,
    WarehouseValidationError: WarehouseValidationError,
    createLayout: createLayout, createRack: createRack, createArea: createArea,
    resizeRack: resizeRack, resizeBayLevels: resizeBayLevels, resizeZoneLocations: resizeZoneLocations,
    normalizeLayout: normalizeLayout, migrateLayout: migrateLayout, reconcileLayout: reconcileLayout,
    listScopes: listScopes, zoneForLevel: zoneForLevel, zoneLocations: zoneLocations,
    setZoneUsage: setZoneUsage, setLocationCode: setLocationCode, layoutImpact: layoutImpact,
    listLocations: listLocations, listSlots: listLocations, matchArticles: matchArticles,
    objectFootprint: objectFootprint, footprintCorners: footprintCorners, footprintsOverlap: footprintsOverlap,
    connectionAnchors: connectionAnchors, findConnectionSnap: findConnectionSnap,
    findCollisions: findCollisions, snapCoordinate: snapCoordinate,
    duplicateObject: duplicateObject, rotateObject: rotateObject,
    lockedEditConflict: lockedEditConflict
  };
}));
