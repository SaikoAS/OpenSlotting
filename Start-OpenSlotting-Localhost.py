#!/usr/bin/env python3
"""Serve OpenSlotting on a stable loopback origin without dependencies."""

from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import os
import sys
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Optional
from urllib.parse import unquote, urlsplit


APPLICATION_ROOT = Path(__file__).resolve().parent
DEFAULT_PORT = 8765
RUNTIME_FILES = frozenset(
    {
        "index.html",
        "app.css",
        "terminal-theme.css",
        "warehouse-editor.css",
        "runtime.js",
        "app.js",
        "terminal.js",
        "warehouse.js",
        "warehouse-webgl.js",
        "warehouse-scene.js",
        "warehouse-editor.js",
        "warehouse-analysis.js",
        "warehouse-walk-model.js",
        "warehouse-walk-renderer.js",
        "warehouse-walk.js",
        "warehouse-walk.css",
        "encoding.js",
        "csv.js",
        "periods.js",
        "workspace.js",
        "storage.js",
        "OpenSlotting.ico",
        "src/application/workspace-preparation.js",
        "src/application/worker-session.js",
        "src/application/workspace-archive.js",
        "src/application/import-profile-batch.js",
        "src/application/linked-sources.js",
        "src/ui/import-manager.js",
        "src/ui/import-profile-panel.js",
        "src/ui/coverage-calendar.js",
        "src/ui/shared/windowed-dom.js",
        "src/workers/workspace-worker.mjs",
    }
)
CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".ico": "image/vnd.microsoft.icon",
}


def expected_loopback_hosts(port: int) -> frozenset[str]:
    """Return the HTTP Host authorities accepted for the bound loopback port."""
    authorities = {f"127.0.0.1:{port}"}
    if port == 80:
        authorities.add("127.0.0.1")
    return frozenset(authorities)


class OpenSlottingRequestHandler(BaseHTTPRequestHandler):
    server_version = "OpenSlottingLocalhost/0.1"
    expected_hosts = frozenset()

    def end_headers(self) -> None:
        self.send_header("Cache-Control", getattr(self, "cache_policy", "no-store"))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self' blob:; worker-src 'self' blob:; "
            "style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; "
            "connect-src 'none'; object-src 'none'; base-uri 'none'; "
            "frame-ancestors 'none'; form-action 'none'",
        )
        super().end_headers()

    def _requested_file(self) -> Optional[Path]:
        request_path = unquote(urlsplit(self.path).path)
        if request_path == "/":
            relative_path = "index.html"
        elif request_path == "/favicon.ico":
            relative_path = "OpenSlotting.ico"
        else:
            relative_path = request_path.lstrip("/")
        if (
            relative_path not in RUNTIME_FILES
            or "\\" in relative_path
        ):
            return None
        candidate = (APPLICATION_ROOT / relative_path).resolve()
        try:
            candidate.relative_to(APPLICATION_ROOT)
        except ValueError:
            return None
        return candidate if candidate.is_file() else None

    def _serve_runtime_file(self, include_body: bool) -> None:
        file_path = self._requested_file()
        if file_path is None:
            self.send_error(404, "OpenSlotting runtime file not found")
            return
        payload, etag = self.server.runtime_asset(file_path)
        self.cache_policy = "no-store" if file_path.suffix == ".html" else "no-cache"
        candidates = self.headers.get("If-None-Match", "").split(",")
        if self.cache_policy == "no-cache" and any(
            (candidate.strip()[2:] if candidate.strip().startswith("W/") else candidate.strip()) == etag
            or candidate.strip() == "*"
            for candidate in candidates
        ):
            self.send_response(304)
            self.send_header("ETag", etag)
            self.end_headers()
            return
        content_type = CONTENT_TYPES.get(
            file_path.suffix.lower(),
            mimetypes.guess_type(file_path.name)[0] or "application/octet-stream",
        )
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("ETag", etag)
        self.end_headers()
        if include_body:
            self.wfile.write(payload)

    def _serve_health(self, include_body: bool) -> None:
        payload = json.dumps(
            {
                "application": "OpenSlotting",
                "server": "experimental-python",
                "version": 1,
                "pid": os.getpid(),
                "applicationRoot": str(APPLICATION_ROOT),
            },
            separators=(",", ":"),
        ).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        if include_body:
            self.wfile.write(payload)

    def _has_trusted_host(self) -> bool:
        if self.headers.get("Host", "") in self.expected_hosts:
            return True
        self.send_error(400, "The Host header must target the loopback server")
        return False

    def _serve_request(self, include_body: bool) -> None:
        if not self._has_trusted_host():
            return
        if urlsplit(self.path).path == "/health":
            self._serve_health(include_body)
            return
        self._serve_runtime_file(include_body)

    def do_GET(self) -> None:  # noqa: N802 - HTTP handler API name
        self._serve_request(include_body=True)

    def do_HEAD(self) -> None:  # noqa: N802 - HTTP handler API name
        self._serve_request(include_body=False)

    def log_message(self, message_format: str, *args: object) -> None:
        print("[OpenSlotting] " + (message_format % args), flush=True)


class LoopbackServer(ThreadingHTTPServer):
    # Keep the fixed localhost origin exclusive, including on Windows.
    allow_reuse_address = os.name != "nt"
    daemon_threads = True

    def __init__(self, *args: object, **kwargs: object) -> None:
        self._runtime_cache = {}
        self._runtime_cache_lock = threading.Lock()
        super().__init__(*args, **kwargs)

    def runtime_asset(self, file_path: Path) -> tuple[bytes, str]:
        """Cache only explicitly allowed UI assets; revalidate changed files."""
        with self._runtime_cache_lock:
            stat = file_path.stat()
            signature = (stat.st_mtime_ns, stat.st_ctime_ns, stat.st_size)
            cached = self._runtime_cache.get(file_path)
            if cached is not None and cached[0] == signature:
                return cached[1], cached[2]
            payload = file_path.read_bytes()
            etag = '"' + hashlib.sha256(payload).hexdigest() + '"'
            self._runtime_cache[file_path] = (signature, payload, etag)
            return payload, etag


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Start OpenSlotting on a loopback-only localhost origin."
    )
    parser.add_argument(
        "--port",
        type=int,
        default=DEFAULT_PORT,
        help=(
            "Loopback port (default: 8765). Changing the port creates a separate "
            "browser storage origin; use 0 only for tests."
        ),
    )
    parser.add_argument(
        "--no-browser",
        action="store_true",
        help="Start the server without opening the default browser.",
    )
    arguments = parser.parse_args()
    if not 0 <= arguments.port <= 65535:
        parser.error("--port must be between 0 and 65535")
    return arguments


def main() -> int:
    arguments = parse_arguments()
    missing_files = sorted(
        file_name
        for file_name in RUNTIME_FILES
        if file_name != "OpenSlotting.ico"
        and not (APPLICATION_ROOT / file_name).is_file()
    )
    if missing_files:
        print(
            "OpenSlotting runtime files are missing: " + ", ".join(missing_files),
            file=sys.stderr,
        )
        return 1

    try:
        server = LoopbackServer(
            ("127.0.0.1", arguments.port), OpenSlottingRequestHandler
        )
    except OSError as error:
        print(
            f"Could not bind 127.0.0.1:{arguments.port}: {error}\n"
            "Close the process using this port or choose --port PORT. "
            "A different port uses a separate browser workspace origin.",
            file=sys.stderr,
        )
        return 1

    actual_port = int(server.server_address[1])
    OpenSlottingRequestHandler.expected_hosts = expected_loopback_hosts(actual_port)
    url = f"http://127.0.0.1:{actual_port}/index.html"
    print(f"OpenSlotting local server: {url}", flush=True)
    print("Stop with Ctrl+C. No files are uploaded or served outside loopback.", flush=True)
    if not arguments.no_browser:
        webbrowser.open(url, new=1)

    try:
        server.serve_forever(poll_interval=0.25)
    except KeyboardInterrupt:
        print("\nOpenSlotting local server stopped.", flush=True)
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
