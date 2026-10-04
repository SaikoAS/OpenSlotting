'use strict';

const crypto = require('node:crypto');
const csv = require('../../../../csv.js');

function safeTerminalCell(value, numeric) {
  let text = value === null || value === undefined ? '' : String(value);
  if (!(numeric && /^-?\d+(?:\.\d+)?$/.test(text)) && /^[\t\r\n ]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

// Bytevertrag des echten terminal.exportLinesCsv: BOM, ';', CRLF,
// immer Quotes und Spreadsheet-Schutz. Größenangabe gilt für Records.
function* terminalChunks(lines, columns, valueForColumn, settings = {}) {
  const chunkRows = positiveRows(settings.chunkRows, 512);
  yield '\uFEFF' + columns.map(column => safeTerminalCell(column.label)).join(';') + '\r\n';
  let batch = [];
  for (const row of lines || []) {
    batch.push(columns.map(column => safeTerminalCell(valueForColumn(row, column.key), column.number)).join(';') + '\r\n');
    if (batch.length === chunkRows) { yield batch.join(''); batch = []; }
  }
  if (batch.length) yield batch.join('');
}

// Zweite Möglichkeit: Fach-Serializer selbst unverändert in Batches nutzen.
// So bleibt etwa exact sales/BigInt/JSON-Escaping an genau einer Stelle.
function* analysisChunks(articles, settings = {}) {
  const chunkRows = positiveRows(settings.chunkRows, 512);
  const list = articles || [];
  const header = csv.exportAnalysisCsv([], settings);
  yield header;
  for (let i = 0; i < list.length; i += chunkRows) {
    const part = csv.exportAnalysisCsv(list.slice(i, i + chunkRows), settings);
    if (!part.startsWith(header)) throw new Error('Analysis CSV header changed');
    yield part.slice(header.length);
  }
}

function positiveRows(value, fallback) {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value <= 0) throw new RangeError('Positive chunkRows required');
  return value;
}

function collectUtf8(chunks) {
  return Buffer.concat(Array.from(chunks, chunk => Buffer.from(chunk, 'utf8')));
}

// Modell eines inkrementellen Sinks: kein kompletter CSV-String/Buffer.
// Der tatsächliche Browser-Download/Dateistream wird hier nicht gemessen.
function hashUtf8(chunks) {
  const digest = crypto.createHash('sha256');
  let bytes = 0;
  for (const chunk of chunks) {
    const buffer = Buffer.from(chunk, 'utf8');
    bytes += buffer.length;
    digest.update(buffer);
  }
  return { bytes, sha256: digest.digest('hex') };
}

module.exports = { terminalChunks, analysisChunks, collectUtf8, hashUtf8 };
