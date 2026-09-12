# Changelog

All notable changes to OpenSlotting are documented in this file.

## Next bundled release - Unreleased

The final version number will be assigned during bundled release planning.

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

## 0.2.1 - Unreleased

### Added

- optional Windows launch command for opening the local application in Microsoft Edge app mode
- current-user Start menu and Desktop shortcut setup without administrator rights
- safe shortcut removal that leaves unrelated shortcuts, application files, and browser-local data untouched
- automatic discovery of common per-machine and per-user Microsoft Edge installations
- optional local `OpenSlotting.ico` support with a local Edge icon fallback
- cross-platform launcher logic tests and Windows COM shortcut tests
- a post-install reminder for optional user-controlled taskbar pinning

### Changed

- release packages now include the optional Windows launcher and shortcut-management files

## 0.2.0 - Unreleased

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
