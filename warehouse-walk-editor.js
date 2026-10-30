(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();else root.OpenSlottingWalkEditor=factory();
}(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function create(options){
    const panel=document.createElement('section');panel.className='wh-walk-edit-overlay';panel.hidden=true;
    panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','walk-edit-title');
    panel.innerHTML='<header><h2 id="walk-edit-title"></h2><button type="button" data-edit-close></button></header><div class="wh-walk-edit-properties"></div><footer><p role="status" data-edit-status></p><button type="button" data-edit-resume></button></footer>';
    document.body.appendChild(panel);
    const editorRoot=panel.querySelector('.wh-walk-edit-properties');
    let open=false,workspaceId=null,baseline=null,epoch=0;
    function de(){return options.getLanguage()==='de';}
    function running(){return options.walkRoot.classList.contains('is-walk-window')||options.walkRoot.classList.contains('is-walk-windowed')||document.fullscreenElement===options.walkRoot;}
    function errorText(error){const code=error&&error.message;
      if(code==='edit-conflict')return de()?'Der Lagerplan wurde im Hauptfenster geändert. Editor schließen und den Datenstand im Rundgang aktualisieren.':'The main window changed the layout. Close the editor and update the walk data snapshot.';
      if(code==='edit-busy')return de()?'Ein Speichervorgang läuft. Bitte erneut versuchen.':'A save is in progress. Please try again.';
      if(code==='edit-timeout')return de()?'Speicherbestätigung ausstehend. Änderung nicht wiederholen; Datenstand vor dem Weiterarbeiten aktualisieren.':'Save confirmation timed out. Do not repeat the change; refresh the snapshot before continuing.';
      return code||'edit-failed';
    }
    const editor=window.OpenSlottingWarehouseEditor.create({root:editorRoot,model:options.model,inspectorOnly:true,
      getInsertPosition:object=>options.walk.insertionPoint(object),
      getLayout:options.getLayout,getRegistry:options.getRegistry,getWorkspaceId:options.getWorkspaceId,getLanguage:options.getLanguage,
      save:async function(next,metadata){
        const current=epoch,id=workspaceId;
        if(!open||id!==options.getWorkspaceId())throw new Error('edit-conflict');
        try {await options.save(next,baseline,metadata&&metadata.toggleLockId);
          if(current===epoch&&id===options.getWorkspaceId()){
            baseline=JSON.stringify(options.getLayout());options.walk.render();
          }
        }catch(error){throw new Error(errorText(error));}
      }
    });
    editorRoot.classList.add('is-walk-inspector');
    function close(resume,force){
      if(!open&&!force)return;
      const draft=editor.hasDraft();
      if(!force&&(editor.isBusy()||draft&&!window.confirm(de()?'Nicht übernommene Vorschau verwerfen?':'Discard the unapplied preview?')))return;
      if(draft)editor.clearHistory();
      open=false;epoch++;panel.hidden=true;options.walkRoot.inert=false;
      if(force){editor.clearHistory();editorRoot.replaceChildren();baseline=null;workspaceId=null;return;}
      options.walk.render();options.walk.pause();if(resume&&running())options.walk.resume();
    }
    panel.querySelector('[data-edit-close]').addEventListener('click',()=>close(false));
    panel.querySelector('[data-edit-resume]').addEventListener('click',()=>close(true));
    panel.addEventListener('keydown',function(event){
      // Let the existing rack wizard own its draft/keyboard behavior.
      if(editorRoot.querySelector('.wh-wizard'))return;
      if(event.key==='Escape'){event.preventDefault();close(false);return;}
      if(event.key!=='Tab')return;
      const controls=Array.from(panel.querySelectorAll('button,input,select,textarea,summary,[tabindex]'))
        .filter(control=>!control.disabled&&!control.hidden&&control.getClientRects().length&&control.getAttribute('tabindex')!=='-1');
      const first=controls[0],last=controls[controls.length-1];
      if(!controls.includes(document.activeElement)||event.shiftKey&&document.activeElement===first||!event.shiftKey&&document.activeElement===last){event.preventDefault();(event.shiftKey?last:first).focus();}
    });
    window.addEventListener('pagehide',()=>close(false,true));
    return {
      open:function(scope){
        if(open)return;
        const nextId=options.getWorkspaceId();if(!nextId)return;
        if(workspaceId!==nextId){editor.clearHistory();workspaceId=nextId;}
        const nextBase=JSON.stringify(options.getLayout());if(baseline!==null&&baseline!==nextBase)editor.clearHistory();
        baseline=nextBase;open=true;epoch++;options.walk.pause();options.walkRoot.inert=true;panel.hidden=false;
        panel.querySelector('#walk-edit-title').textContent=de()?'Rundgang · Lager bearbeiten':'Walk · Edit warehouse';
        panel.querySelector('[data-edit-close]').textContent=de()?'Schließen / pausieren':'Close / pause';
        panel.querySelector('[data-edit-resume]').textContent=running()?(de()?'Zurück mit Mausblick':'Return with mouse look'):(de()?'Zurück zur Vorbereitung':'Back to preparation');
        panel.querySelector('[data-edit-status]').textContent=de()?'Änderungen werden im aktuellen Workspace gespeichert.':'Changes are saved in the current workspace.';
        editor.selectScope(scope);panel.querySelector('[data-edit-close]').focus();
      },
      checkWorkspace:function(){if(workspaceId&&workspaceId!==options.getWorkspaceId())close(false,true);},
      refresh:function(){editor.clearHistory();baseline=JSON.stringify(options.getLayout());if(open)editor.render();},
      close:function(){close(false,true);},isOpen:()=>open
    };
  }
  return {create:create};
}));
