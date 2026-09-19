const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');

const root = path.join(__dirname, '..');

test('storage backend prototype preserves exact period and detail semantics', () => {
  const output = execFileSync(process.execPath, [
    path.join(root, 'tools', 'benchmark-storage-backends.cjs'),
    '1000',
    'both'
  ], { cwd: root, encoding: 'utf8' });
  const report = JSON.parse(output);
  assert.equal(report.rows, 1000);
  assert.equal(report.backends[0].backend, 'indexeddb-chunked-prototype');
  assert.equal(report.backends[0].exactChecks.period.quantity, '1242500000751');
  assert.equal(report.backends[0].exactChecks.detail.sourceLine, '44');
  const sqlite = report.backends.find((backend) => backend.backend === 'sqlite-node-prototype');
  if (sqlite && sqlite.available) {
    assert.equal(sqlite.exactChecks.period.quantity, report.backends[0].exactChecks.period.quantity);
    assert.equal(sqlite.exactChecks.period.sourceLine, report.backends[0].exactChecks.period.sourceLine);
    assert.equal(sqlite.exactChecks.detail.quantity, report.backends[0].exactChecks.detail.quantity);
    assert.equal(sqlite.exactChecks.detail.sourceLine, report.backends[0].exactChecks.detail.sourceLine);
  }
});

test('storage backend evaluation documents portable fallback and migration boundary', () => {
  const evaluation = fs.readFileSync(path.join(root, 'docs', 'storage-backend-evaluation.md'), 'utf8');
  const runtimeProfiles = fs.readFileSync(path.join(root, 'docs', 'runtime-profiles.md'), 'utf8');
  assert.match(evaluation, /Portable Mode/);
  assert.match(evaluation, /fall back to IndexedDB/);
  assert.match(evaluation, /2000000 sqlite/);
  assert.match(runtimeProfiles, /storage-backend-evaluation\.md/);
});
