'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const model=require('../warehouse.js'),direct=require('../warehouse-walk-editor.js');
function fixture(){
  const rack=model.createRack('pallet-rack',{bayCount:2,levelCount:2});rack.rotation=37;rack.x=10000;rack.z=7000;
  let value=model.normalizeLayout({...model.createLayout(),objects:[rack]});
  for(const zone of value.zones){value=model.setZoneUsage(value,zone.id,'picking');value=model.resizeZoneLocations(value,zone.id,3);}
  value.locations.forEach((slot,i)=>slot.code='SYN-'+String(i+1));return value;
}
function field(value,kind){return direct.directFields(model,value,value.objects[0].id).find(item=>item.kind===kind);}
test('direct fields identify rotated bays, level clearances and ground/upper locations without modifying data',()=>{
  const value=fixture(),before=structuredClone(value),fields=direct.directFields(model,value,value.objects[0].id);
  assert.equal(new Set(fields.map(item=>item.key)).size,fields.length);
  assert.equal(fields.filter(item=>item.kind==='bay-width').length,2);
  assert.equal(fields.filter(item=>item.kind==='level-height').length,4);
  assert.equal(fields.filter(item=>item.kind==='location-width').length,value.locations.length);
  assert.ok(fields.every(item=>Object.values(item.point).every(Number.isFinite)));
  const bay=field(value,'bay-width'),rack=value.objects[0],point=model.localPoint(rack,rack.uprights[0].width+rack.bays[0].width/2,rack.bays[0].depth+180);
  assert.equal(bay.point.x,point.x/1000);assert.equal(bay.point.z,point.z/1000);
  assert.ok(fields.some(item=>item.kind==='location-width'&&item.point.y===.18));assert.deepEqual(value,before);
});
test('direct dimensions use shared geometry validation and preserve all location identities, codes and source data',()=>{
  const value=fixture(),before=structuredClone(value);
  for(const [kind,delta] of [['bay-width',100],['rack-depth',100],['level-height',-50],['location-width',-50]]){
    const f=field(value,kind),next=direct.proposeDirect(model,value,f,f.value+delta);
    assert.deepEqual(next.locations.map(s=>[s.id,s.zoneId,s.code]),value.locations.map(s=>[s.id,s.zoneId,s.code]));
    assert.equal(direct.directFields(model,next,value.objects[0].id).find(item=>item.key===f.key).value,f.value+delta);
    assert.deepEqual(value,before);
    if(kind==='rack-depth')assert.ok(next.locations.every(s=>s.placement.depth===1200));
  }
  const width=field(value,'location-width'),smaller=direct.proposeDirect(model,value,width,width.value-100),position=field(smaller,'location-x');
  const moved=direct.proposeDirect(model,smaller,position,position.value+50);assert.equal(moved.locations.find(s=>s.id===position.slotId).placement.x,50);
});
test('direct edits reject overlap, out-of-bounds locations, insufficient frame clearance, locks and forged descriptors',()=>{
  const value=fixture(),width=field(value,'location-width'),position=field(value,'location-x'),height=field(value,'level-height');
  assert.throws(()=>direct.proposeDirect(model,value,width,width.value+1),/overlap/);
  assert.throws(()=>direct.proposeDirect(model,value,position,1),/overlap/);
  assert.throws(()=>direct.proposeDirect(model,value,height,8000),/upright/);
  assert.throws(()=>direct.proposeDirect(model,value,{...width,min:0,max:99999},0),/range/);
  assert.throws(()=>direct.proposeDirect(model,value,{...width,key:'bad'},200),/Unlock/);
  for(const input of [NaN,Infinity,500.5,-1])assert.throws(()=>direct.proposeDirect(model,value,width,input));
  const locked=structuredClone(value);locked.objects[0].locked=true;
  assert.ok(direct.directFields(model,locked,locked.objects[0].id).filter(f=>f.kind!=='object-lock').every(f=>f.locked));
  assert.throws(()=>direct.proposeDirect(model,locked,width,width.value-50),/Unlock/);
});
test('simple objects expose validated dimensions and drawn routes expose only independent coordinates',()=>{
  const wall=model.createRecipe('wall'),value=model.normalizeLayout({...model.createLayout(),objects:[wall]}),fields=direct.directFields(model,value,wall.id);
  assert.ok(['object-name','object-x','object-z','object-rotation','object-lock','object-width','object-height','object-depth'].every(kind=>fields.some(f=>f.kind===kind)));
  const next=direct.proposeDirect(model,value,fields.find(f=>f.kind==='object-width'),wall.width+100);assert.equal(next.objects[0].width,wall.width+100);
  assert.deepEqual(direct.directFields(model,value,'unknown'),[]);
  const route=model.createRoute([{x:0,z:0},{x:4000,z:0}],2000,'Synthetic route');
  const routeFields=direct.directFields(model,model.normalizeLayout({...model.createLayout(),objects:[route]}),route.id);assert.ok(routeFields.some(f=>f.kind==='route-point-x'));assert.ok(!routeFields.some(f=>f.kind==='object-width'));
});

function get(value,kind,predicate=()=>true){const f=direct.directFields(model,value,value.objects[0].id).find(f=>f.kind===kind&&predicate(f));assert.ok(f,kind);return f;}
function edit(value,kind,valueAfter,predicate){return direct.proposeDirect(model,value,get(value,kind,predicate),valueAfter);}
test('complete rack catalog exposes remaining pose, frame, deck, count and text properties with shared constraints',()=>{
  const value=fixture(),before=structuredClone(value);
  const kinds=['object-name','object-x','object-z','object-rotation','object-lock','rack-bays','bay-levels','level-thickness','level-deck','level-deckThickness','upright-width','upright-height','ground-enabled','zone-usage','zone-count','location-code','zone-prefix','rack-prefix'];
  const fields=direct.directFields(model,value,value.objects[0].id);assert.ok(kinds.every(kind=>fields.some(f=>f.kind===kind)));assert.equal(new Set(fields.map(f=>f.key)).size,fields.length);
  for(const kind of ['object-x','object-z','object-rotation','level-thickness','level-deckThickness','upright-width','upright-height']){
    const f=get(value,kind),next=direct.proposeDirect(model,value,f,f.value+10);assert.equal(get(next,kind).value,f.value+10);assert.deepEqual(next.locations.map(s=>[s.id,s.code]),value.locations.map(s=>[s.id,s.code]));
  }
  const withoutDeck=edit(value,'level-deck',false);assert.equal(withoutDeck.objects[0].bays[0].levels[0].deck,false);assert.deepEqual(value,before);
  assert.throws(()=>edit(value,'upright-height',200),/upright/);assert.throws(()=>edit(value,'rack-bays',31),/range/);
});
test('structural count previews preserve retained IDs/codes and only explicitly remove scopes',()=>{
  const value=fixture(),old=value.objects[0],larger=edit(value,'rack-bays',3),smaller=edit(value,'rack-bays',1);
  assert.equal(larger.objects[0].bays.length,3);assert.deepEqual(larger.objects[0].bays.slice(0,2),old.bays);assert.deepEqual(larger.locations,value.locations);
  assert.ok(larger.zones.some(z=>!value.zones.some(old=>old.id===z.id)&&z.usage==='unassigned'));
  assert.equal(smaller.objects[0].bays.length,1);assert.ok(smaller.locations.length<value.locations.length);
  for(const slot of smaller.locations)assert.equal(value.locations.find(s=>s.id===slot.id).code,slot.code);
  const one=edit(value,'bay-levels',1);assert.equal(one.objects[0].bays[0].levels.length,1);assert.equal(one.objects[0].bays[1].levels.length,2);
  const disabled=edit(value,'ground-enabled',false);assert.equal(disabled.objects[0].bays[0].ground.enabled,false);assert.equal(disabled.locations.length,value.locations.length-3);
  const enabled=edit(disabled,'ground-enabled',true);const ground=enabled.objects[0].bays[0].ground.id;assert.equal(enabled.zones.find(z=>z.levelId===ground).usage,'unassigned');
});
test('zone controls distinguish one scope, a bay and the entire rack, then allow explicit location counts',()=>{
  const value=fixture(),one=edit(value,'zone-usage','reserve');assert.equal(one.zones.filter(z=>z.usage==='reserve').length,1);
  const bay=edit(value,'zone-bay-usage','reserve');assert.equal(bay.zones.filter(z=>z.usage==='reserve').length,3);
  const rack=edit(value,'zone-rack-usage','reserve');assert.ok(rack.zones.every(z=>z.usage==='reserve'));
  const count=get(value,'zone-count'),reduced=direct.proposeDirect(model,value,count,2);assert.equal(model.zoneLocations(reduced,count.zoneId).length,2);
  assert.deepEqual(model.zoneLocations(reduced,count.zoneId).map(s=>[s.id,s.code]),model.zoneLocations(value,count.zoneId).slice(0,2).map(s=>[s.id,s.code]));
  const unassigned=edit(value,'zone-usage','unassigned');assert.equal(get(unassigned,'zone-count').locked,true);
  assert.throws(()=>edit(value,'zone-usage','invalid-option'),/available option/);
});
test('location add/duplicate/remove preview operations respect space, capacity and existing codes',()=>{
  const value=fixture(),f=get(value,'location-width'),small=direct.proposeDirect(model,value,f,100),zoneId=value.locations.find(s=>s.id===f.slotId).zoneId;
  const added=edit(small,'location-add',true,f=>f.zoneId===zoneId);assert.equal(added.locations.length,value.locations.length+1);assert.ok(added.locations.find(s=>!value.locations.some(old=>old.id===s.id)).code==='');
  const duplicate=edit(small,'location-duplicate',true,f=>f.slotId===get(value,'location-width').slotId);assert.equal(duplicate.locations.length,value.locations.length+1);
  const removed=edit(value,'location-remove',true);assert.equal(removed.locations.length,value.locations.length-1);
  for(const slot of removed.locations)assert.equal(value.locations.find(s=>s.id===slot.id).code,slot.code);
  const full=model.resizeZoneLocations(value,zoneId,10);assert.equal(get(full,'location-add',f=>f.zoneId===zoneId).locked,true);
});
test('text values and code generation preserve uniqueness and unchanged IDs',()=>{
  const value=fixture(),renamed=edit(value,'object-name','Synthetic new name');assert.equal(renamed.objects[0].name,'Synthetic new name');
  const f=get(value,'location-code'),coded=direct.proposeDirect(model,value,f,'SYN-NEW');assert.equal(coded.locations.find(s=>s.id===f.slotId).code,'SYN-NEW');
  assert.throws(()=>direct.proposeDirect(model,value,f,value.locations.find(s=>s.id!==f.slotId).code),/unique/);assert.throws(()=>edit(value,'object-name',''),/Name/);
  const blanks=structuredClone(value);blanks.locations.forEach(s=>s.code='');const generated=edit(blanks,'rack-prefix','SYN');assert.ok(generated.locations.every(s=>s.code.startsWith('SYN-')));assert.deepEqual(generated.locations.map(s=>s.id),value.locations.map(s=>s.id));
  assert.equal(direct.formatDirect(get(value,'object-rotation'),37,'de'),'37 °');assert.equal(direct.formatDirect(get(value,'ground-enabled'),false,'de'),'Aus');assert.equal(direct.formatDirect(get(value,'zone-usage'),'picking','de'),'Kommissionierung');
});
test('lock changes use the dedicated toggle contract and preserve all geometry',()=>{
  const value=fixture(),locked=edit(value,'object-lock',true);assert.equal(locked.objects[0].locked,true);assert.equal(model.lockedEditConflict(value,locked,value.objects[0].id),null);assert.equal(model.lockedEditConflict(value,locked),value.objects[0].id);
  assert.equal(get(locked,'object-lock').locked,false);assert.equal(get(locked,'bay-width').locked,true);const unlocked=edit(locked,'object-lock',false);assert.deepEqual(unlocked,value);
});
test('door, junction, route requirement and waypoint values use the same catalog and validation',()=>{
  const make=o=>model.normalizeLayout({...model.createLayout(),objects:[o]});
  const door=make(model.createRecipe('door'));assert.equal(edit(door,'object-open',true).objects[0].open,true);assert.equal(edit(door,'object-elevation',100).objects[0].elevation,100);
  const junction=make(model.createRecipe('wall-tee')),arm=get(junction,'junction-arm');assert.equal(get(direct.proposeDirect(model,junction,arm,arm.value+100),'junction-arm').value,arm.value+100);assert.ok(!direct.directFields(model,junction,junction.objects[0].id).some(f=>f.kind==='object-width'));
  const route=make(model.createRoute([{x:0,z:0},{x:4000,z:0}],2000,'Synthetic route'));assert.equal(edit(route,'route-requiredHeight',3000).objects[0].route.requiredHeight,3000);assert.equal(edit(route,'route-requiredHeight',null).objects[0].route.requiredHeight,null);
  assert.equal(edit(route,'route-point-x',100).objects[0].route.path[0].x,100);assert.equal(direct.formatDirect(get(route,'route-requiredHeight'),null,'en'),'—');
});
test('position and rotation changes move grouped objects together while retaining scope identities',()=>{
  const value=fixture();value.objects.push(model.createRecipe('wall',{x:30000,z:5000}));const grouped=model.groupObjects(model.normalizeLayout(value),value.objects.map(o=>o.id),'Synthetic group');
  const moved=edit(grouped,'object-x',grouped.objects[0].x+500);assert.equal(moved.objects[1].x,grouped.objects[1].x+500);assert.equal(moved.objects[1].z,grouped.objects[1].z);
  const renamed=edit(grouped,'group-name','Renamed assembly');assert.equal(renamed.groups[0].name,'Renamed assembly');assert.deepEqual(renamed.locations,grouped.locations);
  const entry= require('../warehouse-walk-model.js').createWorld(require('../warehouse-scene.js').buildBoxes(model,grouped)).entries[0],walk=require('../warehouse-walk-model.js'),point={x:12.4,y:1.7,z:8.2},local=walk.local(entry,point),world=walk.world(entry,local.x,local.y,local.z);assert.ok(Math.abs(world.x-point.x)<1e-8&&Math.abs(world.z-point.z)<1e-8);
});

test('structure navigation exposes no values before bay or level selection and scopes fields by stable IDs',()=>{
  const value=fixture(),rack=value.objects[0],menu=(selection)=>direct.structureMenu(model,value,rack.id,selection);
  const start=menu();assert.equal(start.selection.view,'bays');assert.ok(start.controls.every(c=>c.action==='structure'));assert.equal(start.controls.length,rack.bays.length+1);
  const bay=menu(start.controls.find(c=>c.next.bayId===rack.bays[1].id).next);assert.equal(bay.selection.view,'bay');assert.ok(bay.controls.some(f=>f.kind==='bay-width'));assert.ok(!bay.controls.some(f=>f.levelId||f.kind==='object-name'));
  const allowed=new Set([rack.uprights[1].id,rack.uprights[2].id]);assert.ok(bay.controls.filter(f=>f.uprightId).every(f=>allowed.has(f.uprightId)));
  const levels=menu(bay.controls.find(c=>c.action==='structure').next);assert.equal(levels.selection.view,'levels');assert.ok(levels.controls.every(c=>c.action==='structure'));
  const selected=menu(levels.controls.find(c=>c.next.levelId===rack.bays[1].levels[1].id).next);assert.ok(selected.controls.length>=4);assert.ok(selected.controls.every(f=>f.bayId===rack.bays[1].id&&f.levelId===rack.bays[1].levels[1].id));
  const global=menu(start.controls.find(c=>c.next.view==='rack').next);assert.ok(global.controls.some(f=>f.kind==='object-x'));assert.ok(global.controls.every(f=>!f.bayId&&!f.uprightId));
});

test('structure scope selection recovers after removed scopes and supports ground and nonrack objects',()=>{
  const value=fixture(),rack=value.objects[0];assert.equal(direct.structureMenu(model,value,rack.id,{view:'level',bayId:'missing',levelId:'missing'}).selection.view,'bays');
  const ground=direct.structureMenu(model,value,rack.id,{view:'level',bayId:rack.bays[0].id,levelId:rack.bays[0].ground.id});assert.deepEqual(ground.controls.map(f=>f.kind),['ground-enabled']);
  const disabled=edit(value,'ground-enabled',false);assert.equal(direct.structureMenu(model,disabled,rack.id,ground.selection).selection.view,'levels');
  const wall=model.createRecipe('wall'),walls=model.normalizeLayout({...model.createLayout(),objects:[wall]}),menu=direct.structureMenu(model,walls,wall.id);assert.equal(menu.selection,null);assert.ok(menu.controls.some(f=>f.kind==='object-width'));
});

test('technical measurements use physical dimensions and rotate with the rack without changing saved geometry',()=>{
  const value=fixture(),before=structuredClone(value),fields=direct.directFields(model,value,value.objects[0].id),length=m=>Math.hypot(m.to.x-m.from.x,m.to.y-m.from.y,m.to.z-m.from.z)*1000;
  for(const kind of ['bay-width','rack-depth','level-height','level-thickness','level-deckThickness','upright-width','upright-height']){
    const f=fields.find(f=>f.kind===kind);assert.ok(f.measure,kind);assert.ok(Math.abs(length(f.measure)-f.value)<1e-7,kind);assert.ok(Object.values(f.measure).filter(v=>v&&typeof v==='object').every(p=>Object.values(p).every(Number.isFinite)));
  }
  assert.ok(fields.find(f=>f.kind==='level-thickness').measure.leader);assert.deepEqual(value,before);
  const f=fields.find(f=>f.kind==='bay-width'),resized=direct.proposeDirect(model,value,f,f.value+150),after=direct.directFields(model,resized,value.objects[0].id).find(n=>n.key===f.key);assert.ok(Math.abs(length(after.measure)-(f.value+150))<1e-7);assert.notDeepEqual(f.measure.b,after.measure.b);
});

test('rack references touch their physical parts and nearby cards follow structural changes without saving annotations',()=>{
  const value=fixture(),before=structuredClone(value),rack=value.objects[0],bay=rack.bays[0],left=rack.uprights[0].width;
  const local=p=>{const a=-rack.rotation*Math.PI/180,x=p.x*1000-rack.x,z=p.z*1000-rack.z;return {x:x*Math.cos(a)-z*Math.sin(a),y:p.y*1000,z:x*Math.sin(a)+z*Math.cos(a)};};
  const fields=direct.directFields(model,value,rack.id),width=fields.find(f=>f.kind==='bay-width'),ground=fields.find(f=>f.kind==='ground-enabled');
  const reference=local(width.anchor);assert.ok(Math.abs(reference.x-(left+bay.width/2))<1e-7);assert.equal(reference.y,bay.levels[0].clearHeight+bay.levels[0].thickness/2);assert.ok(Math.abs(reference.z-bay.depth)<1e-7);
  assert.equal(ground.anchor.y,0);
  for(const f of fields.filter(f=>f.anchor))assert.ok(Math.hypot(f.point.x-f.anchor.x,f.point.y-f.anchor.y,f.point.z-f.anchor.z)<.5,f.kind);
  const height=fields.find(f=>f.kind==='level-height'),changed=direct.proposeDirect(model,value,height,height.value+100),next=direct.directFields(model,changed,rack.id).find(f=>f.key===width.key);
  assert.ok(Math.abs(next.anchor.y-width.anchor.y-.1)<1e-7);assert.ok(Math.abs(next.point.y-width.point.y-.1)<1e-7);
  assert.deepEqual(changed.locations.map(s=>[s.id,s.code]),value.locations.map(s=>[s.id,s.code]));assert.doesNotMatch(JSON.stringify(changed),/"anchor"|"measure"/);assert.deepEqual(value,before);
  const menu=direct.structureMenu(model,value,rack.id,{view:'bay',bayId:bay.id}),choose=menu.controls.find(f=>f.action);
  assert.ok(choose.anchor);assert.ok(Math.hypot(choose.point.x-choose.anchor.x,choose.point.y-choose.anchor.y,choose.point.z-choose.anchor.z)<.5);
});
