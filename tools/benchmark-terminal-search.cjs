#!/usr/bin/env node
'use strict';

// Compare the former controller expression with the production projection API.
// No npm packages, source exports, browser database or persistent user data.
const { performance } = require('node:perf_hooks');
const { spawnSync, execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const os = require('node:os');
const assert = require('node:assert/strict');
const terminal = require('../terminal.js');

const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const tagFor = locale => locale === 'de' ? 'de-DE' : 'en-US';
function fixture(count) {
  const names = ['Äpfel', 'Öl', 'Überblick', 'Straße', 'İstanbul', 'Cafe\u0301', 'Café', '😀 Box'];
  return Array.from({ length: count }, (_, index) => ({
    article_id: String(index).padStart(8, '0'), article_name: names[index % names.length] + ' Artikel ' + index,
    customer_id: 'K' + String(index).padStart(8, '0'), customer_name: names[index % names.length] + ' Kunde ' + index,
    order_id: 'O' + String(index).padStart(8, '0'), delivery_date: index % 79 === 0 ? null : '2026-09-' + String(index % 28 + 1).padStart(2, '0'),
    quantity: 90071992547409930000000n + BigInt(index % 41), source_file_id: 'synthetic', source_line: index + 2
  }));
}
function oldFilter(list, query, locale) {
  return query ? list.filter(entity => (entity.label + ' ' + entity.secondary).toLocaleLowerCase(tagFor(locale)).includes(query)) : list;
}
function view(list, locale, variant) {
  let lastQuery, lastResult;
  return {
    clear() { lastQuery = undefined; lastResult = undefined; },
    query(raw) {
      const query = raw.trim().toLocaleLowerCase(tagFor(locale));
      if (lastQuery !== query) {
        lastResult = variant === 'before' ? oldFilter(list, query, locale) : terminal.filterEntities(list, query, locale);
        lastQuery = query;
      }
      return lastResult;
    }
  };
}
function digest(results) {
  const hash = crypto.createHash('sha256');
  for (const result of results) {
    hash.update(JSON.stringify(result.map(entity => [entity.key, entity.quantity.toString(), entity.lines])));
    hash.update('\n');
  }
  return hash.digest('hex');
}
function child(count, scope, variant, repeats) {
  const locale = 'de', rows = fixture(count), index = terminal.buildIndex(rows, [scope]);
  const list = terminal.rankEntities(rows, index.entities[scope], scope, index.latestDate, 'all', 'quantity');
  if (global.gc) global.gc();
  const beforeHeap = process.memoryUsage().heapUsed;
  const start = performance.now();
  if (variant === 'after') terminal.prepareEntitySearchProjections(list, locale);
  const preparationMs = performance.now() - start;
  if (global.gc) global.gc();
  const retainedProjectionHeapMiB = (process.memoryUsage().heapUsed - beforeHeap) / (1024 * 1024);
  const selected = Array.from({ length: 32 }, (_, i) => String(Math.floor(i * (count - 1) / 31)).padStart(8, '0'));
  const distinct = ['', '0', 'Ö', 'ÄPFEL', 'überblick', 'STRASSE', 'straße', 'İSTANBUL', 'café', 'cafe\u0301', '😀', 'Box', '\u0000', 'unknown', ...selected];
  const workloads = [
    { name: 'distinct', queries: distinct, prime: [] },
    { name: 'same', queries: Array(80).fill(selected[7]), prime: [selected[7]] },
    { name: 'alternating', queries: Array.from({ length: 80 }, (_, i) => selected[i % 8]), prime: selected.slice(0, 8) }
  ];
  const current = view(list, locale, variant), baseline = view(list, locale, 'before');
  const measurements = [];
  for (const workload of workloads) {
    baseline.clear(); const expected = digest(workload.queries.map(query => baseline.query(query)));
    const samples = [];
    for (let repeat = -1; repeat < repeats; repeat += 1) {
      current.clear(); workload.prime.forEach(query => current.query(query));
      if (global.gc) global.gc();
      const started = performance.now();
      const output = workload.queries.map(query => current.query(query));
      const elapsed = performance.now() - started;
      assert.equal(digest(output), expected, variant + '/' + scope + '/' + workload.name);
      if (repeat >= 0) samples.push(elapsed);
    }
    measurements.push({ workload: workload.name, queryCount: workload.queries.length, distinctQueries: new Set(workload.queries).size, medianMs: median(samples), samplesMs: samples, sha256: expected });
  }
  return { count, scope, variant, locale, preparationMs, retainedProjectionHeapMiB,
    peakRssMiB: process.resourceUsage().maxRSS / 1024, measurements };
}

if (process.argv[2] === '--child') {
  process.stdout.write(JSON.stringify(child(Number(process.argv[3]), process.argv[4], process.argv[5], Number(process.argv[6]))));
} else {
  const counts = (process.argv[2] || '1000,10000').split(',').map(Number);
  const repeats = Number(process.argv[3] || 5);
  if (counts.some(count => !Number.isInteger(count) || count <= 0) || !Number.isInteger(repeats) || repeats < 1) throw new Error('Usage: node tools/benchmark-terminal-search.cjs [counts comma separated] [positive repeats]');
  const result = { timestamp: new Date().toISOString(), baselineCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: __dirname, encoding: 'utf8' }).trim(),
    node: process.version, platform: process.platform, cpu: os.cpus()[0]?.model, warmup: 1, repeats,
    before: 'Former app.js renderTerminalWatchlist expression; current rankEntities and existing one-query view cache retained',
    after: 'Production terminal.js private WeakMap projections + filterEntities; existing one-query view cache retained',
    scope: 'Node operation time; fixture/index/rank setup excluded; once measured cold projection build separate; distinct query caches cold but projections warm; same/alternating primed outside timing; full result digests asserted outside timing; explicit GC outside timing',
    memory: 'Projection heap is one before/after-GC retained snapshot. Whole process maxRSS includes fixtures, setup and correctness checks. No Edge memory claim.',
    results: [] };
  for (const [sizeIndex, count] of counts.entries()) for (const scope of ['article', 'customer', 'order']) {
    const order = sizeIndex % 2 ? ['after', 'before'] : ['before', 'after'];
    for (const variant of order) {
      const processResult = spawnSync(process.execPath, ['--expose-gc', __filename, '--child', String(count), scope, variant, String(repeats)], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
      if (processResult.status !== 0) throw new Error(processResult.stderr);
      const value = JSON.parse(processResult.stdout); result.results.push(value);
      process.stderr.write(`${count}/${scope}/${variant}: ` + value.measurements.map(m => `${m.workload} ${m.medianMs.toFixed(2)} ms`).join('; ') + '\n');
    }
  }
  for (const count of counts) for (const scope of ['article', 'customer', 'order']) for (const workload of ['distinct', 'same', 'alternating']) {
    const digests = result.results.filter(item => item.count === count && item.scope === scope).map(item => item.measurements.find(m => m.workload === workload).sha256);
    assert.equal(new Set(digests).size, 1, 'Before/after digest mismatch');
  }
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}
