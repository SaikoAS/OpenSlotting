'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const path = require('node:path'), workspaceModel = require('../workspace.js'), linkedSources = require('../src/application/linked-sources.js');
const workspacePreparation = require('../src/application/workspace-preparation.js');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8').replace(/\r\n/g, '\n');
function body(name) {
  const start = source.search(new RegExp('  (?:async )?function ' + name + '\\('));
  const end = start + 1 + source.slice(start + 1).search(/\n  (?:async )?function \w+\(/);
  return source.slice(start, end);
}
const initial = 'article_id;quantity;delivery_date\nSYN-A;1;2026-08-03\n';
const changed = 'article_id;quantity;delivery_date\nSYN-B;5;2026-08-04\n';
function fixture(options = {}) {
  const bytes = new TextEncoder().encode(initial).buffer;
  const file = { id: 'source-one', name: 'one.csv', label: 'one.csv', buffer: bytes, size: bytes.byteLength,
    lastModified: 1, sourceType: 'order-lines', encodingMode: 'auto', preparationRules: {}, sourceRules: [], customFieldMapping: {},
    linkedSource: { name: 'one.csv', updatedAt: '2026-10-23T10:00:00.000Z' } };
  workspacePreparation.decodeFileEntry(file, { streaming: true }); file.confirmedMapping = { ...file.mapping };
  const analyzed = workspacePreparation.analyzeFiles([file], 'en', []);
  const state = { activeWorkspace: { id: 'workspace-one', name: 'Synthetic' }, storageReady: true, workspaceLoading: false,
    files: [file], analysis: analyzed.analysis, result: analyzed.result, comparison: { old: true }, customFields: [], language: 'en',
    periodSettings: {}, articleRegistry: analyzed.result.articleRegistry, fileSelectionVersion: 0 };
  const calls = [], messages = [];
  const handle = { kind: 'file', name: options.fileName || 'one.csv', async isSameEntry(other) { return this === other; },
    async queryPermission() { return 'granted'; }, async requestPermission() { return 'granted'; },
    async getFile() { return { name: options.fileName || 'one.csv', lastModified: 2, arrayBuffer: options.read || (async () => new TextEncoder().encode(options.text || changed).buffer) }; } };
  const context = vm.createContext({ state, linkedSources, workspaceModel, workspacePreparation, Map, Set,
    linkedSourceHandles: new Map([[file.id, handle]]), workspaceLoadRevision: 0,
    window: { showOpenFilePicker: options.picker || (async () => [handle]) }, linkedFilesSupported: () => options.supported !== false,
    TRANSLATIONS: { en: { linked_schema_changed: 'schema', linked_missing: 'missing' } },
    workspaceLoadError: code => Object.assign(new Error(code), { code }),
    renderWorkspaceControls() {}, renderImportedFiles() {}, renderMapping() {}, updateSourceStatus() {}, updateWorkspaceLoadProgress() {},
    calculationFile: file => structuredClone(file),
    runWorkspaceWorker: async () => { throw Object.assign(new Error('worker'), { code: 'worker_unavailable' }); },
    decodeFileEntry: (file, settings) => workspacePreparation.decodeFileEntry(file, settings),
    settingsForDetectedCalendarWeeks: settings => settings,
    setLinkedMessage: (key, values) => messages.push({ key, values }),
    renderResults: (result, settings) => { calls.push('render'); state.result = result; state.analysis = settings.analysis; state.comparison = null; },
    clearAnalysis: () => { calls.push('clear'); state.analysis = null; state.result = null; state.comparison = null; },
    persistActiveWorkspace: async (key, settings) => {
      calls.push({ save: settings.runtimeState, links: settings.sourceLinks });
      assert.equal(state.files[0], file, 'live sources must remain unchanged until the commit succeeds');
      assert.equal(state.workspaceLoadCancellable, false, 'the atomic commit cannot be cancelled');
      if (options.failSave) throw new Error('quota');
      settings.onCommitted();
    } });
  vm.runInContext(body('runLinkedImport'), context);
  return { state, file, handle, calls, messages, context, run: (...args) => context.runLinkedImport(...args) };
}
test('UI refresh commits proposed sources before replacing the live state and recomputes analysis', async () => {
  const f = fixture(), oldResult = f.state.result;
  await f.run('update', f.file.id);
  const save = f.calls.find(call => call.save);
  assert.equal(save.save.files[0].id, f.file.id); assert.equal(save.links[0].handle, f.handle);
  assert.notEqual(f.state.files[0], f.file); assert.notEqual(f.state.result, oldResult);
  assert.equal(f.state.result.rows[0].article_id, 'SYN-B'); assert.equal(f.state.workspaceLoading, false);
  assert.equal(f.messages.at(-1).key, 'linked_done');
});

test('reconnecting a different file publishes and saves its actual name with the same source identity', async () => {
  const f = fixture({ fileName: 'replacement.csv' });
  await f.run('connect', f.file.id);
  const saved = f.calls.find(call => call.save).save.files[0];
  for (const file of [saved, f.state.files[0]]) {
    assert.equal(file.id, f.file.id); assert.equal(file.name, 'replacement.csv');
    assert.equal(file.label, 'replacement.csv'); assert.equal(file.linkedSource.name, 'replacement.csv');
    assert.equal(file.result.rows[0].source_file_name, 'replacement.csv');
    assert.equal(file.result.rows[0].source_file_label, 'replacement.csv');
  }
  assert.equal(f.file.name, 'one.csv'); assert.equal(f.file.label, 'one.csv');
});

test('a failed reconnect keeps the previous filename and linkage with the previous data', async () => {
  for (const settings of [{ failSave: true }, { text: 'wrong;quantity;delivery_date\nX;5;2026-08-04\n' }]) {
    const f = fixture({ ...settings, fileName: 'replacement.csv' }), files = f.state.files;
    await f.run('connect', f.file.id);
    assert.equal(f.state.files, files); assert.equal(f.state.files[0].name, 'one.csv');
    assert.equal(f.state.files[0].label, 'one.csv'); assert.equal(f.state.files[0].linkedSource.name, 'one.csv');
    assert.equal(f.calls.includes('render'), false);
  }
});
test('save and schema failures retain the previous files, results and comparison', async () => {
  for (const settings of [{ failSave: true }, { text: 'wrong;quantity;delivery_date\nX;5;2026-08-04\n' }]) {
    const f = fixture(settings), files = f.state.files, result = f.state.result, comparison = f.state.comparison;
    await f.run('update', f.file.id);
    assert.equal(f.state.files, files); assert.equal(f.state.result, result); assert.equal(f.state.comparison, comparison);
    assert.equal(f.calls.includes('clear'), false); assert.equal(f.calls.includes('render'), false);
    assert.equal(f.state.workspaceLoading, false);
  }
});
test('late reads after cancellation cannot publish sources or clear newer task locks', async () => {
  let finish;
  const f = fixture({ read: () => new Promise(resolve => { finish = resolve; }) }), files = f.state.files;
  const running = f.run('update', f.file.id);
  for (let i = 0; i < 10 && !finish; i++) await Promise.resolve();
  f.context.workspaceLoadRevision++; f.state.workspaceLoading = true;
  finish(new TextEncoder().encode(changed).buffer); await running;
  assert.equal(f.state.files, files); assert.equal(f.calls.length, 0); assert.equal(f.state.workspaceLoading, true);
});
test('unlink keeps imported data and analysis and removes only the capability and link metadata', async () => {
  const f = fixture(), result = f.state.result;
  await f.run('unlink', f.file.id);
  assert.equal(f.state.files[0].linkedSource, null); assert.equal(f.state.result, result);
  assert.equal(f.context.linkedSourceHandles.has(f.file.id), false);
  assert.equal(f.calls.includes('clear'), false); assert.equal(f.messages.at(-1).key, 'linked_unlinked');
});
test('picker cancellation and duplicate links leave existing sources unchanged', async () => {
  const f = fixture(), files = f.state.files;
  await f.run('pick'); assert.equal(f.state.files, files); assert.equal(f.calls.length, 0);
  f.context.window.showOpenFilePicker = async () => { throw Object.assign(new Error('cancel'), { name: 'AbortError' }); };
  await f.run('connect', f.file.id); assert.equal(f.state.files, files); assert.equal(f.messages.at(-1).key, 'linked_cancelled');
});
test('busy or missing workspaces reject linked actions before permission or persistence', async () => {
  for (const patch of [{ activeWorkspace: null }, { storageReady: false }, { workspaceLoading: true }, { files: [{ reading: true }] }]) {
    const f = fixture(); Object.assign(f.state, patch); await f.run('update'); assert.equal(f.calls.length, 0); assert.equal(f.messages.length, 0);
  }
});

test('source removal and its buttons are locked during linked preparation', () => {
  for (const patch of [{ workspaceLoading: true }, { files: [{ reading: true }] }]) {
    const f = fixture(); Object.assign(f.state, patch);
    vm.runInContext(body('removeImportedFile'), f.context);
    const files = f.state.files; f.context.removeImportedFile(f.file.id);
    assert.equal(f.state.files, files); assert.equal(f.calls.length, 0);
  }
  const f = fixture(), remove = { disabled: false };
  const node = () => ({ classList: { toggle() {} } });
  Object.assign(f.context, {
    importManager: null, linkedImportMessage: null, setText() {}, translate: value => value,
    elements: { linkedPick: node(), linkedAll: node(), linkedHint: node(), linkedCancel: node(), linkedMessage: node(),
      importedFiles: { querySelectorAll: selector => selector.includes('remove-file-id') ? [remove] : [] } }
  });
  vm.runInContext(body('renderLinkedSourceControls'), f.context);
  f.state.workspaceLoading = true; f.context.renderLinkedSourceControls(); assert.equal(remove.disabled, true);
  f.state.workspaceLoading = false; f.context.renderLinkedSourceControls(); assert.equal(remove.disabled, false);
});
