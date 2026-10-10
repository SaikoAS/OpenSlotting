export function makeWorkspace(rowCount, workspaceModel = globalThis.OpenSlottingWorkspace) {
  const record = workspaceModel.createWorkspace('Synthetic laboratory', {
    id: 'workspace-lab', now: '2026-10-04T12:00:00.000Z'
  });
  record.analyzed = true;
  const lines = ['order_id;article_id;quantity;delivery_date;article_name;customer_id;location'];
  for (let index = 0; index < rowCount; index++) {
    const article = index % 97 === 0 ? '' : ' sku-' + (index % 500) + ' ';
    const quantity = index % 131 === 0 ? 'invalid' : (index % 2 ? '0.3000000' : '17.1234567');
    const name = index % 113 === 0 ? '"Article; with\nsecond line and ""quote"""' : 'Synthetic article ' + (index % 500);
    const date = index % 157 === 0 ? '2026-02-30' : '2026-09-' + String(1 + index % 28).padStart(2, '0');
    lines.push('O-' + Math.floor(index / 3) + ';' + article + ';' + quantity + ';' + date + ';' + name + ';C-' + (index % 40) + ';R-' + (index % 20));
  }
  const bytes = new TextEncoder().encode(lines.join('\n') + '\n');
  record.files.push({
    id: 'source-lab-orders', name: 'synthetic-orders.csv', label: 'synthetic-orders.csv',
    size: bytes.byteLength, lastModified: 1, buffer: bytes.buffer, encodingMode: 'auto',
    activeEncoding: 'utf-8', detectedEncoding: 'utf-8', errorKey: null, result: null,
    sourceType: 'order-lines',
    mapping: { order_id: 0, article_id: 1, quantity: 2, delivery_date: 3, article_name: 4, customer_id: 5, location: 6 },
    confirmedMapping: { order_id: 0, article_id: 1, quantity: 2, delivery_date: 3, article_name: 4, customer_id: 5, location: 6 },
    preparationRules: { article_id: [{ type: 'trim', enabled: true }, { type: 'case-normalization', mode: 'upper', enabled: true }] },
    sourceRules: [{ sourcePosition: 1, type: 'exclude-empty', name: 'Missing article', description: 'Synthetic filter', enabled: true, includeInProfile: true }]
  });
  const master = new TextEncoder().encode('article_id;article_name;location\nSKU-1;Master description;R-1\nSKU-1;Conflicting description;R-2\nMASTER-ONLY;No movement;R-3\n');
  record.files.push({
    id: 'source-lab-master', name: 'synthetic-master.csv', label: 'synthetic-master.csv',
    size: master.byteLength, lastModified: 1, buffer: master.buffer, encodingMode: 'auto',
    activeEncoding: 'utf-8', detectedEncoding: 'utf-8', errorKey: null, result: null,
    sourceType: 'article-master', mapping: { article_id: 0, article_name: 1, location: 2 },
    confirmedMapping: { article_id: 0, article_name: 1, location: 2 }
  });
  return record;
}

export function deterministicBytes(size, entropy = 'mixed') {
  const bytes = new Uint8Array(size);
  let state = 0x12345678;
  for (let index = 0; index < size; index++) {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    bytes[index] = entropy === 'random' || index % 8 === 0 ? state & 255 : index % 31;
  }
  return bytes.buffer;
}

export function populateImportResults(record, core = globalThis.OpenSlottingCsv, encoding = globalThis.OpenSlottingEncoding) {
  for (const file of record.files) {
    const decoded = encoding.decodeBufferChunksDetailed(file.buffer, file.encodingMode, { chunkSize: 65536 });
    file.result = core.importCsvStreamingChunks(decoded.chunks, file.mapping, {
      sourceFile: { id: file.id, name: file.name, label: file.label, sourceType: file.sourceType },
      locale: record.language, preparationRules: file.preparationRules, sourceRules: file.sourceRules
    });
    file.columnCatalog = file.result.rawColumnCatalog;
  }
  record.articleRegistry = core.combineImportResults(record.files, { locale: record.language }).articleRegistry;
  return record;
}

export function canonical(value) {
  if (typeof value === 'bigint') return { $bigint: value.toString() };
  if (value instanceof ArrayBuffer) return { $bytes: Array.from(new Uint8Array(value)) };
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}

export async function sha256(bytes) {
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, '0')).join('');
}

export async function resultFingerprint(value) {
  return sha256(new TextEncoder().encode(JSON.stringify(canonical(value))));
}

export function summarize(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const round = value => Math.round(value * 1000) / 1000;
  return { samplesMs: samples.map(round), medianMs: round(sorted[Math.floor(sorted.length / 2)]),
    minMs: round(sorted[0]), maxMs: round(sorted[sorted.length - 1]) };
}
