(async function () {
  'use strict';
  const count = Number(new URLSearchParams(location.search).get('rows') || 10000);
  const compression = new URLSearchParams(location.search).get('compression') !== 'identity';
  const model = OpenSlottingWorkspace, storage = OpenSlottingStorage, archive = OpenSlottingWorkspaceArchive;
  const stages = [], started = performance.now(), databaseName = 'openslotting-synthetic-backup-' + Date.now();
  const repository = storage.createRepository({ indexedDB: indexedDB, databaseName: databaseName });
  const report = function (name, extra) { stages.push(Object.assign({ name: name, elapsedMs: Math.round(performance.now() - started) }, extra)); document.body.textContent = JSON.stringify(stages); };
  try {
    let lines = ['order_id;article_id;quantity;delivery_date'];
    for (let index = 0; index < count; index++) lines.push('O-' + index + ';SKU-' + index % 1000 + ';1;2026-10-01');
    let text = lines.join('\n') + '\n'; lines = null;
    const buffer = new TextEncoder().encode(text).buffer;
    let result = OpenSlottingCsv.importCsvStreaming(text, { order_id: 0, article_id: 1, quantity: 2, delivery_date: 3 },
      { sourceFile: { id: 'source-1', name: 'synthetic.csv', label: 'synthetic.csv' } });
    text = null;
    let record = model.createWorkspace('Synthetic browser backup', { id: 'workspace-browser-backup' });
    record.analyzed = true;
    record.files = [{ id: 'source-1', name: 'synthetic.csv', label: 'synthetic.csv', buffer: buffer,
      size: buffer.byteLength, lastModified: 1, mapping: result.mapping, confirmedMapping: result.mapping,
      encodingMode: 'auto', activeEncoding: 'utf-8', detectedEncoding: 'utf-8', errorKey: null, result: result }];
    record = model.validateWorkspace(record, { clonePayload: false });
    await repository.createWorkspace(record, { validated: true });
    record = null; result = null;
    report('saved', { rows: count });
    let blob;
    const exported = await archive.write(repository.readBackupRecords('workspace-browser-backup'),
      archive.blobSink(async function (value) { blob = value; }), { compression: compression, applicationVersion: OpenSlottingCsv.APP_VERSION });
    report('exported', { bytes: blob.size, rows: exported.totals.rows });
    const session = await repository.beginBackupStage();
    const summary = await archive.read(blob, function (entry) { return repository.stageBackupRecord(session, entry); });
    await repository.finishBackupStage(session, summary);
    if ((await repository.listWorkspaces()).length !== 1) throw new Error('Stage became visible.');
    const committed = await repository.commitBackupStage(session, { mode: 'new', targetId: 'workspace-restored' });
    report('committed', { rows: committed.normalizedRowCount, sourceBytes: committed.sourceBytes });
    // Compare persisted original and restored result blocks in bounded portions.
    const original = repository.readBackupRecords('workspace-browser-backup'), restored = repository.readBackupRecords('workspace-restored');
    let rowCount = 0, byteCount = 0;
    while (true) {
      const a = await original.next(), b = await restored.next();
      if (a.done || b.done) { if (a.done !== b.done) throw new Error('Block count mismatch'); break; }
      if (a.value.kind !== b.value.kind) throw new Error('Record type mismatch');
      if (a.value.kind === 'workspace') continue;
      if (a.value.kind === 'bytes') {
        const left = a.value.data, right = b.value.data;
        if (left.length !== right.length || left.some(function (byte, index) { return byte !== right[index]; })) throw new Error('Source byte mismatch');
        byteCount += left.length;
      } else {
        if (JSON.stringify(model.encodeBackupValue(a.value.data)) !== JSON.stringify(model.encodeBackupValue(b.value.data))) throw new Error('Persisted block mismatch: ' + a.value.kind);
        if (a.value.kind === 'rows') rowCount += a.value.data.length;
      }
    }
    if (rowCount !== count || byteCount !== buffer.byteLength) throw new Error('Incomplete workspace');
    report('verified', { exactPersistedRows: rowCount, exactSourceBytes: byteCount });
    window.backupBenchmarkResult = { passed: true, rows: count, compression: compression, userAgent: navigator.userAgent, stages: stages };
  } catch (error) {
    window.backupBenchmarkResult = { passed: false, code: error.code, message: error.message, stack: error.stack, stages: stages };
  } finally {
    repository.close();
    indexedDB.deleteDatabase(databaseName);
    document.body.textContent = JSON.stringify(window.backupBenchmarkResult);
  }
}());
