# OpenSlotting v0.1.0 — Order-Line Analysis

OpenSlotting 0.1.0 is the first public functional release of the local-first warehouse order-line analysis tool.

## Included

- local CSV import with automatic and manual column mapping
- row validation and normalized order-line processing with source-line traceability
- exact quantity aggregation and separate order-line-frequency metrics
- optional article descriptions, retained variants, and visible conflict detection
- searchable, sortable, and paginated article overview
- article detail view with the corresponding normalized source rows
- analysis CSV export with stable English headers and spreadsheet formula-injection protection
- English interface with optional German selection

## Local-first operation

Extract `OpenSlotting-v0.1.0.zip` and open `index.html` directly. The core workflow runs through `file:///` without a backend, localhost server, internet connection, installer, Node.js, or Python. Imported files remain in the current browser session unless the user explicitly exports or transfers data.

## Compatibility

The official V0.1 acceptance platform is Microsoft Edge Desktop on Windows using direct `file:///` execution. Publish these notes only after the release checklist records a passing test for the exact release candidate. Other browsers may work, but are not part of the V0.1 compatibility claim.

## Early-release notice

This is an early 0.x release. Public behavior, internal models, and file formats may evolve before 1.0. The shipped V0.1 behavior is documented in `docs/data-format.md` inside the release archive.

## Data and security

Use only data you are authorized to process. The public repository, issues, screenshots, examples, and bug reports must contain fully synthetic data only. Anonymized, pseudonymized, or redacted real operational data is not permitted. Security-sensitive findings should be reported according to `SECURITY.md`.
