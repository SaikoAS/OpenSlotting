'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {spawn,spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),serverPath=path.join(root,'Start-OpenSlotting-Localhost.py');
const python=['python','python3'].find(command=>spawnSync(command,['--version'],{windowsHide:true}).status===0);

test('walk launch accepts only same-origin authenticated session IDs, limits launches and never serves its helper',async t=>{
  assert.ok(python);
  const script=[
    'import runpy,sys', 'm=runpy.run_path(sys.argv[1])',
    'def launch(session,port): print("LAUNCH "+session,flush=True)',
    's=m["LoopbackServer"](("127.0.0.1",0),m["OpenSlottingRequestHandler"],walk_launcher=launch)',
    'm["OpenSlottingRequestHandler"].expected_hosts=m["expected_loopback_hosts"](s.server_address[1])',
    'print("READY "+str(s.server_address[1]),flush=True)', 's.serve_forever()'
  ].join('\n');
  const child=spawn(python,['-u','-c',script,serverPath],{cwd:root,windowsHide:true});let output='',errors='';
  child.stderr.on('data',data=>{errors+=data;});t.after(()=>{if(!child.killed)child.kill();});
  const port=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error(output+errors)),10000);
    child.on('error',reject);child.stdout.on('data',data=>{output+=data;const match=output.match(/READY (\d+)/);if(match){clearTimeout(timer);resolve(Number(match[1]));}});
  });
  const origin='http://127.0.0.1:'+port,endpoint=origin+'/walk-window';
  const headers={'Sec-Fetch-Site':'same-origin',Origin:origin,'Content-Type':'application/json'};
  for(const forged of [{},{'Sec-Fetch-Site':'cross-site',Origin:'https://attacker.invalid'},
    {'Sec-Fetch-Site':'same-origin',Origin:'null'}]){
    const response=await fetch(endpoint,{headers:forged});assert.equal(response.status,403);assert.doesNotMatch(await response.text(),/"token"/);
  }
  const capability=await fetch(endpoint,{headers}),control=await capability.json();
  assert.equal(control.supported,true);assert.match(control.token,/^[A-Za-z0-9_-]{43}$/);
  assert.equal(capability.headers.get('cache-control'),'no-store');assert.equal(capability.headers.get('access-control-allow-origin'),null);
  const id='a'.repeat(64);
  async function post(body,extra={},expected=400){
    const response=await fetch(endpoint,{method:'POST',headers:{...headers,'X-OpenSlotting-Launch':control.token,...extra},body});
    assert.equal(response.status,expected,body);await response.text();
  }
  await post(JSON.stringify({session:id}),{'X-OpenSlotting-Launch':'bad'},403);
  await post(JSON.stringify({session:id}),{Origin:'https://attacker.invalid'},403);
  await post(JSON.stringify({session:id}),{'Sec-Fetch-Site':'cross-site'},403);
  await post(JSON.stringify({session:id}),{'Content-Type':'text/plain'});
  for(const body of ['not JSON',JSON.stringify({session:'../index.html'}),JSON.stringify({session:id,url:'https://evil/'}),
    JSON.stringify({session:id,csv:'SYNTHETIC-PRIVATE'}),' '.repeat(97)])await post(body);
  assert.equal((output.match(/LAUNCH /g)||[]).length,0);
  await post(JSON.stringify({session:id}),{},200);await post(JSON.stringify({session:id}),{},200);
  for(const first of ['b','c','d','e','f'])await post(JSON.stringify({session:first.repeat(64)}),{},200);
  await post(JSON.stringify({session:'0'.repeat(64)}),{},429);
  assert.equal((output.match(/LAUNCH /g)||[]).length,6);assert.doesNotMatch(output,/SYNTHETIC-PRIVATE|https:\/\/evil/);
  for(const file of ['warehouse-walk-window.html','warehouse-walk-window.js','src/application/walk-window-session.js']){
    const response=await fetch(origin+'/'+file);assert.equal(response.status,200);await response.text();
  }
  const privateScript=await fetch(origin+'/Start-OpenSlotting-WalkWindow.ps1');assert.equal(privateScript.status,404);await privateScript.text();
  assert.equal(errors,'');
});

test('native helper builds a fixed shell-free command and validates direct calls',()=>{
  const script=[
    'import runpy,sys,subprocess', 'from unittest.mock import patch', 'm=runpy.run_path(sys.argv[1])',
    'with patch("subprocess.run") as run:',
    ' m["launch_walk_window"]("a"*64,8765)',
    ' args,kwargs=run.call_args; cmd=args[0]',
    ' assert "-File" in cmd and cmd[-4:]==["-Port","8765","-Session","a"*64]',
    ' assert cmd[cmd.index("-File")+1].endswith("Start-OpenSlotting-WalkWindow.ps1")',
    ' assert kwargs["shell"] is False and kwargs["timeout"]==8 and kwargs["check"] is True',
    'for session,port in [("../evil",8765),("a"*64,0),("a"*64,True)]:',
    ' try: m["launch_walk_window"](session,port)',
    ' except ValueError: pass', ' else: raise AssertionError("Invalid direct launch")'
  ].join('\n');
  const result=spawnSync(python,['-c',script,serverPath],{encoding:'utf8',windowsHide:true});assert.equal(result.status,0,result.stderr);
});
