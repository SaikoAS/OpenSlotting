'use strict';
// Synthetic archive codec benchmark. Node is a contributor tool, not a runtime dependency.
const fs = require('node:fs'), fsp = require('node:fs/promises'), os = require('node:os'), path = require('node:path');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const csv = require('../csv.js'), workspace = require('../workspace.js'), storage = require('../storage.js');
const archive = require('../src/application/workspace-archive.js');
const rows = Number(process.argv[2] || 700000);
const compression = process.argv[3] !== '--identity';
if (!Number.isSafeInteger(rows) || rows < 1) throw new Error('Usage: node tools/benchmark-workspace-backup.cjs [rows]');
const stages = [], started = performance.now();
function stage(name, extra = {}) {
  const memory = process.memoryUsage();
  stages.push({ name, elapsedMs: Math.round(performance.now() - started), rssMiB: Math.round(memory.rss / 1048576),
    peakRssMiB: Math.round(process.resourceUsage().maxRSS / 1024), ...extra });
}
(async function () {
  const directory = await fsp.mkdtemp(path.join(os.tmpdir(), 'openslotting-backup-benchmark-'));
  try {
    let lines = ['order_id;article_id;quantity;delivery_date'];
    for (let index = 0; index < rows; index++) lines.push('O-' + index + ';SKU-' + index % 1000 + ';1;2026-10-01');
    let text = lines.join('\n') + '\n'; lines = null;
    const buffer = new TextEncoder().encode(text).buffer;
    const result = csv.importCsvStreaming(text, { order_id: 0, article_id: 1, quantity: 2, delivery_date: 3 },
      { sourceFile: { id: 'source-1', name: 'synthetic.csv', label: 'synthetic.csv' } });
    text = null;
    const record = workspace.createWorkspace('Synthetic backup benchmark', { id: 'workspace-benchmark' });
    record.analyzed = true;
    record.files = [{ id: 'source-1', name: 'synthetic.csv', label: 'synthetic.csv', buffer, size: buffer.byteLength, lastModified: 1,
      mapping: result.mapping, confirmedMapping: result.mapping, encodingMode: 'auto', activeEncoding: 'utf-8', detectedEncoding: 'utf-8', errorKey: null, result }];
    stage('import', { validRows: result.validRows, sourceBytes: buffer.byteLength });
    const filename = path.join(directory, 'synthetic.osworkspace'), handle = await fsp.open(filename, 'w');
    const exportStart = performance.now();
    const exported = await archive.write(storage.backupRecordsFromWorkspace(record), {
      write: async bytes => {
        let offset = 0;
        while (offset < bytes.byteLength) {
          const written = await handle.write(bytes, offset, bytes.byteLength - offset);
          if (!written.bytesWritten) throw new Error('File write made no progress.');
          offset += written.bytesWritten;
        }
      }, close: async () => { await handle.close(); }, abort: async () => { await handle.close(); }
    }, { compression: compression, applicationVersion: csv.APP_VERSION });
    stage('export', { milliseconds: Math.round(performance.now() - exportStart), archiveBytes: exported.bytes, blocks: exported.blocks });
    const expectedRows = crypto.createHash('sha256'), restoredRows = crypto.createHash('sha256'), restoredBytes = crypto.createHash('sha256');
    for (let index = 0; index < rows; index += 1000) expectedRows.update(JSON.stringify(workspace.encodeBackupValue(result.rows.slice(index, index + 1000))));
    const restoreStart = performance.now();
    const summary = await archive.read(await fs.openAsBlob(filename), async record => {
      if (record.kind === 'rows') restoredRows.update(JSON.stringify(workspace.encodeBackupValue(record.data)));
      if (record.kind === 'bytes') restoredBytes.update(record.data);
    });
    assert.equal(summary.totals.rows, rows);
    assert.equal(restoredRows.digest('hex'), expectedRows.digest('hex'));
    assert.equal(restoredBytes.digest('hex'), crypto.createHash('sha256').update(new Uint8Array(buffer)).digest('hex'));
    stage('read-and-validate', { milliseconds: Math.round(performance.now() - restoreStart), restoredRows: summary.totals.rows, exactBytesAndRows: true });
    console.log(JSON.stringify({ node: process.version, rows, compression, synthetic: true,
      scope: 'In-memory imported fixture -> streamed file -> blockwise validation and row/source digest comparison. Excludes IndexedDB and browser UI; not native Edge acceptance.',
      stages }, null, 2));
  } finally {
    if (path.dirname(path.resolve(directory)) !== path.resolve(os.tmpdir()) || !path.basename(directory).startsWith('openslotting-backup-benchmark-')) {
      throw new Error('Refusing cleanup outside the owned temporary benchmark directory.');
    }
    await fsp.rm(directory, { recursive: true, force: true });
  }
}()).catch(error => { console.error(error); process.exitCode = 1; });
