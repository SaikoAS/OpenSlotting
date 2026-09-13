(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.OpenSlottingWorkspaceFactory = factory;
    root.OpenSlottingWorkspace = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const WORKSPACE_SCHEMA_VERSION = 1;
  const BACKUP_FORMAT = 'openslotting-workspace';
  const BACKUP_FORMAT_VERSION = 1;
  const MAX_WORKSPACE_NAME_LENGTH = 120;
  const SUPPORTED_SOURCE_ENCODINGS = Object.freeze(['utf-8', 'utf-16le', 'utf-16be', 'windows-1252']);
  const SOURCE_ID_PATTERN = /^source-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;
  const MAX_SOURCE_ID_LENGTH = 128;

  class WorkspaceValidationError extends Error {
    constructor(code, message) {
      super(message);
      this.name = 'WorkspaceValidationError';
      this.code = code;
    }
  }

  function validationError(code, message) {
    throw new WorkspaceValidationError(code, message);
  }

  function isPlainObject(value) {
    if (!value || Object.prototype.toString.call(value) !== '[object Object]') {
      return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function assertWorkspaceName(value) {
    const name = value === undefined || value === null ? '' : String(value).trim();
    if (!name) {
      validationError('workspace_name_required', 'Workspace name is required.');
    }
    if (name.length > MAX_WORKSPACE_NAME_LENGTH) {
      validationError('workspace_name_too_long', 'Workspace name is too long.');
    }
    return name;
  }

  function createId(prefix, randomUuid) {
    let value = '';
    if (typeof randomUuid === 'function') {
      value = randomUuid();
    } else if (typeof crypto !== 'undefined' && crypto && typeof crypto.randomUUID === 'function') {
      value = crypto.randomUUID();
    } else {
      value = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2) + '-' + Math.random().toString(36).slice(2);
    }
    return String(prefix || 'id') + '-' + value;
  }

  function validIsoDate(value) {
    return typeof value === 'string' && Number.isFinite(Date.parse(value));
  }

  function copyArrayBuffer(value, options) {
    if (value === null || value === undefined) {
      return null;
    }
    if (value instanceof ArrayBuffer) {
      return options && options.clonePayload === false ? value : value.slice(0);
    }
    if (ArrayBuffer.isView(value)) {
      return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
    }
    validationError('invalid_source_buffer', 'Source buffer must be an ArrayBuffer.');
  }

  function cloneValue(value, options) {
    if (value === undefined || value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
      return value;
    }
    if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
      return copyArrayBuffer(value, options);
    }
    if (Array.isArray(value)) {
      if (options && options.clonePayload === false) {
        value.forEach(function (item) { cloneValue(item, options); });
        return value;
      }
      return value.map(function (item) { return cloneValue(item, options); });
    }
    if (isPlainObject(value)) {
      const keys = Object.keys(value);
      keys.forEach(function (key) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          validationError('invalid_workspace', 'Workspace contains an unsafe property name.');
        }
      });
      if (options && options.clonePayload === false) {
        keys.forEach(function (key) {
          if (value[key] !== undefined && typeof value[key] !== 'function') {
            cloneValue(value[key], options);
          }
        });
        return value;
      }
      const clone = {};
      keys.forEach(function (key) {
        if (value[key] !== undefined && typeof value[key] !== 'function') {
          clone[key] = cloneValue(value[key], options);
        }
      });
      return clone;
    }
    validationError('unsupported_workspace_value', 'Workspace contains an unsupported value.');
  }

  function normalizeMapping(mapping) {
    if (!mapping) {
      return {};
    }
    if (!isPlainObject(mapping)) {
      validationError('invalid_mapping', 'Column mapping must be an object.');
    }
    const normalized = {};
    Object.keys(mapping).forEach(function (key) {
      const value = mapping[key];
      if (value !== null && (!Number.isInteger(value) || value < 0)) {
        validationError('invalid_mapping', 'Column mapping contains an invalid source position.');
      }
      normalized[key] = value;
    });
    return normalized;
  }

  function normalizeIssue(issue, sourceId, options) {
    if (!isPlainObject(issue)) {
      validationError('invalid_validation_issue', 'Validation issue must be an object.');
    }
    let normalized = cloneValue(issue, options);
    if (normalized.sourceLine !== null && normalized.sourceLine !== undefined && (!Number.isInteger(normalized.sourceLine) || normalized.sourceLine < 1)) {
      validationError('invalid_validation_issue', 'Validation issue contains an invalid source line.');
    }
    if (normalized.sourceFileId !== null && normalized.sourceFileId !== undefined && String(normalized.sourceFileId) !== sourceId) {
      validationError('invalid_validation_issue', 'Validation issue belongs to another source file.');
    }
    if (options && options.clonePayload === false && normalized.sourceFileId === undefined) {
      normalized = Object.assign({}, normalized, { sourceFileId: sourceId });
    } else {
      normalized.sourceFileId = sourceId;
    }
    return normalized;
  }

  function normalizeRow(row, sourceId, options) {
    if (!isPlainObject(row)) {
      validationError('invalid_normalized_row', 'Normalized row must be an object.');
    }
    if (String(row.source_file_id || '') !== sourceId) {
      validationError('invalid_normalized_row', 'Normalized row belongs to another source file.');
    }
    if (!Number.isInteger(row.source_line) || row.source_line < 1) {
      validationError('invalid_normalized_row', 'Normalized row contains an invalid source line.');
    }
    if (typeof row.order_id !== 'string' || !row.order_id || typeof row.article_id !== 'string' || !row.article_id) {
      validationError('invalid_normalized_row', 'Normalized row is missing a required identity.');
    }
    if (typeof row.quantity !== 'bigint' || row.quantity <= 0n) {
      validationError('invalid_normalized_row', 'Normalized quantity must be a positive scaled integer.');
    }
    if (typeof row.order_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.order_date)) {
      validationError('invalid_normalized_row', 'Normalized row contains an invalid date.');
    }
    if (!Array.isArray(row.raw_values) || !Array.isArray(row.raw_fields)) {
      validationError('invalid_normalized_row', 'Normalized row is missing raw source fields.');
    }
    return cloneValue(row, options);
  }

  function normalizeImportResult(result, sourceId, options) {
    if (result === null || result === undefined) {
      return null;
    }
    if (!isPlainObject(result) || !Array.isArray(result.rows) || !Array.isArray(result.issues)) {
      validationError('invalid_import_result', 'Stored import result is invalid.');
    }
    const normalized = {};
    Object.keys(result).forEach(function (key) {
      if (key !== 'rows' && key !== 'issues' && key !== 'mapping') {
        normalized[key] = cloneValue(result[key], options);
      }
    });
    normalized.rows = result.rows.map(function (row) { return normalizeRow(row, sourceId, options); });
    normalized.issues = result.issues.map(function (issue) { return normalizeIssue(issue, sourceId, options); });
    normalized.mapping = normalizeMapping(result.mapping);
    if (normalized.sourceFile && String(normalized.sourceFile.id || '') !== sourceId) {
      validationError('invalid_import_result', 'Stored import result belongs to another source file.');
    }
    ['totalRows', 'validRows', 'invalidRows', 'structuralRows'].forEach(function (field) {
      if (!Number.isInteger(normalized[field]) || normalized[field] < 0) {
        validationError('invalid_import_result', 'Stored import result contains invalid row counts.');
      }
    });
    return normalized;
  }

  function captureFile(file, options) {
    if (!file || typeof file !== 'object') {
      validationError('invalid_source_file', 'Workspace source file is invalid.');
    }
    const id = String(file.id || '');
    if (!id) {
      validationError('invalid_source_file', 'Workspace source file has no ID.');
    }
    if (id.length > MAX_SOURCE_ID_LENGTH || !SOURCE_ID_PATTERN.test(id)) {
      validationError('invalid_source_id', 'Workspace source file ID is invalid.');
    }
    const name = String(file.name || '');
    if (!name) {
      validationError('invalid_source_file', 'Workspace source file has no name.');
    }
    const size = Number(file.size);
    const lastModified = Number(file.lastModified);
    const encodingMode = file.encodingMode === undefined ? 'auto' : file.encodingMode;
    const activeEncoding = file.activeEncoding === undefined || file.activeEncoding === null ? null : file.activeEncoding;
    const detectedEncoding = file.detectedEncoding === undefined || file.detectedEncoding === null ? null : file.detectedEncoding;
    if (typeof encodingMode !== 'string' || (encodingMode !== 'auto' && SUPPORTED_SOURCE_ENCODINGS.indexOf(encodingMode) < 0)) {
      validationError('invalid_source_encoding', 'Source encoding mode is not supported.');
    }
    if (activeEncoding !== null && (typeof activeEncoding !== 'string' || SUPPORTED_SOURCE_ENCODINGS.indexOf(activeEncoding) < 0)) {
      validationError('invalid_source_encoding', 'Active source encoding is not supported.');
    }
    if (detectedEncoding !== null && (typeof detectedEncoding !== 'string' || SUPPORTED_SOURCE_ENCODINGS.indexOf(detectedEncoding) < 0)) {
      validationError('invalid_source_encoding', 'Detected source encoding is not supported.');
    }
    return {
      id: id,
      name: name,
      label: String(file.label || name),
      size: Number.isFinite(size) && size >= 0 ? size : 0,
      lastModified: Number.isFinite(lastModified) && lastModified >= 0 ? lastModified : 0,
      buffer: copyArrayBuffer(file.buffer, options),
      encodingMode: encodingMode,
      activeEncoding: activeEncoding,
      detectedEncoding: detectedEncoding,
      errorKey: file.errorKey ? String(file.errorKey) : null,
      mapping: normalizeMapping(file.mapping),
      confirmedMapping: file.confirmedMapping ? normalizeMapping(file.confirmedMapping) : null,
      result: normalizeImportResult(file.result, id, options)
    };
  }

  function validateFile(file, options) {
    const normalized = captureFile(file, options);
    if (normalized.buffer === null && !normalized.errorKey) {
      validationError('invalid_source_file', 'Readable source file is missing its original bytes.');
    }
    return normalized;
  }

  function createWorkspace(name, options) {
    const settings = options || {};
    const now = settings.now || new Date().toISOString();
    if (!validIsoDate(now)) {
      validationError('invalid_workspace_date', 'Workspace date is invalid.');
    }
    return {
      id: settings.id ? String(settings.id) : createId('workspace', settings.randomUuid),
      schemaVersion: WORKSPACE_SCHEMA_VERSION,
      name: assertWorkspaceName(name),
      createdAt: now,
      updatedAt: now,
      language: settings.language === 'de' ? 'de' : 'en',
      analyzed: false,
      files: []
    };
  }

  function validateWorkspace(workspace, options) {
    if (!isPlainObject(workspace)) {
      validationError('invalid_workspace', 'Workspace must be an object.');
    }
    const schemaVersion = Number(workspace.schemaVersion);
    if (!Number.isInteger(schemaVersion) || schemaVersion < 1) {
      validationError('invalid_workspace_version', 'Workspace schema version is invalid.');
    }
    if (schemaVersion > WORKSPACE_SCHEMA_VERSION) {
      validationError('unsupported_workspace_version', 'Workspace was created by a newer unsupported version.');
    }
    if (schemaVersion !== WORKSPACE_SCHEMA_VERSION) {
      validationError('unsupported_workspace_version', 'Workspace schema version is not supported.');
    }
    const id = String(workspace.id || '');
    if (!id) {
      validationError('invalid_workspace', 'Workspace has no ID.');
    }
    if (!validIsoDate(workspace.createdAt) || !validIsoDate(workspace.updatedAt)) {
      validationError('invalid_workspace_date', 'Workspace timestamps are invalid.');
    }
    if (workspace.language !== 'en' && workspace.language !== 'de') {
      validationError('invalid_workspace_language', 'Workspace language must be en or de.');
    }
    if (typeof workspace.analyzed !== 'boolean') {
      validationError('invalid_workspace_flag', 'Workspace analyzed state must be a boolean.');
    }
    if (!Array.isArray(workspace.files)) {
      validationError('invalid_workspace', 'Workspace sources must be an array.');
    }
    const usedSourceIds = new Set();
    const files = workspace.files.map(function (file) {
      const normalized = validateFile(file, options);
      if (usedSourceIds.has(normalized.id)) {
        validationError('duplicate_source_id', 'Workspace contains duplicate source IDs.');
      }
      usedSourceIds.add(normalized.id);
      return normalized;
    });
    return {
      id: id,
      schemaVersion: WORKSPACE_SCHEMA_VERSION,
      name: assertWorkspaceName(workspace.name),
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
      language: workspace.language,
      analyzed: workspace.analyzed,
      files: files
    };
  }

  function migrateWorkspace(workspace, options) {
    if (!isPlainObject(workspace)) {
      validationError('invalid_workspace', 'Workspace must be an object.');
    }
    const schemaVersion = Number(workspace.schemaVersion);
    if (schemaVersion === 0) {
      const migrated = cloneValue(workspace, options);
      const migrationTarget = options && options.clonePayload === false ? Object.assign({}, migrated) : migrated;
      migrationTarget.schemaVersion = 1;
      migrationTarget.language = migrationTarget.language === 'de' ? 'de' : 'en';
      migrationTarget.analyzed = Boolean(migrationTarget.analyzed);
      migrationTarget.files = Array.isArray(migrationTarget.files) ? migrationTarget.files : [];
      return validateWorkspace(migrationTarget, options);
    }
    return validateWorkspace(workspace, options);
  }

  function captureWorkspace(metadata, state, options) {
    if (!metadata || !metadata.id) {
      validationError('workspace_not_selected', 'No workspace is selected.');
    }
    const settings = options || {};
    const updatedAt = settings.now || new Date().toISOString();
    return validateWorkspace({
      id: metadata.id,
      schemaVersion: WORKSPACE_SCHEMA_VERSION,
      name: metadata.name,
      createdAt: metadata.createdAt,
      updatedAt: updatedAt,
      language: state && state.language === 'de' ? 'de' : 'en',
      analyzed: Boolean(state && state.analysis),
      files: state && Array.isArray(state.files) ? state.files : []
    }, settings);
  }

  function renameWorkspace(workspace, name, now) {
    const renamed = validateWorkspace(workspace);
    renamed.name = assertWorkspaceName(name);
    renamed.updatedAt = now || new Date().toISOString();
    return validateWorkspace(renamed);
  }

  function bytesToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(bytes).toString('base64');
    }
    let binary = '';
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(index, Math.min(index + chunkSize, bytes.length)));
    }
    return btoa(binary);
  }

  function base64ToBuffer(value) {
    if (typeof value !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
      validationError('invalid_backup_encoding', 'Backup contains invalid binary data.');
    }
    if (typeof Buffer !== 'undefined') {
      const bytes = Buffer.from(value, 'base64');
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    }
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes.buffer;
  }

  function encodePortable(value) {
    if (typeof value === 'bigint') {
      return { $openslottingType: 'bigint', value: value.toString() };
    }
    if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
      const buffer = copyArrayBuffer(value);
      return { $openslottingType: 'array-buffer', base64: bytesToBase64(buffer) };
    }
    if (Array.isArray(value)) {
      return value.map(encodePortable);
    }
    if (isPlainObject(value)) {
      const encoded = {};
      Object.keys(value).forEach(function (key) {
        encoded[key] = encodePortable(value[key]);
      });
      return encoded;
    }
    if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }
    validationError('unsupported_backup_value', 'Workspace contains a value that cannot be backed up.');
  }

  function decodePortable(value) {
    if (Array.isArray(value)) {
      return value.map(decodePortable);
    }
    if (isPlainObject(value)) {
      if (Object.prototype.hasOwnProperty.call(value, '$openslottingType')) {
        const keys = Object.keys(value).sort();
        if (value.$openslottingType === 'bigint' && keys.join(',') === '$openslottingType,value' && typeof value.value === 'string' && /^-?\d+$/.test(value.value)) {
          return BigInt(value.value);
        }
        if (value.$openslottingType === 'array-buffer' && keys.join(',') === '$openslottingType,base64') {
          return base64ToBuffer(value.base64);
        }
        validationError('invalid_backup_encoding', 'Backup contains an invalid encoded value.');
      }
      const decoded = {};
      Object.keys(value).forEach(function (key) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          validationError('invalid_backup', 'Backup contains an unsafe property name.');
        }
        decoded[key] = decodePortable(value[key]);
      });
      return decoded;
    }
    if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }
    validationError('invalid_backup', 'Backup contains an unsupported value.');
  }

  function createBackup(workspace, options) {
    const settings = options || {};
    const exportedAt = settings.now || new Date().toISOString();
    if (!validIsoDate(exportedAt)) {
      validationError('invalid_backup_date', 'Backup timestamp is invalid.');
    }
    return {
      format: BACKUP_FORMAT,
      formatVersion: BACKUP_FORMAT_VERSION,
      exportedAt: exportedAt,
      workspace: encodePortable(validateWorkspace(workspace))
    };
  }

  function stringifyBackup(workspace, options) {
    return JSON.stringify(createBackup(workspace, options), null, 2);
  }

  function parseBackup(text) {
    let backup;
    try {
      backup = JSON.parse(String(text));
    } catch (error) {
      validationError('invalid_backup_json', 'Backup is not valid JSON.');
    }
    if (!isPlainObject(backup) || backup.format !== BACKUP_FORMAT) {
      validationError('invalid_backup_format', 'File is not an OpenSlotting workspace backup.');
    }
    if (!Number.isInteger(backup.formatVersion) || backup.formatVersion !== BACKUP_FORMAT_VERSION) {
      validationError('unsupported_backup_version', 'Backup format version is not supported.');
    }
    if (!validIsoDate(backup.exportedAt)) {
      validationError('invalid_backup_date', 'Backup timestamp is invalid.');
    }
    return migrateWorkspace(decodePortable(backup.workspace));
  }

  function prepareRestore(workspace, options) {
    const restored = validateWorkspace(workspace);
    const settings = options || {};
    const now = settings.now || new Date().toISOString();
    if (settings.mode === 'replace') {
      if (!settings.targetId) {
        validationError('restore_target_required', 'A target workspace is required for replacement.');
      }
      restored.id = String(settings.targetId);
    } else if (settings.mode === 'new') {
      restored.id = settings.newId ? String(settings.newId) : createId('workspace', settings.randomUuid);
    } else {
      validationError('invalid_restore_mode', 'Restore mode is invalid.');
    }
    restored.updatedAt = now;
    return validateWorkspace(restored);
  }

  function backupFilename(name) {
    const safe = assertWorkspaceName(name)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'workspace';
    return 'OpenSlotting-' + safe + '.workspace.json';
  }

  return {
    WORKSPACE_SCHEMA_VERSION: WORKSPACE_SCHEMA_VERSION,
    BACKUP_FORMAT: BACKUP_FORMAT,
    BACKUP_FORMAT_VERSION: BACKUP_FORMAT_VERSION,
    MAX_WORKSPACE_NAME_LENGTH: MAX_WORKSPACE_NAME_LENGTH,
    WorkspaceValidationError: WorkspaceValidationError,
    assertWorkspaceName: assertWorkspaceName,
    createId: createId,
    createWorkspace: createWorkspace,
    validateWorkspace: validateWorkspace,
    migrateWorkspace: migrateWorkspace,
    captureWorkspace: captureWorkspace,
    renameWorkspace: renameWorkspace,
    createBackup: createBackup,
    stringifyBackup: stringifyBackup,
    parseBackup: parseBackup,
    prepareRestore: prepareRestore,
    backupFilename: backupFilename
  };
}));
