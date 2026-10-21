(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.OpenSlottingWarehouseWalk=factory();
}(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const TEXT={
    de:{interact:'Interagieren',noTarget:'Kein erreichbarer Stellplatz im Fadenkreuz (max. 6 m).',articleDetails:'Artikel am Stellplatz',articleOutside:'Artikelansicht öffnen (Rundgang verlassen)',backToWalk:'Zurück zum Rundgang',closeDetails:'Details schließen',chooseArticle:'Artikel auswählen',overview:'Kennzahlen',master:'Stammdaten',periods:'Periodenvergleich',orders:'Aufträge',customers:'Kunden',sources:'Quelldateien',allData:'Alle geprüften Daten · aktuelle Artikelzuordnung',masterName:'Artikelbezeichnung',currentLocation:'Aktueller Stellplatz',unit:'Mengeneinheit',pack:'Menge pro Verkaufseinheit',vat:'Steuersatz',evidence:'Quellnachweise',noComparison:'Noch kein Periodenvergleich berechnet.',mode:'Bewegung',walk:'Gehen',fly:'Freiflug (ohne Kollision)',jump:'Springen',crouch:'Ducken',standing:'Stehend',crouched:'Geduckt',standBlocked:'Aufrichten blockiert',heightView:'Sichthöhe',flightHint:'Freiflug ohne Kollision · WASD: in Blickrichtung · Leertaste: steigen · C: sinken · Maus: umsehen · E: interagieren · Esc: pausieren',walkHint:'WASD: gehen · Leertaste: springen · C halten: ducken · Maus: umsehen · E: interagieren · Esc: pausieren',fov:'Sichtfeld (vertikal)',fovReset:'Sichtfeld zurücksetzen',fovFailed:'Sichtfeld konnte nicht gespeichert werden. Der gespeicherte Wert wurde wiederhergestellt.',dragResume:'Weiter ohne Mausblick',fullscreen:'Vollbild starten',exitFullscreen:'Vollbild verlassen',resume:'Weiter mit Mausblick',pause:'Pause / Bedienen',controls:'Bedienelemente',toggleMap:'Minikarte',fullscreenFailed:'Vollbild ist nicht verfügbar. Die normale Ansicht bleibt nutzbar.',immersiveHint:'WASD: gehen · Maus: umsehen · Klick: Stellplatz wählen · Esc: pausieren',title:'Lager-Rundgang',intro:'Lager aus Augenhöhe erkunden und modellierte Stellplätze auswerten.',search:'Stellplatzcode suchen',find:'Finden',go:'Vor Stellplatz stellen',reset:'Startposition',look:'Mausblick aktivieren',info:'Details ein-/ausblenden',
      eye:'Augenhöhe (mm)',speed:'Geschwindigkeit (m/s)',slow:'Langsam',normal:'Normal',fast:'Schnell',map:'Minikarte · Startposition anklicken',view:'Lager aus Augenhöhe',
      hint:'Ansicht anklicken, dann steuern. Maus ziehen zum Umsehen. Esc pausiert. Auf der Minikarte eine freie Startposition wählen.',
      colors:'Farben',assignments:'Zuordnung',usage:'Nutzung',demand:'Nachfrage',select:'Stellplatz anklicken oder exakten Code suchen.',noCode:'Ohne Code',none:'Keine aktuelle Artikelzuordnung.',
      basis:'Aktuelle Artikelzuordnung ist kein Bestandsnachweis. Nachfrage bezieht sich auf die aktuell zugeordneten Artikel in den gesamten geprüften Daten, nicht auf historische Stellplatzbesuche.',
      lines:'Auftragszeilen',quantity:'Menge',days:'Aktive Tage',article:'Artikel öffnen',notFound:'Kein Stellplatz mit genau diesem Code gefunden.',blocked:'Hier ist kein freier Standpunkt erreichbar.',
      unavailable:'WebGL2 ist nicht verfügbar. Suche, Minikarte und Stellplatzdetails bleiben nutzbar.',noLayout:'Noch kein Lager modelliert. Zuerst im 3D-Editor ein Regal anlegen.',
      unassigned:'Nicht zugewiesen',picking:'Kommissionierung',reserve:'Reserve',bay:'Fach',level:'Ebene',ground:'Boden (Ebene 0)',place:'Stellplatz',size:'Breite × Tiefe',height:'Höhe über Boden',
      unknown:'Unbekannt',coverage:'Datenabdeckung prüfen',lookFailed:'Mausblick nicht verfügbar. Ziehen mit gedrückter Maustaste bleibt möglich.',paused:'Bewegung pausiert.',position:'Position',matched:'Artikel zugeordnet',coded:'Code ohne Artikelzuordnung',empty:'Ohne Code',
      demandLegend:'Auftragszeilen: blau = niedrig, orange = hoch · grau = unbekannt',previous:'A',current:'B',comparison:'Periodenvergleich der aktuell zugeordneten Artikel'},
    en:{interact:'Interact',noTarget:'No reachable location under the crosshair (max. 6 m).',articleDetails:'Articles at location',articleOutside:'Open article view (leave walk)',backToWalk:'Back to walk',closeDetails:'Close details',chooseArticle:'Select article',overview:'Metrics',master:'Master data',periods:'Period comparison',orders:'Orders',customers:'Customers',sources:'Source files',allData:'All validated data · current article assignment',masterName:'Article name',currentLocation:'Current location',unit:'Unit of measure',pack:'Quantity per selling unit',vat:'VAT rate',evidence:'Source evidence',noComparison:'No period comparison has been calculated.',mode:'Movement',walk:'Walk',fly:'Free flight (no collision)',jump:'Jump',crouch:'Crouch',standing:'Standing',crouched:'Crouched',standBlocked:'Standing blocked',heightView:'View height',flightHint:'Free flight without collision · WASD: follow view · Space: ascend · C: descend · Mouse: look · E: interact · Esc: pause',walkHint:'WASD: walk · Space: jump · Hold C: crouch · Mouse: look · E: interact · Esc: pause',fov:'Field of view (vertical)',fovReset:'Reset field of view',fovFailed:'Field of view could not be saved. The saved value was restored.',dragResume:'Resume without mouse look',fullscreen:'Enter fullscreen',exitFullscreen:'Exit fullscreen',resume:'Resume mouse look',pause:'Pause / interact',controls:'Controls',toggleMap:'Minimap',fullscreenFailed:'Fullscreen is unavailable. The normal view remains available.',immersiveHint:'WASD: walk · Mouse: look · Click: select location · Esc: pause',title:'Warehouse walk',intro:'Explore the warehouse at eye level and inspect modeled locations.',search:'Find location code',find:'Find',go:'Stand in front of location',reset:'Start position',look:'Enable mouse look',info:'Show/hide details',
      eye:'Eye height (mm)',speed:'Speed (m/s)',slow:'Slow',normal:'Normal',fast:'Fast',map:'Minimap · click a start position',view:'Warehouse at eye level',
      hint:'Click the view to use movement keys. Drag to look around. Esc pauses. Choose a free starting point on the minimap.',
      colors:'Colors',assignments:'Assignments',usage:'Usage',demand:'Demand',select:'Click a location or search its exact code.',noCode:'No code',none:'No current article assignment.',
      basis:'Current article assignment is not evidence of stock. Demand describes the currently assigned articles across all validated data, not historical location visits.',
      lines:'Order lines',quantity:'Quantity',days:'Active days',article:'Open article',notFound:'No location has this exact code.',blocked:'No free standing position is available here.',
      unavailable:'WebGL2 is unavailable. Search, minimap and location details remain available.',noLayout:'No warehouse modeled yet. First create a rack in the warehouse editor.',
      unassigned:'Unassigned',picking:'Picking',reserve:'Reserve',bay:'Bay',level:'Level',ground:'Ground (level 0)',place:'Location',size:'Width × depth',height:'Height above floor',
      unknown:'Unknown',coverage:'Check data coverage',lookFailed:'Mouse look is unavailable. Drag with the mouse button to look around.',paused:'Movement paused.',position:'Position',matched:'Article assigned',coded:'Code without article assignment',empty:'No code',
      demandLegend:'Order lines: blue = low, orange = high · gray = unknown',previous:'A',current:'B',comparison:'Period comparison of currently assigned articles'}
  };
  function esc(value){return String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
  function interactionHtml(data){
    const t=TEXT[data.language==='de'?'de':'en'],slot=data.slot,assigned=data.assigned||[];
    const selected=assigned.find(a=>a.articleId===data.articleId),metric=data.metric,master=data.master||{},fixed=master.master_data||{};
    const value=v=>v===undefined||v===null||v===''?t.unknown:String(v);
    const count=v=>Number.isFinite(v)?v.toLocaleString(data.language==='de'?'de-DE':'en-US'):t.unknown;
    const quantity=v=>v===undefined||v===null?t.unknown:data.formatQuantity?data.formatQuantity(v):String(v);
    const cards=items=>'<div class="wh-walk-metrics">'+items.map(a=>'<article><span>'+esc(a[0])+'</span><strong>'+esc(a[1])+'</strong></article>').join('')+'</div>';
    let body='';
    if(!selected)body='<p class="wh-walk-empty">'+esc(t.none)+'</p>';
    else if(data.tab==='master'){
      const items=[[t.masterName,value(fixed.article_name||selected.name)],[t.currentLocation,value(fixed.location)],
        [t.unit,value(fixed.unit_of_measure)],[t.pack,quantity(fixed.quantity_per_sales_unit)],[t.vat,value(fixed.vat_rate)]];
      const names=new Map((data.customFields||[]).map(f=>[f.id,f.name])),seen=new Set();
      (master.value_provenance||[]).forEach(p=>{
        if(p.source_type!=='article-master'||!p.field||!p.field.startsWith('custom:')||seen.has(p.field))return;
        seen.add(p.field);items.push([names.get(p.field.slice(7))||p.field.slice(7),value(p.value)]);
      });
      body=cards(items);
      const refs=master.master_row_refs||[];
      if(refs.length)body+='<details><summary>'+esc(t.evidence)+' ('+refs.length+')</summary><ul>'+refs.slice(0,20).map(r=>
        '<li>'+esc(r.source_file_label||r.source_file_name||r.source_file_id)+' · '+esc(r.source_line==null?t.unknown:r.source_line)+'</li>').join('')+'</ul>'+(refs.length>20?'<p>20 / '+refs.length+'</p>':'')+'</details>';
    }else if(data.tab==='periods'){
      const comparison=data.comparison,compared=data.compared;
      body=compared&&comparison?'<div class="wh-walk-periods">'+['a','b'].map((side,index)=>{
        const period=compared['period_'+side],settings=comparison.settings[index?'periodB':'periodA'];
        return '<section><h3>'+esc(settings.name)+'</h3>'+cards([[t.lines,count(period&&period.order_line_count)],
          [t.quantity,quantity(period&&period.total_quantity)],[t.days,count(period&&period.active_days)]])+'</section>';
      }).join('')+'</div>':'<p>'+esc(t.noComparison)+'</p>';
    }else body='<p>'+esc(t.allData)+'</p>'+cards([[t.quantity,quantity(metric&&metric.total_quantity)],
      [t.lines,count(metric&&metric.order_line_count)],[t.orders,count(metric&&metric.distinct_orders)],
      [t.customers,count(metric&&metric.distinct_customers)],[t.days,count(metric&&metric.active_days)],
      [t.sources,count(metric&&metric.source_file_count)]]);
    return '<section class="wh-walk-interaction-card"><header><div><p class="wh-eyebrow">'+esc(t.articleDetails)+'</p><h2 id="warehouse-walk-interaction-title">'+esc(slot.code||t.noCode)+'</h2><p>'+esc(slot.objectName)+' · '+esc(t.bay)+' '+(slot.bayIndex+1)+' · '+esc(slot.ground?t.ground:t.level+' '+(slot.levelIndex+1))+' · '+esc(t.place)+' '+(slot.positionIndex+1)+'</p></div>'+
      '<div class="wh-walk-dialog-actions"><button type="button" data-walk-action="interaction-return">'+esc(t.backToWalk)+'</button><button type="button" data-walk-action="interaction-close">'+esc(t.closeDetails)+'</button></div></header>'+
      (assigned.length?'<label class="wh-walk-article-choice">'+esc(t.chooseArticle)+' ('+assigned.length+')<select data-walk-interaction-article>'+assigned.map(a=>'<option value="'+esc(a.articleId)+'"'+(a.articleId===data.articleId?' selected':'')+'>'+esc(a.articleId)+' · '+esc(a.name)+'</option>').join('')+'</select></label>':'')+
      (selected?'<h3>'+esc(selected.articleId)+' · '+esc(selected.name)+'</h3><div class="wh-walk-detail-tabs" role="group" aria-label="'+esc(t.articleDetails)+'">'+['overview','master','periods'].map(tab=>'<button type="button" data-walk-inspect-tab="'+tab+'" aria-pressed="'+(tab===data.tab)+'">'+esc(t[tab])+'</button>').join('')+'</div>':'')+
      '<div class="wh-walk-detail-content">'+body+'</div><footer><p>'+esc(t.basis)+'</p>'+
      (selected&&metric&&data.canOpenArticle?'<button type="button" data-walk-article="'+esc(selected.articleId)+'">'+esc(t.articleOutside)+'</button>':'')+'</footer></section>';
  }
  function create(options){
    const root=options.root,model=options.model,walk=window.OpenSlottingWarehouseWalkModel;
    const canvas=document.createElement('canvas'),map=document.createElement('canvas'),mapBase=document.createElement('canvas');
    canvas.className='wh-walk-canvas';canvas.tabIndex=0;map.className='wh-walk-map';map.width=240;map.height=160;map.tabIndex=0;
    const camera={x:0,z:0,eye:1.7,yaw:Math.PI,pitch:0,fov:walk.DEFAULT_FOV};
    let scene=null,info=null,workspaceId=null,selectedId=null,search='',message='',colorMode='assignments',speed=1.4,details=true;
    let active=false,request=null,lastTime=0,drag=null,labels=[],labelTime=-Infinity;
    let interactionSlotId=null,interactionArticleId=null,interactionTab='overview';
    const inertBefore=new Map();
    let motion=walk.createMotion(),standingEye=1.7,walkSpeed=1.4,flySpeed=5,crouchToggle=false,jumpQueued=false,simulationRunning=false;
    const keys=new Set();
    let savingFov=false,workspaceRevision=0;
    let immersiveRequest=0,immersivePaused=true,showControls=false,mapVisible=true,fullscreenPending=false,mouseLookUnavailable=false;
    const renderer=window.OpenSlottingWarehouseWalkRenderer.create(canvas,walk,{
      lost:function(){pauseImmersive();message=text().unavailable;labelTime=-Infinity;
        const overlay=root.querySelector('.wh-walk-labels');if(overlay)overlay.innerHTML='';
        const look=root.querySelector('[data-walk-action="look"]');if(look)look.disabled=true;updatePanel();},
      restored:function(){message='';labelTime=-Infinity;
        const look=root.querySelector('[data-walk-action="look"]');if(look)look.disabled=!canvas.requestPointerLock;
        updatePanel();schedule();}
    });
    function savedFov(){const prefs=options.getPreferences?options.getPreferences():null;return walk.fieldOfView({fov:prefs&&prefs.fov});}
    function syncFovControls(){
      const input=root.querySelector('[data-walk-fov]'),output=root.querySelector('[data-walk-fov-value]'),reset=root.querySelector('[data-walk-action="fov-reset"]');
      if(input){input.value=String(camera.fov);input.disabled=savingFov||!options.savePreferences;}
      if(output)output.textContent=camera.fov+'°';
      if(reset)reset.disabled=savingFov||!options.savePreferences;
    }
    function previewFov(value){camera.fov=Math.round(walk.fieldOfView({fov:Number(value)}));syncFovControls();labelTime=-Infinity;schedule();}
    async function saveFov(value){
      if(savingFov||!options.savePreferences)return;
      const revision=workspaceRevision,proposed=Math.round(walk.fieldOfView({fov:Number(value)}));
      const focused=document.activeElement;
      const focusSelector=focused===root.querySelector('[data-walk-fov]')?'[data-walk-fov]':
        focused===root.querySelector('[data-walk-action="fov-reset"]')?'[data-walk-action="fov-reset"]':null;
      savingFov=true;previewFov(proposed);
      try {
        await options.savePreferences({fov:proposed});
        if(revision===workspaceRevision){camera.fov=savedFov();message='';tell('');}
      } catch(_){if(revision===workspaceRevision){camera.fov=savedFov();tell(text().fovFailed);}}
      finally{
        savingFov=false;syncFovControls();labelTime=-Infinity;schedule();
        if(focusSelector&&revision===workspaceRevision&&visible()&&
          (!document.activeElement||document.activeElement===document.body||document.activeElement===focused)){
          const control=root.querySelector(focusSelector);if(control)control.focus({preventScroll:true});
        }
      }
    }
    function text(){return TEXT[options.getLanguage()==='de'?'de':'en'];}
    function restoreBackground(){inertBefore.forEach((value,element)=>{element.inert=value;});inertBefore.clear();}
    function closeInteraction(focusResume){
      const wasOpen=Boolean(interactionSlotId);interactionSlotId=null;interactionArticleId=null;
      root.classList.toggle('is-interacting',false);const dialog=root.querySelector('.wh-walk-interaction');if(dialog)dialog.hidden=true;
      restoreBackground();
      if(wasOpen&&focusResume&&visible()){
        const control=fullscreen()?root.querySelector('[data-walk-action="resume"]'):canvas;if(control)control.focus({preventScroll:true});
      }
    }
    function renderInteraction(focusSelector){
      const dialog=root.querySelector('.wh-walk-interaction');if(!dialog)return;
      const slot=info&&info.slotsById.get(interactionSlotId);
      if(!slot){closeInteraction(false);return;}
      const assigned=info.matches.bySlot.get(slot.slotId)||[];
      if(!assigned.some(a=>a.articleId===interactionArticleId))interactionArticleId=assigned.length?assigned[0].articleId:null;
      dialog.innerHTML=interactionHtml({language:options.getLanguage(),slot,assigned,articleId:interactionArticleId,tab:interactionTab,
        metric:info.articles.get(interactionArticleId),master:info.masters.get(interactionArticleId),customFields:info.customFields,
        comparison:info.comparison,compared:info.compared.get(interactionArticleId),formatQuantity:options.formatQuantity,canOpenArticle:Boolean(options.openArticle)});
      dialog.hidden=false;root.classList.toggle('is-interacting',true);
      Array.from(root.children||[]).forEach(element=>{if(element!==dialog){if(!inertBefore.has(element))inertBefore.set(element,element.inert);element.inert=true;}});
      const control=root.querySelector(focusSelector||'[data-walk-action="interaction-return"]');if(control)control.focus({preventScroll:true});
    }
    function openInteraction(id){
      if(!visible()||!scene||!scene.positions.has(id))return;
      interactionSlotId=selectedId=id;interactionArticleId=null;interactionTab='overview';details=true;
      if(renderer)renderer.selection(id);pauseImmersive();showControls=false;message='';updatePanel();renderInteraction();syncImmersive();
    }
    function interactionTarget(){
      if(!visible()||!scene||!renderer||!renderer.available())return null;
      const hit=walk.raycast(scene,origin(),walk.ray(camera,0,0,canvas.clientWidth/Math.max(1,canvas.clientHeight)),false,6);
      return hit&&hit.item.slotId&&hit.distance<=6?hit.item.slotId:null;
    }
    function interact(){
      const id=interactionTarget();if(id)openInteraction(id);else tell(text().noTarget);
    }
    function paintInteractionHint(){
      const prompt=root.querySelector('[data-walk-interact-hint]');if(!prompt)return;
      const id=fullscreen()&&!immersivePaused&&!interactionSlotId?interactionTarget():null,slot=id&&info.slotsById.get(id);
      prompt.hidden=!slot;
      if(!slot){prompt.textContent='';return;}
      const t=text(),location=slot.code||slot.objectName+' · '+t.bay+' '+(slot.bayIndex+1)+' · '+
        (slot.ground?t.ground:t.level+' '+(slot.levelIndex+1))+' · '+t.place+' '+(slot.positionIndex+1);
      const label='E · '+t.interact+': '+location;
      if(prompt.textContent!==label)prompt.textContent=label;
    }
    function trapInteractionKeys(event){
      if(event.key==='Escape'){event.preventDefault();closeInteraction(true);syncImmersive();tell(text().paused);return;}
      if(event.key!=='Tab')return;
      const dialog=root.querySelector('.wh-walk-interaction');
      const controls=Array.from(dialog.querySelectorAll('button, select, input, textarea, a[href], summary, [tabindex]'))
        .filter(e=>!e.disabled&&!e.hidden&&e.getAttribute('tabindex')!=='-1'&&(!e.getClientRects||e.getClientRects().length));
      const first=controls[0],last=controls[controls.length-1];
      if(!first){event.preventDefault();dialog.focus({preventScroll:true});return;}
      if(!controls.includes(document.activeElement)||event.shiftKey&&document.activeElement===first||!event.shiftKey&&document.activeElement===last){
        event.preventDefault();(event.shiftKey?last:first).focus({preventScroll:true});
      }
    }
    async function resumeMovement(){
      if(!immersivePaused){pauseImmersive();return;}
      if(mouseLookUnavailable){canvas.focus({preventScroll:true});immersivePaused=false;simulationRunning=true;showControls=false;syncImmersive();}
      else await mouseLook();
    }
    function syncMotionControls(preserveNumber){
      const mode=root.querySelector('[data-walk-mode]'),eye=root.querySelector('[data-walk-eye]');
      if(mode)mode.value=motion.mode;if(eye){eye.value=String(Math.round(standingEye*1000));eye.disabled=motion.mode==='fly';}
      ['[data-walk-speed]','[data-walk-speed-range]'].forEach(selector=>{const input=root.querySelector(selector);if(input&&!(preserveNumber&&selector==='[data-walk-speed]'))input.value=String(speed);});
      const output=root.querySelector('[data-walk-speed-value]');if(output)output.textContent=(speed*3.6).toLocaleString(options.getLanguage(),{maximumFractionDigits:1})+' km/h';
      ['jump','crouch'].forEach(action=>{const button=root.querySelector('[data-walk-action="'+action+'"]');if(button){button.disabled=motion.mode==='fly'||!renderer||!renderer.available()||fullscreen()&&immersivePaused;if(action==='crouch')button.setAttribute('aria-pressed',String(crouchToggle));}});
    }
    function changeMode(value){
      const next=value==='fly'?'fly':'walk';if(next===motion.mode)return;
      let position=null;
      if(next==='walk'){position=walk.freePosition(scene,camera,standingEye);if(!position){tell(text().blocked);syncMotionControls();return;}}
      stop();motion=walk.createMotion(next);crouchToggle=false;
      if(position){camera.x=position.x;camera.z=position.z;camera.eye=standingEye;}
      const focused=document.activeElement===root.querySelector('[data-walk-mode]');
      speed=next==='fly'?flySpeed:walkSpeed;render();if(focused)root.querySelector('[data-walk-mode]').focus({preventScroll:true});
    }
    function changeSpeed(value,preserveNumber){
      if(!Number.isFinite(Number(value))||String(value).trim()==='')return;
      speed=walk.movementSpeed(Number(value));if(motion.mode==='fly')flySpeed=speed;else walkSpeed=speed;
      syncMotionControls(preserveNumber);
    }
    function visible(){return active&&options.isVisible()&&!document.hidden;}
    function stop(){keys.clear();jumpQueued=false;simulationRunning=false;drag=null;lastTime=0;if(request!==null){window.cancelAnimationFrame(request);request=null;}}
    function fullscreen(){return document.fullscreenElement===root;}
    function releaseMouse(){if(document.pointerLockElement===canvas)document.exitPointerLock();}
    function syncImmersive(repaint){
      const locked=document.pointerLockElement===canvas;
      root.classList.toggle('is-walk-paused',immersivePaused);root.classList.toggle('walk-controls-open',showControls);
      root.classList.toggle('walk-map-hidden',!mapVisible);
      const resume=root.querySelector('[data-walk-action="resume"]');if(resume)resume.textContent=locked||fullscreen()&&!immersivePaused?text().pause:mouseLookUnavailable?text().dragResume:text().resume;
      const controls=root.querySelector('[data-walk-action="controls"]');if(controls)controls.setAttribute('aria-expanded',String(showControls));
      const mapToggle=root.querySelector('[data-walk-action="map"]');if(mapToggle)mapToggle.setAttribute('aria-pressed',String(mapVisible));
      syncMotionControls();
      paintInteractionHint();
      labelTime=-Infinity;if(repaint!==false)schedule();
    }
    function pauseImmersive(){stop();immersiveRequest++;immersivePaused=true;releaseMouse();syncImmersive(false);}
    function leaveImmersive(){closeInteraction(false);pauseImmersive();showControls=false;
      if(fullscreen()&&document.exitFullscreen)Promise.resolve(document.exitFullscreen()).catch(()=>tell(text().fullscreenFailed));
    }
    async function mouseLook(){
      const token=++immersiveRequest;mouseLookUnavailable=false;
      try {
        canvas.focus({preventScroll:true});await canvas.requestPointerLock();
        if(token!==immersiveRequest||!visible()||interactionSlotId){releaseMouse();return;}
        immersivePaused=false;simulationRunning=true;showControls=false;syncImmersive();
      } catch(_){if(token!==immersiveRequest||!visible())return;mouseLookUnavailable=true;immersivePaused=true;showControls=true;tell(text().lookFailed);syncImmersive();}
    }
    async function enterFullscreen(){
      if(fullscreenPending||!visible()||!renderer||!renderer.available()||!root.requestFullscreen)return;
      fullscreenPending=true;
      const token=++immersiveRequest;stop();immersivePaused=true;showControls=false;
      try {
        await root.requestFullscreen();
        if(token!==immersiveRequest||!visible()){if(fullscreen())await document.exitFullscreen();return;}
        syncImmersive();await mouseLook();
      } catch(_){if(token===immersiveRequest&&visible())tell(text().fullscreenFailed);}
      finally{fullscreenPending=false;}
    }
    function setActive(value){active=Boolean(value);if(!active)leaveImmersive();else schedule();}
    function tell(value){message=value;const output=root.querySelector('[data-walk-message]');if(output){
      const fallback=!renderer||!renderer.available()?text().unavailable:'';
      output.textContent=fallback+(fallback&&value&&value!==fallback?' · ':'')+(value===fallback?'':value);
    }
      const hud=root.querySelector('[data-walk-immersive-message]');if(hud)hud.textContent=message;
    }
    function origin(){return {x:camera.x,y:camera.eye,z:camera.z};}
    function number(value){return Number.isFinite(value)?value.toLocaleString(options.getLanguage()==='de'?'de-DE':'en-US'):text().unknown;}
    function refresh(){
      const layout=options.getLayout(),registry=options.getRegistry();
      const articles=options.getArticles?options.getArticles():[];
      const matches=model.matchArticles(layout,registry),slots=model.listLocations(layout);
      const byArticle=new Map((articles||[]).map(a=>[a.article_id,a]));
      const comparison=options.getComparison?options.getComparison():null;
      info={layout:layout,slots:slots,slotsById:new Map(slots.map(s=>[s.slotId,s])),matches:matches,articles:byArticle,comparison:comparison,
        masters:new Map((registry||[]).map(a=>[a.article_id,a])),customFields:options.getCustomFields?options.getCustomFields():[],
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
      const free=walk.freePosition(scene,desired,standingEye);
      if(!free){tell(text().blocked);return false;}
      camera.x=free.x;camera.z=free.z;camera.pitch=0;camera.eye=standingEye;motion=walk.createMotion(motion.mode);crouchToggle=false;jumpQueued=false;
      if(rack){const f=model.objectFootprint(rack),angle=rack.rotation*Math.PI/180;
        camera.yaw=Math.atan2(rack.x/1000+Math.cos(angle)*f.width/2000-Math.sin(angle)*f.depth/2000-camera.x,
          rack.z/1000+Math.sin(angle)*f.width/2000+Math.cos(angle)*f.depth/2000-camera.z);}
      tell('');schedule();return true;
    }
    function standAtSelection(){
      const item=scene.positions.get(selectedId);if(!item)return;
      const next=walk.approach(scene,item,standingEye);if(!next){tell(text().blocked);return;}
      Object.assign(camera,next);motion=walk.createMotion(motion.mode);crouchToggle=false;stop();syncMotionControls();tell('');schedule();
    }
    function select(id){if(!scene.positions.has(id))return;selectedId=id;if(renderer)renderer.selection(id);message='';updatePanel();labelTime=-Infinity;schedule();if(fullscreen())openInteraction(id);}
    function updatePanel(){
      const t=text(),slot=info.slotsById.get(selectedId),item=scene.positions.get(selectedId);
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
          const slot=info.slotsById.get(label.item.slotId);button.textContent=slot.code||text().bay+' '+(slot.bayIndex+1)+' · '+(slot.ground?'0':slot.levelIndex+1)+' · '+(slot.positionIndex+1);
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
      paintInteractionHint();
      paintMap();const position=(motion.mode==='fly'?text().fly:motion.crouched?text().crouched+(motion.standBlocked?' · '+text().standBlocked:''):text().standing)+' · '+text().position+': X '+camera.x.toFixed(1)+' m · Z '+camera.z.toFixed(1)+' m · '+text().heightView+': '+camera.eye.toFixed(2)+' m';
      ['[data-walk-position]','[data-walk-hud-position]'].forEach(selector=>{const output=root.querySelector(selector);if(output)output.textContent=position;});
    }
    function tick(time){
      request=null;if(!visible()){stop();return;}const delta=lastTime?Math.min(.05,(time-lastTime)/1000):.016;lastTime=time;
      const forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);
      const side=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
      if(simulationRunning&&!interactionSlotId)walk.stepMotion(scene,camera,motion,{forward,side,vertical:(keys.has('Space')?1:0)-(keys.has('KeyC')?1:0),
        crouch:crouchToggle||keys.has('KeyC'),jump:jumpQueued},delta,speed,standingEye);
      jumpQueued=false;paint(time);if(simulationRunning&&(keys.size||motion.mode==='walk'&&!motion.grounded))schedule();else lastTime=0;
    }
    function schedule(){if(visible()&&request===null)request=window.requestAnimationFrame(tick);}
    function render(){
      restoreBackground();
      const id=options.getWorkspaceId(),changed=id!==workspaceId;workspaceId=id;stop();
      if(changed||!savingFov)camera.fov=savedFov();
      if(changed){workspaceRevision++;leaveImmersive();mouseLookUnavailable=false;mapVisible=true;selectedId=null;search='';message='';camera.eye=standingEye=1.7;motion=walk.createMotion();walkSpeed=speed=1.4;flySpeed=5;crouchToggle=false;colorMode='assignments';details=true;}
      refresh();if(changed||motion.mode==='walk'&&!walk.canOccupy(scene,camera,motion.feet,camera.eye-motion.feet))resetPosition();const t=text();
      root.classList.add('wh-walk-root');
      root.innerHTML='<div class="wh-header"><div><p class="wh-eyebrow">OpenSlotting · 3D</p><h3>'+esc(t.title)+'</h3><p>'+esc(t.intro)+'</p></div></div>'+
        '<div class="wh-walk-toolbar"><label>'+esc(t.search)+'<input type="search" data-walk-search maxlength="80" value="'+esc(search)+'"></label><button type="button" data-walk-action="find">'+esc(t.find)+'</button>'+
        '<button type="button" data-walk-action="reset">'+esc(t.reset)+'</button><button type="button" data-walk-action="look">'+esc(t.look)+'</button><button type="button" data-walk-action="fullscreen">'+esc(t.fullscreen)+'</button>'+
        '<label>'+esc(t.eye)+'<input type="number" data-walk-eye min="1000" max="2200" step="50" value="'+Math.round(standingEye*1000)+'"></label>'+
        '<label class="wh-walk-fov">'+esc(t.fov)+'<span><input type="range" data-walk-fov min="'+walk.MIN_FOV+'" max="'+walk.MAX_FOV+'" step="1" value="'+camera.fov+'"><output data-walk-fov-value>'+camera.fov+'°</output></span></label><button type="button" data-walk-action="fov-reset">'+esc(t.fovReset)+'</button>'+
        '<label>'+esc(t.mode)+'<select data-walk-mode><option value="walk"'+(motion.mode==='walk'?' selected':'')+'>'+esc(t.walk)+'</option><option value="fly"'+(motion.mode==='fly'?' selected':'')+'>'+esc(t.fly)+'</option></select></label>'+
        '<label class="wh-walk-speed">'+esc(t.speed)+'<span><input type="range" data-walk-speed-range aria-label="'+esc(t.speed)+'" min="0.1" max="20" step="0.1" value="'+speed+'"><input type="number" data-walk-speed aria-label="'+esc(t.speed)+'" min="0.1" max="20" step="0.1" value="'+speed+'"></span><output data-walk-speed-value></output></label>'+
        '<button type="button" data-walk-action="jump">'+esc(t.jump)+'</button><button type="button" data-walk-action="crouch" aria-pressed="'+crouchToggle+'">'+esc(t.crouch)+'</button>'+
        '<label>'+esc(t.colors)+'<select data-walk-colors>'+['assignments','usage','demand'].map(key=>'<option value="'+key+'"'+(key===colorMode?' selected':'')+'>'+esc(t[key])+'</option>').join('')+'</select></label>'+
        '<button type="button" data-walk-action="details" aria-expanded="'+details+'">'+esc(t.info)+'</button></div>'+
        '<div class="wh-walk-immersive-controls" role="group" aria-label="'+esc(t.controls)+'"><button type="button" data-walk-action="resume">'+esc(t.resume)+'</button><button type="button" data-walk-action="controls" aria-expanded="false">'+esc(t.controls)+'</button><button type="button" data-walk-action="map" aria-pressed="'+mapVisible+'">'+esc(t.toggleMap)+'</button><button type="button" data-walk-action="details">'+esc(t.info)+'</button><button type="button" data-walk-action="exit-fullscreen">'+esc(t.exitFullscreen)+'</button><small>'+esc(motion.mode==='fly'?t.flightHint:t.walkHint)+'</small><small data-walk-hud-position></small><span role="status" data-walk-immersive-message></span></div>'+
        '<div class="wh-walk-body"><div class="wh-walk-viewport"><div class="wh-walk-labels"></div><div class="wh-walk-map-wrap"><small>'+esc(t.map)+'</small></div><span class="wh-walk-crosshair" aria-hidden="true">+</span><span class="wh-walk-interact-hint" data-walk-interact-hint hidden></span></div><aside class="wh-walk-inspector wh-card"></aside></div>'+
        '<div class="wh-walk-footer"><p id="warehouse-walk-hint">'+esc(motion.mode==='fly'?t.flightHint:t.walkHint)+' · '+esc(t.hint)+'</p><output data-walk-position></output><p class="wh-legend">'+esc(colorMode==='demand'?t.demandLegend:colorMode==='usage'?[t.unassigned,t.picking,t.reserve].join(' · '):[t.matched,t.coded,t.empty].join(' · '))+'</p><p role="status" aria-live="polite" data-walk-message></p></div>'+
        '<div class="wh-walk-interaction" role="dialog" aria-modal="true" aria-labelledby="warehouse-walk-interaction-title" tabindex="-1" hidden></div>';
      root.querySelector('.wh-walk-viewport').prepend(canvas);root.querySelector('.wh-walk-map-wrap').appendChild(map);
      canvas.setAttribute('aria-label',t.view);canvas.setAttribute('aria-describedby','warehouse-walk-hint');map.setAttribute('aria-label',t.map);map.setAttribute('role','img');
      if(!renderer||!renderer.available())message=t.unavailable;else if(!info.layout.objects.length)message=t.noLayout;
      root.querySelector('[data-walk-action="look"]').disabled=!renderer||!renderer.available()||!canvas.requestPointerLock;
      const fullButton=root.querySelector('[data-walk-action="fullscreen"]');if(fullButton)fullButton.disabled=!root.requestFullscreen||!renderer||!renderer.available();
      updatePanel();syncFovControls();syncMotionControls();active=options.isVisible();renderInteraction();syncImmersive();paint(0);schedule();
    }
    function find(){const slot=info.slots.find(s=>search.trim()&&s.code===search.trim());if(!slot){tell(text().notFound);return;}select(slot.slotId);}
    root.addEventListener('input',event=>{if(event.target.hasAttribute('data-walk-search'))search=event.target.value;
      if(event.target.hasAttribute('data-walk-speed-range'))changeSpeed(event.target.value);
      if(event.target.hasAttribute('data-walk-speed')&&Number(event.target.value)>=.1&&Number(event.target.value)<=20)changeSpeed(event.target.value,true);
      if(event.target.hasAttribute('data-walk-fov')&&!savingFov)previewFov(event.target.value);});
    root.addEventListener('change',async function(event){
      if(event.target.hasAttribute('data-walk-interaction-article')){interactionArticleId=event.target.value;renderInteraction('[data-walk-interaction-article]');return;}
      if(event.target.hasAttribute('data-walk-fov')){await saveFov(event.target.value);return;}
      if(event.target.hasAttribute('data-walk-mode')){changeMode(event.target.value);return;}
      if(event.target.hasAttribute('data-walk-eye')){const value=Number(event.target.value)/1000;
        if(value>=1&&value<=2.2&&motion.mode==='walk'&&walk.canOccupy(scene,camera,motion.feet,value)){standingEye=value;camera.eye=motion.feet+value;motion.crouched=false;crouchToggle=false;syncMotionControls();schedule();}else {event.target.value=Math.round(standingEye*1000);tell(text().blocked);}}
      if(event.target.hasAttribute('data-walk-speed')||event.target.hasAttribute('data-walk-speed-range')){changeSpeed(event.target.value);syncMotionControls();}
      if(event.target.hasAttribute('data-walk-colors')){colorMode=['assignments','usage','demand'].includes(event.target.value)?event.target.value:'assignments';render();}
    });
    root.addEventListener('click',async function(event){
      if(interactionSlotId&&!event.target.closest('.wh-walk-interaction'))return;
      const tab=event.target.closest('[data-walk-inspect-tab]');
      if(tab&&interactionSlotId){interactionTab=['overview','master','periods'].includes(tab.dataset.walkInspectTab)?tab.dataset.walkInspectTab:'overview';renderInteraction('[data-walk-inspect-tab="'+interactionTab+'"]');return;}
      const slot=event.target.closest('[data-walk-slot]');if(slot){select(slot.dataset.walkSlot);return;}
      const article=event.target.closest('[data-walk-article]');if(article&&options.openArticle){stop();options.openArticle(article.dataset.walkArticle);return;}
      const button=event.target.closest('[data-walk-action]');if(!button)return;
      const action=button.dataset.walkAction;
      if(action==='interaction-return'){closeInteraction(false);await resumeMovement();}
      else if(action==='interaction-close'){closeInteraction(true);syncImmersive();}
      else if(action==='find')find();else if(action==='go')standAtSelection();else if(action==='reset'){stop();resetPosition();syncMotionControls();}
      else if((action==='jump'||action==='crouch')&&motion.mode==='walk'&&renderer&&renderer.available()){
        if(fullscreen()&&immersivePaused){tell(text().paused);return;}
        if(action==='jump')jumpQueued=true;else crouchToggle=!crouchToggle;
        simulationRunning=true;canvas.focus({preventScroll:true});syncMotionControls();schedule();
      }
      else if(action==='coverage'&&options.openCoverage){stop();options.openCoverage();}
      else if(action==='details'){if(fullscreen())pauseImmersive();details=!details;button.setAttribute('aria-expanded',String(details));updatePanel();schedule();}
      else if(action==='fov-reset')await saveFov(walk.DEFAULT_FOV);
      else if(action==='look')await mouseLook();
      else if(action==='fullscreen')await enterFullscreen();
      else if(action==='exit-fullscreen')leaveImmersive();
      else if(action==='resume')await resumeMovement();
      else if(action==='controls'){const next=!showControls;pauseImmersive();showControls=next;syncImmersive();}
      else if(action==='map'){if(fullscreen())pauseImmersive();mapVisible=!mapVisible;syncImmersive();}
    });
    root.addEventListener('keydown',function(event){
      if(interactionSlotId){trapInteractionKeys(event);return;}
      if(event.key==='Enter'&&event.target.hasAttribute('data-walk-search')){event.preventDefault();find();return;}
      if(event.key==='Escape'){pauseImmersive();tell(text().paused);return;}
      if(event.key==='Tab'&&fullscreen()&&document.pointerLockElement===canvas){pauseImmersive();showControls=true;syncImmersive();}
      if(event.target!==canvas||event.ctrlKey||event.altKey||event.metaKey||!renderer||!renderer.available()||fullscreen()&&immersivePaused)return;
      if(event.code==='KeyE'){event.preventDefault();if(!event.repeat)interact();return;}
      if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyC'].includes(event.code)){
        event.preventDefault();if(event.code==='Space'&&!event.repeat&&!keys.has('Space')&&motion.mode==='walk')jumpQueued=true;
        keys.add(event.code);simulationRunning=true;schedule();}
    });
    window.addEventListener('keyup',event=>{const had=keys.delete(event.code);if(had&&simulationRunning)schedule();});window.addEventListener('blur',pauseImmersive);
    document.addEventListener('visibilitychange',function(){if(document.hidden)pauseImmersive();else schedule();});
    document.addEventListener('pointerlockchange',function(){stop();
      if(document.pointerLockElement===canvas&&(!visible()||interactionSlotId)){releaseMouse();return;}
      immersivePaused=document.pointerLockElement!==canvas;
      if(immersivePaused&&fullscreen())showControls=true;else if(!immersivePaused)showControls=false;syncImmersive();});
    document.addEventListener('pointerlockerror',function(){mouseLookUnavailable=true;pauseImmersive();showControls=true;tell(text().lookFailed);syncImmersive();});
    document.addEventListener('fullscreenchange',function(){
      if(!fullscreen()){closeInteraction(false);stop();releaseMouse();immersivePaused=true;showControls=false;immersiveRequest++;}
      syncImmersive();
    });
    canvas.addEventListener('blur',stop);
    canvas.addEventListener('pointerdown',function(event){if(interactionSlotId||event.button!==0||!renderer||!renderer.available())return;event.preventDefault();canvas.focus({preventScroll:true});simulationRunning=true;schedule();drag={x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,moved:false};canvas.setPointerCapture(event.pointerId);});
    canvas.addEventListener('pointermove',function(event){if(!visible()||interactionSlotId)return;
      const locked=document.pointerLockElement===canvas;if(!locked&&!drag)return;
      const dx=locked?event.movementX:event.clientX-drag.x,dy=locked?event.movementY:event.clientY-drag.y;
      if(drag){if(Math.abs(event.clientX-drag.startX)+Math.abs(event.clientY-drag.startY)>4)drag.moved=true;drag.x=event.clientX;drag.y=event.clientY;}
      camera.yaw=(camera.yaw-dx*.004)%(Math.PI*2);camera.pitch=Math.max(-1.35,Math.min(1.35,camera.pitch+dy*.004));schedule();
    });
    canvas.addEventListener('pointerup',function(event){const locked=document.pointerLockElement===canvas;if(!interactionSlotId&&!locked&&drag&&!drag.moved){const rect=canvas.getBoundingClientRect(),direction=walk.ray(camera,(event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2,rect.width/rect.height),hit=walk.raycast(scene,origin(),direction);
        if(hit&&hit.item.slotId)select(hit.item.slotId);}drag=null;});
    canvas.addEventListener('pointercancel',()=>{drag=null;});canvas.addEventListener('lostpointercapture',()=>{drag=null;});
    map.addEventListener('click',function(event){const rect=map.getBoundingClientRect(),b=scene.bounds,scale=mapScale();
      if(interactionSlotId)return;
      const desired={x:((event.clientX-rect.left)*map.width/rect.width-map.width/2)/scale+(b.minX+b.maxX)/2,z:((event.clientY-rect.top)*map.height/rect.height-map.height/2)/scale+(b.minZ+b.maxZ)/2};
      if(motion.mode==='walk'&&!walk.canStand(scene,desired,standingEye)){tell(text().blocked);return;}stop();camera.x=desired.x;camera.z=desired.z;
      if(motion.mode==='walk'){motion=walk.createMotion();camera.eye=standingEye;crouchToggle=false;}syncMotionControls();tell('');canvas.focus({preventScroll:true});schedule();});
    window.addEventListener('resize',()=>{labelTime=-Infinity;schedule();});
    if(window.ResizeObserver)new window.ResizeObserver(()=>{labelTime=-Infinity;schedule();}).observe(root);
    return {render:render,setActive:setActive};
  }
  return {create:create,interactionHtml:interactionHtml};
}));
