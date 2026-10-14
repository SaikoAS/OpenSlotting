# Active localhost runtime

Localhost is the only actively developed runtime. Python 3.8+ serves bundled
interface files using only its standard library. Imports, preparation rules,
validation, article/master analysis, the analysis desk, period comparison,
warehouse editing and 3D analysis, IndexedDB workspaces, exports and backups
remain in the browser.

## Requirements and origin

- Existing Microsoft Edge Desktop on Windows for official acceptance.
- Company-approved Python 3.8 or newer; no pip packages.
- A complete local application folder; no OpenSlotting installer or executable.
- Existing Windows PowerShell for optional launchers and shortcuts.
- Normal URL: `http://127.0.0.1:8765/index.html`.

Node.js is a contributor test/benchmark tool only. There are no remote assets,
accounts, telemetry, administrator actions, or required internet access.
Company policies remain authoritative.

## Runtime contract

`runtime.js` exposes immutable `OpenSlottingRuntime` state:

| Property | Meaning |
| --- | --- |
| `mode` | `localhost` or `unsupported` |
| `reason` | `null`, `portable-paused`, or `unsupported-origin` |
| `origin` | Current browser storage origin |
| `capabilities`, `supports()` | Browser API detection without activation |
| `startupNotice()` | Localized start instructions for rejected origins |

Only HTTP(S) loopback hosts are classified as active. The shipped Python server
binds to IPv4 `127.0.0.1` only. Direct-file and non-loopback hosted access show
start instructions before controllers initialize or workspace storage opens.
There is no automatic redirect or cross-origin data access.

Optional browser capabilities and worker fallbacks remain available in the
localhost application. SQLite stays unavailable; no SQLite runtime is bundled.
Detection does not change calculations, storage or backup semantics.

## Data and privacy

Python serves an explicit interface-file allowlist; it has no upload, database
or business-calculation endpoint. Source CSVs, backups, repository files,
documentation and scripts are excluded. Browser Content Security Policy blocks
application connection requests with `connect-src 'none'`, while allowing
bundled same-origin module workers, styles and rendering.

The worker entrypoint is `src/workers/workspace-worker.mjs`. A sequential session
reuses one worker, tags responses with a task ID, terminates cancelled/failed
tasks and disposes after 30 seconds idle. New source profiling and reanalysis run
there too. Their input buffer copies keep the active view recoverable on cancel;
opening, restore and backup use transferable loaded buffers. The same core
calculation remains the explicit fallback if worker creation fails.

The Python server caches only allowed interface bytes and their ETags. Asset
changes invalidate that entry. HTML/health/errors are `no-store`; other assets
are `no-cache` with conditional `304` responses. This reduces repeated transfers
without changing the storage origin. Restart the server after updating its code,
then reload Edge so every module uses the same candidate.

Original bytes, normalized rows, mappings, validation, provenance and layouts
stay in IndexedDB in the current browser profile. The existing database name,
database version, workspace schema, backup format and default localhost origin
are unchanged by this separation. Existing localhost workspaces stay available.
Changing profile, host or port requires explicit backup/restore.

Portable data stays untouched at its original origin. Export from the previous
working copy before migrating, as described in
[portable-mode-paused.md](portable-mode-paused.md).

## Distribution

### Product version and candidate identity

`csv.js` is the single source for `APP_VERSION` and `APP_BUILD`. The product
version remains `0.2.1`; it does not mean that current development changes have
been released. The committed build status is `development` and its commit is
`null`. An unpackaged copy shows **Development build / Build unknown** (German:
**Entwicklungsstand / Build unbekannt**) without inferring a Git identity.

Commit-bound packaging stamps the full resolved `CandidateCommit` into the
archived `APP_BUILD`, preserving the explicit status and the working tree.
Packaging never changes a development build into a release. An intentional
future release must set its status in the committed source before acceptance.

Header/footer and runtime diagnostics distinguish development from release
builds. Diagnostics also show the full candidate hash and current workspace,
layout and backup format versions directly from their owning modules. Supported
older workspaces are migrated; newer schemas or other backup formats are
rejected. Product-version numbers do not define backup compatibility.

Alongside the ZIP, packaging writes a commit-named candidate JSON manifest
with its SHA-256 and a pending acceptance Markdown record. The record contains
all current localhost, workspace, period and warehouse manual checklist items,
with result and synthetic-evidence columns. It excludes historical results.
Record the extracted directory, Windows/Edge/Python versions, profile, tester
and date, then fill every result and the final decision for this exact ZIP.
Repackaging the same candidate preserves an existing record with the same
checksum; a different checksum requires a fresh output directory and acceptance.
The ZIP itself is named `OpenSlotting-v<version>-<commit>.zip`, so candidates
with the same product version coexist without invalidating earlier evidence.
Packaging builds all files in a temporary directory on the output filesystem
and checks the existing acceptance checksum before publishing anything. Each
file replacement is atomic; if a later publication fails, earlier replacements
are rolled back. Checksum conflicts preserve the original ZIP, manifest and
record unchanged, and temporary files are removed.
An existing record must contain exactly one `Archive SHA-256:` header whose
complete value matches the new ZIP checksum. Missing, duplicate or malformed
headers abort packaging; a hash mentioned in an evidence note cannot validate
the record. All existing artifacts remain unchanged on these failures.

The package contains the active application, Python service, Windows helpers
and current documentation. Existing `*-Localhost` entry points and the version-1
health marker `experimental-python` are retained for launcher compatibility;
the server is the active runtime rather than an optional experiment.

See [localhost-start.md](localhost-start.md) and [architecture.md](architecture.md).
Portable is indefinitely paused at a preserved Git commit and is excluded from
active feature/release acceptance. Interested contributors can resume it.
Current candidates need fresh automated and Edge localhost checks from
[acceptance-localhost.md](acceptance-localhost.md).
