# Period Comparison Acceptance Checklist

Use synthetic or approved non-sensitive CSV files. Do not attach operational exports to issues or commits.

## Automated checks

- [ ] `node --check app.js`
- [ ] `node --check csv.js`
- [ ] `node --check periods.js`
- [ ] `node --check storage.js`
- [ ] `node --check workspace.js`
- [ ] `node --test tests/*.test.cjs`

## Import and mapping

- [ ] Required fields and optional fields are visually distinct.
- [ ] `Colli` or `VKU` maps to Selling units / Colli.
- [ ] `Menge pro VKU` maps to Quantity per selling unit.
- [ ] `Colli = 0` remains valid and represents a pure partial sale or remainder.
- [ ] Invalid negative, malformed, zero-content, or over-precision optional unit values remain traceable as advisory notes and do not exclude otherwise valid rows.
- [ ] Quantity remains unchanged and included when the optional unit product is smaller; the difference is shown as a partial sale, not a data-quality error.
- [ ] A selling-unit product greater than total quantity is shown as a consistency warning without changing or excluding the row.

## Coverage and periods

- [ ] Observed date range and distinct observed dates match the synthetic input.
- [ ] Valid dates are grouped into ISO calendar weeks from Monday through Sunday, including the correct ISO week-year across New Year.
- [ ] Period A and Period B each offer every detected calendar week and initially select the two latest available weeks.
- [ ] Switching to `Custom periods` exposes editable names and inclusive start/end dates; switching back restores selectable calendar weeks.
- [ ] Source and date evidence views distinguish valid rows from dated validation issues and retain source lines.
- [ ] Deselecting a weekday removes it from expected-date coverage.
- [ ] A missing expected date is shown as unknown and is not shown as zero demand.
- [ ] Invalid or reversed period boundaries cannot start a comparison.
- [ ] Overlapping periods produce a visible warning.
- [ ] Period mode and settings survive closing and reopening the workspace and a backup round trip.

## Comparison and export

- [ ] Summary values for Period A, Period B, absolute change, and percentage change match hand calculations.
- [ ] A zero Period A quantity shows no relative percentage.
- [ ] Search, change-state filters, incomplete-data filter, unit-conflict filter, sort, and pagination behave correctly.
- [ ] Opening an article reaches source-file and source-line detail rows.
- [ ] Comparison CSV contains both period boundaries, unit metrics, data-quality flags, and formula-safe text.

## Visual and runtime acceptance

- [ ] At 1440 × 900 the compact header, workflow rail, period cards, and comparison table remain readable without overlap.
- [ ] At a narrow viewport the workflow rail scrolls horizontally and period cards stack.
- [ ] English and German labels fit without clipping.
- [ ] Portable `file:///` and Enhanced Local Mode use the same source files and behavior.
- [ ] Microsoft Edge visual acceptance is recorded separately; automated logic or headless checks do not substitute for it.
