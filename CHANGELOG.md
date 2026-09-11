# Changelog

All notable changes to OpenSlotting are documented in this file.

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
