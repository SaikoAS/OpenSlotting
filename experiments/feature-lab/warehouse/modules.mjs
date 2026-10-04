// Isolated algorithms. Inject the unchanged production domain modules in browsers.
export function createAlternatives(model, scene, workspaceModel) {
  const rackTypes = model.RACK_TYPES;
  function collisionKind(a, b) {
    // Exact current warehouse.js classification; SAT remains the original export.
    if (['goods-in', 'goods-out'].includes(a.type) || ['goods-in', 'goods-out'].includes(b.type)) return null;
    const rack = rackTypes.includes(a.type) || rackTypes.includes(b.type);
    if (a.type === 'aisle' || b.type === 'aisle') return rack || a.type === 'wall' || b.type === 'wall' ? 'blocked-aisle' : null;
    if (rack) return 'overlap';
    if (a.type === 'wall' && b.type === 'wall') return null;
    if ((a.type === 'wall' && ['gate', 'emergency-exit'].includes(b.type)) ||
      (b.type === 'wall' && ['gate', 'emergency-exit'].includes(a.type))) return null;
    return 'overlap';
  }
  function bounds(layout) {
    return (layout.objects || []).map((object, index) => {
      const p = model.footprintCorners(object);
      return { object, index, corners: p, minX: Math.min(...p.map(x => x.x)), maxX: Math.max(...p.map(x => x.x)),
        minZ: Math.min(...p.map(x => x.z)), maxZ: Math.max(...p.map(x => x.z)) };
    });
  }
  const overlap = (a, b) => a.minX <= b.maxX && a.maxX >= b.minX && a.minZ <= b.maxZ && a.maxZ >= b.minZ;
  function evaluate(records, pairs, stats) {
    const collisions = [];
    pairs.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    for (const [i, j] of pairs) {
      const a = records[i], b = records[j], kind = collisionKind(a.object, b.object);
      if (!kind || !overlap(a, b)) continue;
      stats.narrowPhase += 1;
      if (model.footprintsOverlap(a.object, b.object)) collisions.push({ firstId: a.object.id, secondId: b.object.id, kind });
    }
    stats.candidatePairs = pairs.length;
    return { collisions, stats };
  }
  function collisionSweep(layout) {
    const records = bounds(layout), sorted = records.slice().sort((a, b) => a.minX - b.minX || a.index - b.index);
    const active = [], pairs = [], stats = { broadComparisons: 0, narrowPhase: 0, candidatePairs: 0 };
    for (const current of sorted) {
      for (let i = active.length - 1; i >= 0; i--) if (active[i].maxX < current.minX) active.splice(i, 1);
      for (const other of active) {
        stats.broadComparisons += 1;
        if (overlap(other, current)) pairs.push([Math.min(other.index, current.index), Math.max(other.index, current.index)]);
      }
      active.push(current);
    }
    return evaluate(records, pairs, stats);
  }
  function collisionGrid(layout, cellSize = 10000) {
    if (!(Number.isFinite(cellSize) && cellSize > 0)) throw new RangeError('Positive finite cell size required');
    const records = bounds(layout), cells = new Map(), pairs = [], seen = new Set(), large = [];
    const stats = { broadComparisons: 0, narrowPhase: 0, candidatePairs: 0, cellEntries: 0, largeObjects: 0 };
    function add(a, b) {
      if (a === b) return;
      stats.broadComparisons += 1;
      const first = Math.min(a, b), second = Math.max(a, b), key = first * records.length + second;
      if (!seen.has(key)) { seen.add(key); pairs.push([first, second]); }
    }
    for (const item of records) {
      const x0 = Math.floor(item.minX / cellSize), x1 = Math.floor(item.maxX / cellSize);
      const z0 = Math.floor(item.minZ / cellSize), z1 = Math.floor(item.maxZ / cellSize);
      // Bound raster expansion. Large objects conservatively compare against all others.
      if ((x1 - x0 + 1) * (z1 - z0 + 1) > 4096) { large.push(item.index); continue; }
      for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
        const key = x + ':' + z, occupants = cells.get(key) || [];
        for (const other of occupants) add(other, item.index);
        occupants.push(item.index); cells.set(key, occupants); stats.cellEntries += 1;
      }
    }
    stats.largeObjects = large.length;
    for (const i of large) for (let j = 0; j < records.length; j++) add(i, j);
    return evaluate(records, pairs, stats);
  }
  function preparedSAT(a, b) {
    // Same axes, projection arithmetic, axis order and 0.001 mm tolerance as production.
    // Prepare corners once per invocation; avoid per-pair coordinate/projection arrays.
    for (const polygon of [a, b]) for (let index = 0; index < 4; index++) {
      const start = polygon[index], end = polygon[(index + 1) % 4];
      const axisX = start.z - end.z, axisZ = end.x - start.x;
      const axisLength = Math.hypot(axisX, axisZ);
      let aMin = Infinity, aMax = -Infinity, bMin = Infinity, bMax = -Infinity;
      for (let corner = 0; corner < 4; corner++) {
        const av = a[corner].x * axisX + a[corner].z * axisZ;
        const bv = b[corner].x * axisX + b[corner].z * axisZ;
        aMin = Math.min(aMin, av); aMax = Math.max(aMax, av);
        bMin = Math.min(bMin, bv); bMax = Math.max(bMax, bv);
      }
      if (Math.min(aMax, bMax) - Math.max(aMin, bMin) <= axisLength * 0.001) return false;
    }
    return true;
  }
  function collisionPreparedSAT(layout) {
    const records = bounds(layout), collisions = [];
    const stats = { broadComparisons: 0, narrowPhase: 0, candidatePairs: records.length * (records.length - 1) / 2 };
    for (let i = 0; i < records.length; i++) for (let j = i + 1; j < records.length; j++) {
      stats.broadComparisons += 1;
      const a = records[i], b = records[j], kind = collisionKind(a.object, b.object);
      if (!kind || !overlap(a, b)) continue;
      stats.narrowPhase += 1;
      if (preparedSAT(a.corners, b.corners)) collisions.push({ firstId: a.object.id, secondId: b.object.id, kind });
    }
    return { collisions, stats };
  }
  function createSceneCache({ contentCheck = false } = {}) {
    let lastKey, lastLayout, lastMatches, result, builds = 0;
    return {
      get(layout, matches, versions) {
        const key = revisionKey(versions) + (contentCheck ? '|' + JSON.stringify(layout) + '|' + JSON.stringify([...(matches?.bySlot || new Map())]) : '');
        if (key !== lastKey || layout !== lastLayout || matches !== lastMatches) {
          result = scene.buildBoxes(model, layout, matches); builds += 1;
          lastKey = key; lastLayout = layout; lastMatches = matches;
        }
        return result;
      },
      clear() { lastKey = undefined; lastLayout = undefined; lastMatches = undefined; result = undefined; },
      get builds() { return builds; }
    };
  }
  function createSlotIndex(layout) {
    const slots = model.listSlots(layout), bySlot = new Map(), byCodeFirst = new Map(), byCodeLast = new Map();
    for (const slot of slots) {
      bySlot.set(slot.slotId, slot);
      if (slot.code) { if (!byCodeFirst.has(slot.code)) byCodeFirst.set(slot.code, slot); byCodeLast.set(slot.code, slot); }
    }
    return { slots, bySlot, byCodeFirst, byCodeLast };
  }
  function matchArticlesIndexed(index, registry) {
    const bySlot = new Map(), unmatched = [];
    let withLocation = 0;
    for (const article of registry || []) {
      const code = String(article && article.master_data && article.master_data.location || '').trim();
      if (!code) continue;
      withLocation += 1;
      const slot = index.byCodeLast.get(code);
      const item = { articleId: String(article.article_id || ''), name: article.master_data.article_name || article.article_name || '', code };
      if (!slot) { unmatched.push(item); continue; }
      if (!bySlot.has(slot.slotId)) bySlot.set(slot.slotId, []);
      bySlot.get(slot.slotId).push(item);
    }
    return { bySlot, unmatched, withLocation, matched: withLocation - unmatched.length };
  }
  function createAnchorIndex(objects, cellSize = 5000) {
    if (!(Number.isFinite(cellSize) && cellSize > 0)) throw new RangeError('Positive finite cell size required');
    const cells = new Map();
    objects.forEach((object, objectIndex) => model.connectionAnchors(object).forEach(anchor => {
      const key = Math.floor(anchor.x / cellSize) + ':' + Math.floor(anchor.z / cellSize);
      const entries = cells.get(key) || [];
      entries.push({ object, objectIndex, anchor }); cells.set(key, entries);
    }));
    return { cells, cellSize, objects };
  }
  function findConnectionSnapIndexed(moving, index, tolerance, preferredKey) {
    if (!model.CONNECTOR_TYPES.includes(moving.type)) return null;
    const limit = Number(tolerance);
    if (!Number.isFinite(limit) || limit <= 0) return null;
    const starts = model.connectionAnchors(moving), candidates = new Map(), radius = limit * (preferredKey ? 1.5 : 1);
    for (const start of starts) {
      const x0 = Math.floor((start.x - radius) / index.cellSize), x1 = Math.floor((start.x + radius) / index.cellSize);
      const z0 = Math.floor((start.z - radius) / index.cellSize), z1 = Math.floor((start.z + radius) / index.cellSize);
      // Huge user tolerances fall back to the exact existing implementation.
      if ((x1 - x0 + 1) * (z1 - z0 + 1) > 4096) return model.findConnectionSnap(moving, index.objects, tolerance, preferredKey);
      for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++)
        for (const entry of index.cells.get(x + ':' + z) || []) candidates.set(entry.objectIndex + ':' + entry.anchor.index, entry);
    }
    let best = null, preferred = null;
    for (const { object: target, anchor: end } of [...candidates.values()].sort((a, b) => a.objectIndex - b.objectIndex || a.anchor.index - b.anchor.index)) {
      if (target.id === moving.id) continue;
      for (const start of starts) {
        const dot = start.outwardX * end.outwardX + start.outwardZ * end.outwardZ;
        if (dot > (moving.type !== 'wall' || target.type !== 'wall' ? -0.985 : 0.15)) continue;
        const distance = Math.hypot(end.x - start.x, end.z - start.z), key = target.id + ':' + end.index + ':' + start.index;
        if (distance > limit * (key === preferredKey ? 1.5 : 1)) continue;
        const x = Math.round(moving.x + end.x - start.x), z = Math.round(moving.z + end.z - start.z);
        if (x < -500000 || x > 500000 || z < -500000 || z > 500000) continue;
        const candidate = { key, targetId: target.id, x, z, point: { x: end.x, z: end.z }, distance };
        if (key === preferredKey) preferred = candidate;
        if (!best || distance < best.distance) best = candidate;
      }
    }
    return preferred || best;
  }
  function lockedEditConflictIndexed(before, after, toggleId) {
    const previous = before.objects || [], proposed = after.objects || [];
    const byId = new Map(proposed.map(object => [object.id, object])), previousIds = new Set(previous.map(object => object.id));
    if (toggleId && (previous.length !== proposed.length || previous.some((object, i) => proposed[i].id !== object.id))) return toggleId;
    for (const object of previous) {
      const next = byId.get(object.id);
      if (!next) { if (object.locked || toggleId) return object.id; continue; }
      if (toggleId) {
        if (JSON.stringify({ ...object, locked: false }) !== JSON.stringify({ ...next, locked: false }) ||
          (object.id !== toggleId && object.locked !== next.locked) || (object.id === toggleId && object.locked === next.locked)) return object.id;
      } else if ((object.locked && JSON.stringify(object) !== JSON.stringify(next)) || object.locked !== next.locked) return object.id;
    }
    const freshLocked = proposed.find(object => !previousIds.has(object.id) && object.locked);
    return freshLocked ? freshLocked.id : null;
  }
  function compileImportProfile(profile) {
    const source = workspaceModel.normalizeImportProfiles([profile])[0], normalize = header => String(header || '').trim().toLocaleLowerCase('de-DE');
    const sourceHeaders = source.headers.map(normalize), counts = new Map();
    for (const key of sourceHeaders) counts.set(key, (counts.get(key) || 0) + 1);
    return { plan(file, customFields) {
      const targetHeaders = file && Array.isArray(file.headers) ? file.headers : [], target = targetHeaders.map(normalize), positions = new Map();
      target.forEach((key, i) => { if (!positions.has(key)) positions.set(key, []); positions.get(key).push(i); });
      const schemaExact = sourceHeaders.length === target.length && sourceHeaders.every((key, i) => key === target[i]);
      const active = new Set((Array.isArray(customFields) ? customFields : []).filter(field => field && field.active !== false).map(field => field.id));
      const mapping = {}, customFieldMapping = {}, sourceRules = [], unresolved = [], occupied = new Set();
      function positionOf(sourcePosition) {
        const key = sourceHeaders[sourcePosition], matches = positions.get(key) || [];
        return { matches, position: schemaExact ? sourcePosition : key && counts.get(key) === 1 && matches.length === 1 ? matches[0] : null };
      }
      function resolve(targetId, sourcePosition, custom) {
        if (!Number.isInteger(sourcePosition)) return;
        const header = source.headers[sourcePosition];
        if (custom && !active.has(targetId)) { unresolved.push({ targetId, header, reason: 'custom-field-missing' }); return; }
        const { matches, position } = positionOf(sourcePosition);
        if (!Number.isInteger(position) || position >= target.length) unresolved.push({ targetId, header, reason: matches.length ? 'ambiguous' : 'missing' });
        else if (occupied.has(position)) unresolved.push({ targetId, header, reason: 'collision' });
        else { occupied.add(position); (custom ? customFieldMapping : mapping)[targetId] = position; }
      }
      Object.keys(source.mapping).forEach(id => resolve(id, source.mapping[id], false));
      Object.keys(source.customFieldMapping).forEach(id => resolve(id, source.customFieldMapping[id], true));
      for (const rule of source.sourceRules) {
        const { matches, position } = positionOf(rule.sourcePosition), header = source.headers[rule.sourcePosition];
        if (!Number.isInteger(position) || position >= target.length) unresolved.push({ targetId: null, header, ruleName: rule.name, reason: matches.length ? 'ambiguous' : 'missing' });
        else sourceRules.push({ ...rule, sourcePosition: position });
      }
      return { compatible: unresolved.length === 0, schemaExact, matchedCount: Object.keys(mapping).length + Object.keys(customFieldMapping).length,
        unresolved, sourceType: source.sourceType, mapping, customFieldMapping, preparationRules: structuredClone(source.preparationRules), sourceRules };
    } };
  }
  return { collisionSweep, collisionGrid, collisionPreparedSAT, createSceneCache, createSlotIndex, matchArticlesIndexed, createAnchorIndex,
    findConnectionSnapIndexed, lockedEditConflictIndexed, compileImportProfile };
}

// Callers own revisions; no persisted workspace field or IndexedDB schema changes.
export function revisionKey(v) {
  if (!v || ['workspaceId', 'layoutRevision', 'registryRevision', 'locale', 'kernelVersion'].some(k => v[k] === undefined))
    throw new TypeError('Explicit workspace/layout/registry/locale/kernel versions required');
  return JSON.stringify([v.workspaceId, v.layoutRevision, v.registryRevision, v.locale, v.kernelVersion]);
}

export function workspaceProjection(workspace) {
  return { id: workspace.id, name: workspace.name, language: workspace.language, analyzed: workspace.analyzed,
    sourceCount: workspace.files.length,
    sourceBytes: workspace.files.reduce((n, f) => n + (f.buffer instanceof ArrayBuffer ? f.buffer.byteLength : 0), 0),
    normalizedRowCount: workspace.files.reduce((n, f) => n + (f.result && Array.isArray(f.result.rows) ? f.result.rows.length : 0), 0),
    activeCustomFields: (workspace.customFields || []).filter(f => f.active !== false).length,
    importProfileCount: (workspace.importProfiles || []).length,
    warehouseObjectCount: workspace.warehouseLayout ? workspace.warehouseLayout.objects.length : 0 };
}

export function createWorkspaceProjectionCache() {
  let last, lastRevision, result;
  return { get(workspace, revision) {
    if (!Number.isInteger(revision) || revision < 0) throw new TypeError('Nonnegative workspace revision required');
    if (last !== workspace || lastRevision !== revision) { result = workspaceProjection(workspace); last = workspace; lastRevision = revision; }
    return result;
  } };
}

export function batchTransparent(scene) {
  const packed = new Float32Array(scene.transparent.reduce((n, vertices) => n + vertices.length, 0));
  let offset = 0;
  for (const vertices of scene.transparent) { packed.set(vertices, offset); offset += vertices.length; }
  return packed;
}
