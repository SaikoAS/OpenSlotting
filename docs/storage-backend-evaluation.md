# SQLite/OPFS backend evaluation (Issue #37)

## Scope and boundary

This is an exploratory, Node-only prototype. It compares the current
chunk-oriented IndexedDB persistence shape with SQLite's indexed row storage;
it does not change the browser application, the `file:///` Portable Mode, or
the supported IndexedDB adapter. Node 24's built-in `node:sqlite` is used as a
stand-in for a future browser SQLite/OPFS driver. A browser SQLite/OPFS engine
is not bundled or selected by this experiment.

The prototype stores the same logical fields in both backends:

```sql
CREATE TABLE order_lines (
  row_key TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  source_line INTEGER NOT NULL,
  order_id TEXT NOT NULL,
  article_id TEXT NOT NULL,
  quantity_scaled TEXT NOT NULL,
  order_date TEXT NOT NULL,
  customer_id TEXT,
  location TEXT,
  sales_value_exact TEXT
) WITHOUT ROWID;
```

Indexes cover `article_id`, `order_date`, and `(article_id, order_date)`. Exact
quantities remain scaled-integer text, and source ID/line provenance is checked
after both period and article-detail queries.

## Reproduce the measurements

The benchmark creates deterministic synthetic rows and never writes operating
data. It reports import/write time, reopen time, period query time, article
detail query time, stored bytes, peak RSS, row counts, and exact semantic
checks:

```text
node --expose-gc tools/benchmark-storage-backends.cjs 50000 both
node --expose-gc tools/benchmark-storage-backends.cjs 700000 both
node --expose-gc tools/benchmark-storage-backends.cjs 2000000 sqlite
```

The `both` mode runs the fake IndexedDB baseline first and SQLite second in one
process. Use `sqlite` or `indexeddb` when comparing peak memory in isolation;
the fake IndexedDB model intentionally exercises the current chunk-copy path
and is not a measurement of a particular browser's implementation.

## Measurements on the development workstation

The 700,000-row run used the same five-day period (`2026-09-05..2026-09-09`)
and article detail query (`SKU-00042`). Times are milliseconds and storage is
decimal bytes.

| Backend | Write | Open | Period query | Detail query | Stored bytes | Peak RSS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| IndexedDB chunk prototype | 58,302.17 | 19.42 | 900.11 | 16.01 | 185,722,800 | 2,515.3 MiB |
| SQLite Node prototype | 6,746.79 | 22.33 | 452.39 | 0.93 | 172,990,464 | 141.9 MiB |

The 2,000,000-row SQLite-only run completed with 30,514.23 ms write,
64.04 ms open, 1,371.08 ms period query, 2.23 ms detail query,
504,475,648 stored bytes, and 364.4 MiB peak RSS. Both runs returned the same
700,000-row comparison backends returned identical period quantity/provenance
and detail quantity/provenance checks; the 2,000,000-row run passed the same
checks for SQLite.

These numbers are directional, not browser acceptance evidence. The fake
IndexedDB baseline has intentionally expensive structured cloning, while
`node:sqlite` is a native Node implementation. A browser OPFS result requires
a separately selected, supported SQLite/WASM driver and a real Edge run.

## Decision and migration boundary

Do not adopt SQLite/OPFS as the production backend yet. The prototype shows a
credible scalability path for indexed period/detail queries, but it does not
answer browser-driver availability, OPFS durability behavior, quota semantics,
concurrency, or worker integration.

If a future experiment proceeds, it must implement a runtime-neutral adapter
behind the existing workspace contract. The adapter must:

1. keep Portable Mode and the IndexedDB path available;
2. preserve exact quantity/sales text and source provenance;
3. use the existing portable workspace backup as the migration boundary;
4. validate row counts and semantic checks before activation; and
5. fall back to IndexedDB before mutating a workspace when SQLite/OPFS is
   unavailable, opens read-only, exceeds quota, or fails a consistency check.

The current runtime capability registry therefore continues to report SQLite as
unavailable, and no production workspace is silently migrated by this issue.
The existing workspace backup/restore round-trip tests remain the compatible
portable migration boundary; this prototype adds no backend-specific backup
format.
