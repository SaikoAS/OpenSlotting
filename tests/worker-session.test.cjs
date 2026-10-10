'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSession } = require('../src/application/worker-session.js');

function fixture(options) {
  const workers = [];
  const session = createSession(() => {
    const worker = { terminated: false, sent: [],
      terminate() { this.terminated = true; },
      postMessage(message, transfer) { this.sent.push({ message, transfer }); },
      reply(type, extras) { this.onmessage({ data: { taskId: this.sent.at(-1).message.taskId, type, ...extras } }); }
    };
    workers.push(worker);
    return worker;
  }, { idleMs: 1000, timeoutMs: 1000, ...options });
  return { workers, session };
}

test('reuses one sequential worker, transfers source copies and clears callbacks', async () => {
  const { session, workers } = fixture();
  const copy = new ArrayBuffer(16);
  const first = session.run({ record: {} }, { transfer: [copy] });
  assert.deepEqual(workers[0].sent[0].transfer, [copy]);
  workers[0].reply('complete', { prepared: { first: true } });
  assert.equal((await first).prepared.first, true);
  assert.equal(workers[0].onmessage, null);
  const second = session.run({ record: {} });
  assert.equal(workers.length, 1);
  assert.equal(workers[0].sent[1].message.taskId, 2);
  workers[0].reply('backup', { text: 'backup' });
  assert.equal((await second).text, 'backup');
  session.close();
  assert.equal(workers[0].terminated, true);
});

test('ignores replies for another task and rejects stale workspace revisions', async () => {
  const { session, workers } = fixture();
  let current = true;
  const progress = [];
  const pending = session.run({}, { isCurrent: () => current, onProgress: value => progress.push(value) });
  const worker = workers[0];
  worker.onmessage({ data: { taskId: 99, type: 'complete' } });
  worker.reply('progress', { progress: { phase: 'file' } });
  assert.deepEqual(progress, [{ phase: 'file' }]);
  current = false;
  worker.reply('complete');
  await assert.rejects(pending, { code: 'workspace_load_cancelled' });
  assert.equal(worker.terminated, true);
  session.close();
});

test('stale preflight never creates or dispatches a worker', async () => {
  const { session, workers } = fixture();
  await assert.rejects(session.run({}, { isCurrent: () => false }), { code: 'workspace_load_cancelled' });
  assert.equal(workers.length, 0);
  session.close();
});

test('cancels synchronously, ignores retained late callbacks and recreates the worker', async () => {
  const { session, workers } = fixture();
  const pending = session.run({});
  const callback = workers[0].onmessage;
  session.cancel();
  callback({ data: { taskId: 1, type: 'complete' } });
  await assert.rejects(pending, { code: 'workspace_load_cancelled' });
  const next = session.run({});
  assert.equal(workers.length, 2);
  workers[1].reply('complete');
  await next;
  session.close();
});

test('data, decoding, startup, malformed-response and posting errors release the worker', async () => {
  for (const cause of ['data', 'decoding', 'startup', 'malformed', 'posting']) {
    const { session, workers } = fixture();
    const pending = session.run({});
    const worker = workers[0];
    if (cause === 'data') worker.reply('error', { code: 'invalid_mapping' });
    if (cause === 'decoding') worker.onmessageerror();
    if (cause === 'startup') worker.onerror({ message: 'blocked' });
    if (cause === 'malformed') worker.reply('unknown');
    if (cause === 'posting') { session.cancel(); await assert.rejects(pending); worker.terminated = false;
      const retry = fixture(); retry.session.close(); await assert.rejects(retry.session.run({})); session.close(); continue; }
    await assert.rejects(pending);
    assert.equal(worker.terminated, true);
    session.close();
  }
  const session = createSession(() => ({ terminate() {}, postMessage() { throw new Error('clone failed'); } }));
  await assert.rejects(session.run({}), { code: 'worker_unavailable' });
  session.close();
});

test('busy, idle release, timeout and closed session have defined outcomes', async () => {
  const { session, workers } = fixture({ idleMs: 10, timeoutMs: 15 });
  const pending = session.run({});
  await assert.rejects(session.run({}), { code: 'worker_busy' });
  workers[0].reply('complete');
  await pending;
  await new Promise(resolve => setTimeout(resolve, 25));
  assert.equal(workers[0].terminated, true);
  await assert.rejects(session.run({}), { code: 'worker_timeout' });
  assert.equal(workers.length, 2);
  assert.equal(workers[1].terminated, true);
  session.close();
  await assert.rejects(session.run({}), { code: 'worker_unavailable' });
});

test('progress callback failures cannot leave a session busy', async () => {
  const { session, workers } = fixture();
  const pending = session.run({}, { onProgress() { throw new Error('UI failed'); } });
  workers[0].reply('progress', { progress: {} });
  await assert.rejects(pending, /UI failed/);
  assert.equal(workers[0].terminated, true);
  session.close();
});
