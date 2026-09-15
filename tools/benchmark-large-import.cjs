'use strict';

const csv = require('../csv.js');

const rowCount = Number(process.argv[2] || 700000);
if (!Number.isInteger(rowCount) || rowCount < 1) {
  throw new Error('Usage: node tools/benchmark-large-import.cjs [positive row count]');
}

const lines = new Array(rowCount + 1);
lines[0] = 'order_id;article_id;quantity;order_date';
for (let index = 0; index < rowCount; index += 1) {
  lines[index + 1] = 'O-' + index + ';SKU-' + (index % 1000) + ';1;2026-09-12';
}
const text = lines.join('\n') + '\n';
const sourceFile = {
  id: 'synthetic-large-import',
  name: 'synthetic-large-import.csv',
  label: 'synthetic-large-import.csv'
};
const mapping = { order_id: 0, article_id: 1, quantity: 2, order_date: 3 };

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
const imported = csv.importCsv(text, mapping, { sourceFile: sourceFile });
const importedAt = process.hrtime.bigint();
stageMemory.import = memory();
const combined = csv.combineImportResults([{ ...sourceFile, result: imported }]);
const combinedAt = process.hrtime.bigint();
stageMemory.combine = memory();
const analysis = csv.analyzeRows(combined.rows);
const analyzedAt = process.hrtime.bigint();
stageMemory.analyze = memory();

function milliseconds(start, end) {
  return Number(end - start) / 1000000;
}

console.log(JSON.stringify({
  rows: rowCount,
  sourceBytes: Buffer.byteLength(text),
  importedRows: imported.validRows,
  combinedRows: combined.rows.length,
  analyzedLines: analysis.total_lines,
  timingsMs: {
    import: milliseconds(startedAt, importedAt),
    combine: milliseconds(importedAt, combinedAt),
    analyze: milliseconds(combinedAt, analyzedAt),
    total: milliseconds(startedAt, analyzedAt)
  },
  memory: {
    stages: stageMemory,
    peakRssMb: Math.max.apply(null, Object.keys(stageMemory).map(function (stage) {
      return stageMemory[stage].peakRssMb;
    }))
  }
}, null, 2));
