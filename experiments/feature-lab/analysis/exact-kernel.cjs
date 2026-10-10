'use strict';

// Narrow mathematics experiment: scaled quantities and line counts only.
// No currency, distinct-set, master-data, provenance or quality replacement.
const INT64_MAX = (1n << 63n) - 1n;

function movementEntries(rows) {
  const entries = [];
  let excludedMasters = 0;
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (row && row.source_type === 'article-master') { excludedMasters += 1; continue; }
    if (!row || typeof row.quantity !== 'bigint') throw new TypeError('Movement quantities must be scaled BigInt integers.');
    entries.push({ row, detailIndex: index });
  }
  return { entries, excludedMasters };
}

function mapTotals(rows) {
  const groups = new Map();
  let quantity = 0n;
  let lines = 0;
  let excludedMasters = 0;
  for (const row of rows) {
    if (row && row.source_type === 'article-master') { excludedMasters += 1; continue; }
    if (!row || typeof row.quantity !== 'bigint') throw new TypeError('Movement quantities must be scaled BigInt integers.');
    let group = groups.get(row.article_id);
    if (!group) { group = { article_id: row.article_id, quantity: 0n, lines: 0 }; groups.set(row.article_id, group); }
    group.quantity += row.quantity;
    group.lines += 1;
    quantity += row.quantity;
    lines += 1;
  }
  return { quantity, lines, excludedMasters, groups: Array.from(groups.values()) };
}

function createColumnSnapshot(rows, options = {}) {
  const { entries, excludedMasters } = movementEntries(rows);
  const keys = [];
  const dictionary = new Map();
  const articleCodes = new Uint32Array(entries.length);
  const detailIndexes = new Uint32Array(entries.length);
  const quantities = new Array(entries.length);
  let absoluteSum = 0n;
  for (let index = 0; index < entries.length; index += 1) {
    const { row, detailIndex } = entries[index];
    let code = dictionary.get(row.article_id);
    if (code === undefined) { code = keys.length; dictionary.set(row.article_id, code); keys.push(row.article_id); }
    articleCodes[index] = code;
    detailIndexes[index] = detailIndex;
    quantities[index] = row.quantity;
    absoluteSum += row.quantity < 0n ? -row.quantity : row.quantity;
  }
  // This proof bounds every subtotal, including any order of signed additions.
  // BigInt64Array wraps without warning; construction must never precede proof.
  const useInt64 = options.int64 === true && absoluteSum <= INT64_MAX;
  const column = useInt64 ? BigInt64Array.from(quantities) : quantities;
  return Object.freeze({
    representation: useInt64 ? 'int64-proven' : 'bigint-unbounded',
    proofAbsoluteSum: absoluteSum,
    typedRequested: options.int64 === true,
    quantityTotals() {
      const totals = useInt64 ? new BigInt64Array(keys.length) : Array(keys.length).fill(0n);
      const counts = new Uint32Array(keys.length);
      let quantity = 0n;
      for (let index = 0; index < column.length; index += 1) {
        const code = articleCodes[index];
        totals[code] += column[index];
        counts[code] += 1;
        quantity += column[index];
      }
      return { quantity, lines: column.length, excludedMasters,
        groups: keys.map((article_id, code) => ({ article_id, quantity: totals[code], lines: counts[code] })) };
    },
    metadata: Object.freeze({ rows: entries.length, articles: keys.length,
      quantityBytes: useInt64 ? column.byteLength : null,
      fixedTypedBytes: articleCodes.byteLength + detailIndexes.byteLength,
      detailIndexesPreserved: true })
  });
}

module.exports = { INT64_MAX, movementEntries, mapTotals, createColumnSnapshot };
