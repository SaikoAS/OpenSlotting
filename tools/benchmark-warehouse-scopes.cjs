'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { performance } = require('node:perf_hooks');
const model = require('../warehouse.js');
const { layoutFixture, uncodedScopeFixture } = require('../tests/fixtures/warehouse-performance.cjs');
const report = { generatedAt: new Date().toISOString(), layoutVersion: model.LAYOUT_VERSION,
  syntheticOnly: true, environment: { node: process.version, platform: process.platform, cpu: os.cpus()[0].model },
  methodology: 'Same current layout and ordered references. Repeated zoneForLevel/zoneLocations scans versus one current createScopeIndex per pass followed by Map reads. Build and sorting included; fixture construction excluded. One warmup, five alternating samples; full ordered outputs checked. Lookup CPU only, no drawing/GPU/FPS or peak-memory claim.', cases: [] };
let sink = 0;
for (const [name, layout, limit] of [['coded-1250-levels', layoutFixture(model, 150, 'spread', true), Infinity],
  ['uncoded-54000-levels-tail-probe', uncodedScopeFixture(model), 512]]) {
  const scopes = model.listScopes(layout), queried = Number.isFinite(limit) ? scopes.slice(-limit) : scopes;
  function read(indexed) {
    const index = indexed ? model.createScopeIndex(layout) : null;
    return queried.map(scope => {
      const zone = index ? index.zonesByLevel.get(scope.levelId) : model.zoneForLevel(layout, scope.levelId);
      const locations = index ? index.locationsByZone.get(zone.id) || [] : model.zoneLocations(layout, zone.id);
      return [zone.id, zone.usage, locations.map(location => [location.id, location.positionIndex, location.code])];
    });
  }
  assert.deepEqual(read(true), read(false));
  const samples = { repeatedScan: [], indexedPass: [] };
  read(false); read(true);
  for (let round = 0; round < 5; round++) for (const indexed of round % 2 ? [true, false] : [false, true]) {
    const start = performance.now(), output = read(indexed), elapsed = performance.now() - start;
    sink += output.length;
    samples[indexed ? 'indexedPass' : 'repeatedScan'].push(elapsed);
  }
  const summarize = values => ({ medianMs: values.slice().sort((a, b) => a - b)[2], minMs: Math.min(...values), maxMs: Math.max(...values), samplesMs: values });
  const row = { name, objects: layout.objects.length, physicalLevels: scopes.length, locations: layout.locations.length,
    queriedLevels: queried.length, wholeLayoutQueried: queried.length === scopes.length, outputsMatched: true,
    repeatedScan: summarize(samples.repeatedScan), indexedPass: summarize(samples.indexedPass) };
  report.cases.push(row);
  console.log(name, row.repeatedScan.medianMs.toFixed(3), '->', row.indexedPass.medianMs.toFixed(3), 'ms');
}
report.sources = {};
for (const file of ['warehouse.js', 'warehouse-editor.js', 'warehouse-scene.js', 'tests/fixtures/warehouse-performance.cjs', 'tools/benchmark-warehouse-scopes.cjs']) {
  report.sources[file] = crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, '..', file))).digest('hex');
}
report.sink = sink;
const output = path.resolve(process.argv[2] || path.join(__dirname, '..', 'docs/performance/results/warehouse-scopes-layout-v2.json'));
fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log('Saved ' + output);
