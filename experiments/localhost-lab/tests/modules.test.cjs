'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const { execFileSync } = require('node:child_process');
const lab = path.resolve(__dirname, '..');
const root = path.resolve(lab, '..', '..');
const load = relative => import(pathToFileURL(path.join(lab, relative)));

test('backup envelopes restore exactly and reject limits/corruption', async () => {
  const { encodeBackup, decodeBackup } = await load('modules/backup-codec.mjs');
  const bytes = new TextEncoder().encode('Synthetic data '.repeat(2000)).buffer;
  for (const format of ['identity', 'gzip', 'deflate']) {
    const packed = await encodeBackup(bytes, format);
    const restored = await decodeBackup(packed, format, bytes.byteLength);
    assert.deepEqual(new Uint8Array(restored), new Uint8Array(bytes));
    await assert.rejects(decodeBackup(packed, format, bytes.byteLength - 1), /limit/);
    if (format !== 'identity') await assert.rejects(decodeBackup(packed.slice(0, -4), format));
  }
  await assert.rejects(encodeBackup(bytes, 'unknown'), /Unsupported/);
});

test('backup envelope handles empty data and rejects invalid limits', async () => {
  const { encodeBackup, decodeBackup } = await load('modules/backup-codec.mjs');
  const bytes = new ArrayBuffer(0);
  for (const format of ['identity', 'gzip', 'deflate']) {
    assert.equal((await decodeBackup(await encodeBackup(bytes, format), format, 0)).byteLength, 0);
  }
  await assert.rejects(decodeBackup(bytes, 'identity', -1), /limit/);
});

test('fixture is accepted by production backup contract with original bytes and source rules', async () => {
  const { makeWorkspace } = await load('benchmarks/fixtures.mjs');
  const workspace = require(path.join(root, 'workspace.js'));
  const source = makeWorkspace(1000, workspace);
  const restored = workspace.parseBackup(workspace.stringifyBackup(source));
  assert.equal(restored.files.length, 2);
  assert.deepEqual(Buffer.from(restored.files[0].buffer), Buffer.from(source.files[0].buffer));
  assert.equal(restored.files[0].sourceRules[0].type, 'exclude-empty');
  assert.equal(restored.files[1].sourceType, 'article-master');
});

test('extracted production kernel runs full validation, rules, registry and analysis', async () => {
  const { makeWorkspace } = await load('benchmarks/fixtures.mjs');
  const { installKernel } = await load('generated/preparation-kernel.mjs');
  const messages = [];
  const context = vm.createContext({ TextEncoder, TextDecoder, ArrayBuffer, Uint8Array, console,
    btoa: text => Buffer.from(text, 'binary').toString('base64'), atob: text => Buffer.from(text, 'base64').toString('binary'),
    self: { postMessage: message => messages.push(message) } });
  for (const file of ['encoding.js', 'csv.js', 'warehouse.js', 'workspace.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
  }
  const workspace = require(path.join(root, 'workspace.js'));
  context.backupText = workspace.stringifyBackup(makeWorkspace(1000, workspace));
  vm.runInContext('(' + installKernel.toString() + ')({ encoding: OpenSlottingEncoding, core: OpenSlottingCsv, warehouseModel: OpenSlottingWarehouse, workspaceModel: OpenSlottingWorkspace }); const record=OpenSlottingWorkspace.parseBackup(backupText); self.onmessage({data:{record,language:"de"}});', context);
  const error = messages.find(message => message.type === 'error');
  assert.equal(error, undefined, error?.message);
  const prepared = messages.find(message => message.type === 'complete').prepared;
  assert.ok(prepared.analysis.total_lines > 0);
  assert.ok(prepared.files[0].result.filteredRows > 0);
  assert.ok(prepared.files[0].result.issues.length > 0);
  assert.ok(prepared.workspace.articleRegistry.some(article => article.article_id === 'MASTER-ONLY'));
  assert.equal(typeof prepared.files[0].result.rows[0].quantity, 'bigint');
  assert.equal(prepared.files[0].result.rows[0].source_file_id, 'source-lab-orders');
});

test('lab has no production entry, storage database, package or endpoint integration', () => {
  for (const file of ['index.html', 'app.js', 'storage.js', 'Start-OpenSlotting-Localhost.py', 'tools/package-release.ps1']) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, file), 'utf8'), /experiments\/localhost-lab/);
  }
  const stores = fs.readFileSync(path.join(lab, 'modules/source-stores.mjs'), 'utf8');
  assert.doesNotMatch(stores, /openslotting-workspaces/);
  assert.match(stores, /openslotting-lab-/);
});

test('generated kernel provenance matches current app.js', () => {
  const crypto = require('node:crypto');
  const metadata = JSON.parse(fs.readFileSync(path.join(lab, 'generated/kernel-metadata.json'), 'utf8'));
  assert.equal(metadata.appSha256, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'app.js'))).digest('hex'));
});

test('worker session reuse, cancellation, timeout and error cleanup', async () => {
  const { WorkspaceSession } = await load('modules/worker-session.mjs');
  const original = global.Worker;
  let created = 0;
  let terminated = 0;
  class FakeWorker {
    constructor() { created++; }
    postMessage(message, transfer) {
      assert.ok(Array.isArray(transfer));
      if (message.stall) return;
      setImmediate(() => this.onmessage?.({ data: message.fail ? { type: 'error', code: 'fixture_error', message: 'Synthetic failure' } : { type: 'complete', prepared: 1 } }));
    }
    terminate() { terminated++; }
  }
  global.Worker = FakeWorker;
  try {
    const reused = new WorkspaceSession('module-reused');
    await reused.run({}); await reused.run({});
    assert.equal(created, 1);
    const pending = reused.run({ stall: true });
    await assert.rejects(reused.run({}), /busy/);
    reused.close();
    await assert.rejects(pending, /cancelled/);
    await assert.rejects(reused.run({}), /closed/);
    assert.equal(terminated, 1);
    const fresh = new WorkspaceSession('module-fresh');
    await fresh.run({}); await fresh.run({});
    assert.equal(created, 3);
    assert.equal(terminated, 3);
    await assert.rejects(fresh.run({ fail: true }), { code: 'fixture_error' });
    await assert.rejects(fresh.run({ stall: true }, { timeoutMs: 10 }), /timeout/);
    assert.equal(terminated, 5);
    fresh.close();
  } finally { global.Worker = original; }
});

test('analyzed fixture preserves cached results, registry and raw bytes in production backup', async () => {
  const { makeWorkspace, populateImportResults } = await load('benchmarks/fixtures.mjs');
  const workspace = require(path.join(root, 'workspace.js'));
  const fixture = populateImportResults(makeWorkspace(1000, workspace), require(path.join(root, 'csv.js')), require(path.join(root, 'encoding.js')));
  const restored = workspace.parseBackup(workspace.stringifyBackup(fixture));
  assert.ok(restored.files[0].result.rows.length > 0);
  assert.equal(restored.files[0].result.rows.length, fixture.files[0].result.rows.length);
  assert.equal(restored.articleRegistry.length, fixture.articleRegistry.length);
  assert.deepEqual(Buffer.from(restored.files[0].buffer), Buffer.from(fixture.files[0].buffer));
});

test('compression gains are not assumed for incompressible sources', async () => {
  const { deterministicBytes } = await load('benchmarks/fixtures.mjs');
  const { encodeBackup, decodeBackup } = await load('modules/backup-codec.mjs');
  const bytes = deterministicBytes(256 * 1024, 'random');
  const packed = await encodeBackup(bytes, 'gzip');
  assert.ok(packed.byteLength >= bytes.byteLength * 0.99);
  assert.deepEqual(new Uint8Array(await decodeBackup(packed)), new Uint8Array(bytes));
});

test('both stack-safe Base64 variants accept exactly the existing syntax on bounded samples', async () => {
  const { isBase64Linear, isBase64Chunked } = await load('modules/base64-validation.mjs');
  const current = value => typeof value === 'string' && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value);
  const cases = ['', 'AA==', 'AAA=', 'AAAA', 'AB==', '=', '====', 'A===', 'AA=A', 'AAAA\n', null, 1, 'éAAA'];
  let state = 12345;
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=!\né';
  for (let index = 0; index < 4000; index++) {
    let value = '';
    for (let char = 0; char < index % 81; char++) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      value += alphabet[state % alphabet.length];
    }
    cases.push(value);
  }
  for (const value of cases) {
    assert.equal(isBase64Linear(value), current(value), String(value));
    assert.equal(isBase64Chunked(value), current(value), String(value));
  }
  const large = Buffer.alloc(8 * 1048576, 255).toString('base64');
  for (const validate of [isBase64Linear, isBase64Chunked]) {
    assert.equal(validate(large), true);
    assert.equal(validate(large.slice(0, -8) + '!AAAAAAA'), false);
  }
});

test('candidate parser changes only Base64 validation and retains migration/safety checks', async () => {
  const { makeWorkspace, populateImportResults } = await load('benchmarks/fixtures.mjs');
  const workspace = require(path.join(root, 'workspace.js'));
  const fixture = populateImportResults(makeWorkspace(1000, workspace), require(path.join(root, 'csv.js')), require(path.join(root, 'encoding.js')));
  const original = workspace.stringifyBackup(fixture, { now: '2026-10-04T12:00:00.000Z' });
  const context = vm.createContext({ TextEncoder, TextDecoder, ArrayBuffer, Uint8Array,
    btoa: text => Buffer.from(text, 'binary').toString('base64'), atob: text => Buffer.from(text, 'base64').toString('binary') });
  vm.runInContext(fs.readFileSync(path.join(root, 'warehouse.js'), 'utf8'), context);
  const candidate = fs.readFileSync(path.join(lab, 'generated/workspace-base64-candidate.mjs'), 'utf8').replace(/export const workspaceCandidate = .*;\r?\n/, '');
  vm.runInContext(candidate, context);
  context.text = original;
  const restored = vm.runInContext('OpenSlottingWorkspaceCandidate.parseBackup(text)', context);
  assert.equal(restored.files[0].result.rows.length, fixture.files[0].result.rows.length);
  assert.deepEqual(Buffer.from(restored.files[0].buffer), Buffer.from(fixture.files[0].buffer));
  context.text = original.replace(/"schemaVersion":\s*13/, '"__proto__":{},"schemaVersion":13');
  assert.throws(() => vm.runInContext('OpenSlottingWorkspaceCandidate.parseBackup(text)', context), /unsafe property/);
  const invalid = JSON.parse(original);
  invalid.workspace.files[0].buffer.base64 = 'AA=A';
  context.text = JSON.stringify(invalid);
  assert.throws(() => vm.runInContext('OpenSlottingWorkspaceCandidate.parseBackup(text)', context), /invalid binary/);
});
