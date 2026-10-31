(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.OpenSlottingWarehouseWalk=factory();
}(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const TEXT={
    de:{startHere:'Hier starten',windowReady:'Rundgang geöffnet. Das Fenster kann mit Alt+Tab gewechselt werden.',windowFailed:'Rundgangfenster konnte nicht verbunden werden. Lokalen Server neu starten und dasselbe Edge-Profil verwenden; alternativ hier starten.',refresh:'Datenstand aktualisieren',refreshed:'Datenstand aktualisiert. Weiter setzt den Rundgang fort.',closeWindow:'Rundgang schließen',windowIntro:'Bewegung und Sichtfeld einstellen, einen Startpunkt wählen und den Rundgang im eigenen Fenster starten.',start:'Rundgang starten',setup:'Rundgang vorbereiten',menu:'Rundgangmenü',menuHint:'Tab: Menü öffnen · M: Menü öffnen/schließen · Weiter: Rundgang fortsetzen',setupHint:'Bewegung und Sichtfeld einstellen, einen Startpunkt auf der Minikarte wählen und den Rundgang im Vollbild starten.',motionSettings:'Bewegung',viewSettings:'Sicht & Darstellung',navigationSettings:'Startpunkt & Stellplätze',windowed:'Im Fenster starten',backToSetup:'Zur Vorbereitung',interact:'Interagieren',noTarget:'Kein erreichbarer Stellplatz im Fadenkreuz (max. 6 m).',articleDetails:'Artikel am Stellplatz',articleOutside:'Artikelansicht öffnen (Rundgang verlassen)',backToWalk:'Zurück zum Rundgang',closeDetails:'Details schließen',chooseArticle:'Artikel auswählen',overview:'Kennzahlen',master:'Stammdaten',periods:'Periodenvergleich',orders:'Aufträge',customers:'Kunden',sources:'Quelldateien',allData:'Alle geprüften Daten · aktuelle Artikelzuordnung',masterName:'Artikelbezeichnung',currentLocation:'Aktueller Stellplatz',unit:'Mengeneinheit',pack:'Menge pro Verkaufseinheit',vat:'Steuersatz',evidence:'Quellnachweise',noComparison:'Noch kein Periodenvergleich berechnet.',mode:'Bewegung',walk:'Gehen',fly:'Freiflug (ohne Kollision)',jump:'Springen',crouch:'Ducken',standing:'Stehend',crouched:'Geduckt',standBlocked:'Aufrichten blockiert',heightView:'Sichthöhe',flightHint:'Freiflug ohne Kollision · WASD: in Blickrichtung · Leertaste: steigen · C: sinken · Maus: umsehen · Linksklick / E: interagieren · Tab: Menü · Esc: pausieren',walkHint:'WASD: gehen · Leertaste: springen · C halten: ducken · Maus: umsehen · Linksklick / E: interagieren · Tab: Menü · Esc: pausieren',fov:'Sichtfeld (vertikal)',fovReset:'Sichtfeld zurücksetzen',fovFailed:'Sichtfeld konnte nicht gespeichert werden. Der gespeicherte Wert wurde wiederhergestellt.',fullscreen:'Vollbild starten',exitFullscreen:'Vollbild verlassen',resume:'Weiter mit Mausblick',pause:'Pause / Bedienen',controls:'Bedienelemente',toggleMap:'Minikarte',fullscreenFailed:'Vollbild konnte nicht gestartet werden. Erneut versuchen oder ausdrücklich im Fenster starten.',immersiveHint:'WASD: gehen · Maus: umsehen · Klick: Stellplatz wählen · Tab: Menü · Esc: pausieren',title:'Lager-Rundgang',intro:'Lager aus Augenhöhe erkunden und modellierte Stellplätze auswerten.',search:'Stellplatzcode suchen',find:'Finden',go:'Vor Stellplatz stellen',reset:'Startposition',look:'Mausblick aktivieren',info:'Details ein-/ausblenden',
      eye:'Augenhöhe (mm)',speed:'Geschwindigkeit (m/s)',slow:'Langsam',normal:'Normal',fast:'Schnell',map:'Minikarte · Startposition anklicken',view:'Lager aus Augenhöhe',
      colors:'Farben',assignments:'Zuordnung',usage:'Nutzung',demand:'Nachfrage',select:'Stellplatz anklicken oder exakten Code suchen.',noCode:'Ohne Code',none:'Keine aktuelle Artikelzuordnung.',
      basis:'Aktuelle Artikelzuordnung ist kein Bestandsnachweis. Nachfrage bezieht sich auf die aktuell zugeordneten Artikel in den gesamten geprüften Daten, nicht auf historische Stellplatzbesuche.',
      lines:'Auftragszeilen',quantity:'Menge',days:'Aktive Tage',article:'Artikel öffnen',notFound:'Kein Stellplatz mit genau diesem Code gefunden.',blocked:'Hier ist kein freier Standpunkt erreichbar.',
      unavailable:'WebGL2 ist nicht verfügbar. Suche, Minikarte und Stellplatzdetails bleiben nutzbar.',noLayout:'Noch kein Lager modelliert. Zuerst im 3D-Editor ein Regal anlegen.',
      unassigned:'Nicht zugewiesen',picking:'Kommissionierung',reserve:'Reserve',bay:'Fach',level:'Ebene',ground:'Boden (Ebene 0)',place:'Stellplatz',size:'Breite × Tiefe',height:'Höhe über Boden',
      unknown:'Unbekannt',coverage:'Datenabdeckung prüfen',lookFailed:'Mausblick nicht verfügbar. Der Rundgang bleibt pausiert. Mausfreigabe erlauben und erneut versuchen.',paused:'Bewegung pausiert.',position:'Position',matched:'Artikel zugeordnet',coded:'Code ohne Artikelzuordnung',empty:'Ohne Code',
      demandLegend:'Auftragszeilen: blau = niedrig, orange = hoch · grau = unbekannt',previous:'A',current:'B',comparison:'Periodenvergleich der aktuell zugeordneten Artikel'},
    en:{startHere:'Start here',windowReady:'Walk opened. Use Alt+Tab to switch windows.',windowFailed:'Could not connect the walk window. Restart the local server and use the same Edge profile; alternatively start here.',refresh:'Update data snapshot',refreshed:'Data snapshot updated. Resume to continue the walk.',closeWindow:'Close walk',windowIntro:'Adjust movement and field of view, choose a starting point, then start the walk in its own window.',start:'Start walk',setup:'Prepare walk',menu:'Walk menu',menuHint:'Tab: open menu · M: toggle menu · Resume: continue walk',setupHint:'Adjust movement and field of view, choose a starting point on the minimap, then start the fullscreen walk.',motionSettings:'Movement',viewSettings:'View & display',navigationSettings:'Start position & locations',windowed:'Start in window',backToSetup:'Back to setup',interact:'Interact',noTarget:'No reachable location under the crosshair (max. 6 m).',articleDetails:'Articles at location',articleOutside:'Open article view (leave walk)',backToWalk:'Back to walk',closeDetails:'Close details',chooseArticle:'Select article',overview:'Metrics',master:'Master data',periods:'Period comparison',orders:'Orders',customers:'Customers',sources:'Source files',allData:'All validated data · current article assignment',masterName:'Article name',currentLocation:'Current location',unit:'Unit of measure',pack:'Quantity per selling unit',vat:'VAT rate',evidence:'Source evidence',noComparison:'No period comparison has been calculated.',mode:'Movement',walk:'Walk',fly:'Free flight (no collision)',jump:'Jump',crouch:'Crouch',standing:'Standing',crouched:'Crouched',standBlocked:'Standing blocked',heightView:'View height',flightHint:'Free flight without collision · WASD: follow view · Space: ascend · C: descend · Mouse: look · Left click / E: interact · Tab: menu · Esc: pause',walkHint:'WASD: walk · Space: jump · Hold C: crouch · Mouse: look · Left click / E: interact · Tab: menu · Esc: pause',fov:'Field of view (vertical)',fovReset:'Reset field of view',fovFailed:'Field of view could not be saved. The saved value was restored.',fullscreen:'Enter fullscreen',exitFullscreen:'Exit fullscreen',resume:'Resume mouse look',pause:'Pause / interact',controls:'Controls',toggleMap:'Minimap',fullscreenFailed:'Fullscreen is unavailable. Try again or explicitly start in the window.',immersiveHint:'WASD: walk · Mouse: look · Click: select location · Tab: menu · Esc: pause',title:'Warehouse walk',intro:'Explore the warehouse at eye level and inspect modeled locations.',search:'Find location code',find:'Find',go:'Stand in front of location',reset:'Start position',look:'Enable mouse look',info:'Show/hide details',
      eye:'Eye height (mm)',speed:'Speed (m/s)',slow:'Slow',normal:'Normal',fast:'Fast',map:'Minimap · click a start position',view:'Warehouse at eye level',
      colors:'Colors',assignments:'Assignments',usage:'Usage',demand:'Demand',select:'Click a location or search its exact code.',noCode:'No code',none:'No current article assignment.',
      basis:'Current article assignment is not evidence of stock. Demand describes the currently assigned articles across all validated data, not historical location visits.',
      lines:'Order lines',quantity:'Quantity',days:'Active days',article:'Open article',notFound:'No location has this exact code.',blocked:'No free standing position is available here.',
      unavailable:'WebGL2 is unavailable. Search, minimap and location details remain available.',noLayout:'No warehouse modeled yet. First create a rack in the warehouse editor.',
      unassigned:'Unassigned',picking:'Picking',reserve:'Reserve',bay:'Bay',level:'Level',ground:'Ground (level 0)',place:'Location',size:'Width × depth',height:'Height above floor',
      unknown:'Unknown',coverage:'Check data coverage',lookFailed:'Mouse look is unavailable. The walk remains paused. Allow mouse capture and try again.',paused:'Movement paused.',position:'Position',matched:'Article assigned',coded:'Code without article assignment',empty:'No code',
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
        '<li>'+esc(r.source_file_label||r.source_file_name||r.source_file_id)+' · '+esc(r.source_line==null?t.unknown:r.source_line)+'</li>').join('')+'</ul>'+((master.master_row_ref_count||refs.length)>20?'<p>20 / '+(master.master_row_ref_count||refs.length)+'</p>':'')+'</details>';
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
    let active=false,disposed=false,request=null,lastTime=0,drag=null,labels=[],labelTime=-Infinity;
    let interactionSlotId=null,interactionArticleId=null,interactionTab='overview';
    let workMode='analysis',switchingWorkMode=false;
    let objectsOpen=false,objectSearch='',selectedObjectId=null;
    let aimedObjectId=null;
    let boundObjectId=null,directBase=null,directFields=[],directDraft=null,directTarget=null,directNotice='';
    let directFieldActive=false;
    let discardDirectAction=null;
    let directEpoch=0,directBusy=false,directStale=false,directDirty=false,previewWorld=null,previewApplied=false,aimPreview=false;
    function showAim(id){
      const preview=Boolean(previewApplied&&hasDirectChanges());
      if(aimedObjectId===id&&aimPreview===preview)return;aimPreview=preview;
      aimedObjectId=id;
      if(renderer&&renderer.aimObject)renderer.aimObject(id,preview);
      root.querySelectorAll('[data-walk-object]').forEach(button=>button.classList.toggle('is-aimed',button.dataset.walkObject===id));
      schedule();
    }
    function canEdit(){return options.editorAvailable===true&&Boolean(options.openEditor);}
    function directEnabled(){return canEdit()&&Boolean(options.saveLayout&&window.OpenSlottingWalkEditor&&window.OpenSlottingWalkEditor.directFields);}
    function directWords(){return options.getLanguage()==='de'
      ?{bind:'Linksklick · Objekt binden',field:'Linksklick · Wert bearbeiten',release:'Rechtsklick: lösen',locked:'Objekt gesperrt. Zum Entsperren das Rundgangmenü öffnen.',none:'Für diesen Objekttyp das Bearbeitungsmenü verwenden.',help:'Mausrad: ändern · Shift: fein · Zahl eingeben · Linksklick / Enter / Rechtsklick: Wert abwählen',preview:'Vorschau',saved:'Änderung gespeichert.',saving:'Wird gespeichert …',invalid:'Ungültiger Wert oder Geometrie. Vorschau nicht übernehmbar.',stale:'Datenstand unklar oder geändert. Im Menü den Datenstand aktualisieren.',failed:'Speichern fehlgeschlagen. Entwurf bleibt erhalten.',impact:'Betroffene Stellplätze / Codes / Artikel',collisions:'Kollisionen',occupied:'Änderung würde den Betrachter einschließen. Erst eine freie Position wählen.'}
      :{bind:'Left click · Bind object',field:'Left click · Edit value',release:'Right click: release',locked:'Object locked. Open the walk menu to unlock it.',none:'Use the editing menu for this object type.',help:'Wheel: adjust · Shift: fine · Type a number · Left click / Enter / Right click: leave value',preview:'Preview',saved:'Change saved.',saving:'Saving …',invalid:'Invalid value or geometry. Cannot apply preview.',stale:'Snapshot changed or save uncertain. Refresh the data snapshot in the menu.',failed:'Save failed. Draft retained.',impact:'Affected locations / codes / articles',collisions:'Collisions',occupied:'This change would enclose the observer. Move to a free position first.'};}
    function stageWords(){return options.getLanguage()==='de'
      ?{value:'Wert bearbeiten',object:'Objektvorschau',back:'Linksklick / Enter / Rechtsklick: Wert abwählen',apply:'Änderungen übernehmen',discard:'Vorschau verwerfen',help:'Wert anvisieren oder Übernehmen wählen · Enter: übernehmen · Rechtsklick: lösen'}
      :{value:'Edit value',object:'Object preview',back:'Left click / Enter / Right click: leave value',apply:'Apply changes',discard:'Discard preview',help:'Aim at a value or Apply changes · Enter: apply · Right click: release'};}
    function clearDirect(release){
      directEpoch++;directDraft=null;directFieldActive=false;directTarget=null;directDirty=false;previewWorld=null;discardDirectAction=null;
      if(previewApplied&&renderer&&scene)renderer.setWorld(scene);previewApplied=false;
      if(release){boundObjectId=null;directBase=null;directFields=[];directNotice='';}
      else if(boundObjectId&&info)directFields=window.OpenSlottingWalkEditor.directFields(model,info.layout,boundObjectId);
      schedule();
    }
    function discardWords(){return options.getLanguage()==='de'
      ?{question:'Offene Vorschau verwerfen?',confirm:'Vorschau verwerfen',keep:'Weiter bearbeiten',keys:'Linksklick / Enter: verwerfen · Rechtsklick: weiter bearbeiten'}
      :{question:'Discard the open preview?',confirm:'Discard preview',keep:'Keep editing',keys:'Left click / Enter: discard · Right click: keep editing'};}
    function requestDirectDiscard(action){
      if(!directBusy&&hasDirectChanges()){
        discardDirectAction=action||function(){};paintDirect();
        if(immersivePaused){const keep=root.querySelector('[data-walk-action="discard-keep"]');if(keep)keep.focus();}
        schedule();return true;
      }
      return false;
    }
    function confirmDirectDiscard(){
      if(!discardDirectAction)return;const action=discardDirectAction;
      clearDirect(true);paintDirect();paintInteractionHint();action();
    }
    function keepDirectDraft(){discardDirectAction=null;paintDirect();if(immersivePaused){const resume=root.querySelector('[data-walk-action="resume"]');if(resume)resume.focus();}schedule();}
    function releaseDirect(){
      if(discardDirectAction){keepDirectDraft();return;}
      if(directFieldActive){finishDirectField();return;}
      if(!requestDirectDiscard()){clearDirect(true);paintDirect();paintInteractionHint();}
    }
    function hasDirectChanges(){
      return Boolean(directDraft&&(directDraft.changed||directDirty&&directDraft.value!==directDraft.field.value));
    }
    function finishDirectField(){
      if(directBusy)return;prepareDirect();directFieldActive=false;
      if(!hasDirectChanges())clearDirect(false);
      schedule();
    }
    function bindDirect(){
      if(directBusy||directStale)return;
      const hit=editTarget();if(!hit)return;
      clearDirect(true);boundObjectId=hit.item.box.object.id;directBase=JSON.stringify(options.getLayout());
      directFields=window.OpenSlottingWalkEditor.directFields(model,info.layout,boundObjectId);markObject(boundObjectId);
      const object=info.layout.objects.find(item=>item.id===boundObjectId);
      directNotice=object.locked?directWords().locked:directFields.length?'':directWords().none;schedule();
    }
    function directClick(){
      if(discardDirectAction){confirmDirectDiscard();return;}
      if(!boundObjectId){bindDirect();return;}
      if(directFieldActive){finishDirectField();return;}
      paintDirect();
      if(directBusy||!directTarget||directTarget.locked)return;
      if(directTarget.action==='discard'){requestDirectDiscard();return;}
      if(directStale)return;
      if(directTarget.action==='apply'){saveDirect();return;}
      const field=directTarget;
      if(directDraft&&directDraft.field.key===field.key){directFieldActive=true;schedule();return;}
      if(directDraft&&directDraft.error){directNotice=directWords().invalid;schedule();return;}
      const working=directDraft&&directDraft.candidate||JSON.parse(directBase),previous=directDraft;
      directDraft={field:field,value:field.value,input:String(field.value),typing:false,error:'',candidate:working,startLayout:working,changed:JSON.stringify(working)!==directBase,impact:previous&&previous.impact,collisions:previous&&previous.collisions||0};
      directFieldActive=true;
      directNotice='';schedule();
    }
    function queueDirect(value){
      if(!directDraft||directBusy||directStale)return;
      directDraft.value=value;directDirty=true;schedule();
    }
    function directError(error,field){
      const message=error&&error.message||directWords().invalid;if(options.getLanguage()!=='de')return message;
      if(/permitted range/.test(message))return 'Ganze Millimeter zwischen '+field.min+' und '+field.max+' eingeben.';
      if(/overlap/i.test(message))return 'Stellplätze dürfen sich nicht überschneiden.';
      if(/usable level bounds/.test(message))return 'Der Stellplatz liegt außerhalb des Fachs.';
      if(/adjacent upright/.test(message))return 'Die Ebenen überschreiten die Höhe eines angrenzenden Ständers.';
      if(/Unlock/.test(message))return 'Zuerst alle betroffenen Objekte entsperren.';
      if(/Classify/.test(message))return 'Die Ebene zuerst unter Zonen einer Nutzung zuweisen.';
      if(/share one row/.test(message))return 'Stellplätze müssen nebeneinander liegen und die volle Fachtiefe nutzen.';
      return message;
    }
    function directWorld(layout){
      const boxes=window.OpenSlottingWarehouseScene.buildBoxes(model,layout,info.matches,{colorMode:colorMode==='usage'?'usage':'structure',showOrientation:true});
      const colors=new Map(Array.from(scene.positions,([id,item])=>[id,item.box.color]));
      boxes.forEach(box=>{if(box.kind==='location'&&colors.has(box.slotRef.slotId))box.color=colors.get(box.slotRef.slotId);});
      return walk.createWorld(boxes);
    }
    function prepareDirect(){
      if(!directDirty||!directDraft)return;directDirty=false;
      const draft=directDraft;draft.candidate=null;draft.error='';draft.saveError='';draft.blocked='';draft.impact=null;previewWorld=null;
      try{
        if(JSON.stringify(options.getLayout())!==directBase){directStale=true;throw new Error(directWords().stale);}
        const base=JSON.parse(directBase),next=window.OpenSlottingWalkEditor.proposeDirect(model,draft.startLayout,draft.field,draft.value);
        draft.impact=model.layoutImpact(base,next,options.getRegistry());
        draft.collisions=model.findCollisions(next).length;
        previewWorld=directWorld(next);
        draft.candidate=next;
        directFields=window.OpenSlottingWalkEditor.directFields(model,next,boundObjectId);
      }catch(error){draft.error=directError(error,draft.field);}
      if(!draft.candidate){
        directFields=window.OpenSlottingWalkEditor.directFields(model,draft.startLayout,boundObjectId);
        if(JSON.stringify(draft.startLayout)!==directBase)previewWorld=directWorld(draft.startLayout);
      }
      draft.changed=draft.candidate?JSON.stringify(draft.candidate)!==directBase:JSON.stringify(draft.startLayout)!==directBase||draft.value!==draft.field.value;
      if(renderer){renderer.setWorld(previewWorld||scene);previewApplied=Boolean(previewWorld);}
    }
    function visibleDirectFields(){
      if(!boundObjectId||!scene)return [];
      const width=canvas.clientWidth,height=canvas.clientHeight,world=previewWorld||scene,occupied=[],result=[];
      const canvasRect=canvas.getBoundingClientRect(),blocked=[];
      ['[data-walk-objects]','.wh-walk-map-wrap','.wh-walk-immersive-controls','[data-walk-direct-status]'].forEach(selector=>{
        const element=root.querySelector(selector);
        if(element&&!element.hidden&&element.getClientRects&&element.getClientRects().length){const r=element.getBoundingClientRect();blocked.push({left:r.left-canvasRect.left,right:r.right-canvasRect.left,top:r.top-canvasRect.top,bottom:r.bottom-canvasRect.top});}
      });
      let controls=directFields;
      if(directDraft&&!directFieldActive&&hasDirectChanges()){
        const anchor=(directFields.find(field=>field.key===directDraft.field.key)||directDraft.field).point,t=stageWords();
        controls=controls.concat([
          {key:'@apply',action:'apply',de:t.apply,en:t.apply,locked:Boolean(directDraft.error||directBusy||directStale),point:{...anchor,y:anchor.y+.4}},
          {key:'@discard',action:'discard',de:t.discard,en:t.discard,locked:directBusy,point:{...anchor,y:anchor.y+.7}}
        ]);
      }
      const candidates=controls.map(field=>({field:field,p:walk.project(camera,field.point,width,height),distance:Math.hypot(field.point.x-camera.x,field.point.y-camera.eye,field.point.z-camera.z)}))
        .filter(item=>item.p&&item.distance>.001&&item.distance<=6).sort((a,b)=>Number(directFieldActive&&b.field.key===(directDraft&&directDraft.field.key))-Number(directFieldActive&&a.field.key===(directDraft&&directDraft.field.key))||
          Math.hypot(a.p.x-width/2,a.p.y-height/2)-Math.hypot(b.p.x-width/2,b.p.y-height/2)||a.distance-b.distance);
      for(const item of candidates){
        if(result.length>=24)break;
        const field=item.field,p=item.p;if(p.x<125||p.x>width-125||p.y<90||p.y>height-120)continue;
        if(blocked.some(r=>p.x+120>r.left&&p.x-120<r.right&&p.y+15>r.top&&p.y-15<r.bottom))continue;
        const direction={x:(field.point.x-camera.x)/item.distance,y:(field.point.y-camera.eye)/item.distance,z:(field.point.z-camera.z)/item.distance};
        const hit=walk.raycast(world,origin(),direction,true,item.distance);
        if(hit&&hit.distance<item.distance-.07)continue;
        if(occupied.some(q=>Math.abs(q.x-p.x)<244&&Math.abs(q.y-p.y)<34))continue;
        occupied.push(p);result.push({field:field,x:p.x,y:p.y});
      }
      return result;
    }
    function paintDirect(){
      const overlay=root.querySelector('[data-walk-handles]'),status=root.querySelector('[data-walk-direct-status]');
      const confirmation=root.querySelector('[data-walk-discard]'),discard=discardWords();
      if(confirmation){
        confirmation.hidden=!discardDirectAction||!immersivePaused;
        if(confirmation.dataset.language!==options.getLanguage()){
          confirmation.dataset.language=options.getLanguage();
          confirmation.innerHTML='<strong>'+esc(discard.question)+'</strong><button type="button" data-walk-action="discard-confirm">'+esc(discard.confirm)+'</button><button type="button" data-walk-action="discard-keep">'+esc(discard.keep)+'</button>';
        }
      }
      directTarget=null;if(!overlay||!status)return;
      const running=boundObjectId&&workMode==='editor'&&!immersivePaused&&document.pointerLockElement===canvas;
      overlay.hidden=!running;status.hidden=!running;
      if(!running){overlay.innerHTML='';return;}
      const fields=visibleDirectFields(),width=canvas.clientWidth,height=canvas.clientHeight;
      const aimed=fields.find(item=>Math.abs(item.x-width/2)<=120&&Math.abs(item.y-height/2)<=15);
      directTarget=aimed&&aimed.field||null;
      overlay.innerHTML=fields.map(function(item){
        const field=item.field,pending=directDraft&&directDraft.field.key===field.key,active=directFieldActive&&pending;
        return '<span class="wh-walk-handle'+(field===directTarget?' is-target':'')+(active?' is-active':'')+(field.action?' is-action':'')+'" data-direct-field="'+esc(field.key)+'" aria-disabled="'+Boolean(field.locked)+'" style="left:'+item.x+'px;top:'+item.y+'px"><span>'+esc(field[options.getLanguage()==='de'?'de':'en'])+'</span>'+(field.action?'':'<b>'+esc(pending?directDraft.input:field.value)+' mm'+(field.locked?' 🔒':'')+'</b>')+'</span>';
      }).join('');
      const t=directWords(),object=info.layout.objects.find(item=>item.id===boundObjectId),draft=directDraft;
      let detail=directBusy?t.saving:directStale?t.stale:directNotice;
      if(draft&&!directBusy&&!directStale){
        const stages=stageWords();
        detail=(directFieldActive?stages.value:stages.object)+' · '+draft.field[options.getLanguage()==='de'?'de':'en']+': '+draft.input+' mm · '+(directFieldActive?t.help:stages.help);
        if(draft.error)detail+=' · '+t.invalid+' '+draft.error;
        else if(draft.impact)detail+=' · '+t.impact+': '+draft.impact.locations+' / '+draft.impact.codes+' / '+draft.impact.articles+' · '+t.collisions+': '+draft.collisions;
        if(draft.saveError||draft.blocked)detail+=' · '+(draft.saveError||draft.blocked);
      }
      if(discardDirectAction)detail=discard.question+' · '+(draft?draft.input+' mm · ':'')+discard.keys;
      status.classList.toggle('is-confirming',Boolean(discardDirectAction));
      status.classList.toggle('is-invalid',Boolean(draft&&(draft.error||draft.saveError||draft.blocked)||directStale));
      status.dataset.editorStage=discardDirectAction?'discard':directFieldActive?'value':'object';
      status.innerHTML='<strong>'+esc(object&&object.name)+' · '+esc(discardDirectAction?discard.question:directFieldActive?stageWords().value:draft?stageWords().object:t.release)+'</strong><span>'+esc(detail||t.field)+'</span>';
    }
    async function saveDirect(){
      if(!directDraft||directBusy||directStale)return;prepareDirect();
      if(directFieldActive){finishDirectField();return;}
      const draft=directDraft;if(draft.error)return;
      if(!hasDirectChanges()){clearDirect(false);return;}
      if(!draft.candidate)return;
      if(JSON.stringify(options.getLayout())!==directBase){directStale=true;directNotice=directWords().stale;schedule();return;}
      if(motion.mode==='walk'&&!walk.canOccupy(previewWorld,camera,motion.feet,camera.eye-motion.feet)){draft.blocked=directWords().occupied;schedule();return;}
      draft.blocked='';draft.saveError='';
      const epoch=directEpoch,revision=workspaceRevision,id=options.getWorkspaceId(),base=directBase;
      directBusy=true;schedule();
      try{
        await options.saveLayout(draft.candidate,base);
        if(disposed||workspaceRevision!==revision||options.getWorkspaceId()!==id)return;
        previewWorld=null;previewApplied=false;refresh();
        // Refresh a retained binding after its submitted write finishes,
        // without reviving an object released while that write was pending.
        if(boundObjectId){directDraft=null;directFieldActive=false;directDirty=false;directBase=JSON.stringify(options.getLayout());directFields=window.OpenSlottingWalkEditor.directFields(model,info.layout,boundObjectId);directNotice=directWords().saved;}
      }catch(error){
        if(disposed||workspaceRevision!==revision||options.getWorkspaceId()!==id)return;
        if(['edit-conflict','edit-timeout','session-ended'].includes(error.message))directStale=true;
        directNotice=directStale?directWords().stale:directWords().failed;
        if(epoch===directEpoch)draft.saveError=directNotice;
      }finally{if(!disposed&&workspaceRevision===revision&&options.getWorkspaceId()===id){directBusy=false;schedule();}}
    }
    function editText(){return options.getLanguage()==='de'
      ?{mode:'Rundgang-Modus',analysis:'Auswertung',editor:'Editor',open:'Objekt bearbeiten',recipes:'Rezepte (B)',objects:'Objekte auswählen',list:'Objekte',search:'Objekt suchen',back:'Zurück zum Menü',resume:'Weiter mit Mausblick',empty:'Keine passenden Objekte.',aim:'Bearbeiten',noTarget:'Kein erreichbares Lagerobjekt im Fadenkreuz (max. 6 m).'}
      :{mode:'Walk mode',analysis:'Evaluation',editor:'Editor',open:'Edit object',recipes:'Recipes (B)',objects:'Select objects',list:'Objects',search:'Search objects',back:'Back to menu',resume:'Resume mouse look',empty:'No matching objects.',aim:'Edit',noTarget:'No reachable warehouse object under the crosshair (max. 6 m).'};}
    function setWorkMode(value){clearDirect(true);workMode=value==='editor'&&canEdit()?'editor':'analysis';pauseImmersive();
      if(info&&!info.layout.objects.length)tell(workMode==='editor'?'':text().noLayout);syncImmersive();}
    function markObject(id){
      selectedObjectId=info&&info.layout.objects.some(object=>object.id===id)?id:null;
      root.querySelectorAll('[data-walk-object]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.walkObject===selectedObjectId)));
    }
    function openEdit(scope){if(workMode==='editor'&&canEdit()){if(requestDirectDiscard(()=>openEdit(scope)))return;markObject(scope&&scope.objectId||selectedObjectId);pauseImmersive();options.openEditor(scope||(selectedObjectId?{objectId:selectedObjectId}:null));}}
    function openRecipes(){if(workMode==='editor'&&canEdit()&&options.openRecipes){if(requestDirectDiscard(openRecipes))return;pauseImmersive();options.openRecipes();}}
    function renderObjects(){
      const items=root.querySelector('[data-walk-object-items]');if(!items||!info)return;
      const query=objectSearch.trim().toLocaleLowerCase(options.getLanguage()),objects=info.layout.objects.filter(object=>!query||(object.name+' '+object.type).toLocaleLowerCase(options.getLanguage()).includes(query));
      const types=options.getLanguage()==='de'?{'pallet-rack':'Palettenregal','shelf-rack':'Fachbodenregal',wall:'Wand',gate:'Tor',door:'Tür','emergency-exit':'Notausgang',aisle:'Gang / Straße','goods-in':'Wareneingang','goods-out':'Warenausgang'}
        :{'pallet-rack':'Pallet rack','shelf-rack':'Shelf rack',wall:'Wall',gate:'Gate',door:'Door','emergency-exit':'Emergency exit',aisle:'Aisle / road','goods-in':'Goods in','goods-out':'Goods out'};
      items.innerHTML=objects.length?objects.map(object=>'<button type="button" data-walk-object="'+esc(object.id)+'" class="'+(object.id===aimedObjectId?'is-aimed':'')+'" aria-pressed="'+(object.id===selectedObjectId)+'" title="'+esc(object.name)+'"><strong>'+esc(object.name)+'</strong><small>'+esc(types[object.type]||object.name)+(object.locked?' · 🔒':'')+'</small></button>').join(''):'<p>'+esc(editText().empty)+'</p>';
      const count=root.querySelector('[data-walk-object-count]');if(count)count.textContent=objects.length+' / '+info.layout.objects.length;
    }
    function openObjects(){
      if(workMode!=='editor'||!canEdit())return;
      pauseImmersive();objectsOpen=true;showControls=false;syncImmersive();
      const search=root.querySelector('[data-walk-object-search]');if(search)search.focus({preventScroll:true});
    }
    function trapObjectKeys(event){
      if(event.key==='Escape'){event.preventDefault();openMenu(true);return;}
      if(event.key!=='Tab')return;
      const panel=root.querySelector('[data-walk-objects]'),controls=Array.from(panel.querySelectorAll('button,input,[tabindex]'))
        .filter(control=>!control.disabled&&!control.hidden&&(!control.getClientRects||control.getClientRects().length));
      const first=controls[0],last=controls[controls.length-1];
      if(first&&(!controls.includes(document.activeElement)||event.shiftKey&&document.activeElement===first||!event.shiftKey&&document.activeElement===last)){event.preventDefault();(event.shiftKey?last:first).focus();}
    }
    function editTarget(){
      if(!visible()||!scene||!renderer||!renderer.available())return null;
      const hit=walk.raycast(scene,origin(),walk.ray(camera,0,0,canvas.clientWidth/Math.max(1,canvas.clientHeight)),false,6,true);
      return hit&&hit.distance<=6?hit:null;
    }
    function editScope(hit){return Object.assign({objectId:hit.item.box.object.id},hit.item.box.slotRef||{},
      hit.item.box.bayIndex===undefined?{}:{bayIndex:hit.item.box.bayIndex},hit.item.box.levelIndex===undefined?{}:{levelIndex:hit.item.box.levelIndex});}
    const inertBefore=new Map();
    let motion=walk.createMotion(),standingEye=1.7,walkSpeed=1.4,flySpeed=5,crouchToggle=false,jumpQueued=false,simulationRunning=false;
    const keys=new Set();
    let savingFov=false,workspaceRevision=0;
    let immersiveRequest=0,immersivePaused=true,showControls=false,mapVisible=true,fullscreenPending=false;
    let mouseRequest=0,inlineFallback=false,fallbackOffered=false;
    const renderer=window.OpenSlottingWarehouseWalkRenderer.create(canvas,walk,{
      lost:function(){if(disposed)return;pauseImmersive();message=text().unavailable;labelTime=-Infinity;
        const overlay=root.querySelector('.wh-walk-labels');if(overlay)overlay.innerHTML='';
        updatePanel();syncImmersive();},
      restored:function(){if(disposed)return;message='';labelTime=-Infinity;
        updatePanel();syncImmersive();schedule();}
    });
    function savedFov(){const prefs=options.getPreferences?options.getPreferences():null;return walk.fieldOfView({fov:prefs&&prefs.fov});}
    function syncFovControls(){
      const input=root.querySelector('[data-walk-fov]'),output=root.querySelector('[data-walk-fov-value]'),reset=root.querySelector('[data-walk-action="fov-reset"]');
      if(input){input.value=String(camera.fov);input.disabled=savingFov||!options.savePreferences;}
      if(output)output.textContent=camera.fov+'°';
      if(reset)reset.disabled=savingFov||!options.savePreferences;
      syncImmersive(false);
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
      if(workMode==='editor'&&directEnabled()){directClick();return;}
      if(workMode==='editor'){const hit=editTarget();if(hit)openEdit(editScope(hit));else tell(editText().noTarget);return;}
      const id=interactionTarget();if(id)openInteraction(id);else tell(text().noTarget);
    }
    function paintInteractionHint(){
      const prompt=root.querySelector('[data-walk-interact-hint]');if(!prompt){showAim(null);return;}
      if(workMode==='editor'){
        const hit=fullscreen()&&!immersivePaused&&!interactionSlotId&&document.pointerLockElement===canvas?editTarget():null;
        showAim(boundObjectId||(hit?hit.item.box.object.id:null));
        if(boundObjectId){
          if(discardDirectAction&&!immersivePaused){prompt.hidden=false;prompt.textContent=discardWords().question+' '+discardWords().keys;return;}
          prompt.hidden=!directTarget||directFieldActive;prompt.textContent=directTarget?(directTarget.action?(options.getLanguage()==='de'?'Linksklick':'Left click')+' · '+directTarget[options.getLanguage()==='de'?'de':'en']:directTarget.locked?directWords().locked:directWords().field):'';return;
        }
        prompt.hidden=!hit&&!directStale;prompt.textContent=directStale?directWords().stale:hit?(directEnabled()?directWords().bind+' · ':'E · '+editText().aim+': ')+hit.item.box.object.name:'';return;
      }
      showAim(null);
      const id=fullscreen()&&!immersivePaused&&!interactionSlotId?interactionTarget():null,slot=id&&info.slotsById.get(id);
      prompt.hidden=!slot;
      if(!slot){prompt.textContent='';return;}
      const t=text(),location=slot.code||slot.objectName+' · '+t.bay+' '+(slot.bayIndex+1)+' · '+
        (slot.ground?t.ground:t.level+' '+(slot.levelIndex+1))+' · '+t.place+' '+(slot.positionIndex+1);
      const label='E · '+t.interact+': '+location;
      if(prompt.textContent!==label)prompt.textContent=label;
    }
    function trapInteractionKeys(event){
      if(event.key==='Escape'){event.preventDefault();closeInteraction(false);openMenu(true);tell(text().paused);return;}
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
    function trapMenuFocus(event){
      if(!showControls||interactionSlotId)return;
      const menu=root.querySelector('.wh-walk-menu');if(!menu)return;
      const controls=Array.from(menu.querySelectorAll('button, select, input, [tabindex]'))
        .filter(element=>!element.disabled&&!element.hidden&&(!element.getClientRects||element.getClientRects().length));
      const first=controls[0],last=controls[controls.length-1];
      if(!first){event.preventDefault();menu.focus({preventScroll:true});return;}
      if(!controls.includes(document.activeElement)||event.shiftKey&&document.activeElement===first||!event.shiftKey&&document.activeElement===last){
        event.preventDefault();(event.shiftKey?last:first).focus({preventScroll:true});
      }
    }
    async function resumeMovement(){
      if(switchingWorkMode)return;
      objectsOpen=false;
      if(!immersivePaused){pauseImmersive();return;}
      if(!fullscreen()&&!inlineFallback)return;
      await mouseLook();
    }
    function syncMotionControls(preserveNumber){
      const mode=root.querySelector('[data-walk-mode]'),eye=root.querySelector('[data-walk-eye]');
      if(mode)mode.value=motion.mode;if(eye){eye.value=String(Math.round(standingEye*1000));eye.disabled=motion.mode==='fly';}
      ['[data-walk-speed]','[data-walk-speed-range]'].forEach(selector=>{const input=root.querySelector(selector);if(input&&!(preserveNumber&&selector==='[data-walk-speed]'))input.value=String(speed);});
      const output=root.querySelector('[data-walk-speed-value]');if(output)output.textContent=(speed*3.6).toLocaleString(options.getLanguage(),{maximumFractionDigits:1})+' km/h';
      ['jump','crouch'].forEach(action=>{const button=root.querySelector('[data-walk-action="'+action+'"]');if(button){button.disabled=motion.mode==='fly'||!renderer||!renderer.available()||immersivePaused;if(action==='crouch')button.setAttribute('aria-pressed',String(crouchToggle));}});
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
    function visible(){return !disposed&&active&&options.isVisible()&&!document.hidden;}
    function stop(){keys.clear();jumpQueued=false;simulationRunning=false;drag=null;lastTime=0;if(request!==null){window.cancelAnimationFrame(request);request=null;}}
    function fullscreen(){return Boolean(options.standalone)||document.fullscreenElement===root;}
    function releaseMouse(){if(document.pointerLockElement===canvas)document.exitPointerLock();}
    function syncImmersive(repaint){
      if(disposed)return;
      const locked=document.pointerLockElement===canvas;
      root.classList.toggle('is-walk-paused',immersivePaused);root.classList.toggle('walk-controls-open',showControls);
      root.classList.toggle('is-walk-windowed',inlineFallback);root.classList.toggle('is-walk-window',Boolean(options.standalone));
      root.classList.toggle('walk-map-hidden',!mapVisible);
      root.classList.toggle('walk-objects-open',objectsOpen);
      const menu=root.querySelector('.wh-walk-menu');
      if(menu){
        menu.hidden=objectsOpen||fullscreen()&&(!showControls||Boolean(interactionSlotId));
        menu.setAttribute('role',fullscreen()?'dialog':'region');
        menu.setAttribute('aria-modal',String(fullscreen()&&showControls&&!interactionSlotId));
        const heading=root.querySelector('[data-walk-menu-title]');if(heading)heading.textContent=fullscreen()?text().menu:text().setup;
      }
      const body=root.querySelector('.wh-walk-body');if(body)body.inert=objectsOpen||fullscreen()&&immersivePaused;
      const hud=root.querySelector('.wh-walk-immersive-controls');if(hud)hud.inert=objectsOpen||fullscreen()&&showControls;
      const header=root.querySelector('.wh-header');if(header)header.inert=objectsOpen;
      const objectPanel=root.querySelector('[data-walk-objects]');if(objectPanel){
        objectPanel.hidden=workMode!=='editor'||!canEdit()||!fullscreen()&&!inlineFallback&&!objectsOpen;
        objectPanel.inert=!objectsOpen;objectPanel.setAttribute('role',objectsOpen?'dialog':'region');objectPanel.setAttribute('aria-modal',String(objectsOpen));
      }
      root.querySelectorAll('[data-walk-object-controls]').forEach(control=>{control.hidden=!objectsOpen;});
      const objectHint=root.querySelector('[data-walk-object-hint]');if(objectHint)objectHint.hidden=objectsOpen;
      const hint=root.querySelector('#warehouse-walk-hint');if(hint)hint.textContent=fullscreen()||inlineFallback
        ?(motion.mode==='fly'?text().flightHint:text().walkHint)+' · '+text().menuHint:options.startWindow?text().windowIntro:text().setupHint;
      const start=root.querySelector('[data-walk-action="fullscreen"]');
      if(start)start.disabled=fullscreenPending||switchingWorkMode||savingFov||!options.startWindow&&!root.requestFullscreen||!renderer||!renderer.available()||!info||(!info.layout.objects.length&&workMode!=='editor');
      const fallback=root.querySelector('[data-walk-action="windowed"]');
      if(fallback){fallback.hidden=!fallbackOffered;fallback.disabled=savingFov||!renderer||!renderer.available()||!info||(!info.layout.objects.length&&workMode!=='editor');}
      const resume=root.querySelector('[data-walk-action="resume"]');if(resume)resume.textContent=locked||fullscreen()&&!immersivePaused?text().pause:text().resume;
      const role=root.querySelector('[data-walk-work-mode]');if(role){role.value=workMode;role.disabled=switchingWorkMode||savingFov;}
      const edit=root.querySelector('[data-walk-action="edit-layout"]');if(edit)edit.hidden=workMode!=='editor'||!canEdit();
      ['recipes','objects'].forEach(action=>{const button=root.querySelector('[data-walk-action="'+action+'"]');if(button)button.hidden=workMode!=='editor'||!canEdit();});
      const roleLabel=root.querySelector('[data-walk-work-label]');if(roleLabel)roleLabel.textContent=editText()[workMode];
      const frontKey=root.querySelector('[data-walk-front-key]');if(frontKey){frontKey.hidden=!info||!info.layout.objects.some(object=>model.RACK_TYPES.includes(object.type));frontKey.textContent=options.getLanguage()==='de'?'↗ Gold = Bedienseite / Regalfront':'↗ Gold = access side / rack front';}
      const controls=root.querySelector('[data-walk-action="controls"]');if(controls)controls.setAttribute('aria-expanded',String(showControls));
      const mapToggle=root.querySelector('[data-walk-action="map"]');if(mapToggle)mapToggle.setAttribute('aria-pressed',String(mapVisible));
      syncMotionControls();
      paintInteractionHint();
      labelTime=-Infinity;if(repaint!==false)schedule();
    }
    function pauseImmersive(){stop();objectsOpen=false;immersiveRequest++;immersivePaused=true;showControls=fullscreen()&&!interactionSlotId;releaseMouse();syncImmersive(false);paintDirect();}
    function openMenu(focus){
      pauseImmersive();showControls=true;syncImmersive();
      if(focus){const button=root.querySelector('[data-walk-action="resume"]');if(button)button.focus({preventScroll:true});}
    }
    function leaveImmersive(){closeInteraction(false);pauseImmersive();showControls=false;
      inlineFallback=false;
      if(document.fullscreenElement===root&&document.exitFullscreen)Promise.resolve(document.exitFullscreen()).catch(()=>tell(text().fullscreenFailed));
      syncImmersive();
    }
    function acceptMouseLook(token){
      if(token!==immersiveRequest||!visible()||interactionSlotId||fullscreenPending||document.pointerLockElement!==canvas)return;
      if(!fullscreen()&&!inlineFallback){releaseMouse();return;}
      immersivePaused=false;simulationRunning=true;showControls=false;syncImmersive();canvas.focus({preventScroll:true});
    }
    function mouseLookFailed(token){
      if(token!==immersiveRequest||!visible())return;
      stop();immersivePaused=true;showControls=true;tell(text().lookFailed);syncImmersive();
    }
    function requestMouseLook(token){
      mouseRequest=token;
      try {
        canvas.focus({preventScroll:true});
        return Promise.resolve(canvas.requestPointerLock()).then(function(){
          if(token!==immersiveRequest||!visible()||interactionSlotId){
            if(mouseRequest===token||!visible()||interactionSlotId)releaseMouse();return;
          }
          acceptMouseLook(token);
        },function(){mouseLookFailed(token);});
      } catch(_){mouseLookFailed(token);return Promise.resolve();}
    }
    async function mouseLook(){
      if(!fullscreen()&&!inlineFallback)return;
      await requestMouseLook(++immersiveRequest);
    }
    async function enterFullscreen(){
      if(fullscreenPending||switchingWorkMode||savingFov||!visible()||!renderer||!renderer.available()||(!info.layout.objects.length&&workMode!=='editor'))return;
      if(!root.requestFullscreen){fallbackOffered=true;tell(text().fullscreenFailed);syncImmersive();return;}
      fullscreenPending=true;
      const token=++immersiveRequest;stop();immersivePaused=true;showControls=false;
      try {
        // Pointer lock must be requested before fullscreen consumes user activation.
        const locking=requestMouseLook(token);
        await root.requestFullscreen();
        if(token!==immersiveRequest||!visible()){releaseMouse();if(fullscreen())await document.exitFullscreen();return;}
        inlineFallback=false;fullscreenPending=false;syncImmersive();acceptMouseLook(token);await locking;
      } catch(_){if(token===immersiveRequest&&visible()){
        immersiveRequest++;stop();immersivePaused=true;releaseMouse();fallbackOffered=true;tell(text().fullscreenFailed);
      }}
      finally{fullscreenPending=false;if(fullscreen()&&immersivePaused&&!interactionSlotId)showControls=true;syncImmersive();}
    }
    function viewSnapshot(){return {camera:{...camera},mode:motion.mode,standingEye:standingEye,
      workMode:workMode,speed:speed,walkSpeed:walkSpeed,flySpeed:flySpeed,mapVisible:mapVisible,selectedId:selectedId,colorMode:colorMode};}
    function insertionPoint(object){
      // Center the new footprint three meters ahead; its access side faces the observer.
      const rotation=((Math.round((180-camera.yaw*180/Math.PI)/90)*90)%360+360)%360;
      const corners=model.footprintCorners(Object.assign({},object,{x:0,z:0,rotation:rotation}));
      const xs=corners.map(point=>point.x),zs=corners.map(point=>point.z);
      return {x:Math.round(((camera.x+Math.sin(camera.yaw)*3)*1000-(Math.min(...xs)+Math.max(...xs))/2)/100)*100,
        z:Math.round(((camera.z+Math.cos(camera.yaw)*3)*1000-(Math.min(...zs)+Math.max(...zs))/2)/100)*100,rotation:rotation};
    }
    async function startWalk(){
      if(!options.startWindow)return enterFullscreen();
      if(fullscreenPending||switchingWorkMode||savingFov||!visible()||!renderer||!renderer.available()||(!info.layout.objects.length&&workMode!=='editor'))return;
      const revision=workspaceRevision;fullscreenPending=true;pauseImmersive();syncImmersive();
      try {await options.startWindow(viewSnapshot());if(visible()&&revision===workspaceRevision)tell(text().windowReady);}
      catch(_){if(visible()&&revision===workspaceRevision){fallbackOffered=true;tell(text().windowFailed);}}
      finally{fullscreenPending=false;syncImmersive();}
    }
    function applyInitialView(value){
      if(!value||!value.camera)return;
      const supplied=value.camera,b=scene.bounds;
      if(!['x','z','eye','yaw','pitch'].every(key=>Number.isFinite(supplied[key])))return;
      if(supplied.x<b.minX||supplied.x>b.maxX||supplied.z<b.minZ||supplied.z>b.maxZ)return;
      const nextMode=value.mode==='fly'?'fly':'walk',eye=Number(value.standingEye);
      if(!Number.isFinite(eye)||eye<1||eye>2.2||nextMode==='walk'&&!walk.canStand(scene,supplied,eye))return;
      motion=walk.createMotion(nextMode);standingEye=eye;
      camera.x=supplied.x;camera.z=supplied.z;camera.eye=nextMode==='walk'?eye:Math.max(.3,Math.min(80,supplied.eye));
      camera.yaw=supplied.yaw%(Math.PI*2);camera.pitch=Math.max(-1.35,Math.min(1.35,supplied.pitch));
      walkSpeed=walk.movementSpeed(value.walkSpeed);flySpeed=walk.movementSpeed(value.flySpeed);
      speed=nextMode==='walk'?walkSpeed:flySpeed;mapVisible=value.mapVisible!==false;
      if(scene.positions.has(value.selectedId))selectedId=value.selectedId;
      if(renderer)renderer.selection(selectedId);
    }
    function setActive(value){active=Boolean(value);if(!active){clearDirect(true);leaveImmersive();}else schedule();}
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
      const boxes=window.OpenSlottingWarehouseScene.buildBoxes(model,layout,matches,{colorMode:colorMode==='usage'?'usage':'structure',showOrientation:true});
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
    function select(id){if(!scene.positions.has(id))return;selectedId=id;if(renderer)renderer.selection(id);message='';updatePanel();labelTime=-Infinity;schedule();if(fullscreen()){if(workMode==='editor')openEdit(info.slotsById.get(id));else openInteraction(id);}}
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
      const regular=root.querySelector('.wh-walk-labels');if(regular)regular.hidden=Boolean(boundObjectId);
      if(boundObjectId)return;
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
      prepareDirect();paintDirect();paintInteractionHint();
      if(!scene)return;if(renderer&&renderer.available()){renderer.render(camera);paintLabels(time);}
      paintMap();const position=(motion.mode==='fly'?text().fly:motion.crouched?text().crouched+(motion.standBlocked?' · '+text().standBlocked:''):text().standing)+' · '+text().position+': X '+camera.x.toFixed(1)+' m · Z '+camera.z.toFixed(1)+' m · '+text().heightView+': '+camera.eye.toFixed(2)+' m';
      ['[data-walk-position]','[data-walk-hud-position]'].forEach(selector=>{const output=root.querySelector(selector);if(output)output.textContent=position;});
    }
    function tick(time){
      request=null;if(!visible()){stop();return;}const delta=lastTime?Math.min(.05,(time-lastTime)/1000):.016;lastTime=time;
      const forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);
      const side=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
      if(simulationRunning&&document.pointerLockElement===canvas&&!interactionSlotId)walk.stepMotion(scene,camera,motion,{forward,side,vertical:(keys.has('Space')?1:0)-(keys.has('KeyC')?1:0),
        crouch:crouchToggle||keys.has('KeyC'),jump:jumpQueued},delta,speed,standingEye);
      jumpQueued=false;paint(time);if(simulationRunning&&(keys.size||motion.mode==='walk'&&!motion.grounded))schedule();else lastTime=0;
    }
    function schedule(){if(visible()&&request===null)request=window.requestAnimationFrame(tick);}
    function render(){
      if(disposed)return;clearDirect(true);if(!options.standalone)directStale=false;
      restoreBackground();
      const id=options.getWorkspaceId(),changed=id!==workspaceId;workspaceId=id;stop();
      if(changed){directBusy=false;directStale=false;}
      if(changed||!savingFov)camera.fov=savedFov();
      if(changed){workspaceRevision++;leaveImmersive();fallbackOffered=false;mapVisible=true;selectedId=null;search='';message='';camera.eye=standingEye=1.7;motion=walk.createMotion();walkSpeed=speed=1.4;flySpeed=5;crouchToggle=false;colorMode='assignments';details=true;}
      if(changed&&options.initialView&&['assignments','usage','demand'].includes(options.initialView.colorMode))colorMode=options.initialView.colorMode;
      if(changed)workMode=canEdit()&&options.initialView&&options.initialView.workMode==='editor'?'editor':'analysis';
      if(changed){selectedObjectId=null;objectSearch='';objectsOpen=false;}
      refresh();if(changed||motion.mode==='walk'&&!walk.canOccupy(scene,camera,motion.feet,camera.eye-motion.feet))resetPosition();const t=text();
      if(!info.layout.objects.some(object=>object.id===selectedObjectId))selectedObjectId=null;
      if(changed&&options.initialView)applyInitialView(options.initialView);
      if(options.standalone)showControls=immersivePaused&&!interactionSlotId;
      root.classList.add('wh-walk-root');
      root.innerHTML='<div class="wh-header"><div><p class="wh-eyebrow">OpenSlotting · 3D</p><h3>'+esc(t.title)+'</h3><p>'+esc(options.startWindow?t.windowIntro:t.setupHint)+'</p></div>'+
        '<div class="wh-walk-launch"><button type="button" data-walk-action="fullscreen">'+esc(t.start)+'</button><button type="button" data-walk-action="windowed" hidden>'+esc(options.startWindow?t.startHere:t.windowed)+'</button><button type="button" data-walk-action="setup">'+esc(t.backToSetup)+'</button></div></div>'+
        '<div class="wh-walk-main"><section class="wh-walk-menu" role="region" aria-labelledby="warehouse-walk-menu-title" tabindex="-1"><header class="wh-walk-menu-heading"><h4 id="warehouse-walk-menu-title" data-walk-menu-title>'+esc(t.setup)+'</h4></header>'+
        '<div class="wh-walk-toolbar">'+(canEdit()?'<fieldset class="wh-walk-work-mode"><legend>'+esc(editText().mode)+'</legend><select data-walk-work-mode><option value="analysis">'+esc(editText().analysis)+'</option><option value="editor">'+esc(editText().editor)+'</option></select><button type="button" data-walk-action="recipes" hidden>'+esc(editText().recipes)+'</button><button type="button" data-walk-action="objects" hidden>'+esc(editText().objects)+'</button><button type="button" data-walk-action="edit-layout" hidden>'+esc(editText().open)+'</button></fieldset>':'')+'<fieldset><legend>'+esc(t.motionSettings)+'</legend>'+
        '<label>'+esc(t.mode)+'<select data-walk-mode><option value="walk"'+(motion.mode==='walk'?' selected':'')+'>'+esc(t.walk)+'</option><option value="fly"'+(motion.mode==='fly'?' selected':'')+'>'+esc(t.fly)+'</option></select></label>'+
        '<label class="wh-walk-speed">'+esc(t.speed)+'<span><input type="range" data-walk-speed-range aria-label="'+esc(t.speed)+'" min="0.1" max="20" step="0.1" value="'+speed+'"><input type="number" data-walk-speed aria-label="'+esc(t.speed)+'" min="0.1" max="20" step="0.1" value="'+speed+'"></span><output data-walk-speed-value></output></label>'+
        '<label>'+esc(t.eye)+'<input type="number" data-walk-eye min="1000" max="2200" step="50" value="'+Math.round(standingEye*1000)+'"></label>'+
        '<div class="wh-walk-motion-actions"><button type="button" data-walk-action="jump">'+esc(t.jump)+'</button><button type="button" data-walk-action="crouch" aria-pressed="'+crouchToggle+'">'+esc(t.crouch)+'</button></div></fieldset>'+
        '<fieldset><legend>'+esc(t.viewSettings)+'</legend><label class="wh-walk-fov">'+esc(t.fov)+'<span><input type="range" data-walk-fov min="'+walk.MIN_FOV+'" max="'+walk.MAX_FOV+'" step="1" value="'+camera.fov+'"><output data-walk-fov-value>'+camera.fov+'°</output></span></label><button type="button" data-walk-action="fov-reset">'+esc(t.fovReset)+'</button>'+
        '<label>'+esc(t.colors)+'<select data-walk-colors>'+['assignments','usage','demand'].map(key=>'<option value="'+key+'"'+(key===colorMode?' selected':'')+'>'+esc(t[key])+'</option>').join('')+'</select></label>'+
        '<button type="button" data-walk-action="map" aria-pressed="'+mapVisible+'">'+esc(t.toggleMap)+'</button><button type="button" data-walk-action="details" aria-expanded="'+details+'">'+esc(t.info)+'</button></fieldset>'+
        '<fieldset><legend>'+esc(t.navigationSettings)+'</legend><label>'+esc(t.search)+'<input type="search" data-walk-search maxlength="80" value="'+esc(search)+'"></label><button type="button" data-walk-action="find">'+esc(t.find)+'</button><button type="button" data-walk-action="reset">'+esc(t.reset)+'</button>'+
        (options.refreshSnapshot?'<button type="button" data-walk-action="refresh-window">'+esc(t.refresh)+'</button>':'')+'</fieldset></div>'+
        '<footer class="wh-walk-menu-actions"><div class="wh-walk-discard" data-walk-discard role="group" hidden></div><button type="button" data-walk-action="resume">'+esc(t.resume)+'</button><button type="button" data-walk-action="exit-fullscreen">'+esc(options.standalone?t.closeWindow:t.exitFullscreen)+'</button><p>'+esc(t.menuHint)+'</p><p role="status" data-walk-immersive-message></p></footer></section>'+
        '<div class="wh-walk-body"><div class="wh-walk-viewport"><div class="wh-walk-labels"></div><div class="wh-walk-handles" data-walk-handles hidden></div><div class="wh-walk-direct-status" data-walk-direct-status hidden></div><div class="wh-walk-map-wrap"><small>'+esc(t.map)+'</small></div><span class="wh-walk-crosshair" aria-hidden="true">+</span><span class="wh-walk-interact-hint" data-walk-interact-hint hidden></span></div><aside class="wh-walk-inspector wh-card"></aside></div></div>'+
        '<div class="wh-walk-immersive-controls" role="group" aria-label="'+esc(t.controls)+'"><span data-walk-work-label></span><span class="wh-walk-front-key" data-walk-front-key hidden></span><button type="button" data-walk-action="controls" aria-expanded="false">'+esc(t.menu)+'</button><small>'+esc(motion.mode==='fly'?t.flightHint:t.walkHint)+'</small><small data-walk-hud-position></small></div>'+
        '<div class="wh-walk-footer"><p id="warehouse-walk-hint">'+esc(motion.mode==='fly'?t.flightHint:t.walkHint)+' · '+esc(t.menuHint)+'</p><output data-walk-position></output><p class="wh-legend">'+esc(colorMode==='demand'?t.demandLegend:colorMode==='usage'?[t.unassigned,t.picking,t.reserve].join(' · '):[t.matched,t.coded,t.empty].join(' · '))+'</p><p role="status" aria-live="polite" data-walk-message></p></div>'+
        '<div class="wh-walk-interaction" role="dialog" aria-modal="true" aria-labelledby="warehouse-walk-interaction-title" tabindex="-1" hidden></div>';
      root.insertAdjacentHTML('beforeend','<section class="wh-walk-object-list" data-walk-objects aria-label="'+esc(editText().list)+'" hidden><header><strong>'+esc(editText().list)+'</strong><small data-walk-object-count></small></header><label data-walk-object-controls hidden>'+esc(editText().search)+'<input type="search" data-walk-object-search maxlength="120" value="'+esc(objectSearch)+'"></label><div class="wh-walk-object-items" data-walk-object-items></div><small data-walk-object-hint>'+esc(options.getLanguage()==='de'?'B: Rezepte'+String.fromCharCode(10)+'Tab: Objekte im Men\u00fc ausw\u00e4hlen':'B: Recipes'+String.fromCharCode(10)+'Tab: select objects in menu')+'</small><footer data-walk-object-controls hidden><button type="button" data-walk-action="resume">'+esc(editText().resume)+'</button><button type="button" data-walk-action="objects-close">'+esc(editText().back)+'</button></footer></section>');
      root.querySelector('.wh-walk-viewport').prepend(canvas);root.querySelector('.wh-walk-map-wrap').appendChild(map);
      canvas.setAttribute('aria-label',t.view);canvas.setAttribute('aria-describedby','warehouse-walk-hint');map.setAttribute('aria-label',t.map);map.setAttribute('role','img');
      if(!renderer||!renderer.available())message=t.unavailable;else if((!info.layout.objects.length&&workMode!=='editor'))message=t.noLayout;
      else if(!options.startWindow&&!root.requestFullscreen)message=t.fullscreenFailed;
      fallbackOffered=fallbackOffered||!options.startWindow&&!root.requestFullscreen;
      const fullButton=root.querySelector('[data-walk-action="fullscreen"]');if(fullButton)fullButton.disabled=!root.requestFullscreen||!renderer||!renderer.available();
      renderObjects();updatePanel();syncFovControls();syncMotionControls();active=options.isVisible();renderInteraction();syncImmersive();paint(0);schedule();
    }
    function find(){const slot=info.slots.find(s=>search.trim()&&s.code===search.trim());if(!slot){tell(text().notFound);return;}select(slot.slotId);}
    root.addEventListener('input',event=>{if(event.target.hasAttribute('data-walk-search'))search=event.target.value;
      if(event.target.hasAttribute('data-walk-object-search')){objectSearch=event.target.value;renderObjects();}
      if(event.target.hasAttribute('data-walk-speed-range'))changeSpeed(event.target.value);
      if(event.target.hasAttribute('data-walk-speed')&&Number(event.target.value)>=.1&&Number(event.target.value)<=20)changeSpeed(event.target.value,true);
      if(event.target.hasAttribute('data-walk-fov')&&!savingFov)previewFov(event.target.value);});
    async function changeWorkMode(value){
      if(switchingWorkMode)return;if(requestDirectDiscard(()=>changeWorkMode(value))){syncImmersive();return;}pauseImmersive();switchingWorkMode=true;syncImmersive();
      try{if(options.setWorkMode)await options.setWorkMode(value);setWorkMode(value);}
      catch(_){tell(text().windowFailed);}finally{switchingWorkMode=false;syncImmersive();}
    }
    root.addEventListener('change',async function(event){
      if(event.target.hasAttribute('data-walk-work-mode')){await changeWorkMode(event.target.value);return;}
      if(event.target.hasAttribute('data-walk-interaction-article')){interactionArticleId=event.target.value;renderInteraction('[data-walk-interaction-article]');return;}
      if(event.target.hasAttribute('data-walk-fov')){await saveFov(event.target.value);return;}
      if(event.target.hasAttribute('data-walk-mode')){changeMode(event.target.value);return;}
      if(event.target.hasAttribute('data-walk-eye')){const value=Number(event.target.value)/1000;
        if(value>=1&&value<=2.2&&motion.mode==='walk'&&walk.canOccupy(scene,camera,motion.feet,value)){standingEye=value;camera.eye=motion.feet+value;motion.crouched=false;crouchToggle=false;syncMotionControls();schedule();}else {event.target.value=Math.round(standingEye*1000);tell(text().blocked);}}
      if(event.target.hasAttribute('data-walk-speed')||event.target.hasAttribute('data-walk-speed-range')){changeSpeed(event.target.value);syncMotionControls();}
      if(event.target.hasAttribute('data-walk-colors')){const value=event.target.value;const apply=()=>{colorMode=['assignments','usage','demand'].includes(value)?value:'assignments';render();};if(requestDirectDiscard(apply))event.target.value=colorMode;else apply();}
    });
    root.addEventListener('click',async function handleWalkClick(event){
      const object=event.target.closest('[data-walk-object]');if(object&&objectsOpen){openEdit({objectId:object.dataset.walkObject});return;}
      if(interactionSlotId&&!event.target.closest('.wh-walk-interaction'))return;
      const tab=event.target.closest('[data-walk-inspect-tab]');
      if(tab&&interactionSlotId){interactionTab=['overview','master','periods'].includes(tab.dataset.walkInspectTab)?tab.dataset.walkInspectTab:'overview';renderInteraction('[data-walk-inspect-tab="'+interactionTab+'"]');return;}
      const slot=event.target.closest('[data-walk-slot]');if(slot){select(slot.dataset.walkSlot);return;}
      const article=event.target.closest('[data-walk-article]');if(article&&options.openArticle){stop();options.openArticle(article.dataset.walkArticle);return;}
      const button=event.target.closest('[data-walk-action]');if(!button)return;
      const action=button.dataset.walkAction;
      if(action==='discard-confirm'){confirmDirectDiscard();return;}
      if(action==='discard-keep'){keepDirectDraft();return;}
      if(['refresh-window','exit-fullscreen','setup','fullscreen','windowed','coverage'].includes(action)&&requestDirectDiscard(()=>handleWalkClick(event)))return;
      if(action==='interaction-return'){closeInteraction(false);await resumeMovement();}
      else if(action==='interaction-close'){closeInteraction(false);openMenu(true);}
      else if(action==='find')find();else if(action==='go')standAtSelection();else if(action==='reset'){stop();resetPosition();syncMotionControls();}
      else if((action==='jump'||action==='crouch')&&motion.mode==='walk'&&renderer&&renderer.available()){
        if(immersivePaused||document.pointerLockElement!==canvas||!fullscreen()&&!inlineFallback){tell(text().paused);return;}
        if(action==='jump')jumpQueued=true;else crouchToggle=!crouchToggle;
        simulationRunning=true;canvas.focus({preventScroll:true});syncMotionControls();schedule();
      }
      else if(action==='coverage'&&options.openCoverage){stop();options.openCoverage();}
      else if(action==='details'){if(fullscreen())pauseImmersive();details=!details;button.setAttribute('aria-expanded',String(details));updatePanel();schedule();}
      else if(action==='fov-reset')await saveFov(walk.DEFAULT_FOV);
      else if(action==='refresh-window'&&options.refreshSnapshot){openMenu(true);
        try{await options.refreshSnapshot();tell(text().refreshed);}catch(_){tell(text().windowFailed);}}
      else if(action==='fullscreen')await startWalk();
      else if(action==='edit-layout')openEdit(null);
      else if(action==='recipes')openRecipes();
      else if(action==='objects')openObjects();
      else if(action==='objects-close')openMenu(true);
      else if(action==='windowed'&&!savingFov&&fallbackOffered&&renderer&&renderer.available()&&(info.layout.objects.length||workMode==='editor')){
        inlineFallback=true;immersivePaused=true;await resumeMovement();
      }
      else if(action==='setup')leaveImmersive();
      else if(action==='exit-fullscreen'){if(options.closeWindow)options.closeWindow();else leaveImmersive();}
      else if(action==='resume')await resumeMovement();
      else if(action==='controls'){if(fullscreen()&&showControls)await resumeMovement();else openMenu(true);}
      else if(action==='map'){if(fullscreen())pauseImmersive();mapVisible=!mapVisible;syncImmersive();}
    });
    root.addEventListener('keydown',function(event){
      if(interactionSlotId){trapInteractionKeys(event);return;}
      if(event.key==='Enter'&&event.target.hasAttribute('data-walk-search')){event.preventDefault();find();return;}
      if(event.key==='Escape'){openMenu(fullscreen());tell(text().paused);return;}
      const editable=event.target&&event.target.hasAttribute&&['data-walk-search','data-walk-speed','data-walk-speed-range','data-walk-fov','data-walk-mode','data-walk-eye','data-walk-colors','data-walk-work-mode'].some(key=>event.target.hasAttribute(key));
      const typing=editable||event.target&&(['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName)||event.target.isContentEditable);
      if(event.code==='KeyB'&&visible()&&workMode==='editor'&&!typing&&!event.ctrlKey&&!event.altKey&&!event.metaKey){event.preventDefault();if(!event.repeat)openRecipes();return;}
      if(objectsOpen){trapObjectKeys(event);return;}
      if(fullscreen()&&event.code==='KeyM'&&!editable&&!event.ctrlKey&&!event.altKey&&!event.metaKey){
        event.preventDefault();if(!event.repeat){if(showControls)resumeMovement();else openMenu(true);}return;
      }
      if(event.key==='Tab'&&fullscreen()){
        if(!immersivePaused){event.preventDefault();openMenu(true);return;}
        trapMenuFocus(event);return;
      }
      if(document.pointerLockElement!==canvas||event.target!==canvas||event.ctrlKey||event.altKey||event.metaKey||!renderer||!renderer.available()||immersivePaused||!fullscreen()&&!inlineFallback)return;
      if(discardDirectAction&&(event.code==='Enter'||event.code==='NumpadEnter')){event.preventDefault();if(!event.repeat)confirmDirectDiscard();return;}
      if(directDraft&&!discardDirectAction&&!directBusy){
        if(event.code==='Enter'||event.code==='NumpadEnter'){event.preventDefault();if(!event.repeat){if(directFieldActive)finishDirectField();else saveDirect();}return;}
        if(!directStale&&directFieldActive&&(/^[0-9.,-]$/.test(event.key)||event.code==='Backspace'||event.code==='Delete')){
          event.preventDefault();const draft=directDraft;
          if(event.code==='Backspace')draft.input=draft.typing?draft.input.slice(0,-1):'';
          else if(event.code==='Delete')draft.input='';
          else draft.input=(draft.typing?draft.input:'')+event.key;
          draft.input=draft.input.slice(0,8);draft.typing=true;queueDirect(draft.input===''?NaN:Number(draft.input.replace(',','.')));return;
        }
      }
      if(event.code==='KeyE'){event.preventDefault();if(!event.repeat)interact();return;}
      if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyC'].includes(event.code)){
        event.preventDefault();if(event.code==='Space'&&!event.repeat&&!keys.has('Space')&&motion.mode==='walk')jumpQueued=true;
        keys.add(event.code);simulationRunning=true;schedule();}
    });
    window.addEventListener('keyup',event=>{const had=keys.delete(event.code);if(had&&simulationRunning)schedule();});window.addEventListener('blur',pauseImmersive);
    document.addEventListener('visibilitychange',function(){if(document.hidden)pauseImmersive();else schedule();});
    document.addEventListener('pointerlockchange',function(){stop();
      if(document.pointerLockElement===canvas){
        if(!visible()||interactionSlotId||mouseRequest!==immersiveRequest){releaseMouse();return;}
        acceptMouseLook(mouseRequest);return;
      }
      if(fullscreenPending)return;
      immersivePaused=true;if(fullscreen()&&!interactionSlotId)openMenu(true);else syncImmersive();});
    document.addEventListener('pointerlockerror',function(){if(document.pointerLockElement!==canvas)mouseLookFailed(mouseRequest);});
    document.addEventListener('fullscreenchange',function(){
      if(!fullscreen()){closeInteraction(false);stop();immersiveRequest++;inlineFallback=false;immersivePaused=true;showControls=false;releaseMouse();
        const button=root.querySelector('[data-walk-action="fullscreen"]');if(button&&visible())button.focus({preventScroll:true});}
      syncImmersive();
    });
    canvas.addEventListener('blur',stop);
    canvas.addEventListener('contextmenu',event=>{if(visible()&&workMode==='editor'&&fullscreen())event.preventDefault();});
    canvas.addEventListener('wheel',function(event){
      if(document.pointerLockElement!==canvas||immersivePaused||!boundObjectId||!directDraft||!directFieldActive||discardDirectAction||directBusy||directStale||event.ctrlKey||event.metaKey||event.altKey||!event.deltaY)return;
      event.preventDefault();const step=event.shiftKey?1:directDraft.field.kind.startsWith('location-')?10:50;
      const value=(Number.isFinite(directDraft.value)?directDraft.value:directDraft.field.value)+(event.deltaY<0?step:-step);
      directDraft.input=String(value);directDraft.typing=false;queueDirect(value);
    },{passive:false});
    canvas.addEventListener('pointerdown',function(event){
      if(document.pointerLockElement===canvas&&!immersivePaused&&visible()&&workMode==='editor'&&directEnabled()){
        if(event.button===2){event.preventDefault();releaseDirect();return;}
        if(event.button===0){event.preventDefault();directClick();schedule();return;}
      }
      if(document.pointerLockElement===canvas&&!immersivePaused&&visible()&&workMode==='analysis'&&event.button===0){event.preventDefault();interact();return;}
if(interactionSlotId||fullscreen()&&immersivePaused||event.button!==0||!renderer||!renderer.available())return;event.preventDefault();canvas.focus({preventScroll:true});simulationRunning=!immersivePaused;schedule();drag={startX:event.clientX,startY:event.clientY,moved:false};canvas.setPointerCapture(event.pointerId);});
    canvas.addEventListener('pointermove',function(event){if(!visible()||interactionSlotId||fullscreen()&&immersivePaused)return;
      const locked=document.pointerLockElement===canvas;if(!locked&&!drag)return;
      const dx=event.movementX,dy=event.movementY;
      if(drag){if(Math.abs(event.clientX-drag.startX)+Math.abs(event.clientY-drag.startY)>4)drag.moved=true;}
      if(!locked)return;
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
    function destroy(){
      if(disposed)return;active=false;clearDirect(true);leaveImmersive();stop();disposed=true;workspaceRevision++;
      if(renderer){if(renderer.aimObject)renderer.aimObject(null);renderer.setWorld(walk.createWorld([]));}scene=null;info=null;labels=[];selectedId=null;selectedObjectId=null;aimedObjectId=null;objectSearch='';objectsOpen=false;search='';message='';
      restoreBackground();root.replaceChildren();
      ['is-walk-window','is-walk-paused','walk-controls-open','is-interacting','is-walk-windowed'].forEach(key=>root.classList.toggle(key,false));
    }
    return {render:render,setActive:setActive,pause:function(){openMenu(true);},resume:resumeMovement,setWorkMode:setWorkMode,insertionPoint:insertionPoint,markObject:markObject,notify:tell,destroy:destroy,
      acceptSnapshot:function(){directStale=false;},
      refreshPreferences:function(){if(!savingFov&&!disposed)previewFov(savedFov());}};
  }
  return {create:create,interactionHtml:interactionHtml};
}));
