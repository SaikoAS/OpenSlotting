'use strict';

// Optional manual UI acceptance with synthetic data, isolated from the application's database.
// Run: node tests/warehouse-browser-harness.cjs, then open the printed URL in Edge.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const scripts = ['runtime.js', 'csv.js', 'warehouse.js', 'workspace.js', 'storage.js', 'warehouse-webgl.js',
  'warehouse-scene.js', 'warehouse-editor.js', 'warehouse-analysis.js'];
const allowed = new Set(scripts.concat(['app.css', 'terminal-theme.css', 'warehouse-editor.css']));
const legacy = fs.readFileSync(path.join(__dirname, 'fixtures', 'warehouse-layout-v1.json'), 'utf8');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Issue 74 synthetic acceptance</title>
<link rel="stylesheet" href="app.css"><link rel="stylesheet" href="terminal-theme.css"><link rel="stylesheet" href="warehouse-editor.css">
<style>body{padding:18px}header{margin-bottom:18px}header button{margin:5px;padding:8px}#evidence{white-space:pre-wrap;font-size:12px}#warning{color:#ffc48a}</style></head>
<body><header><h2>Issue 74 · synthetic acceptance</h2><p>Separate test database. All editor and analysis assets are the current candidate.</p>
<button id="fresh">New geometry fixture</button><button id="legacy">Migrated legacy fixture</button><button id="analysis">Show read-only analysis</button><button id="editor">Show editor</button>
<label><input type="checkbox" id="approve" checked>Approve warned changes in this test fixture</label><p id="warning"></p></header>
<div class="warehouse-panel" id="warehouse-editor-root"></div><div class="warehouse-panel" id="warehouse-analysis-root" hidden></div>
<details><summary>Stored evidence</summary><pre id="evidence"></pre></details>
${scripts.map((file) => '<script src="' + file + '"></script>').join('')}
<script>
(async function () {
  const model = OpenSlottingWarehouse, workspace = OpenSlottingWorkspace;
  const repository = OpenSlottingStorage.createRepository({ databaseName: 'openslotting-issue74-synthetic-acceptance' });
  let record, editor, analysis, revision;
  const registry = [{ article_id: 'SYNTHETIC-1', master_data: { location: 'R01-03-02-01' } },
    { article_id: 'SYNTHETIC-2', master_data: { location: 'OUTSIDE-01' } }];
  window.confirm = function (message) { document.getElementById('warning').textContent = message; return document.getElementById('approve').checked; };
  function evidence() {
    const backup = workspace.parseBackup(workspace.stringifyBackup(record));
    document.getElementById('evidence').textContent = JSON.stringify({ schemaVersion: record.schemaVersion,
      matches: model.matchArticles(record.warehouseLayout, registry).matched, backupEqual: JSON.stringify(backup.warehouseLayout) === JSON.stringify(record.warehouseLayout),
      layout: record.warehouseLayout }, null, 2);
  }
  async function fixture(old) {
    record = workspace.createWorkspace('Issue 74 synthetic');
    record.articleRegistry = registry;
    if (old) record = workspace.migrateWorkspace(Object.assign({}, record, { schemaVersion: 13, warehouseLayout: ${legacy} }));
    else record.warehouseLayout = model.normalizeLayout(Object.assign(model.createLayout(), { objects: [model.createRack('shelf-rack', { bayCount: 1, levelCount: 3 })] }));
    record = await repository.createWorkspace(record); revision = record.storageRevision;
    await repository.setActiveWorkspace(record.id);
    record = await repository.loadWorkspace(record.id);
    editor.render(); analysis.render(); evidence();
  }
  editor = OpenSlottingWarehouseEditor.create({ root: document.getElementById('warehouse-editor-root'), model,
    getLayout: () => record.warehouseLayout, getRegistry: () => registry, getWorkspaceId: () => record.id, getLanguage: () => 'en',
    save: async function (layout) {
      const saved = await repository.updateWorkspaceSummary(record.id, { warehouseLayout: layout }, { expectedRevision: revision });
      revision = saved.storageRevision;
      record = await repository.loadWorkspace(record.id); evidence();
    } });
  analysis = OpenSlottingWarehouseAnalysis.create({ root: document.getElementById('warehouse-analysis-root'), model,
    getLayout: () => record.warehouseLayout, getRegistry: () => registry, getWorkspaceId: () => record.id, getLanguage: () => 'en' });
  document.getElementById('fresh').onclick = () => fixture(false);
  document.getElementById('legacy').onclick = () => fixture(true);
  document.getElementById('analysis').onclick = function () { document.getElementById('warehouse-editor-root').hidden = true; document.getElementById('warehouse-analysis-root').hidden = false; analysis.render(); };
  document.getElementById('editor').onclick = function () { document.getElementById('warehouse-editor-root').hidden = false; document.getElementById('warehouse-analysis-root').hidden = true; editor.render(); };
  const active = await repository.getActiveWorkspaceId();
  if (active) {
    revision = (await repository.listWorkspaces()).find((item) => item.id === active).storageRevision;
    record = await repository.loadWorkspace(active); editor.render(); analysis.render(); evidence();
  }
  else await fixture(false);
}()).catch(function (error) { document.getElementById('warning').textContent = error.stack; });
</script></body></html>`;

http.createServer((request, response) => {
  const file = (request.url || '').slice(1);
  response.setHeader('Cache-Control', 'no-store');
  if (request.url === '/' || request.url === '/index.html') {
    response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(html); return;
  }
  if (!allowed.has(file)) { response.writeHead(404); response.end(); return; }
  response.setHeader('Content-Type', file.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8');
  response.end(fs.readFileSync(path.join(root, file)));
}).listen(8766, '127.0.0.1', () => { console.log('Synthetic warehouse acceptance: http://127.0.0.1:8766/'); });
