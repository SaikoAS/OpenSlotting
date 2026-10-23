'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8').replace(/\r\n/g, '\n');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function appFunction(name, next) { return source.slice(source.indexOf('  function ' + name + '('), source.indexOf('  function ' + next + '(')); }
function node(id) {
  const classes = new Set(), attributes = new Map();
  return { id, textContent: '', attributes,
    classList: { toggle: (key, enabled) => enabled ? classes.add(key) : classes.delete(key), contains: key => classes.has(key) },
    setAttribute: (key, value) => attributes.set(key, value), removeAttribute: key => attributes.delete(key) };
}
function fixture(open = false) {
  const state = { activeWorkspace: open ? { id: 'synthetic', name: 'Synthetic <workspace>' } : null,
    activePageTarget: 'workspace-panel', files: [], result: null, comparison: null, warehouseLayout: { objects: [] }, mappingDrawerOpen: false };
  const elements = Object.fromEntries(['pageContextKicker', 'pageContextTitle', 'pageContextStatus', 'returnMainMenu',
    'returnWorkspaceSelection', 'activeWorkspaceName', 'settingsWorkspaceName', 'settingsWorkspaceHint'].map(key => [key, node(key)]));
  elements.pageViews = ['settings-page', 'workspace-page', 'main-menu-page'].map(node);
  elements.workflowSteps = ['settings-panel', 'workspace-panel', 'main-menu-panel'].map(target => Object.assign(node(target), { dataset: { workflowTarget: target } }));
  const body = node('body'); let frames = 0, desks = 0;
  const context = vm.createContext({ state, elements, document: { body },
    translate: key => key, setText: (element, value) => { element.textContent = value; },
    hasCoverageContent: () => false, renderMappingViews() {},
    renderTerminal: () => { desks++; }, scheduleWorkspaceFrame: () => { frames++; },
    closeMappingDrawer: () => { state.mappingDrawerOpen = false; } });
  vm.runInContext('const PAGE_CONFIG = ' + source.match(/const PAGE_CONFIG = ({[\s\S]*?});/)[1] + ';\n' +
    appFunction('renderWorkflow', 'scrollActivePageToTop') + appFunction('renderWorkspaceIdentity', 'renderWorkspaceControls'), context);
  return { state, elements, body, render: target => context.renderWorkflow(target), identity: () => context.renderWorkspaceIdentity(), frames: () => frames, desks: () => desks };
}

test('settings are reachable without opening a workspace and have a path back to selection', () => {
  const f = fixture(); f.render('settings-panel');
  assert.equal(f.state.activePageTarget, 'settings-panel');
  assert.equal(f.elements.pageViews[0].classList.contains('hidden'), false);
  assert.equal(f.elements.workflowSteps[0].disabled, false);
  assert.equal(f.elements.workflowSteps[0].attributes.get('aria-current'), 'page');
  assert.equal(f.state.activeWorkspace, null);
  f.render('workspace-panel');
  assert.equal(f.elements.pageViews[1].classList.contains('hidden'), false);
  assert.equal(f.state.activePageTarget, 'workspace-panel');
});

test('settings preserve an open workspace and return to the analysis desk without changing data', () => {
  const f = fixture(true), workspace = f.state.activeWorkspace, files = f.state.files;
  f.state.mappingDrawerOpen = true; f.render('settings-panel');
  assert.equal(f.body.classList.contains('workspace-picker-mode'), false);
  assert.equal(f.state.mappingDrawerOpen, false);
  assert.equal(f.elements.pageContextTitle.textContent, 'settings_title');
  f.render('main-menu-panel');
  assert.equal(f.desks(), 1); assert.equal(f.frames(), 2);
  assert.equal(f.state.activeWorkspace, workspace); assert.equal(f.state.files, files);
});

test('workspace identity is readable in settings and page context as escaped text', () => {
  const f = fixture(true); f.identity();
  for (const element of [f.elements.activeWorkspaceName, f.elements.settingsWorkspaceName]) {
    assert.equal(element.textContent, 'Synthetic <workspace>');
    assert.equal(element.attributes.get('title'), 'Synthetic <workspace>');
  }
  assert.equal(f.elements.settingsWorkspaceHint.classList.contains('hidden'), true);
  f.state.activeWorkspace = null; f.identity();
  assert.equal(f.elements.settingsWorkspaceHint.classList.contains('hidden'), false);
  assert.equal(f.elements.settingsWorkspaceName.textContent, 'workspace_none');
});

test('header is removed and a single language control lives in settings, including on narrow screens', () => {
  assert.doesNotMatch(html, /<header\b[^>]*class="app-header"/);
  assert.doesNotMatch(html, /id="header-build-status"|id="header-workspace-name"/);
  const settings = html.slice(html.indexOf('id="settings-page"'), html.indexOf('id="main-menu-page"'));
  assert.equal([...html.matchAll(/id="language-select"/g)].length, 1);
  assert.match(settings, /id="language-select"/);
  assert.match(settings, /id="settings-build-status"/);
  assert.match(settings, /id="runtime-badge"/);
  assert.match(settings, /data-workflow-target="workspace-panel"/);
  const picker = html.slice(html.indexOf('id="workspace-page"'), html.indexOf('id="settings-page"'));
  assert.match(picker, /data-workflow-target="settings-panel"/);
  const css = fs.readFileSync(path.join(__dirname, '..', 'terminal-theme.css'), 'utf8');
  assert.match(css, /grid-template-rows:\s*minmax\(0, 1fr\);/);
  assert.match(css, /\.settings-panel \.language-picker > span, \.settings-panel \.local-badge\s*\{\s*display:\s*inline-block/);
  assert.doesNotMatch(html, /<footer class="app-footer">/);
  assert.match(settings, /data-i18n="footer_local"/);
});

test('settings separate global diagnostics from workspace language and data actions', () => {
  const global = html.slice(html.indexOf('id="settings-global"'), html.indexOf('id="settings-workspace"'));
  const workspace = html.slice(html.indexOf('id="settings-workspace"'), html.indexOf('id="main-menu-page"'));
  assert.match(global, /id="settings-build-status"/);
  assert.match(global, /id="runtime-badge"/);
  assert.match(global, /data-i18n="footer_local"/);
  assert.doesNotMatch(global, /id="language-select"|id="reset-button"/);
  assert.match(workspace, /id="language-select"/);
  assert.match(workspace, /id="settings-workspace-name"/);
  assert.match(workspace, /id="settings-workspace-hint"/);
  assert.match(workspace, /id="reset-button"[^>]*aria-describedby="settings-reset-help"[^>]*disabled/);
  assert.equal([...html.matchAll(/id="reset-button"/g)].length, 1);
  assert.doesNotMatch(html, /id="app-version"/);
  assert.doesNotMatch(source, /elements\.appVersion/);
  const baseCss = fs.readFileSync(path.join(__dirname, '..', 'app.css'), 'utf8');
  assert.doesNotMatch(baseCss, /\.workspace-picker-mode #reset-button\s*\{[^}]*display:\s*none/);
});

test('workspace picker centers its panel with safe auto margins and keeps page scrolling', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'terminal-theme.css'), 'utf8');
  const page = css.match(/\.workspace-picker-mode \.workflow-content > #workspace-page\s*\{([^}]+)\}/)[1];
  const panel = css.match(/\.workspace-picker-mode #workspace-page > \.workspace-panel\s*\{([^}]+)\}/)[1];
  assert.match(page, /display:\s*flex;/);
  assert.match(page, /flex-direction:\s*column;/);
  assert.match(page, /scrollbar-gutter:\s*stable both-edges;/);
  assert.match(panel, /flex:\s*0 0 auto;/);
  assert.match(panel, /max-width:\s*1560px;/);
  assert.match(panel, /margin:\s*auto;/);
  assert.match(css, /\.workflow-content > \.app-page\s*\{[^}]*overflow:\s*auto;/);
});

test('settings backup binds to the active workspace and shares cancellation without changing selection', () => {
  const calls = [], handlers = {}, state = { activeWorkspace: { id: 'open' }, selectedWorkspaceId: 'other' };
  const elements = Object.fromEntries(['workspaceBackup', 'settingsWorkspaceBackup', 'settingsBackupCancel'].map(key =>
    [key, { addEventListener(type, handler) { handlers[key] = handler; } }]));
  const context = vm.createContext({ state, elements, exportWorkspaceBackup: id => calls.push(id), cancelWorkspaceLoading: () => calls.push('cancel') });
  const start = source.indexOf("  elements.workspaceBackup.addEventListener('click'");
  vm.runInContext(source.slice(start, source.indexOf('  elements.workspaceOpen.addEventListener', start)), context);
  handlers.settingsWorkspaceBackup(); handlers.workspaceBackup(); handlers.settingsBackupCancel();
  assert.deepEqual(calls, ['open', undefined, 'cancel']);
  assert.equal(state.selectedWorkspaceId, 'other');
  state.activeWorkspace = null; handlers.settingsWorkspaceBackup();
  assert.equal(calls.length, 3);
  const settings = html.slice(html.indexOf('id="settings-workspace"'), html.indexOf('id="main-menu-page"'));
  assert.match(settings, /id="settings-workspace-backup"[^>]*disabled/);
  assert.match(settings, /id="settings-workspace-message"[^>]*role="status"/);
  const css = fs.readFileSync(path.join(__dirname, '..', 'terminal-theme.css'), 'utf8');
  assert.match(css, /\.settings-panel \.workspace-message\s*\{\s*color:\s*var\(--ink\)/);
});

test('settings backup is available for ready open workspaces including empty ones and disabled while busy', () => {
  const state = { storageReady: true, workspaceLoading: false, activeWorkspace: { id: 'open', name: 'Open' }, selectedWorkspaceId: 'other', files: [] };
  const names = ['mainMenuWorkspaceName', 'workspaceOpen', 'workspaceCancel', 'workspaceRecovery', 'workspaceCreate',
    'workspaceRestoreNew', 'workspaceRename', 'workspaceDelete', 'workspaceBackup', 'settingsWorkspaceBackup', 'settingsBackupCancel', 'workspaceRestoreReplace'];
  const elements = Object.fromEntries(names.map(key => [key, node(key)]));
  const context = vm.createContext({ state, elements, renderWorkspaceIdentity() {}, translate: key => key,
    setText() {}, document: { body: node('body') } });
  const start = source.indexOf('  function renderWorkspaceControls()');
  vm.runInContext(source.slice(start, source.indexOf('    renderCustomFields();', start)) + '}', context);
  context.renderWorkspaceControls(); assert.equal(elements.settingsWorkspaceBackup.disabled, false);
  for (const patch of [{ activeWorkspace: null }, { storageReady: false }, { workspaceLoading: true }, { files: [{ reading: true }] }]) {
    Object.assign(state, { activeWorkspace: { id: 'open' }, storageReady: true, workspaceLoading: false, files: [] }, patch);
    context.renderWorkspaceControls(); assert.equal(elements.settingsWorkspaceBackup.disabled, true);
  }
});

test('workspace progress and success/error messages are mirrored into settings and cleared together', () => {
  const state = { workspaceMessage: { key: 'success', replacements: {}, type: '' }, workspaceProgress: { key: 'backup', replacements: {}, value: 4, max: 10 } };
  const names = ['workspaceMessage', 'settingsWorkspaceMessage', 'workspaceRecovery', 'workspaceLoadProgress',
    'workspaceLoadLabel', 'workspaceProgress', 'settingsLoadProgress', 'settingsLoadLabel', 'settingsProgress'];
  const elements = Object.fromEntries(names.map(key => [key, node(key)]));
  const context = vm.createContext({ state, elements, translate: key => key, setText: (element, text) => { element.textContent = text; } });
  vm.runInContext(appFunction('renderWorkspaceMessage', 'setWorkspaceMessage') + appFunction('renderWorkspaceProgress', 'renderWorkspaceOverview'), context);
  context.renderWorkspaceMessage(); context.renderWorkspaceProgress();
  assert.equal(elements.settingsWorkspaceMessage.textContent, 'success');
  assert.equal(elements.settingsLoadLabel.textContent, 'backup');
  assert.equal(elements.settingsProgress.value, 4); assert.equal(elements.settingsProgress.max, 10);
  assert.equal(elements.settingsLoadProgress.classList.contains('hidden'), false);
  state.workspaceMessage.type = 'error'; context.renderWorkspaceMessage();
  assert.equal(elements.settingsWorkspaceMessage.className, 'workspace-message error');
  state.workspaceMessage = null; state.workspaceProgress = null;
  context.renderWorkspaceMessage(); context.renderWorkspaceProgress();
  assert.equal(elements.settingsWorkspaceMessage.className, 'workspace-message hidden');
  assert.equal(elements.settingsWorkspaceMessage.textContent, '');
  assert.equal(elements.settingsLoadProgress.classList.contains('hidden'), true);
  assert.equal(elements.settingsLoadLabel.textContent, '');
  assert.equal(elements.settingsProgress.attributes.has('value'), false);
});

function resetFixture(options = {}) {
  const calls = [], state = { activeWorkspace: { id: 'synthetic', name: 'Synthetic workspace' },
    files: [{ id: 'synthetic-source', reading: false }], storageReady: true, workspaceLoading: false, ...options.state };
  const context = vm.createContext({ state,
    window: { confirm: message => { calls.push(['confirm', message]); return options.confirm !== false; } },
    translate: (key, values) => key + ':' + values.name,
    clearWorkspaceView: value => { calls.push(['clear', value.preserveCoverageNotes]); state.files = []; },
    persistActiveWorkspace: key => { calls.push(['save', key]); return Promise.resolve(); },
    setWorkspaceMessage: (key, values) => calls.push(['message', key, values.name]) });
  const start = source.indexOf('  function reset()');
  vm.runInContext(source.slice(start, source.indexOf('  elements.workspaceCreate.addEventListener', start)), context);
  return { state, calls, reset: () => context.reset() };
}

test('clear action rejects missing, empty and busy workspaces before asking for confirmation', () => {
  for (const state of [{ activeWorkspace: null }, { files: [] }, { storageReady: false },
    { workspaceLoading: true }, { files: [{ reading: true }] }]) {
    const f = resetFixture({ state }); f.reset(); assert.deepEqual(f.calls, []);
  }
  assert.match(source, /elements\.resetButton\.disabled = !hasWorkspace \|\| state\.files\.length === 0/);
});

test('clear cancellation changes nothing and confirmation retains the existing clear/save contract', async () => {
  const cancelled = resetFixture({ confirm: false }), original = cancelled.state.files;
  cancelled.reset(); assert.equal(cancelled.state.files, original);
  assert.deepEqual(cancelled.calls, [['confirm', 'workspace_reset_confirm:Synthetic workspace']]);
  const confirmed = resetFixture(), workspace = confirmed.state.activeWorkspace;
  confirmed.reset(); await Promise.resolve();
  assert.deepEqual(confirmed.calls, [['confirm', 'workspace_reset_confirm:Synthetic workspace'],
    ['clear', true], ['save', 'workspace_cleared'], ['message', 'workspace_cleared', 'Synthetic workspace']]);
  assert.equal(confirmed.state.activeWorkspace, workspace);
});
