import importlib.util
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

LAB = Path(__file__).resolve().parents[1]


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class CodecTests(unittest.TestCase):
    def test_roundtrip_bounds_and_corruption(self):
        codec = load('codec', LAB / 'modules/backup_codec.py')
        data = b'Synthetic original backup' * 2000
        for level in (1, 6, 9):
            packed = codec.encode(data, level)
            self.assertEqual(codec.decode(packed, len(data)), data)
            self.assertEqual(packed, codec.encode(data, level))
            with self.assertRaises(ValueError):
                codec.decode(packed, len(data) - 1)
            with self.assertRaises((EOFError, OSError)):
                codec.decode(packed[:-4], len(data))
        self.assertEqual(codec.decode(codec.encode(b''), 0), b'')
        with self.assertRaises(ValueError):
            codec.encode(data, 0)


class ServerTests(unittest.TestCase):
    def test_local_allowlist_no_upload_or_user_data(self):
        server_module = load('labserver', LAB / 'serve.py')
        with ThreadingHTTPServer(('127.0.0.1', 0), server_module.Handler) as server:
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            base = 'http://127.0.0.1:' + str(server.server_port)
            try:
                with urllib.request.urlopen(base + '/experiments/localhost-lab/index.html') as response:
                    self.assertIn("connect-src 'none'", response.headers['Content-Security-Policy'])
                    self.assertIn(b'Localhost-Labor', response.read())
                for name in ('/storage.js', '/.git/config', '/test-data/basic-orders.csv', '/app.js',
                             '/experiments/localhost-lab/results/project-inventory.json', '/../README.md'):
                    with self.assertRaises(urllib.error.HTTPError) as error:
                        urllib.request.urlopen(base + name)
                    self.assertEqual(error.exception.code, 404)
                with self.assertRaises(urllib.error.HTTPError) as error:
                    urllib.request.urlopen(urllib.request.Request(base + '/csv.js', headers={'Host': 'attacker.example'}))
                self.assertEqual(error.exception.code, 403)
                for method in ('POST', 'PUT', 'DELETE'):
                    with self.assertRaises(urllib.error.HTTPError) as error:
                        urllib.request.urlopen(urllib.request.Request(base + '/csv.js', method=method))
                    self.assertEqual(error.exception.code, 501)
            finally:
                server.shutdown()
                thread.join()


if __name__ == '__main__':
    unittest.main()
