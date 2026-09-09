# OpenSlotting V0.1 Data Format

This document defines the import, normalization, and analysis-export contract implemented by OpenSlotting 0.1.x. It describes current behavior, not planned features.

## Input file

The browser interface accepts CSV files encoded as UTF-8 or UTF-16. Windows-1252 and other legacy encodings are not supported in V0.1. The default delimiter is a semicolon (`;`). The first parsed record is required as the header row.

The CSV parser supports:

- quoted fields
- doubled quotes (`""`) inside quoted fields
- delimiters and physical line breaks inside quoted fields
- CRLF, LF, and CR line endings
- an optional Unicode byte-order mark

An unexpected quote in an unquoted field, a character after a closing quote, or an unterminated quoted field is a parser error. A delimiter other than the default can be supplied by code, but it must be exactly one character; the V0.1 browser interface uses semicolons.

## Normalized fields

| Field | Required | Meaning |
| --- | --- | --- |
| `order_id` | Yes | Order identity. Non-empty text. |
| `article_id` | Yes | Article/SKU identity and grouping key. Non-empty text. |
| `article_name` | No | Display description for the article. |
| `quantity` | Yes | Positive quantity with at most seven decimal places. |
| `order_date` | Yes | Valid order date in an accepted format. |
| `customer_id` | No | Customer identity used for distinct-customer counts. |
| `sales_value` | No | Sales amount with at most two decimal places. |
| `location` | No | Source storage-location text. |

Mapped text values are trimmed at their outer edges. Missing optional values normalize to `null`. A valid normalized row also retains all original fields by source position and the one-based physical source line on which its CSV record starts. This preserves duplicate headers, duplicate rows, and traceability. Only valid rows are included in the analysis.

## Column mapping

Header matching is case-insensitive. It ignores outer whitespace, punctuation, and common German characters by normalizing `ä`, `ö`, `ü`, and `ß` to `ae`, `oe`, `ue`, and `ss`.

The following aliases are detected automatically:

| OpenSlotting field | Accepted automatic aliases |
| --- | --- |
| `order_id` | `order_id`, `order id`, `ordernumber`, `order number`, `auftragsnr`, `auftragsnummer` |
| `article_id` | `article_id`, `article id`, `sku`, `material`, `artnr`, `artikelnummer` |
| `article_name` | `article_name`, `article name`, `article description`, `description`, `product name`, `artikelbezeichnung`, `bezeichnung`, `artikeltext`, `kurztext` |
| `quantity` | `quantity`, `qty`, `menge`, `anzahl`, `stück`, `stueck` |
| `order_date` | `order_date`, `order date`, `date`, `datum`, `bestelldatum` |
| `customer_id` | `customer_id`, `customer id`, `customer`, `kdnr`, `kundennummer` |
| `sales_value` | `sales_value`, `sales value`, `sales`, `revenue`, `umsatz`, `wert` |
| `location` | `location`, `storage location`, `stellplatz`, `lagerplatz` |

The mapping screen permits a manual source-column selection for the current import. V0.1 does not persist reusable import profiles. Automatic detection assigns the first unused matching source column. A source column cannot be mapped to more than one OpenSlotting field. A reused source column or a missing required mapping prevents row import until the mapping is corrected.

## Validation behavior

Parser errors and row-validation errors have different scopes:

- A parser error in the header prevents the complete import because no reliable mapping can be established.
- A parser error in a data record excludes that record and reports its source line.
- A record whose field count differs from the header is excluded as a structural error.
- A record that fails required-value, number, precision, or date validation is excluded as a complete row.
- Valid records remain available even when other records are invalid.

Validation messages identify the source line and, where applicable, the normalized field. Source lines are one-based physical lines. A quoted record spanning multiple physical lines is attributed to the line on which that record begins.

## Numbers

Leading and trailing whitespace is ignored. Internal whitespace is rejected. An optional leading sign and either a decimal point or decimal comma are accepted. A leading decimal separator, such as `.5` or `,5`, is accepted. Exponents, grouped thousands, and values containing both comma and point are rejected.

### Quantity

- The value must be greater than zero.
- At most seven decimal places are accepted.
- The normalized representation is an integer with fixed scale `10^7`.
- For example, `1.2345678` becomes `12345678` internally.
- Aggregation, display, and export use that exact fixed-point value and do not add quantities with JavaScript floating-point arithmetic.

### Sales value

- The field is optional; zero and negative values are accepted.
- At most two decimal places are accepted.
- The value must be finite and within JavaScript's safe integer magnitude.
- A value is rejected if conversion to a JavaScript number would lose its accepted decimal value.
- Accepted values also retain an exact decimal representation, and totals are aggregated with exact decimal arithmetic.
- The exported total is rounded to two decimal places.

## Dates

The following calendar-date forms are accepted:

- `YYYY-M-D` and `YYYY-MM-DD`
- `D.M.YYYY` and `DD.MM.YYYY`
- `D/M/YYYY` and `DD/MM/YYYY`

The date must exist in the calendar. Accepted dates normalize to `YYYY-MM-DD`. Times, time zones, month names, and other date forms are not supported.

## Article descriptions and search

`article_id` is always the article grouping identity. `article_name` is optional display metadata and never changes grouping.

For each article ID, the first non-empty description in source order becomes the primary displayed description. All distinct, non-empty, case-sensitive descriptions are retained in source order as variants. More than one variant sets the description-conflict flag. Empty descriptions do not create a conflict. Article search covers the article ID, the primary description, and every retained description variant.

## Analysis CSV export

The analysis export uses semicolons and CRLF line endings by default. Its stable English headers, in order, are:

| Header | Meaning |
| --- | --- |
| `article_id` | Article grouping identity. |
| `article_name` | Primary description, or empty. |
| `article_name_conflict` | `true` when multiple non-empty variants exist; otherwise `false`. |
| `article_name_variants` | JSON array of retained descriptions, or empty when none exist. |
| `order_line_count` | Number of valid imported rows for the article. |
| `total_quantity` | Exact sum at the supported seven-place quantity precision. |
| `distinct_orders` | Number of distinct non-empty order IDs. |
| `distinct_customers` | Number of distinct non-empty customer IDs. |
| `active_days` | Number of distinct normalized order dates. |
| `total_sales` | Exact accepted sales total, serialized to two decimal places; empty when no sales values exist. |
| `sales_value_rows` | Number of rows containing an accepted sales value. |
| `share_of_order_lines` | Article line count divided by all valid order lines. |
| `cumulative_share_of_order_lines` | Running line share in the current analysis order. |
| `locations` | JSON array of distinct non-empty locations, or empty when none exist. |

Share values are serialized adaptively without a fixed six-decimal rounding rule. JSON collection fields are CSV-quoted as needed, so commas inside a description or location remain unambiguous.

Before export, untrusted text that starts, after optional whitespace, with `=`, `+`, `-`, or `@` receives a leading apostrophe to reduce spreadsheet formula-injection risk. This protection applies to exported article IDs, the primary description, and the serialized description-variant field. CSV quoting is then applied to all fields when required by the delimiter, quotes, or line breaks.

## Runtime and privacy boundary

Import and analysis run in the browser. Normal use requires no upload, backend, local server, internet connection, Node.js, or Python. Opening `index.html` directly through `file:///` is the V0.1 runtime model. See [SECURITY.md](../SECURITY.md) for repository and operational-data rules.
