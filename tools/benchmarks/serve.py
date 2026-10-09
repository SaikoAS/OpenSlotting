"""Loopback-only, explicit-allowlist server for the production browser benchmark.

Python standard library only. Git is used to extract the existing developer
checkout baseline, never to modify the repository. Generated files stay in
ignored dist/performance-browser/. This does not change the application server.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "dist" / "performance-browser"
BASELINE = "db39ffa"
FACTORY_FILES = ("encoding.js", "csv.js", "warehouse.js", "workspace.js")
PRODUCTION_ASSETS = FACTORY_FILES + (
    "src/application/workspace-preparation.js",
    "src/application/worker-session.js",
    "src/workers/workspace-worker.mjs",
)
HARNESS_ASSETS = (
    "tools/benchmarks/browser-worker.html",
    "tools/benchmarks/browser-worker.js",
    "dist/performance-browser/baseline-worker.js",
    "dist/performance-browser/manifest.json",
)
FUNCTION_NAMES = (
    "decodeFileEntry", "importBufferStreaming", "sourceContext",
    "runtimeFileFromStored", "persistPreparedWorkspace", "prepareWorkspaceRecord",
    "workspaceWorkerMain", "workspaceLoadError", "createWorkspaceWorker",
    "runWorkspaceWorker",
)


def git_source(name: str) -> str:
    result = subprocess.run(
        ["git", "show", f"{BASELINE}:{name}"], cwd=ROOT, check=True,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    return result.stdout.decode("utf-8").replace("\r\n", "\n")


def extract_function(source: str, name: str) -> str:
    start = re.search(r"^  (?:async )?function " + re.escape(name) + r"\(", source, re.M)
    if start is None:
        raise ValueError(f"Missing baseline function: {name}")
    # Only application-level declarations have exactly two spaces. Nested
    # functions have a greater indentation; no brace/regex parser is needed.
    following = re.search(r"\n  (?:async )?function \w+\(", source[start.end():])
    if following is None:
        raise ValueError(f"Missing boundary after baseline function: {name}")
    return source[start.start():start.end() + following.start()].strip()


def digest(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def build_baseline() -> None:
    application = git_source("app.js")
    # Compare worker orchestration on one shared current data contract. Old
    # schema-13 factories cannot process current schema-14/layout-2 inputs.
    factory_sources = {name: (ROOT / name).read_text(encoding="utf-8").replace("\r\n", "\n") for name in FACTORY_FILES}
    root_selector = "typeof globalThis !== 'undefined' ? globalThis : this"
    isolated = []
    for name, source in factory_sources.items():
        if source.count(root_selector) != 1:
            raise ValueError(f"Unexpected UMD root in {name}; extraction needs review")
        isolated.append(source.replace(root_selector, "baselineRoot", 1))
    functions = [extract_function(application, name) for name in FUNCTION_NAMES]
    # The original constructor and run path remain verbatim. Only the host
    # namespace is isolated, so baseline factories cannot replace current APIs.
    header = """(function () {
'use strict';
const baselineRoot = {};
"""
    aliases = """
const window = baselineRoot;
const encoding = baselineRoot.OpenSlottingEncoding;
const core = baselineRoot.OpenSlottingCsv;
const warehouseModel = baselineRoot.OpenSlottingWarehouse;
const workspaceModel = baselineRoot.OpenSlottingWorkspace;
let workspaceLoadRevision = 1;
let workspaceWorkerTask = null;
function updateWorkspaceLoadProgress() {}
"""
    footer = """
globalThis.OpenSlottingBrowserBaseline = Object.freeze({
  run(record) { return runWorkspaceWorker(record, record.language, 1, record.name); },
  cancel() {
    const task = workspaceWorkerTask;
    if (!task) return;
    workspaceWorkerTask = null;
    task.worker.terminate();
    URL.revokeObjectURL(task.url);
    task.reject(workspaceLoadError('workspace_load_cancelled'));
  }
});
}());
"""
    combined = header + "\n".join(isolated) + aliases + "\n\n".join(functions) + footer
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with (OUTPUT / "baseline-worker.js").open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(combined)
    baseline_commit = subprocess.run(
        ["git", "rev-parse", BASELINE], cwd=ROOT, check=True,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    ).stdout.decode("ascii").strip()
    manifest = {
        "baselineRef": BASELINE,
        "baselineCommit": baseline_commit,
        "sharedDomainModuleSha256": {name: digest(source.encode("utf-8")) for name, source in factory_sources.items()},
        "domainContract": "current shared factories for both variants; historical Blob orchestration only, not full historical application",
        "baselineFunctionSha256": {name: digest(value.encode("utf-8")) for name, value in zip(FUNCTION_NAMES, functions)},
        "generatedBaselineSha256": digest(combined.encode("utf-8")),
        "productionAssetSha256": {name: digest((ROOT / name).read_bytes()) for name in PRODUCTION_ASSETS},
        "serverPolicy": "127.0.0.1 only; explicit read-only asset allowlist; fixed in-memory asset snapshot; no uploads or data endpoints",
    }
    with (OUTPUT / "manifest.json").open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(json.dumps(manifest, indent=2))


class BenchmarkServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address: tuple[str, int]):
        super().__init__(address, BenchmarkHandler)
        self.assets = {}
        for name in PRODUCTION_ASSETS + HARNESS_ASSETS:
            path = (ROOT / name).resolve()
            path.relative_to(ROOT.resolve())
            payload = path.read_bytes()
            mime = "text/html; charset=utf-8" if name.endswith(".html") else (
                "application/json; charset=utf-8" if name.endswith(".json") else "text/javascript; charset=utf-8"
            )
            self.assets["/" + name] = (payload, mime, '"' + digest(payload) + '"')


class BenchmarkHandler(BaseHTTPRequestHandler):
    server_version = "OpenSlottingBrowserBenchmark/1"

    def log_message(self, format: str, *args: object) -> None:
        # No request logging: a closed launcher pipe must not break responses.
        pass

    def do_HEAD(self) -> None:
        self.serve_asset(head=True)

    def do_GET(self) -> None:
        self.serve_asset(head=False)

    def serve_asset(self, *, head: bool) -> None:
        port = self.server.server_address[1]
        if self.headers.get("Host") not in {f"127.0.0.1:{port}", f"localhost:{port}"}:
            self.send_error(400, "Loopback Host required")
            return
        navigation = (self.headers.get("Sec-Fetch-Dest") == "document"
                      and self.headers.get("Sec-Fetch-Mode") == "navigate")
        if self.headers.get("Sec-Fetch-Site", "none") not in {"none", "same-origin"} and not navigation:
            self.send_error(403, "Same-origin requests required")
            return
        target = urlsplit(self.path)
        if target.scheme or target.netloc:
            self.send_error(400, "Relative request target required")
            return
        path = unquote(target.path)
        if path == "/":
            path = "/tools/benchmarks/browser-worker.html"
        asset = self.server.assets.get(path)
        if asset is None:
            self.send_error(404, "Asset outside benchmark allowlist")
            return
        payload, mime, etag = asset
        unchanged = self.headers.get("If-None-Match") == etag
        self.send_response(304 if unchanged else 200)
        self.send_header("Content-Type", mime)
        self.send_header("ETag", etag)
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        self.send_header("Content-Security-Policy", "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; worker-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
        if not unchanged:
            self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        if not head and not unchanged:
            self.wfile.write(payload)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8877)
    parser.add_argument("--build-only", action="store_true")
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("port must be between 1 and 65535")
    build_baseline()
    if args.build_only:
        print(OUTPUT)
        return
    server = BenchmarkServer(("127.0.0.1", args.port))
    print(f"Browser benchmark: http://127.0.0.1:{args.port}/tools/benchmarks/browser-worker.html", flush=True)
    print("Synthetic data only. Assets snapshotted at startup; restart after source edits. Ctrl+C stops server.", flush=True)
    try:
        server.serve_forever(poll_interval=0.25)
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
