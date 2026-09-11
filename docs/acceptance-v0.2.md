# OpenSlotting V0.2 Multi-Export Acceptance

Run this checklist on the exact V0.2 release candidate in Microsoft Edge Desktop on Windows. Open the extracted `index.html` directly through `file:///`; do not use a local server. Automated checks do not replace this manual run.

## Candidate record

| Item | Value |
| --- | --- |
| Candidate commit | |
| Tester | |
| Acceptance date | |
| Result | Pending |

## Automated checks

- [ ] `node --check csv.js`
- [ ] `node --check app.js`
- [ ] `node --check encoding.js`
- [ ] `node --test tests/*.test.cjs`
- [ ] required GitHub Actions `quality` check passes on the exact candidate
- [ ] release packaging succeeds from the exact candidate commit

## Microsoft Edge direct-file checks

Use only the synthetic files in `test-data`.

1. [ ] `index.html` opens directly through `file:///` without a server or network connection.
2. [ ] The file picker accepts `multi-export-a.csv` and `multi-export-b.csv` together.
3. [ ] Both files show their detected encoding and independent column mappings; changing one encoding or removing one file does not alter the other.
4. [ ] The combined analysis includes 2 files, 4 valid rows, 3 articles, and total quantity `5.3`.
5. [ ] An overlap warning identifies `2026-09-02` through `2026-09-03` and explains that no rows were removed.
6. [ ] `SKU-MULTI` has quantity `0.3`, two descriptions, and two contributing source files.
7. [ ] `SKU-MULTI` details identify the correct source file and source line for both rows.
8. [ ] The analysis export contains `source_file_count` and JSON-encoded `source_files` values.
9. [ ] Selecting a ready fixture together with `multi-export-blocked.csv` excludes only the blocked file.
10. [ ] Per-file and combined valid/invalid row counts remain visible.
11. [ ] Validation notes show both source file and source line.
12. [ ] Filtering, sorting, pagination, article details, and export continue to work on combined data.
13. [ ] Switching between English and German updates all new multi-file text.
14. [ ] Reset clears the complete in-memory batch.
15. [ ] Reloading the page does not restore the batch; persistent workspaces are not part of V0.2.

Record any failure with the exact candidate commit and synthetic fixture. Do not use operational exports, screenshots, or identifiers in repository evidence.
