(function(){
  'use strict';
  const root=document.getElementById('walk-window-root'),model=window.OpenSlottingWarehouse;
  let data=null,controller=null,client=null,ended=false;
  let language=String(navigator.language||'en').startsWith('de')?'de':'en';
  function status(){
    const section=document.createElement('div');section.className='walk-window-status';section.setAttribute('role','status');
    const message=document.createElement('p');message.textContent=language==='de'
      ?'Keine aktive Rundgang-Sitzung. Bitte dieses Fenster schließen und im Hauptfenster neu starten. Beide Fenster benötigen dasselbe Edge-Profil.'
      :'No active walk session. Close this window and start again in the main window. Both windows must use the same Edge profile.';
    const close=document.createElement('button');close.type='button';close.textContent=language==='de'?'Fenster schließen':'Close window';
    close.addEventListener('click',()=>window.close());section.append(message,close);root.replaceChildren(section);
  }
  function finish(){
    if(ended)return;ended=true;if(controller)controller.destroy();controller=null;data=null;status();
  }
  const id=location.hash.slice(1);
  if(!/^[a-f0-9]{64}$/.test(id)||!window.BroadcastChannel||window.OpenSlottingRuntime.mode!=='localhost'){status();return;}
  client=window.OpenSlottingWalkWindowSession.createClient({
    id:id,onEnd:finish,onFocus:()=>window.focus(),
    onSnapshot:function(value,refresh){
      // No IndexedDB access, source files, analysis workers or persistent workspace copies in this viewer.
      value.layout=model.normalizeLayout(value.layout);
      language=value.language;document.documentElement.lang=language;data=value;
      document.title=language==='de'?'OpenSlotting · Lager-Rundgang':'OpenSlotting · Warehouse walk';
      if(!controller){
        controller=window.OpenSlottingWarehouseWalk.create({root:root,model:model,standalone:true,initialView:value.view,
          getWorkspaceId:()=>data&&data.workspaceId,getLanguage:()=>language,
          getLayout:()=>data?data.layout:model.createLayout(),getRegistry:()=>data?data.registry:[],
          getArticles:()=>data?data.articles:[],getCustomFields:()=>data?data.customFields:[],getComparison:()=>data&&data.comparison,
          getPreferences:()=>data&&data.preferences,
          savePreferences:async preferences=>{const saved=await client.savePreferences(preferences);if(data)data.preferences=saved;},
          refreshSnapshot:()=>client.refresh(),closeWindow:function(){client.close();window.close();},
          isVisible:()=>!ended,formatQuantity:value=>window.OpenSlottingCsv.formatScaledQuantity(value,language)
        });
      }else if(refresh)controller.pause();
      controller.render();controller.pause();
    }
  });
  window.addEventListener('pagehide',()=>client.close());
}());
