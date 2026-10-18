(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.OpenSlottingWarehouseWalk=factory();
}(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const TEXT={
    de:{title:'Lager-Rundgang',intro:'Lager aus Augenhöhe erkunden und modellierte Stellplätze auswerten.',search:'Stellplatzcode suchen',find:'Finden',go:'Vor Stellplatz stellen',reset:'Startposition',look:'Mausblick aktivieren',info:'Details ein-/ausblenden',
      eye:'Augenhöhe (mm)',speed:'Gehtempo',slow:'Langsam',normal:'Normal',fast:'Schnell',map:'Minikarte · Startposition anklicken',view:'Lager aus Augenhöhe',
      hint:'Ansicht anklicken, dann WASD / Pfeiltasten zum Gehen. Maus ziehen zum Umsehen. Esc pausiert. Auf der Minikarte eine freie Startposition wählen.',
      colors:'Farben',assignments:'Zuordnung',usage:'Nutzung',demand:'Nachfrage',select:'Stellplatz anklicken oder exakten Code suchen.',noCode:'Ohne Code',none:'Keine aktuelle Artikelzuordnung.',
      basis:'Aktuelle Artikelzuordnung ist kein Bestandsnachweis. Nachfrage bezieht sich auf die aktuell zugeordneten Artikel in den gesamten geprüften Daten, nicht auf historische Stellplatzbesuche.',
      lines:'Auftragszeilen',quantity:'Menge',days:'Aktive Tage',article:'Artikel öffnen',notFound:'Kein Stellplatz mit genau diesem Code gefunden.',blocked:'Hier ist kein freier Standpunkt erreichbar.',
      unavailable:'WebGL2 ist nicht verfügbar. Suche, Minikarte und Stellplatzdetails bleiben nutzbar.',noLayout:'Noch kein Lager modelliert. Zuerst im 3D-Editor ein Regal anlegen.',
      unassigned:'Nicht zugewiesen',picking:'Kommissionierung',reserve:'Reserve',bay:'Fach',level:'Ebene',ground:'Boden (Ebene 0)',place:'Stellplatz',size:'Breite × Tiefe',height:'Höhe über Boden',
      unknown:'Unbekannt',coverage:'Datenabdeckung prüfen',lookFailed:'Mausblick nicht verfügbar. Ziehen mit gedrückter Maustaste bleibt möglich.',paused:'Bewegung pausiert.',position:'Position',matched:'Artikel zugeordnet',coded:'Code ohne Artikelzuordnung',empty:'Ohne Code',
      demandLegend:'Auftragszeilen: blau = niedrig, orange = hoch · grau = unbekannt',previous:'A',current:'B',comparison:'Periodenvergleich der aktuell zugeordneten Artikel'},
    en:{title:'Warehouse walk',intro:'Explore the warehouse at eye level and inspect modeled locations.',search:'Find location code',find:'Find',go:'Stand in front of location',reset:'Start position',look:'Enable mouse look',info:'Show/hide details',
      eye:'Eye height (mm)',speed:'Walking speed',slow:'Slow',normal:'Normal',fast:'Fast',map:'Minimap · click a start position',view:'Warehouse at eye level',
      hint:'Click the view, then use WASD / arrow keys to walk. Drag to look around. Esc pauses. Choose a free starting point on the minimap.',
      colors:'Colors',assignments:'Assignments',usage:'Usage',demand:'Demand',select:'Click a location or search its exact code.',noCode:'No code',none:'No current article assignment.',
      basis:'Current article assignment is not evidence of stock. Demand describes the currently assigned articles across all validated data, not historical location visits.',
      lines:'Order lines',quantity:'Quantity',days:'Active days',article:'Open article',notFound:'No location has this exact code.',blocked:'No free standing position is available here.',
      unavailable:'WebGL2 is unavailable. Search, minimap and location details remain available.',noLayout:'No warehouse modeled yet. First create a rack in the warehouse editor.',
      unassigned:'Unassigned',picking:'Picking',reserve:'Reserve',bay:'Bay',level:'Level',ground:'Ground (level 0)',place:'Location',size:'Width × depth',height:'Height above floor',
      unknown:'Unknown',coverage:'Check data coverage',lookFailed:'Mouse look is unavailable. Drag with the mouse button to look around.',paused:'Movement paused.',position:'Position',matched:'Article assigned',coded:'Code without article assignment',empty:'No code',
      demandLegend:'Order lines: blue = low, orange = high · gray = unknown',previous:'A',current:'B',comparison:'Period comparison of currently assigned articles'}
  };
  function esc(value){return String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
  function create(options){
    const root=options.root,model=options.model,walk=window.OpenSlottingWarehouseWalkModel;
    const canvas=document.createElement('canvas'),map=document.createElement('canvas'),mapBase=document.createElement('canvas');
    canvas.className='wh-walk-canvas';canvas.tabIndex=0;map.className='wh-walk-map';map.width=240;map.height=160;map.tabIndex=0;
    const camera={x:0,z:0,eye:1.7,yaw:Math.PI,pitch:0};
    let scene=null,info=null,workspaceId=null,selectedId=null,search='',message='',colorMode='assignments',speed=1.4,details=true;
    let active=false,request=null,lastTime=0,drag=null,labels=[],labelTime=-Infinity;
    const keys=new Set();
    const renderer=window.OpenSlottingWarehouseWalkRenderer.create(canvas,walk,{
      lost:function(){stop();message=text().unavailable;labelTime=-Infinity;
        const overlay=root.querySelector('.wh-walk-labels');if(overlay)overlay.innerHTML='';
        const look=root.querySelector('[data-walk-action="look"]');if(look)look.disabled=true;updatePanel();},
      restored:function(){message='';labelTime=-Infinity;
        const look=root.querySelector('[data-walk-action="look"]');if(look)look.disabled=!canvas.requestPointerLock;
        updatePanel();schedule();}
    });
    function text(){return TEXT[options.getLanguage()==='de'?'de':'en'];}
    function visible(){return active&&options.isVisible()&&!document.hidden;}
    function stop(){keys.clear();drag=null;lastTime=0;if(request!==null){window.cancelAnimationFrame(request);request=null;}}
    function setActive(value){active=Boolean(value);if(!active){stop();if(document.pointerLockElement===canvas)document.exitPointerLock();}else schedule();}
    function tell(value){message=value;const output=root.querySelector('[data-walk-message]');if(output){
      const fallback=!renderer||!renderer.available()?text().unavailable:'';
      output.textContent=fallback+(fallback&&value&&value!==fallback?' · ':'')+(value===fallback?'':value);
    }}
    function origin(){return {x:camera.x,y:camera.eye,z:camera.z};}
    function number(value){return Number.isFinite(value)?value.toLocaleString(options.getLanguage()==='de'?'de-DE':'en-US'):text().unknown;}
    function refresh(){
      const layout=options.getLayout(),registry=options.getRegistry();
      const articles=options.getArticles?options.getArticles():[];
      const matches=model.matchArticles(layout,registry),slots=model.listLocations(layout);
      const byArticle=new Map((articles||[]).map(a=>[a.article_id,a]));
      const comparison=options.getComparison?options.getComparison():null;
      info={layout:layout,slots:slots,matches:matches,articles:byArticle,comparison:comparison,
        compared:new Map((comparison&&comparison.articles||[]).map(a=>[a.article_id,a]))};
      const boxes=window.OpenSlottingWarehouseScene.buildBoxes(model,layout,matches,{colorMode:colorMode==='usage'?'usage':'structure'});
      const demand=new Map();let max=0;
      matches.bySlot.forEach(function(assigned,id){
        const rows=assigned.map(a=>byArticle.get(a.articleId));
        if(rows.length&&rows.every(a=>a&&Number.isFinite(a.order_line_count))){const count=rows.reduce((sum,a)=>sum+a.order_line_count,0);demand.set(id,count);max=Math.max(max,count);}
      });
      if(colorMode==='demand')boxes.forEach(function(box){if(box.kind!=='location')return;
        const id=box.slotRef.slotId;if(!demand.has(id)){box.color='#8795a4';return;}
        const heat=max?Math.log1p(demand.get(id))/Math.log1p(max):0;
        box.color='#'+[Math.round(55+187*heat),Math.round(153-14*heat),Math.round(210-157*heat)].map(n=>n.toString(16).padStart(2,'0')).join('');
      });
      scene=walk.createWorld(boxes);if(renderer)renderer.setWorld(scene);
      if(!scene.positions.has(selectedId))selectedId=null;
      if(renderer)renderer.selection(selectedId);labelTime=-Infinity;drawMapBase();
    }
    function resetPosition(){
      const rack=info.layout.objects.find(o=>model.RACK_TYPES.includes(o.type));
      let desired={x:0,z:0};
      if(rack){const f=model.rackFront(rack),angle=rack.rotation*Math.PI/180;
        desired={x:f.center.x/1000-Math.sin(angle)*2.8,z:f.center.z/1000+Math.cos(angle)*2.8};}
      const free=walk.freePosition(scene,desired,camera.eye);
      if(!free){tell(text().blocked);return false;}
      camera.x=free.x;camera.z=free.z;camera.pitch=0;
      if(rack){const f=model.objectFootprint(rack),angle=rack.rotation*Math.PI/180;
        camera.yaw=Math.atan2(rack.x/1000+Math.cos(angle)*f.width/2000-Math.sin(angle)*f.depth/2000-camera.x,
          rack.z/1000+Math.sin(angle)*f.width/2000+Math.cos(angle)*f.depth/2000-camera.z);}
      tell('');schedule();return true;
    }
    function standAtSelection(){
      const item=scene.positions.get(selectedId);if(!item)return;
      const next=walk.approach(scene,item,camera.eye);if(!next){tell(text().blocked);return;}
      Object.assign(camera,next);stop();tell('');schedule();
    }
    function select(id){if(!scene.positions.has(id))return;selectedId=id;if(renderer)renderer.selection(id);message='';updatePanel();labelTime=-Infinity;schedule();}
    function updatePanel(){
      const t=text(),slot=info.slots.find(s=>s.slotId===selectedId),item=scene.positions.get(selectedId);
      const assigned=slot?info.matches.bySlot.get(slot.slotId)||[]:[];
      const panel=root.querySelector('.wh-walk-inspector');if(!panel)return;
      panel.hidden=!details;
      panel.innerHTML='<h4>'+esc(t.title)+'</h4>'+(slot?'<h3>'+esc(slot.code||t.noCode)+'</h3><p>'+esc(slot.objectName)+' · '+esc(t.bay)+' '+(slot.bayIndex+1)+' · '+
        esc(slot.ground?t.ground:t.level+' '+(slot.levelIndex+1))+' · '+esc(t.place)+' '+(slot.positionIndex+1)+'</p><p>'+esc(t[slot.usage]||slot.usage)+'</p>'+
        '<dl><dt>'+esc(t.size)+'</dt><dd>'+slot.placement.width+' × '+slot.placement.depth+' mm</dd><dt>'+esc(t.height)+'</dt><dd>'+model.locationScope(info.layout,slot.zoneId).y+' mm</dd></dl>'+
        '<button type="button" data-walk-action="go">'+esc(t.go)+'</button>'+
        (assigned.length?assigned.map(function(a){const metric=info.articles.get(a.articleId),compared=info.compared.get(a.articleId);
          return '<section class="wh-walk-article"><strong>'+esc(a.articleId)+'</strong><p>'+esc(a.name)+'</p>'+
            (metric?'<dl><dt>'+esc(t.lines)+'</dt><dd>'+number(metric.order_line_count)+'</dd><dt>'+esc(t.quantity)+'</dt><dd>'+esc(options.formatQuantity?options.formatQuantity(metric.total_quantity):t.unknown)+'</dd><dt>'+esc(t.days)+'</dt><dd>'+number(metric.active_days)+'</dd></dl>':'<p>'+esc(t.unknown)+'</p>')+
            (compared?'<p>'+esc(t.comparison)+': '+esc(info.comparison.settings.periodA.name)+' '+number(compared.period_a.order_line_count)+' → '+esc(info.comparison.settings.periodB.name)+' '+number(compared.period_b.order_line_count)+' '+esc(t.lines)+'</p>':'')+
            (metric&&options.openArticle?'<button type="button" data-walk-article="'+esc(a.articleId)+'">'+esc(t.article)+'</button>':'')+'</section>';
        }).join(''):'<p>'+esc(t.none)+'</p>'):'<p>'+esc(t.select)+'</p>')+'<p class="wh-scope-hint">'+esc(t.basis)+'</p>'+
          (options.canCoverage&&options.canCoverage()?'<button type="button" data-walk-action="coverage">'+esc(t.coverage)+'</button>':'');
      const go=root.querySelector('[data-walk-action="go"]');if(go)go.disabled=!renderer||!renderer.available();
      tell(message);
    }
    function drawMapBase(){
      mapBase.width=map.width;mapBase.height=map.height;const ctx=mapBase.getContext('2d');if(!ctx)return;
      ctx.fillStyle='#101b23';ctx.fillRect(0,0,map.width,map.height);const b=scene.bounds;
      info.layout.objects.forEach(function(object){const points=model.footprintCorners(object).map(p=>mapPoint(p.x/1000,p.z/1000));
        ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);points.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));ctx.closePath();
        ctx.fillStyle=object.type==='aisle'?'#285963':model.RACK_TYPES.includes(object.type)?'#4d687b':'#697078';ctx.fill();ctx.strokeStyle='#a4bbc4';ctx.stroke();
      });
    }
    function mapScale(){const b=scene.bounds;return Math.min((map.width-16)/(b.maxX-b.minX),(map.height-16)/(b.maxZ-b.minZ));}
    function mapPoint(x,z){const b=scene.bounds,scale=mapScale();return {x:map.width/2+(x-(b.minX+b.maxX)/2)*scale,y:map.height/2+(z-(b.minZ+b.maxZ)/2)*scale};}
    function paintMap(){
      const ctx=map.getContext('2d');if(!ctx)return;ctx.drawImage(mapBase,0,0);const p=mapPoint(camera.x,camera.z);
      ctx.fillStyle='#fff2a3';ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff2a3';ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+Math.sin(camera.yaw)*16,p.y+Math.cos(camera.yaw)*16);ctx.stroke();
      const item=scene.positions.get(selectedId);if(item){const v=walk.world(item,item.x+item.width/2,0,item.z+item.depth/2),q=mapPoint(v.x,v.z);ctx.strokeStyle='#79f2de';ctx.strokeRect(q.x-4,q.y-4,8,8);}
    }
    function paintLabels(time){
      const width=canvas.clientWidth,height=canvas.clientHeight;
      if(time-labelTime>180){
        labelTime=time;
        labels=Array.from(scene.positions.values()).map(function(item){const p=walk.world(item,item.x+item.width/2,item.y+.08,item.z+item.depth);
          return {item:item,point:p,distance:Math.hypot(p.x-camera.x,p.y-camera.eye,p.z-camera.z)};})
          .filter(a=>a.distance<18).sort((a,b)=>a.distance-b.distance).slice(0,24);
        const overlay=root.querySelector('.wh-walk-labels');overlay.innerHTML='';
        labels.forEach(function(label){const button=document.createElement('button');button.type='button';button.dataset.walkSlot=label.item.slotId;
          const slot=info.slots.find(s=>s.slotId===label.item.slotId);button.textContent=slot.code||text().bay+' '+(slot.bayIndex+1)+' · '+(slot.ground?'0':slot.levelIndex+1)+' · '+(slot.positionIndex+1);
          overlay.appendChild(button);label.element=button;
        });
      }
      const occupied=[];
      labels.forEach(function(label){const p=walk.project(camera,label.point,width,height);let show=Boolean(p&&p.x>45&&p.x<width-45&&p.y>20&&p.y<height-30);
        if(show){const d={x:label.point.x-camera.x,y:label.point.y-camera.eye,z:label.point.z-camera.z},size=Math.hypot(d.x,d.y,d.z);
          const hit=walk.raycast(scene,origin(),{x:d.x/size,y:d.y/size,z:d.z/size},true);show=!hit||hit.distance>size-.06;
          if(occupied.some(q=>Math.abs(q.x-p.x)<105&&Math.abs(q.y-p.y)<26))show=false;
        }
        label.element.hidden=!show;if(show){occupied.push(p);label.element.style.left=p.x+'px';label.element.style.top=p.y+'px';label.element.setAttribute('aria-pressed',String(label.item.slotId===selectedId));}
      });
    }
    function paint(time){
      if(!scene)return;if(renderer&&renderer.available()){renderer.render(camera);paintLabels(time);}
      paintMap();const output=root.querySelector('[data-walk-position]');if(output)output.textContent=text().position+': X '+camera.x.toFixed(1)+' m · Z '+camera.z.toFixed(1)+' m';
    }
    function tick(time){
      request=null;if(!visible()){stop();return;}const delta=lastTime?Math.min(.05,(time-lastTime)/1000):.016;lastTime=time;
      const forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);
      const side=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),size=Math.hypot(forward,side)||1;
      if(forward||side)walk.move(scene,camera,(Math.sin(camera.yaw)*forward-Math.cos(camera.yaw)*side)*speed*delta/size,
        (Math.cos(camera.yaw)*forward+Math.sin(camera.yaw)*side)*speed*delta/size);
      paint(time);if(keys.size)schedule();else lastTime=0;
    }
    function schedule(){if(visible()&&request===null)request=window.requestAnimationFrame(tick);}
    function render(){
      const id=options.getWorkspaceId(),changed=id!==workspaceId;workspaceId=id;stop();
      if(changed){selectedId=null;search='';message='';camera.eye=1.7;speed=1.4;colorMode='assignments';details=true;}
      refresh();if(changed||!walk.canStand(scene,camera,camera.eye))resetPosition();const t=text();
      root.classList.add('wh-walk-root');
      root.innerHTML='<div class="wh-header"><div><p class="wh-eyebrow">OpenSlotting · 3D</p><h3>'+esc(t.title)+'</h3><p>'+esc(t.intro)+'</p></div></div>'+
        '<div class="wh-walk-toolbar"><label>'+esc(t.search)+'<input type="search" data-walk-search maxlength="80" value="'+esc(search)+'"></label><button type="button" data-walk-action="find">'+esc(t.find)+'</button>'+
        '<button type="button" data-walk-action="reset">'+esc(t.reset)+'</button><button type="button" data-walk-action="look">'+esc(t.look)+'</button>'+
        '<label>'+esc(t.eye)+'<input type="number" data-walk-eye min="1000" max="2200" step="50" value="'+Math.round(camera.eye*1000)+'"></label>'+
        '<label>'+esc(t.speed)+'<select data-walk-speed>'+[[.7,t.slow],[1.4,t.normal],[2.4,t.fast]].map(a=>'<option value="'+a[0]+'"'+(a[0]===speed?' selected':'')+'>'+esc(a[1])+'</option>').join('')+'</select></label>'+
        '<label>'+esc(t.colors)+'<select data-walk-colors>'+['assignments','usage','demand'].map(key=>'<option value="'+key+'"'+(key===colorMode?' selected':'')+'>'+esc(t[key])+'</option>').join('')+'</select></label>'+
        '<button type="button" data-walk-action="details" aria-expanded="'+details+'">'+esc(t.info)+'</button></div>'+
        '<div class="wh-walk-body"><div class="wh-walk-viewport"><div class="wh-walk-labels"></div><div class="wh-walk-map-wrap"><small>'+esc(t.map)+'</small></div><span class="wh-walk-crosshair" aria-hidden="true">+</span></div><aside class="wh-walk-inspector wh-card"></aside></div>'+
        '<div class="wh-walk-footer"><p id="warehouse-walk-hint">'+esc(t.hint)+'</p><output data-walk-position></output><p class="wh-legend">'+esc(colorMode==='demand'?t.demandLegend:colorMode==='usage'?[t.unassigned,t.picking,t.reserve].join(' · '):[t.matched,t.coded,t.empty].join(' · '))+'</p><p role="status" aria-live="polite" data-walk-message></p></div>';
      root.querySelector('.wh-walk-viewport').prepend(canvas);root.querySelector('.wh-walk-map-wrap').appendChild(map);
      canvas.setAttribute('aria-label',t.view);canvas.setAttribute('aria-describedby','warehouse-walk-hint');map.setAttribute('aria-label',t.map);map.setAttribute('role','img');
      if(!renderer||!renderer.available())message=t.unavailable;else if(!info.layout.objects.length)message=t.noLayout;
      root.querySelector('[data-walk-action="look"]').disabled=!renderer||!renderer.available()||!canvas.requestPointerLock;
      updatePanel();active=options.isVisible();paint(0);schedule();
    }
    function find(){const slot=info.slots.find(s=>search.trim()&&s.code===search.trim());if(!slot){tell(text().notFound);return;}select(slot.slotId);}
    root.addEventListener('input',event=>{if(event.target.hasAttribute('data-walk-search'))search=event.target.value;});
    root.addEventListener('change',function(event){
      if(event.target.hasAttribute('data-walk-eye')){const value=Number(event.target.value)/1000;
        if(value>=1&&value<=2.2&&walk.canStand(scene,camera,value)){camera.eye=value;schedule();}else {event.target.value=Math.round(camera.eye*1000);tell(text().blocked);}}
      if(event.target.hasAttribute('data-walk-speed')){const value=Number(event.target.value);if([.7,1.4,2.4].includes(value))speed=value;}
      if(event.target.hasAttribute('data-walk-colors')){colorMode=['assignments','usage','demand'].includes(event.target.value)?event.target.value:'assignments';render();}
    });
    root.addEventListener('click',async function(event){
      const slot=event.target.closest('[data-walk-slot]');if(slot){select(slot.dataset.walkSlot);return;}
      const article=event.target.closest('[data-walk-article]');if(article&&options.openArticle){stop();options.openArticle(article.dataset.walkArticle);return;}
      const button=event.target.closest('[data-walk-action]');if(!button)return;
      const action=button.dataset.walkAction;
      if(action==='find')find();else if(action==='go')standAtSelection();else if(action==='reset'){stop();resetPosition();}
      else if(action==='coverage'&&options.openCoverage){stop();options.openCoverage();}
      else if(action==='details'){details=!details;button.setAttribute('aria-expanded',String(details));updatePanel();schedule();}
      else if(action==='look'){try{canvas.focus({preventScroll:true});await canvas.requestPointerLock();}catch(_){tell(text().lookFailed);}}
    });
    root.addEventListener('keydown',function(event){
      if(event.key==='Enter'&&event.target.hasAttribute('data-walk-search')){event.preventDefault();find();return;}
      if(event.key==='Escape'){stop();tell(text().paused);if(document.pointerLockElement===canvas)document.exitPointerLock();return;}
      if(event.target!==canvas||event.ctrlKey||event.altKey||event.metaKey||!renderer||!renderer.available())return;
      if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)){event.preventDefault();keys.add(event.code);schedule();}
    });
    window.addEventListener('keyup',event=>keys.delete(event.code));window.addEventListener('blur',stop);
    document.addEventListener('visibilitychange',function(){if(document.hidden)stop();else schedule();});
    document.addEventListener('pointerlockchange',function(){stop();});
    canvas.addEventListener('blur',stop);
    canvas.addEventListener('pointerdown',function(event){if(event.button!==0||!renderer||!renderer.available())return;event.preventDefault();canvas.focus({preventScroll:true});drag={x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,moved:false};canvas.setPointerCapture(event.pointerId);});
    canvas.addEventListener('pointermove',function(event){if(!visible())return;
      const locked=document.pointerLockElement===canvas;if(!locked&&!drag)return;
      const dx=locked?event.movementX:event.clientX-drag.x,dy=locked?event.movementY:event.clientY-drag.y;
      if(drag){if(Math.abs(event.clientX-drag.startX)+Math.abs(event.clientY-drag.startY)>4)drag.moved=true;drag.x=event.clientX;drag.y=event.clientY;}
      camera.yaw=(camera.yaw-dx*.004)%(Math.PI*2);camera.pitch=Math.max(-1.35,Math.min(1.35,camera.pitch+dy*.004));schedule();
    });
    canvas.addEventListener('pointerup',function(event){if(drag&&!drag.moved){const rect=canvas.getBoundingClientRect(),direction=walk.ray(camera,(event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2,rect.width/rect.height),hit=walk.raycast(scene,origin(),direction);
        if(hit&&hit.item.slotId)select(hit.item.slotId);}drag=null;});
    canvas.addEventListener('pointercancel',()=>{drag=null;});canvas.addEventListener('lostpointercapture',()=>{drag=null;});
    map.addEventListener('click',function(event){const rect=map.getBoundingClientRect(),b=scene.bounds,scale=mapScale();
      const desired={x:((event.clientX-rect.left)*map.width/rect.width-map.width/2)/scale+(b.minX+b.maxX)/2,z:((event.clientY-rect.top)*map.height/rect.height-map.height/2)/scale+(b.minZ+b.maxZ)/2};
      if(!walk.canStand(scene,desired,camera.eye)){tell(text().blocked);return;}stop();camera.x=desired.x;camera.z=desired.z;tell('');canvas.focus({preventScroll:true});schedule();});
    window.addEventListener('resize',()=>{labelTime=-Infinity;schedule();});
    if(window.ResizeObserver)new window.ResizeObserver(()=>{labelTime=-Infinity;schedule();}).observe(root);
    return {render:render,setActive:setActive};
  }
  return {create:create};
}));
