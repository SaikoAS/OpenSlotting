# Synthetic test data

These files contain fictional data for V0.1 and V0.2 and are semicolon-separated. They are
UTF-8 encoded unless a different encoding is part of the documented test. The
canonical fixtures use these columns:

```text
order_id;article_id;quantity;order_date;customer_id;sales_value;location
```

Fixtures that exercise optional descriptions add an `Article Name` or equivalent
source column. The normalized key is always `article_name`.

## Fixtures

| File | Purpose | Expected checks |
| --- | --- | --- |
| `basic-orders.csv` | Small complete baseline | 12 order lines, 11 orders, 6 customers, 6 active days, total quantity 32 |
| `quantity-vs-frequency.csv` | Compare quantity and line frequency | `SKU-BULK`: 1 line/500 units; `SKU-FREQUENT`: 8 lines/8 units |
| `german-column-mapping.csv` | Alternative German headers and German number/date formats | `AuftragsNr`, `ArtNr`, `Menge`, `Datum`, `KdNr`, `Umsatz`, and `Stellplatz` must be configurable mappings |
| `optional-fields.csv` | Missing values in likely optional fields | Empty customer, sales value, and location values remain visible as missing |
| `duplicate-lines.csv` | Duplicate and repeated order lines | 5 lines, including 2 exact duplicates; no line may disappear silently without a defined rule |
| `invalid-values.csv` | Content validation | Missing article, missing quantity, zero and negative quantity, invalid date, and invalid sales value |
| `malformed-columns.csv` | Structural CSV validation | One row has too few and one has too many columns |
| `quoted-fields.csv` | CSV quoting | Semicolons inside quotes belong to the quoted field |
| `article-descriptions.csv` | Optional article descriptions and detail traceability | English mapping, empty values, identical and conflicting descriptions, quoted punctuation, formula-like text, and stable source lines |
| `compact-german-windows-1252.csv.hex` | Hex-encoded Windows-1252 bytes for compact German warehouse headers | Automatic mapping of `AuftrNr`, `ArtNr`, `Bezeichnung`, `GMenge`, `LfDat`, `KdNr`, `VkWert`, and `LgPl`; German characters survive decoding; the ASCII hex representation keeps the non-UTF-8 fixture byte-exact across Git and patch tooling |
| `multi-export-a.csv` | First source in the V0.2 multi-export scenario | Overlaps the second source by date range and contributes `SKU-MULTI` with exact quantity `0.1` |
| `multi-export-b.csv` | Second source in the V0.2 multi-export scenario | Contributes a second description and quantity `0.2` for `SKU-MULTI`; both source files and lines remain traceable |
| `multi-export-blocked.csv` | Blocking source in the V0.2 multi-export scenario | Missing the required order-date column; the file is excluded while ready files remain analyzable |

Select the two valid multi-export fixtures together for the basic V0.2 browser check. The combined result contains four valid rows, three articles, total quantity `5.3`, and an overlap warning for `2026-09-02` through `2026-09-03`. `SKU-MULTI` has two source files, two description variants, and exact total quantity `0.3`.

## German column mapping

The mapping in `german-column-mapping.csv` is:

| Source column | Internal field |
| --- | --- |
| `AuftragsNr` | `order_id` |
| `ArtNr` | `article_id` |
| `Menge` | `quantity` |
| `Datum` | `order_date` |
| `KdNr` | `customer_id` |
| `Umsatz` | `sales_value` |
| `Stellplatz` | `location` |

The expected normalization is, for example, `01.09.2026` → `2026-09-01`
and `19,98` → `19.98`. These rules are test assumptions and are not yet the
application's final import contract.

## Validation assumptions

`invalid-values.csv` and `malformed-columns.csv` are intentionally not fully
valid import files. They verify messages with source line and field references.
The exact treatment of zero quantities, negative quantities, and missing
optional fields must be defined in the V0.1 data contract.
