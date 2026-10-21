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
const walkController=require('../warehouse-walk.js');

function layout(){
  const rack=model.createRack('pallet-rack',{bayCount:2,levelCount:2});rack.bays[0].levels[0].deck=true;
  let value=model.normalizeLayout({...model.createLayout(),objects:[rack]});
  for(const zone of value.zones){value=model.setZoneUsage(value,zone.id,'picking');value=model.resizeZoneLocations(value,zone.id,3);}
  value.locations[0].code='0001';return value;
}
function box(value={}){return {object:{id:'synthetic',type:'wall',x:0,z:0,rotation:0},x:0,y:0,z:0,width:2000,height:3000,depth:100,color:'#647184',kind:'body',...value};}

test('interaction cards retain exact IDs, zero/unknown values, escape sources and show only master-proven custom fields',()=>{
  const slot=model.listLocations(layout())[0],base={language:'en',slot,assigned:[{articleId:'001',name:'<script>Synthetic</script>'}],articleId:'001',tab:'overview',formatQuantity:String};
  const html=walkController.interactionHtml({...base,metric:{total_quantity:0n,order_line_count:0,distinct_orders:0,distinct_customers:0,active_days:0,source_file_count:0}});
  assert.match(html,/001/);assert.equal((html.match(/<strong>0<\/strong>/g)||[]).length,6);assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);
  const missing=walkController.interactionHtml(base);assert.equal((missing.match(/<strong>Unknown<\/strong>/g)||[]).length,6);
  const master=walkController.interactionHtml({...base,tab:'master',customFields:[{id:'zone',name:'Synthetic zone'}],master:{master_data:{vat_rate:0},
    value_provenance:[{field:'custom:zone',source_type:'article-master',value:false},{field:'custom:movement',source_type:'order-lines',value:'MOVEMENT-ONLY'}],
    master_row_refs:[{source_file_name:'<img>.csv',source_line:2}]}});
  assert.match(master,/Synthetic zone/);assert.match(master,/<strong>false<\/strong>/);assert.doesNotMatch(master,/MOVEMENT-ONLY/);assert.match(master,/&lt;img&gt;.csv/);
  assert.match(walkController.interactionHtml({...base,assigned:[],articleId:null}),/No current article assignment/);
});

test('bounded interaction rays reject distant locations and stop at physical occluders',()=>{
  const marker=box({kind:'location',slotRef:{slotId:'synthetic-location'},x:800,y:1400,width:400,height:600,depth:400});
  const world=walk.createWorld([marker]),direction={x:0,y:0,z:-1};
  assert.equal(walk.raycast(world,{x:1,y:1.7,z:8},direction,false,6),null);
  assert.equal(walk.raycast(world,{x:1,y:1.7,z:4},direction,false,6).item.slotId,'synthetic-location');
  const blocked=walk.createWorld([marker,box({width:2000,z:1000,depth:50})]);
  assert.equal(walk.raycast(blocked,{x:1,y:1.7,z:4},direction,false,6).item.slotId,false);
});

function motionRun(world,camera,motion,input,frames=60,speed=1.4){
  for(let i=0;i<frames;i++)walk.stepMotion(world,camera,motion,typeof input==='function'?input(i):input,.016,speed,1.7);
}

test('jump follows gravity, lands without held-space repeats, and stops at low ceilings',()=>{
  const world=walk.createWorld([]),camera={x:0,z:0,eye:1.7,yaw:0,pitch:0},motion=walk.createMotion();
  let peak=0;motionRun(world,camera,motion,i=>{peak=Math.max(peak,motion.feet);return {jump:i===0};},90);
  assert.ok(peak>.6&&peak<.8);assert.equal(motion.feet,0);assert.equal(motion.grounded,true);assert.equal(camera.eye,1.7);
  const ceiling=walk.createWorld([box({x:-1000,z:-1000,width:2000,depth:2000,y:2000,height:10})]);
  let ceilingPeak=0;motionRun(ceiling,camera,motion,i=>{ceilingPeak=Math.max(ceilingPeak,motion.feet);return {jump:i===0};},90);
  assert.ok(ceilingPeak<=.1502&&ceilingPeak>0);assert.equal(motion.feet,0);
});

test('crouching permits low openings, prevents blocked standing and restores full height after leaving',()=>{
  const world=walk.createWorld([box({width:4000,y:1350,height:200,depth:1500})]);
  const camera={x:1,z:-.5,eye:1.7,yaw:0,pitch:0},motion=walk.createMotion();
  motionRun(world,camera,motion,{forward:1,crouch:true},70,2);
  assert.ok(camera.z>.5);assert.equal(motion.crouched,true);assert.equal(camera.eye,1.02);
  motionRun(world,camera,motion,{},2);assert.equal(motion.crouched,true,'cannot stand through a beam');
  assert.equal(motion.standBlocked,true);
  motionRun(world,camera,motion,{forward:-1},110,2);assert.equal(motion.crouched,false);assert.equal(camera.eye,1.7);
});

test('jump can land on thin physical decks and gravity continues after walking off their edge',()=>{
  const world=walk.createWorld([box({y:300,height:10,depth:1500})]);
  const camera={x:1,z:-1,eye:1.7,yaw:0,pitch:0},motion=walk.createMotion();
  motionRun(world,camera,motion,i=>({forward:1,jump:i===0}),60);
  assert.ok(camera.z>0);assert.ok(Math.abs(motion.feet-.31)<.001);assert.equal(motion.grounded,true);
  motionRun(world,camera,motion,{forward:1},140);assert.equal(motion.feet,0);assert.equal(camera.eye,1.7);
});

test('walking at maximum speed respects thin rotated walls and normalizes diagonal motion',()=>{
  const world=walk.createWorld([box({width:6000,depth:10})]),camera={x:1,z:-1,eye:1.7,yaw:0,pitch:0},motion=walk.createMotion();
  motionRun(world,camera,motion,{forward:1},60,20);assert.ok(camera.z<=-.27);
  const empty=walk.createWorld([]),a={x:0,z:0,eye:1.7,yaw:0,pitch:0},b={...a};
  motionRun(empty,a,walk.createMotion(),{forward:1},30,2);motionRun(empty,b,walk.createMotion(),{forward:1,side:1},30,2);
  assert.ok(Math.abs(Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z))<1e-9);
  const rotated=walk.createWorld([box({object:{id:'r',type:'wall',x:0,z:0,rotation:37},width:6000,depth:10})]);
  const angle=37*Math.PI/180,c={x:Math.cos(angle)+Math.sin(angle),z:Math.sin(angle)-Math.cos(angle),eye:1.7,yaw:-angle,pitch:0};
  motionRun(rotated,c,walk.createMotion(),{forward:1},60,20);
  assert.ok(-c.x*Math.sin(angle)+c.z*Math.cos(angle)<=-.27);
});

test('free flight follows view direction, ignores obstacles, bounds altitude and caps combined movement speed',()=>{
  const world=walk.createWorld([box({width:6000,depth:10})]),camera={x:1,z:-1,eye:1.7,yaw:0,pitch:-.4},motion=walk.createMotion('fly');
  motionRun(world,camera,motion,{forward:1},60,5);assert.ok(camera.z>0&&camera.eye>1.7);
  camera.eye=.3;motionRun(world,camera,motion,{vertical:-1},60,20);assert.equal(camera.eye,.3);
  camera.eye=79.9;motionRun(world,camera,motion,{vertical:1},60,20);assert.equal(camera.eye,80);
  const a={x:1,z:-1,eye:2,yaw:0,pitch:0},b={...a};
  motionRun(world,a,walk.createMotion('fly'),{forward:1},10,2);
  motionRun(world,b,walk.createMotion('fly'),{forward:1,side:1,vertical:1},10,2);
  assert.ok(Math.abs(Math.hypot(a.x-1,a.z+1,a.eye-2)-Math.hypot(b.x-1,b.z+1,b.eye-2))<1e-9);
  for(const [value,expected] of [[.01,.1],[1.46,1.5],[30,20],[NaN,1.4]])assert.equal(walk.movementSpeed(value),expected);
});

test('FOV is bounded and projection, GPU matrix and selection rays agree at every supported angle',()=>{
  for(const value of [undefined,null,NaN,Infinity,'80'])assert.equal(walk.fieldOfView({fov:value}),60);
  assert.equal(walk.fieldOfView({fov:20}),45);assert.equal(walk.fieldOfView({fov:160}),100);
  for(const fov of [45,60,75,100])for(const aspect of [.75,1.5,2.4])for(const yaw of [0,.7,Math.PI])for(const pitch of [-.5,0,.6]){
    const camera={x:2,z:3,eye:1.7,yaw,pitch,fov},direction=walk.ray(camera,.35,-.2,aspect);
    const point={x:camera.x+direction.x*5,y:camera.eye+direction.y*5,z:camera.z+direction.z*5};
    const p=walk.project(camera,point,800*aspect,800),m=walk.matrix(camera,aspect),v=[point.x,point.y,point.z,1];
    const clip=[0,1,2,3].map(row=>v.reduce((sum,n,col)=>sum+m[col*4+row]*n,0));
    assert.ok(Math.abs(p.x/(400*aspect)-1-.35)<1e-9);
    assert.ok(Math.abs(1-p.y/400+.2)<1e-9);
    assert.ok(Math.abs(clip[0]/clip[3]-.35)<1e-5);assert.ok(Math.abs(clip[1]/clip[3]+.2)<1e-5);
  }
  const camera={x:0,z:4,eye:1.7,yaw:Math.PI,pitch:0};
  assert.ok(walk.project({...camera,fov:45},{x:1,y:1.7,z:0},900,600).x>
    walk.project({...camera,fov:100},{x:1,y:1.7,z:0},900,600).x);
  const world=walk.createWorld([box({kind:'location',slotRef:{slotId:'synthetic-slot'},x:800,y:1400,width:400,height:600,depth:400})]);
  for(const fov of [45,60,75,100]){
    camera.fov=fov;const p=walk.project(camera,{x:1,y:1.7,z:.2},900,600);
    assert.equal(walk.raycast(world,{x:camera.x,y:camera.eye,z:camera.z},walk.ray(camera,p.x/450-1,1-p.y/300,1.5)).item.slotId,'synthetic-slot');
  }
});

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

function harness(value,available=true,native=false){
  const listeners={},windowListeners={},documentListeners={},nodes=new Map(),canvases=[],frames=new Map();let sequence=0;
  function node(){const classes=new Set();const n={innerHTML:'',textContent:'',dataset:{},style:{},hidden:false,disabled:false,isConnected:true,clientWidth:900,clientHeight:600,events:{},
    classList:{add:key=>classes.add(key),toggle(key,on){if(on)classes.add(key);else classes.delete(key);},contains:key=>classes.has(key)},attributes:{},setAttribute(key,value){this.attributes[key]=String(value);},getAttribute(key){return this.attributes[key]??null;},querySelectorAll(){return [];},appendChild(){},prepend(){},focus(){h.document.activeElement=this;},hasAttribute(){return false;},
    getBoundingClientRect(){return {left:0,top:0,width:900,height:600};},getContext(){return null;},
    addEventListener(type,callback){this.events[type]=callback;},setPointerCapture(){}};return n;}
  const root=node();root.querySelector=selector=>{if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector);};root.addEventListener=(type,cb)=>listeners[type]=cb;
  const h={visible:true,gpu:available,value:value,root,nodes,frames,rendered:0,worlds:0,preferences:{fov:60},fovSaves:[]};
  const context=vm.createContext({document:{hidden:false,createElement(type){const n=node();if(type==='canvas')canvases.push(n);return n;},addEventListener(t,cb){documentListeners[t]=cb;}},
    window:{OpenSlottingWarehouseScene:scene,OpenSlottingWarehouseWalkModel:{...walk,raycast(...args){return !args[3]&&h.aimHit!==undefined?h.aimHit:walk.raycast(...args);}},
      OpenSlottingWarehouseWalkRenderer:{create(_canvas,_walk,callbacks){h.gpuCallbacks=callbacks;return available?{available:()=>h.gpu,setWorld(world){h.worlds++;h.world=world;},selection(){},render(camera){h.rendered++;h.camera={...camera};}}:null;}},
      requestAnimationFrame(cb){const id=++sequence;frames.set(id,cb);return id;},cancelAnimationFrame(id){frames.delete(id);},addEventListener(t,cb){windowListeners[t]=cb;}}
  });
  h.document=context.document;
  if(native){
    root.requestFullscreen=async()=>{
      if(h.denyFullscreen)throw new Error('Synthetic fullscreen denial');
      if(h.delayFullscreen)await new Promise(resolve=>{h.grantFullscreen=resolve;});
      context.document.fullscreenElement=root;documentListeners.fullscreenchange();
    };
    context.document.exitFullscreen=async()=>{context.document.fullscreenElement=null;documentListeners.fullscreenchange();};
    context.document.exitPointerLock=()=>{context.document.pointerLockElement=null;documentListeners.pointerlockchange();};
  }
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','warehouse-walk.js'),'utf8'),context);
  const editor=context.OpenSlottingWarehouseWalk.create({root,model,getLayout:()=>h.value,getRegistry:()=>h.registry||[{article_id:'SKU',master_data:{location:'0001',article_name:'Synthetic'}}],
    getArticles:()=>h.articles||[{article_id:'SKU',order_line_count:12,total_quantity:24,active_days:3}],getComparison:()=>h.comparison||null,getCustomFields:()=>h.customFields||[],getWorkspaceId:()=>h.workspace||'one',getLanguage:()=>h.language||'en',
    getPreferences:()=>h.preferences,savePreferences:async proposed=>{
      const workspace=h.workspace;if(h.failFov)throw new Error('Synthetic save failure');
      if(h.fovGate)await h.fovGate;h.fovSaves.push({...proposed});if(h.workspace===workspace)h.preferences={...proposed};
    },formatQuantity:value=>String(value),openArticle:id=>{h.openedArticle=id;h.active(false);},isVisible:()=>h.visible});
  h.render=editor.render;h.active=editor.setActive;h.canvas=canvases[0];
  if(native)h.canvas.requestPointerLock=async()=>{
    if(h.denyLock)throw new Error('Synthetic pointer-lock denial');
    if(h.delayLock)await new Promise(resolve=>{h.grantLock=resolve;});
    context.document.pointerLockElement=h.canvas;documentListeners.pointerlockchange();
  };
  h.action=(action)=>listeners.click({target:{closest(selector){return selector==='[data-walk-action]'?{dataset:{walkAction:action}}:selector==='.wh-walk-interaction'&&action.startsWith('interaction-')?nodes.get('.wh-walk-interaction'):null;}}});
  h.tab=tab=>listeners.click({target:{closest(selector){return selector==='[data-walk-inspect-tab]'?{dataset:{walkInspectTab:tab}}:selector==='.wh-walk-interaction'?nodes.get('.wh-walk-interaction'):null;}}});
  h.aim=(slotId,distance=2)=>{h.aimHit=slotId?{item:h.world.positions.get(slotId),distance}:null;};
  h.search=code=>listeners.input({target:{value:code,hasAttribute:key=>key==='data-walk-search'}});
  h.fov=(value,type='input')=>listeners[type]({target:{value:String(value),hasAttribute:key=>key==='data-walk-fov'}});
  h.change=(name,value)=>listeners.change({target:{value:String(value),hasAttribute:key=>key==='data-walk-'+name}});
  h.input=(name,value)=>listeners.input({target:{value:String(value),hasAttribute:key=>key==='data-walk-'+name}});
  h.release=code=>windowListeners.keyup({code});
  h.tick=time=>{const pending=[...frames.values()];frames.clear();pending.forEach(cb=>cb(time));};
  h.key=(code,target=canvases[0])=>listeners.keydown({code,key:code,target,preventDefault(){}});
  h.event=event=>listeners.keydown({target:canvases[0],preventDefault(){},...event});
  h.blur=()=>windowListeners.blur();h.render();return h;
}

test('native fullscreen requests mouse look, pauses on Esc, resumes and exits without editing the layout',async()=>{
  const value=layout(),before=structuredClone(value),h=harness(value,true,true);
  await h.action('fullscreen');assert.equal(h.document.fullscreenElement,h.root);assert.equal(h.document.pointerLockElement,h.canvas);
  assert.equal(h.root.classList.contains('is-walk-paused'),false);h.tick(100);
  h.key('KeyW');h.tick(116);assert.equal(h.frames.size,1);
  h.key('Escape');assert.equal(h.document.pointerLockElement,null);assert.equal(h.root.classList.contains('is-walk-paused'),true);
  h.tick(132);h.key('KeyW');assert.equal(h.frames.size,0,'paused fullscreen does not move');
  await h.action('resume');assert.equal(h.document.pointerLockElement,h.canvas);
  await h.action('exit-fullscreen');assert.equal(h.document.fullscreenElement,null);assert.equal(h.document.pointerLockElement,null);
  assert.deepEqual(value,before);
});

test('fullscreen and pointer-lock denials preserve usable navigation with an explicit drag fallback',async()=>{
  const denied=harness(layout(),true,true);denied.denyFullscreen=true;await denied.action('fullscreen');
  assert.notEqual(denied.document.fullscreenElement,denied.root);assert.match(denied.nodes.get('[data-walk-message]').textContent,/Fullscreen is unavailable/);
  const h=harness(layout(),true,true);h.denyLock=true;await h.action('fullscreen');
  assert.equal(h.document.fullscreenElement,h.root);assert.equal(h.root.classList.contains('is-walk-paused'),true);
  assert.match(h.nodes.get('[data-walk-immersive-message]').textContent,/Mouse look is unavailable/);
  assert.match(h.nodes.get('[data-walk-action="resume"]').textContent,/without mouse look/);
  await h.action('resume');assert.equal(h.root.classList.contains('is-walk-paused'),false);h.tick(100);h.key('KeyW');h.tick(116);assert.equal(h.frames.size,1);
  await h.action('resume');assert.equal(h.root.classList.contains('is-walk-paused'),true);
});

test('page leave cancels pending fullscreen and workspace changes release late pointer grants',async()=>{
  const h=harness(layout(),true,true);h.delayFullscreen=true;
  const pending=h.action('fullscreen');h.active(false);h.grantFullscreen();await pending;
  assert.equal(h.document.fullscreenElement,null);assert.notEqual(h.document.pointerLockElement,h.canvas);
  const other=harness(layout(),true,true);other.delayLock=true;
  const locking=other.action('fullscreen');await new Promise(resolve=>setImmediate(resolve));assert.equal(typeof other.grantLock,'function');
  other.workspace='two';other.render();other.grantLock();await locking;
  assert.equal(other.document.fullscreenElement,null);assert.equal(other.document.pointerLockElement,null);
});

test('walk cleanup releases only its own fullscreen and pointer lock',()=>{
  const h=harness(layout(),true,true),external={};h.document.fullscreenElement=external;h.document.pointerLockElement=external;
  h.active(false);assert.equal(h.document.fullscreenElement,external);assert.equal(h.document.pointerLockElement,external);
});

test('E opens mouse-controlled fullscreen details, pauses movement and returns without rebuilding or changing the pose',async()=>{
  const value=layout(),before=structuredClone(value),h=harness(value,true,true);await h.action('fullscreen');h.tick(100);
  h.aim(value.locations[0].id);h.key('KeyW');h.tick(116);const pose={...h.camera},worlds=h.worlds;
  const dialog=h.nodes.get('.wh-walk-interaction'),background={inert:false},alreadyInert={inert:true};h.root.children=[background,alreadyInert,dialog];
  h.key('KeyE');h.tick(132);
  assert.equal(h.document.fullscreenElement,h.root);assert.equal(h.document.pointerLockElement,null);
  assert.equal(dialog.hidden,false);assert.equal(background.inert,true);assert.equal(h.root.classList.contains('is-walk-paused'),true);
  assert.match(dialog.innerHTML,/SKU/);assert.match(dialog.innerHTML,/Metrics/);assert.match(dialog.innerHTML,/Back to walk/);
  assert.equal(h.document.activeElement,h.nodes.get('[data-walk-action="interaction-return"]'));
  h.key('KeyW');h.key('Space');h.key('KeyC');h.tick(148);assert.deepEqual(h.camera,pose);
  await h.action('interaction-return');h.tick(164);
  assert.equal(dialog.hidden,true);assert.equal(background.inert,false);assert.equal(alreadyInert.inert,true);
  assert.equal(h.document.pointerLockElement,h.canvas);assert.equal(h.root.classList.contains('is-walk-paused'),false);
  assert.deepEqual(h.camera,pose);assert.equal(h.worlds,worlds);assert.deepEqual(value,before);
});

test('E requires a reachable aim instead of stale selection and ignores text inputs and repeats',async()=>{
  const value=layout(),h=harness(value,true,true);h.search('0001');await h.action('find');await h.action('fullscreen');
  h.aim(null);h.key('KeyE');assert.equal(h.nodes.get('.wh-walk-interaction').hidden,true);
  assert.match(h.nodes.get('[data-walk-message]').textContent,/6 m/);
  h.aim(value.locations[0].id,7);h.key('KeyE');assert.equal(h.nodes.get('.wh-walk-interaction').hidden,true);
  h.aim(value.locations[0].id);h.key('KeyE',{hasAttribute:()=>false});assert.equal(h.nodes.get('.wh-walk-interaction').hidden,true);
  h.event({code:'KeyE',key:'e',repeat:true});assert.equal(h.nodes.get('.wh-walk-interaction').hidden,true);
  h.key('KeyE');assert.equal(h.nodes.get('.wh-walk-interaction').hidden,false);
});

test('interaction prompt appears only for a reachable location, names its code and clears stale text immediately on pause',async()=>{
  const value=layout(),h=harness(value,true,true);h.aim(null);await h.action('fullscreen');h.tick(100);
  const prompt=h.nodes.get('[data-walk-interact-hint]');assert.equal(prompt.hidden,true);assert.equal(prompt.textContent,'');
  h.aim(value.locations[0].id);h.key('KeyW');h.tick(116);
  assert.equal(prompt.hidden,false);assert.equal(prompt.textContent,'E · Interact: 0001');
  h.aim(value.locations[0].id,7);h.tick(132);assert.equal(prompt.hidden,true);assert.equal(prompt.textContent,'');
  h.aim(value.locations[0].id);h.tick(148);assert.equal(prompt.hidden,false);
  h.aim(null);h.tick(164);assert.equal(prompt.hidden,true);assert.equal(prompt.textContent,'');
  h.aim(value.locations[0].id);h.tick(180);h.key('Escape');assert.equal(prompt.hidden,true);assert.equal(prompt.textContent,'');
});

test('uncoded interaction prompts identify the rack, bay, level and position including ground scopes',async()=>{
  const value=layout();value.locations[0].code='';value.objects[0].name='Synthetic rack';
  const h=harness(value,true,true);h.language='de';h.render();h.aim(value.locations[0].id);await h.action('fullscreen');h.tick(100);
  const prompt=h.nodes.get('[data-walk-interact-hint]');
  assert.match(prompt.textContent,/E · Interagieren: Synthetic rack · Fach 1 · Ebene 1 · Stellplatz 1/);
  const ground=model.listLocations(value).find(s=>s.ground);h.aim(ground.slotId);h.key('KeyW');h.tick(116);
  assert.match(prompt.textContent,/Synthetic rack · Fach 1 · Boden \(Ebene 0\) · Stellplatz 1/);
  assert.equal(prompt.hidden,false);
});

test('article choice and detail tabs stay inside fullscreen and never rescan or edit the warehouse',async()=>{
  const value=layout(),h=harness(value,true,true);
  h.registry=[{article_id:'001',master_data:{location:'0001',article_name:'Synthetic one',unit_of_measure:'pcs'}},
    {article_id:'002',master_data:{location:'0001',article_name:'Synthetic two',unit_of_measure:'kg'}}];
  h.articles=[{article_id:'001',total_quantity:5n,order_line_count:2},{article_id:'002',total_quantity:8n,order_line_count:3}];
  h.comparison={settings:{periodA:{name:'Synthetic A'},periodB:{name:'Synthetic B'}},articles:[{article_id:'002',period_a:{order_line_count:0,total_quantity:0n,active_days:0},period_b:{order_line_count:3,total_quantity:8n,active_days:1}}]};
  h.render();await h.action('fullscreen');h.aim(value.locations[0].id);h.key('KeyE');const worlds=h.worlds;
  await h.change('interaction-article','002');h.tab('master');assert.match(h.nodes.get('.wh-walk-interaction').innerHTML,/<strong>kg<\/strong>/);
  h.tab('periods');assert.match(h.nodes.get('.wh-walk-interaction').innerHTML,/Synthetic A/);assert.match(h.nodes.get('.wh-walk-interaction').innerHTML,/<strong>0<\/strong>/);
  assert.equal(h.document.fullscreenElement,h.root);assert.equal(h.document.pointerLockElement,null);assert.equal(h.worlds,worlds);
});

test('details trap keyboard focus, Escape closes while paused and fullscreen search also opens the dialog',async()=>{
  const value=layout(),h=harness(value,true,true);await h.action('fullscreen');h.aim(value.locations[0].id);h.key('KeyE');
  const dialog=h.nodes.get('.wh-walk-interaction'),first=h.nodes.get('[data-walk-action="interaction-return"]'),last=h.root.querySelector('[data-walk-action="interaction-close"]');
  dialog.querySelectorAll=()=>[first,last];let prevented=0;first.focus();
  h.event({key:'Tab',shiftKey:true,preventDefault(){prevented++;}});assert.equal(h.document.activeElement,last);
  h.event({key:'Tab',preventDefault(){prevented++;}});assert.equal(h.document.activeElement,first);assert.equal(prevented,2);
  h.key('Escape');assert.equal(dialog.hidden,true);assert.equal(h.document.pointerLockElement,null);assert.equal(h.document.fullscreenElement,h.root);
  assert.equal(h.document.activeElement,h.nodes.get('[data-walk-action="resume"]'));
  h.search('0001');await h.action('find');assert.equal(dialog.hidden,false);
});

test('empty locations, missing articles, deleted locations and workspace changes clear interaction safely',async()=>{
  const value=layout(),h=harness(value,true,true);await h.action('fullscreen');h.aim(value.locations[1].id);h.key('KeyE');
  assert.match(h.nodes.get('.wh-walk-interaction').innerHTML,/No current article assignment/);
  h.workspace='two';h.render();assert.equal(h.nodes.get('.wh-walk-interaction').hidden,true);assert.equal(h.document.fullscreenElement,null);
  await h.action('fullscreen');h.aim(value.locations[0].id);h.key('KeyE');h.value=model.createLayout();h.render();
  assert.equal(h.nodes.get('.wh-walk-interaction').hidden,true);assert.equal(h.root.classList.contains('is-interacting'),false);
});

test('return from details handles denied mouse lock and cancels late grants after navigation',async()=>{
  const value=layout(),h=harness(value,true,true);await h.action('fullscreen');h.aim(value.locations[0].id);h.key('KeyE');
  h.denyLock=true;await h.action('interaction-return');assert.equal(h.nodes.get('.wh-walk-interaction').hidden,true);
  assert.equal(h.root.classList.contains('is-walk-paused'),true);assert.match(h.nodes.get('[data-walk-immersive-message]').textContent,/Mouse look is unavailable/);
  await h.action('resume');assert.equal(h.root.classList.contains('is-walk-paused'),false);
  const late=harness(value,true,true);await late.action('fullscreen');late.aim(value.locations[0].id);late.key('KeyE');
  late.delayLock=true;const pending=late.action('interaction-return');
  await new Promise(resolve=>setImmediate(resolve));late.active(false);late.grantLock();await pending;
  assert.equal(late.document.pointerLockElement,null);assert.equal(late.document.fullscreenElement,null);
});

test('controller jump lands after key release, ignores held-space repeats and crouches with key or button',async()=>{
  const value=layout(),before=structuredClone(value),h=harness(value);h.tick(100);const worlds=h.worlds;
  h.key('Space');h.tick(116);assert.ok(h.camera.eye>1.7);
  for(let i=2;i<80;i++){h.key('Space');h.tick(100+i*16);}assert.equal(h.camera.eye,1.7,'holding jump never jumps again');
  h.release('Space');h.tick(1400);assert.equal(h.frames.size,0);
  h.key('KeyC');h.tick(1416);assert.equal(h.camera.eye,1.02);h.release('KeyC');h.tick(1432);assert.equal(h.camera.eye,1.7);
  await h.action('crouch');h.tick(1448);assert.equal(h.camera.eye,1.02);
  await h.action('crouch');h.tick(1464);assert.equal(h.camera.eye,1.7);
  await h.action('jump');h.tick(1480);assert.ok(h.camera.eye>1.7);
  h.blur();assert.equal(h.frames.size,0);const paused=h.camera.eye;h.tick(1500);assert.equal(h.camera.eye,paused);
  assert.equal(h.worlds,worlds);assert.deepEqual(value,before);
});

test('controller retains separate detailed speeds per mode and safely returns flight to a free floor position',async()=>{
  const value=layout(),before=structuredClone(value),h=harness(value);h.tick(100);
  await h.change('speed',3.7);assert.equal(h.nodes.get('[data-walk-speed-range]').value,'3.7');
  assert.match(h.nodes.get('[data-walk-speed-value]').textContent,/13.3 km\/h/);
  await h.change('mode','fly');assert.equal(h.nodes.get('[data-walk-speed]').value,'5');
  assert.equal(h.nodes.get('[data-walk-action="jump"]').disabled,true);assert.equal(h.nodes.get('[data-walk-eye]').disabled,true);
  await h.change('speed',8.3);h.key('Space');h.tick(116);h.release('Space');h.tick(132);assert.ok(h.camera.eye>1.7);
  assert.match(h.nodes.get('[data-walk-hud-position]').textContent,/Free flight/);
  const altitude=h.camera.eye;h.render();h.tick(148);assert.equal(h.camera.eye,altitude);
  await h.change('mode','walk');h.tick(164);assert.equal(h.camera.eye,1.7);
  assert.equal(h.nodes.get('[data-walk-speed]').value,'3.7');
  await h.change('mode','fly');assert.equal(h.nodes.get('[data-walk-speed]').value,'8.3');
  h.workspace='two';h.render();h.tick(180);assert.equal(h.nodes.get('[data-walk-mode]').value,'walk');
  assert.equal(h.nodes.get('[data-walk-speed]').value,'1.4');assert.equal(h.camera.eye,1.7);assert.deepEqual(value,before);
});

test('speed numeric input updates the range and km/h without replacing an in-progress decimal',async()=>{
  const h=harness(layout()),number=h.nodes.get('[data-walk-speed]');number.value='3.7';h.input('speed','3.7');
  assert.equal(number.value,'3.7');assert.equal(h.nodes.get('[data-walk-speed-range]').value,'3.7');
  assert.match(h.nodes.get('[data-walk-speed-value]').textContent,/13.3 km\/h/);
  number.value='';h.input('speed','');assert.equal(number.value,'');assert.equal(h.nodes.get('[data-walk-speed-range]').value,'3.7');
  await h.change('speed','');assert.equal(number.value,'3.7');
  await h.change('speed',25);assert.equal(number.value,'20');await h.change('speed',0);assert.equal(number.value,'0.1');
});

test('movement keys stay scoped to the view and paused fullscreen blocks jump, crouch and flight ascent',async()=>{
  const h=harness(layout(),true,true);h.tick(100);
  for(const key of ['Space','KeyC','KeyW'])h.key(key,{hasAttribute:()=>false});assert.equal(h.frames.size,0);
  await h.change('mode','fly');await h.action('fullscreen');h.tick(116);h.key('Space');h.tick(132);assert.ok(h.camera.eye>1.7);
  h.key('Escape');h.tick(148);const paused={...h.camera};
  for(const key of ['Space','KeyC','KeyW'])h.key(key);h.tick(164);assert.deepEqual(h.camera,paused);
  await h.action('exit-fullscreen');await h.change('mode','walk');await h.action('fullscreen');h.key('Escape');h.tick(180);
  assert.equal(h.nodes.get('[data-walk-action="jump"]').disabled,true);
  await h.action('jump');await h.action('crouch');h.tick(196);assert.equal(h.camera.eye,1.7);
});

test('flight-to-walk transition rejects a layout without a free floor location',async()=>{
  const h=harness(layout());await h.change('mode','fly');
  const huge=model.createArea('wall',{width:500000,depth:500000,height:3000,x:-250000,z:-250000});
  h.value=model.normalizeLayout({...model.createLayout(),objects:[huge]});h.render();
  await h.change('mode','walk');assert.equal(h.nodes.get('[data-walk-mode]').value,'fly');
  assert.match(h.nodes.get('[data-walk-message]').textContent,/No free standing position/);
});

test('FOV previews change only camera frames, save on change, reset and remain available in fullscreen',async()=>{
  const value=layout(),before=structuredClone(value),h=harness(value,true,true);h.tick(100);
  const worlds=h.worlds;h.fov(85);h.tick(116);
  assert.equal(h.camera.fov,85);assert.equal(h.worlds,worlds);assert.equal(h.fovSaves.length,0);
  assert.equal(h.nodes.get('[data-walk-fov-value]').textContent,'85°');
  await h.fov(85,'change');assert.equal(h.preferences.fov,85);h.render();h.tick(132);assert.equal(h.camera.fov,85);
  await h.action('fullscreen');h.key('Escape');
  assert.match(h.root.innerHTML,/data-walk-fov/);
  await h.action('fov-reset');assert.equal(h.preferences.fov,60);h.tick(148);assert.equal(h.camera.fov,60);
  assert.deepEqual(value,before);
});

test('FOV save failure restores the stored angle and a late save never changes another workspace view',async()=>{
  const h=harness(layout());h.preferences={fov:70};h.render();h.failFov=true;
  await h.fov(90,'change');h.tick(100);assert.equal(h.camera.fov,70);
  assert.match(h.nodes.get('[data-walk-message]').textContent,/could not be saved/);
  h.failFov=false;let release;h.fovGate=new Promise(resolve=>{release=resolve;});
  const pending=h.fov(95,'change');assert.equal(h.nodes.get('[data-walk-fov]').disabled,true);
  h.workspace='two';h.preferences={fov:50};h.render();release();await pending;h.tick(116);
  assert.equal(h.camera.fov,50);assert.equal(h.nodes.get('[data-walk-fov]').disabled,false);
});

test('FOV saves restore keyboard focus after redraw without stealing it from another control',async()=>{
  const h=harness(layout()),input=h.nodes.get('[data-walk-fov]');let restored=0;
  h.document.body={};h.document.activeElement=input;input.focus=()=>{restored++;h.document.activeElement=input;};
  let release;h.fovGate=new Promise(resolve=>{release=resolve;});
  const pending=h.fov(80,'change');h.document.activeElement=h.document.body;release();await pending;
  assert.equal(restored,1);assert.equal(h.document.activeElement,input);
  const other={};h.fovGate=new Promise(resolve=>{release=resolve;});
  const next=h.fov(85,'change');h.document.activeElement=other;release();await next;
  assert.equal(restored,1);assert.equal(h.document.activeElement,other);
});

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
