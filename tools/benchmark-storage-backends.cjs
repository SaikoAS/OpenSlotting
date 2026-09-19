'use strict';

// Experimental, Node-only comparison for Issue #37. This intentionally does
// not participate in the browser runtime or change the supported IndexedDB
// storage adapter.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createFakeIndexedDB } = require('../tests/fake-indexeddb.cjs');

const DEFAULT_ROWS = 50000;
const CHUNK_SIZE = 5000;
const ARTICLE_COUNT = 10000;
const rowCount = Number(process.argv[2] || DEFAULT_ROWS);
const backendMode = process.argv[3] || 'both';
if (!Number.isInteger(rowCount) || rowCount < 1 || !['both', 'sqlite', 'indexeddb'].includes(backendMode)) {
  throw new Error('Usage: node tools/benchmark-storage-backends.cjs [positive row count] [both|sqlite|indexeddb]');
}

function elapsed(start) {
  return Math.round(Number(process.hrtime.bigint() - start) / 1000000 * 100) / 100;
}

function megabytes(value) {
  return Math.round(value / 1024 / 1024 * 10) / 10;
}

function memory() {
  const usage = process.memoryUsage();
  const resourceUsage = typeof process.resourceUsage === 'function' ? process.resourceUsage() : null;
  return {
    rssMb: megabytes(usage.rss),
    heapUsedMb: megabytes(usage.heapUsed),
    peakRssMb: resourceUsage && Number.isFinite(resourceUsage.maxRSS)
      ? megabytes(resourceUsage.maxRSS * 1024)
      : megabytes(usage.rss)
  };
}

function rowAt(index) {
  const articleNumber = index % ARTICLE_COUNT;
  const day = String((index % 20) + 1).padStart(2, '0');
  return {
    row_key: 'synthetic-1::' + String(index + 2),
    source_id: 'synthetic-1',
    source_line: index + 2,
    order_id: 'ORDER-' + String(index),
    article_id: 'SKU-' + String(articleNumber).padStart(5, '0'),
    // Keep exact quantities as scaled-integer text. Never coerce this to a JS
    // Number or a SQLite REAL.
    quantity_scaled: String((index % 1000 + 1) * 10000000 + (index % 7)),
    order_date: '2026-09-' + day,
    customer_id: 'CUSTOMER-' + String(index % 2500),
    location: 'A-' + String(index % 200),
    sales_value_exact: String((index % 1000) + '.' + String(index % 100).padStart(2, '0'))
  };
}

function expectedTotals() {
  let quantity = 0n;
  let sourceLine = 0n;
  for (let index = 0; index < rowCount; index += 1) {
    quantity += BigInt((index % 1000 + 1) * 10000000 + (index % 7));
    sourceLine += BigInt(index + 2);
  }
  return { quantity: quantity.toString(), sourceLine: sourceLine.toString() };
}

function requestPromise(request) {
  return new Promise(function (resolve, reject) {
    request.onsuccess = function () { resolve(request.result); };
    request.onerror = function () { reject(request.error || new Error('IndexedDB request failed.')); };
  });
}

function transactionPromise(transaction) {
  return new Promise(function (resolve, reject) {
    transaction.oncomplete = resolve;
    transaction.onerror = function () { reject(transaction.error || new Error('IndexedDB transaction failed.')); };
    transaction.onabort = function () { reject(transaction.error || new Error('IndexedDB transaction aborted.')); };
  });
}

async function openIndexedDb(indexedDB, name) {
  const request = indexedDB.open(name, 1);
  request.onupgradeneeded = function (event) {
    // The repository's fake IndexedDB exposes the result on the request rather
    // than on the upgrade event, while a browser exposes both forms.
    const database = event && event.target && event.target.result ? event.target.result : request.result;
    database.createObjectStore('orderLineChunks', { keyPath: 'key' });
  };
  return requestPromise(request);
}

function queryChunkRows(chunks, predicate) {
  const matches = [];
  chunks.forEach(function (chunk) {
    chunk.rows.forEach(function (row) {
      if (predicate(row)) {
        matches.push(row);
      }
    });
  });
  return matches;
}

function checkExactRows(rows, label) {
  let quantity = 0n;
  let sourceLine = 0n;
  rows.forEach(function (row) {
    if (!row.source_id || !Number.isInteger(row.source_line) || !/^\d+$/.test(row.quantity_scaled)) {
      throw new Error(label + ' lost source provenance or exact quantity text.');
    }
    quantity += BigInt(row.quantity_scaled);
    sourceLine += BigInt(row.source_line);
  });
  return { rows: rows.length, quantity: quantity.toString(), sourceLine: sourceLine.toString() };
}

async function runIndexedDb() {
  const indexedDB = createFakeIndexedDB();
  const databaseName = 'storage-backend-prototype';
  const started = process.hrtime.bigint();
  const db = await openIndexedDb(indexedDB, databaseName);
  const writeStarted = process.hrtime.bigint();
  let chunk = [];
  for (let index = 0; index < rowCount; index += 1) {
    chunk.push(rowAt(index));
    if (chunk.length === CHUNK_SIZE || index === rowCount - 1) {
      const transaction = db.transaction(['orderLineChunks'], 'readwrite');
      transaction.objectStore('orderLineChunks').put({
        key: 'chunk-' + String(Math.floor(index / CHUNK_SIZE)),
        rows: chunk
      });
      await transactionPromise(transaction);
      chunk = [];
    }
  }
  const writeMs = elapsed(writeStarted);
  const storedChunks = indexedDB.inspect(databaseName, 'orderLineChunks');
  const storedBytes = storedChunks.reduce(function (total, value) {
    return total + Buffer.byteLength(JSON.stringify(value), 'utf8');
  }, 0);
  db.close();

  const openStarted = process.hrtime.bigint();
  const reopened = await openIndexedDb(indexedDB, databaseName);
  const openMs = elapsed(openStarted);
  const readStarted = process.hrtime.bigint();
  const readTransaction = reopened.transaction(['orderLineChunks'], 'readonly');
  const chunks = await requestPromise(readTransaction.objectStore('orderLineChunks').getAll());
  const rowsCount = chunks.reduce(function (total, value) { return total + value.rows.length; }, 0);
  const periodRows = queryChunkRows(chunks, function (row) {
    return row.order_date >= '2026-09-05' && row.order_date <= '2026-09-09';
  });
  const period = checkExactRows(periodRows, 'IndexedDB period query');
  const periodQueryMs = elapsed(readStarted);
  const detailStarted = process.hrtime.bigint();
  const detailRows = queryChunkRows(chunks, function (row) { return row.article_id === 'SKU-00042'; });
  const detail = checkExactRows(detailRows, 'IndexedDB article detail query');
  const detailQueryMs = elapsed(detailStarted);
  reopened.close();
  return {
    backend: 'indexeddb-chunked-prototype',
    rows: rowsCount,
    writeMs: writeMs,
    openMs: openMs,
    periodQueryMs: periodQueryMs,
    detailQueryMs: detailQueryMs,
    periodRows: period.rows,
    detailRows: detail.rows,
    storedBytes: storedBytes,
    exactChecks: { period: period, detail: detail },
    memory: memory(),
    totalMs: elapsed(started)
  };
}

function sqliteSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_lines (
      row_key TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      source_line INTEGER NOT NULL,
      order_id TEXT NOT NULL,
      article_id TEXT NOT NULL,
      quantity_scaled TEXT NOT NULL,
      order_date TEXT NOT NULL,
      customer_id TEXT,
      location TEXT,
      sales_value_exact TEXT
    ) WITHOUT ROWID;
    CREATE INDEX IF NOT EXISTS idx_order_lines_article ON order_lines(article_id);
    CREATE INDEX IF NOT EXISTS idx_order_lines_date ON order_lines(order_date);
    CREATE INDEX IF NOT EXISTS idx_order_lines_article_date ON order_lines(article_id, order_date);
  `);
}

function runSqlite() {
  let sqlite;
  try {
    sqlite = require('node:sqlite');
  } catch (error) {
    return { backend: 'sqlite-node-prototype', available: false, reason: error.code || error.message };
  }
  if (!sqlite || typeof sqlite.DatabaseSync !== 'function') {
    return { backend: 'sqlite-node-prototype', available: false, reason: 'DatabaseSync is unavailable.' };
  }

  const filePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'openslotting-sqlite-')), 'workspace.db');
  const started = process.hrtime.bigint();
  let db = new sqlite.DatabaseSync(filePath);
  db.exec('PRAGMA journal_mode=DELETE; PRAGMA synchronous=NORMAL;');
  sqliteSchema(db);
  const insert = db.prepare(`
    INSERT INTO order_lines
      (row_key, source_id, source_line, order_id, article_id, quantity_scaled, order_date, customer_id, location, sales_value_exact)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const writeStarted = process.hrtime.bigint();
  db.exec('BEGIN IMMEDIATE');
  for (let index = 0; index < rowCount; index += 1) {
    const row = rowAt(index);
    insert.run(row.row_key, row.source_id, row.source_line, row.order_id, row.article_id,
      row.quantity_scaled, row.order_date, row.customer_id, row.location, row.sales_value_exact);
  }
  db.exec('COMMIT');
  const writeMs = elapsed(writeStarted);
  db.close();

  const openStarted = process.hrtime.bigint();
  db = new sqlite.DatabaseSync(filePath);
  const openedRows = Number(db.prepare('SELECT COUNT(*) AS count FROM order_lines').get().count);
  const openMs = elapsed(openStarted);
  const periodStarted = process.hrtime.bigint();
  const periodRows = db.prepare(`
    SELECT source_id, source_line, quantity_scaled
    FROM order_lines
    WHERE order_date BETWEEN ? AND ?
    ORDER BY order_date, source_line
  `).all('2026-09-05', '2026-09-09');
  const period = checkExactRows(periodRows, 'SQLite period query');
  const periodQueryMs = elapsed(periodStarted);
  const detailStarted = process.hrtime.bigint();
  const detailRows = db.prepare(`
    SELECT source_id, source_line, quantity_scaled
    FROM order_lines
    WHERE article_id = ?
    ORDER BY source_line
  `).all('SKU-00042');
  const detail = checkExactRows(detailRows, 'SQLite article detail query');
  const detailQueryMs = elapsed(detailStarted);
  db.close();
  const storedBytes = fs.statSync(filePath).size;
  fs.rmSync(path.dirname(filePath), { recursive: true, force: true });
  return {
    backend: 'sqlite-node-prototype',
    available: true,
    rows: openedRows,
    writeMs: writeMs,
    openMs: openMs,
    periodQueryMs: periodQueryMs,
    detailQueryMs: detailQueryMs,
    periodRows: period.rows,
    detailRows: detail.rows,
    storedBytes: storedBytes,
    exactChecks: { period: period, detail: detail },
    memory: memory(),
    totalMs: elapsed(started)
  };
}

const expected = expectedTotals();
Promise.resolve().then(async function () {
  const backends = [];
  if (backendMode === 'both' || backendMode === 'indexeddb') {
    backends.push(await runIndexedDb());
  }
  if (backendMode === 'both' || backendMode === 'sqlite') {
    backends.push(runSqlite());
  }
  const exact = backends.filter(function (result) { return result.available !== false; }).map(function (result) {
    return result.exactChecks.period.quantity + ':' + result.exactChecks.detail.sourceLine;
  });
  if (exact.some(function (value) { return value !== exact[0]; })) {
    throw new Error('Backend exact quantity/provenance checks differ.');
  }
  console.log(JSON.stringify({
    rows: rowCount,
    workload: {
      period: '2026-09-05..2026-09-09',
      detailArticle: 'SKU-00042',
      chunkSize: CHUNK_SIZE,
      exactQuantityModel: 'scaled integer text',
      expectedSourceLineTotal: expected.sourceLine
    },
    backends: backends
  }, null, 2));
}).catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
