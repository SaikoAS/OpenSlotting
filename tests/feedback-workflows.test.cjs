'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const terminal = require('../terminal.js');
const workspace = require('../workspace.js');
const storage = require('../storage.js');
const core = require('../csv.js');
const preparation = require('../src/application/workspace-preparation.js');
const { createFakeIndexedDB } = require('./fake-indexeddb.cjs');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8').replace(/\r\n/g, '\n');
function appFunction(name) {
  const start = source.search(new RegExp('  (?:async )?function ' + name + '\\('));
  assert.ok(start >= 0, name);
  const next = source.slice(start + 1).search(/\n  (?:async )?function \w+\(/);
  return source.slice(start, start + next + 1);
}
const plain = value => JSON.parse(JSON.stringify(value));
const prefs = () => ({columnOrder:['custom:custom-zone','article_id','quantity'],visibleColumns:['custom:custom-zone']});

test('day evidence scrolls only the page, without touching document, frame or rail', () => {
  const rail={scrollTop:33},frame={scrollTop:0},doc={scrollTop:0};
  let requested;
  const page={scrollTop:120,getBoundingClientRect:()=>({top:90}),scrollTo:value=>{requested=value;}};
  const context=vm.createContext({elements:{coverageDrilldown:{closest:selector=>selector==='.app-page'?page:null,
    getBoundingClientRect:()=>({top:430}),scrollIntoView:()=>assert.fail('outer scrolling is forbidden')}}});
  vm.runInContext(appFunction('revealCoverageEvidence'),context);
  context.revealCoverageEvidence();assert.deepEqual(plain(requested),{top:448,behavior:'smooth'});
  assert.equal(rail.scrollTop,33);assert.equal(frame.scrollTop,0);assert.equal(doc.scrollTop,0);
  assert.equal((source.match(/revealCoverageEvidence\(\);/g)||[]).length,2,'calendar and table evidence share the same navigation');
});

function masterRegistry() {
  const fields=[{id:'custom-zone',name:'Synthetic zone',type:'text',active:true}];
  const orders=core.importCsv('article_id;quantity;delivery_date;zone\n001;2;2026-10-01;\n001;3;2026-10-02;LOCAL\n002;1;2026-10-02;MOVEMENT-ONLY\n',
    {article_id:0,quantity:1,delivery_date:2},{sourceFile:{id:'source-orders',name:'orders.csv',sourceType:'order-lines'},customFields:fields,customFieldMapping:{'custom-zone':3}});
  const master=core.importCsv('article_id;zone\n001;MASTER\n003;OTHER\n',{article_id:0},
    {sourceFile:{id:'source-master',name:'master.csv',sourceType:'article-master'},customFields:fields,customFieldMapping:{'custom-zone':1}});
  const combined=core.combineImportResults([
    {id:'source-orders',name:'orders.csv',sourceType:'order-lines',result:orders},
    {id:'source-master',name:'master.csv',sourceType:'article-master',result:master}]);
  return {combined,index:terminal.masterFieldIndex(combined.articleRegistry)};
}

test('master enrichment preserves exact IDs, order values, zero, missingness, evidence and source rows', () => {
  const {combined,index}=masterRegistry(),before=structuredClone(combined.rows);
  const empty=combined.rows.find(row=>row.article_id==='001'&&!row.custom_fields['custom-zone']);
  const own=combined.rows.find(row=>row.custom_fields['custom-zone']==='LOCAL');
  const resolved=terminal.customLineValue(empty,'custom-zone',index);
  assert.equal(resolved.value,'MASTER');assert.equal(resolved.source,'article-master');
  assert.equal(resolved.provenance.source_file_id,'source-master');assert.equal(resolved.provenance.source_line,2);
  assert.equal(terminal.customLineValue(own,'custom-zone',index).value,'LOCAL');
  for(const value of ['0',0,false]) assert.equal(terminal.customLineValue({...empty,custom_fields:{'custom-zone':value}},'custom-zone',index).value,value);
  assert.equal(terminal.customLineValue({article_id:'1'},'custom-zone',index).value,'','leading zero IDs remain distinct');
  assert.equal(terminal.customLineValue({article_id:'002'},'custom-zone',index).value,'','movement provenance never becomes a master fallback');
  assert.deepEqual(combined.rows,before);
});

test('custom sorting and filtered export use the same resolved master values without changing rows', () => {
  const {combined,index}=masterRegistry(),before=structuredClone(combined.rows),key='custom:custom-zone';
  const valueFor=(row,column)=>terminal.customLineValue(row,column.slice(7),index).value;
  const sorted=terminal.sortLines(combined.rows,key,'asc',valueFor);
  assert.deepEqual(sorted.map(row=>valueFor(row,key)),['LOCAL','MASTER','MOVEMENT-ONLY']);
  const exported=terminal.exportLinesCsv(sorted,[{key,label:'Synthetic zone'}],valueFor);
  assert.match(exported,/"LOCAL"\r?\n"MASTER"\r?\n"MOVEMENT-ONLY"/);
  assert.deepEqual(combined.rows,before);
});

test('column ordering ignores stale keys, keeps new columns and follows stable custom field IDs', () => {
  const columns=[{key:'article_id'},{key:'custom:custom-zone',label:'Renamed'},{key:'quantity'},{key:'new_field'}];
  const before=structuredClone(columns);
  assert.deepEqual(terminal.orderedColumns(columns,['quantity','deleted','quantity','custom:custom-zone']).map(c=>c.key),
    ['quantity','custom:custom-zone','article_id','new_field']);
  assert.deepEqual(columns,before);
  assert.deepEqual(workspace.normalizeTablePreferences({columnOrder:['quantity','quantity','bad key',null,'custom:custom-zone'],visibleColumns:['__proto__','custom:custom-zone']}),
    {columnOrder:['quantity','custom:custom-zone'],visibleColumns:['__proto__','custom:custom-zone']});
});

test('schema-20 migration, full/trusted capture, worker preparation and backup retain isolated column preferences', () => {
  const legacy=workspace.createWorkspace('Synthetic legacy');legacy.schemaVersion=20;delete legacy.tablePreferences;
  const migrated=workspace.migrateWorkspace(legacy);
  assert.equal(migrated.schemaVersion,21);assert.deepEqual(migrated.tablePreferences,{columnOrder:[],visibleColumns:[]});
  const original=workspace.createWorkspace('Synthetic columns',{tablePreferences:prefs()});
  const prepared=preparation.prepareWorkspaceRecord(original,'en',()=>{});
  assert.deepEqual(prepared.workspace.tablePreferences,prefs());
  const persisted=preparation.persistPreparedWorkspace(prepared);assert.deepEqual(persisted.tablePreferences,prefs());
  for(const capture of [workspace.captureWorkspace,workspace.captureWorkspaceTrusted]) {
    const captured=capture(original,{...original,analysis:null});
    assert.deepEqual(captured.tablePreferences,prefs());
    assert.deepEqual(workspace.parseBackup(workspace.stringifyBackup(captured)).tablePreferences,prefs());
  }
  assert.deepEqual(workspace.createWorkspace('Other workspace').tablePreferences,{columnOrder:[],visibleColumns:[]});
});

test('metadata-only column saves reopen correctly, preserve bytes, isolate workspaces and roll back on quota failure', async t => {
  const indexedDB=createFakeIndexedDB(),repository=storage.createRepository({indexedDB,databaseName:'synthetic-table-prefs'});
  t.after(()=>repository.close());
  const record=workspace.createWorkspace('Synthetic columns'),other=workspace.createWorkspace('Other');
  const text='article_id;quantity;delivery_date\nSYN-1;2;2026-10-01\n',buffer=new TextEncoder().encode(text).buffer;
  record.files=[{id:'source-synthetic',name:'synthetic.csv',label:'synthetic.csv',buffer,size:buffer.byteLength,lastModified:1,
    sourceType:'order-lines',encodingMode:'auto',mapping:{article_id:0,quantity:1,delivery_date:2},customFieldMapping:{},preparationRules:{},sourceRules:[]}];
  const saved=await repository.createWorkspace(record);await repository.createWorkspace(other);
  const summarySaved=await repository.updateWorkspaceSummary(record.id,{...saved,tablePreferences:prefs()},{expectedRevision:saved.storageRevision});
  const reopened=await repository.loadWorkspace(record.id);
  assert.deepEqual(reopened.tablePreferences,prefs());assert.deepEqual(new Uint8Array(reopened.files[0].buffer),new Uint8Array(buffer));
  assert.deepEqual((await repository.loadWorkspace(other.id)).tablePreferences,{columnOrder:[],visibleColumns:[]});
  indexedDB.failNextWrite('QuotaExceededError');
  await assert.rejects(repository.updateWorkspaceSummary(record.id,{...reopened,tablePreferences:{columnOrder:[],visibleColumns:[]}},
    {expectedRevision:summarySaved.storageRevision}),error=>error.code==='quota_exceeded');
  assert.deepEqual((await repository.loadWorkspace(record.id)).tablePreferences,prefs());
});

function preferenceController(persist) {
  const state={activeWorkspace:{id:'workspace-synthetic'},storageReady:true,workspaceLoading:false,files:[],tablePreferences:workspace.normalizeTablePreferences()};
  const context=vm.createContext({state,workspaceModel:workspace,terminalView:{lineContext:{}},
    elements:{terminalLinesColumnOptions:{querySelectorAll:()=>[]}},renderTerminalColumnOptions(){},renderWorkspaceControls(){},renderTerminalLineTable(){},showWorkspaceError(){},
    persistActiveWorkspace:(_key,options)=>persist(options,state)});
  vm.runInContext('let terminalPreferencesSaving=false;'+appFunction('saveTerminalPreferences'),context);
  return {state,save:context.saveTerminalPreferences};
}

test('column controller exposes new preferences only after commit, preserving old settings on failure', async () => {
  let release;const gate=new Promise(resolve=>{release=resolve;});
  const h=preferenceController(async options=>{assert.equal(options.metadataOnly,true);await gate;options.onCommitted();});
  const pending=h.save(prefs());assert.deepEqual(h.state.tablePreferences,{columnOrder:[],visibleColumns:[]});
  release();await pending;assert.deepEqual(plain(h.state.tablePreferences),prefs());assert.equal(h.state.workspaceLoading,false);
  const failed=preferenceController(async()=>{throw new Error('Synthetic failure');});await failed.save(prefs());
  assert.deepEqual(failed.state.tablePreferences,{columnOrder:[],visibleColumns:[]});assert.equal(failed.state.workspaceLoading,false);
});

test('column save completing after workspace replacement never changes the new workspace layout', async () => {
  let release;const gate=new Promise(resolve=>{release=resolve;});
  const h=preferenceController(async options=>{await gate;options.onCommitted();});
  const pending=h.save(prefs());h.state.activeWorkspace={id:'workspace-other'};release();await pending;
  assert.deepEqual(h.state.tablePreferences,{columnOrder:[],visibleColumns:[]});
});

test('FOV defaults, bounds, migration, captures, worker and backup preserve workspace view preferences',()=>{
  const legacy=workspace.createWorkspace('Synthetic legacy');legacy.schemaVersion=20;delete legacy.walkPreferences;
  assert.deepEqual(workspace.migrateWorkspace(legacy).walkPreferences,{fov:60});
  for(const [value,expected] of [[undefined,60],[null,60],['80',60],[NaN,60],[Infinity,60],[20,45],[130,100],[75.6,76]])
    assert.deepEqual(workspace.normalizeWalkPreferences({fov:value}),{fov:expected});
  const original=workspace.createWorkspace('Synthetic FOV',{walkPreferences:{fov:85},tablePreferences:prefs()});
  assert.deepEqual(workspace.validateWorkspace(original).walkPreferences,{fov:85});
  const prepared=preparation.prepareWorkspaceRecord(original,'en',()=>{});
  assert.deepEqual(prepared.workspace.walkPreferences,{fov:85});
  assert.deepEqual(preparation.persistPreparedWorkspace(prepared).walkPreferences,{fov:85});
  for(const capture of [workspace.captureWorkspace,workspace.captureWorkspaceTrusted]){
    const captured=capture(original,{...original,analysis:null});
    assert.deepEqual(captured.walkPreferences,{fov:85});
    assert.deepEqual(workspace.parseBackup(workspace.stringifyBackup(captured)).walkPreferences,{fov:85});
  }
  assert.deepEqual(workspace.createWorkspace('Other').walkPreferences,{fov:60});
});

test('metadata-only FOV saves isolate workspaces, retain columns and raw bytes, and roll back failed writes',async t=>{
  const indexedDB=createFakeIndexedDB(),repository=storage.createRepository({indexedDB,databaseName:'synthetic-fov-prefs'});
  t.after(()=>repository.close());
  const record=workspace.createWorkspace('Synthetic FOV',{tablePreferences:prefs()}),other=workspace.createWorkspace('Other');
  const buffer=new TextEncoder().encode('article_id;quantity;delivery_date\nSYN-1;2;2026-10-01\n').buffer;
  record.files=[{id:'source-synthetic',name:'synthetic.csv',label:'synthetic.csv',buffer,size:buffer.byteLength,lastModified:1,
    sourceType:'order-lines',encodingMode:'auto',mapping:{article_id:0,quantity:1,delivery_date:2},customFieldMapping:{},preparationRules:{},sourceRules:[]}];
  const saved=await repository.createWorkspace(record);await repository.createWorkspace(other);
  const metadata=await repository.updateWorkspaceSummary(record.id,{...saved,walkPreferences:{fov:90}},{expectedRevision:saved.storageRevision});
  const reopened=await repository.loadWorkspace(record.id);
  assert.deepEqual(reopened.walkPreferences,{fov:90});assert.deepEqual(reopened.tablePreferences,prefs());
  assert.deepEqual(new Uint8Array(reopened.files[0].buffer),new Uint8Array(buffer));
  assert.deepEqual((await repository.loadWorkspace(other.id)).walkPreferences,{fov:60});
  indexedDB.failNextWrite('QuotaExceededError');
  await assert.rejects(repository.updateWorkspaceSummary(record.id,{...reopened,walkPreferences:{fov:45}},
    {expectedRevision:metadata.storageRevision}),error=>error.code==='quota_exceeded');
  assert.deepEqual((await repository.loadWorkspace(record.id)).walkPreferences,{fov:90});
});

function walkPreferenceController(persist){
  const state={activeWorkspace:{id:'one'},storageReady:true,workspaceLoading:false,files:[],walkPreferences:{fov:60}};
  const context=vm.createContext({state,workspaceModel:workspace,renderWorkspaceControls(){},persistActiveWorkspace:(_key,options)=>persist(options,state)});
  vm.runInContext(appFunction('saveWarehouseWalkPreferences'),context);return {state,save:context.saveWarehouseWalkPreferences};
}

test('FOV controller commits atomically, rejects failure, tolerates post-commit refresh errors and guards workspace changes',async()=>{
  let release;const gate=new Promise(resolve=>{release=resolve;});
  const h=walkPreferenceController(async options=>{assert.equal(options.metadataOnly,true);await gate;options.onCommitted();});
  const pending=h.save({fov:80});assert.equal(h.state.walkPreferences.fov,60);release();await pending;
  assert.equal(h.state.walkPreferences.fov,80);assert.equal(h.state.workspaceLoading,false);
  const failed=walkPreferenceController(async()=>{throw new Error('Synthetic failure');});
  await assert.rejects(failed.save({fov:90}));assert.equal(failed.state.walkPreferences.fov,60);assert.equal(failed.state.workspaceLoading,false);
  const committed=walkPreferenceController(async options=>{options.onCommitted();throw new Error('Synthetic catalog refresh failure');});
  await committed.save({fov:90});assert.equal(committed.state.walkPreferences.fov,90);
  let finish;const late=walkPreferenceController(async options=>{await new Promise(resolve=>{finish=resolve;});options.onCommitted();});
  const saving=late.save({fov:95});late.state.activeWorkspace={id:'two'};late.state.walkPreferences={fov:50};finish();
  await assert.rejects(saving,/workspace-changed/);assert.equal(late.state.walkPreferences.fov,50);
});
