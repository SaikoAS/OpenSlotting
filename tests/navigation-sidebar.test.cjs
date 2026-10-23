'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'terminal-theme.css'), 'utf8');
const nav = html.slice(html.indexOf('<nav id="workspace-navigation"'), html.indexOf('</nav>', html.indexOf('<nav id="workspace-navigation"')));
const start = source.indexOf('  function renderNavigation()');
const render = source.slice(start, source.indexOf('  function applyLanguage(', start));
const handlers = source.slice(source.indexOf('  elements.navigationToggle.addEventListener('), source.indexOf('  elements.workflowSteps.forEach(function (button) {\n    button.addEventListener'));

function fixture() {
  const attributes = new Map(), classes = new Set(); let click, frames = 0;
  const state = { navigationCollapsed: false, language: 'de', activePageTarget: 'main-menu-panel',
    activeWorkspace: { id: 'synthetic' }, files: [{ id: 'original-source' }] };
  const elements = { navigationToggle: {
    setAttribute: (key, value) => attributes.set(key, value), addEventListener: (_, callback) => { click = callback; }
  }, navigationToggleIcon: { textContent: '' } };
  const context = vm.createContext({ state, elements,
    document: { body: { classList: { toggle: (key, value) => value ? classes.add(key) : classes.delete(key) } } },
    translate: key => ({ de: { nav_expand: 'Seitenleiste ausklappen', nav_collapse: 'Seitenleiste einklappen' },
      en: { nav_expand: 'Expand sidebar', nav_collapse: 'Collapse sidebar' } }[state.language][key]),
    setText: (element, text) => { element.textContent = text; }, scheduleWorkspaceFrame: () => { frames++; }
  });
  vm.runInContext(render + handlers, context);
  return { state, elements, attributes, classes, render: () => context.renderNavigation(), click: () => click(), frames: () => frames };
}

test('sidebar toggle changes compact/expanded state without touching workspace data or navigation', () => {
  const f = fixture(), files = f.state.files, workspace = f.state.activeWorkspace;
  f.render(); assert.equal(f.attributes.get('aria-expanded'), 'true');
  assert.equal(f.attributes.get('aria-label'), 'Seitenleiste einklappen');
  f.click();
  assert.equal(f.state.navigationCollapsed, true);
  assert.equal(f.classes.has('navigation-collapsed'), true);
  assert.equal(f.attributes.get('aria-expanded'), 'false');
  assert.equal(f.attributes.get('title'), 'Seitenleiste ausklappen');
  assert.equal(f.elements.navigationToggleIcon.textContent, '›');
  f.click();
  assert.equal(f.classes.has('navigation-collapsed'), false);
  assert.equal(f.elements.navigationToggleIcon.textContent, '‹');
  assert.equal(f.frames(), 3);
  assert.equal(f.state.files, files); assert.equal(f.state.activeWorkspace, workspace);
  assert.equal(f.state.activePageTarget, 'main-menu-panel');
});

test('language changes keep the chosen rail state and update accessible toggle labels', () => {
  const f = fixture(); f.click(); f.state.language = 'en'; f.render();
  assert.equal(f.state.navigationCollapsed, true);
  assert.equal(f.attributes.get('aria-label'), 'Expand sidebar');
  f.click(); assert.equal(f.attributes.get('aria-label'), 'Collapse sidebar');
  assert.match(source, /renderNavigation\(\);\s*renderRuntimeDiagnostics\(\);/);
});

test('every existing navigation target is present exactly once in a named category or the footer', () => {
  const groups = [...nav.matchAll(/<section class="terminal-nav-group" aria-labelledby="([^"]+)">([\s\S]*?)<\/section>/g)];
  assert.equal(groups.length, 3);
  const expected = {
    'navigation-analysis': ['main-menu-panel', 'results-panel', 'comparison-panel'],
    'navigation-warehouse': ['warehouse-panel', 'warehouse-analysis-panel', 'warehouse-walk-panel'],
    'navigation-data': ['import-panel', 'mapping-panel', 'coverage-panel']
  };
  for (const [, id, content] of groups) {
    assert.match(content, new RegExp('id="' + id + '"'));
    assert.deepEqual([...content.matchAll(/data-workflow-target="([^"]+)"/g)].map(match => match[1]), expected[id]);
  }
  const targets = [...nav.matchAll(/data-workflow-target="([^"]+)"/g)].map(match => match[1]);
  assert.equal(targets.length, 11); assert.equal(new Set(targets).size, 11);
  const footer = nav.slice(nav.indexOf('class="terminal-rail-footer"'));
  assert.deepEqual([...footer.matchAll(/data-workflow-target="([^"]+)"/g)].map(match => match[1]), ['settings-panel', 'workspace-panel']);
});

test('collapsed icon buttons keep localized tooltips/names and a native keyboard toggle', () => {
  assert.match(nav, /id="navigation-toggle"[^>]+type="button"[^>]+aria-expanded="true"[^>]+aria-controls="navigation-groups"/);
  assert.match(nav, /id="navigation-groups"/);
  for (const button of nav.matchAll(/<button class="terminal-nav-item"[^>]+>/g)) {
    assert.match(button[0], /data-i18n-title=/); assert.match(button[0], /data-i18n-aria-label=/);
  }
  assert.match(source, /button\.setAttribute\('aria-current', 'page'\)/);
  assert.match(source, /button\.removeAttribute\('aria-current'\)/);
});

test('only the central category list scrolls and desktop width changes do not alter the picker/mobile grid', () => {
  assert.match(css, /\.terminal-rail-groups\s*\{[^}]*min-height:\s*0;[^}]*overflow-y:\s*auto;[^}]*overflow-x:\s*hidden;[^}]*overscroll-behavior:\s*contain/);
  assert.match(css, /\.terminal-rail-header\s*\{[^}]*flex:\s*none/);
  assert.match(css, /\.terminal-rail-footer\s*\{[^}]*flex:\s*none/);
  assert.match(css, /body\.navigation-collapsed\s*\{\s*--navigation-width:\s*64px/);
  assert.match(css, /@media \(min-width: 761px\)\s*\{\s*body:not\(\.workspace-picker-mode\) \.app-layout/);
});
