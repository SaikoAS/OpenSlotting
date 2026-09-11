(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.OpenSlottingWorkspaces = api;
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const SCHEMA_VERSION = 1;
  const STORAGE_KEY = 'openslotting.workspaces.v1';
  const BACKUP_KIND = 'OpenSlotting workspace backup';

  function clone(value) {
    return JSON.parse(JSON.stringify(value, function (_key, item) {
      return typeof item === 'bigint' ? { $bigint: item.toString() } : item;
    }), function (_key, item) {
      return item && typeof item === 'object' && Object.keys(item).length === 1 && typeof item.$bigint === 'string'
        ? BigInt(item.$bigint) : item;
    });
  }

  function id() {
    return 'ws-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function cleanName(name) {
    const result = String(name || '').trim();
    if (!result) throw new Error('WORKSPACE_NAME_REQUIRED');
    return result.slice(0, 100);
  }

  function emptyStore() {
    return { schemaVersion: SCHEMA_VERSION, selectedId: null, workspaces: [] };
  }

  function validateWorkspace(workspace) {
    if (!workspace || typeof workspace !== 'object' || typeof workspace.id !== 'string' ||
        typeof workspace.name !== 'string' || !workspace.name.trim() ||
        !workspace.data || typeof workspace.data !== 'object') {
      throw new Error('INVALID_BACKUP');
    }
  }

  function validateStore(store) {
    if (!store || typeof store !== 'object') throw new Error('STORAGE_INVALID');
    if (store.schemaVersion !== SCHEMA_VERSION) throw new Error('UNSUPPORTED_SCHEMA');
    if (!Array.isArray(store.workspaces)) throw new Error('STORAGE_INVALID');
    store.workspaces.forEach(validateWorkspace);
    if (store.selectedId !== null && !store.workspaces.some(function (item) { return item.id === store.selectedId; })) {
      store.selectedId = null;
    }
    return store;
  }

  function Repository(storage) {
    this.storage = storage;
  }

  Repository.prototype.load = function () {
    let raw;
    try { raw = this.storage.getItem(STORAGE_KEY); } catch (_error) { throw new Error('STORAGE_UNAVAILABLE'); }
    if (!raw) return emptyStore();
    try {
      const parsed = clone(JSON.parse(raw));
      if (parsed && parsed.schemaVersion === 0 && Array.isArray(parsed.workspaces)) {
        const now = new Date().toISOString();
        parsed.schemaVersion = SCHEMA_VERSION;
        parsed.workspaces = parsed.workspaces.map(function (workspace) {
          return Object.assign({ createdAt: now, updatedAt: now, data: {} }, workspace);
        });
        return this.commit(parsed);
      }
      return validateStore(parsed);
    } catch (error) {
      if (error.message === 'UNSUPPORTED_SCHEMA') throw error;
      throw new Error('STORAGE_INVALID');
    }
  };

  Repository.prototype.commit = function (store) {
    const safe = validateStore(clone(store));
    try { this.storage.setItem(STORAGE_KEY, JSON.stringify(safe, function (_key, value) {
      return typeof value === 'bigint' ? { $bigint: value.toString() } : value;
    })); } catch (error) {
      if (error && (error.name === 'QuotaExceededError' || error.code === 22 || error.code === 1014)) throw new Error('STORAGE_QUOTA');
      throw new Error('STORAGE_UNAVAILABLE');
    }
    return safe;
  };

  Repository.prototype.create = function (name, data) {
    const store = this.load();
    const now = new Date().toISOString();
    const workspace = { id: id(), name: cleanName(name), createdAt: now, updatedAt: now, data: clone(data || {}) };
    store.workspaces.push(workspace); store.selectedId = workspace.id; this.commit(store); return clone(workspace);
  };
  Repository.prototype.select = function (workspaceId) {
    const store = this.load();
    if (!store.workspaces.some(function (item) { return item.id === workspaceId; })) throw new Error('WORKSPACE_NOT_FOUND');
    store.selectedId = workspaceId; this.commit(store);
  };
  Repository.prototype.save = function (workspaceId, data) {
    const store = this.load(); const workspace = store.workspaces.find(function (item) { return item.id === workspaceId; });
    if (!workspace) throw new Error('WORKSPACE_NOT_FOUND');
    workspace.data = clone(data); workspace.updatedAt = new Date().toISOString(); this.commit(store); return clone(workspace);
  };
  Repository.prototype.rename = function (workspaceId, name) {
    const store = this.load(); const workspace = store.workspaces.find(function (item) { return item.id === workspaceId; });
    if (!workspace) throw new Error('WORKSPACE_NOT_FOUND');
    workspace.name = cleanName(name); workspace.updatedAt = new Date().toISOString(); this.commit(store); return clone(workspace);
  };
  Repository.prototype.remove = function (workspaceId) {
    const store = this.load(); const before = store.workspaces.length;
    store.workspaces = store.workspaces.filter(function (item) { return item.id !== workspaceId; });
    if (before === store.workspaces.length) throw new Error('WORKSPACE_NOT_FOUND');
    if (store.selectedId === workspaceId) store.selectedId = store.workspaces.length ? store.workspaces[0].id : null;
    return this.commit(store);
  };
  Repository.prototype.export = function (workspaceId) {
    const workspace = this.load().workspaces.find(function (item) { return item.id === workspaceId; });
    if (!workspace) throw new Error('WORKSPACE_NOT_FOUND');
    return JSON.stringify({ kind: BACKUP_KIND, schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), workspace: clone(workspace) }, function (_key, value) {
      return typeof value === 'bigint' ? { $bigint: value.toString() } : value;
    }, 2);
  };
  Repository.prototype.restore = function (text, options) {
    let backup;
    try { backup = JSON.parse(text); } catch (_error) { throw new Error('INVALID_BACKUP'); }
    if (!backup || backup.kind !== BACKUP_KIND || backup.schemaVersion !== SCHEMA_VERSION) {
      if (backup && backup.kind === BACKUP_KIND && Number.isInteger(backup.schemaVersion)) throw new Error('UNSUPPORTED_BACKUP');
      throw new Error('INVALID_BACKUP');
    }
    validateWorkspace(backup.workspace);
    const store = this.load(); const source = clone(backup.workspace); const now = new Date().toISOString();
    if (options && options.replaceId) {
      const index = store.workspaces.findIndex(function (item) { return item.id === options.replaceId; });
      if (index < 0) throw new Error('WORKSPACE_NOT_FOUND');
      source.id = options.replaceId; source.name = store.workspaces[index].name; source.createdAt = store.workspaces[index].createdAt; source.updatedAt = now;
      store.workspaces[index] = source; store.selectedId = source.id;
    } else {
      source.id = id(); source.name = cleanName(source.name); source.createdAt = now; source.updatedAt = now;
      store.workspaces.push(source); store.selectedId = source.id;
    }
    this.commit(store); return clone(source);
  };

  return { SCHEMA_VERSION: SCHEMA_VERSION, STORAGE_KEY: STORAGE_KEY, BACKUP_KIND: BACKUP_KIND, Repository: Repository, clone: clone };
}));
