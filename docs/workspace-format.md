# OpenSlotting Local Workspace and Backup Format

This document defines the persistent local-workspace contract used by the current development implementation after the published OpenSlotting 0.2.1 release. It is a current contract document; historical release acceptance remains in the versioned acceptance files.

## Runtime and origin boundary

Workspaces are stored in IndexedDB in the current browser profile and browser origin. OpenSlotting does not use `localStorage` for workspace payloads. Normal operation remains compatible with direct `file:///` execution and requires no backend, localhost server, account, telemetry, or network connection.

Browser-local data is not an application file beside `index.html`. Moving the application, changing the browser profile, clearing browser site data, using private browsing, or changing from `file:///` to an HTTP origin may expose a different or empty storage area. A workspace backup is the supported transfer path between browser profiles or origins.

## Database contract

The IndexedDB database is named `openslotting-workspaces` and currently uses database version `2`.

It contains the metadata/settings stores plus independently persisted workspace stores:

| Store | Key | Purpose |
| --- | --- | --- |
| `workspaces` | `id` | Small workspace metadata used for listing and selection, including period settings plus cached source-byte and normalized-row counts for newly saved records. |
| `workspacePayloads` | `workspaceId` | Legacy monolithic payload retained only as a migration source for version-1 databases. New writes do not use it. |
| `workspaceManifests` | `workspaceId` | Ordered source/chunk keys for one workspace. |
| `workspaceSources` | `key` | One source's metadata, mappings, and result summary without row or issue arrays. |
| `workspaceSourceBytes` | `key` | Original bytes for one source. |
| `workspaceRowChunks` | `key` | Up to 5,000 normalized rows for one source per record. |
| `workspaceIssueChunks` | `key` | Up to 5,000 validation issues for one source per record. |
| `settings` | `key` | Browser-local application settings, including the last active workspace ID. |

Saving a workspace writes its metadata, manifest, source records, source bytes, row chunks, and issue chunks in one IndexedDB read/write transaction. A failed or quota-exceeded transaction must not leave one half updated. Metadata-only changes such as renaming, language, or period settings use the metadata store alone and do not rewrite source bytes or row chunks.

Autosaves capture the already validated live runtime into the persisted shape without walking every normalized row again. New sources, mappings, encodings, and analyses are validated at their import or edit boundaries; backup and storage restore paths retain the full validation walk before committing.

Workspace creation, update, and replacement are distinct storage operations. Each metadata record carries a monotonic `storageRevision`; records created before this field existed are treated as revision `0`. Updates, renames, replacements, and completed background activation must match the revision that the caller read and then increment it. A missing record or revision mismatch is rejected instead of upserting stale data. This prevents an older browser tab from recreating a deleted workspace or overwriting a newer rename, payload, or analysis state.

## Workspace record

Every workspace has:

| Field | Type | Contract |
| --- | --- | --- |
| `id` | string | Stable browser-local identity. |
| `schemaVersion` | integer | Stored-workspace schema version; currently `5`. |
| `name` | string | Trimmed, non-empty, at most 120 characters. Names do not have to be unique. |
| `createdAt` | ISO timestamp | Creation time. |
| `updatedAt` | ISO timestamp | Time of the latest successful snapshot. |
| `language` | `en` or `de` | Interface language restored with the workspace. |
| `analyzed` | boolean | Whether the saved source state had an analysis result. |
| `periodSettings` | object | Selection mode (`weeks` or `custom`), expected weekdays, and the names and inclusive boundaries of Period A and Period B. Detected week options remain derived from normalized rows. |
| `files` | array | Ordered and strictly workspace-local source records. |

Source IDs must be unique within one workspace. The same source ID in another workspace has no relationship to it.

## Persisted source record

Each source retains:

- batch-local source ID, original filename, display label, byte size, and modification time
- stable `sourceType`, currently `order-lines` or `article-master`; missing values from older workspaces default to `order-lines`
- ordered `columnCatalog` entries for readable sources, including physical position, original and normalized header, duplicate occurrence, and source ownership
- the complete original file bytes as an `ArrayBuffer`
- automatic or manually selected decoding mode
- detected and active encoding
- current and confirmed column mappings by source-column position
- file-level read or decoding error state
- normalized valid rows
- parser, mapping, structural, and row-validation results
- source-file and physical source-line provenance
- compact normalized rows with source-file and physical source-line provenance
- original raw field values are reconstructed on demand from the retained bytes and decoded headers, including duplicate headers

The browser `File` object, DOM nodes, object URLs, rendered tables, filters, page numbers, and other transient UI objects are not stored.

## Derived analysis

Article aggregation is derived data. When an analyzed workspace is reopened, OpenSlotting decodes the retained original bytes, recreates the parser and mapping state, validates the files, combines the current source results, and runs the existing article analysis again.

This prevents a stale stored aggregate from becoming a second source of truth. Exact normalized input, validation evidence, mappings, and source provenance remain the durable contract.

Application startup reads only the `workspaces` metadata store and marks the
last-used workspace without automatically reading its payload. After explicit
selection, IndexedDB returns the manifest and independently stored source,
byte, row, and issue chunks asynchronously. Validation, source
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
- required normalized identities and dates, plus compact source provenance
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

Current-schema restores also decode each readable source before committing the backup. Every non-null position in `mapping`, `confirmedMapping`, and a stored result mapping must reference an existing decoded header. Backup reading locks workspace editing immediately, so a concurrently selected CSV cannot be discarded by the following activation.

Delete operations use the selected metadata revision. If another browser tab saves, renames, replaces, or deletes that workspace after the catalog was rendered, deletion stops with a conflict instead of removing the newer record.

Workspace creation and restore-as-new wait for the active workspace autosave before creating a new record. Normal activation and restore activation hide Cancel before their final IndexedDB commit while retaining the loading lock through the commit. Backup export and workspace rename lock workspace editing for the complete asynchronous operation, and confirmation names are interpolated literally.

If an active workspace autosave stops on a conflict or storage failure, further saves and activation attempts remain stopped so stale data cannot overwrite a newer record. The workspace status offers an explicit discard-and-reload action; it first quiesces the complete rejected save chain under the loading lock, invalidates stale save continuations, refreshes the catalog, and reloads the current stored payload. Until that reload succeeds, the previous active view remains locked and cannot be autosaved over the persisted workspace.

Restoring a backup reads the selected file asynchronously and sends its text to the offline worker. JSON parsing, portable-payload decoding, workspace validation, source preparation, and analysis therefore remain off the main browser thread in the normal worker path. Replacement confirmation is requested only after that validation succeeds. Restored source records with a decoded buffer must declare a nonnegative integer `size` equal to that buffer's byte length. The Cancel control is shown only while a workspace load or restore worker can actually be terminated; once a validated restore is ready for its atomic create or replacement commit, cancellation is hidden while the storage operation finishes.

The restore worker returns the already validated persisted payload and prepared runtime result for the storage commit and activation; the main thread does not repeat the full source/row validation or preparation walk. If an activation target disappeared in another tab, the catalog is refreshed and the selection is moved to the active or first remaining workspace. Large backup exports read the raw IndexedDB payload and perform migration, validation, and serialization in the same offline worker, transferring source buffers instead of encoding them on the UI thread; browsers without workers use the documented local fallback. If an autosave is still queued or has failed, closing the page requests confirmation so the unsaved view is not mistaken for a committed workspace.

## Schema migration

Workspace records carry `schemaVersion`. The current reader uses version `5`. It migrates version `0` through the version `1` baseline, adds calendar-week selection mode and period settings, upgrades version `2` rows by removing redundant `raw_values` and `raw_fields` properties, adds the explicit source type to version `3` source records, and adds an empty source-column catalog to version `4` records when no catalog was persisted. Readable legacy sources rebuild their catalog from the retained header bytes during activation. IndexedDB database version `2` creates the chunk stores. Existing `workspacePayloads` records are read without mutation; activation and backup workers perform migration and validation, and activation persists the migrated chunks atomically. This keeps the logical catalog revision unchanged for an unopened legacy workspace and keeps the full traversal off the UI thread. Activation requests source/byte metadata without stored row and issue chunks because analysis is rebuilt from the durable source bytes. Version-2 period settings created before the mode field existed retain dated boundaries in custom mode; empty settings default to calendar-week selection. Versions newer than the current reader are rejected rather than guessed.

Future migrations must produce a fully valid current workspace before saving it and require automated migration and backup-round-trip tests.
