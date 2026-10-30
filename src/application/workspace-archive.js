(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../../workspace.js'));
  else root.OpenSlottingWorkspaceArchive = factory(root.OpenSlottingWorkspace);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (model) {
  'use strict';

  const MAGIC = 'OpenSlotting Workspace Archive 2\n';
  const MAX_BLOCK_BYTES = 8 * 1024 * 1024;
  const MAX_HEADER_BYTES = 4096;
  const FRAGMENT_BYTES = MAX_BLOCK_BYTES / 2;
  const RECORD_KINDS = ['workspace', 'source', 'bytes', 'rows', 'issues', 'registry'];
  const encoder = new TextEncoder();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const MIME = 'application/octet-stream';

  function fail(code, message) {
    const error = new Error(message || code); error.code = code; throw error;
  }
  function check(options) {
    if (options && options.isCurrent && !options.isCurrent()) fail('workspace_load_cancelled');
  }
  function count(value) {
    if (!Number.isSafeInteger(value) || value < 0) fail('invalid_backup', 'Invalid archive count.');
    return value;
  }
  async function hash(bytes) {
    // Web Crypto is available on the fixed, trusted localhost origin.
    if (!globalThis.crypto || !globalThis.crypto.subtle) fail('backup_crypto_unavailable');
    const result = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes));
    return Array.from(result, function (byte) { return byte.toString(16).padStart(2, '0'); }).join('');
  }
  function jsonBytes(value) { return encoder.encode(JSON.stringify(model.encodeBackupValue(value))); }
  function readJson(bytes) {
    try { return model.decodeBackupValue(JSON.parse(decoder.decode(bytes))); }
    catch (error) {
      if (error.code) throw error;
      fail('invalid_backup', 'Invalid archive JSON block.');
    }
  }
  async function transform(bytes, compress) {
    const Stream = compress ? globalThis.CompressionStream : globalThis.DecompressionStream;
    if (typeof Stream !== 'function') fail('backup_compression_unavailable');
    const input = new ReadableStream({ start: function (controller) { controller.enqueue(bytes); controller.close(); } });
    const reader = input.pipeThrough(new Stream('gzip')).getReader();
    const chunks = []; let length = 0;
    try {
      while (true) {
        const next = await reader.read(); if (next.done) break;
        length += next.value.byteLength;
        if (length > MAX_BLOCK_BYTES) fail('invalid_backup', 'Decoded archive block exceeds its limit.');
        chunks.push(next.value);
      }
    } catch (error) { await reader.cancel().catch(function () {}); throw error; }
    finally { reader.releaseLock(); }
    const output = new Uint8Array(length); let offset = 0;
    chunks.forEach(function (chunk) { output.set(chunk, offset); offset += chunk.byteLength; });
    return output;
  }
  async function isArchive(file) {
    const magic = encoder.encode(MAGIC), bytes = new Uint8Array(await file.slice(0, magic.length).arrayBuffer());
    const matches = bytes.length === magic.length && magic.every(function (value, index) { return bytes[index] === value; });
    const prefix = encoder.encode('OpenSlotting Workspace Archive ');
    if (!matches && bytes.length >= prefix.length && prefix.every(function (value, index) { return bytes[index] === value; })) fail('unsupported_backup_version');
    return matches;
  }
  function filename(name) { return model.backupFilename(name).replace(/\.workspace\.json$/, '.osworkspace'); }

  // Ordered logical records; split large arrays before encoding the entire record.
  async function* bounded(records, options) {
    async function* split(record) {
      const bytes = record.kind === 'bytes' ? new Uint8Array(record.data) : jsonBytes(record.data);
      if (bytes.byteLength <= MAX_BLOCK_BYTES) { yield { record: record, bytes: bytes }; return; }
      if (Array.isArray(record.data) && record.data.length > 1) {
        const middle = Math.floor(record.data.length / 2);
        yield* split(Object.assign({}, record, { data: record.data.slice(0, middle) }));
        yield* split(Object.assign({}, record, { data: record.data.slice(middle) }));
      } else yield { record: record, bytes: bytes };
    }
    for await (const record of records) {
      check(options);
      yield* split(record.kind === 'workspace' ? Object.assign({}, record, { data: Object.assign({}, record.data, {
        formatVersion: 2, exportedAt: new Date().toISOString(), applicationVersion: options && options.applicationVersion || null
      }) }) : record);
    }
  }

  function createValidator() {
    let metadata = null, current = null, registryStarted = false, expected = null;
    const ids = new Set(), registryIds = new Set();
    let lastArticleId = null;
    const totals = { sources: 0, sourceBytes: 0, rows: 0, issues: 0, registryFragments: 0 };
    function finishSource() {
      if (!current) return;
      if (current.bytes !== (current.byteLength || 0) ||
          current.rows !== (current.resultMeta ? current.resultMeta.validRows : 0)) {
        fail('invalid_backup', 'Source bytes or normalized row count is incomplete.');
      }
      current = null;
    }
    function accept(record) {
      const kind = record.kind, data = record.data;
      if (!metadata) {
        if (kind !== 'workspace' || !data || !data.workspace) fail('invalid_backup');
        if (data.formatVersion !== 2) fail('unsupported_backup_version');
        if (typeof data.exportedAt !== 'string' || !Number.isFinite(Date.parse(data.exportedAt))) fail('invalid_backup');
        metadata = model.migrateWorkspace(Object.assign({}, data.workspace, { files: [], articleRegistry: [] }), { clonePayload: false });
        count(data.sourceCount); count(data.sourceBytes); count(data.normalizedRowCount);
        expected = data;
        return { metadata: metadata };
      }
      if (kind === 'source') {
        if (registryStarted || !data || !data.file || ids.has(data.file.id)) fail('invalid_backup');
        finishSource();
        const size = count(data.file.size);
        if (data.byteLength !== null && count(data.byteLength) !== size) fail('invalid_backup');
        if (data.byteLength === null && !data.file.errorKey) fail('invalid_backup', 'Readable source bytes are missing.');
        // Validate source settings and cross-references without allocating its source buffer.
        const normalized = model.validateWorkspace(Object.assign({}, metadata, { files: [Object.assign({}, data.file, {
          size: 0, buffer: new ArrayBuffer(0),
          result: data.resultMeta ? Object.assign({}, data.resultMeta, { rows: [], issues: [] }) : null
        })] }), { clonePayload: false }).files[0];
        ids.add(normalized.id);
        current = { id: normalized.id, byteLength: data.byteLength, resultMeta: data.resultMeta, bytes: 0, rows: 0, issues: 0, phase: 0 };
        totals.sources++;
      } else if (kind === 'bytes') {
        if (!current || current.phase !== 0 || !(data instanceof Uint8Array) || data.byteLength === 0 ||
            current.byteLength === null || current.bytes + data.byteLength > current.byteLength) fail('invalid_backup');
        current.bytes += data.byteLength; totals.sourceBytes += data.byteLength;
      } else if (kind === 'rows' || kind === 'issues') {
        if (!current || !current.resultMeta || !Array.isArray(data) || !data.length ||
            (kind === 'rows' && current.phase > 1)) fail('invalid_backup');
        if (current.bytes !== (current.byteLength || 0)) fail('invalid_backup');
        current.phase = kind === 'rows' ? 1 : 2;
        if (kind === 'rows') model.validateBackupRows(data, current.id);
        else model.validateBackupIssues(data, current.id);
        current[kind] += data.length; totals[kind] += data.length;
      } else if (kind === 'registry') {
        finishSource(); registryStarted = true;
        if (!Array.isArray(data) || !data.length) fail('invalid_backup');
        data.forEach(function (fragment) {
          model.normalizeArticleRegistry([fragment]);
          const id = fragment.article_id;
          if (id !== lastArticleId && registryIds.has(id)) fail('invalid_backup', 'Registry fragments must be contiguous.');
          registryIds.add(id); lastArticleId = id;
          ['source_file_ids', 'master_source_file_ids', 'movement_source_file_ids'].forEach(function (field) {
            (fragment[field] || []).forEach(function (sourceId) { if (!ids.has(sourceId)) fail('invalid_backup'); });
          });
        });
        totals.registryFragments += data.length;
      } else fail('invalid_backup', 'Unexpected archive record.');
      return null;
    }
    return { accept: accept, finish: function (inventory) {
      finishSource();
      if (!metadata) fail('invalid_backup');
      if (totals.sources !== expected.sourceCount || totals.sourceBytes !== expected.sourceBytes ||
          totals.rows !== expected.normalizedRowCount) fail('invalid_backup', 'Workspace inventory is incomplete.');
      Object.keys(totals).forEach(function (key) { if (totals[key] !== count(inventory[key])) fail('invalid_backup', 'Archive inventory mismatch: ' + key); });
      return { metadata: metadata, totals: totals };
    }, totals: totals };
  }

  async function write(records, sink, options) {
    const settings = options || {}, validator = createValidator();
    let index = 0, chain = '', written = 0;
    async function emit(kind, bytes, fragment) {
      check(settings);
      const rawLength = bytes.byteLength;
      let codec = 'identity';
      if (settings.compression !== false && rawLength > 1024 && rawLength < MAX_BLOCK_BYTES - 65536 && typeof globalThis.CompressionStream === 'function' &&
          typeof globalThis.DecompressionStream === 'function') {
        const compressed = await transform(bytes, true);
        if (compressed.length < rawLength) { bytes = compressed; codec = 'gzip'; }
      }
      const header = { index: index++, kind: kind, length: bytes.byteLength, rawLength: rawLength, codec: codec, sha256: await hash(bytes) };
      if (fragment) header.fragment = fragment;
      const line = encoder.encode(JSON.stringify(header) + '\n');
      check(settings);
      await sink.write(line); await sink.write(bytes);
      written += line.byteLength + bytes.byteLength;
      chain = await hash(encoder.encode(chain + JSON.stringify(header)));
      check(settings);
      if (settings.onProgress) settings.onProgress({ phase: 'backup', bytes: written, blocks: index });
    }
    try {
      check(settings); await sink.write(encoder.encode(MAGIC)); written += encoder.encode(MAGIC).length;
      for await (const item of bounded(records, settings)) {
        validator.accept(item.record);
        if (item.bytes.byteLength <= MAX_BLOCK_BYTES) await emit(item.record.kind, item.bytes);
        else {
          for (let offset = 0; offset < item.bytes.byteLength; offset += FRAGMENT_BYTES) {
            await emit('fragment', item.bytes.subarray(offset, offset + FRAGMENT_BYTES), {
              kind: item.record.kind, offset: offset, length: item.bytes.byteLength
            });
          }
        }
      }
      const summary = validator.finish(validator.totals);
      await emit('end', jsonBytes({ totals: summary.totals, records: index, chain: chain }));
      check(settings);
      if (settings.beforeClose) await settings.beforeClose();
      await sink.close();
      return { bytes: written, blocks: index, totals: summary.totals };
    } catch (error) {
      if (sink.abort) await sink.abort().catch(function () {});
      throw error;
    }
  }

  async function read(file, receive, options) {
    const settings = options || {}, validator = createValidator();
    if (!await isArchive(file)) fail('invalid_backup_format');
    let offset = encoder.encode(MAGIC).length, index = 0, chain = '', pending = null;
    while (offset < file.size) {
      check(settings);
      const prefix = new Uint8Array(await file.slice(offset, offset + MAX_HEADER_BYTES).arrayBuffer());
      const newline = prefix.indexOf(10);
      if (newline < 0) fail('invalid_backup', 'Archive block header is truncated.');
      let header;
      try { header = JSON.parse(decoder.decode(prefix.subarray(0, newline))); } catch (_) { fail('invalid_backup'); }
      if (!header || header.index !== index || !Number.isInteger(header.length) ||
          header.length < 0 || header.length > MAX_BLOCK_BYTES || !/^[0-9a-f]{64}$/.test(header.sha256) ||
          !Number.isInteger(header.rawLength) || header.rawLength < 0 || header.rawLength > MAX_BLOCK_BYTES ||
          !['identity', 'gzip'].includes(header.codec)) fail('invalid_backup');
      if ((pending && header.kind !== 'fragment') || (header.kind !== 'fragment' && header.fragment !== undefined)) fail('invalid_backup');
      offset += newline + 1;
      if (offset + header.length > file.size) fail('invalid_backup', 'Archive block is truncated.');
      const bytes = new Uint8Array(await file.slice(offset, offset + header.length).arrayBuffer());
      if (await hash(bytes) !== header.sha256) fail('invalid_backup_checksum', 'Archive checksum mismatch.');
      offset += bytes.byteLength;
      let decoded;
      try { decoded = header.codec === 'gzip' ? await transform(bytes, false) : bytes; }
      catch (error) {
        if (error.code) throw error;
        fail('invalid_backup', 'Invalid compressed archive block.');
      }
      if (decoded.byteLength !== header.rawLength) fail('invalid_backup');
      check(settings);
      let record = null;
      if (header.kind === 'fragment') {
        const fragment = header.fragment;
        if (!fragment || !RECORD_KINDS.includes(fragment.kind) ||
            !Number.isSafeInteger(fragment.length) || fragment.length <= MAX_BLOCK_BYTES ||
            !Number.isSafeInteger(fragment.offset) || fragment.offset < 0 || decoded.byteLength === 0) fail('invalid_backup');
        if (!pending) {
          if (fragment.offset !== 0) fail('invalid_backup');
          pending = { kind: fragment.kind, length: fragment.length, offset: 0, parts: [] };
        }
        if (fragment.kind !== pending.kind || fragment.length !== pending.length || fragment.offset !== pending.offset ||
            decoded.byteLength > pending.length - pending.offset) fail('invalid_backup');
        pending.parts.push(decoded); pending.offset += decoded.byteLength;
        if (pending.offset === pending.length) {
          // Allocate only after all bytes actually arrived, never from an untrusted declared length.
          const joined = new Uint8Array(pending.length); let position = 0;
          pending.parts.forEach(function (part) { joined.set(part, position); position += part.byteLength; });
          const kind = pending.kind;
          pending = null;
          record = { kind: kind, data: kind === 'bytes' ? joined : readJson(joined) };
        }
      } else record = { kind: header.kind, data: header.kind === 'bytes' ? decoded : readJson(decoded) };
      if (header.kind === 'end') {
        const data = record.data;
        if (!data || data.records !== index || data.chain !== chain || offset !== file.size) fail('invalid_backup');
        const summary = validator.finish(data.totals);
        if (settings.onProgress) settings.onProgress({ phase: 'restore', bytes: offset, total: file.size });
        return summary;
      }
      if (record) {
        validator.accept(record);
        check(settings); await receive(record);
      }
      chain = await hash(encoder.encode(chain + JSON.stringify(header))); index++;
      check(settings);
      if (settings.onProgress) settings.onProgress({ phase: 'restore', bytes: offset, total: file.size });
    }
    fail('invalid_backup', 'Archive completion marker is missing.');
  }

  function blobSink(download) {
    const parts = [];
    return { write: async function (part) {
      // Blob parts avoid retaining every encoded block as a live JS typed array.
      parts.push(new Blob([part]));
    }, close: async function () { await download(new Blob(parts, { type: MIME })); parts.length = 0; },
    abort: async function () { parts.length = 0; } };
  }

  return Object.freeze({ MAGIC: MAGIC, MAX_BLOCK_BYTES: MAX_BLOCK_BYTES, filename: filename,
    isArchive: isArchive, write: write, read: read, blobSink: blobSink });
}));
