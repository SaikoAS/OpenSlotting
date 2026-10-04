import http.client
import importlib.util
import threading
import unittest
from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / 'serve.py'
SPEC = importlib.util.spec_from_file_location('feature_lab_server', PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class StaticLabTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = MODULE.ThreadingHTTPServer(('127.0.0.1', 0), MODULE.Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def request(self, path, host=None, method='GET'):
        connection = http.client.HTTPConnection('127.0.0.1', self.server.server_port)
        headers = {} if host is None else {'Host': host}
        connection.request(method, path, headers=headers)
        response = connection.getresponse()
        result = response.status, dict(response.getheaders()), response.read()
        connection.close()
        return result

    def test_assets_and_network_policy(self):
        for name in MODULE.ALLOW:
            status, headers, content = self.request('/' + name)
            self.assertEqual(status, 200, name)
            self.assertTrue(content)
            self.assertIn("connect-src 'none'", headers['Content-Security-Policy'])
            self.assertEqual(headers['X-Content-Type-Options'], 'nosniff')
            self.assertEqual(headers['Cache-Control'], 'no-store')
        self.assertEqual(self.server.server_address[0], '127.0.0.1')

    def test_explicit_allowlist_and_host(self):
        for path in ['/app.js', '/storage.js', '/.git/config', '/docs/data-format.md',
                     '/experiments/feature-lab/ui/data/interpretation-example.json',
                     '/experiments/feature-lab/ui/../serve.py', '/%2e%2e/workspace.js',
                     '/terminal.js?x=1', '/experiments/feature-lab/io/results/node-io.json']:
            self.assertEqual(self.request(path)[0], 404, path)
        self.assertEqual(self.request('/terminal.js', 'evil.example')[0], 403)
        self.assertEqual(self.request('/terminal.js', 'localhost:' + str(self.server.server_port))[0], 403)
        self.assertEqual(self.request('/terminal.js', method='POST')[0], 501)


if __name__ == '__main__':
    unittest.main()
