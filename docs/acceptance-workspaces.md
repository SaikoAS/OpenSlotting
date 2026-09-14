# OpenSlotting Persistent Local Workspaces Acceptance

Run this checklist on the exact feature or release candidate in Microsoft Edge Desktop on Windows. Open the complete extracted application directly through `file:///`; do not use a local server. Use only the synthetic files in `test-data`. Automated checks do not replace this visible Edge acceptance run.

## Candidate

| Item | Value |
| --- | --- |
| Candidate commit | |
| ZIP or source-tree path | |
| Extraction path | |
| Windows version | |
| Microsoft Edge version | |
| Browser profile | |
| Tester | |
| Date | |
| Result | Pending |

## Automated checks

- [ ] `node --check csv.js`
- [ ] `node --check app.js`
- [ ] `node --check encoding.js`
- [ ] `node --check workspace.js`
- [ ] `node --check storage.js`
- [ ] `node --test tests/*.test.cjs`
- [ ] `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/windows-launcher.test.ps1`
- [ ] `pwsh -NoProfile -File tests/windows-launcher.test.ps1`
- [ ] `git diff --check` reports no whitespace errors
- [ ] required GitHub Actions `quality` check passes on the exact candidate
- [ ] release packaging from the exact commit contains `workspace.js`, `storage.js`, and the workspace documentation
- [ ] runtime files contain no unexpected network, CDN, telemetry, backend, localhost, or `localStorage` workspace dependency

## Storage availability and startup

1. [ ] `index.html` opens through `file:///` with the network unavailable.
2. [ ] The workspace panel reports IndexedDB availability without a backend or server.
3. [ ] With no stored workspace, CSV selection is disabled and the UI explains how to continue.
4. [ ] A named workspace can be created.
5. [ ] A selected workspace can be renamed from the overview without loading its full payload.
6. [ ] Closing every Edge window and reopening the same `file:///` application immediately shows the metadata overview without loading a workspace payload.
7. [ ] Starting through `Start-OpenSlotting.cmd` exposes the same workspace state as direct opening in the same Edge profile and origin.
8. [ ] Private browsing behavior is documented separately and is not presented as durable storage.
9. [ ] The last-used workspace is marked but is not automatically opened.
10. [ ] Selecting and opening a workspace shows visible phases for payload loading, validation, source preparation, and analysis.
11. [ ] Cancelling during background preparation returns to the usable overview without replacing the currently open workspace.
12. [ ] Edge DevTools confirms that preparation runs in a worker and the main UI remains responsive.

## Import persistence and provenance

13. [ ] Import and analyze `multi-export-a.csv` and `multi-export-b.csv` in one workspace.
14. [ ] Close Edge completely, reopen the application, explicitly open the marked workspace, and confirm that both sources and the analysis return.
15. [ ] Mapping, detected encoding, valid/invalid counts, validation notes, raw values, source-file labels, and physical source lines remain equivalent.
16. [ ] Exact quantity `0.3` for `SKU-MULTI` survives restart without floating-point artifacts.
17. [ ] Changing a mapping is saved automatically and survives restart.
18. [ ] Changing a source encoding is saved automatically and survives restart.
19. [ ] Adding another source changes only the active workspace.
20. [ ] Removing one source changes only the active workspace and recalculates after analysis.
21. [ ] A visible storage or quota failure is not reported as a successful save.

## Strict workspace isolation

22. [ ] Create two differently named workspaces.
23. [ ] Import different synthetic files into each workspace.
24. [ ] Switching workspaces restores only the selected workspace's sources, mappings, notes, and analysis.
25. [ ] Renaming one workspace does not modify the other.
26. [ ] Clearing one workspace requires confirmation and removes no data from the other.
27. [ ] Deleting one workspace requires confirmation and removes no data from the other.
28. [ ] The last active workspace selection survives a complete Edge restart as a marker without automatic payload loading.

## Storage overview

29. [ ] The UI shows the number of stored workspaces.
30. [ ] When `navigator.storage.estimate()` returns usable values, approximate usage, quota, and remaining browser quota are shown.
31. [ ] The text does not describe the estimate as guaranteed free disk space.
32. [ ] When the estimate is unavailable, a clear non-error fallback is shown instead of zero or invented values.
33. [ ] When the estimate call fails, the failure is shown without hiding otherwise usable workspaces.

## Backup and restore

34. [ ] Exporting a workspace downloads exactly one `.workspace.json` backup.
35. [ ] The backup contains all sources, original bytes, mappings, normalized rows, validation state, metadata, and provenance required for an equivalent workspace.
36. [ ] Restore as new creates a separate workspace and changes no existing workspace.
37. [ ] The restored workspace reproduces the source counts, row counts, article analysis, mappings, exact quantities, validation notes, source files, and source lines.
38. [ ] Replace from backup names the selected target and requires explicit confirmation.
39. [ ] Cancelling the replacement confirmation changes nothing.
40. [ ] Confirmed replacement changes only the selected target workspace.
41. [ ] No restore path offers or performs a merge.
42. [ ] Invalid JSON is rejected without changing stored data.
43. [ ] A truncated backup is rejected without changing stored data.
44. [ ] A backup with an unsupported format version is rejected without changing stored data.
45. [ ] A backup with a newer workspace schema is rejected without changing stored data.
46. [ ] A backup with duplicate source IDs or cross-workspace provenance is rejected without changing stored data.

## Language, privacy, and portability boundary

47. [ ] Every workspace, storage, confirmation, backup, restore, progress, cancellation, and error state is usable in English.
48. [ ] Every corresponding state is usable in German.
49. [ ] The selected language survives return to the overview and explicit workspace reopen.
50. [ ] The complete workflow remains usable with the network unavailable.
51. [ ] No operational source, backup, screenshot, identifier, or browser storage is committed or uploaded as acceptance evidence.
52. [ ] Clearing Edge site data removes browser-local workspaces and is documented as outside OpenSlotting's control.
53. [ ] Copying or moving the application and changing the browser profile are tested; any origin-dependent storage difference is recorded.
54. [ ] Exporting and restoring a backup is confirmed as the supported migration path between origins or browser profiles.

Record every failure with the exact candidate commit, synthetic fixture, browser profile, Windows version, Edge version, and whether the application was opened directly or through the launcher.
