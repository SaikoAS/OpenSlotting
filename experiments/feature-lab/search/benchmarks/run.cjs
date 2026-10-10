'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const { spawnSync, execFileSync } = require('node:child_process');
const { SearchSession } = require('../modules/search-session.cjs');
const { fixtures, queries } = require('./fixtures.cjs');

const median = values => values.slice().sort((a, b) => a - b)[Math.floor(values.length / 2)];
const REPEATS = 5;

function digest(results) {
  const hash = crypto.createHash('sha256');
  for (const result of results) {
    hash.update(JSON.stringify(result.map(value => [value.article_id ?? value.key, value.total_quantity ?? value.quantity, value.order_line_count ?? value.lines]), (_, value) => typeof value === 'bigint' ? value.toString() : value));
    hash.update('\n');
  }
  return hash.digest('hex');
}

function child(count, scope, variant) {
  const data = fixtures(count), tasks = queries(count);
  const context = { workspaceId: 'synthetic-a', revision: 1, locale: 'de' };
  if (global.gc) global.gc();
  const heapBefore = process.memoryUsage().heapUsed;
  const session = new SearchSession({ scope, variant });
  const begin = performance.now(); session.setData(data, context);
  const buildMs = performance.now() - begin;
  if (global.gc) global.gc();
  const heapAfter = process.memoryUsage().heapUsed;
  // Die echte cached-linear Baseline für vollständige Treffer-/Sortprüfung.
  const baseline = new SearchSession({ scope, variant: 'cached-linear' }); baseline.setData(data, context);
  const workloads = [
    { name: 'cold-distinct', list: tasks.cold, prime: [] },
    { name: 'warm-same', list: Array(80).fill(tasks.same), prime: [tasks.same] },
    { name: 'warm-alternating', list: Array.from({ length: 80 }, (_, index) => tasks.alternating[index % tasks.alternating.length]), prime: tasks.alternating }
  ];
  const measurements = [];
  for (const workload of workloads) {
    baseline.clearQueryCache(); const expected = digest(workload.list.map(query => baseline.query(query)));
    const samples = []; const verified = [], lastHits = [], lruHits = [];
    for (let repeat = -1; repeat < REPEATS; repeat += 1) {
      session.clearQueryCache(); workload.prime.forEach(query => session.query(query));
      const stats = { ...session.stats };
      if (global.gc) global.gc();
      const start = performance.now(); const outputs = workload.list.map(query => session.query(query)); const elapsed = performance.now() - start;
      assert.equal(digest(outputs), expected, variant + ':' + workload.name);
      if (repeat >= 0) {
        samples.push(elapsed); verified.push(session.stats.verified - stats.verified);
        lastHits.push(session.stats.lastHits - stats.lastHits); lruHits.push(session.stats.lruHits - stats.lruHits);
      }
    }
    measurements.push({ workload: workload.name, queryCount: workload.list.length, distinctQueries: new Set(workload.list).size,
      medianMs: median(samples), samplesMs: samples, verifiedSamples: verified, lastHitsSamples: lastHits, lruHitsSamples: lruHits, resultSha256: expected });
  }
  return { count, scope, variant, buildMs, retainedHeapDeltaMiB: (heapAfter - heapBefore) / (1024 * 1024),
    peakRssMiB: process.resourceUsage().maxRSS / 1024,
    structuralMemory: { indexedTexts: session.texts?.length ?? 0, distinctGrams: session.stats.distinctGrams, postingReferences: session.stats.postingReferences,
      retainedLruQueries: session.lru.entries.size, retainedLruResultReferences: session.lru.references, queryLimit: session.lru.maxQueries, referenceLimit: session.lru.maxReferences },
    measurements };
}

if (require.main === module && process.argv[2] === '--child') {
  process.stdout.write(JSON.stringify(child(Number(process.argv[3]), process.argv[4], process.argv[5])));
} else if (require.main === module) {
  const result = {
    timestamp: new Date().toISOString(), node: process.version, platform: process.platform, cpu: os.cpus()[0]?.model,
    baselineCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: path.resolve(__dirname, '../../../..'), encoding: 'utf8' }).trim(),
    repeats: REPEATS, warmup: 1, input: 'synthetic only',
    baseline: 'prepared article search_text and tools/benchmark-search-sort comparator; current terminal rankEntities and watchlist label+secondary lowercase, one-query view cache retained in every variant',
    timing: 'shared fixture generation excluded; setData build includes preparation/ranking/index; five timed query workload repeats after warmup; cold flushes only query caches, not projections/index; warm primes same or eight queries outside timing; outputs fully hashed/asserted outside timing',
    memory: 'retainedHeapDeltaMiB is one explicit-GC before/after build snapshot; RSS covers whole child including fixture and later correctness baseline; not browser memory evidence',
    results: []
  };
  for (const [sizeIndex, count] of [1000, 10000].entries()) {
    for (const scope of ['article', 'customer', 'order']) {
      const variants = ['cached-linear', 'projected-linear', 'bigram', 'bigram-lru'];
      const order = variants.slice(sizeIndex).concat(variants.slice(0, sizeIndex));
      for (const variant of order) {
        const output = spawnSync(process.execPath, ['--expose-gc', __filename, '--child', String(count), scope, variant], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
        if (output.status !== 0) throw new Error(output.stderr);
        const item = JSON.parse(output.stdout); result.results.push(item);
        process.stderr.write(`${count}/${scope}/${variant}: build ${item.buildMs.toFixed(1)} ms; ` + item.measurements.map(value => `${value.workload} ${value.medianMs.toFixed(2)} ms`).join('; ') + '\n');
      }
    }
  }
  const target = path.resolve(__dirname, '../results/node-search.json'); fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(result, null, 2) + '\n'); process.stdout.write(target + '\n');
}
