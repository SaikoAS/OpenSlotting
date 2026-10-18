'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const model=require('../warehouse.js');
const scene=require('../warehouse-scene.js');
const walk=require('../warehouse-walk-model.js');
const renderer=require('../warehouse-walk-renderer.js');

function layout(){
  const rack=model.createRack('pallet-rack',{bayCount:2,levelCount:2});rack.bays[0].levels[0].deck=true;
  let value=model.normalizeLayout({...model.createLayout(),objects:[rack]});
  for(const zone of value.zones){value=model.setZoneUsage(value,zone.id,'picking');value=model.resizeZoneLocations(value,zone.id,3);}
  value.locations[0].code='0001';return value;
}
function box(value={}){return {object:{id:'synthetic',type:'wall',x:0,z:0,rotation:0},x:0,y:0,z:0,width:2000,height:3000,depth:100,color:'#647184',kind:'body',...value};}

test('perspective matrix agrees with projected points and grows nearby objects with positive clip w',()=>{
  for(const yaw of [0,.7,Math.PI])for(const pitch of [0,-.5,.6]){
    const camera={x:2,z:3,eye:1.7,yaw,pitch},basis=walk.basis(camera);
    const point={x:camera.x+basis.forward.x*4+basis.right.x,y:camera.eye+basis.forward.y*4,z:camera.z+basis.forward.z*4+basis.right.z};
    const p=walk.project(camera,point,1200,800),m=walk.matrix(camera,1.5),v=[point.x,point.y,point.z,1];
    const clip=[0,1,2,3].map(row=>v.reduce((sum,n,col)=>sum+m[col*4+row]*n,0));
    assert.ok(clip[3]>0);assert.ok(Math.abs(p.x-(clip[0]/clip[3]+1)*600)<.001);
    assert.ok(Math.abs(p.y-(1-clip[1]/clip[3])*400)<.001);
  }
  const camera={x:0,z:0,eye:1.7,yaw:Math.PI,pitch:0};
  assert.ok(walk.project(camera,{x:1,y:1.7,z:-2},800,600).x>walk.project(camera,{x:1,y:1.7,z:-4},800,600).x);
  assert.equal(walk.project(camera,{x:0,y:1,z:1},800,600),null);
  assert.ok(Math.abs(walk.ray(camera,0,0,1).z+1)<1e-10);
  assert.ok(walk.basis(camera).right.x>.99,'front-facing rack locations increase left to right');
});

test('body clearance uses rotated physical parts, permits raised beams and ignores logical floor areas',()=>{
  const rotated=box({object:{id:'r',type:'wall',x:1000,z:2000,rotation:90}}),world=walk.createWorld([rotated]);
  assert.equal(walk.canStand(world,{x:.95,z:3},1.7),false);
  assert.equal(walk.canStand(world,{x:.2,z:3},1.7),true);
  const raised=walk.createWorld([box({y:2500,height:200})]);
  assert.equal(walk.canStand(raised,{x:1,z:.05},1.7),true);
  assert.equal(walk.canStand(walk.createWorld([box({y:1700,height:200})]),{x:1,z:.05},1.7),false);
  const area=walk.createWorld([box({object:{id:'a',type:'aisle',x:0,z:0,rotation:0},height:15})]);
  assert.equal(walk.canStand(area,{x:1,z:.05},1.7),true);
});

test('incremental movement cannot tunnel through thin walls and slides along them',()=>{
  const world=walk.createWorld([box({width:6000,depth:10})]),camera={x:1,z:-1,eye:1.7};
  walk.move(world,camera,0,2);assert.ok(camera.z<=-.28);
  const before=camera.x;walk.move(world,camera,.4,.4);assert.ok(camera.x>before);assert.ok(camera.z<=-.28);
  assert.equal(walk.move(world,camera,Infinity,0),false);
  assert.equal(walk.canStand(world,{x:NaN,z:1},1.7),false);
});

test('ray selection uses full marker areas, stops at actual occluding geometry and works after rotation',()=>{
  const value=layout(),boxes=scene.buildBoxes(model,value),world=walk.createWorld(boxes),item=world.positions.get(value.locations[0].id);
  const point=walk.world(item,item.x+item.width/2,item.y+.004,item.z+item.depth/2);
  const origin={x:point.x,y:point.y+.5,z:point.z};
  const hit=walk.raycast(world,origin,{x:0,y:-1,z:0});assert.equal(hit.item.slotId,item.slotId);
  const obstacle=box({x:(point.x-.2)*1000,y:(point.y+.1)*1000,z:(point.z-.2)*1000,width:400,height:100,depth:400});
  const blocked=walk.createWorld([...boxes,obstacle]);assert.equal(walk.raycast(blocked,origin,{x:0,y:-1,z:0}).item.slotId,false);
  for(const rotation of [90,37]){
    value.objects[0].rotation=rotation;const rotated=walk.createWorld(scene.buildBoxes(model,value)),slot=rotated.positions.get(item.slotId);
    const p=walk.world(slot,slot.x+slot.width/2,slot.y+.5,slot.z+slot.depth/2);
    assert.equal(walk.raycast(rotated,p,{x:0,y:-1,z:0}).item.slotId,item.slotId);
    const approach=walk.approach(rotated,slot,1.7);assert.ok(approach);assert.equal(walk.canStand(rotated,approach,1.7),true);
  }
});

test('spatial indexes bound oversized obstacle insertion and free-position searches stay finite',()=>{
  const world=walk.createWorld([box({width:500000,depth:500000})]);
  assert.equal(world.grid.size,0);assert.equal(world.large.length,1);
  assert.equal(walk.freePosition(world,{x:100,z:100},1.7),null);
  assert.equal(walk.canStand(world,{x:-2,z:-2},1.7),true);
});

test('shared scene produces finite static meshes without changing any warehouse data',()=>{
  const value=layout(),before=structuredClone(value),world=walk.createWorld(scene.buildBoxes(model,value));
  const meshes=renderer.buildMeshes(world,walk);assert.ok(meshes.opaque.length>0);assert.ok(meshes.lines.length>0);
  for(const data of Object.values(meshes)){assert.equal(data.length%6,0);assert.ok(data.every(Number.isFinite));}
  assert.deepEqual(value,before);
  assert.equal(world.positions.size,value.locations.length);
});

test('GPU geometry is uploaded once and camera frames only change uniforms',()=>{
  let uploads=0,matrices=0;const events={},constants=new Map();
  const gl=new Proxy({bufferData(){uploads++;},uniformMatrix4fv(_location,_transpose,value){assert.ok(value.every(Number.isFinite));matrices++;},
    getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:()=>0,getUniformLocation:()=>({})},
    {get(target,key){if(key in target)return target[key];if(/^[A-Z_0-9]+$/.test(key)){if(!constants.has(key))constants.set(key,constants.size+1);return constants.get(key);}return ()=>({});}});
  const canvas={getContext:()=>gl,addEventListener(type,cb){events[type]=cb;},isConnected:true,clientWidth:800,clientHeight:600};
  const context=vm.createContext({window:{devicePixelRatio:1}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','warehouse-walk-renderer.js'),'utf8'),context);
  const engine=context.OpenSlottingWarehouseWalkRenderer.create(canvas,walk),value=layout();
  engine.setWorld(walk.createWorld(scene.buildBoxes(model,value)));const count=uploads;
  for(let i=0;i<20;i++)engine.render({x:0,z:4,eye:1.7,yaw:i*.01,pitch:0});
  assert.equal(uploads,count);assert.equal(matrices,20);
  engine.selection(value.locations[0].id);assert.equal(uploads,count+1);
  events.webglcontextlost({preventDefault(){}});assert.equal(engine.available(),false);
  events.webglcontextrestored();assert.equal(engine.available(),true);assert.ok(uploads>count+1);
});

function harness(value,available=true){
  const listeners={},windowListeners={},documentListeners={},nodes=new Map(),canvases=[],frames=new Map();let sequence=0;
  function node(){const n={innerHTML:'',textContent:'',dataset:{},style:{},hidden:false,disabled:false,isConnected:true,clientWidth:900,clientHeight:600,events:{},
    classList:{add(){}},setAttribute(){},appendChild(){},prepend(){},focus(){},hasAttribute(){return false;},
    getBoundingClientRect(){return {left:0,top:0,width:900,height:600};},getContext(){return null;},
    addEventListener(type,callback){this.events[type]=callback;},setPointerCapture(){}};return n;}
  const root=node();root.querySelector=selector=>{if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector);};root.addEventListener=(type,cb)=>listeners[type]=cb;
  const h={visible:true,gpu:available,value:value,root,nodes,frames,rendered:0,worlds:0};
  const context=vm.createContext({document:{hidden:false,createElement(type){const n=node();if(type==='canvas')canvases.push(n);return n;},addEventListener(t,cb){documentListeners[t]=cb;}},
    window:{OpenSlottingWarehouseScene:scene,OpenSlottingWarehouseWalkModel:walk,
      OpenSlottingWarehouseWalkRenderer:{create(_canvas,_walk,callbacks){h.gpuCallbacks=callbacks;return available?{available:()=>h.gpu,setWorld(){h.worlds++;},selection(){},render(){h.rendered++;}}:null;}},
      requestAnimationFrame(cb){const id=++sequence;frames.set(id,cb);return id;},cancelAnimationFrame(id){frames.delete(id);},addEventListener(t,cb){windowListeners[t]=cb;}}
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','warehouse-walk.js'),'utf8'),context);
  const editor=context.OpenSlottingWarehouseWalk.create({root,model,getLayout:()=>h.value,getRegistry:()=>[{article_id:'SKU',master_data:{location:'0001',article_name:'Synthetic'}}],
    getArticles:()=>[{article_id:'SKU',order_line_count:12,total_quantity:24,active_days:3}],getWorkspaceId:()=>h.workspace||'one',getLanguage:()=>h.language||'en',
    formatQuantity:value=>String(value),isVisible:()=>h.visible});
  h.render=editor.render;h.active=editor.setActive;h.canvas=canvases[0];
  h.action=(action)=>listeners.click({target:{closest(selector){return selector==='[data-walk-action]'?{dataset:{walkAction:action}}:null;}}});
  h.search=code=>listeners.input({target:{value:code,hasAttribute:key=>key==='data-walk-search'}});
  h.tick=time=>{const pending=[...frames.values()];frames.clear();pending.forEach(cb=>cb(time));};
  h.key=(code,target=canvases[0])=>listeners.keydown({code,key:code,target,preventDefault(){}});
  h.blur=()=>windowListeners.blur();h.render();return h;
}

test('read-only controller searches exact codes, exposes assignment metrics and works without WebGL',async()=>{
  const value=layout(),before=structuredClone(value),h=harness(value,false);
  h.search('0001');await h.action('find');const html=h.nodes.get('.wh-walk-inspector').innerHTML;
  assert.match(html,/0001/);assert.match(html,/SKU/);assert.match(html,/Order lines/);assert.match(html,/>12</);
  assert.match(html,/not evidence of stock/);assert.match(html,/900 × 1100 mm/);
  assert.match(h.nodes.get('[data-walk-message]').textContent,/WebGL2/);
  h.search('1');await h.action('find');assert.match(h.nodes.get('[data-walk-message]').textContent,/exact code/);
  assert.deepEqual(value,before);
});

test('movement is focus-scoped, stops on blur/page leave, and camera frames do not rebuild geometry',()=>{
  const value=layout(),before=structuredClone(value),h=harness(value);h.tick(100);
  const worlds=h.worlds;h.key('KeyW',{hasAttribute:()=>false});assert.equal(h.frames.size,0);
  h.key('KeyW');h.tick(116);assert.equal(h.frames.size,1);assert.equal(h.worlds,worlds);
  h.blur();assert.equal(h.frames.size,0);h.key('KeyD');h.active(false);assert.equal(h.frames.size,0);
  h.visible=false;h.tick(140);assert.equal(h.frames.size,0);assert.deepEqual(value,before);
  h.gpu=false;h.gpuCallbacks.lost();assert.match(h.nodes.get('[data-walk-message]').textContent,/WebGL2/);
  assert.equal(h.nodes.get('[data-walk-action="look"]').disabled,true);
  h.gpu=true;h.gpuCallbacks.restored();assert.equal(h.nodes.get('[data-walk-message]').textContent,'');
});
