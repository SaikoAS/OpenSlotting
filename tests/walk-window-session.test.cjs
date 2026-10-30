'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {webcrypto}=require('node:crypto'),model=require('../warehouse.js'),sessions=require('../src/application/walk-window-session.js');
function fixture(){
  const rack=model.createRack('pallet-rack',{bayCount:1,levelCount:1});let layout=model.normalizeLayout({...model.createLayout(),objects:[rack]});
  const zone=layout.zones.find(zone=>!zone.ground);layout=model.setZoneUsage(layout,zone.id,'picking');layout=model.resizeZoneLocations(layout,zone.id,1);layout.locations[0].code='0001';
  return {workspaceId:'synthetic-one',layout,preferences:{fov:60},language:'de',files:['PRIVATE-CSV-BYTES'],rows:['PRIVATE-ROWS'],
    registry:[{article_id:'0007',master_data:{location:'0001',article_name:'Synthetic',private:'PRIVATE-MASTER-EXTRA'},
      master_row_refs:Array.from({length:30},(_,i)=>({source_file_name:'Synthetic.csv',source_line:i+2,raw:'PRIVATE-SOURCE-ROW'})),
      value_provenance:[{field:'custom:zone',value:'A',source_type:'article-master',raw:'PRIVATE-RAW'},
        {field:'custom:movement',value:'PRIVATE-MOVEMENT',source_type:'order-lines'}]},
      {article_id:'UNMATCHED',master_data:{location:'missing',article_name:'PRIVATE-UNMATCHED'}}],
    articles:[{article_id:'0007',total_quantity:90071992547409931n,order_line_count:4,order_line_refs:['PRIVATE-REFS']},
      {article_id:'UNMATCHED',total_quantity:999n}],customFields:[{id:'zone',name:'Zone',private:'PRIVATE-FIELD'}],
    comparison:{settings:{periodA:{name:'A'},periodB:{name:'B'}},articles:[{article_id:'0007',period_a:{total_quantity:0n,order_line_count:0,order_line_refs:['PRIVATE-A']},period_b:{total_quantity:3n,order_line_count:2}}],rows:['PRIVATE-COMPARED-ROWS']}};
}
function environment(){
  const channels=new Set(),timeouts=new Map(),intervals=new Map(),messages=[];let serial=0;
  class Channel{
    constructor(name){this.name=name;this.closed=false;channels.add(this);}
    postMessage(value){messages.push(structuredClone(value));for(const other of channels)if(other!==this&&other.name===this.name&&!other.closed){
      const copy=structuredClone(value);queueMicrotask(()=>{if(!other.closed&&other.onmessage)other.onmessage({data:copy});});}}
    close(){this.closed=true;channels.delete(this);}
  }
  return {BroadcastChannel:Channel,crypto:webcrypto,messages,channels,timeouts,intervals,
    setTimeout(fn){const id=++serial;timeouts.set(id,fn);return id;},clearTimeout(id){timeouts.delete(id);},
    setInterval(fn){const id=++serial;intervals.set(id,fn);return id;},clearInterval(id){intervals.delete(id);}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('viewer projection keeps exact quantities and bounded source evidence but excludes imports and unrelated articles',()=>{
  const source=fixture(),before=structuredClone(source),result=sessions.snapshot(source,{mode:'fly'},model);
  assert.equal(sessions.validSnapshot(result),true);assert.equal(result.articles.length,1);
  assert.equal(result.articles[0].total_quantity,90071992547409931n);assert.equal(result.comparison.articles[0].period_a.total_quantity,0n);
  assert.equal(result.registry[0].master_row_refs.length,20);assert.equal(result.registry[0].master_row_ref_count,30);
  assert.equal(result.registry[0].article_id,'0007');assert.equal(result.registry[0].master_data.location,'0001');
  assert.equal(result.registry[0].value_provenance.length,1);
  assert.doesNotMatch(JSON.stringify(result,(_,value)=>typeof value==='bigint'?String(value):value),/PRIVATE-/);
  assert.deepEqual(source,before);assert.throws(()=>sessions.channelName('../file'));assert.throws(()=>sessions.channelName('a'.repeat(63)));
});

test('launch request contains only the session ID and uses the authenticated fixed route',async()=>{
  const calls=[],scope={fetch:async(url,options)=>{calls.push({url,...options});return {ok:true,json:async()=>({supported:true,token:'csrf'})};}};
  await sessions.launch('a'.repeat(64),scope);
  assert.equal(calls.length,2);assert.equal(calls[0].url,'/walk-window');assert.equal(calls[1].url,'/walk-window');
  assert.equal(calls[1].headers['X-OpenSlotting-Launch'],'csrf');assert.deepEqual(JSON.parse(calls[1].body),{session:'a'.repeat(64)});
  await assert.rejects(sessions.launch('a'.repeat(64),{fetch:async()=>({ok:false})}),/server-unavailable/);
  await assert.rejects(sessions.launch('a'.repeat(64),{fetch:async()=>({ok:true,json:async()=>({supported:false})})}),/unsupported/);
});

test('host and viewer exchange one snapshot, reuse a live viewer, refresh data and save only FOV in the parent',async t=>{
  const scope=environment(),source=fixture(),seen=[],saved=[];let client,launches=0,focused=0,ended=0;
  const host=sessions.createHost({environment:scope,getWorkspaceId:()=>source.workspaceId,
    getSnapshot:view=>sessions.snapshot(source,view,model),savePreferences:async value=>{saved.push(value);source.preferences=value;},
    launch:async id=>{launches++;client=sessions.createClient({id,environment:scope,onSnapshot:data=>seen.push(data),onFocus:()=>focused++,onEnd:()=>ended++});}});
  t.after(()=>host.close());await host.start({mode:'fly'});
  assert.equal(seen.length,1);assert.equal(seen[0].view.mode,'fly');assert.equal(seen[0].articles[0].total_quantity,source.articles[0].total_quantity);
  await host.start({mode:'walk'});await flush();assert.equal(launches,1);assert.equal(focused,1);
  source.articles[0].order_line_count=12;await client.refresh();assert.equal(seen.at(-1).articles[0].order_line_count,12);
  assert.equal(seen[0].articles[0].order_line_count,4,'snapshots are independent browser copies');
  assert.deepEqual(await client.savePreferences({fov:85}),{fov:85});assert.deepEqual(saved,[{fov:85}]);
  await assert.rejects(client.savePreferences({fov:101}),/invalid-preferences/);
  client.close();await flush();assert.equal(ended,1);assert.equal(scope.channels.size,0);assert.equal(scope.timeouts.size,0);assert.equal(scope.intervals.size,0);
});

test('workspace switches close the viewer and reject pending preference writes without sharing new-workspace data',async()=>{
  const scope=environment(),source=fixture();let client,release,ended=0;
  const host=sessions.createHost({environment:scope,getWorkspaceId:()=>source.workspaceId,getSnapshot:()=>sessions.snapshot(source,null,model),
    savePreferences:()=>new Promise(resolve=>{release=resolve;}),launch:id=>{client=sessions.createClient({id,environment:scope,onSnapshot(){},onEnd:()=>ended++});}});
  await host.start();const saving=client.savePreferences({fov:70});const rejected=assert.rejects(saving,/session-ended/);await flush();
  source.workspaceId='synthetic-two';host.checkWorkspace();await rejected;release();await flush();
  assert.equal(ended,1);assert.equal(scope.channels.size,0);assert.equal(scope.timeouts.size,0);
  assert.equal(scope.messages.filter(message=>message.type==='snapshot').length,1);
});

test('missing profile handshake and native launch failures leave no host session or timer behind',async()=>{
  const scope=environment(),source=fixture();const host=sessions.createHost({environment:scope,getWorkspaceId:()=>source.workspaceId,
    getSnapshot:()=>sessions.snapshot(source,null,model),launch:async()=>{}});
  const opening=host.start();const rejected=assert.rejects(opening,/window-timeout/);
  for(const callback of [...scope.timeouts.values()])callback();await rejected;
  assert.equal(scope.channels.size,0);assert.equal(scope.timeouts.size,0);
  const denied=sessions.createHost({environment:scope,getWorkspaceId:()=>source.workspaceId,getSnapshot(){},launch:async()=>{throw Error('denied');}});
  await assert.rejects(denied.start(),/denied/);assert.equal(scope.channels.size,0);assert.equal(scope.timeouts.size,0);
});

test('dedicated viewer loads no storage/analysis modules and its main integration checks workspace identity',()=>{
  const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'warehouse-walk-window.html'),'utf8');
  assert.doesNotMatch(html,/src="(?:app\.js|storage\.js|workspace\.js|src\/workers|src\/application\/workspace-preparation)/);
  for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g))assert.equal(fs.existsSync(path.join(root,match[1])),true,match[1]);
  const source=fs.readFileSync(path.join(root,'app.js'),'utf8');assert.match(source,/warehouseWalkWindow\.checkWorkspace\(\)/);
  assert.match(source,/startWindow: function \(view\) \{ return warehouseWalkWindow\.start\(view\); \}/);
});

test('viewer heartbeat tolerates device sleep but expires an unresponsive visible host',()=>{
  const scope=environment();let now=0,ended=0;
  const client=sessions.createClient({id:'a'.repeat(64),environment:scope,now:()=>now,onSnapshot(){},onEnd:()=>ended++});
  const heartbeat=[...scope.intervals.values()][0];
  now=120000;heartbeat();assert.equal(ended,0,'device sleep is not a lost session');
  for(let i=0;i<10;i++){now+=5000;heartbeat();}
  assert.equal(ended,1);assert.equal(scope.channels.size,0);assert.equal(scope.intervals.size,0);
  client.close();assert.equal(ended,1);
});
