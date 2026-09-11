# OpenSlotting V0.2 Multi-Export Acceptance

Run this checklist on the exact V0.2 release candidate in Microsoft Edge Desktop on Windows. Open the extracted `index.html` directly through `file:///`; do not use a local server. Automated checks do not replace this manual run.

## Candidate record

| Item | Value |
| --- | --- |
| Candidate commit | `ebb6d6ec8333e564e63079d1eec6a60f3ab52495` |
| Tester | User-confirmed manual acceptance |
| Acceptance date | 2026-09-11 |
| Result | Passed (user-confirmed) |

The user confirmed the manual acceptance for the source tree at the commit above. Final release-package acceptance remains a separate release step.

## Automated checks

- [x] `node --check csv.js`
- [x] `node --check app.js`
- [x] `node --check encoding.js`
- [x] `node --test tests/*.test.cjs`
- [x] required GitHub Actions `quality` check passes on the exact candidate
- [x] release packaging succeeds from the exact candidate commit

## Microsoft Edge direct-file checks

Use only the synthetic files in `test-data`.

1. [x] `index.html` opens directly through `file:///` without a server or network connection.
2. [x] The file picker accepts `multi-export-a.csv` and `multi-export-b.csv` together.
3. [x] Both files show their detected encoding and independent column mappings; changing one encoding or removing one file does not alter the other.
4. [x] The combined analysis includes 2 files, 4 valid rows, 3 articles, and total quantity `5.3`.
5. [x] An overlap warning identifies `2026-09-02` through `2026-09-03` and explains that no rows were removed.
6. [x] `SKU-MULTI` has quantity `0.3`, two descriptions, and two contributing source files.
7. [x] `SKU-MULTI` details identify the correct source file and source line for both rows.
8. [x] The analysis export contains `source_file_count` and JSON-encoded `source_files` values.
9. [x] Selecting a ready fixture together with `multi-export-blocked.csv` excludes only the blocked file.
10. [x] Per-file and combined valid/invalid row counts remain visible.
11. [x] Validation notes show both source file and source line.
12. [x] Filtering, sorting, pagination, article details, and export continue to work on combined data.
13. [x] Switching between English and German updates all new multi-file text.
14. [x] Reset clears the complete in-memory batch.
15. [x] Reloading the page does not restore the batch; persistent workspaces are not part of V0.2.

Record any failure with the exact candidate commit and synthetic fixture. Do not use operational exports, screenshots, or identifiers in repository evidence.
