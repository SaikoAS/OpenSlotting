'use strict';

const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

function findPython() {
  const candidates = process.platform === 'win32'
    ? [
      { command: 'py', prefix: ['-3'] },
      { command: 'python', prefix: [] },
      { command: 'python3', prefix: [] }
    ]
    : [
      { command: 'python3', prefix: [] },
      { command: 'python', prefix: [] }
    ];
  return candidates.find((candidate) => {
    const checked = spawnSync(candidate.command, candidate.prefix.concat(['--version']), {
      encoding: 'utf8',
      windowsHide: true
    });
    return checked.status === 0;
  }) || null;
}

test('experimental Python server is loopback-only and serves only runtime files', { timeout: 15000 }, async (context) => {
  const python = findPython();
  if (!python) {
    context.skip('Python 3 is not available on this test host.');
    return;
  }

  const scriptPath = path.join(__dirname, '..', 'Start-OpenSlotting-Localhost.py');
  const child = spawn(
    python.command,
    python.prefix.concat([scriptPath, '--port', '0', '--no-browser']),
    { cwd: path.dirname(scriptPath), windowsHide: true }
  );
  let output = '';
  let errorOutput = '';
  child.stderr.on('data', (chunk) => { errorOutput += chunk.toString(); });
  context.after(() => {
    if (!child.killed) {
      child.kill();
    }
  });

  const url = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Localhost server did not report its URL.\n' + output + errorOutput));
    }, 10000);
    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once('exit', (code) => {
      if (code !== null && code !== 0) {
        clearTimeout(timeout);
        reject(new Error('Localhost server exited with ' + code + '.\n' + output + errorOutput));
      }
    });
    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
      const match = output.match(/OpenSlotting local server: (http:\/\/127\.0\.0\.1:\d+\/index\.html)/);
      if (match) {
        clearTimeout(timeout);
        resolve(match[1]);
      }
    });
  });

  const indexResponse = await fetch(url);
  assert.equal(indexResponse.status, 200);
  assert.match(indexResponse.headers.get('content-type'), /^text\/html/);
  assert.equal(indexResponse.headers.get('cache-control'), 'no-store');
  assert.equal(indexResponse.headers.get('x-content-type-options'), 'nosniff');
  assert.match(await indexResponse.text(), /<title>OpenSlotting[^<]*<\/title>/);

  const origin = new URL(url).origin;
  const healthResponse = await fetch(origin + '/health');
  assert.equal(healthResponse.status, 200);
  assert.match(healthResponse.headers.get('content-type'), /^application\/json/);
  const health = await healthResponse.json();
  assert.equal(health.application, 'OpenSlotting');
  assert.equal(health.server, 'experimental-python');
  assert.equal(health.version, 1);
  assert.equal(Number.isInteger(health.pid), true);
  assert.equal(path.resolve(health.applicationRoot), path.resolve(path.dirname(scriptPath)));

  const scriptResponse = await fetch(origin + '/app.js');
  assert.equal(scriptResponse.status, 200);
  assert.match(scriptResponse.headers.get('content-type'), /^text\/javascript/);

  const headResponse = await fetch(origin + '/index.html', { method: 'HEAD' });
  assert.equal(headResponse.status, 200);
  assert.equal(await headResponse.text(), '');

  assert.equal((await fetch(origin + '/README.md')).status, 404);
  assert.equal((await fetch(origin + '/.git/config')).status, 404);
  assert.equal((await fetch(origin + '/%2e%2e/README.md')).status, 404);
});
