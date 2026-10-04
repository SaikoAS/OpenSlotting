# Localhost acceptance

Run on the exact candidate with fully synthetic data. Record visible Edge
behavior separately from automated results. Portable Mode is indefinitely
paused and is not a second current runtime acceptance target.

## Candidate

| Item | Value |
| --- | --- |
| Candidate commit and extracted folder | |
| Windows version | |
| Python version and path | |
| Edge version and profile | |
| Tester and date | |
| Result | Pending |

## Startup

- [ ] The package contains all assets/helpers without new executable or package dependencies.
- [ ] Existing approved Python 3.8+ is sufficient, with no pip/npm install or administrator action.
- [ ] Standard start opens maximized Edge app mode at the fixed localhost origin.
- [ ] Header and diagnostics show Localhost in English and German.
- [ ] Reuse and stop act only on the verified server belonging to this folder.
- [ ] A foreign listener or different folder is rejected without being stopped.
- [ ] Missing Python gives approved-runtime instructions without downloads or a file fallback.
- [ ] Standard and compatibility shortcuts work and preserve unrelated shortcuts.
- [ ] Standard and compatibility stop commands work.
- [ ] Direct file access shows the Portable pause before any workspace database opens.
- [ ] Non-loopback hosted origins do not initialize workspaces.

## Existing functions

- [ ] Workspace create/open/rename/clear/delete/reopen remain isolated.
- [ ] Encoding, mapping, preparation rules, named filters, custom fields and profiles work.
- [ ] Order-line/master import retains source bytes, raw fields and line evidence.
- [ ] Quantity, frequency, customer/order metrics, master enrichment and quality findings remain equivalent.
- [ ] Desk charts, date/text filters, selectable columns and filtered CSV export work.
- [ ] Coverage and calendar-week/custom comparison match synthetic calculations.
- [ ] Article details and analysis/comparison exports retain evidence.
- [ ] Warehouse dimensions, placement, codes, locks, collisions, undo/redo and top/3D views work.
- [ ] Separate 3D analysis matches current master locations without editing or inferring stock.
- [ ] Backup and restore-as-new/confirmed replacement retain all data and the layout.
- [ ] Current workspace and period checklists pass.

## Privacy and migration

- [ ] External network access is disabled or monitored; all assets load locally.
- [ ] DevTools shows no data request; CSP connection blocking is present and local module workers work.
- [ ] The listener is loopback-only and serves neither repository nor CSV/backup/script files.
- [ ] Upload/write HTTP methods are rejected.
- [ ] Existing localhost workspaces reopen at the same origin/profile.
- [ ] A Portable backup from the preserved basis restores bytes, mappings, validation, results and layout.
- [ ] No Portable-origin database is silently read, changed or merged.
- [ ] Migration across profiles is explicit; malformed restore input preserves existing workspaces.
- [ ] Spreadsheet exports retain formula-injection protection.

## Evidence

- [ ] Relevant Node tests and both Windows PowerShell launcher suites pass.
- [ ] Python syntax and commit-bound ZIP packaging pass.
- [ ] Actual Edge versions, synthetic screenshots and untested capabilities are recorded.
- [ ] Automated, in-app-browser and historical results are not presented as current Edge acceptance.

## Performance candidate checks

- [ ] Source profiling and analysis leave navigation responsive; Cancel keeps original source bytes and the last committed workspace.
- [ ] Cancellation before worker dispatch cannot occupy the next task; import/custom-field actions never save an incomplete source.
- [ ] Language change refreshes diagnostics; cancelled/failed refresh restores the previous language.
- [ ] Opening, finishing or cancelling a task re-enables file/mapping controls.
- [ ] Source and desk tables keep bounded rows, correct source-line/ARIA indexes, focus and selected columns through scrolling/filtering/language changes.
- [ ] Repeated narrow and broad period comparisons equal the scan result, including overlapping dates and unknown coverage.
- [ ] Large backup restore succeeds above 8 MiB source bytes; corrupt Base64 leaves existing workspaces intact.
- [ ] ETags return `304` for unchanged assets and new bytes after edits; unlisted nested paths are blocked.

Current developer evidence and its browser/version limits are recorded in
[performance/workspace-ui.md](performance/workspace-ui.md). These checks remain
pending until an exact packaged candidate passes in the company Edge profile.
