'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const workspace = require('../workspace.js');

function validator() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'workspace.js'), 'utf8');
  const start = source.indexOf('  function isBase64(');
  const end = source.indexOf('  function base64ToBuffer(', start);
  return vm.runInNewContext(source.slice(start, end) + '\nisBase64');
}

test('bounded Base64 syntax accepts exactly the previous small-input language', () => {
  const valid = validator();
  const old = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  const alphabet = ['A', 'z', '0', '+', '/', '=', ' ', '\n', '$'];
  let count = 0;
  function check(value, remaining) {
    assert.equal(valid(value), old.test(value), JSON.stringify(value)); count++;
    if (remaining) for (const character of alphabet) check(value + character, remaining - 1);
  }
  check('', 4);
  for (const value of [null, undefined, 42, {}, [], 'AAAA====', 'AA==AAAA', 'AA\r\n==']) assert.equal(valid(value), false);
  assert.ok(count > 4000);
});

test('large source backup restores exact bytes and rejects corruption without a stack failure', () => {
  const bytes = new Uint8Array(8 * 1024 * 1024);
  for (let index = 0; index < bytes.length; index++) bytes[index] = index % 251;
  const record = workspace.createWorkspace('Large source', { id: 'workspace-large', now: '2026-10-04T10:00:00.000Z' });
  record.files.push({ id: 'source-large', name: 'synthetic.csv', label: 'synthetic.csv', size: bytes.length,
    lastModified: 1, buffer: bytes.buffer, encodingMode: 'auto', activeEncoding: null,
    detectedEncoding: null, errorKey: null, mapping: {}, confirmedMapping: null, result: null });
  const text = workspace.stringifyBackup(record);
  const restored = workspace.parseBackup(text);
  assert.deepEqual(new Uint8Array(restored.files[0].buffer), bytes);
  const json = JSON.parse(text);
  const binary = json.workspace.files[0].buffer.base64;
  json.workspace.files[0].buffer.base64 = binary.slice(0, -5) + '$' + binary.slice(-4);
  assert.throws(() => workspace.parseBackup(JSON.stringify(json)), { code: 'invalid_backup_encoding' });
  assert.deepEqual(new Uint8Array(record.files[0].buffer), bytes);
});

test('browser decoder without Node Buffer also preserves large source bytes', () => {
  const context = vm.createContext({ ArrayBuffer, Uint8Array, TextEncoder, TextDecoder,
    btoa: value => Buffer.from(value, 'binary').toString('base64'),
    atob: value => Buffer.from(value, 'base64').toString('binary') });
  for (const file of ['warehouse.js', 'workspace.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
  const browser = context.OpenSlottingWorkspace;
  const bytes = new Uint8Array(4 * 1024 * 1024).fill(81);
  context.bytes = bytes;
  vm.runInContext(`const record = OpenSlottingWorkspace.createWorkspace('Browser', {id:'workspace-browser'});
    record.files.push({id:'source-browser',name:'source.csv',label:'source.csv',size:bytes.length,
      lastModified:1,buffer:bytes.buffer,encodingMode:'auto',activeEncoding:null,detectedEncoding:null,
      errorKey:null,mapping:{},confirmedMapping:null,result:null});
    globalThis.restored = OpenSlottingWorkspace.parseBackup(OpenSlottingWorkspace.stringifyBackup(record));`, context);
  assert.deepEqual(new Uint8Array(context.restored.files[0].buffer), bytes);
});
