# Changelog

All notable changes to OpenSlotting are documented in this file.

Product-release versions below are independent of [roadmap milestone IDs and
data-format versions](docs/versioning.md). Dated entries describe release scope
(a prepared candidate is not published until its GitHub Release exists);
`Unreleased` records current development. The explicitly unpublished `0.2.0`
entry remains historical development work, not an additional published release.

## Unreleased

- Fit the analysis desk order-line viewport to the remaining workspace height and reduce the chart height when needed. Preserve independent table/watchlist scrolling, refill virtual rows on resize and remeasure wrapped controls. Keep a compact table and accessible page-scroll fallback when the controls cannot fit in very small or highly zoomed windows.

- Always show the analysis desk period summary, defaulting to the entire displayed period and following date selections. Remove duplicate KPI cards, preserve scope-specific customer/article counts and compact the summary to make more room for order lines.

- Fill the analysis desk's available height with its watchlist instead of capping it at 750px. Keep the list scrollable, refresh its virtual window on resize/zoom/scroll and retain the compact stacked layout on narrow screens.

- Replace monolithic JSON backup exports with blockwise `.osworkspace` archives containing original binary sources, settings, normalized results and fragmented provenance. Use optional native gzip block compression and verify SHA-256 checksums, ordered inventory and source/row counts; stage restores invisibly before an atomic create/replace. Keep legacy JSON backups readable, support cancellable progress and native file streaming with a browser-download fallback. IndexedDB version 4 adds only a temporary backup staging store; workspace schema 21 and layout 6 are unchanged.

- Place downward-dragged columns before the requested target without changing keyboard move behavior; ignore unchanged drops and retain hidden-column preferences.

- Keep coverage evidence navigation inside the active page so the header and navigation rail stay fixed.
- Show article-master custom-field fallbacks in order-line cells, sorting and CSV export, preserving order-line values and source provenance.
- Add draggable and keyboard-accessible column ordering, visibility and reset, saved per workspace in schema 21 with backup/restore support.
- Add a native fullscreen warehouse walk with reduced controls, mouse-look entry, pause/resume, crosshair selection and owned fullscreen/pointer cleanup.
- Add a workspace-local vertical FOV slider (45–100 degrees, default/reset 60) with live preview, consistent location selection, fullscreen controls and backup support.
- Add walking/free-flight movement modes, precise 0.1–20 m/s speed controls with km/h display, jump/gravity/physical landing and clearance-aware crouching. Keep movement settings and poses transient, with mode-specific controls and fullscreen height feedback.
- Add E-based location interaction with a bounded, occlusion-aware aim prompt and an in-fullscreen article dialog: mouse controls, per-article metrics/master data/comparison, focus containment and explicit return to movement without changing the pose.
- Show the E interaction prompt only for a reachable location; name its exact code or rack/bay/level/position and clear it when the target is lost or movement is paused.


- Preserve the selected location while rendering destructive previews; reconcile removed selections only after a successful save. Cancelling a passage preview or rejecting/failing its save retains the original ground location breadcrumb, highlight and focus.

- Fall back to level navigation when the selected location no longer exists, including after disabling its ground scope. Keep breadcrumb, highlight and focus consistent while preserving selections on cancelled/failed edits and unrelated ground toggles.

- Keep area-editor keyboard/pointer choices and add/duplicate/draw actions in sync with the exact location breadcrumb, 3D highlight and focus target. Return to level navigation after removal and restore the prior selection kind when saving fails.

- Add explicit top-view tools for moving the view or moving objects. Default to panning over any surface, retain click selection and focus, restrict geometry dragging to Structure, preserve snapping/locks/undo, and cancel uncommitted drags when tools change. Keep the choice transient and reset it on workspace changes.

- Add a read-only warehouse walk menu with true perspective, focus-scoped WASD movement, optional mouse look, physical-part clearance, an interactive minimap and exact location search. Reuse shared rack geometry, location assignments and analyzed article metrics; add assignment/usage/demand outlines, optional existing A/B comparison details and article/coverage links. Keep navigation local and transient, preserve editor geometry and add no runtime dependency or schema change.

- Add direct rack/bay/level/location navigation with a sticky selection path, contextual property shortcuts and internal field reveal. Preserve ground and exact location selection across modes; focus the clicked area on double-click and outline selected physical scopes without changing material colors. Clarify edit scope, retain lock/save boundaries and keep navigation out of persistence/history.

- Keep physical decks visible beneath inset location outlines and zoom-aware front position numbers. Preserve blue/orange rack parts and gray decks, tint only the selected location, and keep exact full-footprint picking in an independent batch. Add transient marking visibility switches to editor and analysis; no workspace/schema or geometry change.

- Add enabled-by-default ground scopes per rack bay with up to ten editable side-by-side locations at floor height. Support explicit disabling, impact confirmation, undo/redo, locks and passage exclusion. Add gold access-side markers and rotated builder previews before placement. Migrate workspace 19 / layout 5 to workspace 20 / layout 6 without renumbering elevated levels or changing existing IDs/codes; database 3 and backup format 1 remain unchanged.

- Add up to ten side-by-side locations along each classified rack level. Move sideways, adjust width, draw and duplicate locations in a schematic front view; every new location uses the bay depth. Reject overlaps and out-of-bounds areas; retain earlier prototype depth rows until explicitly rearranged. Render the same footprints in the editor and read-only analysis. Preserve retained IDs/codes and migrate equal subdivisions to explicit placements in workspace schema 19 / layout 5; database 3 and backup format 1 remain unchanged.

- Derive displayed coverage dates and per-source ranges from dated valid, invalid and rule-excluded evidence. Keep valid-row counts, demand and comparison completeness separate from those evidence ranges.

- Preserve saved calendar reasons when removing the final source or resetting source data. Workspace switches still clear the previous workspace's notes from the view.

- Open the requested profile-overview import even when an old editor search hides it; ignore stale source IDs. Check coverage availability without aggregating issue-line evidence and reuse visible coverage tables during navigation.

- Keep coverage navigation and the calendar available for analyses containing only dated invalid or rule-excluded rows, and for retained reasons without a current analysis. Initialize note-only calendars from a saved date; do not enable period comparisons without valid dated rows.

- Show ISO calendar-week numbers and week-years beside each coverage calendar row and in the selected-day detail, including month/year transitions. Reuse the period-selection week calculation; stored data is unchanged.

- Replace the compact coverage strip with a monthly calendar and editable local reasons for dates without data. Distinguish valid, invalid/excluded, explained, unexplained and out-of-span days. Retain reasons through reopening, analysis and backup restore without changing demand or comparison completeness. Migrate workspace schema 17 to 18; database 3, backup format 1 and layout 4 remain unchanged.

- Record the last applied import profile per source with its historical name, application time and settings snapshot. Show it in the profile overview and source-column editor, flag subsequent settings/profile changes, and retain the evidence across activation, analysis and backups. Migrate workspace schema 16 to 17 without inferring prior applications; database 3, backup format 1 and layout 4 remain unchanged.

- Split source-column editing from profile application. Add a bilingual searchable, paginated import overview with selection across filters/pages, source-type and compatibility checks, replacement previews and staged multi-import application through one workspace save. Preserve source bytes and existing profile/backup schemas; data validation stays explicit.

- Separate roadmap milestones M01–M11 from published product versions and document SemVer/build/schema contracts. Add source, release-tag and manifest/ZIP metadata consistency checks to CI without incrementing the development version or publishing releases. Reject development versions below existing release tags and support Windows Python-launcher-only installations during ZIP inspection.

- Show the localized product version and build status in the permanent header as well as the footer, including the workspace picker. Refresh both on language changes and distinguish development from release builds.

- Validate the single complete archive checksum header when reusing an acceptance record. Reject missing, duplicate, malformed or stale headers without replacing artifacts; hashes mentioned in evidence notes cannot override the recorded checksum.

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
