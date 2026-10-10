"""Separate static laboratory server. Python standard library; no data endpoints."""
import argparse
import importlib.util
import json
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

LAB = Path(__file__).resolve().parent
ROOT = LAB.parents[1]
CORE = {'csv.js', 'encoding.js', 'workspace.js', 'warehouse.js'}
LAB_FILES = {'index.html', 'benchmarks/browser.mjs', 'benchmarks/fixtures.mjs',
             'modules/worker-session.mjs', 'modules/source-stores.mjs',
             'modules/backup-codec.mjs', 'workers/workspace-worker.mjs',
             'modules/base64-validation.mjs', 'generated/workspace-base64-candidate.mjs',
             'workers/opfs-worker.mjs', 'generated/preparation-kernel.mjs',
             'generated/kernel-metadata.json'}
ALLOW = {name: ROOT / name for name in CORE}
ALLOW.update({'experiments/localhost-lab/' + name: LAB / name for name in LAB_FILES})


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.headers.get('Host') != '127.0.0.1:' + str(self.server.server_port):
            self.send_error(403)
            return
        request = urlsplit(self.path)
        name = unquote(request.path).lstrip('/')
        path = ALLOW.get(name)
        if path is None or not path.is_file() or request.query:
            self.send_error(404)
            return
        content = path.read_bytes()
        self.send_response(200)
        self.send_header('Content-Type', 'text/javascript; charset=utf-8' if path.suffix in {'.js', '.mjs'} else
                         (mimetypes.guess_type(str(path))[0] or 'application/octet-stream'))
        self.send_header('Content-Length', str(len(content)))
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self' blob:; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'")
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Cache-Control', 'no-cache')
        self.end_headers()
        self.wfile.write(content)

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8876)
    args = parser.parse_args()
    spec = importlib.util.spec_from_file_location('lab_kernel_builder', LAB / 'tools/build-kernel.py')
    builder = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(builder)
    builder.build()
    with ThreadingHTTPServer(('127.0.0.1', args.port), Handler) as server:
        print(json.dumps(dict(url='http://127.0.0.1:' + str(server.server_port) +
                              '/experiments/localhost-lab/index.html', mode='static-laboratory')), flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
