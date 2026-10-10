'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8').replace(/\r\n/g, '\n');
function functionSource(name) {
  const start = source.search(new RegExp('  (?:async )?function ' + name + '\\('));
  assert.ok(start >= 0, name);
  const next = source.slice(start + 1).search(/\n  (?:async )?function \w+\(/);
  assert.ok(next >= 0, name + ' boundary');
  return source.slice(start, start + next + 1);
}

test('cancel before worker dispatch leaves the next task available and original buffers attached', async () => {
  let starts = 0;
  const context = vm.createContext({ ArrayBuffer, Set, workspaceLoadRevision: 2, workspaceWorkerTask: null,
    workspaceWorkerSession: { async run(message) { starts++; return { type: 'complete', prepared: message.record }; } },
    updateWorkspaceLoadProgress() {} });
  vm.runInContext(functionSource('workspaceLoadError') + '\n' + functionSource('runWorkspaceWorker'), context);
  const record = { files: [{ buffer: new ArrayBuffer(64) }] };
  await assert.rejects(context.runWorkspaceWorker(record, 'en', 1, 'Cancelled'), { code: 'workspace_load_cancelled' });
  assert.equal(starts, 0); assert.equal(record.files[0].buffer.byteLength, 64);
  assert.equal(context.workspaceWorkerTask, null);
  await context.runWorkspaceWorker(record, 'en', 2, 'Current');
  assert.equal(starts, 1);
});

test('no complete or metadata save captures a source while it is being read', async () => {
  const context = vm.createContext({ Promise, state: { files: [{ reading: true, buffer: null, errorKey: null }] } });
  vm.runInContext(functionSource('persistActiveWorkspace'), context);
  await context.persistActiveWorkspace();
  await context.persistActiveWorkspace(null, { metadataOnly: true, allowWhileLoading: true });
  // Accessing other state/dependencies would fail; the source guard exits first.
});

test('all custom-field mutations reject a running file import before prompts or changes', async () => {
  const state = { activeWorkspace: { id: 'one' }, files: [{ reading: true }], customFields: [] };
  const context = vm.createContext({ state });
  for (const name of ['createCustomField', 'createCustomFieldFromFile', 'renameCustomField', 'removeCustomField']) {
    vm.runInContext(functionSource(name), context);
    await context[name]('source');
  }
  assert.deepEqual(state.customFields, []);
});

test('opening and cancelling refresh mapping controls after clearing the busy state', () => {
  const activation = functionSource('activateWorkspace');
  assert.match(activation, /finally\s*\{[\s\S]*state\.workspaceLoading = false;[\s\S]*renderMapping\(\);[\s\S]*renderWorkspaceControls\(\);/);
  const calls = [];
  const state = { workspaceLoading: true, workspaceLoadCancellable: true };
  const context = vm.createContext({ state, workspaceLoadRevision: 1, workspaceWorkerTask: {},
    workspaceWorkerSession: { cancel() { calls.push('cancel'); } },
    updateWorkspaceLoadProgress() {}, setWorkspaceMessage() {},
    renderMapping() { assert.equal(state.workspaceLoading, false); calls.push('mapping'); },
    renderWorkspaceControls() { calls.push('controls'); } });
  vm.runInContext(functionSource('cancelWorkspaceLoading'), context);
  context.cancelWorkspaceLoading();
  assert.deepEqual(calls, ['cancel', 'mapping', 'controls']);
});

test('calculation snapshots preserve originals and omit bulky persisted results', () => {
  const context = vm.createContext({});
  vm.runInContext(functionSource('calculationFile'), context);
  const bytes = new Uint8Array([1, 2, 3]);
  const file = { buffer: bytes.buffer, result: { rows: Array(100).fill({}) }, id: 'one', parsed: { headers: ['a'] } };
  const copied = context.calculationFile(file);
  assert.notEqual(copied.buffer, file.buffer);
  new Uint8Array(copied.buffer)[0] = 99;
  assert.equal(bytes[0], 1); assert.equal(copied.result, null);
});

function languageFixture() {
  const state = { language: 'en', activeWorkspace: { id: 'one', name: 'One' }, workspaceLoading: false,
    files: [{ id: 'source', buffer: new ArrayBuffer(16), parsed: { headers: [] }, reading: false }],
    result: { diagnostic: 'Old English' }, customFields: [] };
  let handler, resolveTask, rejectTask;
  const saved = [], rendered = [], errors = [];
  const context = vm.createContext({ Promise, state, workspaceLoadRevision: 0,
    elements: { languageSelect: { value: 'de', addEventListener(type, fn) { handler = fn; } } },
    nextBrowserPaint: async () => {},
    runWorkspaceWorker: () => new Promise((resolve, reject) => { resolveTask = resolve; rejectTask = reject; }),
    renderWorkspaceControls() {}, updateWorkspaceLoadProgress() {}, renderMapping() {},
    renderResults(result) { state.result = result; rendered.push(result); },
    persistActiveWorkspace: async () => { saved.push(state.language); },
    showWorkspaceError(error) { errors.push(error); }, invalidateViewCaches() {},
    renderArticleSearch() {}, selectedArticle() { return null; } });
  context.applyLanguage = options => options?.skipAnalysisRefresh ? null : context.refreshAnalyzedResults(true);
  vm.runInContext(functionSource('calculationFile') + '\n' + functionSource('refreshAnalyzedResults'), context);
  const start = source.indexOf("  elements.languageSelect.addEventListener('change'");
  const end = source.indexOf('  elements.analyzeButton.addEventListener', start);
  vm.runInContext(source.slice(start, end), context);
  return { state, context, saved, rendered, errors, run: () => handler(),
    complete: () => resolveTask({ files: state.files, result: { diagnostic: 'Neu Deutsch' }, analysis: {} }),
    fail: error => { assert.equal(typeof rejectTask, 'function', errors.map(item => item.stack).join('\n')); rejectTask(error); } };
}

test('cancelled language refresh restores language and leaves old diagnostics unsaved', async () => {
  const fixture = languageFixture(); const pending = fixture.run();
  await new Promise(resolve => setImmediate(resolve));
  fixture.context.workspaceLoadRevision++;
  fixture.state.workspaceLoading = false;
  fixture.fail(Object.assign(new Error('Cancelled'), { code: 'workspace_load_cancelled' }));
  await pending;
  assert.equal(fixture.state.language, 'en');
  assert.equal(fixture.context.elements.languageSelect.value, 'en');
  assert.equal(fixture.state.result.diagnostic, 'Old English');
  assert.deepEqual(fixture.saved, []); assert.deepEqual(fixture.rendered, []);
});

test('failed language refresh leaves a coherent old locale while committed refresh saves the new one', async () => {
  const failure = languageFixture(); const failed = failure.run();
  await new Promise(resolve => setImmediate(resolve));
  failure.fail(Object.assign(new Error('Invalid'), { code: 'invalid_mapping' })); await failed;
  assert.equal(failure.state.language, 'en'); assert.equal(failure.state.result.diagnostic, 'Old English');
  assert.deepEqual(failure.saved, []); assert.equal(failure.errors.length, 1);
  const success = languageFixture(); const completed = success.run();
  await new Promise(resolve => setImmediate(resolve)); success.complete(); await completed;
  assert.equal(success.state.language, 'de'); assert.equal(success.state.result.diagnostic, 'Neu Deutsch');
  assert.deepEqual(success.saved, ['de', 'de']);
  assert.equal(success.state.workspaceLoading, false);
});
