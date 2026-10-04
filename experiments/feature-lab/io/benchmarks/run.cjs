'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const { performance } = require('node:perf_hooks');
const { spawnSync, execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const csv = require('../../../../csv.js');
const terminal = require('../../../../terminal.js');
const imports = require('../modules/imports.cjs');
const exportsApi = require('../modules/exports.cjs');
const interpretation = require('../modules/interpretation.cjs');
const fixtures = require('./fixtures.cjs');

const REPEATS = 5;
const median = list => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)];
const stableHash = value => crypto.createHash('sha256').update(JSON.stringify(value, (_, item) => typeof item === 'bigint' ? { $bigint: item.toString() } : item)).digest('hex');

function child(group, variant, count) {
  let run;
  let expected;
  let inputBytes;
  if (group === 'import') {
    const fixture = fixtures.makeFixture(count);
    inputBytes = fixture.bytes.length;
    expected = imports.importBytes(fixture.bytes, { ...fixture.options, mapping: fixture.mapping, variant: 'baseline-64k' }).result;
    run = () => imports.importBytes(fixture.bytes, { ...fixture.options, mapping: fixture.mapping, variant });
  } else {
    const fixture = fixtures.makeExportFixture(count);
    const raw = group === 'terminal' ? terminal.exportLinesCsv(fixture.lines, fixture.columns, fixture.valueForColumn) : csv.exportAnalysisCsv(fixture.articles);
    expected = exportsApi.hashUtf8([raw]);
    inputBytes = expected.bytes;
    const chunks = () => group === 'terminal' ?
      exportsApi.terminalChunks(fixture.lines, fixture.columns, fixture.valueForColumn, { chunkRows: variant.endsWith('32') ? 32 : 512 }) :
      exportsApi.analysisChunks(fixture.articles, { chunkRows: variant.endsWith('32') ? 32 : 512 });
    run = () => {
      if (variant === 'baseline') return exportsApi.hashUtf8([group === 'terminal' ? terminal.exportLinesCsv(fixture.lines, fixture.columns, fixture.valueForColumn) : csv.exportAnalysisCsv(fixture.articles)]);
      if (variant === 'collect-512') return exportsApi.hashUtf8([exportsApi.collectUtf8(chunks())]);
      return exportsApi.hashUtf8(chunks());
    };
  }
  const samples = [];
  const preparationSamples = [];
  const check = output => {
    if (group === 'import') assert.deepEqual(output.result, expected);
    else assert.deepEqual(output, expected);
  };
  check(run()); // ungemessener Warmup
  for (let repeat = 0; repeat < REPEATS; repeat += 1) {
    if (global.gc) global.gc();
    const start = performance.now();
    const result = run();
    samples.push(performance.now() - start);
    preparationSamples.push(group === 'import' ? result.prepareMs : 0);
    check(result); // Vertragsprüfung explizit außerhalb Zeitfenster
  }
  return {
    group, variant, count, inputBytes,
    medianMs: median(samples), samplesMs: samples,
    preprocessingMedianMs: median(preparationSamples), preprocessingSamplesMs: preparationSamples,
    processMedianMs: median(samples.map((value, i) => value - preparationSamples[i])),
    peakRssMiB: process.resourceUsage().maxRSS / 1024,
    outputHash: group === 'import' ? stableHash(expected) : expected.sha256,
    validRows: group === 'import' ? expected.validRows : undefined,
    invalidRows: group === 'import' ? expected.invalidRows : undefined,
    filteredRows: group === 'import' ? expected.filteredRows : undefined
  };
}

function quality() {
  const methods = ['existing-suggestions', 'deterministic-rules', 'profile-top-k'];
  const results = [];
  for (const method of methods) {
    let positiveTargets = 0; let truePositives = 0; let falsePositives = 0; let abstained = 0; let decisions = 0; let top1Correct = 0;
    const cases = [];
    for (const item of fixtures.interpretationCases()) {
      const catalog = fixtures.caseCatalog(item);
      let proposals;
      if (method === 'existing-suggestions') {
        const baseline = csv.buildMappingSuggestions(item.headers, catalog.map(column => column.profile), { includeLegacy: true });
        proposals = Object.entries(baseline).map(([field, candidates]) => ({ targetField: field, uncertain: !candidates[0] || !candidates[0].automaticApplicationSafe, topK: candidates.map(candidate => ({ ...candidate, position: candidate.sourcePosition })) }));
      } else proposals = method === 'deterministic-rules' ? interpretation.suggestByRules(catalog) : interpretation.suggestWithProfiles(catalog);
      for (const [field, expectedPosition] of Object.entries(item.expected)) {
        const proposal = proposals.find(x => x.targetField === field);
        const selected = proposal.topK[0]?.position ?? null;
        const definitive = !proposal.uncertain;
        decisions += 1;
        if (expectedPosition !== null) {
          positiveTargets += 1;
          if (selected === expectedPosition) top1Correct += 1;
        }
        if (!definitive) abstained += 1;
        else if (selected === expectedPosition && expectedPosition !== null) truePositives += 1;
        else falsePositives += 1;
        cases.push({ case: item.name, field, expectedPosition, selected, definitive, correct: selected === expectedPosition });
      }
    }
    results.push({ method, decisions, positiveTargets, truePositives, falsePositives, abstained,
      precision: truePositives / (truePositives + falsePositives), recall: truePositives / positiveTargets,
      abstentionRate: abstained / decisions, top1AccuracyOnKnownTargets: top1Correct / positiveTargets, cases });
  }
  return results;
}

function profileCost(count) {
  const fixture = fixtures.makeFixture(count);
  const times = { profileMs: [], headerSuggestionMs: [], profileSuggestionMs: [] };
  let catalog;
  for (let repeat = -1; repeat < REPEATS; repeat += 1) {
    let start = performance.now();
    catalog = csv.profileCsvStreamingChunks([fixture.text], fixture.options).columnCatalog;
    const profileMs = performance.now() - start;
    start = performance.now(); interpretation.suggestByRules(catalog); const headerSuggestionMs = performance.now() - start;
    start = performance.now(); interpretation.suggestWithProfiles(catalog); const profileSuggestionMs = performance.now() - start;
    if (repeat >= 0) { times.profileMs.push(profileMs); times.headerSuggestionMs.push(headerSuggestionMs); times.profileSuggestionMs.push(profileSuggestionMs); }
  }
  return { count, columns: catalog.length, ...Object.fromEntries(Object.entries(times).map(([key, values]) => [key, { median: median(values), samples: values }])) };
}

if (require.main === module && process.argv[2] === '--child') {
  const result = child(process.argv[3], process.argv[4], Number(process.argv[5]));
  process.stdout.write(JSON.stringify(result));
} else if (require.main === module) {
  const counts = (process.argv[2] || '1000,10000,50000').split(',').map(Number);
  if (counts.some(count => !Number.isInteger(count) || count <= 0)) throw new RangeError('Positive counts required');
  const result = {
    schemaVersion: 1, generatedAt: new Date().toISOString(), baselineCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: path.resolve(__dirname, '../../../..'), encoding: 'utf8' }).trim(),
    node: process.version, platform: process.platform, cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length,
    repeats: REPEATS, warmup: 1, input: 'deterministic synthetic only',
    timingScope: 'fixture/analysis preparation and correctness assertions excluded; import encoding resolution/eager decode included as preprocessing; all exports include UTF8 encode and same SHA256 sink; separate cold subprocess per method/size; RSS entire child including fixtures/baseline/contracts',
    measurements: [], interpretationQuality: quality(), interpretationCost: [],
    interpretationGroundTruth: 'fixtures/interpretation-ground-truth.cjs; explicit independent labels, includes hidden semantic counterexample'
  };
  const groups = { import: imports.VARIANTS, terminal: ['baseline', 'sink-32', 'sink-512', 'collect-512'], analysis: ['baseline', 'sink-32', 'sink-512', 'collect-512'] };
  for (let sizeIndex = 0; sizeIndex < counts.length; sizeIndex += 1) {
    const count = counts[sizeIndex];
    for (const [group, originalVariants] of Object.entries(groups)) {
      const variants = [...originalVariants.slice(sizeIndex), ...originalVariants.slice(0, sizeIndex)];
      for (const variant of variants) {
        const output = spawnSync(process.execPath, ['--expose-gc', __filename, '--child', group, variant, String(count)], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
        if (output.status !== 0) throw new Error(`${group}/${variant}/${count}: ${output.stderr}`);
        const measurement = JSON.parse(output.stdout); result.measurements.push(measurement);
        process.stderr.write(`${group}/${variant}/${count}: ${measurement.medianMs.toFixed(1)} ms\n`);
      }
    }
    result.interpretationCost.push(profileCost(count));
  }
  const filename = path.resolve(__dirname, '../results/node-io.json');
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(result, null, 2) + '\n');
  process.stdout.write(JSON.stringify({ results: filename, measurements: result.measurements.length, quality: result.interpretationQuality.map(({ cases, ...values }) => values) }, null, 2) + '\n');
}

module.exports = { quality, profileCost };
