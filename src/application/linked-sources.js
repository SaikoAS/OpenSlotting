(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../../workspace.js'), require('../../csv.js'));
  else root.OpenSlottingLinkedSources = factory(root.OpenSlottingWorkspace, root.OpenSlottingCsv);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (workspace, core) {
  'use strict';
  function failure(code, file) { return Object.assign(new Error(code), { code: code, file: file || '' }); }
  async function requestRead(handle) {
    if (!handle || typeof handle.getFile !== 'function') throw failure('linked_missing');
    const permission = { mode: 'read' };
    if (await handle.queryPermission(permission) === 'granted') return;
    if (await handle.requestPermission(permission) !== 'granted') throw failure('linked_permission');
  }
  async function planImports(files, incoming, options) {
    let virtual = files.slice();
    const operations = [];
    for (const item of incoming) {
      options.check();
      const matches = virtual.filter(function (file) { return file.name.normalize('NFC').toLocaleLowerCase('de-DE') === item.name.normalize('NFC').toLocaleLowerCase('de-DE'); });
      const choice = matches.length ? await options.resolve(item, matches) : { action: 'keep' };
      options.check();
      if (!choice || choice.action === 'cancel') {
        if (options.onSkip) options.onSkip(item);
        continue;
      }
      if (choice.action !== 'replace' && choice.action !== 'keep') throw failure('linked_failed');
      let id, create;
      if (choice.action === 'replace') {
        const target = matches.find(function (file) { return file.id === choice.id; });
        if (!target) throw failure('linked_missing');
        id = target.id;
        const previousIndex = operations.findIndex(function (operation) { return operation.id === id; });
        create = previousIndex >= 0 ? operations[previousIndex].create : false;
        if (previousIndex >= 0) operations.splice(previousIndex, 1);
        virtual = virtual.map(function (file) { return file.id === id ? Object.assign({}, file, { name: item.name }) : file; });
      } else {
        id = options.createId ? options.createId() : workspace.createId('source'); create = true;
        virtual.push({ id: id, name: item.name, label: item.name });
      }
      operations.push({ id: id, create: create, handle: item.handle, linked: item.linked !== false });
      virtual = core.assignSourceFileLabels(virtual);
    }
    return operations;
  }
  function finalizeImports(files) {
    return core.assignSourceFileLabels(files).map(function (file) {
      return Object.assign({}, file, { result: null,
        columnCatalog: (file.columnCatalog || []).map(function (column) {
          return Object.assign({}, column, { sourceFileId: file.id, sourceFileName: file.name, sourceFileLabel: file.label });
        }) });
    });
  }
  function remap(previous, candidate, customFields) {
    if (!previous || !previous.parsed) return candidate;
    if (previous.headers.length === candidate.headers.length && previous.headers.every(function (header, index) { return header === candidate.headers[index]; })) {
      ['mapping', 'customFieldMapping', 'preparationRules', 'sourceRules', 'confirmedMapping', 'confirmedCustomFieldMapping', 'appliedImportProfile']
        .forEach(function (key) { candidate[key] = previous[key]; });
      return candidate;
    }
    const rules = workspace.normalizeSourceRules(previous.sourceRules);
    const fields = (customFields || []).map(function (field) { return Object.assign({}, field, { active: true }); });
    const profile = workspace.createImportProfile(Object.assign({}, previous, {
      sourceRules: rules.map(function (rule) { return Object.assign({}, rule, { includeInProfile: true }); })
    }), 'Linked source', fields);
    const plan = workspace.planImportProfile(profile, candidate, fields);
    if (!plan.compatible) throw failure('linked_schema_changed', previous.label);
    candidate.mapping = plan.mapping;
    candidate.customFieldMapping = plan.customFieldMapping;
    candidate.preparationRules = workspace.normalizePreparationRules(previous.preparationRules);
    candidate.sourceRules = plan.sourceRules.map(function (rule, index) {
      return Object.assign({}, rule, { includeInProfile: rules[index].includeInProfile });
    });
    candidate.confirmedMapping = previous.confirmedMapping ? Object.assign({}, plan.mapping) : null;
    candidate.confirmedCustomFieldMapping = previous.confirmedCustomFieldMapping ? Object.assign({}, plan.customFieldMapping) : null;
    candidate.appliedImportProfile = previous.appliedImportProfile;
    return candidate;
  }
  async function refresh(options) {
    function check() { if (!options.isCurrent()) throw failure('workspace_load_cancelled'); }
    let files = options.files.slice();
    const links = [], seen = new Set();
    for (const operation of options.operations) {
      check();
      if (seen.has(operation.id)) throw failure('linked_failed');
      seen.add(operation.id);
      const index = files.findIndex(function (file) { return file.id === operation.id; });
      if (index < 0 && !operation.create) throw failure('linked_missing');
      const previous = index < 0 ? null : files[index];
      let file, buffer;
      try {
        file = await operation.handle.getFile(); check();
        buffer = await file.arrayBuffer(); check();
      } catch (error) {
        throw Object.assign(new Error(error.message), { name: error.name, code: error.code, file: previous ? previous.label : operation.handle.name });
      }
      const usedLabels = new Set(files.filter(function (source) { return source.id !== operation.id; }).map(function (source) { return source.label; }));
      let label = previous && previous.name === file.name ? previous.label : file.name;
      let suffix = 1;
      while (usedLabels.has(label)) label = file.name + ' (' + (++suffix) + ')';
      const candidate = Object.assign({}, previous || {
        id: operation.id,
        encodingMode: 'auto', sourceType: workspace.DEFAULT_SOURCE_TYPE,
        preparationRules: {}, sourceRules: [], customFieldMapping: {}
      }, {
        name: file.name, label: label,
        buffer: buffer, size: buffer.byteLength, lastModified: file.lastModified, browserFile: null,
        reading: false, result: null, linkedSource: operation.linked === false ? null : { name: file.name, updatedAt: new Date().toISOString() }
      });
      options.onFile(candidate.label);
      const profiled = await options.profile(candidate); check();
      if ((!profiled.parsed || profiled.errorKey || profiled.hasParseErrors) && !(options.allowInvalidNew && !previous)) throw failure('linked_invalid_csv', candidate.label);
      const replacement = remap(previous, profiled, options.customFields);
      if (index < 0) files.push(replacement); else files[index] = replacement;
      links.push({ sourceId: replacement.id, handle: operation.linked === false ? null : operation.handle });
    }
    check();
    if (options.finalize) files = options.finalize(files);
    const prepared = options.analyzed
      ? await options.analyze(files.map(function (file) { return Object.assign({}, file); }))
      : { files: files, result: null, analysis: null };
    check();
    await options.commit(prepared, links);
    return prepared;
  }
  return Object.freeze({ requestRead: requestRead, planImports: planImports, finalizeImports: finalizeImports, remap: remap, refresh: refresh });
}));
