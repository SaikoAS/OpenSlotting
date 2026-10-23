# Analysis desk variant

This branch presents the existing local order-line workflow in a dark analysis
desk. The left rail opens import, mapping, date coverage, period comparison,
article details, and workspace selection. The overview provides three analysis
levels, a chart, a searchable entity list, and a configurable order-line table.
The controls and labels are available in English and German.

## Navigation

The sidebar groups existing pages into **Analysis** (overview, articles,
comparison), **Warehouse** (editor, 3D analysis, walk) and **Data** (import,
source columns, coverage). The toggle switches between text-and-icon and
compact icon views; icons retain localized names and tooltips. The toggle
and workspace selection remain outside the scrolling category list on desktop.
Keyboard activation and an accessible active-page marker follow normal page
availability. The choice lasts for the current app session and does not change
workspace data or backups. Charts and tables resize to the available width.
Narrow screens retain horizontal navigation.

The former top and bottom banners are removed. **Settings** in the rail footer
is divided into **Global** (build/runtime details and local-processing
information) and **Workspace** (active identity, language and clearing data).
A Settings button on workspace selection is available before opening any
workspace. Language changes keep their existing workspace-save and rollback
behavior; without an open workspace the choice applies to this app session.
The active workspace remains visible beside the page title. Clearing data
requires confirmation and is disabled without a ready workspace containing
source files, or during a running operation. It removes source files, import
profiles and analysis/comparison results and resets comparison periods;
the workspace, warehouse layout and coverage notes remain.

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
- The entity list is scrollable through every matching ID; only the visible
  buttons are rendered. Its ranking can use all retained rows or the selected
  date window and follows the chosen metric (exact quantity or line count).
  Entities without rows in the window remain searchable with zero for that
  ranking. The footer shows how many normalized lines carry an ID at the
  selected level.
- The range controls affect the selected entity's chart, period summary, and source
  lines. The 30 and 90 day windows end on the latest delivery date in the
  opened data, not on today's date. "All dates" includes every valid date.
- Quantity totals use the existing scaled-integer representation. The chart
  converts totals to floating-point coordinates for drawing only; displayed
  totals remain exact. In day view the line connects consecutive observed
  days; in grouped views it connects adjacent buckets that have rows. Empty
  buckets break the line. Missing days are unknown coverage, not zero demand.
  Axis labels retain their proportions when the chart changes size. The left
  gutter adapts to localized number lengths. Quantity-axis ticks normally use
  up to three decimal places, with extra precision for small quantities;
  line-count ticks use integer intervals. These display choices do not round
  stored quantities, displayed totals, or the exact values in tooltips.
- The chart groups values by calendar day, ISO week (Monday to Sunday), or
  calendar month. Auto uses days for up to 45 calendar days, weeks through 180,
  and months for longer ranges. Each bucket adds only the selected entity's
  actual rows using exact quantity arithmetic. Empty buckets have no plotted
  value; they are not manufactured zero-demand observations.
- The coverage strip under the chart uses valid dated rows from the **whole
  workspace**, not merely the selected entity. Expected days follow the
  workspace's configured weekdays, as in period comparison. Green means every
  expected day in the bucket has at least one valid row, amber means some do,
  and gray means none do. A text summary states recorded and unknown expected
  days. This detects date presence, not completeness of each source export.
- The source table starts with the latest 25 rows. **All order lines** makes
  every dated, valid row for the selected entity and range accessible in the
  same scrollable table. Only the visible rows are placed in the page at once,
  so large selections do not create a table element for every source line.
  Source file and physical source line remain visible. Clicking an article
  opens the existing full detail view.
  On desktop, the table uses the remaining workspace height. The chart can
  shrink to keep table rows visible; scrolling stays inside the table and
  watchlist when the desk fits. Window, zoom and control-height changes update
  the virtual row viewport without resetting its scroll position. Very small
  windows or high browser zoom retain page scrolling and a compact table so
  all filters and controls remain reachable. Narrow screens keep the stacked
  layout.
- Date, customer, order and source filters search the full selected entity and
  range; using them switches the table to **All order lines**. Column headings
  sort those rows. The CSV button exports the currently displayed, filtered
  rows and selected columns, using exact decimal quantities and source evidence.
  Potential spreadsheet formulas in text fields are escaped.
- Clicking the chart selects the nearest observed day and filters the table.
  Holding the primary mouse button and dragging across the chart selects an
  inclusive calendar range, in either direction. The chosen dates populate
  the table's From/To fields and a highlighted band marks the range. Missing
  days inside it remain unknown rather than being turned into zero values.
  In week or month view a click selects that calendar bucket instead. The
  yellow period summary is always visible: without a date selection it shows
  the entire displayed period; otherwise it follows the selected dates. It
  shows exact quantity, line, order, and recorded-day counts, plus customers
  in the article view or articles in the customer/order views. Workspace date
  coverage is shown for the same interval. Other table text filters do not
  alter these totals. This compact summary replaces the duplicate KPI row
  above the chart, making more room for the order-line table.
  The day selector and From/To fields provide keyboard access; **Clear chart
  selection** returns the summary to the full main period. Chart selections
  do not change the main range or the chart's full-period total.
- **Choose columns** adds mapped article description, customer ID, Colli
  (`sales_unit_count`), quantity per selling unit, location, unit of measure,
  and active workspace custom fields. Missing optional values display as
  unavailable. These choices affect only the current desk view; they do not
  change imports, stored records, or the authoritative quantity field.

The desk uses local CSS and SVG. The standard Windows launcher uses the Python
loopback server and opens Edge maximized. The active development runtime is localhost; Portable Mode is indefinitely
paused with its source basis preserved in [portable-mode-paused.md](portable-mode-paused.md).

## Verification boundary

`node --test tests/*.test.cjs` covers the data model, runtime file serving,
and existing workflows. A synthetic CSV was also exercised in the Codex
in-app browser through a local loopback server. This is visual and interaction
evidence for that browser only; the exact branch has not yet been accepted in
Microsoft Edge through the localhost launcher for the current candidate.
Historical browser evidence does not establish current acceptance.
