# OpenSlotting

OpenSlotting is an open-source, local-first web tool for analyzing warehouse order lines and building a data-driven foundation for warehouse slotting.

The current development branch also contains a [warehouse editor and separate 3D analysis prototype](docs/warehouse-editor.md). Build physical racks first, assign Picking/Reserve use per level, then create up to ten side-by-side locations along the front of each level, including an enabled-by-default ground level per bay and match current article-master codes in the read-only analysis. The editor supports rack drive-throughs, clearance-aware route warnings, parametric corner/T/cross modules for routes and walls, compatible magnetic ports, connected/grouped structures and straight-wall opening previews. The current data contract uses workspace schema 21 / layout 6; exact release-candidate and company-environment acceptance remains pending. Legacy drawn routes remain readable; new routes are built from recipes.

The **Walk / Rundgang** menu offers a local, read-only first-person warehouse view with walking/jump/crouch collision checks, free flight, precise speed and FOV controls, a minimap, location search and current article/analysis details. See [Warehouse walk](docs/warehouse-walk.md) for controls, data semantics and browser acceptance limits.

The project starts with a deliberately small scope: importing and analyzing order-line data in the browser. The latest published application release is [`0.2.1`](https://github.com/SaikoAS/OpenSlotting/releases/tag/v0.2.1); current development continues the local-workspace, article-master, and period-comparison foundation. Future versions are planned to expand this foundation through ABC/XYZ classification, slotting scores, and warehouse slotting recommendations.

Warehouse distance-connection previews can fill the gap between two free route or wall ports with ordinary straight/corner modules, preserving existing endpoint positions. The bounded geometric search and its limitations are described in the [editor guide](docs/warehouse-editor.md#connections-over-a-distance); functional and Edge acceptance is pending.

The application uses a permanent rounded workspace frame beneath the banner
and beside navigation, keeping those controls and the compact privacy/version
footer visible. Long content scrolls inside the active view; desktop warehouse
views fit their viewport and side panels to the available height. Narrow windows
use stacked content and horizontal navigation. The former editor maximization
toggle is removed. Native Edge layout acceptance remains pending.

> **Project status:** The latest published release is `0.2.1`. `main` contains unreleased development after that release, including further workspace improvements, article-master imports and registry preparation, period comparison and large-import performance work. Core local workspaces were already shipped in `0.2.1`. Active development on this continuation branch now targets localhost only; Portable Mode is paused indefinitely. No next release version has been assigned yet.

## Current development implementation

OpenSlotting provides a browser-local workflow for creating separate workspaces,
importing order-line and article-master CSV files, analyzing order-line data,
and reopening the saved state.
Start `Start-OpenSlotting.cmd` on Windows (Python 3.8 or newer), select a workspace from the
metadata-first start overview or create a new one, explicitly open it,
choose one or more CSV files, review the detected column mapping for each file,
and start the combined analysis.

The current implementation includes:

- semicolon-separated UTF-8, UTF-16, and Windows-1252 CSV parsing with quoted fields
- automatic mapping for canonical and common German column names
- ISO and German date normalization
- decimal-point and decimal-comma number parsing
- validation with source file, source line, and field information
- on-demand reconstruction of raw field positions, including duplicate headers and rows
- optional article descriptions with English and German column aliases
- stable article grouping by ID with visible description-conflict detection
- article aggregation with quantity and order-line frequency kept separate
- filtering by article ID or description, sorting, and analysis CSV export
- article details with aggregate metrics and source-line traceability
- compact article detail references with on-demand source-row resolution
- paginated article and validation-note rendering with 100 rows per page for large imports
- paginated detail rows with 100 rows per page
- true chunked CSV decoding, parser state across chunk boundaries, and streaming normalization for large imports
- incremental article and global aggregation during normalization with a batch-compatible analysis wrapper
- English as the default interface language, with German available under Settings → Workspace → Language
- multiple source files in one in-memory analysis batch
- optional linked CSV sources with read-only file references, per-file/batch refresh, schema checks and atomic replacement; snapshot import remains available
- compact import management with search, sortable file metadata, status/link/tag filters, selected-file actions and workspace-backed custom tags
- fitted coverage desk with expected-weekday settings, calendar/week numbers, day reasons and internally scrolling source/date/evidence views
- explicit persisted source types (`order-lines` and `article-master`), with order-line defaults for existing and new imports
- source-scoped field mappings with the core movement contract `article_id + quantity + delivery_date`; order identity, customer, sales, location, selling-unit, and master-data capabilities remain optional
- independent net/gross sales-value and unit-price fields, with legacy unclassified sales values preserved without guessing their tax semantics
- article-master imports that require only `article_id` and retain optional description, current location, quantity per selling unit, unit of measure, VAT rate, and custom fields
- article analysis enriched from a deterministic workspace registry, including matched, movement-only, and master-only states without changing historical demand facts
- structured, source-traceable master-data quality findings for duplicate IDs, conflicting values, missing master data, master-only articles, and invalid typed values
- ordered source-column catalogs with duplicate-header and physical-position metadata
- bounded streaming source-column profiles with representative and frequent values
- explainable mapping suggestions and a source-column overview with profile evidence
- workspace-local import profiles that reuse a source type, field mapping, ordered preparation rules, and selected named source-column filters across CSV imports
- independent encoding selection, mapping, parsing, and validation per source file
- visible exclusion of files with blocking import errors
- source-file and source-line traceability for validation notes and article details
- warnings for overlapping date ranges, identical decoded content, and matching file metadata
- no automatic cross-file deduplication
- source-file coverage in the analysis export
- optional Windows launch, current-user shortcut setup, and safe shortcut removal for Microsoft Edge app mode
- persistent, strictly isolated browser-local workspaces backed by IndexedDB
- chunked workspace persistence with independently stored sources, source bytes, normalized rows, and validation issues
- automatic storage of original source bytes, mappings, normalized rows, validation results, and provenance
- complete blockwise `.osworkspace` backups with SHA-256 verification, cancellable progress and atomic staged restore; legacy `.workspace.json` backups remain readable (see [backup format](docs/workspace-format.md#current-archive-format-version-2))
- workspace creation, selection, rename, confirmed clearing, and confirmed deletion
- metadata-first workspace overview without automatically loading the last large payload
- cancellable background validation, CSV profiling, preparation, and analysis in a reusable local module worker
- last-used workspace marker and per-workspace source/row overview
- approximate browser usage/quota display with a clear unavailable fallback
- complete single-workspace JSON backup and validated restore as new or explicit replacement
- versioned workspace and backup schemas without a workspace merge path
- optional selling-unit / cases and quantity-per-selling-unit import fields with zero-unit and partial-sale support
- visible date coverage with configurable expected weekdays and missing-day warnings
- automatic ISO-calendar-week selection plus optional custom, workspace-persisted comparison periods
- article-level comparison filters, data-quality indicators, detail links, and CSV export
- a TradingView-inspired analysis desk with article, customer, and order views, an observed-date trend, searchable entity list, and source-line evidence

The complete import, normalization, validation, and analysis-export contract is documented in [`docs/data-format.md`](docs/data-format.md). The analysis desk's grouping and chart semantics are documented in [`docs/trading-desk.md`](docs/trading-desk.md). Period coverage and comparison semantics are documented in [`docs/period-comparison.md`](docs/period-comparison.md). Large-import measurements and the synthetic benchmark are documented in [`docs/large-imports.md`](docs/large-imports.md). Search and sort projection measurements are documented in [`docs/search-performance.md`](docs/search-performance.md). Persistent storage, backup, restore, and migration are documented in [`docs/workspace-format.md`](docs/workspace-format.md).

Published `0.1.0` and `0.2.1` use the historical direct `file:///` runtime. Acceptance records apply only to their recorded candidates; the [0.2.1 launcher record](docs/acceptance-v0.2.1.md) distinguishes its accepted source tree from final-package acceptance. The multi-export acceptance record remains historical. Current localhost development requires a fresh exact-candidate Edge run through the local launcher before a future release claim. Other browsers may work but are not part of the compatibility claim unless tested separately.

Workspace source data is stored locally in IndexedDB in the current browser
profile and origin. Startup loads only small workspace metadata; the selected
payload is read and the derived article analysis is rebuilt from retained source
state only after the user opens that workspace. Heavy preparation runs in an
offline worker where supported. OpenSlotting does not upload files or
require an external backend, Node.js, account, telemetry, or internet
connection. Python serves the local interface files only; imported data stays in the browser.

## Windows start

On Windows, the standard launchers start OpenSlotting through its loopback-only
localhost runtime and open Edge in a maximized app window:

1. Extract the complete release ZIP into a user-writable folder.
2. Double-click `Start-OpenSlotting.cmd` to start the local server when needed
   and open the app without installing a shortcut.
3. Double-click `Install-OpenSlotting.cmd` to create a current-user Start menu
   shortcut, Desktop shortcut, or both. The Start menu is the default choice.
4. Double-click `Remove-OpenSlotting.cmd` to remove only shortcuts previously
   created and marked as managed by OpenSlotting.

This startup path requires Python 3.8 or newer already available on the computer.
It installs no Python packages, requires no administrator rights, and makes no
internet connection. The server binds only to `127.0.0.1`. Edge opens in app
mode with the window maximized.

If an `OpenSlotting.ico` file is present beside the scripts, setup uses it for
the shortcut. Moving or deleting the extracted OpenSlotting folder invalidates
shortcuts pointing to that copy; run setup again from the new location. Setup
refuses to overwrite, and removal refuses to delete, a same-named shortcut that
is not marked as managed by OpenSlotting.

Taskbar pinning remains a Windows user action. After creating the Start menu
shortcut, open Start, search for `OpenSlotting`, right-click it, and choose
**Pin to taskbar** if that option is allowed by the device policy. Setup prints
this reminder but does not modify taskbar policy or attempt unsupported shell
automation.

## Localhost development and Portable pause

The current performance work uses fixed local worker files, bounded table-row
reuse, cached entity search, an adaptive date index and prepared warehouse
geometry. Original source bytes, exact quantities, source references, browser
storage and the backup format remain compatible. Python still only serves
interface files; operational data is processed in the browser.
See [performance decisions, measurements and limits](docs/performance/README.md).

Localhost is the only actively developed runtime. OpenSlotting processes and
stores imported data locally in the browser. Python is the only additional
runtime dependency; its standard library serves the bundled interface files.
There are no Python packages to install, no OpenSlotting executable, no cloud
account, and no required internet access.

Use `Stop-OpenSlotting.cmd` to stop the verified local server. Existing
`*-OpenSlotting-Localhost.cmd` names remain compatibility commands for existing
shortcuts. They reach the same fixed `http://127.0.0.1:8765/index.html` origin.

Portable Mode is deliberately paused indefinitely. Its complete development
basis remains at commit `cb193338342cd23f5cb89814c33bee0bf65cc77e` on
`codex/parametric-warehouse-editor`. Interested contributors can resume it
independently. The current branch displays a start instruction on direct
`file:///` access before opening workspace storage.

Existing Portable browser data is preserved at its original origin. Export a
workspace backup from the previous application copy and restore it in localhost
to transfer it. Existing localhost workspaces keep their storage origin and
database. See [Portable pause and migration](docs/portable-mode-paused.md),
[localhost startup](docs/localhost-start.md), and [runtime](docs/runtime.md).

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

## Order-line analysis foundation

The initial release established **order-line analysis** (milestone M01). Current development builds on that foundation.

A typical order-line dataset may contain fields such as:

- Order ID
- Article ID / SKU
- Article description
- Quantity
- Delivery date
- Customer ID
- Customer name
- Sales value excluding or including VAT
- Unit price excluding or including VAT
- Current storage location
- Selling units / cases
- Quantity per selling unit

Only article ID / SKU, quantity, and delivery date are required for the core quantity/time/period analysis. Order ID and the other listed fields enable optional metrics or enrichment.

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
10. Review coverage in the monthly calendar, record reasons for dates without data, and configure expected weekdays. Reasons remain local and part of backups; they do not create zero-demand days or change comparison results.
11. Select two automatically detected ISO calendar weeks or define custom Period A and Period B boundaries
12. Compare period metrics and article-level absolute and relative changes
13. Inspect selling-unit conflicts, missing-day warnings, and source details
14. Export the period comparison, combined analysis, or one complete workspace backup
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
- Legacy unclassified sales value and row coverage for compatible existing workspaces
- Selling units / cases and selling-unit coverage
- Period A versus Period B changes for lines, quantity, orders, customers, and selling units

A key principle of the project is to distinguish between **quantity** and **order-line frequency**.

An article ordered once in a quantity of 500 may create less picking activity than an article ordered 300 times in quantities of one.

For slotting purposes, both perspectives can be relevant.

### Quantity precision

Quantities support up to seven decimal places. Values with more decimal places are rejected during import. Normalized rows and aggregate quantities use an exact fixed-point integer with scale `10^7` (for example, `1.2345678` is stored as `12345678`). The same scale is used for aggregation, display, and CSV export, so floating-point addition cannot change a quantity.

Numeric fields accept one decimal separator (`.` or `,`) and optional surrounding whitespace. Internal whitespace and mixed separators are rejected; thousands-grouped values such as `1.234,56` are not accepted.

Explicit net/gross sales values and unit prices support up to two decimal places and remain independent authoritative imports. Values with more decimal places, values outside the safe range, or values with lost decimal precision are rejected during import. OpenSlotting does not derive one monetary field from another. Existing unclassified `sales_value` data remains available as a clearly labeled legacy compatibility metric instead of being guessed as net or gross. Exported location collections use JSON arrays so commas inside a location remain unambiguous.

## Configurable Data Mapping

OpenSlotting should not depend on specific ERP or WMS column names.

For example:

| Source column | OpenSlotting field |
| --- | --- |
| ArtNr | Article ID / SKU |
| SKU | Article ID / SKU |
| Material | Article ID / SKU |
| Article Name | Article description |
| Description | Article description |
| Artikelbezeichnung | Article description |
| Bezeichnung | Article description |
| AuftragsNr | Order ID |
| OrderNumber | Order ID |
| Menge | Quantity |
| Qty | Quantity |

The **Quellspalten / Columns & notes** menu separates the **Source-column editor / Quellspalteneditor** from **Apply profiles / Profile anwenden**. Edit one source and save/update its workspace-local profile in the editor. The profile overview provides filename search, source-type/status filters, selection across pages and a replacement preview for applying a profile to multiple compatible imports. Different source types, missing or ambiguous columns remain visible conflicts and are skipped. Reordered columns match only by unique names; an identical layout matches by position. A successful save replaces mappings and rules on compatible sources, retains original bytes, and requires a separate data-validation step. Both views show the last applied profile name and timestamp, with a notice when settings have since changed. This evidence survives reopening, backups and profile deletion; older imports without recorded evidence are explicitly identified. Profiles remain workspace-local and part of backups. See the [workflow and selection rules](docs/data-format.md#source-column-editor-and-profile-application).

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

Active use requires Python 3.8 or newer and a local browser. The Python
standard-library server binds only to `127.0.0.1` and serves an explicit list of
interface assets. It accepts no operational-data upload, stores no workspace,
and makes no external requests. Browser policy blocks application connection
requests; analysis and storage remain browser-local.

Normal use requires no npm/pip packages, OpenSlotting installer or `.exe`,
administrator privileges, telemetry, remote backend, or internet connection.
The Windows shortcut setup is optional and affects only the current user.
Use a company-approved Python/browser installation and a local application
folder. Device and organization policies remain authoritative.

Direct-file compatibility belongs to the indefinitely paused Portable line.
Hosted public demos are outside the active localhost support claim.

This makes it possible to use the tool for local analysis while keeping imported operational data on the user's device.

The public project and demo data must not contain real company, customer, article, or warehouse data.

## Roadmap

Milestone IDs describe functional goals, **not product versions or release
promises**. Implementation and publication are separate: a feature on `main`
may still need exact-candidate checks and native Edge acceptance. The current
prioritized work and dependencies are tracked in [#76](https://github.com/SaikoAS/OpenSlotting/issues/76).
See the [versioning policy](docs/versioning.md) for release history, SemVer rules
and the independent workspace/layout/backup formats.

| Milestone | Functional goal | Current implementation | First published release |
| --- | --- | --- | --- |
| M01 | Order-line analysis | Implemented; later improvements on `main` | `0.1.0` |
| M02 | Import compatibility | Implemented | `0.2.1` |
| M03 | Multi-export analysis | Implemented | `0.2.1` (`0.2.0` work was unpublished) |
| M04 | Optional Windows launcher | Historical direct-file launcher published; current localhost launcher on `main` | `0.2.1` for the historical launcher |
| M05 | Local workspaces | Core implemented and published; later improvements on `main` | `0.2.1` for the core |
| M06 | Period comparison | Implemented on `main`; release acceptance pending | Not published |
| M07 | ABC / XYZ analysis | Planned (#90, #91) | Not published |
| M08 | Article master data | Import/registry/enrichment/quality implemented on `main`; further profile options planned | Not published |
| M09 | Storage locations and warehouse model | Editor, uses, locations and read-only matching on `main`; typed capacity/stock assignments pending (#92, #93) | Not published |
| M10 | Slotting evaluation | Planned (#95) | Not published |
| M11 | Slotting recommendations | Planned (#97) | Not published |

The former “V0.x” headings were roadmap labels. M01–M11 retain their order
and scope without claiming releases named `0.3`, `0.6` or `1.0`. Published tags,
assets, historical acceptance filenames and changelog versions are unchanged.

### M01 — Order-Line Analysis

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

### M02 — Import Compatibility

- Windows-1252 CSV support
- BOM-aware and BOM-less UTF-16 detection
- Broader high-confidence German ERP and warehouse header aliases

### M03 — Multi-Export Analysis

- Select and import multiple CSV exports
- Encoding detection, mapping, and validation per file
- Combined analysis across all valid normalized order lines
- Source-file and source-line traceability
- Visible warnings for potentially overlapping exports
- No automatic cross-file deduplication without a reliable source-row key

### M04 — Optional Windows Edge Launcher

- Start the extracted local application in Microsoft Edge app mode
- Create current-user Start menu and/or Desktop shortcuts without administrator rights
- Discover common Microsoft Edge installation locations automatically
- Use an optional local icon and remove only OpenSlotting-managed shortcuts safely
- Historical release: direct `file:///` startup; Portable development is now paused

### M05 — Local Workspaces

- Create and reopen separate workspaces in browser-local IndexedDB storage
- Start with a metadata-only overview and load a large workspace only after explicit selection
- Prepare reopened workspaces in a cancellable offline background worker
- Keep normalized order lines, source metadata, mappings, and validation results isolated per workspace
- Add or remove source exports only within the selected workspace
- Export or restore exactly one complete workspace per backup file
- Restore a backup as a new workspace or explicitly replace one existing workspace
- Never merge or mix two workspaces during restore
- Transferable workspace backups for migration between browser profiles or origins
- No mandatory cloud storage, backend, account, or network connection

The core workspace workflow was included in the published `0.2.1`
release. Current `main` contains later workspace improvements that still
require exact-candidate automated checks and manual Microsoft Edge localhost
acceptance before a future release claim.

### M06 — Period Comparison

- Select and compare defined analysis periods
- Show data coverage and missing-period warnings
- Compare article activity between periods
- Establish the time-series foundation required for XYZ analysis

### M07 — ABC / XYZ Analysis

- ABC classification
- Configurable ABC thresholds
- Time-based demand analysis
- XYZ classification
- Combined ABC/XYZ matrix

### M08 — Article Master Data

- Import article-master CSV sources with persistent source type and provenance
- Additional article attributes through workspace custom fields
- Normalize master-only, movement-only, and matched article identities in a workspace-level registry
- Enrich article analysis with current master attributes without rewriting historical movement facts
- Detect duplicate/conflicting master rows, missing master data, and master-only articles with source evidence
- Configurable article master data
- Further import-profile sharing and editing options (planned)

### M09 — Existing Storage Locations

- Current storage locations
- Storage zones
- Location attributes
- Comparison of article activity and current location

### M10 — Slotting Evaluation

- Configurable slotting scores
- Article prioritization
- Rule-based constraints
- Location suitability

### M11 — Slotting Recommendations

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
- One active localhost runtime with centralized capability detection
- Python 3.8+ standard-library loopback server as the only additional runtime
- Local IndexedDB workspaces and transferable JSON backups
- Bundled WebGL2 warehouse rendering
- No internet connection or third-party runtime packages

Technology choices must preserve local processing, local storage, existing
business functions, and the Python-only deployment contract. Direct-file
fallbacks are no longer an active-development requirement.
See the [project map](docs/architecture.md) for code and contributor tools.

## Contributing

Ideas, discussions, bug reports, feature proposals, and contributions are welcome. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the branch, pull-request, quality, local-file, and synthetic-data requirements.

## License

OpenSlotting is released under the MIT License.

See the `LICENSE` file for details.

---

**OpenSlotting starts with the data behind slotting: order lines.**

Understand warehouse activity first. Classify articles second. Optimize storage locations afterwards.
