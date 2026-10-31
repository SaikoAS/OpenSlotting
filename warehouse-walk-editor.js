(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();else root.OpenSlottingWalkEditor=factory();
}(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function esc(value){return String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
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
  return {create:create};
}));
