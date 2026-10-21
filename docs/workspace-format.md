# OpenSlotting Local Workspace and Backup Format

This document defines the persistent local-workspace contract used by the current development implementation after the published OpenSlotting 0.2.1 release. It is a current contract document; historical release acceptance remains in the versioned acceptance files.

## Runtime and origin boundary

Workspaces are stored in IndexedDB in the current browser profile and browser origin. OpenSlotting does not use `localStorage` for workspace payloads. Active operation uses the fixed localhost origin through the Python standard-library server, with no upload, remote backend, account, telemetry, or external network connection. The database name, schema, and backup contract are unchanged by the runtime separation. Existing Portable workspaces can be transferred with backups exported from the previous application; see [portable-mode-paused.md](portable-mode-paused.md).

Browser-local data is not an application file beside `index.html`. Moving the application, changing the browser profile, clearing browser site data, using private browsing, or changing from `file:///` to an HTTP origin may expose a different or empty storage area. A workspace backup is the supported transfer path between browser profiles or origins.

## Database contract

The IndexedDB database is named `openslotting-workspaces` and currently uses database version `3`.

It contains the metadata/settings stores plus independently persisted workspace stores:

| Store | Key | Purpose |
| --- | --- | --- |
| `workspaces` | `id` | Small workspace metadata used for listing and selection, including period settings plus cached source-byte and normalized-row counts for newly saved records. |
| `workspacePayloads` | `workspaceId` | Legacy monolithic payload retained only as a migration source for version-1 databases. New writes do not use it. |
| `workspaceManifests` | `workspaceId` | Ordered source/chunk keys plus keys for the normalized article-registry chunks for one workspace. |
| `workspaceSources` | `key` | One source's metadata, mappings, and result summary without row or issue arrays. |
| `workspaceSourceBytes` | `key` | Original bytes for one source. |
| `workspaceRowChunks` | `key` | Up to 5,000 normalized rows for one source per record. |
| `workspaceIssueChunks` | `key` | Up to 5,000 validation issues for one source per record. |
| `workspaceRegistryChunks` | `key` | Up to 5,000 normalized article-registry entries per record. |
| `settings` | `key` | Browser-local application settings, including the last active workspace ID. |

Saving a workspace writes its metadata, manifest, source records, source bytes, row chunks, issue chunks, and article-registry chunks in one IndexedDB read/write transaction. A failed or quota-exceeded transaction must not leave one half updated. Metadata-only changes such as renaming, language, or period settings use the metadata store alone and do not rewrite source bytes, row chunks, or article-registry chunks.

Autosaves capture the already validated live runtime into the persisted shape without walking every normalized row again. New sources, mappings, encodings, and analyses are validated at their import or edit boundaries; backup and storage restore paths retain the full validation walk before committing.

Workspace creation, update, and replacement are distinct storage operations. Each metadata record carries a monotonic `storageRevision`; records created before this field existed are treated as revision `0`. Updates, renames, replacements, and completed background activation must match the revision that the caller read and then increment it. A missing record or revision mismatch is rejected instead of upserting stale data. This prevents an older browser tab from recreating a deleted workspace or overwriting a newer rename, payload, or analysis state.

## Workspace record

Every workspace has:

| Field | Type | Contract |
| --- | --- | --- |
| `id` | string | Stable browser-local identity. |
| `schemaVersion` | integer | Stored-workspace schema version; currently `21`. |
| `name` | string | Trimmed, non-empty, at most 120 characters. Names do not have to be unique. |
| `createdAt` | ISO timestamp | Creation time. |
| `updatedAt` | ISO timestamp | Time of the latest successful snapshot. |
| `language` | `en` or `de` | Interface language restored with the workspace. |
| `analyzed` | boolean | Whether the saved source state had an analysis result. |
| `periodSettings` | object | Selection mode (`weeks` or `custom`), expected weekdays, and the names and inclusive boundaries of Period A and Period B. Detected week options remain derived from normalized rows. |
| `coverageNotes` | array | Up to 4,096 unique date/reason records: real `YYYY-MM-DD` `date` (years 0001–9999), trimmed non-empty `reason` of at most 500 characters, and ISO `updatedAt`. Manual explanations only; they never create source rows or change period statistics. |
| `tablePreferences` | object | Workspace-local order-line column layout: `columnOrder` and optional `visibleColumns` use stable field keys. Required identity/quantity/source columns stay visible. |
| `walkPreferences` | object | Workspace-local presentation setting: integer vertical `fov` from 45 to 100 degrees, default 60. Finite values are clamped and rounded; missing or invalid values default to 60. Position and viewing direction are not saved. Included in backups. |
| `customFields` | array | Workspace-level custom-field definitions with stable IDs, supported types (`text`, `number`, or `date`), and active/inactive lifecycle state. |
| `importProfiles` | array | Up to 50 named profiles containing source type, decoded header layout, field/custom-field mappings, ordered preparation rules, and selected named source-column filters. Profiles belong only to this workspace and are included in its backup. |
| `warehouseLayout` | object | Layout schema 6 with physical `objects`, per-level functional `zones`, explicit logical `locations` with rectangular local placements, object `groups`, and endpoint `connections`. Stable references and codes are stored in metadata and backups; generated 3D meshes are derived. |
| `articleRegistry` | array | Deterministic workspace-level article identities with master fields, custom values, master/movement status, and source provenance. |
| `files` | array | Ordered and strictly workspace-local source records. |

Source IDs must be unique within one workspace. The same source ID in another workspace has no relationship to it.

## Persisted source record

Each source retains:

- batch-local source ID, original filename, display label, byte size, and modification time
- stable `sourceType`, currently `order-lines` or `article-master`; missing values from older workspaces default to `order-lines`
- ordered `columnCatalog` entries for readable sources, including physical position, original and normalized header, duplicate occurrence, source ownership, and bounded streaming profile evidence
- the complete original file bytes as an `ArrayBuffer`
- automatic or manually selected decoding mode
- detected and active encoding
- current and confirmed column mappings by source-column position
- current and confirmed custom-field mappings by source-column position; mappings reference the workspace `customFields` registry
- ordered preparation-rule lists scoped to mapped target fields, stored separately for each source file
- up to 100 named source-column filters with their physical position, function, explanation, enabled state, and import-profile selection
- file-level read or decoding error state
- normalized valid rows
- parser, mapping, structural, and row-validation results
- source-file and physical source-line provenance
- compact normalized rows with source-file and physical source-line provenance
- last applied import-profile name, identity, timestamps and configuration evidence (`appliedImportProfile`, or `null` when unrecorded)
- original raw field values are reconstructed on demand from the retained bytes and decoded headers, including duplicate headers
- normalized rows mark target fields changed by preparation rules; original values remain reconstructable from retained bytes

The browser `File` object, DOM nodes, object URLs, rendered tables, filters, page numbers, and other transient UI objects are not stored.

Source-column editor/profile-application view state, selected import IDs and
batch previews are also transient. Applying a profile to multiple compatible
sources changes their existing mapping/rule fields in one workspace save;
unmatched sources retain their configuration. The application exposes staged
changes after the save commits, invalidates derived analysis and requires
explicit validation afterward. Source bytes remain unchanged.

Schema 17 adds `appliedImportProfile` to each source (`null` when no application
was recorded). A successful application records `profileId`, the historical
`profileName`, `profileUpdatedAt`, `appliedAt` and a normalized `configuration`
snapshot (source type, field/custom-field mappings, preparation and source rules).
The snapshot contains settings only, with no source rows or bytes. It is retained
in source metadata, worker activation/reanalysis and backups independently of the
current profile registry. Renaming, updating or deleting a saved profile does not
rewrite this evidence. Saving a profile alone does not mark a source as applied.
The UI compares current settings with the snapshot to flag subsequent edits;
equivalent mapping key order, unassigned targets and empty rule lists are ignored.
This records the latest application, not a complete change history. Legacy
sources migrate without inferring a profile from their name or current settings.
IndexedDB version 3, backup format 1 and warehouse layout 4 remain unchanged.
A schema-16 or earlier reader cannot restore a schema-17 backup; keep a backup
from the previous application if returning to it is required.

## Coverage calendar notes

Schema 18 stores `coverageNotes` with workspace metadata, independently of CSV
sources and period settings. Editing or removing a reason uses a revision-checked
metadata-only transaction and retains the source/row/issue/registry chunks.
Activation, capture and backup/restore preserve these records. Workspaces from
schema 17 or earlier migrate with an empty list; neither holidays nor reasons are
inferred. Calendar month, selected date and unsaved drafts remain session-only.
Readers supporting schema 17 or earlier cannot read schema-18 backups. Keep a
pre-update backup when returning to an older application is required.

## Article registry and derived analysis

The workspace article registry is normalized from all retained source rows and
stored independently of period and order-line aggregation. It keeps
master-only, movement-only, and matched article identities under one stable
`article_id`, stores master attributes once, and retains source-line
provenance for each master value. Conflicts are preserved for later data
quality checks; no master attribute is copied into normalized order-line rows.
When an analyzed workspace is reopened, the registry is rebuilt from the
durable source bytes and saved together with the current validated workspace.
Registry entries are persisted in bounded chunks; their potentially large
`master_row_refs`, `value_provenance`, `value_conflicts`, and description-variant
arrays are split into fragments of at most 64 values and reassembled on load;
each registry record is capped at roughly 1,000 array values.

Article aggregation is derived data. When an analyzed workspace is reopened, OpenSlotting decodes the retained original bytes, recreates the parser and mapping state, validates the files, combines the current source results, and runs the existing article analysis again.

This prevents a stale stored aggregate from becoming a second source of truth. Exact normalized input, validation evidence, mappings, and source provenance remain the durable contract.

Application startup reads only the `workspaces` metadata store and marks the
last-used workspace without automatically reading its payload. After explicit
selection, IndexedDB returns the manifest and independently stored source,
byte, row, and issue chunks asynchronously. Validation, source
decoding, CSV parsing, normalization, and article aggregation run in a dedicated
worker loaded from the bundled `src/workers/workspace-worker.mjs` entrypoint.
It imports the same local core modules used by the main-thread fallback. A
sequential session reuses that worker; task IDs and workspace revisions reject
late responses, cancellation/error terminates it, and 30 seconds idle disposes
it. Only allowlisted interface files are requested. Source `ArrayBuffer` objects are
transferred into and back from the worker rather than copied. If workers are
unavailable, the same validated preparation path remains as a visible
main-thread fallback.

New-file profiling and reanalysis also use this worker. They transfer copies of
the current buffers so cancellation retains the active view's original bytes.
Completed calculations replace the runtime view only for the current workspace,
revision and language. No full or metadata autosave captures a source while its
file read/profile is incomplete. A cancelled/failed language calculation rolls
back the language and leaves the earlier diagnostics consistent. Cancellation
ends before the existing atomic IndexedDB write starts.

The opening path performs one analysis and one storage estimate. Trusted
in-memory snapshots can retain already validated payload references until the
IndexedDB structured-clone write, avoiding an additional full JavaScript copy.
The loaded copy of the previous normalized import result is released before the
original source bytes are transferred to the worker, because that result is
rebuilt from those bytes; its durable IndexedDB record is not changed by this
runtime optimization.
Backup input continues to use the strict copying and validation path.
Base64 validation uses bounded character checks instead of an unbounded grouped
regular expression; padding and tagged-value validation remain strict and the
JSON format is unchanged. This fixes stack exhaustion on large source buffers.

## Exact number representation

Normalized quantities remain scaled `BigInt` values with the existing scale of `10^7` while stored in IndexedDB. Explicit net/gross sales values and unit prices retain their matching `*_exact` decimal strings. The legacy unclassified `sales_value` and `sales_value_exact` fields remain preserved rather than being guessed as net or gross.

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

Current-schema restores also decode each readable source before committing the backup. Every non-null position in `mapping`, `confirmedMapping`, `customFieldMapping`, and `confirmedCustomFieldMapping`, plus a stored result mapping, must reference an existing decoded header and a known workspace custom-field ID where applicable. Backup reading locks workspace editing immediately, so a concurrently selected CSV cannot be discarded by the following activation.

Delete operations use the selected metadata revision. If another browser tab saves, renames, replaces, or deletes that workspace after the catalog was rendered, deletion stops with a conflict instead of removing the newer record.

Workspace creation and restore-as-new wait for the active workspace autosave before creating a new record. Normal activation and restore activation hide Cancel before their final IndexedDB commit while retaining the loading lock through the commit. Backup export and workspace rename lock workspace editing for the complete asynchronous operation, and confirmation names are interpolated literally.

If an active workspace autosave stops on a conflict or storage failure, further saves and activation attempts remain stopped so stale data cannot overwrite a newer record. The workspace status offers an explicit discard-and-reload action; it first quiesces the complete rejected save chain under the loading lock, invalidates stale save continuations, refreshes the catalog, and reloads the current stored payload. Until that reload succeeds, the previous active view remains locked and cannot be autosaved over the persisted workspace.

Restoring a backup reads the selected file asynchronously and sends its text to the offline worker. JSON parsing, portable-payload decoding, workspace validation, source preparation, and analysis therefore remain off the main browser thread in the normal worker path. Replacement confirmation is requested only after that validation succeeds. Restored source records with a decoded buffer must declare a nonnegative integer `size` equal to that buffer's byte length. The Cancel control is shown only while a workspace load or restore worker can actually be terminated; once a validated restore is ready for its atomic create or replacement commit, cancellation is hidden while the storage operation finishes.

The restore worker returns the already validated persisted payload and prepared runtime result for the storage commit and activation; the main thread does not repeat the full source/row validation or preparation walk. If an activation target disappeared in another tab, the catalog is refreshed and the selection is moved to the active or first remaining workspace. Large backup exports read the raw IndexedDB payload and perform migration, validation, and serialization in the same offline worker, transferring source buffers instead of encoding them on the UI thread; browsers without workers use the documented local fallback. If an autosave is still queued or has failed, closing the page requests confirmation so the unsaved view is not mistaken for a committed workspace.

## Schema migration

Workspace records carry `schemaVersion`. The current reader uses version `21`. It migrates version `0` through the version `1` baseline, adds calendar-week selection mode and period settings, upgrades version `2` rows by removing redundant `raw_values` and `raw_fields` properties, adds the explicit source type to version `3` source records, adds an empty source-column catalog to version `4` records when no catalog was persisted, accepts version `5` catalogs without column profiles by supplying an empty profile, adds the workspace custom-field registry and source mappings in version `7`, and adds an empty article registry when migrating version `7` records to version `8`. Version `8` mappings, normalized rows, issue fields, issue date evidence, and registry provenance are migrated from `order_date` to `delivery_date` for version `9`. Version `9` sources gain empty preparation-rule lists for version `10`; version `10` workspaces gain an empty `importProfiles` list for version `11`. Version `11` workspaces gain an empty `warehouseLayout` for version `12`; version `12` sources gain empty `sourceRules` lists for version `13`. Version `13` workspaces migrate warehouse layout schema `1` to `2`: physical levels lose nested positions, per-level functional zones are Unassigned, and explicit locations retain the old position IDs and codes (marked `legacy` for code editing before classification). No use is inferred, and article-master matching is preserved. Version `14` workspaces migrate layout `2` to `3`, retaining physical IDs, zones, locations and codes, and supplying empty groups/connections, no rack passages, closed modeled doors and unknown route requirements. Version `15` workspaces migrate layout `3` to `4`, preserving all existing geometry, paths, groups, connections, IDs and codes without inferring junction recipes. Version `16` sources gain a null last-profile application record for version `17`; existing applications are not inferred. Version `17` workspaces gain an empty `coverageNotes` list for version `18`, without inferred holidays or reasons. Version `18` workspaces migrate layout `4` equal subdivisions to explicit rectangular placements for version `19` / layout `5`, preserving IDs, codes and all source/calendar metadata. Version `19` workspaces migrate layout `5` to `6`, adding enabled ground scopes except in designated passages, without changing elevated locations or their identity. Version `20` workspaces gain empty `tablePreferences.columnOrder` and `tablePreferences.visibleColumns` arrays and `walkPreferences.fov` set to 60 for version `21`, retaining the existing default columns and all source evidence. Existing imports therefore keep their prior behavior. Legacy `sales_value` mappings and values remain unchanged and unclassified. Readable legacy sources rebuild their catalog from the retained header bytes during activation. IndexedDB database version `3` creates the chunk stores, including article-registry chunks. Existing `workspacePayloads` records are read without mutation; activation and backup workers perform migration and validation, and activation persists the migrated chunks atomically. This keeps the logical catalog revision unchanged for an unopened legacy workspace and keeps the full traversal off the UI thread. Activation requests source/byte metadata without stored row and issue chunks because analysis and the registry are rebuilt from the durable source bytes. Version-2 period settings created before the mode field existed retain dated boundaries in custom mode; empty settings default to calendar-week selection. Versions newer than the current reader are rejected rather than guessed.

Future migrations must produce a fully valid current workspace before saving it and require automated migration and backup-round-trip tests.

## Warehouse layout schema 6

`warehouseLayout` contains `version: 6` and five collections:

| Collection | Stored fields and meaning |
| --- | --- |
| `objects` | Physical racks and areas. Rack bays retain `ground: { id, enabled }` in addition to stable upright/level IDs and measurements. A level has no nested positions. |
| `zones` | `{ id, objectId, bayId, levelId, usage }` assigns functional use to one rack level. References must agree with the physical hierarchy; one zone per level. Missing scopes receive a new Unassigned zone during normalization, with no implicit locations. |
| `locations` | `{ id, zoneId, positionIndex, code, legacy, placement }` describes a rectangular area within one level. Zero to ten locations have consecutive, unique indices 0–9. Codes are trimmed, case-sensitive, at most 80 characters, and unique workspace-wide when nonempty. |
| `groups` | `{ id, name, objectIds }` stores 2–150 distinct existing members. At most 75 groups; an object belongs to at most one group. Groups move and rotate together. |
| `connections` | `{ id, aId, bId, aAnchor, bAnchor }` stores up to 149 endpoint links between distinct existing objects. Straight/path anchors are 0 (start) and 1 (end); junctions have 2–4 numbered ports. Anchors must exist and coincide within 2 mm. Junction links also require matching families/widths and opposing port directions; each junction port accepts one link. Connection cycles are rejected. |

Ground scopes reference `bay.ground.id` as `levelId`. They use derived
`levelIndex: -1` and height 0; physical `bay.levels[]` and elevated numbering are
unchanged. Ground is enabled by default and creates an empty Unassigned scope,
not implicit locations. Disabled ground has no zone/locations. Disabling removes
its configured locations through the normal confirmed editor mutation. The
physical ground ID remains stable; re-enabling creates a new empty zone.
Designated passages require ground to be disabled. New bays receive new enabled
ground IDs; structure duplication regenerates floor IDs without copying locations.
The floor has no structural beam/deck. Ground settings are metadata included in
workspace capture, activation and backups. Database 3 and backup format 1 remain.
Readers limited to workspace 19 cannot open workspace-20 backups.

`usage` supports `unassigned`, `picking`, and `reserve`. Future usage identifiers may use lowercase letters, digits, and hyphens (starting with a letter, at most 40 characters). Physical floor-area types remain separate. Zone, location, group and connection IDs share the layout-wide uniqueness contract with physical part IDs. Orphaned references are validation errors. The 150-object and 5,000-location limits are independent; uncoded physical geometry does not consume location capacity.

`placement: { x, z, width, depth }` uses integer millimeters relative to the bay's
left/front usable corner on the referenced level. Offsets are nonnegative;
dimensions are positive and at most 50,000 mm. The rectangle must fit inside
`bay.width` / `bay.depth`. Same-zone intersections with positive area are rejected;
touching edges and overlap on different levels are allowed. Object translation
and rotation transform the areas with the rack without rewriting local values.
Shrinking a bay below existing areas is rejected until those areas are adjusted.
Position order is stable and does not imply spatial ordering.

Current creation/edit commands constrain placements to one row along the rack
front (`z: 0`, `depth: bay.depth`); width and left offset remain editable.
Automatic adding/duplication never searches behind existing locations. Geometry
reconciliation retains full-depth alignment when the rack depth changes;
historical partial-depth prototype areas are not silently expanded. The
reader still accepts earlier prototype rectangles unchanged. The front editor
requires explicit side-by-side division for those scopes, preserving IDs/codes
and requesting the existing impact confirmation instead of silently moving them.

Workspace 18 / layout 4 migrates to workspace 19 / layout 5 by materializing each
old equal full-depth subdivision: left edge `floor(index * bay.width / count)`,
right edge `floor((index + 1) * bay.width / count)`. IDs, codes and all other
layout metadata remain intact. Missing placements are normalized using this
same rule. Coverage reasons and profile-application evidence remain intact.
Database version 3 and backup format 1 are unchanged. Readers supporting
workspace 18 or earlier cannot restore workspace-19 backups; retain a backup
from the previous application if returning to it is required.

Each rack bay has `passage: null` or `{ routeId: null | existing-aisle-id }`.
The designation does not suppress physical collision checks. Its clearance is
the first level's `clearHeight`; width is `bay.width`. The optional route link
is descriptive and does not cause automatic movement. Route deletion clears
its passage associations. Duplicating a rack clears route associations and
creates fresh physical IDs; extending a row preserves existing part IDs.

Each aisle has `route: { requiredWidth, requiredHeight, widthMargin,
heightMargin, path }`. Required dimensions are `null` when unknown, or integer
millimeters (width 100–50,000; height 100–15,000). Margins are 0–5,000 mm;
width margin applies on each side. `path` is null for a rectangular aisle, or
2–100 local `{ x, z }` points in ±500,000 mm, relative to the object's origin
and transformed by its rotation. Segment length is 100–50,000 mm. For a path,
`depth` is lane width; `width` remains a stored compatibility field and is not
its bounding extent. The extent is derived from segment and junction geometry.
`height` represents the visible floor marking, not vehicle clearance.

Wall and aisle objects may additionally have `junction: { shape, arms }`,
where `shape` is `corner`, `tee` or `cross`. `arms` contains exactly the shape's
directions: `{ west, south }`, `{ west, east, south }`, or
`{ west, east, south, north }`. Each arm is an integer length of 100–24,000 mm,
measured from the edge of the square hub. `x`/`z` locate the hub center;
`depth` is the common wall thickness or lane width and defines the hub side.
`width` is normalized to the local bounding width, up to 98,000 mm at the
maximum supported hub and arms, rather than serving as an editable dimension.
Rotation applies to the complete hub/arms and their ports. Port indexes follow
the direction order above and remain stable when lengths change. Junctions
cannot also carry a non-null `route.path`.

Hub and arms are disjoint rectangles sharing boundaries, derived from the
parameters. They supply actual rendering, picking and collision geometry;
bounding extents are broad-phase/framing data only. The same object ID covers
all these physical parts. There are no persisted meshes or hidden member objects.
New explicit connections require free ports; magnetic placement is transient.
Routes require equal lane widths. Wall junctions require equal connector
thickness and base elevation. Legacy straight-wall connections retain their
existing layout semantics; the new editor restricts new links to compatible
families. Drawn paths are a retained read/move/resize format, not a new editor
creation workflow. Schema-3 layouts migrate by updating the layout version,
without synthesizing junctions, changing IDs or replacing paths.

Distance connections compile to ordinary wall/aisle objects and corner
`junction` objects, plus `connections` at both endpoints and between pieces.
There is no stored freehand path, bridge wrapper, solver state or new schema
field. Source/target geometry and IDs remain unchanged at creation; generated
parts get fresh IDs. The selected search course and detour reserve are transient
editor inputs. Explicit vehicle dimensions supplied in that preview are stored
in the new aisle pieces' existing `route.requiredWidth` / `route.requiredHeight`
fields, taking the maximum of the input and any known endpoint value. Margins
take the larger endpoint value; endpoint requirements are not rewritten.
Unknown dimensions remain `null`. Without height the geometry check only
rejects parts intersecting the route base plane; overhead clearance stays
unverified. Neither the search nor migration derives vehicle dimensions from
rack passage heights. Later edits follow the existing connected-assembly rules rather
than rerunning the compiler. These fields were introduced in workspace 16 /
layout 4 and remain intact in workspace 20 / layout 6; backup format stays 1.

Non-rack objects optionally store integer `elevation` (0–20,000 mm), used for
wall lintels and other raised bodies. Doors store `open` (default false); only
closed doors render a leaf and include it as an obstacle. Wall-opening edits
produce side segments, an opening and an optional raised lintel, retaining the
original wall ID on the first piece and remapping outer endpoint links.

Groups, endpoints and paths are source geometry; boxes, meshes, broad-phase
footprints and collision-part caches are derived per invocation. The shared
physical parts describe posts, beams, decks, frames, leaves and solid bodies.
Location markers are not obstacles. New layouts need explicit vehicle dimensions
before a route can be fully checked. Migration never guesses those dimensions
or declares a legacy overlap to be a permitted passage.

Location creation/resizing requires a classified zone. Returning a zone to Unassigned retains its existing locations for later classification. `legacy: true` marks migrated positions and permits editing their existing codes while Unassigned; it does not permit adding subdivisions before classification. Geometry/zone edits preserve surviving references. The editor computes and confirms impacts before saving a destructive candidate. Locks cover physical objects and their referenced zones/locations; undo/redo preserves current locks.

The current editor offers one common depth per connected rack object. It writes
that value to every existing `bay.depth` and `upright.depth`; newly added parts
inherit a uniform row's depth. No redundant persisted rack-depth field or schema
change is needed for common depth itself. Existing layouts with differing depths are preserved by
normalization and restore. They become uniform only when the user explicitly
sets a common depth in the editor; IDs, codes, zone uses and location counts
remain unchanged.

Layout metadata saves retain source-byte, normalized-row, issue, and registry chunks. The IndexedDB database version remains 3, and backup format version remains 1; the workspace schema identifies the required migration. The read-only 3D analysis derives geometry and exact current article-master matches without persisting view changes.

A reader supporting workspace schema 15 or earlier cannot restore a schema-16 backup.
Retain a backup made before updating when a return to the older application is
required. Automated schema-16 migration and backup regressions are covered by the current
workspace, worker and parametric warehouse tests. Native Edge acceptance of this
candidate remains pending; earlier schema-14/15 evidence does not verify it.
