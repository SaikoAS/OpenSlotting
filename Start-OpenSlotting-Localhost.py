#!/usr/bin/env python3
"""Serve OpenSlotting on a stable loopback origin without dependencies."""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import sys
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
        "runtime.js",
        "app.js",
        "encoding.js",
        "csv.js",
        "periods.js",
        "workspace.js",
        "storage.js",
        "OpenSlotting.ico",
    }
)
CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
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
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
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
            or "/" in relative_path
            or "\\" in relative_path
        ):
            return None
        candidate = APPLICATION_ROOT / relative_path
        return candidate if candidate.is_file() else None

    def _serve_runtime_file(self, include_body: bool) -> None:
        file_path = self._requested_file()
        if file_path is None:
            self.send_error(404, "OpenSlotting runtime file not found")
            return
        payload = file_path.read_bytes()
        content_type = CONTENT_TYPES.get(
            file_path.suffix.lower(),
            mimetypes.guess_type(file_path.name)[0] or "application/octet-stream",
        )
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
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
