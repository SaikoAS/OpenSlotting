(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./workspace.js'));
  } else {
    root.OpenSlottingStorage = factory(root.OpenSlottingWorkspace);
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (workspaceModel) {
  'use strict';

  const DATABASE_NAME = 'openslotting-workspaces';
  const DATABASE_VERSION = 1;
  const ACTIVE_WORKSPACE_SETTING = 'active-workspace-id';

  class WorkspaceStorageError extends Error {
    constructor(code, message, cause) {
      super(message);
      this.name = 'WorkspaceStorageError';
      this.code = code;
      this.cause = cause || null;
    }
  }

  function storageError(code, message, cause) {
    return new WorkspaceStorageError(code, message, cause);
  }

  function normalizeStorageError(error) {
    if (error instanceof WorkspaceStorageError) {
      return error;
    }
    if (error && error.name === 'QuotaExceededError') {
      return storageError('quota_exceeded', 'The browser storage quota was exceeded.', error);
    }
    if (error && error.name === 'AbortError') {
      return storageError('storage_aborted', 'The browser storage transaction was aborted.', error);
    }
    return storageError('storage_failed', error && error.message ? error.message : 'Browser storage operation failed.', error);
  }

  function requestPromise(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(normalizeStorageError(request.error)); };
    });
  }

  function storageRevisionOf(metadata) {
    return metadata && Number.isInteger(metadata.storageRevision) && metadata.storageRevision >= 0
      ? metadata.storageRevision
      : 0;
  }

  function metadataFor(workspace, storageRevision) {
    const normalizedRowCount = workspace.files.reduce(function (sum, file) {
      return sum + (file.result && Array.isArray(file.result.rows) ? file.result.rows.length : 0);
    }, 0);
    const sourceBytes = workspace.files.reduce(function (sum, file) {
      return sum + (file.buffer instanceof ArrayBuffer ? file.buffer.byteLength : 0);
    }, 0);
    return {
      id: workspace.id,
      name: workspace.name,
      schemaVersion: workspace.schemaVersion,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
      language: workspace.language,
      analyzed: workspace.analyzed,
      storageRevision: storageRevision,
      sourceCount: workspace.files.length,
      sourceBytes: sourceBytes,
      normalizedRowCount: normalizedRowCount
    };
  }

  function payloadFor(workspace) {
    return {
      workspaceId: workspace.id,
      files: workspace.files
    };
  }

  function metadataWithSummary(metadata, summary) {
    const values = summary || {};
    return Object.assign({}, metadata, {
      analyzed: Boolean(values.analyzed),
      sourceCount: Number.isInteger(values.sourceCount) && values.sourceCount >= 0 ? values.sourceCount : metadata.sourceCount,
      sourceBytes: Number.isFinite(values.sourceBytes) && values.sourceBytes >= 0 ? values.sourceBytes : metadata.sourceBytes,
      normalizedRowCount: Number.isInteger(values.normalizedRowCount) && values.normalizedRowCount >= 0
        ? values.normalizedRowCount
        : metadata.normalizedRowCount
    });
  }

  function combineStoredWorkspace(metadata, payload) {
    if (!metadata || !payload) {
      return null;
    }
    const workspace = workspaceModel.migrateWorkspace({
      id: metadata.id,
      schemaVersion: metadata.schemaVersion,
      name: metadata.name,
      createdAt: metadata.createdAt,
      updatedAt: metadata.updatedAt,
      language: metadata.language,
      analyzed: metadata.analyzed,
      files: payload.files
    });
    workspace.storageRevision = storageRevisionOf(metadata);
    return workspace;
  }

  function combineStoredWorkspaceRaw(metadata, payload) {
    if (!metadata || !payload) {
      return null;
    }
    return {
      id: metadata.id,
      schemaVersion: metadata.schemaVersion,
      name: metadata.name,
      createdAt: metadata.createdAt,
      updatedAt: metadata.updatedAt,
      language: metadata.language,
      analyzed: metadata.analyzed,
      storageRevision: storageRevisionOf(metadata),
      files: payload.files
    };
  }

  function createRepository(options) {
    const settings = options || {};
    const indexedDb = settings.indexedDB || (typeof indexedDB !== 'undefined' ? indexedDB : null);
    const storageManager = settings.storageManager || (
      typeof navigator !== 'undefined' && navigator.storage ? navigator.storage : null
    );
    const databaseName = settings.databaseName || DATABASE_NAME;
    let database = null;
    let opening = null;

    function open() {
      if (database) {
        return Promise.resolve(database);
      }
      if (opening) {
        return opening;
      }
      if (!indexedDb || typeof indexedDb.open !== 'function') {
        return Promise.reject(storageError('storage_unavailable', 'IndexedDB is not available.'));
      }
      opening = new Promise(function (resolve, reject) {
        let request;
        let blocked = false;
        try {
          request = indexedDb.open(databaseName, DATABASE_VERSION);
        } catch (error) {
          reject(normalizeStorageError(error));
          return;
        }
        request.onupgradeneeded = function () {
          const db = request.result;
          if (!db.objectStoreNames.contains('workspaces')) {
            db.createObjectStore('workspaces', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('workspacePayloads')) {
            db.createObjectStore('workspacePayloads', { keyPath: 'workspaceId' });
          }
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' });
          }
        };
        request.onblocked = function () {
          blocked = true;
          reject(storageError('storage_blocked', 'IndexedDB upgrade is blocked by another OpenSlotting window.'));
        };
        request.onerror = function () {
          reject(normalizeStorageError(request.error));
        };
        request.onsuccess = function () {
          const openedDatabase = request.result;
          if (blocked) {
            openedDatabase.close();
            return;
          }
          database = openedDatabase;
          opening = null;
          database.onversionchange = function () {
            database.close();
            database = null;
            opening = null;
          };
          resolve(database);
        };
      }).catch(function (error) {
        opening = null;
        throw error;
      });
      return opening;
    }

    function transact(storeNames, mode, operation) {
      return open().then(function (db) {
        return new Promise(function (resolve, reject) {
          let transaction;
          let result;
          let operationError = null;
          try {
            transaction = db.transaction(storeNames, mode);
          } catch (error) {
            reject(normalizeStorageError(error));
            return;
          }
          const stores = {};
          storeNames.forEach(function (name) {
            stores[name] = transaction.objectStore(name);
          });
          transaction.oncomplete = function () {
            if (operationError) {
              reject(normalizeStorageError(operationError));
            } else {
              resolve(result);
            }
          };
          transaction.onerror = function () {
            reject(normalizeStorageError(transaction.error || operationError));
          };
          transaction.onabort = function () {
            reject(normalizeStorageError(operationError || transaction.error || { name: 'AbortError' }));
          };
          Promise.resolve()
            .then(function () { return operation(stores, transaction); })
            .then(function (value) { result = value; })
            .catch(function (error) {
              operationError = error;
              try {
                transaction.abort();
              } catch (abortError) {
                reject(normalizeStorageError(error));
              }
            });
        });
      });
    }

    function writeWorkspace(workspace, mode, options) {
      const settings = options || {};
      const validated = settings.validated ? workspace : workspaceModel.validateWorkspace(workspace);
      return transact(['workspaces', 'workspacePayloads'], 'readwrite', async function (stores) {
        const current = await requestPromise(stores.workspaces.get(validated.id));
        if (mode === 'create' && current) {
          throw storageError('workspace_conflict', 'Workspace already exists.');
        }
        if (mode !== 'create' && !current) {
          throw storageError('workspace_not_found', 'Workspace does not exist.');
        }
        const currentRevision = storageRevisionOf(current);
        if (mode !== 'create' && settings.expectedRevision !== currentRevision) {
          throw storageError('workspace_conflict', 'Workspace changed in another browser tab.');
        }
        const nextRevision = mode === 'create' ? 1 : currentRevision + 1;
        stores.workspaces.put(metadataFor(validated, nextRevision));
        stores.workspacePayloads.put(payloadFor(validated));
        return Object.assign({}, validated, { storageRevision: nextRevision });
      });
    }

    function createWorkspace(workspace, options) {
      return writeWorkspace(workspace, 'create', options);
    }

    function updateWorkspace(workspace, options) {
      return writeWorkspace(workspace, 'update', options);
    }

    function replaceWorkspace(workspace, options) {
      return writeWorkspace(workspace, 'replace', options);
    }

    function loadWorkspace(id) {
      const workspaceId = String(id || '');
      if (!workspaceId) {
        return Promise.resolve(null);
      }
      return transact(['workspaces', 'workspacePayloads'], 'readonly', async function (stores) {
        const values = await Promise.all([
          requestPromise(stores.workspaces.get(workspaceId)),
          requestPromise(stores.workspacePayloads.get(workspaceId))
        ]);
        return combineStoredWorkspace(values[0], values[1]);
      });
    }

    function loadWorkspaceRaw(id) {
      const workspaceId = String(id || '');
      if (!workspaceId) {
        return Promise.resolve(null);
      }
      return transact(['workspaces', 'workspacePayloads'], 'readonly', async function (stores) {
        const values = await Promise.all([
          requestPromise(stores.workspaces.get(workspaceId)),
          requestPromise(stores.workspacePayloads.get(workspaceId))
        ]);
        return combineStoredWorkspaceRaw(values[0], values[1]);
      });
    }

    function listWorkspaces() {
      return transact(['workspaces'], 'readonly', async function (stores) {
        const records = await requestPromise(stores.workspaces.getAll());
        return records
          .map(function (record) {
            return Object.assign({}, record, { storageRevision: storageRevisionOf(record) });
          })
          .sort(function (left, right) {
            return String(right.updatedAt).localeCompare(String(left.updatedAt)) || left.name.localeCompare(right.name);
          });
      });
    }

    function renameWorkspace(id, name, options) {
      const workspaceId = String(id || '');
      const normalizedName = workspaceModel.assertWorkspaceName(name);
      const settings = options || {};
      const updatedAt = settings.now || new Date().toISOString();
      return transact(['workspaces'], 'readwrite', async function (stores) {
        const metadata = await requestPromise(stores.workspaces.get(workspaceId));
        if (!metadata) {
          throw storageError('workspace_not_found', 'Workspace does not exist.');
        }
        const currentRevision = storageRevisionOf(metadata);
        if (settings.expectedRevision !== currentRevision) {
          throw storageError('workspace_conflict', 'Workspace changed in another browser tab.');
        }
        const renamed = Object.assign({}, metadata, {
          name: normalizedName,
          updatedAt: updatedAt,
          storageRevision: currentRevision + 1
        });
        stores.workspaces.put(renamed);
        return renamed;
      });
    }

    function updateWorkspaceSummary(id, summary, options) {
      const workspaceId = String(id || '');
      const settings = options || {};
      return transact(['workspaces'], 'readwrite', async function (stores) {
        const metadata = await requestPromise(stores.workspaces.get(workspaceId));
        if (!metadata) {
          throw storageError('workspace_not_found', 'Workspace does not exist.');
        }
        if (settings.expectedRevision !== storageRevisionOf(metadata)) {
          throw storageError('workspace_conflict', 'Workspace changed in another browser tab.');
        }
        const updated = metadataWithSummary(metadata, summary);
        updated.storageRevision = storageRevisionOf(metadata) + 1;
        stores.workspaces.put(updated);
        return updated;
      });
    }

    function commitWorkspaceActivation(id, summary, options) {
      const workspaceId = String(id || '');
      const settings = options || {};
      return transact(['workspaces', 'settings'], 'readwrite', async function (stores) {
        const metadata = await requestPromise(stores.workspaces.get(workspaceId));
        if (!metadata) {
          throw storageError('workspace_not_found', 'Workspace does not exist.');
        }
        if (settings.expectedRevision !== storageRevisionOf(metadata)) {
          throw storageError('workspace_conflict', 'Workspace changed in another browser tab.');
        }
        const updated = metadataWithSummary(metadata, summary);
        updated.storageRevision = storageRevisionOf(metadata) + 1;
        stores.workspaces.put(updated);
        stores.settings.put({ key: ACTIVE_WORKSPACE_SETTING, value: workspaceId });
        return updated;
      });
    }

    function deleteWorkspace(id) {
      const workspaceId = String(id || '');
      return transact(['workspaces', 'workspacePayloads', 'settings'], 'readwrite', async function (stores) {
        stores.workspaces.delete(workspaceId);
        stores.workspacePayloads.delete(workspaceId);
        const active = await requestPromise(stores.settings.get(ACTIVE_WORKSPACE_SETTING));
        if (active && active.value === workspaceId) {
          stores.settings.delete(ACTIVE_WORKSPACE_SETTING);
        }
      });
    }

    function setActiveWorkspace(id) {
      const workspaceId = id === null || id === undefined ? null : String(id);
      if (workspaceId === null) {
        return transact(['settings'], 'readwrite', function (stores) {
          stores.settings.delete(ACTIVE_WORKSPACE_SETTING);
        });
      }
      return transact(['workspaces', 'settings'], 'readwrite', async function (stores) {
        const metadata = await requestPromise(stores.workspaces.get(workspaceId));
        if (!metadata) {
          throw storageError('workspace_not_found', 'Workspace does not exist.');
        }
        stores.settings.put({ key: ACTIVE_WORKSPACE_SETTING, value: workspaceId });
        return workspaceId;
      });
    }

    function getActiveWorkspaceId() {
      return transact(['settings'], 'readonly', async function (stores) {
        const record = await requestPromise(stores.settings.get(ACTIVE_WORKSPACE_SETTING));
        return record && record.value ? String(record.value) : null;
      });
    }

    function estimateStorage() {
      if (!storageManager || typeof storageManager.estimate !== 'function') {
        return Promise.resolve({ available: false, reason: 'unavailable' });
      }
      return Promise.resolve()
        .then(function () { return storageManager.estimate(); })
        .then(function (estimate) {
          const usage = Number(estimate && estimate.usage);
          const quota = Number(estimate && estimate.quota);
          if (!Number.isFinite(usage) || !Number.isFinite(quota) || usage < 0 || quota < 0) {
            return { available: false, reason: 'unavailable' };
          }
          return {
            available: true,
            usage: usage,
            quota: quota,
            remaining: Math.max(0, quota - usage)
          };
        })
        .catch(function () {
          return { available: false, reason: 'failed' };
        });
    }

    function close() {
      if (database) {
        database.close();
        database = null;
      }
      opening = null;
    }

    return {
      open: open,
      createWorkspace: createWorkspace,
      updateWorkspace: updateWorkspace,
      replaceWorkspace: replaceWorkspace,
      loadWorkspace: loadWorkspace,
      loadWorkspaceRaw: loadWorkspaceRaw,
      listWorkspaces: listWorkspaces,
      renameWorkspace: renameWorkspace,
      updateWorkspaceSummary: updateWorkspaceSummary,
      commitWorkspaceActivation: commitWorkspaceActivation,
      deleteWorkspace: deleteWorkspace,
      setActiveWorkspace: setActiveWorkspace,
      getActiveWorkspaceId: getActiveWorkspaceId,
      estimateStorage: estimateStorage,
      close: close
    };
  }

  return {
    DATABASE_NAME: DATABASE_NAME,
    DATABASE_VERSION: DATABASE_VERSION,
    ACTIVE_WORKSPACE_SETTING: ACTIVE_WORKSPACE_SETTING,
    WorkspaceStorageError: WorkspaceStorageError,
    normalizeStorageError: normalizeStorageError,
    createRepository: createRepository
  };
}));
