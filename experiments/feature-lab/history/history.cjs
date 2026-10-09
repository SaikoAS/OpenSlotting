'use strict';

const warehouse = require('../../../tests/fixtures/warehouse-baseline.cjs');
const LIMIT = 20; // Current warehouse-editor.js keepRecent limit.
const clone = value => JSON.parse(JSON.stringify(value));
const rootFields = layout => Object.fromEntries(Object.entries(layout).filter(([key]) => key !== 'objects'));

function createDelta(before, after, beforeSelection, afterSelection) {
  const previous = new Map(before.objects.map(object => [object.id, object]));
  const proposed = new Map(after.objects.map(object => [object.id, object]));
  const changes = [];
  for (const id of new Set([...previous.keys(), ...proposed.keys()])) {
    const oldObject = previous.get(id) || null;
    const newObject = proposed.get(id) || null;
    if (JSON.stringify(oldObject) !== JSON.stringify(newObject)) changes.push({ id, before: clone(oldObject), after: clone(newObject) });
  }
  return { rootBefore: clone(rootFields(before)), rootAfter: clone(rootFields(after)),
    orderBefore: before.objects.map(object => object.id), orderAfter: after.objects.map(object => object.id),
    changes, beforeSelection, afterSelection };
}

function applyDelta(current, delta, direction) {
  if (!['before', 'after'].includes(direction)) throw new TypeError('Delta direction must be before or after.');
  const objects = new Map(current.objects.map(object => [object.id, object]));
  for (const change of delta.changes) {
    const object = change[direction];
    if (object === null) objects.delete(change.id);
    else objects.set(change.id, clone(object));
  }
  const order = direction === 'before' ? delta.orderBefore : delta.orderAfter;
  const root = direction === 'before' ? delta.rootBefore : delta.rootAfter;
  return Object.assign(clone(root), { objects: order.map(id => {
    const object = objects.get(id);
    if (!object) throw new Error('Delta object is missing: ' + id);
    return object;
  }) });
}

function createHistory(options) {
  const model = options.model || warehouse;
  if (!['snapshots', 'deltas'].includes(options.representation)) throw new TypeError('Unknown history representation.');
  const representation = options.representation;
  let workspaceId = null;
  let undoStack = [];
  let redoStack = [];
  let saving = false;
  let lastError = null;
  function syncScope() {
    const current = options.getWorkspaceId();
    if (current !== workspaceId) { workspaceId = current; undoStack = []; redoStack = []; }
  }
  function keepRecent(stack, entry) { stack.push(entry); if (stack.length > LIMIT) stack.shift(); }
  function entry(before, after, beforeSelection, afterSelection, target) {
    return representation === 'snapshots'
      ? { layout: target === 'before' ? before : after, selectionId: target === 'before' ? beforeSelection : afterSelection }
      : createDelta(before, after, beforeSelection, afterSelection);
  }
  function targetFor(item, action) {
    return representation === 'snapshots'
      ? { layout: clone(item.layout), selectionId: item.selectionId }
      : { layout: applyDelta(options.getLayout(), item, action === 'undo' ? 'before' : 'after'),
        selectionId: action === 'undo' ? item.beforeSelection : item.afterSelection };
  }
  async function commit(next, settings = {}) {
    if (saving) return false;
    syncScope();
    const scope = workspaceId;
    const before = clone(options.getLayout());
    const beforeSelection = options.getSelection();
    const { historyAction, selectionAfter, toggleLockId } = settings;
    lastError = null;
    try {
      // Same semantics as warehouse-editor.js: locks are not undoable.
      if (historyAction === 'undo' || historyAction === 'redo') {
        const locks = new Map(before.objects.map(object => [object.id, object.locked === true]));
        next = Object.assign({}, next, { objects: next.objects.map(object => Object.assign({}, object, { locked: locks.get(object.id) || false })) });
      }
      const normalized = model.normalizeLayout(next);
      if (model.lockedEditConflict(before, normalized, toggleLockId)) { lastError = 'locked-edit-conflict'; return false; }
      if (JSON.stringify(normalized) === JSON.stringify(before)) return false;
      saving = true;
      // History and selection change only after confirmed persistence.
      await options.save(normalized);
      syncScope();
      const normalizedSelection = selectionAfter === undefined ? beforeSelection : selectionAfter;
      if (scope === workspaceId) {
        if (historyAction === 'undo') {
          undoStack.pop();
          keepRecent(redoStack, entry(normalized, before, normalizedSelection, beforeSelection, 'after'));
        } else if (historyAction === 'redo') {
          redoStack.pop();
          keepRecent(undoStack, entry(before, normalized, beforeSelection, normalizedSelection, 'before'));
        } else if (!toggleLockId) {
          keepRecent(undoStack, entry(before, normalized, beforeSelection, normalizedSelection, 'before'));
          redoStack = [];
        }
      }
      if (selectionAfter !== undefined) options.setSelection(selectionAfter);
      return true;
    } catch (error) {
      lastError = error && error.message || String(error);
      return false;
    } finally { saving = false; }
  }
  return Object.freeze({
    commit,
    async undo() { syncScope(); if (!undoStack.length || saving) return false; const target = targetFor(undoStack[undoStack.length - 1], 'undo');
      return commit(target.layout, { historyAction: 'undo', selectionAfter: target.selectionId }); },
    async redo() { syncScope(); if (!redoStack.length || saving) return false; const target = targetFor(redoStack[redoStack.length - 1], 'redo');
      return commit(target.layout, { historyAction: 'redo', selectionAfter: target.selectionId }); },
    inspect() { syncScope(); return { workspaceId, representation, limit: LIMIT, undo: undoStack.length, redo: redoStack.length,
      saving, lastError, retainedJsonBytes: Buffer.byteLength(JSON.stringify({ undoStack, redoStack }), 'utf8') }; }
  });
}

module.exports = { LIMIT, clone, createDelta, applyDelta, createHistory };
