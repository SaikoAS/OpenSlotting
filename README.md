# OpenSlotting

OpenSlotting is an open-source, local-first web tool for analyzing warehouse order lines and building a data-driven foundation for warehouse slotting.

The project starts with a deliberately small scope: importing and analyzing order-line data in the browser. Future versions are planned to expand this foundation through multi-export analysis, separate locally stored workspaces, period comparisons, ABC/XYZ classification, configurable master data, slotting scores, and warehouse slotting recommendations.

> **Project status:** Post-V0.2.1 development with persistent local workspaces. The final bundled release version has not yet been assigned.

## Current development implementation

OpenSlotting provides a browser-local workflow for creating separate workspaces,
importing and analyzing order-line CSV files, and reopening the saved state.
Open `index.html` directly in a supported browser, select a workspace from the
metadata-first start overview or create a new one, explicitly open it,
choose one or more CSV files, review the detected column mapping for each file,
and start the combined analysis.

The current implementation includes:

- semicolon-separated UTF-8, UTF-16, and Windows-1252 CSV parsing with quoted fields
- automatic mapping for canonical and common German column names
- ISO and German date normalization
- decimal-point and decimal-comma number parsing
- validation with source file, source line, and field information
- preservation of raw field positions, including duplicate rows
- optional article descriptions with English and German column aliases
- stable article grouping by ID with visible description-conflict detection
- article aggregation with quantity and order-line frequency kept separate
- filtering by article ID or description, sorting, and analysis CSV export
- article details with aggregate metrics and source-line traceability
- paginated article and validation-note rendering with 100 rows per page for large imports
- paginated detail rows with 100 rows per page
- English as the default interface language, with German available from the language selector
- multiple source files in one in-memory analysis batch
- independent encoding selection, mapping, parsing, and validation per source file
- visible exclusion of files with blocking import errors
- source-file and source-line traceability for validation notes and article details
- warnings for overlapping date ranges, identical decoded content, and matching file metadata
- no automatic cross-file deduplication
- source-file coverage in the analysis export
- optional Windows launch, current-user shortcut setup, and safe shortcut removal for Microsoft Edge app mode
- persistent, strictly isolated browser-local workspaces backed by IndexedDB
- automatic storage of original source bytes, mappings, normalized rows, validation results, and provenance
- workspace creation, selection, rename, confirmed clearing, and confirmed deletion
- metadata-first workspace overview without automatically loading the last large payload
- cancellable background validation, CSV preparation, and analysis in an offline `blob:` worker
- last-used workspace marker and per-workspace source/row overview
- approximate browser usage/quota display with a clear unavailable fallback
- complete single-workspace JSON backup and validated restore as new or explicit replacement
- versioned workspace and backup schemas without a workspace merge path

The complete import, normalization, validation, and analysis-export contract is documented in [`docs/data-format.md`](docs/data-format.md). Persistent storage, backup, restore, and migration are documented in [`docs/workspace-format.md`](docs/workspace-format.md).

The published V0.1 release was accepted in Microsoft Edge Desktop on Windows with `index.html` opened directly through `file:///`. V0.2 retains the same acceptance target and requires a separate multi-file Edge run before release using [`docs/acceptance-v0.2.md`](docs/acceptance-v0.2.md). Other browsers may work but are not part of the compatibility claim unless tested separately.

Workspace source data is stored locally in IndexedDB in the current browser
profile and origin. Startup loads only small workspace metadata; the selected
payload is read and the derived article analysis is rebuilt from retained source
state only after the user opens that workspace. Heavy preparation runs in an
offline worker where supported. OpenSlotting does not upload files or
require a server, backend, Node.js, Python, account, telemetry, or internet
connection.

## Optional Windows launcher

Directly opening `index.html` remains the core and fully independent way to run
OpenSlotting. The V0.2.1 release files also provide an optional convenience path
for Windows users:

1. Extract the complete release ZIP into a user-writable folder.
2. Double-click `Start-OpenSlotting.cmd` to open that copy directly in Microsoft
   Edge app mode without installing a shortcut.
3. Double-click `Install-OpenSlotting.cmd` to create a current-user Start menu
   shortcut, Desktop shortcut, or both. The Start menu is the default choice.
4. Double-click `Remove-OpenSlotting.cmd` to remove only shortcuts previously
   created and marked as managed by OpenSlotting.

The scripts locate `index.html` relative to their own extracted folder and look
for Microsoft Edge in common per-machine and per-user installation locations.
They require neither administrator rights nor a system `PATH` entry, backend,
localhost server, account, telemetry, package manager, or network connection.
The installed shortcut targets Edge directly, so it does not leave a console
window open while OpenSlotting is running.

If an `OpenSlotting.ico` file is present beside the scripts, setup uses it for
the shortcut. Otherwise the local Edge icon is used. Moving or deleting the
extracted OpenSlotting folder invalidates shortcuts pointing to that copy; run
setup again from the new location. Setup refuses to overwrite, and removal
refuses to delete, a same-named shortcut that is not marked as managed by
OpenSlotting.

Taskbar pinning remains a Windows user action. After creating the Start menu
shortcut, open Start, search for `OpenSlotting`, right-click it, and choose
**Pin to taskbar** if that option is allowed by the device policy. Setup prints
this reminder but does not modify taskbar policy or attempt unsupported shell
automation.

The application interface is English by default. Users can switch the visible
interface, validation messages, labels, and number formatting to German at any
time. Internal field keys and exported column names remain stable in English so
that imports and downstream analysis do not change with the selected language.

## Goals

OpenSlotting aims to provide a simple and transparent way to analyze warehouse movement data without requiring a dedicated backend or database server.

The project is designed around a few core principles:

- Local-first data processing
- Open-source and vendor-independent
- Configurable data imports
- Clear and explainable calculations
- Modular architecture
- Gradual evolution from order analysis toward slotting optimization

## V0.1 Scope

V0.1 focuses exclusively on **order-line analysis**.

A typical order-line dataset may contain fields such as:

- Order ID
- Article / SKU ID
- Article description
- Quantity
- Date
- Customer ID
- Sales value
- Current storage location

Only order ID, article ID, quantity, and order date are required. The other listed fields are optional.

Different ERP, WMS, and CSV export headers are supported through configurable column mapping instead of hard-coded field names.

## Current workflow

1. Select a workspace from the fast start overview, create one, or restore a backup
2. Explicitly open the selected workspace and wait for cancellable background preparation
3. Add one or more CSV files to that workspace
4. Detect encoding and available columns independently for each file
5. Map each file's source columns to OpenSlotting fields
6. Validate and normalize every source independently
7. Exclude visibly blocked files and invalid rows
8. Warn about overlapping exports without removing rows
9. Combine all valid normalized rows
10. Aggregate order lines by article
11. Calculate basic warehouse activity metrics
12. Sort and filter the results
13. Open an article to inspect its source file and source line
14. Export the combined analysis or one complete workspace backup
15. Return to the overview after a later restart, then reopen or replace a selected workspace

## Current Metrics

The current analysis includes metrics such as:

- Number of order lines
- Total quantity
- Number of distinct orders
- Number of distinct customers
- Number of active days
- Average quantity per order line
- Average quantity per order
- Share of total order lines
- Cumulative share of order lines

A key principle of the project is to distinguish between **quantity** and **order-line frequency**.

An article ordered once in a quantity of 500 may create less picking activity than an article ordered 300 times in quantities of one.

For slotting purposes, both perspectives can be relevant.

### Quantity precision

Quantities support up to seven decimal places. Values with more decimal places are rejected during import. Normalized rows and aggregate quantities use an exact fixed-point integer with scale `10^7` (for example, `1.2345678` is stored as `12345678`). The same scale is used for aggregation, display, and CSV export, so floating-point addition cannot change a quantity.

Numeric fields accept one decimal separator (`.` or `,`) and optional surrounding whitespace. Internal whitespace and mixed separators are rejected; thousands-grouped values such as `1.234,56` are not accepted.

Sales values support up to two decimal places, matching the displayed and exported monetary precision. Values with more decimal places, values outside the safe range, or values with lost decimal precision are rejected during import. Accepted sales values are aggregated as exact decimals, so totals remain correct even when their sum exceeds the safe range. Exported location collections use JSON arrays so commas inside a location remain unambiguous.

## Configurable Data Mapping

OpenSlotting should not depend on specific ERP or WMS column names.

For example:

| Source column | OpenSlotting field |
| --- | --- |
| ArtNr | Article ID |
| SKU | Article ID |
| Material | Article ID |
| Article Name | Article description |
| Description | Article description |
| Artikelbezeichnung | Article description |
| Bezeichnung | Article description |
| AuftragsNr | Order ID |
| OrderNumber | Order ID |
| Menge | Quantity |
| Qty | Quantity |

Users can review and change the mapping independently for every file in the current batch. Workspace-specific mappings are planned for V0.3; reusable mapping templates remain planned for V0.6.

Article descriptions are optional display metadata. Articles are always grouped by
`article_id`. If one article ID has multiple distinct non-empty descriptions,
OpenSlotting keeps the first non-empty description as the primary value and exposes
the variants as a conflict in the overview, detail view, and analysis export.

The analysis export keeps stable English headers. It includes `article_name`,
`article_name_conflict`, and the JSON-encoded `article_name_variants` directly after
`article_id`. Imported description text is protected against spreadsheet formula
injection in the same way as article IDs.

## Multi-Export Analysis

Every selected file is decoded, mapped, parsed, and validated independently. The
detected encoding is shown per file and can be overridden with UTF-8, UTF-16 LE,
UTF-16 BE, or Windows-1252 before analysis. A
file with a blocking header, parser, or mapping error is shown as excluded and
contributes no rows. Ready files remain analyzable when another file is blocked.

Valid rows from included files are concatenated in file-selection and source-row
order before article aggregation. OpenSlotting does not infer business-event
identity and never removes cross-file rows automatically. Overlapping normalized
date ranges, identical decoded content, and matching filename/size/modification
metadata produce visible risk warnings only.

Every normalized row retains a batch-local source-file ID, original filename,
display label, and physical source line. Duplicate filenames receive distinct
display labels. Article details expose file and line provenance, while the
analysis export contains each article's contributing source-file count and a
JSON array of source-file labels.

## Local-First

OpenSlotting is intended to process imported warehouse data locally in the user's browser.

Persistent workspaces use IndexedDB. They belong to the current browser profile
and origin rather than to the folder containing `index.html`. The supported way
to transfer a workspace between profiles or origins is to export and restore its
complete local backup.

Direct local file execution is a core compatibility requirement. The application must remain usable by opening `index.html` directly from the local filesystem through a `file:///` URL in a supported browser.

Normal use must not require:

- A local web server or `localhost`
- A backend service
- Node.js, Python, or another runtime to start the application
- An internet connection for core functionality
- Administrator privileges or a system-wide installation

GitHub Pages may be used for a public demo, but hosted deployment must remain optional and must not become a runtime requirement for the core application.

This makes it possible to use the tool for local analysis while keeping imported operational data on the user's device.

The public project and demo data must not contain real company, customer, article, or warehouse data.

## Roadmap

### V0.1 — Order-Line Analysis

- CSV import
- Column mapping
- Data validation
- Article aggregation
- Basic metrics
- Optional article descriptions and conflict detection
- Article search by ID and every retained description variant
- Article detail view with source-line traceability
- Pagination for large result and validation tables
- Filtering and sorting
- CSV export

### V0.1.1 — Import Compatibility

- Windows-1252 CSV support
- BOM-aware and BOM-less UTF-16 detection
- Broader high-confidence German ERP and warehouse header aliases

### V0.2 — Multi-Export Analysis

- Select and import multiple CSV exports
- Encoding detection, mapping, and validation per file
- Combined analysis across all valid normalized order lines
- Source-file and source-line traceability
- Visible warnings for potentially overlapping exports
- No automatic cross-file deduplication without a reliable source-row key

### V0.2.1 — Optional Windows Edge Launcher

- Start the extracted local application in Microsoft Edge app mode
- Create current-user Start menu and/or Desktop shortcuts without administrator rights
- Discover common Microsoft Edge installation locations automatically
- Use an optional local icon and remove only OpenSlotting-managed shortcuts safely
- Preserve direct `file:///` startup as the independent core runtime

### V0.3 — Local Workspaces

- Create and reopen separate workspaces in browser-local IndexedDB storage
- Start with a metadata-only overview and load a large workspace only after explicit selection
- Prepare reopened workspaces in a cancellable offline background worker
- Keep normalized order lines, source metadata, mappings, and validation results isolated per workspace
- Add or remove source exports only within the selected workspace
- Export or restore exactly one complete workspace per backup file
- Restore a backup as a new workspace or explicitly replace one existing workspace
- Never merge or mix two workspaces during restore
- Portable workspace backups for migration between browser profiles or `file:///` origins
- No mandatory cloud storage, backend, account, or network connection

Implementation exists on the Issue #19 feature branch; exact-candidate automated
checks and manual Microsoft Edge `file:///` acceptance remain required before a
release claim.

### V0.4 — Period Comparison

- Select and compare defined analysis periods
- Show data coverage and missing-period warnings
- Compare article activity between periods
- Establish the time-series foundation required for XYZ analysis

### V0.5 — ABC / XYZ Analysis

- ABC classification
- Configurable ABC thresholds
- Time-based demand analysis
- XYZ classification
- Combined ABC/XYZ matrix

### V0.6 — Article Master Data

- Configurable article master data
- Additional article attributes
- Custom fields
- Reusable mapping templates

### V0.7 — Existing Storage Locations

- Current storage locations
- Storage zones
- Location attributes
- Comparison of article activity and current location

### V0.8 — Slotting Evaluation

- Configurable slotting scores
- Article prioritization
- Rule-based constraints
- Location suitability

### V1.0 — Slotting Recommendations

- Suggested storage locations
- Explainable recommendations
- Configurable optimization criteria
- Exportable relocation proposals

## Long-Term Vision

The long-term goal is to evolve OpenSlotting from a simple order-line analysis tool into a modular warehouse slotting framework.

The basic architecture should remain separated into three major layers:

**Import Layer**

CSV and other source formats are mapped and normalized.

**Data & Analytics Layer**

Order lines, articles, metrics, ABC/XYZ classifications, and other analytical models are calculated.

**Slotting Layer**

Warehouse constraints, scoring models, rules, and future optimization logic use the normalized data to generate recommendations.

This separation should make it possible to support different companies, warehouses, ERP systems, and WMS exports without changing the core analysis logic.

## Demo Data

Any example datasets included in this repository should be fully synthetic.

Demo data may include fictional:

- Articles
- Customers
- Orders
- Locations
- Quantities
- Product categories

No real operational or company data should be committed to the repository.

The repository's `test-data` directory contains documented synthetic fixtures. They cover standard and multi-file imports, alternative column mappings, missing values, duplicates, invalid values, malformed rows, overlap warnings, and CSV quoting.

## Technology

OpenSlotting is implemented as a browser-based application using standard web technologies.

Current implementation:

- HTML
- CSS
- JavaScript
- Client-side data processing
- Direct `file:///` execution without a local web server
- Local browser storage where compatible with `file:///`
- No runtime backend requirement
- No internet connection required for core functionality
- GitHub Pages for an optional public demo

Technology choices and dependencies must preserve direct local-file compatibility for normal use. Features that require HTTP-only browser APIs must not become mandatory for the core workflow unless a compatible local-file fallback is provided.

The technical architecture may evolve as the project develops, but the direct `file:///` execution requirement should remain a core design constraint.

## Contributing

Ideas, discussions, bug reports, feature proposals, and contributions are welcome. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the branch, pull-request, quality, local-file, and synthetic-data requirements.

## License

OpenSlotting is released under the MIT License.

See the `LICENSE` file for details.

---

**OpenSlotting starts with the data behind slotting: order lines.**

Understand warehouse activity first. Classify articles second. Optimize storage locations afterwards.
