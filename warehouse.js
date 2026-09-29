(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.OpenSlottingWarehouseFactory = factory;
    root.OpenSlottingWarehouse = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const LAYOUT_VERSION = 1;
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
  function createLayout() { return { version: LAYOUT_VERSION, objects: [] }; }

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
            thickness: pallet ? 100 : 35, deck: !pallet, deckThickness: pallet ? 35 : 25,
            positions: Array.from({ length: pallet ? 2 : 1 }, function () { return { id: id('slot'), code: '' }; })
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

  function resizeRack(rack, bayCount, levelCount, positionsPerLevel) {
    const count = Number(bayCount);
    const levels = levelCount === null ? null : Number(levelCount);
    const positions = positionsPerLevel === null ? null : Number(positionsPerLevel);
    if (!Number.isInteger(count) || count < 1 || count > 30 ||
      (levels !== null && (!Number.isInteger(levels) || levels < 1 || levels > 12)) ||
      (positions !== null && (!Number.isInteger(positions) || positions < 1 || positions > 4))) {
      fail('Use 1–30 bays, 1–12 levels, and 1–4 positions per level.');
    }
    const seedLevels = levels === null ? rack.bays[0].levels.length : levels;
    const seedPositions = positions === null ? rack.bays[0].levels[0].positions.length : positions;
    const fresh = createRack(rack.type, { bayCount: count, levelCount: seedLevels });
    const updated = Object.assign({}, rack, {
      bays: Array.from({ length: count }, function (_, bayIndex) {
        const oldBay = rack.bays[bayIndex];
        const newBay = fresh.bays[bayIndex];
        if (!oldBay) return Object.assign({}, newBay, {
          levels: newBay.levels.map(function (level) {
            return Object.assign({}, level, {
              positions: Array.from({ length: seedPositions }, function (_, index) {
                return level.positions[index] || { id: id('slot'), code: '' };
              })
            });
          })
        });
        return Object.assign({}, oldBay, {
          levels: Array.from({ length: levels === null ? oldBay.levels.length : levels }, function (_, levelIndex) {
            const oldLevel = oldBay.levels[levelIndex];
            const newLevel = newBay.levels[levelIndex] || createRack(rack.type, { bayCount: 1, levelCount: 1 }).bays[0].levels[0];
            const chosen = oldLevel || newLevel;
            return Object.assign({}, chosen, {
              positions: Array.from({ length: positions === null ? chosen.positions.length : positions }, function (_, index) {
                return chosen.positions[index] || { id: id('slot'), code: '' };
              })
            });
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

  function resizeLevelPositions(rack, bayIndex, levelIndex, positionCount) {
    const bay = Number(bayIndex), level = Number(levelIndex), count = Number(positionCount);
    if (!Number.isInteger(bay) || bay < 0 || bay >= rack.bays.length ||
      !Number.isInteger(level) || level < 0 || level >= rack.bays[bay].levels.length ||
      !Number.isInteger(count) || count < 1 || count > 4) fail('Choose a level and 1–4 positions.');
    return Object.assign({}, rack, {
      bays: rack.bays.map(function (item, bayNumber) {
        if (bayNumber !== bay) return item;
        return Object.assign({}, item, {
          levels: item.levels.map(function (entry, levelNumber) {
            if (levelNumber !== level) return entry;
            return Object.assign({}, entry, {
              positions: Array.from({ length: count }, function (_, positionIndex) {
                return entry.positions[positionIndex] || { id: id('slot'), code: '' };
              })
            });
          })
        });
      })
    });
  }

  function normalizeLayout(layout) {
    if (!layout || typeof layout !== 'object' || Array.isArray(layout) || layout.version !== LAYOUT_VERSION || !Array.isArray(layout.objects)) {
      fail('Warehouse layout format is invalid.');
    }
    if (layout.objects.length > 150) fail('A layout can contain at most 150 objects.');
    const usedIds = new Set();
    const usedCodes = new Set();
    let slotCount = 0;
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
          if (!Array.isArray(level.positions) || level.positions.length < 1 || level.positions.length > 4) fail('A level needs 1–4 positions.');
          const positions = level.positions.map(function (slot) {
            if (!slot || typeof slot !== 'object' || Array.isArray(slot)) fail('Rack position is invalid.');
            slotCount += 1;
            if (slotCount > 5000) fail('A layout can contain at most 5000 positions.');
            const code = String(slot.code === undefined || slot.code === null ? '' : slot.code).trim();
            if (code.length > 80) fail('Location code is too long.');
            if (code && usedCodes.has(code)) fail('Location codes must be unique: ' + code);
            if (code) usedCodes.add(code);
            return { id: objectId(slot.id, usedIds), code: code };
          });
          return {
            id: objectId(level.id, usedIds),
            clearHeight: measure(level.clearHeight, 'Level height', 100, 8000),
            thickness: measure(level.thickness, 'Beam or shelf thickness', 10, 300),
            deck: Boolean(level.deck),
            deckThickness: measure(level.deckThickness, 'Deck thickness', 10, 200),
            positions: positions
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
    return { version: LAYOUT_VERSION, objects: objects };
  }

  function listSlots(layout) {
    const slots = [];
    (layout.objects || []).forEach(function (object) {
      if (!RACK_TYPES.includes(object.type)) return;
      object.bays.forEach(function (bay, bayIndex) {
        bay.levels.forEach(function (level, levelIndex) {
          level.positions.forEach(function (slot, positionIndex) {
            slots.push({
              objectId: object.id, objectName: object.name, bayId: bay.id, levelId: level.id,
              slotId: slot.id, code: slot.code, bayIndex: bayIndex, levelIndex: levelIndex,
              positionIndex: positionIndex
            });
          });
        });
      });
    });
    return slots;
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
          level.positions.forEach(function (position) { position.id = id('slot'); position.code = ''; });
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
    listSlots(layout).forEach(function (slot) { if (slot.code) byCode.set(slot.code, slot); });
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
    return { bySlot: bySlot, unmatched: unmatched, withLocation: withLocation, matched: withLocation - unmatched.length };
  }

  function lockedEditConflict(before, after, toggleId) {
    const previous = before.objects || [];
    const proposed = after.objects || [];
    const byId = new Map(proposed.map(function (object) { return [object.id, object]; }));
    if (toggleId && (previous.length !== proposed.length ||
      previous.some(function (object, index) { return proposed[index].id !== object.id; }))) return toggleId;
    for (const object of previous) {
      const next = byId.get(object.id);
      if (!next) { if (object.locked || toggleId) return object.id; continue; }
      if (toggleId) {
        const beforeData = Object.assign({}, object, { locked: false });
        const afterData = Object.assign({}, next, { locked: false });
        if (JSON.stringify(beforeData) !== JSON.stringify(afterData) ||
          (object.id !== toggleId && object.locked !== next.locked) ||
          (object.id === toggleId && object.locked === next.locked)) return object.id;
      } else if ((object.locked && JSON.stringify(object) !== JSON.stringify(next)) ||
        object.locked !== next.locked) return object.id;
    }
    if (proposed.some(function (object) { return !previous.some(function (old) { return old.id === object.id; }) && object.locked; })) {
      return proposed.find(function (object) { return !previous.some(function (old) { return old.id === object.id; }) && object.locked; }).id;
    }
    return null;
  }

  return {
    LAYOUT_VERSION: LAYOUT_VERSION, RACK_TYPES: RACK_TYPES, AREA_TYPES: AREA_TYPES,
    CONNECTOR_TYPES: CONNECTOR_TYPES,
    WarehouseValidationError: WarehouseValidationError,
    createLayout: createLayout, createRack: createRack, createArea: createArea,
    resizeRack: resizeRack, resizeBayLevels: resizeBayLevels, resizeLevelPositions: resizeLevelPositions,
    normalizeLayout: normalizeLayout,
    listSlots: listSlots, matchArticles: matchArticles,
    objectFootprint: objectFootprint, footprintCorners: footprintCorners, footprintsOverlap: footprintsOverlap,
    connectionAnchors: connectionAnchors, findConnectionSnap: findConnectionSnap,
    findCollisions: findCollisions, snapCoordinate: snapCoordinate,
    duplicateObject: duplicateObject, rotateObject: rotateObject,
    lockedEditConflict: lockedEditConflict
  };
}));
