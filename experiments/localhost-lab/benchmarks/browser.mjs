import { WorkspaceSession, WORKER_VARIANTS } from '../modules/worker-session.mjs';
import { openIndexedDBSourceStore, openAsyncOpfsSourceStore, openSyncOpfsSourceStore } from '../modules/source-stores.mjs';
import { encodeBackup, decodeBackup } from '../modules/backup-codec.mjs';
import { makeWorkspace, populateImportResults, deterministicBytes, sha256, resultFingerprint, summarize } from './fixtures.mjs';
import { isBase64Linear, isBase64Chunked } from '../modules/base64-validation.mjs';
import { workspaceCandidate } from '../generated/workspace-base64-candidate.mjs';

const status = document.getElementById('status');
const output = document.getElementById('results');
const button = document.getElementById('run');
let report;
const saveProgress = () => { output.textContent = JSON.stringify(report, null, 2); };
const requireEqual = (actual, expected, label) => { if (actual !== expected) throw new Error('Integrity mismatch: ' + label); };
const time = async operation => { const start = performance.now(); const value = await operation(); return { value, ms: performance.now() - start }; };

async function workerBench(rowCount, repeats) {
  const fixture = makeWorkspace(rowCount);
  const sourceHashes = await Promise.all(fixture.files.map(file => sha256(file.buffer)));
  const sessions = WORKER_VARIANTS.map(variant => new WorkspaceSession(variant));
  const timings = WORKER_VARIANTS.map(() => []);
  let expected;
  try {
    for (let round = 0; round < repeats; round++) {
      for (let position = 0; position < sessions.length; position++) {
        const index = (round + position) % sessions.length;
        status.textContent = `Import/Analyse: ${rowCount} Zeilen, ${WORKER_VARIANTS[index]}, Lauf ${round + 1}/${repeats}`;
        // Fixture cloning is outside all measured times. Every worker uses transfer in both directions.
        const record = structuredClone(fixture);
        const measured = await time(() => sessions[index].run({ record, language: 'de' }));
        const prepared = measured.value.prepared;
        for (let fileIndex = 0; fileIndex < fixture.files.length; fileIndex++) {
          requireEqual(await sha256(prepared.files[fileIndex].buffer), sourceHashes[fileIndex], 'worker source bytes');
        }
        const fingerprint = await resultFingerprint(prepared);
        expected ??= fingerprint;
        requireEqual(fingerprint, expected, 'full preparation payload, including provenance and issues');
        timings[index].push(measured.ms);
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    return { rows: rowCount, sourceBytes: fixture.files.reduce((sum, file) => sum + file.size, 0),
      integrity: 'full payload and original bytes equal', fingerprint: expected,
      variants: WORKER_VARIANTS.map((variant, index) => ({ variant, firstTaskMs: timings[index][0],
        allTasks: summarize(timings[index]), afterFirstTask: summarize(timings[index].slice(1)) })) };
  } finally { sessions.forEach(session => session.close()); }
}

async function storageBench(size, repeats) {
  const bytes = deterministicBytes(size);
  const expectedHash = await sha256(bytes);
  const factories = [['indexeddb-source-bytes', openIndexedDBSourceStore],
    ['opfs-async', openAsyncOpfsSourceStore], ['opfs-sync-worker', openSyncOpfsSourceStore]];
  const entries = [];
  const cleanup = [];
  try {
    for (const [variant, open] of factories) {
      const namespace = 'openslotting-lab-' + crypto.randomUUID();
      try {
        const measured = await time(() => open(namespace));
        const entry = { variant, namespace, store: measured.value, openMs: measured.ms, writes: [], reads: [] };
        entries.push(entry); cleanup.push(entry);
      } catch (error) {
        entries.push({ variant, unsupported: error.message });
        // Only this run's validated namespace can be removed, even if opening failed mid-way.
        if (variant.startsWith('opfs') && navigator.storage?.getDirectory) {
          const root = await navigator.storage.getDirectory();
          await root.removeEntry(namespace, { recursive: true }).catch(() => {});
        }
      }
    }
    for (let round = 0; round < repeats; round++) {
      for (let position = 0; position < entries.length; position++) {
        const entry = entries[(round + position) % entries.length];
        if (!entry.store) continue;
        status.textContent = `Originalbytes: ${size / 1048576} MiB, ${entry.variant}, Lauf ${round + 1}/${repeats}`;
        const written = await time(() => entry.store.write(bytes));
        const read = await time(() => entry.store.read());
        requireEqual(await sha256(read.value), expectedHash, 'raw source storage');
        requireEqual(bytes.byteLength, size, 'source buffer ownership');
        entry.writes.push(written.ms); entry.reads.push(read.ms);
      }
    }
    return { bytes: size, integrity: 'SHA-256 equal after every read; caller bytes retained',
      scope: 'raw source bytes only; no full workspace transaction comparison',
      variants: entries.map(({ variant, unsupported, openMs, writes, reads }) => unsupported ?
        { variant, unsupported } : { variant, openMs, write: summarize(writes), read: summarize(reads) }) };
  } finally {
    for (const entry of cleanup) {
      await entry.store.cleanup();
    }
  }
}

async function backupBench(rowCount, repeats) {
  const fixture = populateImportResults(makeWorkspace(rowCount));
  const text = globalThis.OpenSlottingWorkspace.stringifyBackup(fixture, { now: '2026-10-04T12:00:00.000Z' });
  const bytes = new TextEncoder().encode(text).buffer;
  const expected = await sha256(bytes);
  let currentParser;
  try { globalThis.OpenSlottingWorkspace.parseBackup(text); currentParser = 'passed'; }
  catch (error) { currentParser = error.name + ': ' + error.message; }
  const candidateRecord = workspaceCandidate.parseBackup(text);
  requireEqual(await resultFingerprint(candidateRecord), await resultFingerprint(globalThis.OpenSlottingWorkspace.validateWorkspace(fixture)), 'candidate decoded workspace');
  const formats = ['identity', 'gzip', 'deflate'];
  const entries = formats.map(format => ({ format, writes: [], reads: [], encodedBytes: 0 }));
  for (let round = 0; round < repeats; round++) {
    for (let position = 0; position < entries.length; position++) {
      const entry = entries[(round + position) % entries.length];
      status.textContent = `Sicherung: ${entry.format}, Lauf ${round + 1}/${repeats}`;
      const encoded = await time(() => encodeBackup(bytes, entry.format));
      const decoded = await time(() => decodeBackup(encoded.value, entry.format, bytes.byteLength));
      requireEqual(await sha256(decoded.value), expected, 'backup JSON bytes');
      // Existing parser/migration remains the compatibility authority.
      workspaceCandidate.parseBackup(new TextDecoder().decode(decoded.value));
      entry.writes.push(encoded.ms); entry.reads.push(decoded.ms); entry.encodedBytes = encoded.value.byteLength;
    }
  }
  return { inputBytes: bytes.byteLength, fixtureState: 'analyzed; original bytes, normalized rows, issues, column profiles, registry',
    currentParser, candidateParser: 'passed; complete workspace equal to current validateWorkspace input',
    integrity: 'byte-identical JSON, accepted by generated candidate parseBackup',
    scope: 'envelope encoding/decoding; JSON construction and validation excluded from timings',
    variants: entries.map(entry => ({ format: entry.format, bytes: entry.encodedBytes,
      ratio: entry.encodedBytes / bytes.byteLength, encode: summarize(entry.writes), decode: summarize(entry.reads) })) };
}

async function validationBench(repeats) {
  const input = JSON.parse(globalThis.OpenSlottingWorkspace.stringifyBackup(makeWorkspace(50000), { now: '2026-10-04T12:00:00.000Z' })).workspace.files[0].buffer.base64;
  const validators = [
    ['current-grouped-regex', value => /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)],
    ['linear-scan', isBase64Linear], ['chunked-character-class', isBase64Chunked]
  ];
  const variants = [];
  for (const [variant, validator] of validators) {
    const timings = [];
    let error;
    for (let iteration = 0; iteration < repeats; iteration++) {
      const start = performance.now();
      try {
        if (!validator(input) || validator(input.slice(0, -1) + '!')) throw new Error('Validator result mismatch');
        timings.push(performance.now() - start);
      } catch (failure) { error = failure.name + ': ' + failure.message; break; }
    }
    variants.push(error ? { variant, error } : { variant, validAndInvalid: summarize(timings), integrity: 'valid accepted and damaged rejected' });
  }
  return { base64Characters: input.length, variants, scope: 'one valid and one invalid full-sized string per sample' };
}

function renderSummary() {
  const container = document.getElementById('summary');
  container.replaceChildren();
  const table = document.createElement('table');
  for (const cells of [['Bereich', 'Variante', 'Umfang', 'Median ms', 'Prüfung'],
    ...report.workers.flatMap(result => result.variants.map(entry => ['Import + Analyse', entry.variant, result.rows + ' Zeilen', entry.allTasks.medianMs, 'identisch'])),
    ...report.storage.flatMap(result => result.variants.map(entry => ['Originalbytes', entry.variant, result.bytes / 1048576 + ' MiB', entry.unsupported || `Schreiben ${entry.write.medianMs} / Lesen ${entry.read.medianMs}`, entry.unsupported ? 'nicht verfügbar' : 'SHA-256 identisch'])),
    ...report.backup.variants.map(entry => ['Sicherung', entry.format, entry.bytes + ' Bytes', `Packen ${entry.encode.medianMs} / Entpacken ${entry.decode.medianMs}`, 'identisch'])]) {
    const row = document.createElement('tr');
    for (const text of cells) { const cell = document.createElement('td'); cell.textContent = String(text); row.appendChild(cell); }
    table.appendChild(row);
  }
  container.appendChild(table);
  const note = document.createElement('p');
  note.textContent = 'Bestehender Sicherungsparser: ' + report.backup.currentParser + '. Laborparser: ' + report.backup.candidateParser;
  container.appendChild(note);
}

button.addEventListener('click', async () => {
  const rows = Number(document.getElementById('rows').value);
  const repeats = Number(document.getElementById('repeats').value);
  if (!Number.isInteger(rows) || rows < 1 || rows > 100000 || !Number.isInteger(repeats) || repeats < 3 || repeats > 10) {
    status.textContent = 'Bitte Zeilenzahl 1–100.000 und Wiederholungen 3–10 eingeben.'; return;
  }
  button.disabled = true;
  report = { schema: 1, date: new Date().toISOString(), environment: {
    userAgent: navigator.userAgent, origin: location.origin, secureContext: isSecureContext,
    hardwareConcurrency: navigator.hardwareConcurrency, deviceMemoryGiB: navigator.deviceMemory || null,
    storageEstimate: await navigator.storage.estimate(), moduleWorker: true,
    compressionStream: typeof CompressionStream === 'function'
  }, methodology: { repeats, order: 'rotated each round', clock: 'performance.now',
    fixture: 'deterministic synthetic, no uploads', garbageCollection: 'browser-managed, not forced',
    memory: 'no RSS or reliable per-worker peak memory measured',
    warmDefinition: 'after first task; static modules may be in browser cache; no disk-cold claim' },
    workers: [], storage: [], backup: null, base64Validation: null, status: 'running' };
  try {
    for (const count of [...new Set([Math.min(rows, 1000), rows])]) {
      report.workers.push(await workerBench(count, repeats)); saveProgress();
    }
    for (const size of [1048576, 8 * 1048576]) {
      report.storage.push(await storageBench(size, repeats)); saveProgress();
    }
    report.backup = await backupBench(rows, repeats);
    report.base64Validation = await validationBench(repeats);
    report.status = 'passed';
    renderSummary();
    status.textContent = 'Fertig: alle Ergebnis- und Bytevergleiche bestanden; Laborspeicher bereinigt.';
  } catch (error) {
    report.status = 'failed'; report.error = error.stack || error.message;
    status.textContent = 'Abgebrochen: ' + error.message;
  } finally {
    saveProgress(); button.disabled = false;
    document.getElementById('download').disabled = false;
  }
});

document.getElementById('download').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'openslotting-lab-results.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
