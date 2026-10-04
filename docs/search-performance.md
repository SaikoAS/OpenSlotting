# Search and sort projection benchmark

Issue #36 keeps article search and sorting deterministic while avoiding repeated
locale-aware field normalization and repeated view sorting. Each analyzed
article receives a `search_text` projection for the active locale. The browser
also memoizes the filtered/sorted article view until its analysis, query,
filter, sort mode, or language changes.

Run the synthetic benchmark locally with:

```text
node tools/benchmark-search-sort.cjs 50000 8
```

The benchmark compares repeated uncached field normalization and sorting with
one prepared projection and one cached sorted view. The reported times are
machine-specific; rerun it on the target workstation when recording a release
baseline. Measured on the development workstation (Node.js, 50,000 articles,
8 passes):

```json
{
  "articles": 50000,
  "passes": 8,
  "uncached_ms": 388.51,
  "cached_ms": 10.62,
  "speedup": 36.58
}
```

The exact values are machine-specific; rerun the command on the target
workstation for a release baseline. Correctness is covered by the CSV and
period-comparison tests, including description variants and locale projection
refresh.

## Terminal entity projections

The localhost continuation also keeps weakly referenced, locale-specific label
and secondary-text projections for the analysis desk. It preserves full-string
substring matching for articles, customers and orders, leading zeros and the
current ranking. Entity mutations and locale changes rebuild projections; the
existing cache for an identical repeated query remains in place. See
[terminal-search.md](performance/terminal-search.md) for separate preparation
costs, varied-query measurements and exact-result checks.
