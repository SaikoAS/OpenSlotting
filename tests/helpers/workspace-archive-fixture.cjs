'use strict';
const root=require('node:path').join(__dirname,'../..');
const core=require(root+'/csv.js'),workspace=require(root+'/workspace.js'),warehouse=require(root+'/warehouse.js');
const preparation=require(root+'/src/application/workspace-preparation.js');
const stamp='2026-10-22T08:00:00.000Z';
function source(id,type,text,mapping,extra={}) {
 const bytes=new TextEncoder().encode(text);
 const file={id,name:id+'.csv',label:id+'.csv',sourceType:type,size:bytes.byteLength,lastModified:123,buffer:bytes.buffer,encodingMode:'auto',activeEncoding:'utf-8',detectedEncoding:'utf-8',errorKey:null,mapping,confirmedMapping:mapping,...extra};
 file.result=core.importCsv(text,mapping,{sourceFile:{id,name:file.name,label:file.label,sourceType:type},customFields:[{id:'custom-zone',name:'Zone',type:'text',active:true}],customFieldMapping:file.customFieldMapping||{},sourceRules:file.sourceRules||[],preparationRules:file.preparationRules||{}});
 file.columnCatalog=file.result.rawColumnCatalog;
 return file;
}
function fixture() {
const record=workspace.createWorkspace('Synthetic complete audit',{id:'workspace-whole',language:'de',now:stamp,
 customFields:[{id:'custom-zone',name:'Zone',type:'text',active:true}],
 coverageNotes:[{date:'2026-10-03',reason:'Feiertag keine Auslieferung',updatedAt:stamp}],
 tablePreferences:{columnOrder:['article_id','custom:custom-zone','quantity'],visibleColumns:['article_id','quantity']},walkPreferences:{fov:85},
 periodSettings:{mode:'custom',expectedWeekdays:[1,2,3,4,5],periodA:{name:'Before',start:'2026-09-01',end:'2026-09-30'},periodB:{name:'After',start:'2026-10-01',end:'2026-10-21'}}});
record.analyzed=true;
record.files=[
 source('source-orders','order-lines','order_id;article_id;quantity;delivery_date;zone\nO-1;sku-a;0.3;2026-10-01;A\nO-2;;1;2026-10-02;B\nO-3;SKU-C;1;2026-10-03;C\n',{order_id:0,article_id:1,quantity:2,delivery_date:3},
 {customFieldMapping:{'custom-zone':4},confirmedCustomFieldMapping:{'custom-zone':4},preparationRules:{article_id:[{type:'case-normalization',mode:'upper',enabled:true}]},
 sourceRules:[{sourcePosition:1,type:'exclude-empty',name:'No SKU',description:'Synthetic exclusion',enabled:true,includeInProfile:true}]}),
 source('source-master','article-master','article_id;article_name;location;zone\nSKU-A;Synthetic article;P-1;MASTER\n',{article_id:0,article_name:1,location:2},{customFieldMapping:{'custom-zone':3},confirmedCustomFieldMapping:{'custom-zone':3}})
];
record.importProfiles=[workspace.createImportProfile({...record.files[0],headers:record.files[0].result.headers},'Synthetic profile',record.customFields,{id:'profile-audit',now:stamp})];
record.files[0].appliedImportProfile=workspace.recordImportProfileApplication(record.importProfiles[0],record.files[0],{now:stamp});
let layout=warehouse.normalizeLayout({...warehouse.createLayout(),objects:[warehouse.createRack('pallet-rack',{bayCount:2,levelCount:2})]});
layout=warehouse.setZoneUsage(layout,layout.zones[0].id,'picking');layout=warehouse.resizeZoneLocations(layout,layout.zones[0].id,3);
layout.locations.forEach((loc,i)=>{loc.code='P-'+(i+1);});
const corner=warehouse.createRecipe('aisle-corner',{x:20000});
const junction=warehouse.createRecipe('aisle-tee',{x:40000});
layout=warehouse.normalizeLayout({...layout,objects:layout.objects.concat([corner,junction])});
layout=warehouse.connectObjects(layout,corner.id,junction.id,0,1,'ports');
record.warehouseLayout=warehouse.groupObjects(layout,[corner.id,junction.id],'Synthetic connected routes');
const prepared=preparation.prepareWorkspaceRecord(record,'de',()=>{});
const original=preparation.persistPreparedWorkspace(prepared);
return original;
}
module.exports={fixture};
