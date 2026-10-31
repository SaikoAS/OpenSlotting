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
  const bay=field(value,'bay-width'),rack=value.objects[0],point=model.localPoint(rack,rack.uprights[0].width+rack.bays[0].width/2,rack.bays[0].depth+100);
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
  assert.ok(direct.directFields(model,locked,locked.objects[0].id).every(f=>f.locked));
  assert.throws(()=>direct.proposeDirect(model,locked,width,width.value-50),/Unlock/);
});
test('simple objects expose validated dimensions while junctions and drawn routes retain their inspector',()=>{
  const wall=model.createRecipe('wall'),value=model.normalizeLayout({...model.createLayout(),objects:[wall]}),fields=direct.directFields(model,value,wall.id);
  assert.deepEqual(fields.map(f=>f.kind),['object-width','object-height','object-depth']);
  const next=direct.proposeDirect(model,value,fields[0],wall.width+100);assert.equal(next.objects[0].width,wall.width+100);
  assert.deepEqual(direct.directFields(model,value,'unknown'),[]);
  const route=model.createRoute([{x:0,z:0},{x:4000,z:0}],2000,'Synthetic route');
  assert.deepEqual(direct.directFields(model,model.normalizeLayout({...model.createLayout(),objects:[route]}),route.id),[]);
});
