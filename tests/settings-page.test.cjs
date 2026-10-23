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
    'returnWorkspaceSelection', 'activeWorkspaceName', 'settingsWorkspaceName'].map(key => [key, node(key)]));
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
  f.state.activeWorkspace = null; f.identity();
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
  assert.match(css, /grid-template-rows:\s*minmax\(0, 1fr\) auto;/);
  assert.match(css, /\.settings-panel \.language-picker > span, \.settings-panel \.local-badge\s*\{\s*display:\s*inline-block/);
  assert.match(html, /<footer class="app-footer">[\s\S]*data-i18n="footer_local"/);
});
