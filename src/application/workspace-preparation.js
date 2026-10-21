(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../../encoding.js'), require('../../csv.js'),
      require('../../warehouse.js'), require('../../workspace.js'));
  } else {
    root.OpenSlottingWorkspacePreparation = factory(root.OpenSlottingEncoding,
      root.OpenSlottingCsv, root.OpenSlottingWarehouse, root.OpenSlottingWorkspace);
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (encoding, core, warehouseModel, workspaceModel) {
  'use strict';

  function sourceContext(file) {
    return {
      id: file.id,
      name: file.name,
      label: file.label,
      sourceType: workspaceModel.normalizeSourceType(file.sourceType)
    };
  }


  function decodeFileEntry(file, options) {
    const streaming = Boolean(options && options.streaming);
    function fingerprint(text) {
      let first = 2166136261;
      let second = 2246822519;
      for (let index = 0; index < text.length; index += 1) {
        const code = text.charCodeAt(index);
        first = Math.imul(first ^ code, 16777619) >>> 0;
        second = Math.imul(second ^ (code + index), 3266489917) >>> 0;
      }
      return text.length + ':' + first.toString(16) + ':' + second.toString(16);
    }
    file.errorKey = null;
    file.content = null;
    file.contentFingerprint = null;
    file.parsed = null;
    file.headers = [];
    file.mapping = {};
    file.customFieldMapping = {};
    file.confirmedMapping = null;
    file.columnCatalog = [];
    file.dataRowCount = 0;
    file.hasParseErrors = false;
    file.result = null;
    file.activeEncoding = null;
    file.sourceRecordIndex = null;
    file.sourceRecordIndexToken = (file.sourceRecordIndexToken || 0) + 1;
    file.sourceRecordIndexBuilding = false;
    file.sourceRecordIndexError = null;
    file.sourceTableIssueResult = null;
    file.sourceTableIssuesByLine = null;
    try {
      const decoded = streaming
        ? encoding.decodeBufferChunksDetailed(file.buffer, file.encodingMode || 'auto', { chunkSize: 64 * 1024 })
        : encoding.decodeBufferDetailed(file.buffer, file.encodingMode || 'auto');
      let parsed;
      let contentFingerprint = null;
      if (streaming) {
        let first = 2166136261;
        let second = 2246822519;
        let length = 0;
        const chunks = (function* () {
          for (const chunk of decoded.chunks) {
            for (let index = 0; index < chunk.length; index += 1) {
              const code = chunk.charCodeAt(index);
              first = Math.imul(first ^ code, 16777619) >>> 0;
              second = Math.imul(second ^ (code + length), 3266489917) >>> 0;
              length += 1;
            }
            yield chunk;
          }
        }());
        const profiled = core.profileCsvStreamingChunks(chunks, {
          sourceFile: { id: file.id, name: file.name, label: file.label, sourceType: file.sourceType }
        });
        parsed = { rows: [], headers: profiled.headers, errors: profiled.errors, dataRowCount: profiled.dataRowCount };
        file.columnCatalog = profiled.columnCatalog;
        contentFingerprint = length + ':' + first.toString(16) + ':' + second.toString(16);
      } else {
        parsed = core.parseCsv(decoded.text);
        file.columnCatalog = core.profileParsedCsv(parsed, {
          id: file.id, name: file.name, label: file.label, sourceType: file.sourceType
        }).columnCatalog;
        contentFingerprint = fingerprint(decoded.text);
      }
      const headers = streaming
        ? (parsed.headers || []).map(function (header) { return String(header).trim(); })
        : (parsed.rows.length > 0 ? parsed.rows[0].values.map(function (header) { return String(header).trim(); }) : []);
      if (headers.length === 0) {
        const emptyError = new Error('The selected CSV file is empty or has no header row.');
        emptyError.translationKey = 'empty_file';
        throw emptyError;
      }
      file.content = streaming ? null : decoded.text;
      file.contentFingerprint = contentFingerprint;
      file.activeEncoding = decoded.encoding;
      if (decoded.automatic) {
        file.detectedEncoding = decoded.encoding;
      }
      file.parsed = parsed;
      file.headers = headers;
      if (!Array.isArray(file.columnCatalog) || file.columnCatalog.length !== file.headers.length) {
        file.columnCatalog = core.buildColumnCatalog(file.headers, {
          id: file.id,
          name: file.name,
          label: file.label,
          sourceType: file.sourceType
        });
      }
      file.mapping = core.detectMapping(file.headers, file.sourceType);
      file.dataRowCount = streaming
        ? Number(parsed.dataRowCount || 0)
        : Math.max(0, parsed.rows.length - 1);
      file.hasParseErrors = parsed.errors.length > 0;
    } catch (error) {
      file.errorKey = error && error.translationKey ? error.translationKey : 'invalid_encoding';
    }
  }


  function importBufferStreaming(file, mapping, options) {
    const decoded = encoding.decodeBufferChunksDetailed(file.buffer, file.encodingMode || 'auto', { chunkSize: 64 * 1024 });
    file.activeEncoding = decoded.encoding;
    if (decoded.automatic) {
      file.detectedEncoding = decoded.encoding;
    }
    return core.importCsvStreamingChunks(decoded.chunks, mapping, options);
  }


  function runtimeFileFromStored(stored) {
    const savedMapping = Object.assign({}, stored.mapping || {});
    const savedCustomFieldMapping = workspaceModel.normalizeCustomFieldMapping(stored.customFieldMapping);
    const savedConfirmedCustomFieldMapping = stored.confirmedCustomFieldMapping === null || stored.confirmedCustomFieldMapping === undefined
      ? null
      : workspaceModel.normalizeCustomFieldMapping(stored.confirmedCustomFieldMapping);
    const savedConfirmedMapping = stored.confirmedMapping ? Object.assign({}, stored.confirmedMapping) : null;
    const file = {
      id: stored.id,
      name: stored.name,
      label: stored.label,
      size: stored.size,
      lastModified: stored.lastModified,
      browserFile: null,
      buffer: stored.buffer,
      reading: false,
      errorKey: stored.errorKey,
      encodingMode: stored.encodingMode || 'auto',
      activeEncoding: stored.activeEncoding,
      detectedEncoding: stored.detectedEncoding,
      content: null,
      contentFingerprint: null,
      parsed: null,
      headers: [],
      mapping: {},
      preparationRules: workspaceModel.normalizePreparationRules(stored.preparationRules),
      sourceRules: workspaceModel.normalizeSourceRules(stored.sourceRules),
      appliedImportProfile: workspaceModel.normalizeAppliedImportProfile(stored.appliedImportProfile),
      customFieldMapping: {},
      confirmedCustomFieldMapping: null,
      confirmedMapping: null,
      columnCatalog: Array.isArray(stored.columnCatalog) ? stored.columnCatalog : [],
      dataRowCount: 0,
      hasParseErrors: false,
      result: null,
      sourceType: workspaceModel.normalizeSourceType(stored.sourceType)
    };
    if (file.buffer) {
      decodeFileEntry(file, { streaming: true });
      if (file.parsed && !file.errorKey) {
        file.mapping = workspaceModel.validateMappingRange(savedMapping, file.headers.length);
        file.customFieldMapping = workspaceModel.validateCustomFieldMappingRange(savedCustomFieldMapping, file.headers.length);
        file.confirmedCustomFieldMapping = savedConfirmedCustomFieldMapping
          ? workspaceModel.validateCustomFieldMappingRange(savedConfirmedCustomFieldMapping, file.headers.length)
          : null;
        file.confirmedMapping = savedConfirmedMapping
          ? workspaceModel.validateMappingRange(savedConfirmedMapping, file.headers.length)
          : null;
      } else {
        file.mapping = savedMapping;
        file.customFieldMapping = savedCustomFieldMapping;
        file.confirmedCustomFieldMapping = savedConfirmedCustomFieldMapping;
        file.confirmedMapping = savedConfirmedMapping;
      }
    }
    return file;
  }


  function persistPreparedWorkspace(prepared) {
    const files = prepared.files.map(function (file) {
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
        errorKey: file.errorKey,
        mapping: file.mapping,
        preparationRules: file.preparationRules,
        sourceRules: file.sourceRules,
        appliedImportProfile: file.appliedImportProfile,
        customFieldMapping: file.customFieldMapping,
        confirmedCustomFieldMapping: file.confirmedCustomFieldMapping,
        confirmedMapping: file.confirmedMapping,
        columnCatalog: file.columnCatalog,
        result: file.result,
        sourceType: workspaceModel.normalizeSourceType(file.sourceType)
      };
    });
    return workspaceModel.validateWorkspace(Object.assign({}, prepared.workspace, { files: files }), {
      clonePayload: false
    });
  }


  function prepareWorkspaceRecord(record, language, reportProgress) {
    function sourceContext(file) {
      return {
        id: file.id,
        name: file.name,
        label: file.label,
        sourceType: workspaceModel.normalizeSourceType(file.sourceType)
      };
    }
    reportProgress({ phase: 'validating' });
    const validated = workspaceModel.migrateWorkspace(record, { clonePayload: false });
    const files = validated.files.map(function (stored, index) {
      reportProgress({
        phase: 'file',
        current: index + 1,
        total: validated.files.length,
        file: stored.label || stored.name
      });
      return runtimeFileFromStored(stored);
    });
    let result = null;
    let analysis = null;
    if (validated.analyzed) {
      reportProgress({ phase: 'analysis' });
      const analysisAccumulator = core.createAnalysisAccumulator();
      const batchFiles = files.map(function (file) {
        if (file.parsed && !file.errorKey) {
          const mapping = file.confirmedMapping || file.mapping;
          const customFieldMapping = file.confirmedCustomFieldMapping || file.customFieldMapping || {};
          file.result = file.content
            ? core.importCsvStreaming(file.content, mapping, {
              locale: language,
              sourceFile: sourceContext(file),
              customFields: validated.customFields,
              customFieldMapping: customFieldMapping,
              preparationRules: file.preparationRules,
              sourceRules: file.sourceRules
            })
            : importBufferStreaming(file, mapping, {
              locale: language,
              sourceFile: sourceContext(file),
              customFields: validated.customFields,
              customFieldMapping: customFieldMapping,
              preparationRules: file.preparationRules,
              sourceRules: file.sourceRules
            });
          if (file.result && Array.isArray(file.result.rawColumnCatalog)) {
            file.columnCatalog = file.result.rawColumnCatalog;
          }
        }
        return file;
      });
      result = core.combineImportResults(batchFiles, {
        analysisAccumulator: analysisAccumulator,
        locale: language,
        customFields: validated.customFields
      });
      analysis = analysisAccumulator.finish({ locale: language });
    }
    files.forEach(function (file) {
      // The source bytes remain the durable source of truth. Do not retain a
      // second decoded text copy after the worker has extracted its metadata
      // and, where applicable, built the normalized result.
      file.content = null;
      if (file.parsed && Array.isArray(file.parsed.rows)) {
        file.parsed.rows = [];
      }
    });
    return {
      workspace: {
        id: validated.id,
        schemaVersion: validated.schemaVersion,
        name: validated.name,
        createdAt: validated.createdAt,
        updatedAt: validated.updatedAt,
        language: validated.language,
        analyzed: validated.analyzed,
        periodSettings: validated.periodSettings,
        coverageNotes: validated.coverageNotes,
        tablePreferences: validated.tablePreferences,
        walkPreferences: validated.walkPreferences,
        customFields: validated.customFields,
        importProfiles: validated.importProfiles,
        warehouseLayout: validated.warehouseLayout,
        articleRegistry: result && Array.isArray(result.articleRegistry)
          ? result.articleRegistry
          : validated.articleRegistry,
        sourceCount: files.length,
        sourceBytes: files.reduce(function (sum, file) {
          return sum + (file.buffer instanceof ArrayBuffer ? file.buffer.byteLength : 0);
        }, 0),
        normalizedRowCount: files.reduce(function (sum, file) {
          return sum + (file.result && Array.isArray(file.result.rows) ? file.result.rows.length : 0);
        }, 0)
      },
      files: files,
      result: result,
      analysis: analysis
    };
  }


  function analyzeFiles(files, language, customFields) {
    const analysisAccumulator = core.createAnalysisAccumulator();
    const batchFiles = files.map(function (file) {
      if (file.parsed && !file.errorKey) {
        const mapping = file.confirmedMapping || file.mapping;
        const customFieldMapping = file.confirmedCustomFieldMapping || file.customFieldMapping || {};
        file.result = file.content === null || file.content === undefined
          ? importBufferStreaming(file, mapping, {
            locale: language,
            sourceFile: sourceContext(file),
            customFields: customFields,
            customFieldMapping: customFieldMapping,
            preparationRules: file.preparationRules,
            sourceRules: file.sourceRules
          })
          : core.importCsvStreaming(file.content, mapping, {
            locale: language,
            sourceFile: sourceContext(file),
            customFields: customFields,
            customFieldMapping: customFieldMapping,
            preparationRules: file.preparationRules,
            sourceRules: file.sourceRules
          });
        if (file.result && Array.isArray(file.result.rawColumnCatalog)) {
          file.columnCatalog = file.result.rawColumnCatalog;
        }
      } else {
        file.result = null;
      }
      return file;
    });
    const result = core.combineImportResults(batchFiles, {
      analysisAccumulator: analysisAccumulator,
      locale: language,
      customFields: customFields
    });
    return { files: files, result: result, analysis: analysisAccumulator.finish({ locale: language }) };
  }


  function workspaceWorkerMain(scope) {
    scope = scope || globalThis;
    scope.onmessage = function (event) {
      try {
        const input = event.data || {};
        const taskId = input.taskId;
        function postMessage(message, transfer) {
          scope.postMessage(Object.assign({ taskId: taskId }, message), transfer || []);
        }
        if (input.profileFile) {
          const file = input.profileFile;
          decodeFileEntry(file, { streaming: true });
          postMessage({ type: 'complete', prepared: { file: file } }, [file.buffer]);
          return;
        }
        if (input.analysisFiles) {
          postMessage({ type: 'progress', progress: { phase: 'analysis' } });
          const prepared = analyzeFiles(input.analysisFiles, input.language, input.customFields || []);
          const buffers = Array.from(new Set(prepared.files.map(function (file) { return file.buffer; })
            .filter(function (buffer) { return buffer instanceof ArrayBuffer; })));
          postMessage({ type: 'complete', prepared: prepared }, buffers);
          return;
        }
        if (input.backupExport) {
          const sourceSchemaVersion = Number(input.backupExport.schemaVersion);
          const validatedExport = workspaceModel.migrateWorkspace(input.backupExport, { clonePayload: false });
          let backupWorkspace = validatedExport;
          // Schema 11 only adds profile metadata; older data migrations still need a refreshed registry.
          if (sourceSchemaVersion < 10 && validatedExport.analyzed) {
            const prepared = prepareWorkspaceRecord(input.backupExport, validatedExport.language, function (progress) {
              postMessage({ type: 'progress', progress: progress });
            });
            backupWorkspace = Object.assign({}, validatedExport, {
              articleRegistry: prepared.workspace.articleRegistry
            });
          }
          const backupText = workspaceModel.stringifyBackup(backupWorkspace, { validated: true });
          postMessage({
            type: 'backup',
            text: backupText,
            filename: workspaceModel.backupFilename(input.backupExport.name)
          });
          return;
        }
        let record = input.record;
        let language = input.language;
        if (typeof input.backupText === 'string') {
          const parsed = workspaceModel.parseBackup(input.backupText);
          record = workspaceModel.prepareRestore(parsed, input.mode === 'replace'
            ? { mode: 'replace', targetId: input.targetId }
            : { mode: input.mode, newId: input.newId });
          language = record.language;
        }
        const prepared = prepareWorkspaceRecord(record, language, function (progress) {
          postMessage({ type: 'progress', progress: progress });
        });
        const preparedPayload = typeof input.backupText === 'string'
          ? {
            workspace: prepared.workspace,
            persistedWorkspace: persistPreparedWorkspace(prepared),
            runtime: prepared
          }
          : prepared;
        const buffers = [];
        const seenBuffers = new Set();
        prepared.files.forEach(function (file) {
          if (file.buffer instanceof ArrayBuffer && !seenBuffers.has(file.buffer)) {
            seenBuffers.add(file.buffer);
            buffers.push(file.buffer);
          }
        });
        postMessage({ type: 'complete', prepared: preparedPayload }, buffers);
      } catch (error) {
        scope.postMessage({
          taskId: (event.data || {}).taskId,
          type: 'error',
          code: error && (error.code || error.translationKey) || 'worker_failed',
          message: error && error.message ? error.message : 'Workspace background processing failed.'
        });
      }
    };
  }


  return Object.freeze({ analyzeFiles: analyzeFiles, sourceContext: sourceContext, decodeFileEntry: decodeFileEntry, importBufferStreaming: importBufferStreaming, runtimeFileFromStored: runtimeFileFromStored, persistPreparedWorkspace: persistPreparedWorkspace, prepareWorkspaceRecord: prepareWorkspaceRecord, workspaceWorkerMain: workspaceWorkerMain });
}));
