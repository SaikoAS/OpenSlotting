import test from 'node:test';
import assert from 'node:assert/strict';
import { TaskGate } from './task-gate.mjs';
const context = { workspaceId: 'a', revision: 1, locale: 'de', view: 'article' };
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
test('workspace, data revision, language and view changes discard stale results', async () => {
  for (const change of [{workspaceId:'b'}, {revision:2}, {locale:'en'}, {view:'source'}, {requestKey:'other-filter'}]) {
    const gate = new TaskGate(), pending = deferred(), applied = [];
    gate.setContext(context);
    const task = gate.run(() => pending.promise, v => applied.push(v));
    gate.setContext({...context, ...change}); pending.resolve('old');
    assert.deepEqual(await task, {status:'discarded'}); assert.deepEqual(applied, []);
  }
});
test('asynchronous apply is rejected; gate protects synchronous UI application only',async()=>{
  const gate=new TaskGate();let invoked=false;
  await assert.rejects(gate.run(async()=>1,async()=>{invoked=true;}),/synchronous/);
  assert.equal(invoked,false);
});
test('supersession aborts signal and permits only latest result', async () => {
  const gate = new TaskGate(), slow = deferred(), applied = []; let signal;
  gate.setContext(context);
  const old = gate.run(s => {signal=s; return slow.promise;}, v=>applied.push(v));
  const latest = gate.run(async()=> 'new', v=>applied.push(v));
  assert.equal(signal.aborted, true); slow.resolve('old');
  assert.equal((await old).status, 'discarded'); assert.equal((await latest).status, 'applied');
  assert.deepEqual(applied, ['new']);
});
test('explicit cancellation discards even non-cooperative completion', async () => {
  const gate=new TaskGate(), slow=deferred(); let applied=false;
  const task=gate.run(()=>slow.promise, ()=>{applied=true;}); gate.cancel(); slow.resolve(42);
  assert.equal((await task).status,'discarded'); assert.equal(applied,false);
});
test('current failure stays visible, obsolete failure is discarded', async () => {
  const gate=new TaskGate();
  await assert.rejects(gate.run(async()=>{throw new Error('visible');},()=>{}), /visible/);
  const slow=deferred(), task=gate.run(()=>slow.promise,()=>{}); gate.cancel(); slow.reject(new Error('old'));
  assert.equal((await task).status,'discarded');
});
test('same context does not cancel an active result and equal workspace revisions stay separated', async () => {
  const gate=new TaskGate(), slow=deferred(); gate.setContext(context);
  const task=gate.run(()=>slow.promise,()=>{}); gate.setContext({...context}); slow.resolve(1);
  assert.equal((await task).status,'applied');
});
