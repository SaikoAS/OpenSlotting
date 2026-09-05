# Synthetic test data

These files contain fictional data for V0.1. They are UTF-8 encoded and
semicolon-separated. The canonical fixtures use these columns:

```text
order_id;article_id;quantity;order_date;customer_id;sales_value;location
```

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
