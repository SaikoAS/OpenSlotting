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
- [ ] Large `.osworkspace` export/restore succeeds at 700,000 synthetic rows; compare all bytes, result blocks and manual settings. Check native file save, policy/download fallback, cancellation, checksums, missing blocks, quota and concurrent-tab replacement. Legacy JSON restore above 8 MiB source bytes still succeeds; corrupt Base64 leaves existing workspaces intact.
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
- [ ] Drag an earlier column before a later one and a later column before an earlier one; verify the exact position after reopening. Dropping a column immediately before its current successor leaves the order unchanged, while the down/up buttons still swap adjacent columns.
- [ ] Launch Walk into a separate maximized Edge app window in the approved company profile. Check Resume mouse capture, repeated capture denial staying paused with retry, no unlocked/drag-look option, title bar/taskbar/Alt+Tab, independent X/close, connected-window reuse, close/relaunch, same-profile timeout, blocked launcher fallback and old-server restart guidance. Check short-window menu sizing, Tab/M/E interaction, FOV saved in the parent, explicit snapshot refresh after layout/data changes and scene removal on workspace switch/main-window close. Confirm no imports/order rows or IndexedDB opening in the viewer, and no business data in launch requests/logs. Test company policies, GPU loss, slow startup and device sleep separately.
- [ ] In Walk, switch Evaluation/Editor before launch and in the paused menu. Evaluation E opens article details and rejects geometry writes. Editor E targets physical racks/walls and floor areas, selects bay/level/location where available, and opens the existing properties with movement paused. Check add/configure/duplicate/delete, dimensions/rotation, zones/floor locations/codes/placement, locks, confirmations, undo, Return with mouse look, focus containment and short-window scrolling. Verify saved geometry in the main editor and backup/reopen, unchanged source data/retained IDs, stale-base conflict after a main-window change, refresh/history reset, failed/slow saves without false success or automatic retry, and workspace/session cleanup while the inspector is open.
- [ ] In walk Editor, press B while moving to open Recipes with capture released and unchanged pose. Check grouped search, explicit Add, the rack wizard/cancel, repeated B and held movement keys, text-field typing, B/Return resuming only with capture, and Esc pausing. Check the passive object sidebar with many/long/locked names, hidden search/actions while moving, no minimap overlap, Tab → Select objects search/row selection, active-object highlighting and unchanged geometry on selection. Verify full-width properties with retained expandable layout checks, no extra renderer and no Editor panels/actions in Evaluation.
- [ ] Adjust vertical FOV to 45/60/100 degrees with mouse and keyboard, including paused fullscreen. Verify labels and clicked locations remain aligned, Reset returns to 60, reopening/backup preserve the workspace-local angle, switching workspaces isolates it and a failed save restores the stored angle. Rack geometry must remain unchanged.
- [ ] In Walk, check Space/jump-button gravity and landing, no repeat while holding Space, low overhead parts, thin elevated decks, C hold/toggle crouching, blocked standing and half-speed crouching. Check 0.1/20 m/s limits and exact numeric speed, diagonal normalization, keyboard focus and no motion while editing fields or paused. In Free flight, check view-relative WASD, Space/C ascent/descent, visible no-collision label and fullscreen mode/height, scene/altitude bounds, independent speed, preserved height during FOV/color refreshes, free-floor return or blocked return, and workspace reset without geometry changes.
- [ ] In actual fullscreen, aim at a nearby visible location and press E. Check the prompt, 6 m limit/physical occlusion, mouse release, no movement behind the dialog, Tab containment, multiple assigned articles, exact IDs, zero/unknown values, master-only custom provenance, comparison and empty locations. Return to movement and verify unchanged position/direction/FOV/mode. Check denied mouse lock/fallback, Esc/close while paused, removed location, workspace/page/fullscreen cleanup and no stale selection target. Normal view click navigation remains available; locked mouse clicks do not trigger interaction.

### Feedback development check, 2026-10-21

Working tree on `codex/user-feedback-2026-10-21`, based on main `086eb87`: all 443 Node tests pass (12 new feedback regressions). Both launcher suites pass under Windows PowerShell 5.1 and PowerShell 7; modified JavaScript syntax and whitespace checks pass. The connected native Edge profile was checked using synthetic sources and a separate temporary loopback origin. Observed: master fallback with file/line tooltip, order-value precedence, custom-column sorting, persisted visibility/order after reopening, fixed document/header/rail during day-evidence scrolling, native fullscreen with mouse look, Esc pause and explicit exit. No console errors or warnings were recorded for those actions. This is a development-worktree check; extracted-candidate identity, denied company permissions, drag-device behavior and large production-shaped scenes remain acceptance items above.

FOV follow-up on the same working tree/date: all 450 Node tests pass (seven additional FOV regressions). Both launcher suites pass in Windows PowerShell 5.1 and PowerShell 7; modified JavaScript syntax, version consistency and whitespace checks pass. Native Edge with isolated synthetic workspaces confirmed 45/100-degree keyboard bounds, reset to 60, retained keyboard focus after saving, reload persistence, workspace isolation, and FOV changes while paused in actual fullscreen. No console errors or warnings were recorded. Model tests additionally cover matrix/label/ray agreement across angles/aspects, exact location hits, live-preview GPU reuse, save failure, backup/worker persistence and late-save isolation. These results do not replace the extracted-candidate/company-device acceptance above.

Movement follow-up on the same working tree/date: all 460 Node tests pass (ten additional movement regressions); all four Windows launcher checks, syntax, version consistency and whitespace checks pass. Native Edge with synthetic geometry confirmed exact decimal speed entry (3.7 m/s / 13.3 km/h), crouch toggle with 1.02 m view height, jump rise and return to 1.70 m, Space/C flight ascent/descent, separate walking/flight speeds, actual fullscreen flight with mode/height feedback, Esc pause and return to a free floor position. No console errors or warnings were recorded. Model/controller tests cover thin/rotated collisions at maximum speed, thin-deck landing and falling from edges, low ceilings, blocked standing, bounded flight, held-key behavior, input focus, paused movement, blocked mode return and unchanged layout/GPU scene during movement. The extracted-candidate, company-device and large-scene checks remain separate acceptance items.

Location-interaction follow-up on the same working tree/date: all 468 Node tests pass (eight additional regressions); all four Windows launcher checks, syntax, version consistency and whitespace checks pass. Native Edge with isolated synthetic sources confirmed a live aim prompt, E opening the dialog while fullscreen remains active, article metrics/master custom values, unknown comparison state, mouse controls, native Tab/Shift+Tab containment, close while paused and native-click return to movement at the same position/direction. Denied mouse-look recovery remained available through the existing drag fallback. No console errors or warnings were recorded. Automated tests additionally cover multiple assignments/comparisons, empty locations, exact IDs, zero/unknown values, source escaping, master-only provenance, physical ray occlusion/distance, focus-scoped E, cleared held keys, inert-background restoration, workspace/removal cleanup and late pointer grants. Extracted-candidate and approved company-device acceptance remain separate.

Aim-prompt follow-up: all 37 targeted walk tests pass, including two added regressions for target loss/range/pause and uncoded rack/bay/level/ground/position labels. Native Edge with synthetic geometry showed `E · Interagieren: SYN-01-01-01` when aimed at that reachable location, then a hidden, empty prompt after moving off target while movement remained active. No console errors or warnings were recorded; syntax and whitespace checks pass.

Separate walk-window follow-up (2026-10-30, `codex/warehouse-3d-next`): all 617 Node tests pass, including twelve new window/session/controller regressions and release-package checks. All three launcher logic suites pass in PowerShell 5.1 and 7. An isolated headless Edge profile with synthetic geometry and software WebGL confirmed the real guarded HTTP launch route, same-origin BroadcastChannel handoff, settings transfer, pointer lock, stationary pause/menu/resume, parent-owned FOV persistence, explicit refresh, connected-viewer reuse, close/relaunch and data disposal on workspace switch. Setup and viewer menus fit 1920×1080, 1280×720 and 1024×576 without document scrolling; screenshots were inspected. Native process spawning was replaced only in this browser harness with creation of a second target in its isolated profile; fixed Edge arguments and visible maximized launch were checked separately by the PowerShell logic suite. No browser runtime exceptions were recorded. This does not establish physical window placement, company-policy/device acceptance, native title-bar/X/Alt+Tab behavior, real-GPU performance or production-size-scene acceptance; those remain manual checks above.

Walk Editor follow-up (2026-10-30, same branch): all 627 Node tests pass, including nine additional mode/geometry/session regressions and release packaging. The isolated headless Edge/software-WebGL harness confirmed Editor selection, the shared inspector without a second renderer, rename/move saved in the main IndexedDB workspace, object add/delete/undo, rack wizard opening/cancel, location-placement schematic visibility, E object targeting, explicit return with mouse capture, Evaluation hiding edit controls, and stale-base rejection after a separate main-editor change followed by successful refresh. The preparation screen returns without starting mouse look; the running walk resumes only after capture. Menus and inspector controls fit 1280×720 and 1024×576 with internal scrolling, and screenshots were inspected. Unit regressions additionally cover locked/stale/save-failed transactions, editor-mode authorization, overlapping requests, workspace changes during a pending save, timeout without automatic retry, empty-warehouse construction and observer-relative insertion. No browser runtime exceptions were recorded. Large real hall scenes, actual GPU/device behavior and exact extracted-candidate acceptance remain manual checks.

Walk recipe/sidebar follow-up (2026-10-31, same branch): all 630 Node tests pass, including three new recipe/API and controller regressions. An isolated headless Edge/software-WebGL profile with 25 synthetic objects verified B opening with capture released and unchanged pose, category/search filtering, disabled Add for no matches, explicit insertion persisted in the main workspace, rack wizard cancellation, B closing/resuming with capture, ignored key repeat/text-field shortcuts and Evaluation isolation. The object sidebar remained passive during mouse look, hid its editing controls, left room for the minimap, and supported paused search/selection and a single selected-object highlight. The resulting insertion raised the object count to 26 while retaining location IDs. No extra WebGL context was created during recipe/property operations, and no runtime exceptions were recorded. Recipe actions fit 1280×720 and 1024×576 without document scrolling; screenshots of the catalog, mouse-look sidebar and full-width properties were inspected. Company-device, large real-scene and exact extracted-candidate acceptance remain separate manual checks.

Walk aimed-object follow-up (2026-10-31, `codex/warehouse-3d-next`): highlight the same reachable (maximum 6 m) Editor ray target as E, using a mint contour and light surface tint plus a temporary object-list marker. Keep the chosen object/location independent and remove aim feedback on look-away, pause, mode/session changes and disposal. Depth testing remains active; a small polygon depth offset prevents coplanar contour/tint flicker. Only the two target overlay buffers change when the target changes; normal camera frames retain static geometry.

All 633 Node tests pass, with zero failures/skips; syntax, version consistency and whitespace checks pass. Three added regressions cover rotated physical meshes versus logical markers, floor surfaces, target-only uploads, depth state/context restoration, E-range matching, independent selection and clearing. An isolated headless Edge profile at an ephemeral loopback origin verified the real Editor ray target and matching sidebar marker, software-WebGL rendering without errors, look-away/pause clearing and unchanged stored layout with 25 synthetic objects. The aimed and paused screenshots were inspected; camera positioning used test instrumentation. This is development evidence, not hardware-GPU, mouse-device, company-policy or extracted-candidate acceptance.

Direct walk editing follow-up (2026-10-31, `codex/warehouse-3d-next`): left click binds one reachable object and operates only its projected parameter fields; right click releases/discards without dropping pointer lock. Rack fields cover bay width, level clear height, common depth and ground/upper location width/X; ordinary rectangular objects expose basic dimensions. Wheel, fine steps and numeric input produce an amber candidate with impact/collision evidence before explicit Enter. Candidates retain IDs/codes and marker colors, follow rotation/preview geometry, are bounded to 24 visible fields within 6 m and respect physical occlusion and covering HUD elements. Writes use the existing main editor/undo/CAS path; uncertain timeouts cannot be retried until an explicit snapshot refresh.

An isolated headless Edge/software-WebGL profile with 25 synthetic objects verified real left/right click interaction, binding through look-away, all five rack/location parameter kinds saved through the guarded host/session and reopened IndexedDB data, uninterrupted pointer lock through saves, right-click discard, retained location IDs/codes and no WebGL/runtime errors. Screenshots at 1280x720 and 1024x576 were inspected; status/controls fit without document scrolling. Camera setup used test instrumentation; this is supplemental development evidence, not physical mouse/GPU, company-policy or exact extracted-candidate acceptance.

Final source verification: all 647 Node tests passed with zero failures/skips, including four new direct-model and ten new controller regressions for binding, previews, numeric input, locks/ranges/occlusion, pause/save races, stale/uncertain writes and session disposal. Syntax, version consistency and diff whitespace checks passed. Windows launcher files were unchanged; launcher/device acceptance was not repeated.

Walk access-side follow-up (2026-10-31, `codex/warehouse-3d-next`): reuse the shared editor gold front stripe/outward arrow for every rack, including rotated racks and direct-edit previews, and expose a DE/EN HUD legend. Decorative orientation entries remain excluded from collision/picking indexes, navigation bounds and aim overlays. Two additional regressions verify shared geometry, legacy single-object behavior, gold mesh colors and navigation invariants; the controller preview case also checks retained marks/legend. The isolated 25-object headless Edge/software-WebGL workflow passed again; screenshots at 1280x720 and 1024x576 show the stripe/arrow and legend without page overflow. Hardware/device and exact extracted-candidate acceptance remain manual.

Access-side source verification: all 649 Node tests passed with zero failures/skips; syntax, version consistency and diff whitespace checks passed.

Walk preview confirmation follow-up (2026-10-31, `codex/warehouse-3d-next`): left click now applies the active direct draft through the same validation/save path as Enter. Right click on a changed draft asks first; left click/Enter confirms discard, while right click keeps the draft and binding. Pause/focus loss retains drafts, and paused menus provide Discard/Keep controls. Work-mode, inspector/recipe, color, refresh and explicit exit actions defer until discard is confirmed. Already-submitted writes and external workspace/session teardown retain their existing safety boundaries. Three new controller regressions plus updated release/pause tests cover confirmation/cancel, input suppression, repeated keys, single left-click saves, invalid candidates and deferred context changes. An isolated 25-object headless Edge/software-WebGL run verified native left-click persistence, captured-mouse discard confirmation/cancel, retained drafts across pause, explicit paused-menu choices at 1024x576, no page overflow, preserved IDs/codes and no WebGL/runtime errors; screenshots were inspected. Physical mouse/GPU and extracted-candidate acceptance remain manual.

Preview-confirmation source verification: all 652 Node tests passed with zero failures/skips; syntax, version consistency and diff whitespace checks passed.

Staged direct-editor follow-up (2026-10-31, `codex/warehouse-3d-next`): separate the active value from the retained object preview. Left click/Enter/right click on an active value only leave that value; they never save, discard the draft or release its object. Numeric/wheel input is disabled at object level. Separate projected Apply changes / Discard preview controls and object-level Enter explicitly finish the transaction. Successive valid values share one candidate and baseline; invalid later fields preserve prior preview changes and block writes until corrected. Existing capture, collision/impact, ID/code, stale-write and discard-confirmation protections remain. Two added controller regressions cover multi-value atomic saves and invalid-field recovery, while previous click/Enter/right-click cases now assert the staged transitions and unchanged storage after value deselection.

Staged-editor source verification: all 654 Node tests passed with zero failures/skips. An isolated 25-object headless Edge/software-WebGL run checked that all five parameter types leave value editing without storage writes, retain the object/capture, and save only through the explicit object-level Apply control or Enter. Two successive values were verified unchanged in main-window IndexedDB until a shared apply, then both persisted. Staged right-click back/confirmation/cancel, pause/resume and retained IDs/codes passed; 1280x720 and 1024x576 screenshots were inspected. The test uses instrumented camera setup and synthetic data; physical mouse/GPU and exact extracted-candidate acceptance remain manual.

Mouse-only walk interaction follow-up (2026-10-31, `codex/warehouse-3d-next`): remove the E key binding and change DE/EN movement hints, reachable-target prompts and current guide to left click. Route captured left clicks through the same mode-specific interaction path, including the legacy inspector adapter. Existing interaction regressions now exercise clicks; an added case verifies E cannot bind an object, activate/leave a value, apply or confirm discard, or open Evaluation details. Enter and right-click retain their explicit preview-stage roles.

Mouse-only source verification: all 655 Node tests passed with zero failures/skips; syntax, version consistency and diff whitespace checks passed. A focused isolated headless Edge/software-WebGL run verified E is ignored before binding, at object/value/discard stages and in Evaluation, while left-click selection, explicit staged persistence and article details still work. IDs/codes and editing capture were retained, with no runtime/WebGL errors. A longer inherited resize/resume harness intermittently lost capture; this follow-up establishes the focused interaction checks, not physical device or resize/capture acceptance.

Complete direct-field follow-up (2026-10-31, `codex/warehouse-3d-next`): extend the typed in-world catalog to existing object names/pose/locks, rack/bay/level/upright counts and dimensions, ground/deck/passage switches, zone usage, location counts/placement/codes and add/duplicate/remove, code prefixes, group names, junction arms and existing route requirements/waypoints. Keep immutable IDs, computed dimensions and full-depth placement protected; planning-creation wizards remain in the inspector. Structure/Zones/Locations use projected controls or object-level 1/2/3, while wheel can cycle overlapping eligible fields without changing values. Text typing/paste consumes movement/menu letters, switches/choices use wheel/Up/Down, optional requirements can be cleared, and lock changes use a separate transaction with the existing toggle metadata. Every removal or changed nonempty code receives a second object-level Apply confirmation listing affected counts. Value deselection remains unsaved, multi-field changes remain atomic and conflicts/timeouts retain their existing safety boundaries.

An isolated 25-object headless Edge/software-WebGL profile verified the real guarded launch and same-profile browser handoff, typed object names containing B/M/E/WASD/spaces, beam thickness, deck switching, zone usage, location-count reduction with confirmation/cancel, changed-code confirmation, object X movement, lock/unlock and bay-count growth. Main-window IndexedDB was checked after the proposals; name deselection and canceled reductions left committed data unchanged. Screenshots of name editing, removal confirmation and Structure at 1280x720 were inspected; the document did not scroll. The longer run lost native capture once and resumed explicitly through the paused menu before completing; it does not establish uninterrupted physical-device capture. No runtime/WebGL errors were recorded. Existing launcher/process files are unchanged. Physical mouse/GPU behavior, company-policy acceptance, maximum-size scenes and exact extracted-candidate acceptance remain manual checks.

Complete-field source verification: all 672 Node tests passed with zero failures/skips, including 17 additional pure-model/controller regressions for the typed catalog, range/lock/ID/code rules, grouped motion, text movement suppression, section/overlap selection, separate lock metadata and destructive Apply/Keep behavior. Syntax, version consistency and diff whitespace checks passed.
