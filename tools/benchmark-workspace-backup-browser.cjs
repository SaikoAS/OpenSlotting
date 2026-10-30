'use strict';
// Opt-in native Edge integration benchmark with a new temporary profile and synthetic database.
const http = require('node:http'), fs = require('node:fs/promises'), os = require('node:os'), path = require('node:path');
const { spawn } = require('node:child_process'), assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const rows = Number(process.argv[2] || 10000);
const edge = process.env.OPENSLOTTING_EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const assets = ['csv.js', 'encoding.js', 'warehouse.js', 'workspace.js', 'storage.js', 'src/application/workspace-archive.js', 'tools/benchmarks/backup-browser.js'];
(async function () {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'openslotting-backup-edge-'));
  const server = http.createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname.slice(1);
    if (!pathname) {
      response.setHeader('Content-Type', 'text/html');
      response.end('<!doctype html><body>Synthetic backup benchmark' + assets.map(asset => '<script src="/' + asset + '"></script>').join(''));
    } else if (assets.includes(pathname)) {
      response.setHeader('Content-Type', 'text/javascript');
      response.end(await fs.readFile(path.join(root, pathname)));
    } else { response.statusCode = 404; response.end(); }
  });
  let child, socket;
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = 'http://127.0.0.1:' + server.address().port + '/?rows=' + rows + (process.argv[3] === '--identity' ? '&compression=identity' : '');
    child = spawn(edge, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
      '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', '--user-data-dir=' + profile, url], { windowsHide: true, stdio: 'ignore' });
    let launchError;
    child.on('error', error => { launchError = error; });
    let port;
    for (let index = 0; index < 100; index++) {
      if (launchError) throw launchError;
      try { port = Number((await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; } catch (_) { await wait(200); }
    }
    if (!port) throw new Error('Edge debugging endpoint did not start.');
    const targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
    const target = targets.find(target => target.type === 'page' && target.url.startsWith(url));
    if (!target) throw new Error('Synthetic benchmark page not found.');
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    let serial = 0;
    const pending = new Map();
    socket.addEventListener('message', event => { const data = JSON.parse(event.data); if (pending.has(data.id)) { pending.get(data.id)(data); pending.delete(data.id); } });
    async function evaluate(expression) {
      const id = ++serial;
      const response = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(id); reject(new Error('Edge evaluation timed out.')); }, 15000);
        pending.set(id, value => { clearTimeout(timer); resolve(value); });
        socket.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true } }));
      });
      return response.result && response.result.result && response.result.result.value;
    }
    let result;
    for (let index = 0; index < 300; index++) {
      result = await evaluate('window.backupBenchmarkResult || null');
      if (result) break;
      await wait(1000);
    }
    if (!result) throw new Error('Browser benchmark timed out.');
    console.log(JSON.stringify(result, null, 2)); assert.equal(result.passed, true);
  } finally {
    if (socket) socket.close();
    if (child && !child.killed) child.kill();
    await new Promise(resolve => server.close(resolve));
    // Edge may still release profile files briefly after its process exits.
    await wait(1000);
    if (path.dirname(path.resolve(profile)) !== path.resolve(os.tmpdir()) || !path.basename(profile).startsWith('openslotting-backup-edge-')) {
      throw new Error('Refusing cleanup outside the owned temporary browser profile.');
    }
    await fs.rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  }
}()).catch(error => { console.error(error); process.exitCode = 1; });
