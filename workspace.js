(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.OpenSlottingWorkspaceFactory = factory;
    root.OpenSlottingWorkspace = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const WORKSPACE_SCHEMA_VERSION = 7;
  const BACKUP_FORMAT = 'openslotting-workspace';
  const BACKUP_FORMAT_VERSION = 1;
  const MAX_WORKSPACE_NAME_LENGTH = 120;
  const SUPPORTED_SOURCE_ENCODINGS = Object.freeze(['utf-8', 'utf-16le', 'utf-16be', 'windows-1252']);
  const SOURCE_TYPES = Object.freeze(['order-lines', 'article-master']);
  const DEFAULT_SOURCE_TYPE = 'order-lines';
  const SOURCE_ID_PATTERN = /^source-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;
  const CUSTOM_FIELD_ID_PATTERN = /^custom-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;
  const CUSTOM_FIELD_TYPES = Object.freeze(['text', 'number', 'date']);
  const MAX_CUSTOM_FIELD_NAME_LENGTH = 120;
  const MAX_SOURCE_ID_LENGTH = 128;
  const COLUMN_PROFILE_SAMPLE_LIMIT = 5;
  const COLUMN_PROFILE_DISTINCT_LIMIT = 256;
  const COLUMN_PROFILE_FREQUENT_LIMIT = 5;
  const COLUMN_PROFILE_VALUE_LIMIT = 256;

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

  function normalizeSourceType(value) {
    const sourceType = value === undefined || value === null || value === ''
      ? DEFAULT_SOURCE_TYPE
      : String(value);
    if (SOURCE_TYPES.indexOf(sourceType) < 0) {
      validationError('invalid_source_type', 'Source type is not supported.');
    }
    return sourceType;
  }

  function normalizeCustomFieldType(value) {
    const type = value === undefined || value === null || value === '' ? 'text' : String(value);
    if (CUSTOM_FIELD_TYPES.indexOf(type) < 0) {
      validationError('invalid_custom_field_type', 'Custom field type is not supported.');
    }
    return type;
  }

  function normalizeCustomFieldName(value) {
    const name = value === undefined || value === null ? '' : String(value).trim();
    if (!name) {
      validationError('custom_field_name_required', 'Custom field name is required.');
    }
    if (name.length > MAX_CUSTOM_FIELD_NAME_LENGTH) {
      validationError('custom_field_name_too_long', 'Custom field name is too long.');
    }
    return name;
  }

  function normalizeCustomFields(fields, options) {
    if (fields === undefined || fields === null) {
      return [];
    }
    if (!Array.isArray(fields)) {
      validationError('invalid_custom_fields', 'Custom fields must be an array.');
    }
    const usedIds = new Set();
    const usedNames = new Set();
    return fields.map(function (field) {
      if (!isPlainObject(field)) {
        validationError('invalid_custom_field', 'Custom field definition is invalid.');
      }
      const id = String(field.id || '');
      if (!id || id.length > 128 || !CUSTOM_FIELD_ID_PATTERN.test(id) || usedIds.has(id)) {
        validationError('invalid_custom_field_id', 'Custom field ID is invalid or duplicated.');
      }
      const name = normalizeCustomFieldName(field.name);
      const nameKey = name.toLocaleLowerCase('de-DE');
      if (usedNames.has(nameKey)) {
        validationError('duplicate_custom_field_name', 'Custom field names must be unique.');
      }
      usedIds.add(id);
      usedNames.add(nameKey);
      return {
        id: id,
        name: name,
        type: normalizeCustomFieldType(field.type),
        active: field.active === undefined ? !Boolean(field.removed) : Boolean(field.active)
      };
    });
  }

  function normalizeCustomFieldMapping(mapping) {
    if (mapping === undefined || mapping === null) {
      return {};
    }
    if (!isPlainObject(mapping)) {
      validationError('invalid_custom_field_mapping', 'Custom field mapping must be an object.');
    }
    const normalized = {};
    Object.keys(mapping).forEach(function (key) {
      if (!CUSTOM_FIELD_ID_PATTERN.test(key)) {
        validationError('invalid_custom_field_mapping', 'Custom field mapping contains an invalid field ID.');
      }
      const value = mapping[key];
      if (value !== null && (!Number.isInteger(value) || value < 0)) {
        validationError('invalid_custom_field_mapping', 'Custom field mapping contains an invalid source position.');
      }
      normalized[key] = value;
    });
    return normalized;
  }

  function validateCustomFieldMappingRange(mapping, headerCount) {
    const normalized = normalizeCustomFieldMapping(mapping);
    if (!Number.isInteger(headerCount) || headerCount < 0) {
      validationError('invalid_custom_field_mapping', 'Decoded source header count is invalid.');
    }
    Object.keys(normalized).forEach(function (key) {
      if (normalized[key] !== null && normalized[key] >= headerCount) {
        validationError('invalid_custom_field_mapping', 'Custom field mapping points outside the decoded source headers.');
      }
    });
    return normalized;
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

  function validCalendarDate(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const text = String(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      validationError('invalid_period_date', 'Comparison periods must use YYYY-MM-DD dates.');
    }
    const date = new Date(text + 'T00:00:00Z');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
      validationError('invalid_period_date', 'Comparison period contains an invalid date.');
    }
    return text;
  }

  function normalizePeriod(value, fallbackName) {
    const input = isPlainObject(value) ? value : {};
    const name = String(input.name || fallbackName).trim().slice(0, 80) || fallbackName;
    const start = validCalendarDate(input.start);
    const end = validCalendarDate(input.end);
    if (start && end && start > end) {
      validationError('invalid_period_range', 'Comparison period start must not be after its end.');
    }
    return { name: name, start: start, end: end };
  }

  function normalizePeriodSettings(value) {
    const input = isPlainObject(value) ? value : {};
    const hasStoredBoundaries = (isPlainObject(input.periodA) && (input.periodA.start || input.periodA.end)) ||
      (isPlainObject(input.periodB) && (input.periodB.start || input.periodB.end));
    const mode = input.mode === 'custom' || (input.mode !== 'weeks' && hasStoredBoundaries) ? 'custom' : 'weeks';
    const sourceWeekdays = Array.isArray(input.expectedWeekdays) ? input.expectedWeekdays : [0, 1, 2, 3, 4, 5, 6];
    const expectedWeekdays = Array.from(new Set(sourceWeekdays.filter(function (day) {
      return Number.isInteger(day) && day >= 0 && day <= 6;
    }))).sort(function (left, right) { return left - right; });
    if (expectedWeekdays.length === 0) {
      validationError('invalid_expected_weekdays', 'At least one expected weekday is required.');
    }
    return {
      mode: mode,
      expectedWeekdays: expectedWeekdays,
      periodA: normalizePeriod(input.periodA, 'Period A'),
      periodB: normalizePeriod(input.periodB, 'Period B')
    };
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

  function normalizeColumnProfile(profile) {
    const source = profile === undefined || profile === null ? {} : profile;
    if (!isPlainObject(source)) {
      validationError('invalid_column_catalog', 'Source column profile must be an object.');
    }
    const integerFields = [
      'totalRows',
      'nonEmptyCount',
      'emptyCount',
      'numericCompatibleCount',
      'dateCompatibleCount',
      'textCompatibleCount',
      'incompatibleCount',
      'distinctValueCount'
    ];
    const values = {};
    integerFields.forEach(function (field) {
      const value = source[field] === undefined || source[field] === null ? 0 : Number(source[field]);
      if (!Number.isInteger(value) || value < 0) {
        validationError('invalid_column_catalog', 'Source column profile contains an invalid count.');
      }
      values[field] = value;
    });
    if (values.totalRows !== values.nonEmptyCount + values.emptyCount || values.nonEmptyCount > values.totalRows) {
      validationError('invalid_column_catalog', 'Source column profile row counts are inconsistent.');
    }
    if (values.distinctValueCount > COLUMN_PROFILE_DISTINCT_LIMIT) {
      validationError('invalid_column_catalog', 'Source column profile distinct-value count is too large.');
    }
    const exact = source.distinctValueCountExact === undefined ? true : Boolean(source.distinctValueCountExact);
    const sampleValues = Array.isArray(source.sampleValues) ? source.sampleValues : [];
    const frequentValues = Array.isArray(source.frequentValues) ? source.frequentValues : [];
    if (sampleValues.length > COLUMN_PROFILE_SAMPLE_LIMIT || frequentValues.length > COLUMN_PROFILE_FREQUENT_LIMIT) {
      validationError('invalid_column_catalog', 'Source column profile evidence is too large.');
    }
    function normalizeEvidence(entry, withCount) {
      if (!isPlainObject(entry)) {
        validationError('invalid_column_catalog', 'Source column profile evidence is invalid.');
      }
      const value = entry.value === undefined || entry.value === null ? '' : String(entry.value);
      if (value.length > COLUMN_PROFILE_VALUE_LIMIT) {
        validationError('invalid_column_catalog', 'Source column profile evidence value is too long.');
      }
      const normalized = { value: value, truncated: Boolean(entry.truncated) };
      if (withCount) {
        const count = Number(entry.count);
        if (!Number.isInteger(count) || count < 1) {
          validationError('invalid_column_catalog', 'Source column profile frequency is invalid.');
        }
        normalized.count = count;
        normalized.countIsEstimate = entry.countIsEstimate === undefined ? false : Boolean(entry.countIsEstimate);
      }
      return normalized;
    }
    return {
      totalRows: values.totalRows,
      nonEmptyCount: values.nonEmptyCount,
      emptyCount: values.emptyCount,
      numericCompatibleCount: values.numericCompatibleCount,
      dateCompatibleCount: values.dateCompatibleCount,
      textCompatibleCount: values.textCompatibleCount,
      incompatibleCount: values.incompatibleCount,
      distinctValueCount: values.distinctValueCount,
      distinctValueCountExact: exact,
      distinctValueLimit: COLUMN_PROFILE_DISTINCT_LIMIT,
      sampleValues: sampleValues.map(function (entry) { return normalizeEvidence(entry, false); }),
      frequentValues: frequentValues.map(function (entry) { return normalizeEvidence(entry, true); })
    };
  }

  function normalizeColumnCatalog(catalog, sourceId, options) {
    if (catalog === undefined || catalog === null) {
      return [];
    }
    if (!Array.isArray(catalog)) {
      validationError('invalid_column_catalog', 'Source column catalog must be an array.');
    }
    const normalizedSourceId = String(sourceId || '');
    return catalog.map(function (entry, index) {
      if (!isPlainObject(entry)) {
        validationError('invalid_column_catalog', 'Source column catalog entries must be objects.');
      }
      if (!Number.isInteger(entry.position) || entry.position !== index || entry.position < 0) {
        validationError('invalid_column_catalog', 'Source column catalog positions must be contiguous.');
      }
      const occurrence = Number(entry.occurrence);
      if (!Number.isInteger(occurrence) || occurrence < 1) {
        validationError('invalid_column_catalog', 'Source column catalog occurrence is invalid.');
      }
      const sourceFileId = entry.sourceFileId === undefined || entry.sourceFileId === null
        ? normalizedSourceId
        : String(entry.sourceFileId);
      if (sourceFileId !== normalizedSourceId) {
        validationError('invalid_column_catalog', 'Source column catalog belongs to another source file.');
      }
      return {
        position: index,
        header: entry.header === undefined || entry.header === null ? '' : String(entry.header),
        normalizedHeader: entry.normalizedHeader === undefined || entry.normalizedHeader === null ? '' : String(entry.normalizedHeader),
        occurrence: occurrence,
        isDuplicate: occurrence > 1,
        sourceFileId: sourceFileId,
        sourceFileName: entry.sourceFileName === undefined || entry.sourceFileName === null ? null : String(entry.sourceFileName),
        sourceFileLabel: entry.sourceFileLabel === undefined || entry.sourceFileLabel === null ? null : String(entry.sourceFileLabel),
        profile: normalizeColumnProfile(entry.profile)
      };
    });
  }

  function validateMappingRange(mapping, headerCount) {
    const normalized = normalizeMapping(mapping);
    if (!Number.isInteger(headerCount) || headerCount < 0) {
      validationError('invalid_mapping', 'Decoded source header count is invalid.');
    }
    Object.keys(normalized).forEach(function (key) {
      const value = normalized[key];
      if (value !== null && value >= headerCount) {
        validationError('invalid_mapping', 'Column mapping points outside the decoded source headers.');
      }
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
    const salesUnitCount = row.sales_unit_count === undefined || row.sales_unit_count === null ? null : row.sales_unit_count;
    const quantityPerSalesUnit = row.quantity_per_sales_unit === undefined || row.quantity_per_sales_unit === null ? null : row.quantity_per_sales_unit;
    if (salesUnitCount !== null && (typeof salesUnitCount !== 'bigint' || salesUnitCount < 0n)) {
      validationError('invalid_normalized_row', 'Normalized selling units must be a non-negative scaled integer.');
    }
    if (quantityPerSalesUnit !== null && (typeof quantityPerSalesUnit !== 'bigint' || quantityPerSalesUnit <= 0n)) {
      validationError('invalid_normalized_row', 'Normalized quantity per selling unit must be a positive scaled integer.');
    }
    const expectedUnitMatch = salesUnitCount !== null && quantityPerSalesUnit !== null
      ? salesUnitCount * quantityPerSalesUnit === row.quantity * 10000000n
      : null;
    if (row.sales_unit_quantity_matches !== undefined && row.sales_unit_quantity_matches !== expectedUnitMatch) {
      validationError('invalid_normalized_row', 'Normalized selling-unit consistency flag is invalid.');
    }
    const expectedUnitRelation = salesUnitCount !== null && quantityPerSalesUnit !== null
      ? (expectedUnitMatch ? 'exact' : (salesUnitCount * quantityPerSalesUnit < row.quantity * 10000000n ? 'partial' : 'exceeds'))
      : null;
    if (row.sales_unit_quantity_relation !== undefined && row.sales_unit_quantity_relation !== expectedUnitRelation) {
      validationError('invalid_normalized_row', 'Normalized selling-unit quantity relation is invalid.');
    }
    if (typeof row.order_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.order_date)) {
      validationError('invalid_normalized_row', 'Normalized row contains an invalid date.');
    }
    if (row.custom_fields !== undefined) {
      if (!isPlainObject(row.custom_fields)) {
        validationError('invalid_normalized_row', 'Normalized custom fields must be an object.');
      }
      Object.keys(row.custom_fields).forEach(function (key) {
        if (typeof row.custom_fields[key] !== 'string') {
          validationError('invalid_normalized_row', 'Normalized custom field values must be text.');
        }
      });
    }
    const normalized = cloneValue(row, options);
    if (normalized && typeof normalized === 'object') {
      delete normalized.raw_values;
      delete normalized.raw_fields;
    }
    return normalized;
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
    if (result.columnCatalog !== undefined) {
      normalized.columnCatalog = normalizeColumnCatalog(result.columnCatalog, sourceId, options);
    }
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
    const result = normalizeImportResult(file.result, id, options);
    let columnCatalog = normalizeColumnCatalog(file.columnCatalog, id, options);
    let mapping = normalizeMapping(file.mapping);
    let customFieldMapping = normalizeCustomFieldMapping(file.customFieldMapping);
    let confirmedCustomFieldMapping = file.confirmedCustomFieldMapping === null || file.confirmedCustomFieldMapping === undefined
      ? null
      : normalizeCustomFieldMapping(file.confirmedCustomFieldMapping);
    let confirmedMapping = file.confirmedMapping === null || file.confirmedMapping === undefined
      ? null
      : normalizeMapping(file.confirmedMapping);
    if (result !== null) {
      if (!Array.isArray(result.headers)) {
        validationError('invalid_import_result', 'Stored import result is missing decoded source headers.');
      }
      mapping = validateMappingRange(mapping, result.headers.length);
      customFieldMapping = validateCustomFieldMappingRange(customFieldMapping, result.headers.length);
      confirmedCustomFieldMapping = confirmedCustomFieldMapping ? validateCustomFieldMappingRange(confirmedCustomFieldMapping, result.headers.length) : null;
      confirmedMapping = confirmedMapping ? validateMappingRange(confirmedMapping, result.headers.length) : null;
      result.mapping = validateMappingRange(result.mapping, result.headers.length);
      if (result.columnCatalog !== undefined) {
        result.columnCatalog = normalizeColumnCatalog(result.columnCatalog, id, options);
      }
      if (columnCatalog.length === 0 && result.columnCatalog) {
        columnCatalog = result.columnCatalog;
      }
      if (columnCatalog.length > 0 && columnCatalog.length !== result.headers.length) {
        validationError('invalid_column_catalog', 'Source column catalog does not match the decoded headers.');
      }
    }
    const buffer = copyArrayBuffer(file.buffer, options);
    if (buffer !== null && (!Number.isInteger(size) || size < 0 || size !== buffer.byteLength)) {
      validationError('invalid_source_size', 'Source size does not match its decoded bytes.');
    }
    return {
      id: id,
      name: name,
      label: String(file.label || name),
      size: Number.isFinite(size) && size >= 0 ? size : 0,
      lastModified: Number.isFinite(lastModified) && lastModified >= 0 ? lastModified : 0,
      buffer: buffer,
      encodingMode: encodingMode,
      activeEncoding: activeEncoding,
      detectedEncoding: detectedEncoding,
      errorKey: file.errorKey ? String(file.errorKey) : null,
      mapping: mapping,
      customFieldMapping: customFieldMapping,
      confirmedCustomFieldMapping: confirmedCustomFieldMapping,
      confirmedMapping: confirmedMapping,
      columnCatalog: columnCatalog,
      result: result,
      sourceType: normalizeSourceType(file.sourceType)
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
      periodSettings: normalizePeriodSettings(settings.periodSettings),
      customFields: normalizeCustomFields(settings.customFields),
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
    const customFields = normalizeCustomFields(workspace.customFields);
    const customFieldIds = new Set(customFields.map(function (field) { return field.id; }));
    const usedSourceIds = new Set();
    const files = workspace.files.map(function (file) {
      const normalized = validateFile(file, options);
      [normalized.customFieldMapping, normalized.confirmedCustomFieldMapping || {}].forEach(function (mapping) {
        Object.keys(mapping).forEach(function (fieldId) {
          if (!customFieldIds.has(fieldId)) {
            validationError('unknown_custom_field', 'Source mapping references an unknown custom field.');
          }
        });
      });
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
      periodSettings: normalizePeriodSettings(workspace.periodSettings),
      customFields: customFields,
      files: files
    };
  }

  function migrateWorkspace(workspace, options) {
    if (!isPlainObject(workspace)) {
      validationError('invalid_workspace', 'Workspace must be an object.');
    }
    const schemaVersion = Number(workspace.schemaVersion);
    if (schemaVersion === 0 || schemaVersion === 1 || schemaVersion === 2 || schemaVersion === 3 || schemaVersion === 4 || schemaVersion === 5 || schemaVersion === 6) {
      const migrated = cloneValue(workspace, options);
      const migrationTarget = options && options.clonePayload === false ? Object.assign({}, migrated) : migrated;
      if (schemaVersion === 0) {
        migrationTarget.schemaVersion = 1;
        migrationTarget.language = migrationTarget.language === 'de' ? 'de' : 'en';
        migrationTarget.analyzed = Boolean(migrationTarget.analyzed);
        migrationTarget.files = Array.isArray(migrationTarget.files) ? migrationTarget.files.map(function (file) {
          const migratedFile = isPlainObject(file) ? file : {};
          if (!isPlainObject(migratedFile.mapping)) {
            migratedFile.mapping = {};
          }
          if (migratedFile.confirmedMapping !== null && !isPlainObject(migratedFile.confirmedMapping)) {
            migratedFile.confirmedMapping = null;
          }
          if (isPlainObject(migratedFile.result) && !isPlainObject(migratedFile.result.mapping)) {
            migratedFile.result.mapping = {};
          }
          return migratedFile;
        }) : [];
      }
      if (schemaVersion <= 5) {
        migrationTarget.files = Array.isArray(migrationTarget.files) ? migrationTarget.files.map(function (file) {
          const migratedFile = isPlainObject(file) ? file : {};
          if (migratedFile.sourceType === undefined || migratedFile.sourceType === null || migratedFile.sourceType === '') {
            migratedFile.sourceType = DEFAULT_SOURCE_TYPE;
          }
          if (migratedFile.columnCatalog === undefined || migratedFile.columnCatalog === null) {
            migratedFile.columnCatalog = [];
          }
          return migratedFile;
        }) : [];
      }
      if (schemaVersion <= 6 || !Array.isArray(migrationTarget.customFields)) {
        migrationTarget.customFields = [];
      }
      migrationTarget.schemaVersion = WORKSPACE_SCHEMA_VERSION;
      migrationTarget.periodSettings = normalizePeriodSettings(migrationTarget.periodSettings);
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
      periodSettings: normalizePeriodSettings(state && state.periodSettings),
      customFields: normalizeCustomFields(state && state.customFields),
      files: state && Array.isArray(state.files) ? state.files : []
    }, settings);
  }

  // The application only calls this for a live runtime that was already
  // validated while it was decoded, imported, or edited through validated
  // controls. It deliberately copies the shallow persisted shape without
  // traversing rows, issues, or raw fields on every autosave.
  function captureWorkspaceTrusted(metadata, state, options) {
    if (!metadata || !metadata.id) {
      validationError('workspace_not_selected', 'No workspace is selected.');
    }
    const settings = options || {};
    const files = state && Array.isArray(state.files) ? state.files.map(function (file) {
      return {
        id: file.id,
        name: file.name,
        label: file.label,
        size: file.size,
        lastModified: file.lastModified,
        buffer: file.buffer,
        encodingMode: file.encodingMode,
        activeEncoding: file.activeEncoding,
        detectedEncoding: file.detectedEncoding,
        errorKey: file.errorKey || null,
        mapping: file.mapping,
        customFieldMapping: file.customFieldMapping,
        confirmedCustomFieldMapping: file.confirmedCustomFieldMapping,
        confirmedMapping: file.confirmedMapping,
        columnCatalog: normalizeColumnCatalog(file.columnCatalog, file.id, settings),
        result: file.result,
        sourceType: normalizeSourceType(file.sourceType)
      };
    }) : [];
    return {
      id: metadata.id,
      schemaVersion: WORKSPACE_SCHEMA_VERSION,
      name: metadata.name,
      createdAt: metadata.createdAt,
      updatedAt: settings.now || new Date().toISOString(),
      language: state && state.language === 'de' ? 'de' : 'en',
      analyzed: Boolean(state && state.analysis),
      periodSettings: normalizePeriodSettings(state && state.periodSettings),
      customFields: normalizeCustomFields(state && state.customFields),
      files: files
    };
  }

  function renameWorkspace(workspace, name, now) {
    const renamed = validateWorkspace(workspace);
    renamed.name = assertWorkspaceName(name);
    renamed.updatedAt = now || new Date().toISOString();
    return validateWorkspace(renamed);
  }

  function createCustomField(workspace, name, type, options) {
    const normalized = validateWorkspace(workspace);
    const settings = options || {};
    const field = {
      id: settings.id ? String(settings.id) : createId('custom', settings.randomUuid),
      name: normalizeCustomFieldName(name),
      type: normalizeCustomFieldType(type),
      active: true
    };
    normalized.customFields = normalizeCustomFields(normalized.customFields.concat([field]));
    normalized.updatedAt = settings.now || new Date().toISOString();
    return validateWorkspace(normalized);
  }

  function renameCustomField(workspace, fieldId, name, now) {
    const normalized = validateWorkspace(workspace);
    const id = String(fieldId || '');
    const index = normalized.customFields.findIndex(function (field) { return field.id === id; });
    if (index < 0) {
      validationError('custom_field_not_found', 'Custom field does not exist.');
    }
    normalized.customFields[index].name = normalizeCustomFieldName(name);
    normalized.customFields = normalizeCustomFields(normalized.customFields);
    normalized.updatedAt = now || new Date().toISOString();
    return validateWorkspace(normalized);
  }

  function removeCustomField(workspace, fieldId, now) {
    const normalized = validateWorkspace(workspace);
    const id = String(fieldId || '');
    const index = normalized.customFields.findIndex(function (field) { return field.id === id; });
    if (index < 0) {
      validationError('custom_field_not_found', 'Custom field does not exist.');
    }
    normalized.customFields[index].active = false;
    normalized.updatedAt = now || new Date().toISOString();
    return validateWorkspace(normalized);
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
    const persistedWorkspace = settings.validated ? workspace : validateWorkspace(workspace);
    return {
      format: BACKUP_FORMAT,
      formatVersion: BACKUP_FORMAT_VERSION,
      exportedAt: exportedAt,
      workspace: encodePortable(persistedWorkspace)
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
    SOURCE_TYPES: SOURCE_TYPES,
    DEFAULT_SOURCE_TYPE: DEFAULT_SOURCE_TYPE,
    WorkspaceValidationError: WorkspaceValidationError,
    assertWorkspaceName: assertWorkspaceName,
    normalizeSourceType: normalizeSourceType,
    CUSTOM_FIELD_TYPES: CUSTOM_FIELD_TYPES,
    normalizeCustomFields: normalizeCustomFields,
    normalizeCustomFieldMapping: normalizeCustomFieldMapping,
    validateCustomFieldMappingRange: validateCustomFieldMappingRange,
    createId: createId,
    createWorkspace: createWorkspace,
    validateMappingRange: validateMappingRange,
    normalizeColumnCatalog: normalizeColumnCatalog,
    validateWorkspace: validateWorkspace,
    migrateWorkspace: migrateWorkspace,
    captureWorkspace: captureWorkspace,
    captureWorkspaceTrusted: captureWorkspaceTrusted,
    renameWorkspace: renameWorkspace,
    createCustomField: createCustomField,
    renameCustomField: renameCustomField,
    removeCustomField: removeCustomField,
    createBackup: createBackup,
    stringifyBackup: stringifyBackup,
    parseBackup: parseBackup,
    prepareRestore: prepareRestore,
    normalizePeriodSettings: normalizePeriodSettings,
    backupFilename: backupFilename
  };
}));
