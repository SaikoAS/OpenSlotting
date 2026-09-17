# Data Coverage and Period Comparison

This document defines the coverage and comparison behavior of the current OpenSlotting development implementation.

## Inputs and boundaries

Period comparison uses only valid normalized rows from included source files. Period A and Period B each have a name, an inclusive `YYYY-MM-DD` start date, and an inclusive `YYYY-MM-DD` end date. Both periods may have different lengths. If they overlap, OpenSlotting warns that the same normalized row can be part of both periods; it does not silently alter either period.

The default selection mode groups valid `order_date` values into ISO calendar weeks running from Monday through Sunday. Only weeks containing at least one valid imported row are offered. Each option shows its ISO week-year, full calendar boundaries, and contributing row count. The two latest detected weeks are selected initially; with only one detected week, both comparison sides select that week and the normal overlap warning applies.

The user can switch to custom periods at any time and edit the names and inclusive boundaries directly. The selection mode, configured period names, boundaries, and expected weekdays are stored in the active workspace and included in its backup. Comparison results themselves are derived and are recalculated from normalized rows.

For the standard CSV analysis path, both period accumulators and their coverage
accumulators consume the combined row stream in one pass. Rows that belong to
both periods are sent to both accumulators, preserving overlap semantics. A
compatibility fallback remains available for callers that provide an analysis
function without the incremental accumulator contract.

## Coverage semantics

The user selects which weekdays are expected to contain exported activity. All seven weekdays are selected by default. For each period OpenSlotting enumerates those expected calendar dates and compares them with distinct normalized `order_date` values.

Coverage states are:

- `complete`: every expected date has at least one valid imported row
- `partial`: at least one valid row exists, but one or more expected dates have no valid imported row
- `empty`: no valid imported row falls inside the period
- `unavailable`: the period boundaries are incomplete or invalid

A date without an imported row is unknown coverage. It is never interpreted as a confirmed zero-demand day. This rule applies to the summary and every article comparison. Source files contributing rows to each period remain listed in the derived coverage result.

The coverage workspace also lists each source file and observed date. Its evidence view distinguishes valid normalized rows, non-blocking advisory notes, and excluded rows. An excluded row contributes to a date only when its mapped order date is itself valid; rows with invalid dates remain attributable to their source file but are not assigned to an invented date.

## Metrics

The comparison shows Period A and Period B values plus the B-minus-A change for:

- valid order lines
- authoritative total quantity
- distinct orders
- distinct customers
- distinct active observed days
- exact sales value and the number of rows carrying a sales value
- mapped selling units / VKU / Colli
- the number of rows carrying a mapped selling-unit count

Article rows additionally show the exact absolute quantity change and the relative quantity change. Relative change is `(B - A) / A × 100`. It is unavailable when Period A quantity is zero; OpenSlotting does not invent an infinite percentage. An article is classified as `new`, `inactive`, `increased`, `decreased`, or `unchanged` from its period presence and authoritative quantity.

## Selling units

`quantity` stays authoritative and represents complete selling units plus a possible partial unit or remainder. Optional `sales_unit_count` and `quantity_per_sales_unit` values are additional operational measures. A zero selling-unit count is valid. When both values exist on a row, their exact product is compared with quantity: a smaller product is a valid partial sale, while only a larger product is a consistency warning. Invalid optional values are ignored with a traceable advisory and do not exclude the row. Multiple quantity-per-selling-unit values for one article are marked as a unit conflict.

## Filters and export

The article comparison can be searched by article ID or description, filtered by change state, incomplete date coverage, or selling-unit conflict, and sorted by absolute quantity change, percentage change, or article ID. The Open action shows a period-specific article detail with both metric sets and the contributing source file and source line for every order row.

The comparison CSV uses semicolons, CRLF line endings, stable English headers, exact quantity formatting, period boundaries, source-file collections, and spreadsheet-formula protection for untrusted text. Exporting does not change the workspace.

## Deliberate limits

- Missing expected dates are not imputed.
- Different period lengths are not automatically normalized to daily averages.
- Calendar-week options are derived only from valid imported rows; OpenSlotting does not invent empty weeks between observed weeks.
- Overlapping source exports are not deduplicated.
- Selling-unit overage warnings and unit conflicts are not treated as ERP correction rules.
- The comparison does not yet provide ABC/XYZ classification, forecasting, or slotting recommendations.
