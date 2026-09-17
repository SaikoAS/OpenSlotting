'use strict';

const csv = require('../csv.js');
const encoding = require('../encoding.js');

const rowCount = Number(process.argv[2] || 700000);
const mode = process.argv[3] || 'chunked';
if (!Number.isInteger(rowCount) || rowCount < 1) {
  throw new Error('Usage: node tools/benchmark-large-import.cjs [positive row count]');
}
if (mode !== 'baseline' && mode !== 'chunked') {
  throw new Error('Mode must be baseline or chunked.');
}

const lines = new Array(rowCount + 1);
lines[0] = 'order_id;article_id;quantity;order_date';
for (let index = 0; index < rowCount; index += 1) {
  lines[index + 1] = 'O-' + index + ';SKU-' + (index % 1000) + ';1;2026-09-12';
}
let text = lines.join('\n') + '\n';
const sourceBytes = Buffer.from(text, 'utf8');
lines.length = 0;
text = null;
const sourceFile = {
  id: 'synthetic-large-import',
  name: 'synthetic-large-import.csv',
  label: 'synthetic-large-import.csv'
};
const mapping = { order_id: 0, article_id: 1, quantity: 2, order_date: 3 };
const analysisAccumulator = csv.createAnalysisAccumulator();

function megabytes(value) {
  return Math.round(value / 1024 / 1024 * 10) / 10;
}

function memory() {
  const usage = process.memoryUsage();
  const resourceUsage = typeof process.resourceUsage === 'function'
    ? process.resourceUsage()
    : null;
  return {
    rssMb: megabytes(usage.rss),
    heapUsedMb: megabytes(usage.heapUsed),
    peakRssMb: resourceUsage && Number.isFinite(resourceUsage.maxRSS)
      ? megabytes(resourceUsage.maxRSS * 1024)
      : megabytes(usage.rss)
  };
}

const startedAt = process.hrtime.bigint();
const stageMemory = { fixture: memory() };
const decoded = mode === 'baseline'
  ? encoding.decodeBufferDetailed(sourceBytes.buffer.slice(sourceBytes.byteOffset, sourceBytes.byteOffset + sourceBytes.byteLength), 'auto')
  : encoding.decodeBufferChunksDetailed(sourceBytes, 'auto', { chunkSize: 64 * 1024 });
const imported = mode === 'baseline'
  ? csv.importCsv(decoded.text, mapping, { sourceFile: sourceFile })
  : csv.importCsvStreamingChunks(decoded.chunks, mapping, { sourceFile: sourceFile });
const importedAt = process.hrtime.bigint();
stageMemory.import = memory();
const combined = csv.combineImportResults([{ ...sourceFile, result: imported }], { analysisAccumulator: analysisAccumulator });
const combinedAt = process.hrtime.bigint();
stageMemory.combine = memory();
const incrementalAnalysis = analysisAccumulator.finish();
const incrementalAnalyzedAt = process.hrtime.bigint();
const analysis = csv.analyzeRows(combined.rows);
const analyzedAt = process.hrtime.bigint();
stageMemory.analyze = memory();

function milliseconds(start, end) {
  return Number(end - start) / 1000000;
}

console.log(JSON.stringify({
  rows: rowCount,
  mode: mode,
  sourceBytes: sourceBytes.byteLength,
  importedRows: imported.validRows,
  combinedRows: combined.rows.length,
  analyzedLines: incrementalAnalysis.total_lines,
  timingsMs: {
    import: milliseconds(startedAt, importedAt),
    combine: milliseconds(importedAt, combinedAt),
    analyzeIncremental: milliseconds(combinedAt, incrementalAnalyzedAt),
    analyzeBatchCompatibility: milliseconds(incrementalAnalyzedAt, analyzedAt),
    total: milliseconds(startedAt, analyzedAt)
  },
  memory: {
    stages: stageMemory,
    peakRssMb: Math.max.apply(null, Object.keys(stageMemory).map(function (stage) {
      return stageMemory[stage].peakRssMb;
    }))
  }
}, null, 2));
