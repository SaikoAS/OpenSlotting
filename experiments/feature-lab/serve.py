"""Explicit static allowlist for the synthetic UI laboratory; no data API."""
import argparse
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

LAB = Path(__file__).resolve().parent
ROOT = LAB.parents[1]
ALLOW = {'terminal.js': ROOT / 'terminal.js'}
ALLOW.update({'experiments/feature-lab/ui/' + name: LAB / 'ui' / name for name in (
    'index.html', 'styles.css', 'app.mjs', 'table-model.mjs', 'renderers.mjs',
    'browser-benchmark.mjs', 'data/interpretation-example.mjs')})


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
        self.send_header('Content-Type', {'.html': 'text/html; charset=utf-8',
                         '.css': 'text/css; charset=utf-8'}.get(path.suffix, 'text/javascript; charset=utf-8'))
        self.send_header('Content-Length', str(len(content)))
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'")
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(content)

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8877)
    args = parser.parse_args()
    with ThreadingHTTPServer(('127.0.0.1', args.port), Handler) as server:
        print(json.dumps({'url': 'http://127.0.0.1:' + str(server.server_port) +
                               '/experiments/feature-lab/ui/index.html'}), flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
