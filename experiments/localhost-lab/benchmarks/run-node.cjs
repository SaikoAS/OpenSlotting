'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync, execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

async function run() {
  const rows = Number(process.argv[2] || 20000);
  const repeats = Number(process.argv[3] || 7);
  if (!Number.isInteger(rows) || rows < 1 || rows > 100000 || !Number.isInteger(repeats) || repeats < 3 || repeats > 25) {
    throw new Error('Usage: node experiments/localhost-lab/benchmarks/run-node.cjs [1..100000 rows] [3..25 repeats]');
  }
  const lab = path.resolve(__dirname, '..');
  const root = path.resolve(lab, '..', '..');
  const workspace = require(path.join(root, 'workspace.js'));
  const { makeWorkspace, populateImportResults } = await import(pathToFileURL(path.join(__dirname, 'fixtures.mjs')));
  const fixture = populateImportResults(makeWorkspace(rows, workspace), require(path.join(root, 'csv.js')), require(path.join(root, 'encoding.js')));
  const backup = workspace.stringifyBackup(fixture, { now: '2026-10-04T12:00:00.000Z' });
  const report = { date: new Date().toISOString(), baselineCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    environment: { platform: process.platform, node: process.version, architecture: process.arch, cpu: os.cpus()[0].model, logicalCpus: os.cpus().length, ramGiB: os.totalmem() / 1073741824 },
    methodology: { rows, repeats, processes: 'one fresh process per variant', warmup: 1,
      fixtureState: 'analyzed; original bytes, normalized rows, issues, column profiles, registry',
      warning: 'Node and Python codec timings are separate engines; neither is an Edge result. Does not include JSON construction or process startup.' },
    results: [] };
  for (const format of ['identity', 'gzip', 'deflate']) {
    const sample = spawnSync(process.execPath, [path.join(__dirname, 'node-sample.mjs'), format, String(rows), String(repeats)], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    if (sample.status !== 0) throw new Error(sample.stderr);
    report.results.push(JSON.parse(sample.stdout));
  }
  for (const level of [1, 6, 9]) {
    const sample = spawnSync(process.env.OPENSLOTTING_LAB_PYTHON || 'python', [path.join(__dirname, 'python-sample.py'), String(level), String(repeats)], { input: backup, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    if (sample.status !== 0) throw new Error(sample.stderr);
    report.results.push(JSON.parse(sample.stdout));
  }
  const output = path.join(lab, 'results', 'backup-node-python.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
run().catch(error => { console.error(error); process.exitCode = 1; });
