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

- [ ] Check gray physical decks remain visible under inset slot outlines in Structure/Zones/Locations and 3D analysis. A level without a deck must show no filled plate. Zoom until front position numbers appear; only one selected slot gets a faint tint. Hide/show markings in both views without changing codes, geometry or history. Click inside the visually inset margin and verify the original full footprint remains selectable. Check wall/route occlusion, overlapping routes and the 5,000-slot limit in the company Edge profile.

- [ ] New and migrated racks offer enabled ground scopes except designated passages. Classify Ground (level 0), create 1–10 side-by-side positions, edit widths/offsets and codes, then compare editor and analysis at floor height. Disable/cancel/confirm/undo one bay without changing upper levels; check failed saves, locks, reopening and backups. Ground has no beam/deck. Re-enable as an empty scope.
- [ ] Before inserting a rack, inspect its gold front marker and orientation in the builder top preview. Compare 0/90/180/270 degrees, free rotation, translation and grouped movement in top view/3D. Arrow points toward the aisle; bay/slot order is left-to-right from that access side. Orientation cues must not create collisions or connections.

- [ ] In workspace 21 / layout 6, edit up to ten side-by-side locations along each classified rack level. Check horizontal drawing, moving, width adjustment, exact millimeter fields, grid/Alt, edge contact and overlap/bounds rejection. New locations use the full bay depth and never wrap into a second depth row. Earlier prototype depth rows remain readable until explicitly divided side by side. Codes/IDs survive edits, reopening and backup restore; duplicate gets a new ID/blank code. Locked racks and other levels remain protected. Legacy layout-4 subdivisions migrate to equal explicit footprints while preserving coverage reasons and profile evidence. Editor and analysis display the same areas. Verify on the extracted candidate and approved company Edge profile.

- [ ] Workspace create/open/rename/clear/delete/reopen remain isolated.
- [ ] Encoding, mapping, preparation rules, named filters, custom fields and profiles work.
- [ ] Quellspalten opens the profile overview; the editor remains available separately. With more than 50 synthetic imports, search/type/status filters, selection across pages, hidden-selection counts and direct editor navigation work in EN/DE. Preview distinguishes compatible sources from missing/ambiguous columns and different source types. Apply saves compatible configurations once, leaves skipped configurations unchanged, and requires explicit validation. Reopen/backup/restore retains the mappings/rules and original bytes. A failed save retains the last visible committed configuration. Check narrow windows, keyboard focus and internal scrolling.
- [ ] Both source-column views show each import's last applied profile and application time. Subsequent mapping/rule/source-type changes are marked; saving a profile alone does not mark it as applied. Historical name/time survive profile updates/deletion, reopening, reanalysis and backup restore. Older imports show no recorded application. Failed saves and skipped imports do not acquire a new application record. Verify schema-16 migration to 17; retain a pre-update backup for older readers.
- [ ] Order-line/master import retains source bytes, raw fields and line evidence.
- [ ] Quantity, frequency, customer/order metrics, master enrichment and quality findings remain equivalent.
- [ ] Desk charts, date/text filters, selectable columns and filtered CSV export work.
- [ ] Coverage and calendar-week/custom comparison match synthetic calculations.
- [ ] An editor search matching source A must not redirect source B's "Open editor" action in the profile overview back to A. Verify B's label, fields and source rows, including after changing language.
- [ ] Coverage remains available when every synthetic order row is invalid or excluded by a source rule. Verify the dated issue counts and source evidence, retained reasons after reopen/analysis reset, and a note-only workspace. Period comparison stays disabled without valid dated rows; an empty workspace without reasons keeps coverage unavailable.
- [ ] Issue-only and mixed imports show matching evidence dates in the overview, source ranges, date table and calendar. Duplicate issues do not inflate observed-day counts. Demand and period completeness still use only valid normalized rows.
- [ ] Saved calendar reasons survive removing the final source and confirming source reset, including reopening and backup/restore. Cancelling reset changes nothing; switching to another workspace does not show the previous workspace's reasons.
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

## Feedback workflow acceptance

- [ ] Open day evidence from the calendar and coverage tables with long content. Only the coverage page scrolls; document, header, rail and surrounding frame retain their positions.
- [ ] Use fully synthetic master/order files. Verify a custom master field appears in order-line columns, exact article matching, order-value precedence, zero/blank behavior, source tooltips, sorting and filtered CSV export without changing source rows.
- [ ] Move all column types by drag and keyboard buttons, toggle optional columns and reset. Reopen two workspaces and backup/restore; check isolation, inactive/renamed fields and failed-save behavior.
- [ ] Enter native fullscreen in approved company Edge, check mouse lock/fallback, E location interaction, WASD, Esc pause, keyboard controls, minimap/details/search, explicit exit, workspace/navigation cleanup, denial and GPU loss at short/tall viewports.
- [ ] Adjust vertical FOV to 45/60/100 degrees with mouse and keyboard, including paused fullscreen. Verify labels and clicked locations remain aligned, Reset returns to 60, reopening/backup preserve the workspace-local angle, switching workspaces isolates it and a failed save restores the stored angle. Rack geometry must remain unchanged.
- [ ] In Walk, check Space/jump-button gravity and landing, no repeat while holding Space, low overhead parts, thin elevated decks, C hold/toggle crouching, blocked standing and half-speed crouching. Check 0.1/20 m/s limits and exact numeric speed, diagonal normalization, keyboard focus and no motion while editing fields or paused. In Free flight, check view-relative WASD, Space/C ascent/descent, visible no-collision label and fullscreen mode/height, scene/altitude bounds, independent speed, preserved height during FOV/color refreshes, free-floor return or blocked return, and workspace reset without geometry changes.
- [ ] In actual fullscreen, aim at a nearby visible location and press E. Check the prompt, 6 m limit/physical occlusion, mouse release, no movement behind the dialog, Tab containment, multiple assigned articles, exact IDs, zero/unknown values, master-only custom provenance, comparison and empty locations. Return to movement and verify unchanged position/direction/FOV/mode. Check denied mouse lock/fallback, Esc/close while paused, removed location, workspace/page/fullscreen cleanup and no stale selection target. Normal view click navigation remains available; locked mouse clicks do not trigger interaction.

### Feedback development check, 2026-10-21

Working tree on `codex/user-feedback-2026-10-21`, based on main `086eb87`: all 443 Node tests pass (12 new feedback regressions). Both launcher suites pass under Windows PowerShell 5.1 and PowerShell 7; modified JavaScript syntax and whitespace checks pass. The connected native Edge profile was checked using synthetic sources and a separate temporary loopback origin. Observed: master fallback with file/line tooltip, order-value precedence, custom-column sorting, persisted visibility/order after reopening, fixed document/header/rail during day-evidence scrolling, native fullscreen with mouse look, Esc pause and explicit exit. No console errors or warnings were recorded for those actions. This is a development-worktree check; extracted-candidate identity, denied company permissions, drag-device behavior and large production-shaped scenes remain acceptance items above.

FOV follow-up on the same working tree/date: all 450 Node tests pass (seven additional FOV regressions). Both launcher suites pass in Windows PowerShell 5.1 and PowerShell 7; modified JavaScript syntax, version consistency and whitespace checks pass. Native Edge with isolated synthetic workspaces confirmed 45/100-degree keyboard bounds, reset to 60, retained keyboard focus after saving, reload persistence, workspace isolation, and FOV changes while paused in actual fullscreen. No console errors or warnings were recorded. Model tests additionally cover matrix/label/ray agreement across angles/aspects, exact location hits, live-preview GPU reuse, save failure, backup/worker persistence and late-save isolation. These results do not replace the extracted-candidate/company-device acceptance above.

Movement follow-up on the same working tree/date: all 460 Node tests pass (ten additional movement regressions); all four Windows launcher checks, syntax, version consistency and whitespace checks pass. Native Edge with synthetic geometry confirmed exact decimal speed entry (3.7 m/s / 13.3 km/h), crouch toggle with 1.02 m view height, jump rise and return to 1.70 m, Space/C flight ascent/descent, separate walking/flight speeds, actual fullscreen flight with mode/height feedback, Esc pause and return to a free floor position. No console errors or warnings were recorded. Model/controller tests cover thin/rotated collisions at maximum speed, thin-deck landing and falling from edges, low ceilings, blocked standing, bounded flight, held-key behavior, input focus, paused movement, blocked mode return and unchanged layout/GPU scene during movement. The extracted-candidate, company-device and large-scene checks remain separate acceptance items.

Location-interaction follow-up on the same working tree/date: all 468 Node tests pass (eight additional regressions); all four Windows launcher checks, syntax, version consistency and whitespace checks pass. Native Edge with isolated synthetic sources confirmed a live aim prompt, E opening the dialog while fullscreen remains active, article metrics/master custom values, unknown comparison state, mouse controls, native Tab/Shift+Tab containment, close while paused and native-click return to movement at the same position/direction. Denied mouse-look recovery remained available through the existing drag fallback. No console errors or warnings were recorded. Automated tests additionally cover multiple assignments/comparisons, empty locations, exact IDs, zero/unknown values, source escaping, master-only provenance, physical ray occlusion/distance, focus-scoped E, cleared held keys, inert-background restoration, workspace/removal cleanup and late pointer grants. Extracted-candidate and approved company-device acceptance remain separate.

Aim-prompt follow-up: all 37 targeted walk tests pass, including two added regressions for target loss/range/pause and uncoded rack/bay/level/ground/position labels. Native Edge with synthetic geometry showed `E · Interagieren: SYN-01-01-01` when aimed at that reachable location, then a hidden, empty prompt after moving off target while movement remained active. No console errors or warnings were recorded; syntax and whitespace checks pass.
