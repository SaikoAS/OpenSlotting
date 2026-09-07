# OpenSlotting

OpenSlotting is an open-source, local-first web tool for analyzing warehouse order lines and building a data-driven foundation for warehouse slotting.

The project starts with a deliberately small scope: importing and analyzing order-line data in the browser. Future versions are planned to expand this foundation toward ABC/XYZ classification, configurable master data, slotting scores, and warehouse slotting recommendations.

> **Project status:** V0.1 CSV import and order-line analysis foundation implemented.

## Current V0.1 implementation

OpenSlotting currently provides a browser-local first feature for importing and
analyzing order-line CSV files. Open `index.html` directly in a supported
browser, choose a CSV file, review the detected column mapping, and start the
analysis.

The current implementation includes:

- semicolon-separated CSV parsing with quoted fields
- automatic mapping for canonical and common German column names
- ISO and German date normalization
- decimal-point and decimal-comma number parsing
- validation with source line and field information
- preservation of raw field positions, including duplicate rows
- article aggregation with quantity and order-line frequency kept separate
- filtering, sorting, and analysis CSV export
- paginated article rendering with 100 rows per page for large imports
- English as the default interface language, with German available from the language selector

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

## Initial Scope

The first version will focus exclusively on **order-line analysis**.

A typical order-line dataset may contain fields such as:

- Order ID
- Article / SKU ID
- Quantity
- Date
- Customer ID
- Sales value
- Current storage location

Only a small subset of these fields should be required.

Different ERP, WMS, and CSV export formats should be supported through configurable column mapping instead of hard-coded field names.

## Planned V0.1 Workflow

1. Import a CSV file
2. Detect available columns
3. Map source columns to OpenSlotting fields
4. Validate the imported data
5. Normalize the data internally
6. Aggregate order lines by article
7. Calculate basic warehouse activity metrics
8. Sort and filter the results
9. Export analysis results

## Planned Metrics

The initial analysis is expected to include metrics such as:

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
| AuftragsNr | Order ID |
| OrderNumber | Order ID |
| Menge | Quantity |
| Qty | Quantity |

Users should be able to define the mapping once and later reuse it as an import profile.

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
- Filtering and sorting
- CSV export

### V0.2 — ABC / XYZ Analysis

- ABC classification
- Configurable ABC thresholds
- Time-based demand analysis
- XYZ classification
- Combined ABC/XYZ matrix

### V0.3 — Article Master Data

- Configurable article master data
- Additional article attributes
- Custom fields
- Import profiles

### V0.4 — Existing Storage Locations

- Current storage locations
- Storage zones
- Location attributes
- Comparison of article activity and current location

### V0.5 — Slotting Evaluation

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

The repository includes documented synthetic fixtures in
[`test-data/README.md`](test-data/README.md). They cover standard imports,
alternative column mappings, missing values, duplicates, invalid values,
malformed rows, and CSV quoting.

## Technology

The project is currently planned as a browser-based application using standard web technologies.

Initial direction:

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

OpenSlotting is in an early stage.

Ideas, discussions, bug reports, feature proposals, and contributions are welcome as the project develops.

Before implementing large features, opening an issue to discuss the intended behavior and data model is recommended.

## License

OpenSlotting is released under the MIT License.

See the `LICENSE` file for details.

---

**OpenSlotting starts with the data behind slotting: order lines.**

Understand warehouse activity first. Classify articles second. Optimize storage locations afterwards.
