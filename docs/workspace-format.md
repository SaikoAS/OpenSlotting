# OpenSlotting Local Workspace and Backup Format

This document defines the persistent local-workspace contract implemented after OpenSlotting 0.2.1. The final bundled release version is intentionally not assigned here.

## Runtime and origin boundary

Workspaces are stored in IndexedDB in the current browser profile and browser origin. OpenSlotting does not use `localStorage` for workspace payloads. Normal operation remains compatible with direct `file:///` execution and requires no backend, localhost server, account, telemetry, or network connection.

Browser-local data is not an application file beside `index.html`. Moving the application, changing the browser profile, clearing browser site data, using private browsing, or changing from `file:///` to an HTTP origin may expose a different or empty storage area. A workspace backup is the supported transfer path between browser profiles or origins.

## Database contract

The IndexedDB database is named `openslotting-workspaces` and currently uses database version `1`.

It contains three object stores:

| Store | Key | Purpose |
| --- | --- | --- |
| `workspaces` | `id` | Small workspace metadata used for listing and selection, including cached source-byte and normalized-row counts for newly saved records. |
| `workspacePayloads` | `workspaceId` | Source bytes, mappings, normalized rows, validation results, and other workspace payload. |
| `settings` | `key` | Browser-local application settings, including the last active workspace ID. |

Saving a workspace writes its metadata and payload in one IndexedDB read/write transaction. A failed or quota-exceeded transaction must not leave one half updated.

Workspace creation, update, and replacement are distinct storage operations. Each metadata record carries a monotonic `storageRevision`; records created before this field existed are treated as revision `0`. Updates, renames, replacements, and completed background activation must match the revision that the caller read and then increment it. A missing record or revision mismatch is rejected instead of upserting stale data. This prevents an older browser tab from recreating a deleted workspace or overwriting a newer rename, payload, or analysis state.

## Workspace record

Every workspace has:

| Field | Type | Contract |
| --- | --- | --- |
| `id` | string | Stable browser-local identity. |
| `schemaVersion` | integer | Stored-workspace schema version; currently `1`. |
| `name` | string | Trimmed, non-empty, at most 120 characters. Names do not have to be unique. |
| `createdAt` | ISO timestamp | Creation time. |
| `updatedAt` | ISO timestamp | Time of the latest successful snapshot. |
| `language` | `en` or `de` | Interface language restored with the workspace. |
| `analyzed` | boolean | Whether the saved source state had an analysis result. |
| `files` | array | Ordered and strictly workspace-local source records. |

Source IDs must be unique within one workspace. The same source ID in another workspace has no relationship to it.

## Persisted source record

Each source retains:

- batch-local source ID, original filename, display label, byte size, and modification time
- the complete original file bytes as an `ArrayBuffer`
- automatic or manually selected decoding mode
- detected and active encoding
- current and confirmed column mappings by source-column position
- file-level read or decoding error state
- normalized valid rows
- parser, mapping, structural, and row-validation results
- source-file and physical source-line provenance
- raw field values and positional raw fields, including duplicate headers

The browser `File` object, DOM nodes, object URLs, rendered tables, filters, page numbers, and other transient UI objects are not stored.

## Derived analysis

Article aggregation is derived data. When an analyzed workspace is reopened, OpenSlotting decodes the retained original bytes, recreates the parser and mapping state, validates the files, combines the current source results, and runs the existing article analysis again.

This prevents a stale stored aggregate from becoming a second source of truth. Exact normalized input, validation evidence, mappings, and source provenance remain the durable contract.

Application startup reads only the `workspaces` metadata store and marks the
last-used workspace without automatically reading its payload. After explicit
selection, IndexedDB returns the payload asynchronously. Validation, source
decoding, CSV parsing, normalization, and article aggregation run in a dedicated
worker created from a local `blob:` URL. The worker source is assembled from the
already loaded local module factories, so direct `file:///` execution does not
need a server or fetch another resource. Source `ArrayBuffer` objects are
transferred into and back from the worker rather than copied. If workers are
unavailable, the same validated preparation path remains as a visible
main-thread fallback.

The opening path performs one analysis and one storage estimate. Trusted
in-memory snapshots can retain already validated payload references until the
IndexedDB structured-clone write, avoiding an additional full JavaScript copy.
The loaded copy of the previous normalized import result is released before the
original source bytes are transferred to the worker, because that result is
rebuilt from those bytes; its durable IndexedDB record is not changed by this
runtime optimization.
Backup input continues to use the strict copying and validation path.

## Exact number representation

Normalized quantities remain scaled `BigInt` values with the existing scale of `10^7` while stored in IndexedDB. Sales rows retain `sales_value_exact` as the existing exact decimal string.

JSON cannot directly represent `BigInt` or `ArrayBuffer`. The portable backup therefore uses explicit tagged values:

```json
{
  "$openslottingType": "bigint",
  "value": "12500000"
}
```

```json
{
  "$openslottingType": "array-buffer",
  "base64": "b3JkZXJfaWQ7Li4u"
}
```

The decimal integer string is validated before conversion back to `BigInt`. Base64 content is validated before conversion back to an `ArrayBuffer`.

## Backup envelope

One backup file contains exactly one complete workspace:

```json
{
  "format": "openslotting-workspace",
  "formatVersion": 1,
  "exportedAt": "2026-09-12T10:30:00.000Z",
  "workspace": {}
}
```

The downloaded filename uses the form `OpenSlotting-<workspace-name>.workspace.json` with unsafe filename characters replaced.

The backup contains no second workspace, browser database, account, or cloud reference. Original operational bytes remain inside the user-controlled local backup file and must never be committed to the public repository or attached to an issue or pull request.

## Restore validation

The complete backup is parsed, decoded, migrated, and validated before IndexedDB is changed. Validation includes:

- backup format and backup-format version
- workspace schema version
- workspace identity, name, and timestamps
- unique source IDs matching the generated selector-safe `source-<alphanumeric-or-hyphen>` grammar
- original source-byte representation
- decoding mode (`auto`, UTF-8, UTF-16 LE/BE, or Windows-1252) and supported detected/active encodings
- mapping positions
- stored row counts
- source ownership of normalized rows and validation issues
- positive exact scaled quantities
- required normalized identities, dates, raw values, and raw fields
- rejection of unsafe object property names

An invalid, truncated, unsupported, or unsafe backup changes no stored workspace.

## Restore modes

### Restore as new

A new workspace ID is generated. Existing workspaces are not modified. Source IDs remain scoped to the newly generated workspace.

### Replace from backup

The currently selected workspace is the explicit replacement target. The user must confirm the named target after the backup has passed validation. The backup receives that target workspace ID and replaces its metadata and payload atomically when the selected storage revision is still current. Other workspaces are not changed. If the replaced workspace was open, its old in-memory view is cleared immediately after the replacement commit and before reopening; an activation failure therefore cannot autosave stale pre-replacement files over the restored backup.

There is no merge restore mode.

## Storage status

When available, `navigator.storage.estimate()` supplies approximate origin usage and quota values. Displayed remaining capacity is `max(0, quota - usage)` and is labelled as an approximate browser quota, not guaranteed free disk space.

If the API or usable values are unavailable, the UI shows a non-error fallback without inventing usage or quota values. If the estimate call fails, the failure is shown separately from workspace database availability.

## Failure behavior

OpenSlotting exposes distinct user-visible states for:

- IndexedDB unavailable
- database upgrade blocked by another window
- transaction aborted
- quota exceeded
- general storage failure
- a workspace changed or was deleted in another browser tab
- invalid backup JSON or format
- unsupported backup or workspace version
- invalid or incomplete backup payload

A storage failure must remain visible. It must not be reported as a successful save and must not silently discard or partially replace workspace data. Opening another workspace waits for the current autosave and stops on failure, retaining the unsaved active view for recovery.

## Schema migration

Workspace records carry `schemaVersion`. The current reader accepts version `1` and contains a baseline migration from the pre-release schema `0`, adding explicit language and analyzed-state defaults without changing source records. Versions newer than the current reader are rejected rather than guessed.

Future migrations must produce a fully valid current workspace before saving it and require automated migration and backup-round-trip tests.
