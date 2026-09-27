# Analysis desk variant

This branch presents the existing local order-line workflow in a dark analysis
desk. The left rail opens import, mapping, date coverage, period comparison,
article details, and workspace selection. The overview provides three analysis
levels, a chart, a searchable entity list, and up to 25 recent source lines.
The controls and labels are available in English and German.

## Data shown

- The input is `result.rows`: validated, normalized **order lines** from the
  opened workspace. Article-master rows and invalid order lines do not enter
  the desk's quantities. Original CSV files and source lines remain available
  through the existing source review and article detail views.
- Article identity is `article_id`. Customer identity is `customer_id`; rows
  without it stay in the source data but do not appear in customer groups.
- Order identity is the pair (`customer_id` or empty string, `order_id`).
  This keeps equal order IDs for different customers separate. Rows without
  `order_id` do not appear in order groups. A repeated order ID with no
  customer ID remains ambiguous and is grouped under the empty customer key.
- The entity list is ordered by total exact quantity over **all** retained
  order lines. Its search checks ID and available name. The footer shows how
  many normalized lines carry an ID at the selected level.
- The range controls affect the selected entity's chart, KPI cards, and source
  lines. The 30 and 90 day windows end on the latest delivery date in the
  opened data, not on today's date. "All dates" includes every valid date.
- Quantity totals use the existing scaled-integer representation. The chart
  converts totals to floating-point coordinates for drawing only; displayed
  totals remain exact. The line connects only consecutive **observed** days.
  Missing days are unknown coverage, not zero demand.
- The source table shows up to 25 latest rows, including file and physical
  source line. Clicking an article opens the existing full detail view.

The desk uses local CSS and SVG. The standard Windows launcher uses the Python
loopback server and opens Edge maximized. Direct Edge `file:///` remains an
independent runtime that does not require Python for import or analysis.

## Verification boundary

`node --test tests/*.test.cjs` covers the data model, runtime file serving,
and existing workflows. A synthetic CSV was also exercised in the Codex
in-app browser through a local loopback server. This is visual and interaction
evidence for that browser only; the exact branch has not yet been accepted in
Microsoft Edge with `file:///` or on a real warehouse export.
