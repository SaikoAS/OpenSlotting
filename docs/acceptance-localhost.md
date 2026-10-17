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

Use the commit-named `.acceptance.md` record generated beside the ZIP by
`tools/package-release.ps1`. It binds these checks and the workspace, period and
warehouse checklists to the candidate commit and ZIP SHA-256. Fill every result
and synthetic evidence reference; generation itself is not an acceptance pass.

## Startup

- [ ] The package contains all assets/helpers without new executable or package dependencies.
- [ ] Existing approved Python 3.8+ is sufficient, with no pip/npm install or administrator action.
- [ ] Standard start opens maximized Edge app mode at the fixed localhost origin.
- [ ] Header and diagnostics show Localhost in English and German.
- [ ] Development/release status is visible in header/footer and diagnostics in EN/DE. The packaged full commit matches the candidate manifest; an unpackaged development copy shows Build unknown. Workspace/layout/backup versions match the candidate modules and explain compatibility limits.
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
- [ ] Quellspalten opens the profile overview; the editor remains available separately. With more than 50 synthetic imports, search/type/status filters, selection across pages, hidden-selection counts and direct editor navigation work in EN/DE. Preview distinguishes compatible sources from missing/ambiguous columns and different source types. Apply saves compatible configurations once, leaves skipped configurations unchanged, and requires explicit validation. Reopen/backup/restore retains the mappings/rules and original bytes. A failed save retains the last visible committed configuration. Check narrow windows, keyboard focus and internal scrolling.
- [ ] Both source-column views show each import's last applied profile and application time. Subsequent mapping/rule/source-type changes are marked; saving a profile alone does not mark it as applied. Historical name/time survive profile updates/deletion, reopening, reanalysis and backup restore. Older imports show no recorded application. Failed saves and skipped imports do not acquire a new application record. Verify schema-16 migration to 17; retain a pre-update backup for older readers.
- [ ] Order-line/master import retains source bytes, raw fields and line evidence.
- [ ] Quantity, frequency, customer/order metrics, master enrichment and quality findings remain equivalent.
- [ ] Desk charts, date/text filters, selectable columns and filtered CSV export work.
- [ ] Coverage and calendar-week/custom comparison match synthetic calculations.
- [ ] Coverage remains available when every synthetic order row is invalid or excluded by a source rule. Verify the dated issue counts and source evidence, retained reasons after reopen/analysis reset, and a note-only workspace. Period comparison stays disabled without valid dated rows; an empty workspace without reasons keeps coverage unavailable.
- [ ] Article details and analysis/comparison exports retain evidence.
- [ ] Warehouse dimensions, placement, codes, locks, collisions, undo/redo and top/3D views work.
- [ ] Separate 3D analysis matches current master locations without editing or inferring stock.
- [ ] Backup and restore-as-new/confirmed replacement retain all data and the layout.
- [ ] Current workspace and period checklists pass.

## Privacy and migration

- [ ] Coverage calendar: month navigation, keyboard day navigation, weekday configuration and EN/DE labels work. Save/edit/remove a reason on a day without valid data; verify the saved timestamp, reopen and backup/restore retention. Reasons and later-arriving source data coexist; invalid/excluded evidence stays identifiable. Days outside the observed date span are not counted as unexplained gaps. Drafts survive day/month navigation; failed saves retain previous committed notes. Source bytes, period completeness and comparison/export totals remain unchanged. Schema-17 migration adds no invented reasons.

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

### Developer check: last applied import profile (2026-10-17)

The uncommitted `codex/source-column-workflows` source checkout was exercised
in native Edge at an isolated ephemeral loopback origin with 62 synthetic imports.
Applying a profile to two sources displayed its name/time in the overview and
editor. Removing a quantity mapping marked only that source as changed. Both
records survived a full reopen, explicit reanalysis and the EN/DE language switch;
sources without evidence remained explicitly unrecorded. No console errors were
reported. Storage, backup restore, migration, failed-save handling and profile
update/deletion retention have automated regression coverage. This isolated
source-tree check does not establish packaged-candidate/company-profile acceptance.

### Developer check: coverage calendar (2026-10-17)

The uncommitted `codex/source-column-workflows` source checkout was checked in
native Edge at an isolated ephemeral loopback origin with 62 synthetic sources.
A date without valid data accepted “Feiertag – keine Auslieferung”; its reason
and saved timestamp survived reopening and the EN/DE language switch. Month
navigation retained an unsaved draft, arrow keys moved the selected date, and
dates outside the observed span stayed distinct. The console reported no errors.
The ISO-week display was also checked in Edge: January 2021 starts with KW 53
of 2020, and the selected-day detail repeats the ISO week and week-year.
Automated tests cover note validation, leap/year boundaries, metadata persistence,
backup restore, schema migration, failed saves and unchanged period coverage.
This does not establish packaged-candidate/company-profile acceptance.
