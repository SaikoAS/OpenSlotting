(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./workspace.js'));
  } else {
    root.OpenSlottingStorage = factory(root.OpenSlottingWorkspace);
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (workspaceModel) {
  'use strict';

  const DATABASE_NAME = 'openslotting-workspaces';
  const DATABASE_VERSION = 3;
  const ACTIVE_WORKSPACE_SETTING = 'active-workspace-id';
  const ROW_CHUNK_SIZE = 5000;
  const ISSUE_CHUNK_SIZE = 5000;
  const REGISTRY_CHUNK_SIZE = 1000;
  const REGISTRY_ARRAY_CHUNK_SIZE = 64;
  const CHUNKED_WORKSPACE_STORES = [
    'workspaces',
    'workspacePayloads',
    'workspaceManifests',
    'workspaceSources',
    'workspaceSourceBytes',
    'workspaceRowChunks',
    'workspaceIssueChunks',
    'workspaceRegistryChunks'
  ];

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
      periodSettings: workspace.periodSettings,
      customFields: workspace.customFields,
      storageRevision: storageRevision,
      sourceCount: workspace.files.length,
      sourceBytes: sourceBytes,
      normalizedRowCount: normalizedRowCount
    };
  }

  function sourceStorageKey(workspaceId, sourceId) {
    return String(workspaceId) + '::' + String(sourceId);
  }

  function chunkStorageKey(workspaceId, sourceId, kind, index) {
    return sourceStorageKey(workspaceId, sourceId) + '::' + kind + '::' + String(index);
  }

  function registryChunkStorageKey(workspaceId, index) {
    return String(workspaceId) + '::registry::' + String(index);
  }

  function chunkValues(values, size) {
    const chunks = [];
    for (let index = 0; index < values.length; index += size) {
      chunks.push(values.slice(index, index + size));
    }
    return chunks;
  }

  function appendChunkValues(target, chunk, field) {
    const values = chunk && Array.isArray(chunk[field]) ? chunk[field] : [];
    for (let index = 0; index < values.length; index += 1) {
      target.push(values[index]);
    }
  }

  function registryEntryFragments(entry) {
    const arrayFields = [
      'article_name_variants',
      'source_file_ids',
      'source_files',
      'master_source_file_ids',
      'master_source_files',
      'movement_source_file_ids',
      'movement_source_files',
      'master_row_refs',
      'value_provenance',
      'value_conflicts'
    ];
    const values = arrayFields.reduce(function (result, field) {
      result[field] = Array.isArray(entry[field]) ? entry[field] : [];
      return result;
    }, {});
    const fragmentCount = Math.max.apply(null, arrayFields.map(function (field) {
      return Math.max(1, Math.ceil(values[field].length / REGISTRY_ARRAY_CHUNK_SIZE));
    }));
    const fragments = [];
    for (let index = 0; index < fragmentCount; index += 1) {
      const fragment = Object.assign({}, entry);
      arrayFields.forEach(function (field) {
        const start = index * REGISTRY_ARRAY_CHUNK_SIZE;
        if (Object.prototype.hasOwnProperty.call(entry, field) || values[field].length > 0) {
          fragment[field] = values[field].slice(start, start + REGISTRY_ARRAY_CHUNK_SIZE);
        } else {
          delete fragment[field];
        }
      });
      fragments.push(fragment);
    }
    return fragments;
  }

  function appendRegistryEntries(target, chunks) {
    const byArticleId = new Map();
    chunks.forEach(function (chunk) {
      const entries = chunk && Array.isArray(chunk.entries) ? chunk.entries : [];
      entries.forEach(function (fragment) {
        const articleId = String(fragment.article_id);
        let entry = byArticleId.get(articleId);
        if (!entry) {
          entry = Object.assign({}, fragment);
          [
            'article_name_variants',
            'source_file_ids',
            'source_files',
            'master_source_file_ids',
            'master_source_files',
            'movement_source_file_ids',
            'movement_source_files',
            'master_row_refs',
            'value_provenance',
            'value_conflicts'
          ].forEach(function (field) {
            if (Object.prototype.hasOwnProperty.call(fragment, field)) {
              entry[field] = [];
            }
          });
          byArticleId.set(articleId, entry);
          target.push(entry);
        }
        [
          'article_name_variants',
          'source_file_ids',
          'source_files',
          'master_source_file_ids',
          'master_source_files',
          'movement_source_file_ids',
          'movement_source_files',
          'master_row_refs',
          'value_provenance',
          'value_conflicts'
        ].forEach(function (field) {
          if (!Object.prototype.hasOwnProperty.call(fragment, field)) {
            return;
          }
          if (!Array.isArray(entry[field])) {
            entry[field] = [];
          }
          const values = Array.isArray(fragment[field]) ? fragment[field] : [];
          values.forEach(function (value) { entry[field].push(value); });
        });
      });
    });
  }

  function chunkRegistryFragments(fragments) {
    const chunks = [];
    let current = [];
    let currentWeight = 0;
    fragments.forEach(function (fragment) {
      const weight = [
        'article_name_variants',
        'source_file_ids',
        'source_files',
        'master_source_file_ids',
        'master_source_files',
        'movement_source_file_ids',
        'movement_source_files',
        'master_row_refs',
        'value_provenance',
        'value_conflicts'
      ]
        .reduce(function (sum, field) {
          return sum + (Array.isArray(fragment[field]) ? fragment[field].length : 0);
        }, 0) || 1;
      if (current.length > 0 && currentWeight + weight > REGISTRY_CHUNK_SIZE) {
        chunks.push(current);
        current = [];
        currentWeight = 0;
      }
      current.push(fragment);
      currentWeight += weight;
    });
    if (current.length > 0) {
      chunks.push(current);
    }
    return chunks;
  }

  function chunkedRecords(workspace) {
    const sources = [];
    const sourceRecords = [];
    const sourceByteRecords = [];
    const rowChunkRecords = [];
    const issueChunkRecords = [];
    const registryChunkRecords = [];
    workspace.files.forEach(function (file) {
      const sourceKey = sourceStorageKey(workspace.id, file.id);
      const result = file.result || null;
      const resultMeta = result ? Object.keys(result).reduce(function (copy, key) {
        if (key !== 'rows' && key !== 'issues') {
          copy[key] = result[key];
        }
        return copy;
      }, {}) : null;
      const rows = result && Array.isArray(result.rows) ? result.rows : [];
      const issues = result && Array.isArray(result.issues) ? result.issues : [];
      const rowChunks = chunkValues(rows, ROW_CHUNK_SIZE);
      const issueChunks = chunkValues(issues, ISSUE_CHUNK_SIZE);
      sources.push({
        sourceId: file.id,
        sourceKey: sourceKey,
        byteKey: sourceKey,
        rowChunkKeys: rowChunks.map(function (_, index) { return chunkStorageKey(workspace.id, file.id, 'rows', index); }),
        issueChunkKeys: issueChunks.map(function (_, index) { return chunkStorageKey(workspace.id, file.id, 'issues', index); })
      });
      sourceRecords.push({
        key: sourceKey,
        workspaceId: workspace.id,
        sourceId: file.id,
        name: file.name,
        label: file.label,
        size: file.size,
        lastModified: file.lastModified,
        encodingMode: file.encodingMode,
        activeEncoding: file.activeEncoding,
        detectedEncoding: file.detectedEncoding,
        errorKey: file.errorKey,
        mapping: file.mapping,
        customFieldMapping: file.customFieldMapping,
        confirmedCustomFieldMapping: file.confirmedCustomFieldMapping,
        confirmedMapping: file.confirmedMapping,
        columnCatalog: file.columnCatalog,
        resultMeta: resultMeta,
        sourceType: workspaceModel.normalizeSourceType(file.sourceType)
      });
      if (file.buffer instanceof ArrayBuffer) {
        sourceByteRecords.push({
          key: sourceKey,
          workspaceId: workspace.id,
          sourceId: file.id,
          buffer: file.buffer
        });
      }
      rowChunks.forEach(function (chunk, index) {
        rowChunkRecords.push({
          key: chunkStorageKey(workspace.id, file.id, 'rows', index),
          workspaceId: workspace.id,
          sourceId: file.id,
          index: index,
          rows: chunk
        });
      });
      issueChunks.forEach(function (chunk, index) {
        issueChunkRecords.push({
          key: chunkStorageKey(workspace.id, file.id, 'issues', index),
          workspaceId: workspace.id,
          sourceId: file.id,
          index: index,
          issues: chunk
        });
      });
    });
    const registryFragments = (Array.isArray(workspace.articleRegistry) ? workspace.articleRegistry : [])
      .reduce(function (fragments, entry) {
        return fragments.concat(registryEntryFragments(entry));
      }, []);
    const registryChunks = chunkRegistryFragments(registryFragments);
    registryChunks.forEach(function (chunk, index) {
      registryChunkRecords.push({
        key: registryChunkStorageKey(workspace.id, index),
        workspaceId: workspace.id,
        index: index,
        entries: chunk
      });
    });
    return {
      manifest: {
        workspaceId: workspace.id,
        schemaVersion: workspace.schemaVersion,
        registryChunkKeys: registryChunks.map(function (_, index) { return registryChunkStorageKey(workspace.id, index); }),
        sources: sources
      },
      sourceRecords: sourceRecords,
      sourceByteRecords: sourceByteRecords,
      rowChunkRecords: rowChunkRecords,
      issueChunkRecords: issueChunkRecords,
      registryChunkRecords: registryChunkRecords
    };
  }

  function metadataWithSummary(metadata, summary) {
    const values = summary || {};
    return Object.assign({}, metadata, {
      language: values.language === 'de' || values.language === 'en' ? values.language : metadata.language,
      analyzed: Boolean(values.analyzed),
      periodSettings: values.periodSettings
        ? workspaceModel.normalizePeriodSettings(values.periodSettings)
        : workspaceModel.normalizePeriodSettings(metadata.periodSettings),
      customFields: values.customFields
        ? workspaceModel.normalizeCustomFields(values.customFields)
        : (Array.isArray(metadata.customFields) ? workspaceModel.normalizeCustomFields(metadata.customFields) : []),
      sourceCount: Number.isInteger(values.sourceCount) && values.sourceCount >= 0 ? values.sourceCount : metadata.sourceCount,
      sourceBytes: Number.isFinite(values.sourceBytes) && values.sourceBytes >= 0 ? values.sourceBytes : metadata.sourceBytes,
      normalizedRowCount: Number.isInteger(values.normalizedRowCount) && values.normalizedRowCount >= 0
        ? values.normalizedRowCount
        : metadata.normalizedRowCount
    });
  }

  function putChunkedWorkspace(stores, workspace) {
    const records = chunkedRecords(workspace);
    stores.workspaceManifests.put(records.manifest);
    records.sourceRecords.forEach(function (record) { stores.workspaceSources.put(record); });
    records.sourceByteRecords.forEach(function (record) { stores.workspaceSourceBytes.put(record); });
    records.rowChunkRecords.forEach(function (record) { stores.workspaceRowChunks.put(record); });
    records.issueChunkRecords.forEach(function (record) { stores.workspaceIssueChunks.put(record); });
    records.registryChunkRecords.forEach(function (record) { stores.workspaceRegistryChunks.put(record); });
    return records.manifest;
  }

  function clearChunkedWorkspace(stores, workspaceId) {
    return requestPromise(stores.workspaceManifests.get(workspaceId)).then(function (manifest) {
      if (!manifest) {
        return;
      }
      (manifest.sources || []).forEach(function (source) {
        stores.workspaceSources.delete(source.sourceKey);
        stores.workspaceSourceBytes.delete(source.byteKey);
        (source.rowChunkKeys || []).forEach(function (key) { stores.workspaceRowChunks.delete(key); });
        (source.issueChunkKeys || []).forEach(function (key) { stores.workspaceIssueChunks.delete(key); });
      });
      (manifest.registryChunkKeys || []).forEach(function (key) { stores.workspaceRegistryChunks.delete(key); });
      stores.workspaceManifests.delete(workspaceId);
    });
  }

  function loadChunkedPayload(stores, metadata, manifest, options) {
    const settings = options || {};
    const includeResults = settings.includeResults !== false;
    const sourceEntries = manifest && Array.isArray(manifest.sources) ? manifest.sources : [];
    const requests = sourceEntries.map(function (entry) {
      const sourceRequest = requestPromise(stores.workspaceSources.get(entry.sourceKey));
      const bytesRequest = requestPromise(stores.workspaceSourceBytes.get(entry.byteKey));
      const rowRequests = includeResults
        ? (entry.rowChunkKeys || []).map(function (key) { return requestPromise(stores.workspaceRowChunks.get(key)); })
        : [];
      const issueRequests = includeResults
        ? (entry.issueChunkKeys || []).map(function (key) { return requestPromise(stores.workspaceIssueChunks.get(key)); })
        : [];
      return Promise.all([sourceRequest, bytesRequest, Promise.all(rowRequests), Promise.all(issueRequests)]).then(function (values) {
        const source = values[0];
        if (!source) {
          return null;
        }
        let result = null;
        if (includeResults && source.resultMeta) {
          const rows = [];
          values[2].forEach(function (chunk) { appendChunkValues(rows, chunk, 'rows'); });
          const issues = [];
          values[3].forEach(function (chunk) { appendChunkValues(issues, chunk, 'issues'); });
          result = Object.assign({}, source.resultMeta, { rows: rows, issues: issues });
        }
        return {
          id: source.sourceId,
          name: source.name,
          label: source.label,
          size: source.size,
          lastModified: source.lastModified,
          buffer: values[1] ? values[1].buffer : null,
          encodingMode: source.encodingMode,
          activeEncoding: source.activeEncoding,
          detectedEncoding: source.detectedEncoding,
          errorKey: source.errorKey,
          mapping: source.mapping,
          customFieldMapping: source.customFieldMapping,
          confirmedCustomFieldMapping: source.confirmedCustomFieldMapping,
          confirmedMapping: source.confirmedMapping,
          columnCatalog: Array.isArray(source.columnCatalog) ? source.columnCatalog : [],
          result: result,
          sourceType: workspaceModel.normalizeSourceType(source.sourceType)
        };
      });
    });
    const registryRequests = includeResults && manifest && Array.isArray(manifest.registryChunkKeys)
      ? manifest.registryChunkKeys.map(function (key) { return requestPromise(stores.workspaceRegistryChunks.get(key)); })
      : [];
    return Promise.all([Promise.all(requests), Promise.all(registryRequests)]).then(function (values) {
      const files = values[0];
      const registry = [];
      if (includeResults) {
        appendRegistryEntries(registry, values[1]);
      }
      if (includeResults && registry.length === 0 && (!manifest || !Array.isArray(manifest.registryChunkKeys)) && Array.isArray(manifest && manifest.articleRegistry)) {
        manifest.articleRegistry.forEach(function (entry) { registry.push(entry); });
      }
      if (files.some(function (file) { return file === null; })) {
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
        periodSettings: metadata.periodSettings,
        customFields: Array.isArray(metadata.customFields) ? metadata.customFields : [],
        articleRegistry: includeResults ? registry : [],
        storageRevision: storageRevisionOf(metadata),
        files: files
      };
    });
  }

  function combineStoredWorkspaceRaw(metadata, payload, options) {
    if (!metadata || !payload) {
      return null;
    }
    const files = Array.isArray(payload.files) ? payload.files.map(function (file) {
      if (!options || options.includeResults !== false) {
        return file;
      }
      return Object.assign({}, file, { result: null });
    }) : [];
    return {
      id: metadata.id,
      schemaVersion: metadata.schemaVersion,
      name: metadata.name,
      createdAt: metadata.createdAt,
      updatedAt: metadata.updatedAt,
      language: metadata.language,
      analyzed: metadata.analyzed,
      periodSettings: metadata.periodSettings,
      customFields: Array.isArray(metadata.customFields) ? metadata.customFields : [],
      articleRegistry: Array.isArray(payload.articleRegistry) ? payload.articleRegistry : [],
      storageRevision: storageRevisionOf(metadata),
      files: files
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
          if (!db.objectStoreNames.contains('workspaceManifests')) {
            db.createObjectStore('workspaceManifests', { keyPath: 'workspaceId' });
          }
          if (!db.objectStoreNames.contains('workspaceSources')) {
            db.createObjectStore('workspaceSources', { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains('workspaceSourceBytes')) {
            db.createObjectStore('workspaceSourceBytes', { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains('workspaceRowChunks')) {
            db.createObjectStore('workspaceRowChunks', { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains('workspaceIssueChunks')) {
            db.createObjectStore('workspaceIssueChunks', { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains('workspaceRegistryChunks')) {
            db.createObjectStore('workspaceRegistryChunks', { keyPath: 'key' });
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
      return transact(CHUNKED_WORKSPACE_STORES, 'readwrite', async function (stores) {
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
        await clearChunkedWorkspace(stores, validated.id);
        stores.workspacePayloads.delete(validated.id);
        putChunkedWorkspace(stores, validated);
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

    function readStoredWorkspace(id, options) {
      const workspaceId = String(id || '');
      if (!workspaceId) {
        return Promise.resolve(null);
      }
      return transact(CHUNKED_WORKSPACE_STORES, 'readonly', async function (stores) {
        const metadata = await requestPromise(stores.workspaces.get(workspaceId));
        if (!metadata) {
          return null;
        }
        const manifest = await requestPromise(stores.workspaceManifests.get(workspaceId));
        if (manifest) {
          return loadChunkedPayload(stores, metadata, manifest, options);
        }
        const payload = await requestPromise(stores.workspacePayloads.get(workspaceId));
        if (!payload) {
          return null;
        }
        return {
          legacy: true,
          workspace: combineStoredWorkspaceRaw(metadata, payload, options)
        };
      });
    }

    function loadWorkspaceRaw(id, options) {
      return readStoredWorkspace(id, options).then(function (stored) {
        if (!stored) {
          return null;
        }
        if (!stored.legacy) {
          return stored;
        }
        return stored.workspace;
      });
    }

    function loadWorkspace(id) {
      return loadWorkspaceRaw(id).then(function (record) {
        return record ? workspaceModel.migrateWorkspace(record, { clonePayload: false }) : null;
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
        updated.updatedAt = settings.now || new Date().toISOString();
        updated.storageRevision = storageRevisionOf(metadata) + 1;
        stores.workspaces.put(updated);
        return updated;
      });
    }

    function commitWorkspaceActivation(id, summary, options) {
      const workspaceId = String(id || '');
      const settings = options || {};
      return transact(CHUNKED_WORKSPACE_STORES.concat(['settings']), 'readwrite', async function (stores) {
        const metadata = await requestPromise(stores.workspaces.get(workspaceId));
        if (!metadata) {
          throw storageError('workspace_not_found', 'Workspace does not exist.');
        }
        if (settings.expectedRevision !== storageRevisionOf(metadata)) {
          throw storageError('workspace_conflict', 'Workspace changed in another browser tab.');
        }
        const updated = metadataWithSummary(metadata, summary);
        updated.storageRevision = storageRevisionOf(metadata) + 1;
        let persisted = null;
        if (settings.persistedWorkspace) {
          persisted = workspaceModel.validateWorkspace(settings.persistedWorkspace, { clonePayload: false });
          if (persisted.id !== workspaceId) {
            throw storageError('workspace_conflict', 'Workspace payload belongs to another workspace.');
          }
          updated.schemaVersion = persisted.schemaVersion;
          updated.language = persisted.language;
          await clearChunkedWorkspace(stores, workspaceId);
          stores.workspacePayloads.delete(workspaceId);
          putChunkedWorkspace(stores, persisted);
        }
        stores.workspaces.put(updated);
        stores.settings.put({ key: ACTIVE_WORKSPACE_SETTING, value: workspaceId });
        return updated;
      });
    }

    function deleteWorkspace(id, options) {
      const workspaceId = String(id || '');
      const settings = options || {};
      return transact(CHUNKED_WORKSPACE_STORES.concat(['settings']), 'readwrite', async function (stores) {
        const metadata = await requestPromise(stores.workspaces.get(workspaceId));
        if (!metadata) {
          throw storageError('workspace_not_found', 'Workspace does not exist.');
        }
        if (settings.expectedRevision !== storageRevisionOf(metadata)) {
          throw storageError('workspace_conflict', 'Workspace changed in another browser tab.');
        }
        stores.workspaces.delete(workspaceId);
        stores.workspacePayloads.delete(workspaceId);
        await clearChunkedWorkspace(stores, workspaceId);
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
    ROW_CHUNK_SIZE: ROW_CHUNK_SIZE,
    ISSUE_CHUNK_SIZE: ISSUE_CHUNK_SIZE,
    ACTIVE_WORKSPACE_SETTING: ACTIVE_WORKSPACE_SETTING,
    WorkspaceStorageError: WorkspaceStorageError,
    normalizeStorageError: normalizeStorageError,
    createRepository: createRepository
  };
}));
