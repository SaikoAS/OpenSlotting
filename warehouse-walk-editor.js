(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();else root.OpenSlottingWalkEditor=factory();
}(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function esc(value){return String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

  // A shared typed catalog drives in-world controls; IDs and derived dimensions remain protected.
  function directFields(model,layout,objectId){
    const object=layout.objects.find(item=>item.id===objectId);if(!object)return [];
    const fields=[],index=model.createScopeIndex(layout),size=model.objectFootprint(object),front=size.depth+120;
    const first=model.RACK_TYPES.includes(object.type)?object.uprights[0].width+object.bays[0].width/2:size.width/2;
    function add(kind,id,value,min,max,x,y,z,de,en,extra){
      const point=model.localPoint(object,x,z);
      const field=Object.assign({key:kind+':'+id,kind,objectId,value,min,max,type:'number',unit:'mm',section:'structure',
        point:{x:point.x/1000,y:y/1000,z:point.z/1000},de,en,locked:object.locked===true},extra);
      if(extra&&extra.locked!==undefined)field.locked=object.locked===true||extra.locked;
      if(kind==='object-lock')field.locked=false;
      fields.push(field);return field;
    }
    const text={type:'text',unit:'',maxLength:120},bool={type:'boolean',unit:''},count={unit:'',step:1};
    const command={type:'choice',unit:'',options:[{value:false,de:'Nicht vormerken',en:'Not staged'},{value:true,de:'Vormerken',en:'Stage action'}]};
    add('object-name',object.id,object.name,0,120,first,1650,front,'Name','Name',text);
    add('object-x',object.id,object.x,-500000,500000,first,900,front,'X-Position','X position',{step:100});
    add('object-z',object.id,object.z,-500000,500000,first,1150,front,'Z-Position','Z position',{step:100});
    add('object-rotation',object.id,object.rotation,-360,360,first,1400,front,'Drehung','Rotation',{unit:'°',step:15});
    add('object-lock',object.id,object.locked,0,1,first,1900,front,'Gesperrt','Locked',bool);
    add('object-duplicate',object.id,false,0,1,first,2400,front,'Objekt duplizieren','Duplicate object',command);
    add('object-remove',object.id,false,0,1,first,2650,front,'Objekt entfernen','Remove object',command);
    const group=(layout.groups||[]).find(g=>g.objectIds.includes(objectId));
    if(group)add('group-name',group.id,group.name,0,120,first,2900,front,'Gruppenname','Group name',{...text,groupId:group.id,locked:layout.objects.some(o=>group.objectIds.includes(o.id)&&o.locked)});
    if(!model.RACK_TYPES.includes(object.type)){
      if(!object.junction&&!(object.route&&object.route.path))add('object-width',object.id,object.width,100,50000,size.width/2,Math.min(700,object.height/2),front,'Breite / Länge','Width / length');
      add('object-height',object.id,object.height,1,15000,size.width/2,object.height+(object.elevation||0)+120,front,'Höhe','Height');
      add('object-depth',object.id,object.depth,object.type==='aisle'?100:10,50000,-100,Math.min(1100,object.height/2)+(object.elevation||0),size.depth/2,'Tiefe / Stärke','Depth / thickness');
      add('object-elevation',object.id,object.elevation||0,0,20000,first,450,front,'Höhenversatz','Elevation');
      if(object.type==='door')add('object-open',object.id,object.open,0,1,first,650,front,'Tür geöffnet','Door open',bool);
      if(object.junction)Object.entries(object.junction.arms).forEach(([direction,value],i)=>add('junction-arm',direction,value,100,24000,first,2350+i*250,front,'Arm '+direction,'Arm '+direction,{direction}));
      if(object.route){
        [['requiredWidth',100,50000,'Benötigte Breite','Required width'],['requiredHeight',100,15000,'Benötigte Höhe','Required height'],['widthMargin',0,5000,'Breitenreserve','Width margin'],['heightMargin',0,5000,'Höhenreserve','Height margin']].forEach(([property,min,max,de,en],i)=>add('route-'+property,object.id,object.route[property],min,max,first,3450+i*250,front,de,en,{property,nullable:property.startsWith('required')}));
        (object.route.path||[]).forEach((point,i)=>['x','z'].forEach((axis,n)=>add('route-point-'+axis,String(i),point[axis],-500000,500000,point.x,500+n*250,point.z,'Wegpunkt '+(i+1)+' · '+axis.toUpperCase(),'Waypoint '+(i+1)+' · '+axis.toUpperCase(),{pointIndex:i,axis})));
      }
      return fields;
    }
    add('rack-depth',object.id,model.rackDepth(object)||object.bays[0].depth,200,3000,-120,950,object.bays[0].depth/2,'Regaltiefe','Rack depth');
    add('rack-bays',object.id,object.bays.length,1,30,first,2150,front,'Fachanzahl','Bay count',count);
    add('rack-prefix',object.id,'',0,80,first,1400,front,'Codes erzeugen · Präfix (Regal)','Generate codes · Prefix (rack)',{...text,maxLength:80,section:'locations'});
    const usages=[...new Set(model.USAGES.concat(layout.zones.map(z=>z.usage)))].map(value=>({value,de:({unassigned:'Nicht zugewiesen',picking:'Kommissionierung',reserve:'Reserve'})[value]||value,en:({unassigned:'Unassigned',picking:'Picking',reserve:'Reserve'})[value]||value}));
    let x=0;
    object.bays.forEach(function(bay,bayIndex){
      x+=object.uprights[bayIndex].width;const center=x+bay.width/2,label='Fach '+(bayIndex+1),english='Bay '+(bayIndex+1);
      add('bay-width',bay.id,bay.width,300,6000,center,Math.min(650,bay.levels[0].clearHeight*.45),bay.depth+100,label+' · Breite',english+' · Width',{bayId:bay.id});
      add('bay-levels',bay.id,bay.levels.length,1,12,center,400,bay.depth+100,label+' · Ebenenanzahl',english+' · Level count',{...count,bayId:bay.id});
      add('ground-enabled',bay.id,bay.ground.enabled,0,1,center,150,bay.depth+120,label+' · Bodenstellplätze',english+' · Ground locations',{...bool,bayId:bay.id,sections:['structure','zones','locations']});
      let y=0;
      const levels=bay.ground.enabled?[{...bay.ground,ground:true,clearHeight:0,thickness:0}].concat(bay.levels):bay.levels;
      levels.forEach(function(level){
        y+=level.clearHeight;const levelIndex=level.ground?-1:bay.levels.findIndex(item=>item.id===level.id),de=label+' · Ebene '+(levelIndex+1),en=english+' · Level '+(levelIndex+1),meta={bayId:bay.id,levelId:level.id};
        if(!level.ground){
          add('level-height',level.id,level.clearHeight,100,8000,center,y+level.thickness+120,bay.depth+100,de+' · lichte Höhe',en+' · Clear height',meta);
          add('level-thickness',level.id,level.thickness,10,300,center,y+level.thickness+350,bay.depth+100,de+' · Traversenstärke',en+' · Beam thickness',meta);
          add('level-deck',level.id,level.deck,0,1,center,y+level.thickness+580,bay.depth+100,de+' · Fachboden',en+' · Deck',{...meta,...bool});
          add('level-deckThickness',level.id,level.deckThickness,10,200,center,y+level.thickness+810,bay.depth+100,de+' · Bodenstärke',en+' · Deck thickness',meta);
        }
        const zone=index.zonesByLevel.get(level.id),surface=y+level.thickness+(level.deck?level.deckThickness:0);
        if(zone){
          const slots=index.locationsByZone.get(zone.id)||[],zoneMeta={zoneId:zone.id,bayId:bay.id,levelId:level.id};
          add('zone-usage',zone.id,zone.usage,0,0,center,surface+260,bay.depth+120,de+' · Nutzung',en+' · Usage',{...zoneMeta,type:'choice',unit:'',options:usages,section:'zones'});
          add('zone-bay-usage',zone.id,zone.usage,0,0,center,surface+510,bay.depth+120,label+' · Nutzung für alle Ebenen',english+' · Usage for all levels',{...zoneMeta,type:'choice',unit:'',options:usages,section:'zones'});
          add('zone-rack-usage',zone.id,zone.usage,0,0,center,surface+760,bay.depth+120,'Nutzung für gesamtes Regal','Usage for entire rack',{...zoneMeta,type:'choice',unit:'',options:usages,section:'zones'});
          add('zone-count',zone.id,slots.length,0,10,center,surface+550,bay.depth+120,de+' · Plätze gleichmäßig aufteilen',en+' · Divide locations equally',{...zoneMeta,...count,section:'locations',locked:zone.usage==='unassigned'});
          add('location-add',zone.id,false,0,1,center,surface+1050,bay.depth+120,de+' · Platz hinzufügen',en+' · Add location',{...zoneMeta,...command,section:'locations',locked:zone.usage==='unassigned'||slots.length>=10});
          add('zone-prefix',zone.id,'',0,80,center,surface+800,bay.depth+120,de+' · Codes erzeugen (Präfix)',en+' · Generate codes (prefix)',{...zoneMeta,...text,maxLength:80,section:'locations',locked:zone.usage==='unassigned'});
          slots.forEach(function(slot){
            const area=slot.placement,slotLabel=slot.code||de+' · Platz '+(slot.positionIndex+1),slotEn=slot.code||en+' · Place '+(slot.positionIndex+1),slotMeta={slotId:slot.id,section:'locations',locked:zone.usage==='unassigned'};
            add('location-width',slot.id,area.width,1,bay.width-area.x,x+area.x+area.width/2,surface+180,bay.depth+110,slotLabel+' · Breite',slotEn+' · Width',slotMeta);
            add('location-x',slot.id,area.x,0,bay.width-area.width,x+area.x+area.width/2,surface+330,bay.depth+110,slotLabel+' · Position',slotEn+' · Position',slotMeta);
            add('location-code',slot.id,slot.code,0,80,x+area.x+area.width/2,surface+30,bay.depth+110,slotLabel+' · Code',slotEn+' · Code',{...slotMeta,...text,maxLength:80,locked:zone.usage==='unassigned'&&!slot.legacy});
            add('location-duplicate',slot.id,false,0,1,x+area.x+area.width/2,surface+1080,bay.depth+110,slotLabel+' · Duplizieren',slotEn+' · Duplicate',{...slotMeta,...command,locked:zone.usage==='unassigned'||slots.length>=10});
            add('location-remove',slot.id,false,0,1,x+area.x+area.width/2,surface+1330,bay.depth+110,slotLabel+' · Entfernen',slotEn+' · Remove',{...slotMeta,...command});
          });
        }
        y+=level.thickness;
      });
      if(bay.passage){
        add('passage-route',bay.id,bay.passage.routeId,0,0,center,1000,bay.depth+120,label+' · Durchfahrtsweg',english+' · Passage route',{bayId:bay.id,type:'choice',unit:'',options:[{value:null,de:'Kein Weg',en:'No route'}].concat(layout.objects.filter(o=>o.type==='aisle').map(o=>({value:o.id,de:o.name,en:o.name})))});
      }
      add('passage-enabled',bay.id,Boolean(bay.passage),0,1,center,1250,bay.depth+120,label+' · Durchfahrt',english+' · Passage',{...bool,bayId:bay.id});
      x+=bay.width;
    });
    x=0;object.uprights.forEach((stand,i)=>{
      add('upright-width',stand.id,stand.width,20,500,x+stand.width/2,500,stand.depth+100,'Ständer '+(i+1)+' · Breite','Upright '+(i+1)+' · Width',{uprightId:stand.id});
      add('upright-height',stand.id,stand.height,200,20000,x+stand.width/2,1000,stand.depth+100,'Ständer '+(i+1)+' · Höhe','Upright '+(i+1)+' · Height',{uprightId:stand.id});
      x+=stand.width+(object.bays[i]?object.bays[i].width:0);
    });
    // Measurement endpoints refer to actual local geometry; annotations never enter the scene.
    function point(x,y,z){const p=model.localPoint(object,x,z);return {x:p.x/1000,y:y/1000,z:p.z/1000};}
    function measure(field,from,to,offset,labelOffset){
      const a=from.map((n,i)=>n+offset[i]),b=to.map((n,i)=>n+offset[i]),mid=a.map((n,i)=>(n+b[i])/2+(labelOffset?labelOffset[i]:0));
      field.measure={from:point(...from),to:point(...to),a:point(...a),b:point(...b),leader:Boolean(labelOffset)};field.point=point(...mid);
    }
    const fieldIndex=new Map(fields.map(f=>[f.key,f]));
    let start=0;
    object.bays.forEach((bay,i)=>{
      start+=object.uprights[i].width;const left=start,right=start+bay.width,z=bay.depth,byKind=kind=>fieldIndex.get(kind+':'+bay.id);
      const width=byKind('bay-width');width.shortDe='Fachbreite';width.shortEn='Bay width';measure(width,[left,150,z],[right,150,z],[0,450,180]);
      let bottom=0;
      bay.levels.forEach(level=>{
        const top=bottom+level.clearHeight,find=kind=>fieldIndex.get(kind+':'+level.id),height=find('level-height'),beam=find('level-thickness'),deck=find('level-deckThickness');
        height.shortDe='Höhe bis Traverse';height.shortEn='Height to beam';measure(height,[left,bottom,z],[left,top,z],[220,0,180]);
        beam.shortDe='Traversenhöhe';beam.shortEn='Beam height';measure(beam,[left,top,z],[left,top+level.thickness,z],[500,0,180],[0,250,0]);
        deck.shortDe='Fachbodendicke';deck.shortEn='Deck thickness';measure(deck,[right,top+level.thickness,z],[right,top+level.thickness+level.deckThickness,z],[-450,0,180],[0,550,0]);
        bottom=top+level.thickness;
      });start=right;
    });
    start=0;object.uprights.forEach((stand,i)=>{
      const width=fieldIndex.get('upright-width:'+stand.id),height=fieldIndex.get('upright-height:'+stand.id);
      measure(width,[start,500,stand.depth],[start+stand.width,500,stand.depth],[0,200,180],[i===0?-300:300,200,0]);
      measure(height,[start,0,stand.depth],[start,stand.height,stand.depth],[i===0?-250:stand.width+250,0,180]);
      start+=stand.width+(object.bays[i]?object.bays[i].width:0);
    });
    const depth=fieldIndex.get('rack-depth:'+object.id);measure(depth,[0,300,0],[0,300,object.bays[0].depth],[-300,0,0]);
    return fields;
  }
  function structureMenu(model,layout,objectId,selection,catalog){
    const object=layout.objects.find(o=>o.id===objectId),fields=(catalog||directFields(model,layout,objectId)).filter(f=>f.section==='structure'||f.sections&&f.sections.includes('structure'));
    if(!object||!model.RACK_TYPES.includes(object.type))return {selection:null,controls:fields,de:'Struktur',en:'Structure'};
    let state=Object.assign({view:'bays',bayId:null,levelId:null},selection);
    const bay=object.bays.find(b=>b.id===state.bayId);
    if(!['bays','rack','bay','levels','level'].includes(state.view)||['bay','levels','level'].includes(state.view)&&!bay)state={view:'bays',bayId:null,levelId:null};
    if(state.view==='level'&&!bay.levels.some(l=>l.id===state.levelId)&&!(bay.ground.enabled&&bay.ground.id===state.levelId))state={view:'levels',bayId:bay.id,levelId:null};
    const point=(x,y,z)=>{const p=model.localPoint(object,x,z);return {x:p.x/1000,y:y/1000,z:p.z/1000};};
    const action=(key,de,en,p,next)=>({key:'@structure-'+key,action:'structure',de,en,point:p,next});
    const bayIndex=bay?object.bays.indexOf(bay):-1,start=bay?object.bays.slice(0,bayIndex).reduce((x,b,i)=>x+object.uprights[i].width+b.width,0)+object.uprights[bayIndex].width:0;
    let controls=[],de='Fach auswählen',en='Choose bay';
    if(state.view==='bays'){
      let x=0;controls=object.bays.map((b,i)=>{x+=object.uprights[i].width;const p=point(x+b.width/2,900,b.depth+180);x+=b.width;return action('bay-'+b.id,'Fach '+(i+1),'Bay '+(i+1),p,{view:'bay',bayId:b.id,levelId:null});});
      controls.push(action('rack','Gesamtes Regal','Entire rack',point(object.uprights[0].width+object.bays[0].width/2,1700,object.bays[0].depth+180),{view:'rack',bayId:null,levelId:null}));
    }else if(state.view==='rack'){
      controls=fields.filter(f=>!f.bayId&&!f.uprightId);de='Gesamtes Regal';en='Entire rack';
    }else if(state.view==='bay'){
      controls=fields.filter(f=>f.bayId===bay.id&&!f.levelId||[object.uprights[bayIndex].id,object.uprights[bayIndex+1].id].includes(f.uprightId));
      controls.push(action('levels-'+bay.id,'Ebene auswählen','Choose level',point(start+bay.width/2,1750,bay.depth+180),{view:'levels',bayId:bay.id,levelId:null}));de='Fach '+(bayIndex+1);en='Bay '+(bayIndex+1);
    }else if(state.view==='levels'){
      let y=0;const scopes=(bay.ground.enabled?[{id:bay.ground.id,ground:true,clearHeight:0,thickness:0}]:[]).concat(bay.levels);
      controls=scopes.map(level=>{y+=level.clearHeight+level.thickness;const i=bay.levels.indexOf(level),de=level.ground?'Bodenebene':'Ebene '+(i+1),en=level.ground?'Ground level':'Level '+(i+1);return action('level-'+level.id,de,en,point(start+bay.width/2,y+250,bay.depth+180),{view:'level',bayId:bay.id,levelId:level.id});});de='Fach '+(bayIndex+1)+' · Ebene auswählen';en='Bay '+(bayIndex+1)+' · Choose level';
    }else{
      const i=bay.levels.findIndex(l=>l.id===state.levelId);controls=fields.filter(f=>f.levelId===state.levelId||i===-1&&f.kind==='ground-enabled'&&f.bayId===bay.id);de='Fach '+(bayIndex+1)+' · '+(i===-1?'Bodenebene':'Ebene '+(i+1));en='Bay '+(bayIndex+1)+' · '+(i===-1?'Ground level':'Level '+(i+1));
    }
    return {selection:state,controls,de,en};
  }
  function formatDirect(field,value,language){
    if(value===null)return '—';
    if(field.type==='boolean')return language==='de'?(value?'An':'Aus'):(value?'On':'Off');
    if(field.type==='choice'){const option=field.options.find(o=>o.value===value);return option?option[language==='de'?'de':'en']:String(value);}
    return String(value==null?'':value)+(field.unit?' '+field.unit:'');
  }
  function proposeDirect(model,layout,field,value){
    const actual=directFields(model,layout,field.objectId).find(item=>item.key===field.key);
    if(!actual||actual.locked)throw new Error('Unlock the object before editing it.');
    if(actual.type==='text'){
      if(typeof value!=='string'||value.length>actual.maxLength)throw new Error('Text is too long.');
    }else if(actual.type==='boolean'){
      if(typeof value!=='boolean')throw new Error('Choose on or off.');
    }else if(actual.type==='choice'){
      if(!actual.options.some(o=>o.value===value))throw new Error('Choose an available option.');
    }else if(!(actual.nullable&&value===null)&&(!Number.isInteger(value)||value<actual.min||value>actual.max))throw new Error('Value outside the permitted range.');
    let next=JSON.parse(JSON.stringify(layout));const object=next.objects.find(item=>item.id===actual.objectId),bay=actual.bayId&&object.bays.find(b=>b.id===actual.bayId),bayIndex=bay&&object.bays.indexOf(bay);
    const level=actual.levelId&&bay&&bay.levels.find(l=>l.id===actual.levelId);
    if(actual.kind==='object-lock')object.locked=value;
    else if(actual.kind==='object-duplicate'){if(value)next.objects.push(model.duplicateObject(object,{objects:next.objects}));}
    else if(actual.kind==='object-remove'){if(value)next.objects=next.objects.filter(o=>o.id!==object.id);}
    else if(actual.kind==='rack-depth')Object.assign(object,model.setRackDepth(object,value));
    else if(actual.kind==='rack-bays')Object.assign(object,model.resizeRack(object,value,null));
    else if(actual.kind==='bay-levels')Object.assign(object,model.resizeBayLevels(object,bayIndex,value));
    else if(actual.kind==='bay-width')bay.width=value;
    else if(actual.kind==='ground-enabled')next=model.setGroundEnabled(next,object.id,bayIndex,value);
    else if(actual.kind==='passage-enabled'){
      if(value)next=model.configurePassage(next,object.id,bayIndex,bay.levels[0].clearHeight,null);else bay.passage=null;
    }else if(actual.kind==='passage-route')bay.passage.routeId=value;
    else if(actual.kind.startsWith('level-'))level[({'level-height':'clearHeight','level-thickness':'thickness','level-deck':'deck','level-deckThickness':'deckThickness'})[actual.kind]]=value;
    else if(actual.kind.startsWith('upright-'))object.uprights.find(u=>u.id===actual.uprightId)[actual.kind.slice(8)]=value;
    else if(['zone-usage','zone-bay-usage','zone-rack-usage'].includes(actual.kind)){
      next.zones.forEach(z=>{if(z.objectId===object.id&&(actual.kind==='zone-rack-usage'||actual.kind==='zone-bay-usage'&&z.bayId===actual.bayId||z.id===actual.zoneId))z.usage=value;});
    }else if(actual.kind==='zone-count')next=model.resizeZoneLocations(next,actual.zoneId,value);
    else if(actual.kind==='location-add'){if(value)next=model.addLocation(next,actual.zoneId);}
    else if(actual.kind==='location-duplicate'){if(value)next=model.duplicateLocation(next,actual.slotId);}
    else if(actual.kind==='location-remove'){if(value)next=model.removeLocation(next,actual.slotId);}
    else if(actual.kind==='zone-prefix'||actual.kind==='rack-prefix')next=model.fillLocationCodes(next,object.id,value,actual.kind==='zone-prefix'?actual.levelId:null);
    else if(actual.kind==='location-code')next=model.setLocationCode(next,actual.slotId,value);
    else if(actual.slotId){const slot=next.locations.find(s=>s.id===actual.slotId);next=model.setLocationPlacement(next,slot.id,{...slot.placement,[actual.kind==='location-x'?'x':'width']:value});}
    else if(actual.kind==='junction-arm')object.junction.arms[actual.direction]=value;
    else if(actual.kind.startsWith('route-point-'))object.route.path[actual.pointIndex][actual.axis]=value;
    else if(actual.kind.startsWith('route-'))object.route[actual.property]=value;
    else if(actual.kind==='group-name')next.groups.find(g=>g.id===actual.groupId).name=value;
    else if(actual.kind.startsWith('object-'))object[actual.kind.slice(7)]=value;
    else throw new Error('Unknown direct field.');
    if(actual.kind!=='object-lock')model.applyAssemblyChanges(layout,next);
    next=model.reconcileLayout(next,layout);
    if(model.lockedEditConflict(layout,next,actual.kind==='object-lock'?object.id:null))throw new Error('Unlock all affected objects before editing.');
    const structure=['rack-bays','bay-levels','ground-enabled','zone-count','passage-enabled','location-add','location-duplicate','location-remove','object-remove'].includes(actual.kind),codes=['location-code','zone-prefix','rack-prefix'].includes(actual.kind);
    const retained=new Map(next.locations.map(slot=>[slot.id,slot.code]));
    if(!structure&&(next.locations.length!==layout.locations.length||layout.locations.some(slot=>!retained.has(slot.id))))throw new Error('This direct edit would remove or replace locations.');
    if(!codes&&layout.locations.some(slot=>retained.has(slot.id)&&retained.get(slot.id)!==slot.code))throw new Error('This direct edit would replace location codes.');
    return next;
  }

  function create(options){
    const panel=document.createElement('section');panel.className='wh-walk-edit-overlay';panel.hidden=true;
    panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','walk-edit-title');
    panel.innerHTML='<header><h2 id="walk-edit-title"></h2><button type="button" data-edit-close></button></header><div class="wh-walk-recipes" hidden></div><div class="wh-walk-edit-properties"></div><footer><p role="status" data-edit-status></p><button type="button" data-edit-resume></button></footer>';
    document.body.appendChild(panel);
    const editorRoot=panel.querySelector('.wh-walk-edit-properties');
    const recipesRoot=panel.querySelector('.wh-walk-recipes');
    let open=false,workspaceId=null,baseline=null,epoch=0;
    let view='properties',selectedRecipe=null,createdObjectId=null,recipeSaved=false,writing=false,wasDraft=false;
    function de(){return options.getLanguage()==='de';}
    function running(){return options.walkRoot.classList.contains('is-walk-window')||options.walkRoot.classList.contains('is-walk-windowed')||document.fullscreenElement===options.walkRoot;}
    function errorText(error){const code=error&&error.message;
      if(code==='edit-conflict')return de()?'Der Lagerplan wurde im Hauptfenster geändert. Editor schließen und den Datenstand im Rundgang aktualisieren.':'The main window changed the layout. Close the editor and update the walk data snapshot.';
      if(code==='edit-busy')return de()?'Ein Speichervorgang läuft. Bitte erneut versuchen.':'A save is in progress. Please try again.';
      if(code==='edit-timeout')return de()?'Speicherbestätigung ausstehend. Änderung nicht wiederholen; Datenstand vor dem Weiterarbeiten aktualisieren.':'Save confirmation timed out. Do not repeat the change; refresh the snapshot before continuing.';
      return code||'edit-failed';
    }
    function recipeHint(){return de()?'Neue Objekte werden vor dem Betrachter eingefügt. Position und Maße bleiben anpassbar.':'New objects are inserted ahead of the observer. Position and dimensions remain editable.';}
    function recipeControls(){
      const add=recipesRoot.querySelector('[data-recipe-add]'),inspect=recipesRoot.querySelector('[data-recipe-inspect]');
      if(add){add.disabled=writing||!selectedRecipe;add.textContent=selectedRecipe&&options.model.RACK_TYPES.includes(selectedRecipe)
        ?(de()?'Konfigurieren und hinzufügen':'Configure and add'):(de()?'Objekt hinzufügen':'Add object');}
      if(inspect){inspect.hidden=!createdObjectId;inspect.disabled=writing;}
    }
    function filterRecipes(){
      const search=recipesRoot.querySelector('[data-recipe-search]'),group=recipesRoot.querySelector('[data-recipe-group]');if(!search||!group)return;
      const query=search.value.trim().toLocaleLowerCase(options.getLanguage()),groups=editor.recipes();
      const matches=groups.flatMap((entry,index)=>entry.recipes.map(recipe=>Object.assign({group:entry.label,index:index},recipe)))
        .filter(recipe=>(group.value===''||Number(group.value)===recipe.index)&&(!query||(recipe.name+' '+recipe.group+' '+recipe.id).toLocaleLowerCase(options.getLanguage()).includes(query)));
      if(!matches.some(recipe=>recipe.id===selectedRecipe))selectedRecipe=matches.length?matches[0].id:null;
      recipesRoot.querySelector('[data-recipe-cards]').innerHTML=matches.length?matches.map(recipe=>
        '<button type="button" class="wh-walk-recipe-card" data-recipe="'+esc(recipe.id)+'" aria-pressed="'+(recipe.id===selectedRecipe)+'"><strong>'+esc(recipe.name)+'</strong><small>'+esc(recipe.group)+'</small></button>').join('')
        :'<p>'+(de()?'Keine passenden Rezepte.':'No matching recipes.')+'</p>';
      const current=matches.find(recipe=>recipe.id===selectedRecipe);
      recipesRoot.querySelector('[data-recipe-choice]').textContent=current?current.name:'';recipeControls();
    }
    function initRecipes(){
      const groups=editor.recipes();
      recipesRoot.innerHTML='<p>'+esc(recipeHint())+'</p><div class="wh-walk-recipe-filters"><label>'+(de()?'Rezept suchen':'Search recipes')+
        '<input type="search" data-recipe-search maxlength="120"></label><label>'+(de()?'Kategorie':'Category')+'<select data-recipe-group><option value="">'+(de()?'Alle Kategorien':'All categories')+'</option>'+
        groups.map((group,index)=>'<option value="'+index+'">'+esc(group.label)+'</option>').join('')+'</select></label></div><div class="wh-walk-recipe-cards" data-recipe-cards></div>'+
        '<div class="wh-walk-recipe-actions"><strong data-recipe-choice></strong><button type="button" data-recipe-inspect hidden>'+(de()?'Hinzugefügtes Objekt bearbeiten':'Edit added object')+'</button><button type="button" data-recipe-add></button></div>';
      filterRecipes();
    }
    function rendered(state){
      if(!open)return;
      if(options.walk.markObject)options.walk.markObject(state.objectId);
      if(view!=='recipes')return;
      const saved=recipeSaved&&!state.draft;
      if(saved){createdObjectId=state.objectId;recipeSaved=false;}
      recipesRoot.hidden=state.draft;editorRoot.hidden=!state.draft;
      const status=panel.querySelector('[data-edit-status]');
      if(state.draft)status.textContent=de()?'Regalkonfiguration abschließen oder abbrechen.':'Finish or cancel the rack configuration.';
      else if(saved||writing)status.textContent=state.message||recipeHint();
      else if(wasDraft)status.textContent=de()?'Regalkonfiguration abgebrochen.':'Rack configuration cancelled.';
      recipeControls();
      if(wasDraft&&!state.draft){const add=recipesRoot.querySelector('[data-recipe-add]');if(add)add.focus();}
      wasDraft=state.draft;
    }
    const editor=window.OpenSlottingWarehouseEditor.create({root:editorRoot,model:options.model,inspectorOnly:true,
      onRender:rendered,
      getInsertPosition:object=>options.walk.insertionPoint(object),
      getLayout:options.getLayout,getRegistry:options.getRegistry,getWorkspaceId:options.getWorkspaceId,getLanguage:options.getLanguage,
      save:async function(next,metadata){
        const current=epoch,id=workspaceId;
        if(!open||id!==options.getWorkspaceId())throw new Error('edit-conflict');
        try {await options.save(next,baseline,metadata&&metadata.toggleLockId);
          if(current===epoch&&id===options.getWorkspaceId()){
            baseline=JSON.stringify(options.getLayout());recipeSaved=view==='recipes';options.walk.render();
          }
        }catch(error){throw new Error(errorText(error));}
      }
    });
    editorRoot.classList.add('is-walk-inspector');
    function close(resume,force){
      if(!open&&!force)return;
      const draft=editor.hasDraft();
      if(!force&&(writing||editor.isBusy()||draft&&!window.confirm(de()?'Nicht übernommene Vorschau verwerfen?':'Discard the unapplied preview?')))return;
      if(draft)editor.clearHistory();
      open=false;epoch++;panel.hidden=true;options.walkRoot.inert=false;
      if(force){editor.clearHistory();editorRoot.replaceChildren();recipesRoot.replaceChildren();baseline=null;workspaceId=null;createdObjectId=null;selectedRecipe=null;return;}
      options.walk.render();options.walk.pause();if(resume&&running())options.walk.resume();
    }
    panel.querySelector('[data-edit-close]').addEventListener('click',()=>close(false));
    panel.querySelector('[data-edit-resume]').addEventListener('click',()=>close(true));
    recipesRoot.addEventListener('input',event=>{if(event.target.hasAttribute('data-recipe-search'))filterRecipes();});
    recipesRoot.addEventListener('change',event=>{if(event.target.hasAttribute('data-recipe-group'))filterRecipes();});
    recipesRoot.addEventListener('click',async function(event){
      const card=event.target.closest('[data-recipe]');
      if(card){selectedRecipe=card.dataset.recipe;filterRecipes();const selected=recipesRoot.querySelector('[data-recipe="'+selectedRecipe+'"]');if(selected)selected.focus();return;}
      if(event.target.closest('[data-recipe-inspect]')&&createdObjectId){show({objectId:createdObjectId},'properties');return;}
      if(!event.target.closest('[data-recipe-add]')||writing||!selectedRecipe)return;
      writing=true;recipeControls();
      try{await editor.addRecipe(selectedRecipe);}catch(error){panel.querySelector('[data-edit-status]').textContent=errorText(error);}
      finally{writing=false;recipeControls();}
    });
    panel.addEventListener('keydown',function(event){
      // Let the existing rack wizard own its draft/keyboard behavior.
      if(editorRoot.querySelector('.wh-wizard'))return;
      const typing=event.target.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName);
      if(event.code==='KeyB'&&!typing&&!event.ctrlKey&&!event.altKey&&!event.metaKey){event.preventDefault();if(!event.repeat&&!editor.hasDraft()){if(view==='recipes')close(true);else show(null,'recipes');}return;}
      if(event.key==='Escape'){event.preventDefault();close(false);return;}
      if(event.key!=='Tab')return;
      const controls=Array.from(panel.querySelectorAll('button,input,select,textarea,summary,[tabindex]'))
        .filter(control=>!control.disabled&&!control.hidden&&control.getClientRects().length&&control.getAttribute('tabindex')!=='-1');
      const first=controls[0],last=controls[controls.length-1];
      if(!controls.includes(document.activeElement)||event.shiftKey&&document.activeElement===first||!event.shiftKey&&document.activeElement===last){event.preventDefault();(event.shiftKey?last:first).focus();}
    });
    window.addEventListener('pagehide',()=>close(false,true));
    function show(scope,nextView){
        if(writing||editor.isBusy()||editor.hasDraft())return;
        const nextId=options.getWorkspaceId();if(!nextId)return;
        if(workspaceId!==nextId){editor.clearHistory();workspaceId=nextId;}
        const nextBase=JSON.stringify(options.getLayout());if(baseline!==null&&baseline!==nextBase)editor.clearHistory();
        baseline=nextBase;open=true;epoch++;options.walk.pause();options.walkRoot.inert=true;panel.hidden=false;
        view=nextView;wasDraft=false;recipeSaved=false;createdObjectId=null;
        panel.classList.toggle('is-recipe-menu',view==='recipes');recipesRoot.hidden=view!=='recipes';editorRoot.hidden=view==='recipes';
        panel.querySelector('#walk-edit-title').textContent=view==='recipes'?(de()?'Rundgang · Rezepte (B)':'Walk · Recipes (B)'):(de()?'Rundgang · Lager bearbeiten':'Walk · Edit warehouse');
        panel.querySelector('[data-edit-close]').textContent=de()?'Schließen / pausieren':'Close / pause';
        panel.querySelector('[data-edit-resume]').textContent=running()?(de()?'Zurück mit Mausblick':'Return with mouse look'):(de()?'Zurück zur Vorbereitung':'Back to preparation');
        panel.querySelector('[data-edit-status]').textContent=view==='recipes'?(de()?'Rezept wählen und hinzufügen.':'Choose a recipe and add it.'):(de()?'Änderungen werden im aktuellen Workspace gespeichert.':'Changes are saved in the current workspace.');
        if(view==='recipes')initRecipes();
        editor.selectScope(scope);(view==='recipes'?(recipesRoot.querySelector('[data-recipe][aria-pressed="true"]')||recipesRoot.querySelector('[data-recipe-search]')):panel.querySelector('[data-edit-close]')).focus();
    }
    return {
      open:scope=>show(scope,'properties'),openRecipes:()=>show(null,'recipes'),
      checkWorkspace:function(){if(workspaceId&&workspaceId!==options.getWorkspaceId())close(false,true);},
      refresh:function(){editor.clearHistory();baseline=JSON.stringify(options.getLayout());if(open)editor.render();},
      close:function(){close(false,true);},isOpen:()=>open
    };
  }
  return {create:create,directFields:directFields,proposeDirect:proposeDirect,formatDirect:formatDirect,structureMenu:structureMenu};
}));
