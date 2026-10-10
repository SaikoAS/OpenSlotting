(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.OpenSlottingWarehouseFactory = factory;
    root.OpenSlottingWarehouse = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const LAYOUT_VERSION = 4;
  const USAGES = ['unassigned', 'picking', 'reserve'];
  const USAGE_COLORS = { unassigned: '#8795a4', picking: '#55c69c', reserve: '#c7a0ef' };
  const RACK_TYPES = ['pallet-rack', 'shelf-rack'];
  const AREA_TYPES = ['wall', 'gate', 'door', 'emergency-exit', 'aisle', 'goods-in', 'goods-out'];
  const CONNECTOR_TYPES = ['wall', 'gate', 'door', 'emergency-exit'];
  const ALL_TYPES = RACK_TYPES.concat(AREA_TYPES);
  const JUNCTION_SHAPES = ['corner', 'tee', 'cross'];
  const JUNCTION_DIRECTIONS = { corner: ['west', 'south'], tee: ['west', 'east', 'south'], cross: ['west', 'east', 'south', 'north'] };
  const RECIPE_TYPES = ALL_TYPES.concat(['aisle', 'wall'].flatMap(function (type) {
    return JUNCTION_SHAPES.map(function (shape) { return type + '-' + shape; });
  }));
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
  function createLayout() { return { version: LAYOUT_VERSION, objects: [], zones: [], locations: [], groups: [], connections: [] }; }

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

  function createRecipe(recipe, options) {
    if (RACK_TYPES.includes(recipe)) return createRack(recipe, options);
    if (AREA_TYPES.includes(recipe)) return createArea(recipe, options);
    if (!RECIPE_TYPES.includes(recipe)) fail('Unsupported recipe.');
    const split = recipe.lastIndexOf('-'), type = recipe.slice(0, split), shape = recipe.slice(split + 1);
    const object = createArea(type, options), arms = {};
    JUNCTION_DIRECTIONS[shape].forEach(function (direction) { arms[direction] = type === 'aisle' ? 3000 : 2000; });
    object.junction = { shape: shape, arms: arms };
    object.width = objectFootprint(object).width;
    return object;
  }

  // The object origin is the hub center. Arm lengths exclude the square hub.
  function junctionRectangles(object) {
    const thickness = object.depth, half = thickness / 2;
    const rectangles = [{ x: -half, z: -half, width: thickness, depth: thickness }];
    JUNCTION_DIRECTIONS[object.junction.shape].forEach(function (direction) {
      const length = object.junction.arms[direction];
      if (direction === 'west') rectangles.push({ x: -half - length, z: -half, width: length, depth: thickness });
      if (direction === 'east') rectangles.push({ x: half, z: -half, width: length, depth: thickness });
      if (direction === 'south') rectangles.push({ x: -half, z: half, width: thickness, depth: length });
      if (direction === 'north') rectangles.push({ x: -half, z: -half - length, width: thickness, depth: length });
    });
    return rectangles;
  }

  // Mixed historical dimensions stay readable until the user chooses a common depth.
  function rackDepth(rack) {
    const depth = rack.bays[0].depth;
    return rack.bays.every(function (bay) { return bay.depth === depth; }) &&
      rack.uprights.every(function (upright) { return upright.depth === depth; }) ? depth : null;
  }
  function setRackDepth(rack, value) {
    if (!RACK_TYPES.includes(rack.type)) fail('Choose a rack.');
    if (rack.locked) fail('Unlock the object before editing it.');
    const depth = measure(value, 'Rack depth', 200, 3000);
    return Object.assign({}, rack, {
      bays: rack.bays.map(function (bay) { return Object.assign({}, bay, { depth: depth }); }),
      uprights: rack.uprights.map(function (upright) { return Object.assign({}, upright, { depth: depth }); })
    });
  }

  function resizeRack(rack, bayCount, levelCount) {
    const count = Number(bayCount);
    const levels = levelCount === null ? null : Number(levelCount);
    if (!Number.isInteger(count) || count < 1 || count > 30 ||
      (levels !== null && (!Number.isInteger(levels) || levels < 1 || levels > 12))) {
      fail('Use 1–30 bays and 1–12 levels.');
    }
    const seedLevels = levels === null ? rack.bays[0].levels.length : levels;
    let fresh = createRack(rack.type, { bayCount: count, levelCount: seedLevels });
    const depth = rackDepth(rack);
    if (depth !== null) fresh = setRackDepth(fresh, depth);
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
        if (source.junction !== undefined && source.junction !== null &&
          (!['aisle', 'wall'].includes(source.type) || typeof source.junction !== 'object' ||
            Array.isArray(source.junction) || !JUNCTION_SHAPES.includes(source.junction.shape))) fail('Junction recipe is invalid.');
        const area = Object.assign(base, {
          width: measure(source.width, 'Width', 100, source.junction ? 100000 : 50000),
          depth: measure(source.depth, 'Depth', 10, 50000),
          height: measure(source.height, 'Height', 1, 15000)
        });
        if (source.elevation !== undefined) area.elevation = measure(source.elevation, 'Elevation', 0, 20000);
        if (source.type === 'door') area.open = source.open === true;
        if (source.junction) {
          const arms = source.junction.arms, directions = JUNCTION_DIRECTIONS[source.junction.shape];
          if (!arms || typeof arms !== 'object' || Array.isArray(arms) ||
            Object.keys(arms).some(function (key) { return !directions.includes(key); })) fail('Junction arms are invalid.');
          area.junction = { shape: source.junction.shape, arms: {} };
          directions.forEach(function (direction) { area.junction.arms[direction] = measure(arms[direction], 'Arm length', 100, 24000); });
          area.width = objectFootprint(area).width;
        }
        if (source.type === 'aisle') {
          if (source.route !== undefined && source.route !== null && (typeof source.route !== 'object' || Array.isArray(source.route))) fail('Route settings are invalid.');
          const route = source.route || {};
          if (area.junction && route.path !== undefined && route.path !== null) fail('A junction cannot also contain a drawn path.');
          const optional = function (value, label, max) { return value === undefined || value === null || value === '' ? null : measure(value, label, 100, max); };
          area.route = { requiredWidth: optional(route.requiredWidth, 'Required route width', 50000),
            requiredHeight: optional(route.requiredHeight, 'Required route height', 15000),
            widthMargin: measure(route.widthMargin === undefined ? 0 : route.widthMargin, 'Width margin', 0, 5000),
            heightMargin: measure(route.heightMargin === undefined ? 0 : route.heightMargin, 'Height margin', 0, 5000), path: null };
          if (route.path !== undefined && route.path !== null) {
            if (!Array.isArray(route.path) || route.path.length < 2 || route.path.length > 100) fail('A route needs 2–100 points.');
            area.route.path = route.path.map(function (point) {
              if (!point || typeof point !== 'object' || Array.isArray(point)) fail('Route point is invalid.');
              return { x: position(point.x, 'Route X'), z: position(point.z, 'Route Z') };
            });
            for (let index = 1; index < area.route.path.length; index += 1) {
              const a = area.route.path[index - 1], b = area.route.path[index];
              const length = Math.hypot(b.x - a.x, b.z - a.z);
              if (length < 100 || length > 50000) fail('Route segments must be 100–50000 mm long.');
            }
          }
        }
        return area;
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
        if (bay.passage !== undefined && bay.passage !== null && (typeof bay.passage !== 'object' || Array.isArray(bay.passage))) fail('Passage settings are invalid.');
        if (totalHeight > Math.min(uprights[bayIndex].height, uprights[bayIndex + 1].height)) {
          fail('The levels exceed the height of an adjacent upright in bay ' + (bayIndex + 1) + '.');
        }
        return {
          id: objectId(bay.id, usedIds),
          width: measure(bay.width, 'Bay width', 300, 6000),
          depth: measure(bay.depth, 'Bay depth', 200, 3000),
          passage: bay.passage ? { routeId: bay.passage.routeId === undefined || bay.passage.routeId === null || bay.passage.routeId === '' ? null : text(bay.passage.routeId, 'Route ID', 128) } : null,
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
    const byObject = new Map(objects.map(function (object) { return [object.id, object]; }));
    objects.forEach(function (object) {
      if (!RACK_TYPES.includes(object.type)) return;
      object.bays.forEach(function (bay) {
        if (bay.passage && bay.passage.routeId && (!byObject.has(bay.passage.routeId) || byObject.get(bay.passage.routeId).type !== 'aisle')) fail('Passage references an unknown route.');
      });
    });
    const grouped = new Set();
    if (layout.groups !== undefined && !Array.isArray(layout.groups)) fail('Groups must be an array.');
    if (layout.connections !== undefined && !Array.isArray(layout.connections)) fail('Connections must be an array.');
    if ((layout.groups || []).length > 75 || (layout.connections || []).length > 149) fail('Too many groups or connections.');
    const groups = (layout.groups || []).map(function (group) {
      if (!group || !Array.isArray(group.objectIds) || group.objectIds.length < 2 || group.objectIds.length > 150) fail('A group needs 2–150 objects.');
      const members = group.objectIds.map(function (member) {
        if (!byObject.has(member) || grouped.has(member)) fail('Group members must exist and belong to only one group.');
        grouped.add(member); return member;
      });
      return { id: objectId(group.id, usedIds), name: text(group.name, 'Group name', 120), objectIds: members };
    });
    const parents = new Map(objects.map(function (object) { return [object.id, object.id]; }));
    const junctionPorts = new Set();
    const root = function (key) { while (parents.get(key) !== key) key = parents.get(key); return key; };
    const connections = (layout.connections || []).map(function (link) {
      if (!link || !byObject.has(link.aId) || !byObject.has(link.bId) || link.aId === link.bId) fail('Connection references invalid objects.');
      if (!Number.isInteger(link.aAnchor) || !Number.isInteger(link.bAnchor) || link.aAnchor < 0 || link.bAnchor < 0) fail('Choose a valid connection anchor.');
      const a = connectionAnchors(byObject.get(link.aId))[link.aAnchor], b = connectionAnchors(byObject.get(link.bId))[link.bAnchor];
      if (!a || !b || Math.hypot(a.x - b.x, a.z - b.z) > 2) fail('Connected anchors must coincide.');
      if ((byObject.get(link.aId).junction || byObject.get(link.bId).junction) &&
        (!canConnect(byObject.get(link.aId), byObject.get(link.bId)) || a.outwardX * b.outwardX + a.outwardZ * b.outwardZ > -0.985)) fail('Junction ports must face each other and have matching widths.');
      [[link.aId, link.aAnchor], [link.bId, link.bAnchor]].forEach(function (port) {
        if (!byObject.get(port[0]).junction) return;
        const key = port[0] + ':' + port[1];
        if (junctionPorts.has(key)) fail('A junction port can have only one connection.');
        junctionPorts.add(key);
      });
      if (root(link.aId) === root(link.bId)) fail('Connection cycles are not supported.');
      parents.set(root(link.bId), root(link.aId));
      return { id: objectId(link.id, usedIds), aId: link.aId, bId: link.bId, aAnchor: link.aAnchor, bAnchor: link.bAnchor };
    });
    return { version: LAYOUT_VERSION, objects: objects, zones: zones, locations: locations, groups: groups, connections: connections };
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
  // Derived lookup tables belong to one layout/read pass, never to saved metadata.
  function createScopeIndex(layout) {
    const zonesByLevel = new Map((layout.zones || []).map(function (zone) { return [zone.levelId, zone]; }));
    const locationsByZone = new Map();
    (layout.locations || []).forEach(function (location) {
      if (!locationsByZone.has(location.zoneId)) locationsByZone.set(location.zoneId, []);
      locationsByZone.get(location.zoneId).push(location);
    });
    locationsByZone.forEach(function (locations) { locations.sort(function (a, b) { return a.positionIndex - b.positionIndex; }); });
    return { zonesByLevel: zonesByLevel, locationsByZone: locationsByZone };
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
    if (layout && layout.version === 3) return normalizeLayout(Object.assign({}, layout, { version: LAYOUT_VERSION }));
    if (layout && layout.version === 2) return normalizeLayout(Object.assign({}, layout, { version: LAYOUT_VERSION, groups: [], connections: [] }));
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

  function fillLocationCodes(layout, objectId, prefix, levelId) {
    const next = JSON.parse(JSON.stringify(layout));
    const object = next.objects.find(function (item) { return item.id === objectId; });
    if (!object || !RACK_TYPES.includes(object.type)) fail('Choose a rack.');
    if (object.locked) fail('Unlock the object before editing it.');
    const text = String(prefix).trim();
    if (!text || text.length > 80) fail('Use a code prefix of 1–80 characters.');
    const scopes = listScopes(next).filter(function (scope) { return scope.objectId === objectId; });
    if (levelId && !scopes.some(function (scope) { return scope.levelId === levelId; })) fail('Choose a rack level.');
    const byZone = new Map(scopes.map(function (scope) { return [scope.zoneId, scope]; }));
    next.locations.forEach(function (location) {
      const scope = byZone.get(location.zoneId);
      if (!scope || (levelId && scope.levelId !== levelId) || location.code ||
        (scope.usage === 'unassigned' && !location.legacy)) return;
      location.code = text + '-' + String(scope.bayIndex + 1).padStart(2, '0') + '-' +
        String(scope.levelIndex + 1).padStart(2, '0') + '-' + String(location.positionIndex + 1).padStart(2, '0');
    });
    return normalizeLayout(next);
  }

  // Produces a destructive candidate; the editor must confirm its impact before saving.
  // Validation itself never drops orphaned references.
  function reconcileLayout(layout) {
    const objectIds = new Set(layout.objects.map(function (object) { return object.id; }));
    layout.objects.forEach(function (object) {
      if (RACK_TYPES.includes(object.type)) object.bays.forEach(function (bay) {
        if (bay.passage && bay.passage.routeId && !objectIds.has(bay.passage.routeId)) bay.passage.routeId = null;
      });
    });
    const levels = new Set(physicalScopes(layout).map(function (scope) { return scope.levelId; }));
    const zones = (layout.zones || []).filter(function (zone) { return levels.has(zone.levelId); });
    const removed = new Set((layout.zones || []).filter(function (zone) { return !levels.has(zone.levelId); })
      .map(function (zone) { return zone.id; }));
    return normalizeLayout(Object.assign({}, layout, { zones: zones,
      groups: (layout.groups || []).map(function (group) { return Object.assign({}, group, { objectIds: group.objectIds.filter(function (key) { return objectIds.has(key); }) }); })
        .filter(function (group) { return group.objectIds.length > 1; }),
      connections: (layout.connections || []).filter(function (link) { return objectIds.has(link.aId) && objectIds.has(link.bId); }),
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
    if (object.junction) {
      const rectangles = junctionRectangles(object);
      const minX = Math.min.apply(null, rectangles.map(function (part) { return part.x; })), minZ = Math.min.apply(null, rectangles.map(function (part) { return part.z; }));
      const maxX = Math.max.apply(null, rectangles.map(function (part) { return part.x + part.width; })), maxZ = Math.max.apply(null, rectangles.map(function (part) { return part.z + part.depth; }));
      return { x: minX, z: minZ, width: maxX - minX, depth: maxZ - minZ };
    }
    if (object.type === 'aisle' && object.route && object.route.path) {
      const points = routeSegments(Object.assign({}, object, { x: 0, z: 0, rotation: 0 })).flatMap(function (segment) { return footprintCorners(segment); });
      const minX = Math.min.apply(null, points.map(function (point) { return point.x; })), maxX = Math.max.apply(null, points.map(function (point) { return point.x; }));
      const minZ = Math.min.apply(null, points.map(function (point) { return point.z; })), maxZ = Math.max.apply(null, points.map(function (point) { return point.z; }));
      return { x: minX, z: minZ, width: maxX - minX, depth: maxZ - minZ };
    }
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
      const x = corner[0] + (size.x || 0), z = corner[1] + (size.z || 0);
      return { x: object.x + cosine * x - sine * z,
        z: object.z + sine * x + cosine * z };
    });
  }

  function connectionAnchors(object) {
    if (object.junction) {
      const angle = object.rotation * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle);
      const vectors = { west: [-1, 0], east: [1, 0], south: [0, 1], north: [0, -1] };
      return JUNCTION_DIRECTIONS[object.junction.shape].map(function (direction, index) {
        const vector = vectors[direction], distance = object.depth / 2 + object.junction.arms[direction];
        const point = localPoint(object, vector[0] * distance, vector[1] * distance);
        return { index: index, direction: direction, x: point.x, z: point.z,
          outwardX: c * vector[0] - s * vector[1], outwardZ: s * vector[0] + c * vector[1] };
      });
    }
    if (object.type === 'aisle' && object.route && object.route.path) {
      const points = object.route.path;
      return [points[0], points[points.length - 1]].map(function (point, index) {
        const world = localPoint(object, point.x, point.z);
        const other = index ? points[points.length - 2] : points[1], toward = localPoint(object, other.x, other.z);
        const length = Math.hypot(world.x - toward.x, world.z - toward.z) || 1;
        return { index: index, x: world.x, z: world.z, outwardX: (world.x - toward.x) / length, outwardZ: (world.z - toward.z) / length };
      });
    }
    if (!CONNECTOR_TYPES.includes(object.type) && !RACK_TYPES.includes(object.type) && object.type !== 'aisle') return [];
    const angle = object.rotation * Math.PI / 180;
    const alongX = Math.cos(angle), alongZ = Math.sin(angle);
    const size = objectFootprint(object);
    const startX = object.x - alongZ * size.depth / 2;
    const startZ = object.z + alongX * size.depth / 2;
    return [
      { index: 0, x: startX, z: startZ, outwardX: -alongX, outwardZ: -alongZ },
      { index: 1, x: startX + alongX * size.width, z: startZ + alongZ * size.width,
        outwardX: alongX, outwardZ: alongZ }
    ];
  }

  function canConnect(first, second) {
    if (!first || !second || first.id === second.id) return false;
    if (first.type === 'aisle' || second.type === 'aisle') return first.type === 'aisle' && second.type === 'aisle' && Math.abs(first.depth - second.depth) <= 1;
    if (CONNECTOR_TYPES.includes(first.type) || CONNECTOR_TYPES.includes(second.type)) return CONNECTOR_TYPES.includes(first.type) && CONNECTOR_TYPES.includes(second.type) &&
      (!(first.junction || second.junction) || (Math.abs(first.depth - second.depth) <= 1 && Math.abs((first.elevation || 0) - (second.elevation || 0)) <= 1));
    return RACK_TYPES.includes(first.type) && first.type === second.type;
  }

  function findConnectionSnap(moving, objects, tolerance, preferredKey, connections) {
    if (!connectionAnchors(moving).length) return null;
    const limit = Number(tolerance);
    if (!Number.isFinite(limit) || limit <= 0) return null;
    const movingAnchors = connectionAnchors(moving);
    const occupied = new Set();
    (connections || []).forEach(function (link) { occupied.add(link.aId + ':' + link.aAnchor); occupied.add(link.bId + ':' + link.bAnchor); });
    let best = null;
    let preferred = null;
    (objects || []).forEach(function (target) {
      if (!canConnect(moving, target) || !connectionAnchors(target).length) return;
      connectionAnchors(target).forEach(function (end) {
        movingAnchors.forEach(function (start) {
          if (occupied.has(target.id + ':' + end.index) || occupied.has(moving.id + ':' + start.index)) return;
          const dot = start.outwardX * end.outwardX + start.outwardZ * end.outwardZ;
          const straight = moving.junction || target.junction || moving.type !== 'wall' || target.type !== 'wall';
          if (dot > (straight ? -0.985 : 0.15)) return;
          const distance = Math.hypot(end.x - start.x, end.z - start.z);
          const key = target.id + ':' + end.index + ':' + start.index;
          if (distance > limit * (key === preferredKey ? 1.5 : 1)) return;
          const x = Math.round(moving.x + end.x - start.x);
          const z = Math.round(moving.z + end.z - start.z);
          if (x < -500000 || x > 500000 || z < -500000 || z > 500000) return;
          const candidate = { key: key, targetId: target.id, sourceAnchor: start.index, targetAnchor: end.index, x: x, z: z,
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

  function localPoint(object, x, z) {
    const angle = object.rotation * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle);
    return { x: object.x + c * x - s * z, z: object.z + s * x + c * z };
  }
  function routeSegments(object) {
    if (object.junction) return junctionRectangles(object).map(function (part) {
      const point = localPoint(object, part.x, part.z);
      return Object.assign({}, object, part, { x: point.x, z: point.z, route: null, junction: null });
    });
    if (!object.route || !object.route.path) return [Object.assign({}, object, { route: null })];
    const points = object.route.path, segments = [];
    for (let index = 1; index < points.length; index += 1) {
      const a = localPoint(object, points[index - 1].x, points[index - 1].z), b = localPoint(object, points[index].x, points[index].z);
      const angle = Math.atan2(b.z - a.z, b.x - a.x), length = Math.hypot(b.x - a.x, b.z - a.z);
      segments.push(Object.assign({}, object, { x: a.x + Math.sin(angle) * object.depth / 2,
        z: a.z - Math.cos(angle) * object.depth / 2, rotation: angle * 180 / Math.PI, width: length, route: null }));
      // Square junction pads cover the turning area, including the outer corner.
      if (index < points.length - 1) {
        const corner = localPoint(object, points[index].x - object.depth / 2, points[index].z - object.depth / 2);
        segments.push(Object.assign({}, object, { x: corner.x, z: corner.z, width: object.depth, route: null }));
      }
    }
    return segments;
  }
  // One physical description supplies rendering and obstacle checks; markers are separate.
  function physicalParts(object) {
    const parts = [];
    const add = function (x, y, z, width, height, depth, kind, partId, bayIndex, levelIndex) {
      parts.push({ x: x, y: y, z: z, width: width, height: height, depth: depth,
        kind: kind, partId: partId, bayIndex: bayIndex, levelIndex: levelIndex });
    };
    if (object.junction) {
      junctionRectangles(object).forEach(function (part) {
        add(part.x, object.elevation || 0, part.z, part.width, object.height, part.depth, 'body', object.id);
      });
      return parts;
    }
    if (!RACK_TYPES.includes(object.type)) {
      const y = object.elevation || 0;
      if (['gate', 'door', 'emergency-exit'].includes(object.type)) {
        const post = Math.min(140, object.width / 6), header = Math.min(post, object.height);
        add(0, y, 0, post, object.height, object.depth, 'frame', object.id);
        add(object.width - post, y, 0, post, object.height, object.depth, 'frame', object.id);
        add(0, y + object.height - header, 0, object.width, header, object.depth, 'header', object.id);
        if (object.type === 'door' && !object.open && object.height > header) {
          const thickness = Math.min(35, object.depth);
          add(post, y, (object.depth - thickness) / 2, object.width - 2 * post, object.height - header, thickness, 'leaf', object.id);
        }
      } else add(0, y, 0, object.width, object.height, object.depth, 'body', object.id);
      return parts;
    }
    let x = 0;
    object.uprights.forEach(function (stand, index) {
      const postDepth = Math.min(90, stand.depth / 3);
      add(x, 0, 0, stand.width, stand.height, postDepth, 'upright', stand.id);
      add(x, 0, stand.depth - postDepth, stand.width, stand.height, postDepth, 'upright', stand.id);
      add(x, stand.height - 85, 0, stand.width, 85, stand.depth, 'header', stand.id);
      add(x, 0, 0, stand.width, 75, stand.depth, 'base', stand.id);
      x += stand.width;
      const bay = object.bays[index];
      if (!bay) return;
      let y = 0;
      bay.levels.forEach(function (level, levelIndex) {
        y += level.clearHeight;
        add(x, y, 0, bay.width, level.thickness, 75, 'beam', level.id, index, levelIndex);
        add(x, y, bay.depth - 75, bay.width, level.thickness, 75, 'beam', level.id, index, levelIndex);
        if (level.deck) add(x, y + level.thickness, 0, bay.width, level.deckThickness, bay.depth, 'deck', level.id, index, levelIndex);
        y += level.thickness;
      });
      x += bay.width;
    });
    return parts;
  }
  function obstacleParts(object) {
    return physicalParts(object).map(function (part) {
      const origin = localPoint(object, part.x, part.z);
      const result = Object.assign({}, part, { id: object.id, type: 'wall', rotation: object.rotation, x: origin.x, z: origin.z });
      const points = footprintCorners(result);
      result.minX = Math.min.apply(null, points.map(function (point) { return point.x; })); result.maxX = Math.max.apply(null, points.map(function (point) { return point.x; }));
      result.minZ = Math.min.apply(null, points.map(function (point) { return point.z; })); result.maxZ = Math.max.apply(null, points.map(function (point) { return point.z; }));
      return result;
    });
  }
  function boundsOverlap(a, b) { return a.minX <= b.maxX && a.maxX >= b.minX && a.minZ <= b.maxZ && a.maxZ >= b.minZ; }
  function refineCollision(first, second, cache) {
    const route = first.type === 'aisle' ? first : second.type === 'aisle' ? second : null;
    const obstacle = route === first ? second : first;
    const get = function (object) {
      if (!cache.has(object.id)) {
        const parts = obstacleParts(object), bins = new Map();
        parts.forEach(function (part) {
          for (let level = Math.floor(part.y / 500); level <= Math.floor((part.y + part.height) / 500); level += 1) {
            if (!bins.has(level)) bins.set(level, []);
            bins.get(level).push(part);
          }
        });
        cache.set(object.id, { parts: parts, bins: bins });
      }
      return cache.get(object.id);
    };
    if (route) {
      const requirements = route.route || {};
      const floor = route.elevation || 0;
      const knownHeight = Number.isFinite(requirements.requiredHeight);
      const height = knownHeight ? requirements.requiredHeight + (requirements.heightMargin || 0) : null;
      for (const segment of routeSegments(route)) for (const part of get(obstacle).parts) {
        // Missing vehicle height leaves overhead clearance unverified, but never
        // permits a route through a solid intersecting its base plane.
        if (part.y + part.height <= floor + 0.001 ||
          (knownHeight ? part.y >= floor + height - 0.001 : part.y > floor + 0.001) || !footprintsOverlap(segment, part)) continue;
        const kind = ['beam', 'deck', 'header'].includes(part.kind) ? 'route-too-low' : ['upright', 'frame'].includes(part.kind) ? 'route-too-narrow' : 'blocked-aisle';
        return { kind: kind, partId: part.partId, partKind: part.kind, bayIndex: part.bayIndex,
          levelIndex: part.levelIndex, obstacleId: obstacle.id, availableHeight: Math.max(0, part.y - floor), requiredHeight: height };
      }
      return null;
    }
    const other = get(second);
    for (const a of get(first).parts) {
      const seen = new Set();
      for (let level = Math.floor(a.y / 500); level <= Math.floor((a.y + a.height) / 500); level += 1) for (const b of other.bins.get(level) || []) {
        if (seen.has(b)) continue; seen.add(b);
        if (!boundsOverlap(a, b) || Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) <= 0.001) continue;
        if (footprintsOverlap(a, b)) return { kind: 'overlap', partId: a.partId, secondPartId: b.partId, obstacleId: first.id };
      }
    }
    return null;
  }

  function cloneLayout(layout) { return JSON.parse(JSON.stringify(layout)); }
  function editableObject(layout, key) {
    const object = layout.objects.find(function (item) { return item.id === key; });
    if (!object) fail('Choose an existing object.');
    if (object.locked) fail('Unlock all affected objects before editing.');
    return object;
  }
  function configurePassage(layout, key, bayIndex, height, routeId, options) {
    const next = cloneLayout(layout), object = editableObject(next, key);
    if (!RACK_TYPES.includes(object.type) || !object.bays[bayIndex]) fail('Choose a rack bay.');
    const settings = options || {};
    if (settings.levelCount !== undefined) Object.assign(object, resizeBayLevels(object, bayIndex, Number(settings.levelCount)));
    object.bays[bayIndex].levels[0].clearHeight = measure(height, 'Passage height', 100, 8000);
    object.bays[bayIndex].passage = { routeId: routeId || null };
    if (settings.growFrames) {
      const total = object.bays[bayIndex].levels.reduce(function (sum, level) { return sum + level.clearHeight + level.thickness; }, 0);
      object.uprights[bayIndex].height = Math.max(object.uprights[bayIndex].height, total);
      object.uprights[bayIndex + 1].height = Math.max(object.uprights[bayIndex + 1].height, total);
    }
    return reconcileLayout(next);
  }
  function bayCenter(object, index) {
    let x = object.uprights[0].width;
    for (let current = 0; current < index; current += 1) x += object.bays[current].width + object.uprights[current + 1].width;
    return localPoint(object, x + object.bays[index].width / 2, object.bays[index].depth / 2);
  }
  function continuePassage(layout, sourceId, sourceBay, targetId, targetBay) {
    const next = cloneLayout(layout), source = next.objects.find(function (item) { return item.id === sourceId; }), target = editableObject(next, targetId);
    if (!source || source.id === target.id || !RACK_TYPES.includes(source.type) || !RACK_TYPES.includes(target.type) ||
      !source.bays[sourceBay] || !target.bays[targetBay] || !source.bays[sourceBay].passage) fail('Choose a passage and another rack bay.');
    if (relatedObjects(next, source.id).has(target.id)) fail('Separate the target assembly before aligning its passage.');
    target.rotation = source.rotation;
    const a = bayCenter(source, sourceBay), b = bayCenter(target, targetBay), angle = source.rotation * Math.PI / 180;
    const offset = (a.x - b.x) * Math.cos(angle) + (a.z - b.z) * Math.sin(angle);
    target.x += Math.cos(angle) * offset; target.z += Math.sin(angle) * offset;
    target.bays[targetBay].levels[0].clearHeight = source.bays[sourceBay].levels[0].clearHeight;
    target.bays[targetBay].passage = Object.assign({}, source.bays[sourceBay].passage);
    return next;
  }
  function createRoute(points, width, name) {
    if (!Array.isArray(points) || points.length < 2) fail('Draw at least two route points.');
    const route = createArea('aisle', { name: name || 'Route', x: points[0].x, z: points[0].z });
    route.depth = measure(width, 'Route width', 100, 50000);
    route.route = { requiredWidth: null, requiredHeight: null, widthMargin: 0, heightMargin: 0,
      path: points.map(function (point) { return { x: point.x - route.x, z: point.z - route.z }; }) };
    return route;
  }
  function groupObjects(layout, keys, name) {
    const next = cloneLayout(layout), members = Array.from(new Set(keys));
    if (members.length < 2) fail('Select at least two objects.');
    members.forEach(function (key) { editableObject(next, key); });
    if ((next.groups || []).some(function (group) { return group.objectIds.some(function (key) { return members.includes(key); }); })) fail('Ungroup existing members first.');
    next.groups.push({ id: id('group'), name: name || 'Group', objectIds: members });
    return normalizeLayout(next);
  }
  function relatedObjects(layout, key) {
    const members = new Set([key]);
    let changed = true;
    while (changed) {
      changed = false;
      const include = function (keys) { if (!keys.some(function (item) { return members.has(item); })) return;
        keys.forEach(function (item) { if (!members.has(item)) { members.add(item); changed = true; } }); };
      (layout.groups || []).forEach(function (group) { include(group.objectIds); });
      (layout.connections || []).forEach(function (link) { include([link.aId, link.bId]); });
    }
    return members;
  }
  function applyAssemblyChanges(before, next, pose) {
    const old = new Map(before.objects.map(function (object) { return [object.id, object]; }));
    const oldGroups = new Set((before.groups || []).map(function (group) { return group.id; }));
    const oldLinks = new Set((before.connections || []).map(function (link) { return link.id; }));
    const relations = { objects: next.objects, groups: (next.groups || []).filter(function (group) { return oldGroups.has(group.id); }),
      connections: (next.connections || []).filter(function (link) { return oldLinks.has(link.id); }) };
    const visited = new Set();
    next.objects.forEach(function (source) {
      source.x = position(source.x, 'X'); source.z = position(source.z, 'Z'); source.rotation = measure(source.rotation, 'Rotation', -360, 360);
      const prior = old.get(source.id);
      if (!prior || visited.has(source.id) || JSON.stringify(prior) === JSON.stringify(source)) return;
      const angle = (source.rotation - prior.rotation) * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle);
      const keys = relatedObjects(relations, source.id);
      keys.forEach(function (key) {
        const object = next.objects.find(function (item) { return item.id === key; }), original = old.get(key);
        if (!object || !original || key === source.id || pose === false) return;
        object.x = source.x + c * (original.x - prior.x) - s * (original.z - prior.z);
        object.z = source.z + s * (original.x - prior.x) + c * (original.z - prior.z);
        object.rotation = source.rotation === prior.rotation ? original.rotation : rotateObject(original, source.rotation - prior.rotation).rotation;
      });
      const groupMembers = function (key) {
        const group = relations.groups.find(function (item) { return item.objectIds.includes(key); });
        return group ? group.objectIds : [key];
      };
      const resolved = new Set(groupMembers(source.id));
      let progress = true;
      while (progress) {
        progress = false;
        relations.connections.forEach(function (link) {
          const forward = resolved.has(link.aId) && !resolved.has(link.bId), backward = resolved.has(link.bId) && !resolved.has(link.aId);
          if (!forward && !backward) return;
          const a = next.objects.find(function (object) { return object.id === (forward ? link.aId : link.bId); });
          const b = next.objects.find(function (object) { return object.id === (forward ? link.bId : link.aId); });
          const end = connectionAnchors(a)[forward ? link.aAnchor : link.bAnchor], start = connectionAnchors(b)[forward ? link.bAnchor : link.aAnchor];
          groupMembers(b.id).forEach(function (key) {
            const member = next.objects.find(function (object) { return object.id === key; });
            if (member) { member.x += end.x - start.x; member.z += end.z - start.z; }
            resolved.add(key);
          });
          progress = true;
        });
      }
      keys.forEach(function (key) { visited.add(key); });
    });
    return next;
  }
  function connectObjects(layout, sourceId, targetId, sourceAnchor, targetAnchor, align) {
    const next = cloneLayout(layout), source = editableObject(next, sourceId), target = next.objects.find(function (item) { return item.id === targetId; });
    if (!target || source.id === target.id || relatedObjects(next, source.id).has(target.id)) fail('Choose a separate target assembly.');
    if (!canConnect(source, target)) fail('Choose compatible objects with matching connection widths.');
    if ((next.connections || []).some(function (link) {
      return link.aId === sourceId && link.aAnchor === sourceAnchor || link.bId === sourceId && link.bAnchor === sourceAnchor ||
        link.aId === targetId && link.aAnchor === targetAnchor || link.bId === targetId && link.bAnchor === targetAnchor;
    })) fail('Choose free connection ports.');
    const before = cloneLayout(next);
    if (align === 'ports') {
      const a = connectionAnchors(source)[sourceAnchor], b = connectionAnchors(target)[targetAnchor];
      if (!a || !b) fail('Choose a valid connection port.');
      const delta = Math.atan2(-b.outwardZ, -b.outwardX) - Math.atan2(a.outwardZ, a.outwardX);
      source.rotation = rotateObject(source, Math.round(delta * 180 / Math.PI)).rotation;
    } else if (align === true) source.rotation = target.rotation;
    else if (typeof align === 'number') source.rotation = rotateObject(target, measure(align, 'Connection angle', -180, 180)).rotation;
    const a = connectionAnchors(source)[sourceAnchor], b = connectionAnchors(target)[targetAnchor];
    if (!a || !b) fail('Choose objects with connection anchors.');
    if ((source.junction || target.junction || source.type === 'aisle') && a.outwardX * b.outwardX + a.outwardZ * b.outwardZ > -0.985) fail('Connection ports must face each other. Use automatic port alignment.');
    source.x += b.x - a.x; source.z += b.z - a.z;
    applyAssemblyChanges(before, next);
    if (lockedEditConflict(before, next)) fail('Unlock all affected objects before editing.');
    next.connections.push({ id: id('connection'), aId: source.id, bId: target.id, aAnchor: sourceAnchor, bAnchor: targetAnchor });
    return normalizeLayout(next);
  }

  function connectionFailure(code, obstruction) {
    const error = new WarehouseValidationError(code);
    error.code = code;
    if (obstruction) error.obstruction = obstruction;
    throw error;
  }

  // Compile a bounded set of orthogonal courses into ordinary parametric modules.
  // End objects are never moved; no drawn path or extra persisted format is created.
  function createDistanceConnection(layout, sourceId, targetId, sourceAnchor, targetAnchor, options) {
    const source = editableObject(layout, sourceId), target = layout.objects.find(function (item) { return item.id === targetId; });
    if (!target || !['aisle', 'wall'].includes(source.type) || target.type !== source.type ||
      Math.abs(source.depth - target.depth) > 1 || Math.abs((source.elevation || 0) - (target.elevation || 0)) > 1) connectionFailure('bridgeCompatible');
    if (relatedObjects(layout, source.id).has(target.id)) connectionFailure('bridgeSeparate');
    const a = connectionAnchors(source)[sourceAnchor], b = connectionAnchors(target)[targetAnchor];
    if (!Number.isInteger(sourceAnchor) || !Number.isInteger(targetAnchor) || !a || !b) connectionFailure('bridgePorts');
    if ((layout.connections || []).some(function (link) {
      return link.aId === sourceId && link.aAnchor === sourceAnchor || link.bId === sourceId && link.bAnchor === sourceAnchor ||
        link.aId === targetId && link.aAnchor === targetAnchor || link.bId === targetId && link.bAnchor === targetAnchor;
    })) connectionFailure('bridgePorts');
    if (Math.hypot(a.x - b.x, a.z - b.z) < 100) connectionFailure('bridgeTouching');
    const settings = options || {}, variant = settings.variant || 'auto';
    if (!['auto', 'straight', 'left', 'right'].includes(variant)) connectionFailure('bridgeCompatible');
    const reserve = measure(settings.reserve === undefined ? 500 : settings.reserve, 'Detour reserve', 100, 10000);
    const width = Math.min(source.depth, target.depth), radius = width / 2 + 100, leg = radius + 100;
    const ux = a.outwardX, uz = a.outwardZ;
    const heading = Math.atan2(uz, ux) * 180 / Math.PI;
    if (Math.abs(heading - Math.round(heading)) > 0.000001) connectionFailure('bridgeOrientation');
    const local = function (point) { const dx = point.x - a.x, dz = point.z - a.z; return { x: dx * ux + dz * uz, z: -dx * uz + dz * ux }; };
    const world = function (point) { return { x: a.x + point.x * ux - point.z * uz, z: a.z + point.x * uz + point.z * ux }; };
    const end = local(b), start = { x: 0, z: 0 }, stub = { x: leg, z: 0 };
    const endX = -b.outwardX * ux - b.outwardZ * uz, endZ = b.outwardX * uz - b.outwardZ * ux;
    const quarter = (Math.round(Math.atan2(endZ, endX) / (Math.PI / 2)) + 4) % 4;
    const endDirection = [[1, 0], [0, 1], [-1, 0], [0, -1]][quarter];
    if (endDirection[0] * endX + endDirection[1] * endZ < 0.999999) connectionFailure('bridgeOrientation');
    const approach = { x: end.x - endDirection[0] * leg, z: end.z - endDirection[1] * leg };
    const pad = Math.max(2 * leg, width + reserve);
    const sourceRoute = source.route || {}, targetRoute = target.route || {};
    const knownMax = function (key, maximum) {
      const values = [sourceRoute[key], targetRoute[key]].filter(Number.isFinite);
      const value = settings[key];
      if (value !== undefined && value !== null && value !== '') {
        const number = Number(value);
        if (!Number.isFinite(number) || number < 100 || number > maximum) connectionFailure('bridgeDimensions');
        values.push(Math.round(number));
      }
      return values.length ? Math.max.apply(null, values) : null;
    };
    const requirements = { requiredWidth: knownMax('requiredWidth', 50000), requiredHeight: knownMax('requiredHeight', 15000),
      widthMargin: Math.max(sourceRoute.widthMargin || 0, targetRoute.widthMargin || 0),
      heightMargin: Math.max(sourceRoute.heightMargin || 0, targetRoute.heightMargin || 0), path: null };
    const knownWidth = requirements.requiredWidth;
    if (source.type === 'aisle' && knownWidth && knownWidth + 2 * requirements.widthMargin > width) connectionFailure('bridgeWidth');
    const blockers = layout.objects.filter(function (item) {
      return item.id === source.id || item.id === target.id || !['aisle', 'goods-in', 'goods-out'].includes(item.type);
    }).map(function (item) {
      const corners = footprintCorners(item), points = corners.map(local);
      return { object: item, minX: Math.min.apply(null, corners.map(function (p) { return p.x; })), maxX: Math.max.apply(null, corners.map(function (p) { return p.x; })),
        minZ: Math.min.apply(null, corners.map(function (p) { return p.z; })), maxZ: Math.max.apply(null, corners.map(function (p) { return p.z; })),
        localMinX: Math.min.apply(null, points.map(function (p) { return p.x; })), localMaxX: Math.max.apply(null, points.map(function (p) { return p.x; })),
        localMinZ: Math.min.apply(null, points.map(function (p) { return p.z; })), localMaxZ: Math.max.apply(null, points.map(function (p) { return p.z; })) };
    });
    const axisValues = function (defaults, low, high, midpoint) {
      const values = [], seen = new Set();
      const add = function (value) { const key = value.toFixed(3); if (!seen.has(key)) { seen.add(key); values.push(value); } };
      defaults.forEach(add);
      blockers.flatMap(function (record) { return [record[low] - pad, record[high] + pad]; })
        .sort(function (first, second) { return Math.abs(first - midpoint) - Math.abs(second - midpoint); })
        .forEach(function (value) { if (values.length < 8) add(value); });
      return values;
    };
    const xs = axisValues([stub.x, approach.x, end.x / 2, Math.max(0, end.x) + pad, Math.min(0, end.x) - pad], 'localMinX', 'localMaxX', end.x / 2);
    const zs = axisValues([0, approach.z, end.z / 2, Math.max(0, end.z) + pad, Math.min(0, end.z) - pad], 'localMinZ', 'localMaxZ', end.z / 2);
    const candidates = [], seen = new Set();
    const addCourse = function (raw) {
      const points = [];
      raw.forEach(function (point) {
        const last = points[points.length - 1];
        if (last && Math.hypot(point.x - last.x, point.z - last.z) < 0.001) return;
        if (points.length > 1) {
          const prev = points[points.length - 2], ax = last.x - prev.x, az = last.z - prev.z, bx = point.x - last.x, bz = point.z - last.z;
          if (Math.abs(ax * bz - az * bx) < 0.001 && ax * bx + az * bz > 0) points.pop();
        }
        points.push(point);
      });
      const directions = [], lengths = [];
      for (let index = 1; index < points.length; index += 1) {
        const dx = points[index].x - points[index - 1].x, dz = points[index].z - points[index - 1].z, length = Math.hypot(dx, dz);
        if (Math.abs(dx) > 0.001 && Math.abs(dz) > 0.001) return;
        const direction = { x: Math.abs(dx) > 0.001 ? Math.sign(dx) : 0, z: Math.abs(dz) > 0.001 ? Math.sign(dz) : 0 };
        const prior = directions[directions.length - 1];
        if (prior && prior.x * direction.x + prior.z * direction.z !== 0) return;
        directions.push(direction); lengths.push(length);
      }
      if (!directions.length || directions[0].x !== 1 || directions[0].z !== 0) return;
      const last = directions[directions.length - 1];
      if (last.x !== endDirection[0] || last.z !== endDirection[1]) return;
      if (variant === 'straight' && directions.length !== 1) return;
      if ((variant === 'left' || variant === 'right') && (directions.length < 2 || directions[1].z !== (variant === 'left' ? -1 : 1))) return;
      const startCuts = lengths.map(function (_, index) { return index ? radius : 0; });
      const endCuts = lengths.map(function (_, index) { return index < lengths.length - 1 ? radius : 0; });
      for (let index = 0; index < lengths.length; index += 1) {
        const gap = lengths[index] - startCuts[index] - endCuts[index];
        if (gap < -0.001) return;
        // Absorb sub-100-mm residuals into a corner arm instead of creating slivers.
        if (gap > 0.001 && gap < 100) {
          if (index) startCuts[index] += gap;
          else if (index < lengths.length - 1) endCuts[index] += gap;
          else return;
        }
      }
      const key = points.map(function (point) { return point.x.toFixed(3) + ',' + point.z.toFixed(3); }).join(';');
      if (seen.has(key)) return;
      seen.add(key); candidates.push({ points: points, directions: directions, lengths: lengths, startCuts: startCuts, endCuts: endCuts,
        length: lengths.reduce(function (total, length) { return total + length; }, 0) });
    };
    addCourse([start, end]);
    addCourse([start, { x: end.x, z: 0 }, end]);
    addCourse([start, stub, { x: approach.x, z: stub.z }, approach, end]);
    addCourse([start, stub, { x: stub.x, z: approach.z }, approach, end]);
    xs.forEach(function (x) { addCourse([start, stub, { x: x, z: 0 }, { x: x, z: approach.z }, approach, end]); });
    zs.forEach(function (z) { addCourse([start, stub, { x: stub.x, z: z }, { x: approach.x, z: z }, approach, end]); });
    xs.forEach(function (x) { zs.forEach(function (z) {
      addCourse([start, stub, { x: x, z: 0 }, { x: x, z: z }, { x: approach.x, z: z }, approach, end]);
      addCourse([start, stub, { x: stub.x, z: z }, { x: x, z: z }, { x: x, z: approach.z }, approach, end]);
    }); });
    candidates.sort(function (first, second) { return first.length - second.length || first.points.length - second.points.length; });
    const cache = new Map();
    let capacity = false, fitsCapacity = false, firstObstruction = null;
    for (const course of candidates.slice(0, 128)) {
      const modules = [], baseName = String(settings.name || 'Connection').slice(0, 100);
      const append = function (object, incoming, outgoing) {
        object.depth = width; object.height = Math.max(source.height, target.height); object.elevation = source.elevation || 0;
        object.name = baseName + ' ' + (modules.length + 1);
        if (source.type === 'aisle') object.route = Object.assign({}, requirements);
        modules.push({ object: object, incoming: incoming, outgoing: outgoing });
      };
      course.directions.forEach(function (direction, index) {
        const offset = course.startCuts[index], gap = course.lengths[index] - offset - course.endCuts[index];
        const rotation = Math.round(Math.atan2(uz * direction.x + ux * direction.z, ux * direction.x - uz * direction.z) * 180 / Math.PI);
        if (gap > 0.001) {
          const count = Math.ceil(gap / 50000);
          for (let part = 0; part < count; part += 1) {
            const point = world({ x: course.points[index].x + direction.x * (offset + part * gap / count), z: course.points[index].z + direction.z * (offset + part * gap / count) });
            const angle = rotation * Math.PI / 180, object = createArea(source.type, {
              x: point.x + Math.sin(angle) * width / 2, z: point.z - Math.cos(angle) * width / 2, rotation: rotation });
            object.width = Math.round(gap / count); append(object, 0, 1);
          }
        }
        if (index < course.directions.length - 1) {
          const next = course.directions[index + 1], incomingX = -direction.x, incomingZ = -direction.z;
          const incoming = incomingX * next.z - incomingZ * next.x < 0 ? 0 : 1;
          const angle = Math.atan2(uz * incomingX + ux * incomingZ, ux * incomingX - uz * incomingZ) - (incoming ? Math.PI / 2 : Math.PI);
          const point = world(course.points[index + 1]), object = createRecipe(source.type + '-corner', { x: point.x, z: point.z, rotation: Math.round(angle * 180 / Math.PI) % 360 });
          const incomingArm = Math.round(course.endCuts[index] - width / 2), outgoingArm = Math.round(course.startCuts[index + 1] - width / 2);
          object.junction.arms.west = incoming ? outgoingArm : incomingArm;
          object.junction.arms.south = incoming ? incomingArm : outgoingArm;
          append(object, incoming, 1 - incoming);
        }
      });
      if (!modules.length) continue;
      if (layout.objects.length + modules.length > 150 || (layout.connections || []).length + modules.length + 1 > 149) { capacity = true; continue; }
      fitsCapacity = true;
      const next = cloneLayout(layout);
      modules.forEach(function (item) { next.objects.push(item.object); });
      let previous = { object: source, outgoing: sourceAnchor };
      modules.concat([{ object: target, incoming: targetAnchor }]).forEach(function (item) {
        next.connections.push({ id: id('connection'), aId: previous.object.id, aAnchor: previous.outgoing, bId: item.object.id, bAnchor: item.incoming });
        previous = item;
      });
      let normalized;
      try { normalized = normalizeLayout(next); } catch (error) { if (!(error instanceof WarehouseValidationError)) throw error; continue; }
      const addedIds = new Set(modules.map(function (item) { return item.object.id; }));
      const added = normalized.objects.filter(function (item) { return addedIds.has(item.id); });
      let blocked = false;
      for (let index = 0; index < added.length && !blocked; index += 1) {
        const object = added[index], parts = routeSegments(object), corners = footprintCorners(object);
        const bounds = { minX: Math.min.apply(null, corners.map(function (p) { return p.x; })), maxX: Math.max.apply(null, corners.map(function (p) { return p.x; })),
          minZ: Math.min.apply(null, corners.map(function (p) { return p.z; })), maxZ: Math.max.apply(null, corners.map(function (p) { return p.z; })) };
        for (const record of blockers) {
          if (record.object.id === source.id && index === 0 || record.object.id === target.id && index === added.length - 1) continue;
          if (!boundsOverlap(bounds, record) || !footprintsOverlap(object, record.object)) continue;
          const obstruction = refineCollision(object, record.object, cache);
          if (obstruction) {
            if (!firstObstruction) firstObstruction = Object.assign({ objectId: record.object.id, objectName: record.object.name }, obstruction);
            blocked = true; break;
          }
        }
        for (let other = 0; other < index - 1 && !blocked; other += 1) {
          if (parts.some(function (part) { return routeSegments(added[other]).some(function (prior) { return footprintsOverlap(part, prior); }); })) blocked = true;
        }
      }
      if (!blocked) return normalized;
    }
    connectionFailure(capacity && !fitsCapacity ? 'bridgeCapacity' : 'bridgeNoFit', firstObstruction);
  }
  function extendRack(layout, key, end) {
    const next = cloneLayout(layout), rack = editableObject(next, key);
    if (!RACK_TYPES.includes(rack.type) || rack.bays.length >= 30) fail('A rack supports at most 30 bays.');
    if (end !== 'start') Object.assign(rack, resizeRack(rack, rack.bays.length + 1, null));
    else {
      let fresh = createRack(rack.type, { bayCount: 1, levelCount: rack.bays[0].levels.length });
      const depth = rackDepth(rack);
      if (depth !== null) fresh = setRackDepth(fresh, depth);
      const offset = fresh.bays[0].width + fresh.uprights[0].width, point = localPoint(rack, -offset, 0);
      rack.x = point.x; rack.z = point.z;
      rack.bays.unshift(fresh.bays[0]); rack.uprights.unshift(fresh.uprights[0]);
    }
    return next;
  }
  function insertWallOpening(layout, key, type, offset, width, height) {
    const next = cloneLayout(layout), wall = editableObject(next, key);
    if (wall.type !== 'wall' || wall.junction || !['gate', 'door', 'emergency-exit'].includes(type)) fail('Insert openings into a straight wall segment.');
    const start = measure(offset, 'Opening offset', 0, wall.width), size = measure(width, 'Opening width', 100, wall.width);
    const h = measure(height, 'Opening height', 200, wall.height);
    if (start + size > wall.width || (start > 0 && start < 100) || (wall.width - start - size > 0 && wall.width - start - size < 100)) fail('Leave at least 100 mm for each remaining wall segment.');
    const parts = [];
    const segment = function (x, length) { const point = localPoint(wall, x, 0);
      return Object.assign({}, wall, { id: id('wall'), x: point.x, z: point.z, width: length }); };
    if (start) parts.push(segment(0, start));
    const point = localPoint(wall, start, 0), opening = Object.assign(createArea(type, { x: point.x, z: point.z, rotation: wall.rotation }),
      { width: size, depth: wall.depth, height: h, elevation: wall.elevation || 0, open: type === 'door' });
    parts.push(opening);
    if (start + size < wall.width) parts.push(segment(start + size, wall.width - start - size));
    const last = parts[parts.length - 1];
    parts[0].id = wall.id;
    if (h < wall.height) parts.push(Object.assign(segment(start, size), { height: wall.height - h, elevation: (wall.elevation || 0) + h }));
    next.objects.splice(next.objects.findIndex(function (object) { return object.id === key; }), 1, ...parts);
    next.connections.forEach(function (link) {
      if (link.aId === key && link.aAnchor === 1) link.aId = last.id;
      if (link.bId === key && link.bAnchor === 1) link.bId = last.id;
    });
    const group = next.groups.find(function (item) { return item.objectIds.includes(key); });
    if (group) group.objectIds = group.objectIds.filter(function (member) { return member !== key; }).concat(parts.map(function (part) { return part.id; }));
    else if (parts.length > 1) next.groups.push({ id: id('group'), name: wall.name, objectIds: parts.map(function (part) { return part.id; }) });
    return next;
  }

  function collisionKind(first, second) {
    if (['goods-in', 'goods-out'].includes(first.type) || ['goods-in', 'goods-out'].includes(second.type)) return null;
    const rack = RACK_TYPES.includes(first.type) || RACK_TYPES.includes(second.type);
    if (first.type === 'aisle' || second.type === 'aisle') {
      return 'blocked-aisle';
    }
    if (rack) return 'overlap';
    if (first.type === 'wall' && second.type === 'wall') return null;
    if ((first.type === 'wall' && ['gate', 'emergency-exit'].includes(second.type)) ||
        (second.type === 'wall' && ['gate', 'emergency-exit'].includes(first.type))) return null;
    return 'overlap';
  }

  function findCollisions(layout) {
    const objects = layout.objects || [];
    const records = [];
    const byIndex = new Array(objects.length);
    objects.forEach(function (object, index) {
      // Intentional goods-in/out overlays never participate in collision checks.
      if (object.type === 'goods-in' || object.type === 'goods-out') return;
      const corners = footprintCorners(object);
      const axes = corners.map(function (start, cornerIndex) {
        const end = corners[(cornerIndex + 1) % corners.length];
        const x = start.z - end.z, z = end.x - start.x;
        return { x: x, z: z, length: Math.hypot(x, z) };
      });
      const record = { object: object, index: index, corners: corners, axes: axes,
        minX: Math.min.apply(null, corners.map(function (point) { return point.x; })),
        maxX: Math.max.apply(null, corners.map(function (point) { return point.x; })),
        minZ: Math.min.apply(null, corners.map(function (point) { return point.z; })),
        maxZ: Math.max.apply(null, corners.map(function (point) { return point.z; })) };
      records.push(record); byIndex[index] = record;
    });
    const collisions = [];
    const partCache = new Map();
    objects.filter(function (object) { return object.type === 'aisle'; }).forEach(function (route) {
      const requirements = route.route || {};
      if (requirements.requiredWidth === null || requirements.requiredWidth === undefined || requirements.requiredHeight === null || requirements.requiredHeight === undefined)
        collisions.push({ firstId: route.id, secondId: route.id, kind: 'unverified-route', severity: 'info' });
      if (requirements.requiredWidth && requirements.requiredWidth + 2 * (requirements.widthMargin || 0) > route.depth)
        collisions.push({ firstId: route.id, secondId: route.id, kind: 'route-too-narrow', obstacleId: route.id });
    });
    function check(first, second) {
      if (first.minX > second.maxX || first.maxX < second.minX ||
          first.minZ > second.maxZ || first.maxZ < second.minZ) return;
      const kind = collisionKind(first.object, second.object);
      if (!kind) return;
      // Same SAT axes, arithmetic and 0.001 mm contact tolerance. Corners and
      // axes are prepared once per invocation; no cross-layout cache exists.
      for (const polygon of [first, second]) {
        for (const axis of polygon.axes) {
          let firstMin = Infinity, firstMax = -Infinity, secondMin = Infinity, secondMax = -Infinity;
          for (let corner = 0; corner < first.corners.length; corner += 1) {
            const firstValue = first.corners[corner].x * axis.x + first.corners[corner].z * axis.z;
            const secondValue = second.corners[corner].x * axis.x + second.corners[corner].z * axis.z;
            firstMin = Math.min(firstMin, firstValue); firstMax = Math.max(firstMax, firstValue);
            secondMin = Math.min(secondMin, secondValue); secondMax = Math.max(secondMax, secondValue);
          }
          if (Math.min(firstMax, secondMax) - Math.max(firstMin, secondMin) <= axis.length * 0.001) return;
        }
      }
      if (first.object.type === 'aisle' && second.object.type === 'aisle') return;
      const refined = refineCollision(first.object, second.object, partCache);
      if (refined) collisions.push(Object.assign({ firstId: first.object.id, secondId: second.object.id }, refined));
    }
    function allPairs() {
      for (let first = 0; first < records.length; first += 1) {
        for (let second = first + 1; second < records.length; second += 1) check(records[first], records[second]);
      }
    }
    // Very small/dense scenes use prepared all-pairs without candidate buffers.
    if (records.length < 24) { allPairs(); return collisions; }
    function sweepPlan(min, max) {
      const sorted = records.slice().sort(function (first, second) { return first[min] - second[min] || first.index - second.index; });
      let candidateCount = 0;
      sorted.forEach(function (record, index) {
        let low = index + 1, high = sorted.length;
        while (low < high) {
          const middle = Math.floor((low + high) / 2);
          if (sorted[middle][min] <= record[max]) low = middle + 1;
          else high = middle;
        }
        candidateCount += low - index - 1;
      });
      return { sorted: sorted, min: min, max: max, candidateCount: candidateCount };
    }
    const xPlan = sweepPlan('minX', 'maxX'), zPlan = sweepPlan('minZ', 'maxZ');
    const plan = xPlan.candidateCount <= zPlan.candidateCount ? xPlan : zPlan;
    if (plan.candidateCount > records.length * (records.length - 1) / 6) {
      allPairs(); return collisions;
    }
    const candidates = [];
    plan.sorted.forEach(function (first, index) {
      for (let next = index + 1; next < plan.sorted.length && plan.sorted[next][plan.min] <= first[plan.max]; next += 1) {
        const second = plan.sorted[next];
        if (first.minX > second.maxX || first.maxX < second.minX || first.minZ > second.maxZ || first.maxZ < second.minZ) continue;
        const low = Math.min(first.index, second.index), high = Math.max(first.index, second.index);
        candidates.push(low * objects.length + high);
      }
    });
    // Restore the exact original input-pair ordering (including omitted overlays).
    candidates.sort(function (first, second) { return first - second; });
    candidates.forEach(function (pair) {
      check(byIndex[Math.floor(pair / objects.length)], byIndex[pair % objects.length]);
    });
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
        if (bay.passage) bay.passage.routeId = null;
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
    RECIPE_TYPES: RECIPE_TYPES, JUNCTION_SHAPES: JUNCTION_SHAPES, JUNCTION_DIRECTIONS: JUNCTION_DIRECTIONS,
    USAGES: USAGES, USAGE_COLORS: USAGE_COLORS,
    CONNECTOR_TYPES: CONNECTOR_TYPES,
    WarehouseValidationError: WarehouseValidationError,
    createLayout: createLayout, createRack: createRack, createArea: createArea, createRecipe: createRecipe,
    resizeRack: resizeRack, resizeBayLevels: resizeBayLevels, resizeZoneLocations: resizeZoneLocations,
    rackDepth: rackDepth, setRackDepth: setRackDepth,
    localPoint: localPoint, routeSegments: routeSegments, physicalParts: physicalParts,
    configurePassage: configurePassage, continuePassage: continuePassage, bayCenter: bayCenter,
    createRoute: createRoute, groupObjects: groupObjects, relatedObjects: relatedObjects,
    applyAssemblyChanges: applyAssemblyChanges, connectObjects: connectObjects, insertWallOpening: insertWallOpening,
    createDistanceConnection: createDistanceConnection,
    extendRack: extendRack,
    normalizeLayout: normalizeLayout, migrateLayout: migrateLayout, reconcileLayout: reconcileLayout,
    listScopes: listScopes, zoneForLevel: zoneForLevel, zoneLocations: zoneLocations, createScopeIndex: createScopeIndex,
    fillLocationCodes: fillLocationCodes,
    setZoneUsage: setZoneUsage, setLocationCode: setLocationCode, layoutImpact: layoutImpact,
    listLocations: listLocations, listSlots: listLocations, matchArticles: matchArticles,
    objectFootprint: objectFootprint, footprintCorners: footprintCorners, footprintsOverlap: footprintsOverlap,
    connectionAnchors: connectionAnchors, findConnectionSnap: findConnectionSnap, canConnect: canConnect,
    findCollisions: findCollisions, snapCoordinate: snapCoordinate,
    duplicateObject: duplicateObject, rotateObject: rotateObject,
    lockedEditConflict: lockedEditConflict
  };
}));
