'use strict';

const core = require('../../../csv.js');
const periods = require('../../../periods.js');
const terminal = require('../../../terminal.js');
const { movementEntries } = require('./exact-kernel.cjs');

function lowerBound(values, key) {
  let left = 0; let right = values.length;
  while (left < right) { const mid = (left + right) >>> 1; if (values[mid] < key) left = mid + 1; else right = mid; }
  return left;
}

function upperBound(values, key) {
  let left = 0; let right = values.length;
  while (left < right) { const mid = (left + right) >>> 1; if (values[mid] <= key) left = mid + 1; else right = mid; }
  return left;
}

function seriesForBuckets(buckets) {
  const dates = Array.from(buckets.keys()).sort();
  const quantities = [0n];
  const counts = new Float64Array(dates.length + 1);
  dates.forEach((date, index) => {
    const bucket = buckets.get(date);
    quantities.push(quantities[index] + bucket.quantity);
    counts[index + 1] = counts[index] + bucket.lines;
  });
  return { dates, quantities, counts, buckets };
}

function addBucket(buckets, date, quantity, ref) {
  let bucket = buckets.get(date);
  if (!bucket) { bucket = { quantity: 0n, lines: 0, refs: [] }; buckets.set(date, bucket); }
  bucket.quantity += quantity;
  bucket.lines += 1;
  bucket.refs.push(ref);
}

function aggregateSeries(series, from, to) {
  if (!series || !periods.validDate(from) || !periods.validDate(to) || from > to) return { quantity: 0n, lines: 0, observedDays: 0 };
  const start = lowerBound(series.dates, from);
  const end = upperBound(series.dates, to);
  return { quantity: series.quantities[end] - series.quantities[start],
    lines: series.counts[end] - series.counts[start], observedDays: end - start };
}

function createRangeEngine(inputRows, options = {}) {
  if (typeof options.revision !== 'string' || !options.revision) throw new TypeError('An explicit dataset revision is required.');
  const revision = options.revision;
  const knownScopes = ['article', 'customer', 'order'];
  if (options.scopes !== undefined && (!Array.isArray(options.scopes) || options.scopes.some(scope => !knownScopes.includes(scope)))) {
    throw new TypeError('Indexed scopes must be article, customer or order.');
  }
  const indexedScopes = options.scopes === undefined ? knownScopes : Array.from(new Set(options.scopes));
  const { entries, excludedMasters } = movementEntries(inputRows);
  // Copy fields read by the current analysis; caller changes cannot alter the snapshot.
  let rows = entries.map(({ row }) => Object.freeze(Object.assign({}, row)));
  let originalIndexes = entries.map(({ detailIndex }) => detailIndex);
  let rowByOriginalIndex = new Map(originalIndexes.map((index, position) => [index, rows[position]]));
  let dateBuckets = new Map();
  let entities = Object.fromEntries(indexedScopes.map(scope => [scope, new Map()]));
  let residual = [];
  let unknownDateRows = 0;
  let invalidDateRows = 0;
  for (let position = 0; position < rows.length; position += 1) {
    const row = rows[position];
    const ref = originalIndexes[position];
    const valid = periods.validDate(row.delivery_date);
    if (valid) addBucket(dateBuckets, row.delivery_date, row.quantity, ref);
    else { residual.push(ref); if (!row.delivery_date) unknownDateRows += 1; else invalidDateRows += 1; }
    for (const scope of Object.keys(entities)) {
      const key = terminal.entityKey(row, scope);
      if (!key) continue;
      let entity = entities[scope].get(key);
      if (!entity) { entity = { refs: [], dateBuckets: new Map(), allQuantity: 0n, allLines: 0 }; entities[scope].set(key, entity); }
      entity.refs.push(ref);
      entity.allQuantity += row.quantity;
      entity.allLines += 1;
      if (valid) addBucket(entity.dateBuckets, row.delivery_date, row.quantity, ref);
    }
  }
  let series = seriesForBuckets(dateBuckets);
  for (const scope of Object.keys(entities)) {
    for (const entity of entities[scope].values()) entity.series = seriesForBuckets(entity.dateBuckets);
  }
  let disposed = false;
  const metadata = Object.freeze({ revision, movementRows: rows.length, excludedMasters,
    unknownDateRows, invalidDateRows, dates: series.dates.length,
    indexedScopes: Object.freeze(indexedScopes.slice()),
    articleEntities: entities.article ? entities.article.size : 0, customerEntities: entities.customer ? entities.customer.size : 0,
    orderEntities: entities.order ? entities.order.size : 0 });
  function check(expectedRevision = revision) {
    if (disposed) throw new Error('This index has been disposed.');
    if (expectedRevision !== revision) throw new Error('Stale analysis index: rebuild for the new dataset revision.');
  }
  function rangeRefs(from, to) {
    if (!periods.validDate(from) || !periods.validDate(to) || from > to) return [];
    const refs = [];
    for (let day = lowerBound(series.dates, from), end = upperBound(series.dates, to); day < end; day += 1) {
      for (const ref of dateBuckets.get(series.dates[day]).refs) refs.push(ref);
    }
    // Production comparePeriods uses lexical membership even for a malformed date.
    // Preserve that legacy edge case in the full domain adapter only.
    for (const ref of residual) {
      const row = rowByOriginalIndex.get(ref);
      if (row.delivery_date >= from && row.delivery_date <= to) refs.push(ref);
    }
    return refs.sort((left, right) => left - right);
  }
  function compareFull(settings, featureReadiness, registry, queryOptions = {}) {
    check(queryOptions.revision);
    const normalized = periods.normalizeSettings(settings);
    const a = rangeRefs(normalized.periodA.start, normalized.periodA.end);
    const b = rangeRefs(normalized.periodB.start, normalized.periodB.end);
    // Union only removes the A/B overlap from the candidate scan; source duplicates remain.
    // Unknown dates currently pass coverage's negative lexical checks (`null <
    // iso` and `null > iso` are both false). Keep residuals for exact current
    // parity; the narrow prefix API reports them explicitly as unknown instead.
    const candidateRefs = Array.from(new Set(a.concat(b, residual))).sort((left, right) => left - right);
    const candidates = candidateRefs.map(ref => rowByOriginalIndex.get(ref));
    const adapter = function (subset, adapterOptions) { return core.analyzeRows(subset, adapterOptions); };
    adapter.createAnalysisAccumulator = function () {
      const accumulator = core.createAnalysisAccumulator({ locale: queryOptions.locale || 'en' });
      return { consume(row, index) { accumulator.consume(row, candidateRefs[index]); },
        finish() { return accumulator.finish({ locale: queryOptions.locale || 'en' }); } };
    };
    return periods.comparePeriods(candidates, normalized, adapter, featureReadiness, registry);
  }
  return Object.freeze({
    metadata,
    queryRange(from, to, expectedRevision) { check(expectedRevision); return aggregateSeries(series, from, to); },
    queryEntity(scope, key, from, to, expectedRevision) {
      check(expectedRevision);
      if (!entities[scope]) throw new TypeError('Unknown or not indexed entity scope.');
      const entity = entities[scope].get(key);
      return aggregateSeries(entity && entity.series, from, to);
    },
    queryEntityAll(scope, key, expectedRevision) {
      check(expectedRevision);
      if (!entities[scope]) throw new TypeError('Unknown or not indexed entity scope.');
      const entity = entities[scope].get(key);
      return { quantity: entity ? entity.allQuantity : 0n, lines: entity ? entity.allLines : 0 };
    },
    selectedSummary(scope, key, latestDate, days, expectedRevision) {
      check(expectedRevision);
      if (!entities[scope]) throw new TypeError('Unknown or not indexed entity scope.');
      const entity = entities[scope].get(key);
      return terminal.selectedSummary(entity ? entity.refs.map(ref => rowByOriginalIndex.get(ref)) : [], scope, key, latestDate, days);
    },
    queryChart(from, to, granularity, expectedDates, observedDates, expectedRevision) {
      check(expectedRevision);
      const points = [];
      if (periods.validDate(from) && periods.validDate(to) && from <= to) {
        for (let day = lowerBound(series.dates, from), end = upperBound(series.dates, to); day < end; day += 1) {
          const date = series.dates[day];
          const bucket = dateBuckets.get(date);
          points.push({ date, quantity: bucket.quantity, lines: bucket.lines });
        }
      }
      return terminal.aggregateChart(points, from, to, granularity, expectedDates, observedDates);
    },
    compareFull,
    dispose() { disposed = true; rows = []; originalIndexes = []; rowByOriginalIndex.clear(); dateBuckets.clear();
      entities = { article: new Map(), customer: new Map(), order: new Map() }; residual = []; series = null; }
  });
}

module.exports = { lowerBound, upperBound, aggregateSeries, createRangeEngine };
