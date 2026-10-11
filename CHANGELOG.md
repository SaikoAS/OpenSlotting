# Changelog

All notable changes to OpenSlotting are documented in this file.

## Unreleased

- Give every candidate ZIP its own commit-based filename. Stage packages and validate existing acceptance checksums before publishing; preserve the complete evidence set on checksum conflicts and roll back earlier replacements if publication fails.

- Distinguish development and release builds in EN/DE and show the candidate commit and actual data formats in runtime diagnostics. Stamp commit-bound packages without changing the working tree; generate a ZIP checksum, candidate manifest and fresh pending acceptance record for the four current checklists. Native Windows/Edge acceptance remains required.

- Refresh schema and workspace-navigation assertions, cover physical-part collisions and parametric modeling, verify analysis component colors and route stencil/picking calls, and pin historical warehouse laboratory tests to hash-checked layout-1 references. Record the project review and remaining native Edge/performance acceptance.

- Prevent horizontal overflow in the desktop navigation with compact localized labels and bounded text wrapping. Retain full localized tooltips and accessible button names, vertical scrolling in short windows and the horizontal navigation strip on narrow screens. Native Edge visual acceptance is pending.

- Fill the available browser area with a permanent rounded workspace frame while retaining the banner, navigation and compact privacy/version footer. Contain long content inside each view, fit desktop warehouse editor/analysis panels to the remaining height, constrain mapping overlays to the frame and remove the old page-covering editor maximization toggle. Preserve narrow-window navigation and reachable controls; native Edge layout acceptance is pending.

- Render overlapping aisle markings with uniform opacity: draw translucent top surfaces with stencil coverage in the shared 3D renderer and one combined fill in the editor's top view. Preserve full geometry for picking and collision checks, object outlines, other overlay colors and workspace format. Native Edge visual acceptance is pending.

- Fix distance connections through existing rack passages: missing vehicle height checks base-plane obstructions while leaving overhead clearance explicitly unverified, instead of blocking all raised beams. Add vehicle dimensions to distance previews, inherit the largest known endpoint requirements and reserves, and report concrete obstacle/height details on failed searches. Share base-elevation clearance handling with layout checks. Functional and Edge acceptance is pending.

- Add distance-connection previews between free route or wall ports while keeping endpoint assemblies stationary. Compile bounded straight/orthogonal alternatives into editable straight/corner modules and ordinary endpoint links, with obstacle/self-overlap checks and one undoable apply. Retain workspace 16 / layout 4; functional and Edge acceptance is pending.

- Add parametric corner, T-junction and cross recipes for aisles and walls with independent arm lengths, shared hub geometry and two to four stable ports. Add automatic port alignment, family/width-compatible snapping and occupied-port protection. Remove route drawing from the editor while preserving saved paths. Migrate workspace 15 / layout 3 to workspace 16 / layout 4 without inferring junctions. Functional and Edge acceptance is pending.

- Distinguish pallet-rack components in the Structure 3D view and by default in read-only 3D analysis with blue upright frames, orange beams and steel-gray decks, plus a localized component legend. Analysis provides a session-only object/usage color toggle while retaining independent location/article marker colors. Retain functional colors in Zones, Locations and floor plans; geometry, storage and selection/collision outlines are unchanged. Native Edge visual acceptance is pending.

- Keep warehouse scrolling inside lists and panels, retain scroll/focus/tool state across redraws, and prevent wheel changes to number/select controls. Add continuous adjustable zoom, keyboard and button controls and responsive viewport sizing. Navigation state remains session-only; native Edge acceptance is pending.

- Add rack drive-through previews, explicit bottom clearance and route associations, row extension, cross-row passage alignment, endpoint connections, object groups and wall-opening previews.
- Draw multi-segment routes with independent lane width and explicit required width/height plus margins. Share physical geometry between rendering and collision refinement; distinguish incomplete, blocked, too narrow and too low routes and focus the reported part in 3D.
- Migrate workspace schema 14 / layout 2 to workspace schema 15 / layout 3 with empty groups/connections, no inferred passages and unknown route requirements; retain surviving IDs, codes, source bytes and browser-local storage. New functional, Edge and performance acceptance is pending.

- Group warehouse recipes into localized categories with alphabetical sorting and retain the selected recipe across editor redraws.

- Use one shared depth per rack row in the editor and builder. Align bays and upright frames in one undoable edit, inherit row depth when adding bays, and preserve mixed historical depths until explicitly unified.

- Integrate warehouse structure/zones/locations into localhost with schema-14 migration, per-pass scope lookups and retained rack-wide code generation. Preserve optimized SAT/Float32 rendering and add integration/layout-2 performance evidence. (next release; version not assigned)

### Added

- warehouse Structure / Zones / Locations modes with per-level Picking, Reserve, or Unassigned use, explicit location creation, and edit-impact warnings
- workspace schema 14 / layout schema 2 migration preserving legacy position IDs, codes, and article-master matches
- visible date coverage with expected-weekday configuration and unknown-day warnings
- inclusive Period A / Period B comparison with summary metrics, article filters, detail links, and CSV export
- automatic ISO-calendar-week detection with selectable comparison weeks and an optional custom-period mode
- optional selling-unit / cases and quantity-per-selling-unit import fields
- exact selling-unit comparison and per-article conflict indicators without replacing authoritative total quantity
- workspace schema version 2 for persisted period settings and migration from schema version 1
- localhost runtime and browser capability diagnostics
- chunked IndexedDB workspace persistence and reduced normalized-row memory usage
- chunked CSV decoding, streaming normalization, incremental analysis, and lazy article details
- single-pass period aggregation and cached article search/sort projections
- explicit `order-lines` and `article-master` source types with legacy defaulting and workspace migration
- generic ordered source-column catalogs that preserve duplicate headers and physical positions
- bounded streaming source-column profiles with representative samples and frequent-value evidence
- explainable mapping suggestions and a responsive source-column overview
- source-scoped import fields and feature capability/readiness evidence
- independent net/gross sales-value and unit-price mappings plus customer names, unit of measure, and VAT rate
- article-master enrichment with matched, movement-only, and master-only article states
- structured article-master and cross-source quality findings with source-row evidence

### Changed

- active development now targets localhost only; Portable Mode is deliberately paused indefinitely with its complete source basis and migration/resumption instructions preserved
- removed direct-file launcher APIs and added an early startup notice before workspace access on unsupported origins
- Python standard-library serving remains the sole additional runtime dependency; all import, analysis, workspace, backup, desk, and warehouse functions remain browser-local
- added a standard stop command, browser connection restrictions, and current localhost documentation/acceptance gates
- replaced generated Blob workers with fixed local modules and a cancellable sequential session; source profiling and reanalysis now run in the background
- reused bounded source/desk table rows and terminal search projections; added an adaptive date index with unchanged exact aggregation and source references
- prepared warehouse collision geometry once per pass and wrote WebGL projection buffers directly, preserving collision order and geometry bytes
- added revalidated interface-asset caching and reproducible production benchmarks with documented limits

### Fixed

- large backup Base64 validation no longer exhausts the regular-expression stack
- unknown dates do not contribute false zero rows to period coverage
- cancelled pre-dispatch tasks, imports and language refreshes cannot publish incomplete sources or mixed-language diagnostics
- workspace opening and cancellation restore enabled mapping/file controls

### Changed (continued)

- the interface now uses a compact five-step workflow rail and clearer required/optional mapping labels
- zero selling units and partial sales are valid; invalid optional unit values are advisory-only, while unit quantities above total quantity remain visible review notes
- the core movement contract now requires only article ID / SKU, quantity, and delivery date; order identity gates only order metrics
- `order_date` is migrated to `delivery_date`; schema version 9 preserves legacy unclassified sales values without assigning net/gross semantics

## 0.2.1 - 2026-09-14

### Added

- persistent and strictly isolated local workspaces backed by IndexedDB
- automatic storage of original source bytes, mappings, normalized rows, validation results, and source provenance
- workspace creation, selection, rename, confirmed clearing, and confirmed deletion
- approximate browser storage usage and quota display with unavailable and failure fallbacks
- complete single-workspace JSON backup with exact `BigInt` and original-byte encoding
- validated restore as a new workspace or explicit confirmed replacement without a merge path
- versioned workspace and backup schemas with a baseline migration path
- English and German workspace, storage, backup, confirmation, and error states
- automated isolation, persistence, transaction-failure, quota, backup-roundtrip, restore, validation, and migration tests
- metadata-first workspace start overview with explicit open and last-used marker
- cancellable offline `blob:` worker for background workspace validation, CSV preparation, and analysis
- worker-path tests using the real decoder, parser, normalizer, and analyzer

### Changed

- CSV selection now adds sources to the active workspace instead of replacing an unpersisted session batch
- derived article analysis is rebuilt from retained source state when an analyzed workspace is reopened
- the last-used workspace is no longer loaded automatically at application startup
- workspace opening performs one analysis and one storage estimate instead of duplicate startup work
- trusted load/save paths avoid redundant full payload and `ArrayBuffer` copies while backup validation remains strict
- release packages include the workspace runtime and its data-contract and acceptance documentation

- optional Windows launch command for opening the local application in Microsoft Edge app mode
- current-user Start menu and Desktop shortcut setup without administrator rights
- safe shortcut removal that leaves unrelated shortcuts, application files, and browser-local data untouched
- automatic discovery of common per-machine and per-user Microsoft Edge installations
- optional local `OpenSlotting.ico` support with a local Edge icon fallback
- cross-platform launcher logic tests and Windows COM shortcut tests
- a post-install reminder for optional user-controlled taskbar pinning

- release packages now include the optional Windows launcher and shortcut-management files

## 0.2.0 — Unreleased development work (never published)

### Added

- Windows-1252 CSV decoding after strict UTF-8 detection
- additional high-confidence German warehouse export aliases
- selection and combined analysis of multiple CSV exports in one browser session
- independent mapping, parsing, validation, and row counts per source file
- visible per-file encoding detection with manual UTF-8, UTF-16, and Windows-1252 override
- batch-local source-file identities and duplicate-filename display labels
- source-file and source-line traceability in validation notes and article details
- warnings for overlapping date ranges, identical decoded content, and matching file metadata
- source-file counts and JSON-encoded source-file labels in the analysis export

### Changed

- article aggregation now combines all valid rows from included files without automatic cross-file deduplication

## 0.1.0 - 2026-09-09

### Added

- local semicolon-separated CSV import
- automatic and manual column mapping
- validation and normalized order-line processing with source-line traceability
- article aggregation with exact quantities and separate order-line-frequency metrics
- optional article descriptions and description-conflict detection
- searchable and sortable article overview
- article detail view with normalized source rows
- pagination for article, detail, and validation tables
- analysis CSV export with stable English headers and formula-injection protection
- English interface with optional German selection
- direct local operation through `file:///` without a backend or runtime server
