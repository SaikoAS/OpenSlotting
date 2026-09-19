# Runtime profiles

OpenSlotting is one application with one domain model, one UI, and two local
startup profiles. The profiles do not fork import, mapping, validation,
analysis, workspace, or backup behavior.

## Profiles

### Portable Mode

- entry point: `index.html` through `file:///`
- requirements: Microsoft Edge Desktop and the extracted folder
- no server, Python, administrator rights, account, installation, or internet
- complete supported business workflow

### Enhanced Local Mode

- entry point: `http://127.0.0.1:8765/index.html`
- requirements: the same extracted folder plus Python 3.8 or newer
- loopback-only server with an explicit runtime-file allowlist
- optional foundation for capabilities that require a stable HTTP origin

Enhanced Local Mode is progressive enhancement. It must not become a
prerequisite for CSV import, validation, analysis, exports, or workspace
backup and restore.

## Central runtime contract

`runtime.js` is loaded before all application controllers. It detects the
current profile once and exposes an immutable `OpenSlottingRuntime` object:

```text
mode          portable | enhanced-local | unsupported
origin        current browser storage origin
capabilities  immutable browser capability registry
supports()    safe capability query
```

Only direct local files are classified as `portable`. Only HTTP(S) loopback
hosts are classified as `enhanced-local`. Other hosted origins are reported as
`unsupported`; they are not silently treated as one of the supported profiles.

The current registry detects these capabilities without activating them:

- IndexedDB
- Web Workers
- persistent-storage requests
- Web Locks
- BroadcastChannel
- OPFS
- browser folder access
- SQLite, currently always unavailable because no SQLite runtime is bundled

Feature code should query this registry instead of adding independent protocol
checks throughout controllers. Capability availability does not authorize a
feature to change storage or analysis semantics.

## Shared service boundaries

The current runtime-neutral boundaries remain intentionally small:

| Concern | Shared boundary | Current implementation |
| --- | --- | --- |
| CSV decoding | `encoding.js` | browser `TextDecoder` |
| Import, validation, analysis | `csv.js` | shared JavaScript core |
| Workspace contract and backup | `workspace.js` | schema-versioned shared model |
| Workspace persistence | `storage.js` | IndexedDB in both profiles |
| Background preparation | workspace worker in `app.js` | offline Blob worker with fallback |
| Runtime capabilities | `runtime.js` | profile and API detection |

Future OPFS or SQLite experiments must implement the same logical workspace
contract. They must not introduce an incompatible enhanced-only backup schema.
The current exploratory comparison and its migration boundary are documented
in [`storage-backend-evaluation.md`](storage-backend-evaluation.md).

## Storage and migration

Browser storage is origin-specific. Portable and Enhanced Local modes therefore
have separate IndexedDB catalogs even in the same Edge profile. A different
localhost port also creates a different origin.

Workspace backup and restore is the supported bidirectional migration bridge.
Backups retain the common schema and strict validation regardless of which
runtime created them. No automatic cross-origin database access is attempted.

## Failure and fallback behavior

- If the enhanced launcher or Python is unavailable, Portable Mode remains
  independently usable.
- If a detected enhanced browser API is unavailable, the existing supported
  implementation remains active; detection alone never switches storage.
- IndexedDB `storageRevision` conflict protection remains authoritative until a
  separately tested concurrency adapter replaces or complements it.
- Failure of an experimental capability must not mutate a workspace or change
  analysis rules silently.

## Distribution and validation

One release package contains the shared browser runtime, the independent
Portable launcher, and the optional Enhanced Local launcher. Python is not
bundled. Both profiles use the same OpenSlotting version.

Automated coverage includes the shared application suite, deterministic runtime
detection, localhost allowlist/health behavior, and Windows launcher ownership
rules. Release acceptance still requires separate visible Microsoft Edge runs
for `file:///` and localhost. Automated checks do not replace those runs.
