'use strict';

// Exact distinct experiment. Bitsets combine sets by OR, not by summing counts.
const { movementEntries } = require('./exact-kernel.cjs');
const terminal = require('../../../terminal.js');

function keyFor(row, scope) {
  if (scope === 'core-orders') return row.order_id || null;
  if (scope === 'customers') return row.customer_id || null;
  if (scope === 'terminal-orders') return terminal.entityKey(row, 'order');
  throw new TypeError('Distinct scope must be core-orders, terminal-orders or customers.');
}

function selected(row, from, to) {
  return (!from && !to) || Boolean(row.delivery_date && (!from || row.delivery_date >= from) && (!to || row.delivery_date <= to));
}

function countSet(rows, scope, from, to) {
  const values = new Set();
  for (const row of rows) {
    if (row && row.source_type === 'article-master') continue;
    if (!row || typeof row.quantity !== 'bigint') throw new TypeError('Movement quantities must be scaled BigInt integers.');
    if (!selected(row, from, to)) continue;
    const key = keyFor(row, scope);
    if (key) values.add(key);
  }
  return values.size;
}

function popcount(value) {
  value -= (value >>> 1) & 0x55555555;
  value = (value & 0x33333333) + ((value >>> 2) & 0x33333333);
  value = (value + (value >>> 4)) & 0x0f0f0f0f;
  return (Math.imul(value, 0x01010101) >>> 24);
}

function createDistinctIndex(rows, scope) {
  // Validate scope even for empty inputs.
  keyFor({}, scope);
  const { entries, excludedMasters } = movementEntries(rows);
  const dictionary = new Map();
  const codes = new Uint32Array(entries.length);
  const dates = new Array(entries.length);
  for (let index = 0; index < entries.length; index += 1) {
    const { row } = entries[index];
    const key = keyFor(row, scope);
    dates[index] = row.delivery_date;
    if (!key) continue;
    let code = dictionary.get(key);
    if (code === undefined) { code = dictionary.size + 1; dictionary.set(key, code); }
    codes[index] = code;
  }
  const wordCount = Math.ceil(dictionary.size / 32);
  return Object.freeze({
    metadata: Object.freeze({ scope, rows: codes.length, cardinality: dictionary.size,
      excludedMasters, codeBytes: codes.byteLength, bitmapScratchBytes: wordCount * 4 }),
    count(from, to) {
      const bitmap = new Uint32Array(wordCount);
      for (let index = 0; index < codes.length; index += 1) {
        const code = codes[index];
        if (!code || ((from || to) && (!dates[index] || (from && dates[index] < from) || (to && dates[index] > to)))) continue;
        const zeroBased = code - 1;
        bitmap[zeroBased >>> 5] |= 1 << (zeroBased & 31);
      }
      let count = 0;
      for (const word of bitmap) count += popcount(word);
      return count;
    }
  });
}

module.exports = { keyFor, countSet, popcount, createDistinctIndex };
