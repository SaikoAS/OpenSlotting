# OpenSlotting

OpenSlotting is an open-source, local-first web tool for analyzing warehouse order lines and building a data-driven foundation for warehouse slotting.

The project starts with a deliberately small scope: importing and analyzing order-line data in the browser. Future versions are planned to expand this foundation through multi-export analysis, separate locally stored workspaces, period comparisons, ABC/XYZ classification, configurable master data, slotting scores, and warehouse slotting recommendations.

> **Project status:** V0.1 CSV import, article overview, and traceable article details implemented.

## Current V0.1 implementation

OpenSlotting currently provides a browser-local first feature for importing and
analyzing order-line CSV files. Open `index.html` directly in a supported
browser, choose a CSV file, review the detected column mapping, and start the
analysis.

The current implementation includes:

- semicolon-separated UTF-8, UTF-16, and Windows-1252 CSV parsing with quoted fields
- automatic mapping for canonical and common German column names
- ISO and German date normalization
- decimal-point and decimal-comma number parsing
- validation with source line and field information
- preservation of raw field positions, including duplicate rows
- optional article descriptions with English and German column aliases
- stable article grouping by ID with visible description-conflict detection
- article aggregation with quantity and order-line frequency kept separate
- filtering by article ID or description, sorting, and analysis CSV export
- article details with aggregate metrics and source-line traceability
- paginated article and validation-note rendering with 100 rows per page for large imports
- paginated detail rows with 100 rows per page
- English as the default interface language, with German available from the language selector

The complete implemented import, normalization, validation, and export contract is documented in [`docs/data-format.md`](docs/data-format.md).

The official V0.1 acceptance target is Microsoft Edge Desktop on Windows with `index.html` opened directly through `file:///`. Other browsers may work, but are not part of the V0.1 compatibility claim unless they are tested separately.

The first implementation intentionally keeps data in memory for the current
browser session. It does not upload files or require a server, backend,
Node.js, Python, or an internet connection.

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

## Current V0.1 Workflow

1. Import a CSV file
2. Detect available columns
3. Map source columns to OpenSlotting fields
4. Validate the imported data
5. Normalize the data internally
6. Aggregate order lines by article
7. Calculate basic warehouse activity metrics
8. Sort and filter the results
9. Open an article to inspect its normalized source rows
10. Export analysis results

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

Users can review and change the mapping for the current import. Workspace-specific mappings are planned for V0.3; reusable mapping templates remain planned for V0.6.

Article descriptions are optional display metadata. Articles are always grouped by
`article_id`. If one article ID has multiple distinct non-empty descriptions,
OpenSlotting keeps the first non-empty description as the primary value and exposes
the variants as a conflict in the overview, detail view, and analysis export.

The analysis export keeps stable English headers. It includes `article_name`,
`article_name_conflict`, and the JSON-encoded `article_name_variants` directly after
`article_id`. Imported description text is protected against spreadsheet formula
injection in the same way as article IDs.

## Local-First

OpenSlotting is intended to process imported warehouse data locally in the user's browser.

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

### V0.3 — Local Workspaces

- Create and reopen separate workspaces in browser-local storage
- Keep normalized order lines, source metadata, mappings, and validation results isolated per workspace
- Add or remove source exports only within the selected workspace
- Export or restore exactly one complete workspace per backup file
- Restore a backup as a new workspace or explicitly replace one existing workspace
- Never merge or mix two workspaces during restore
- Portable workspace backups for migration between browser profiles or `file:///` origins
- No mandatory cloud storage, backend, account, or network connection

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

The repository's `test-data` directory contains documented synthetic fixtures. They cover standard imports,
alternative column mappings, missing values, duplicates, invalid values,
malformed rows, and CSV quoting.

## Technology

V0.1 is implemented as a browser-based application using standard web technologies.

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
