(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.OpenSlottingWalkWindowSession=api;
}(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION=1;
  function sessionId(crypto){return Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');}
  function channelName(id){if(!/^[a-f0-9]{64}$/.test(id))throw new Error('invalid-session');return 'OpenSlottingWalk:'+id;}
  function stats(article){return article&&{article_id:article.article_id,total_quantity:article.total_quantity,
    order_line_count:article.order_line_count,distinct_orders:article.distinct_orders,distinct_customers:article.distinct_customers,
    active_days:article.active_days,source_file_count:article.source_file_count};}
  function snapshot(source,view,model){
    const matches=model.matchArticles(source.layout,source.registry||[]),ids=new Set();
    matches.bySlot.forEach(assigned=>assigned.forEach(article=>ids.add(article.articleId)));
    return {version:VERSION,workspaceId:source.workspaceId,language:source.language==='de'?'de':'en',
      layout:source.layout,view:view,preferences:{fov:source.preferences.fov},
      registry:(source.registry||[]).filter(article=>ids.has(article.article_id)).map(article=>({
        article_id:article.article_id,article_name:article.article_name,
        master_data:Object.fromEntries(['article_name','location','unit_of_measure','quantity_per_sales_unit','vat_rate']
          .map(key=>[key,article.master_data&&article.master_data[key]])),
        value_provenance:(article.value_provenance||[]).filter(value=>value.source_type==='article-master'&&value.field&&value.field.startsWith('custom:'))
          .map(value=>({field:value.field,value:value.value,source_type:'article-master'})),
        master_row_ref_count:(article.master_row_refs||[]).length,
        master_row_refs:(article.master_row_refs||[]).slice(0,20).map(ref=>({source_file_id:ref.source_file_id,
          source_file_name:ref.source_file_name,source_file_label:ref.source_file_label,source_line:ref.source_line}))
      })),
      articles:(source.articles||[]).filter(article=>ids.has(article.article_id)).map(stats),
      comparison:source.comparison?{settings:source.comparison.settings,articles:(source.comparison.articles||[])
        .filter(article=>ids.has(article.article_id)).map(article=>({article_id:article.article_id,period_a:stats(article.period_a),period_b:stats(article.period_b)}))}:null,
      customFields:(source.customFields||[]).map(field=>({id:field.id,name:field.name}))};
  }
  function validSnapshot(value){return Boolean(value&&value.version===VERSION&&typeof value.workspaceId==='string'&&
    value.layout&&Array.isArray(value.layout.objects)&&Array.isArray(value.registry)&&Array.isArray(value.articles)&&
    Array.isArray(value.customFields)&&value.preferences&&Number.isInteger(value.preferences.fov)&&value.preferences.fov>=45&&value.preferences.fov<=100);}
  async function launch(id,environment){
    const scope=environment||window;
    const capability=await scope.fetch('/walk-window',{cache:'no-store',credentials:'same-origin'});
    if(!capability.ok)throw new Error('server-unavailable');
    const control=await capability.json();if(!control.supported)throw new Error('unsupported');
    const response=await scope.fetch('/walk-window',{method:'POST',credentials:'same-origin',
      headers:{'Content-Type':'application/json','X-OpenSlotting-Launch':control.token},body:JSON.stringify({session:id})});
    if(!response.ok)throw new Error('launch-failed');
  }
  function createHost(options){
    const scope=options.environment||window;
    let current=null;
    function send(session,message){if(current===session)session.channel.postMessage(message);}
    function finish(session,error){
      if(current!==session)return;
      send(session,{type:'end'});scope.clearTimeout(session.timer);session.channel.close();current=null;
      if(!session.ready)session.reject(error||new Error('session-ended'));
    }
    function checkWorkspace(){if(current&&options.getWorkspaceId()!==current.workspaceId)finish(current,new Error('workspace-changed'));}
    function start(view){
      checkWorkspace();
      if(current){if(current.ready)send(current,{type:'focus'});return current.promise;}
      if(!scope.BroadcastChannel||!scope.crypto) return Promise.reject(new Error('unsupported'));
      const session={id:sessionId(scope.crypto),workspaceId:options.getWorkspaceId(),view:view,ready:false};
      session.channel=new scope.BroadcastChannel(channelName(session.id));
      session.promise=new Promise((resolve,reject)=>{session.resolve=resolve;session.reject=reject;});current=session;
      session.timer=scope.setTimeout(()=>finish(session,new Error('window-timeout')),18000);
      session.channel.onmessage=async function(event){
        checkWorkspace();if(current!==session)return;
        const message=event.data;if(!message||typeof message!=='object')return;
        if(message.type==='ready'||message.type==='refresh'){
          try {
            const data=options.getSnapshot(session.view);
            if(!validSnapshot(data)||options.getWorkspaceId()!==session.workspaceId)throw new Error('workspace-changed');
            send(session,{type:'snapshot',data:data});
            session.sent=true;
          } catch(error){finish(session,error);}
        }else if(message.type==='loaded'&&session.sent&&!session.ready){
          session.ready=true;scope.clearTimeout(session.timer);session.resolve();
        }else if(message.type==='closed')finish(session);
        else if(message.type==='ping')send(session,{type:'pong'});
        else if(message.type==='preferences'&&Number.isSafeInteger(message.requestId)&&message.requestId>0&&
          Number.isInteger(message.fov)&&message.fov>=45&&message.fov<=100){
          if(session.saving)return;
          session.saving=true;
          try {await options.savePreferences({fov:message.fov});checkWorkspace();
            send(session,{type:'preferences',requestId:message.requestId,fov:message.fov});
          }catch(_){send(session,{type:'preferences-error',requestId:message.requestId});}
          finally{session.saving=false;}
        }
      };
      Promise.resolve().then(()=>options.launch?options.launch(session.id):launch(session.id,scope))
        .catch(error=>finish(session,error));
      // Calls made before a later navigation attaches its await still count as handled.
      session.promise.catch(()=>{});
      return session.promise;
    }
    function close(){if(current)finish(current);}
    return {start:start,close:close,checkWorkspace:checkWorkspace};
  }
  function createClient(options){
    const scope=options.environment||window,channel=new scope.BroadcastChannel(channelName(options.id));
    const clock=options.now||Date.now;
    const pending=new Map();let ended=false,loaded=false,workspaceId=null,sequence=0,refreshRequest=null,lastSeen=clock(),lastTick=clock();
    function wake(){if(ended)return;lastSeen=lastTick=clock();channel.postMessage({type:'ping'});}
    function visibility(){if(!scope.document.hidden)wake();}
    if(scope.document)scope.document.addEventListener('visibilitychange',visibility);
    function finish(error){
      if(ended)return;ended=true;channel.postMessage({type:'closed'});channel.close();
      scope.clearTimeout(initialTimer);scope.clearInterval(heartbeat);
      if(scope.document)scope.document.removeEventListener('visibilitychange',visibility);
      pending.forEach(request=>{scope.clearTimeout(request.timer);request.reject(error||new Error('session-ended'));});pending.clear();
      if(refreshRequest){scope.clearTimeout(refreshRequest.timer);refreshRequest.reject(error||new Error('session-ended'));refreshRequest=null;}
      if(options.onEnd)options.onEnd(error);
    }
    const initialTimer=scope.setTimeout(()=>finish(new Error('window-timeout')),18000);
    const heartbeat=scope.setInterval(()=>{
      const now=clock(),suspended=now-lastTick>45000;lastTick=now;
      // A sleeping device or hidden browser may suspend both windows' timers.
      if(suspended||scope.document&&scope.document.hidden){lastSeen=now;return;}
      if(now-lastSeen>45000){finish(new Error('session-ended'));return;}
      channel.postMessage({type:'ping'});
    },5000);
    channel.onmessage=async function(event){
      if(ended)return;const message=event.data;if(!message||typeof message!=='object')return;
      lastSeen=clock();
      if(message.type==='end'){finish();return;}
      if(message.type==='focus'){if(options.onFocus)options.onFocus();return;}
      if(message.type==='snapshot'){
        if(!validSnapshot(message.data)||workspaceId&&workspaceId!==message.data.workspaceId){finish(new Error('invalid-snapshot'));return;}
        workspaceId=message.data.workspaceId;
        try {await options.onSnapshot(message.data,loaded);if(ended)return;loaded=true;
          scope.clearTimeout(initialTimer);channel.postMessage({type:'loaded'});
          if(refreshRequest){scope.clearTimeout(refreshRequest.timer);refreshRequest.resolve();refreshRequest=null;}
        }catch(error){finish(error);}return;
      }
      if((message.type==='preferences'||message.type==='preferences-error')&&pending.has(message.requestId)){
        const request=pending.get(message.requestId);pending.delete(message.requestId);scope.clearTimeout(request.timer);
        if(message.type==='preferences'&&Number.isInteger(message.fov)&&message.fov>=45&&message.fov<=100)request.resolve({fov:message.fov});
        else request.reject(new Error('preferences-failed'));
      }
    };
    channel.postMessage({type:'ready'});
    return {
      close:()=>finish(),
      refresh:function(){
        if(ended||!loaded)return Promise.reject(new Error('session-ended'));
        if(refreshRequest)return refreshRequest.promise;
        const request={};request.promise=new Promise((resolve,reject)=>{request.resolve=resolve;request.reject=reject;});
        request.timer=scope.setTimeout(()=>{if(refreshRequest===request)refreshRequest=null;request.reject(new Error('window-timeout'));},18000);
        refreshRequest=request;channel.postMessage({type:'refresh'});return request.promise;
      },
      savePreferences:function(value){
        if(ended||!loaded)return Promise.reject(new Error('session-ended'));
        if(!Number.isInteger(value.fov)||value.fov<45||value.fov>100||pending.size>=4)return Promise.reject(new Error('invalid-preferences'));
        const requestId=++sequence;
        return new Promise((resolve,reject)=>{
          const timer=scope.setTimeout(()=>{pending.delete(requestId);reject(new Error('window-timeout'));},18000);
          pending.set(requestId,{resolve:resolve,reject:reject,timer:timer});channel.postMessage({type:'preferences',requestId:requestId,fov:value.fov});
        });
      }
    };
  }
  return {VERSION:VERSION,channelName:channelName,snapshot:snapshot,validSnapshot:validSnapshot,
    launch:launch,createHost:createHost,createClient:createClient};
}));
