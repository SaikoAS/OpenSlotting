# Warehouse workflow acceptance (issue #74)

Use only synthetic layouts, CSVs, article identifiers, and location codes. Run the checks against the exact candidate files intended for review. Follow the repository quality checks in [CONTRIBUTING](../CONTRIBUTING.md) and the localhost setup in [runtime acceptance](acceptance-localhost.md). Active development uses localhost only; Portable remains paused.

## Automated coverage

### Explicit top-view drag tools — 2026-10-18

The uncommitted candidate passed **422 Node tests**, zero failures/skips. Added controller cases verify that initial panning over an object moves the drawn bands without changing geometry/selection or saving; explicit object dragging produces one undoable edit; click selection, locked objects and cancellation remain protected; tool choice survives redraws, is forced to pan outside Structure and resets across workspaces. A pending geometry drag is discarded on tool change before pointer release.

An isolated synthetic fixture in the Codex integrated browser verified the visible German button group, panning over a different rack while retaining selected rack A at X/Z 0 and disabled Undo, explicit Move objects activation, forced/disabled movement under Zones and restoration on returning to Structure. No console errors/warnings appeared. Native company Edge/touchpad/keyboard acceptance remains open. No stored format, runtime dependency or data-processing changes were introduced.

### Warehouse walk development evidence — 2026-10-18

The uncommitted `codex/free-rack-locations` candidate passed **419 Node tests**, zero failures/skips. Nine dedicated walk cases cover perspective/clip agreement and front orientation, rotated physical clearance, height-aware gaps, wall sliding/no tunneling, bounded spatial indexing/search, occluding ray selection, unchanged warehouse data, static GPU upload/recovery and read-only controller behavior. Localhost tests request the four new runtime assets. Syntax, whitespace and version-consistency checks passed. No workspace schema or runtime dependency was added.

The Codex integrated browser displayed an isolated synthetic layout with two opposing three-bay racks, 72 coded locations, three article-master records and three order lines. Verified actual perspective, drag-to-look, short WASD inputs changing position, Esc, minimap jumps, exact search without a position jump, explicit free front approach, retained selection/position after article navigation, totals (two lines, quantity 30, two active days), existing A/B comparison counts, coverage navigation, demand colors and German/English labels. No console warnings/errors occurred during the final actions. The pointer-lock request was unavailable in that browser and correctly retained drag-to-look with a message; Esc cleared the mode. Connected native Edge was unavailable for this run. Sustained native movement, pointer lock, larger halls, short-view layouts and company-device acceptance remain manual checks; no FPS or complete runtime acceptance is claimed.

### Direct selection development evidence — 2026-10-18

The uncommitted `codex/free-rack-locations` candidate passed **410 Node tests**, zero failures/skips. Added controller cases cover exact clicked location selection across modes, ground selection in Structure, ancestor navigation on locked racks, focused camera bounds, rapid clicks across redraws and orbit-drag exclusion. Renderer coverage confirms that level/bay highlighting changes outlines without changing opaque faces, picking vertices/IDs or adding tints to all locations. No persistence schema or runtime dependency changes were required.

Connected Microsoft Edge was available for this run. An isolated synthetic fixture at an ephemeral Python loopback origin verified direct 3D location picking, an actual mouse double-click centering/enlarging the clicked location, sticky selection/field reveal, exact selection retained across modes, ground selection through Structure/Zones, physical level outlines, and top-view double-click focusing. A native keyboard width edit from 900 to 750 mm saved the selected location and retained its code; Undo restored 900 mm. No browser console warnings/errors appeared during these actions. This is scoped development evidence, not full company-device, packaged-runtime, populated article or backup-dialog acceptance.

For manual acceptance, also exercise adjacent bays at arbitrary rotations, hidden markers, very short viewports, locked racks and keyboard navigation. Confirm that only the properties card scrolls when selecting an area, clicking/rotating/panning adds no undo entry, and each dimensional hint identifies the actual affected scope.

```text
node --test tests/*.test.cjs
```

The warehouse model, scene, editor-controller, workspace, storage, and backup tests cover:

- geometry creation with zero implicit locations; independent uses and counts 0–10 per level; front-aligned locations, edge contact, overlap/bounds rejection and partially completed racks;
- scope selection across modes; wizard cancel and one-edit completion; explicit level or rack code generation without creating locations;
- preserved IDs/codes, impact counts, confirmation cancellation, deletion, duplication, locks, undo/redo, save failures, and workspace history boundaries;
- duplicate codes and IDs, orphaned references, subdivision invariants, and separate geometry/location limits;
- populated legacy workspaces and layout-1/4 backups migrated to workspace 20 / layout 6, including Unassigned legacy code editing, explicit equal footprints and exact article matches; migration preserves uses, geometry, profile evidence and coverage reasons;
- metadata-only saves retaining actual source-byte and normalized-row chunks, plus backup round trips;
- functional 3D colors without locations and the read-only analysis inspector, including the shared component palette and object/usage color selection;
- common rack depth, stable junction ports, compatible magnetic connections, distance compilation and obstruction handling, passage clearance, groups, locks and wall openings;
- ordered collision results against an independent physical-part reference, and route stencil/picking calls using a WebGL adapter.

The controller tests use a minimal DOM adapter. They do not establish browser layout, native dialog behavior, WebGL availability, or full application runtime acceptance.

## Required manual checks in the current localhost runtime

Run the following in Microsoft Edge Desktop on Windows at `http://127.0.0.1:8765`. Use an isolated synthetic workspace and record the candidate revision/files. Paused Portable is not a current acceptance target.

1. Create a shelf rack with one bay and three levels. Cancel the builder once and confirm nothing was saved; finish it once and confirm zero locations/codes. Undo and redo the insertion.
2. Switch directly to Locations on an Unassigned level. Confirm the prerequisite explanation, shortcut to Zones, and disabled creation/count controls. Freely switch back to Structure and Zones.
3. Assign the lower level Picking, middle level Reserve, and leave the upper level Unassigned. Confirm assignment creates no locations. Check the per-level colors and legend in both floor plan and 3D; select each level using the view and selectors. Check bulk bay/rack assignment and undo.
4. Create three locations on the lower level and one on the middle level. Code only the lower level, leaving other work unfinished. Confirm its progress, independence of counts, workspace-wide code uniqueness, and that the level action touches only that level. Separately test the rack action: it fills existing empty locations across classified or migrated legacy scopes without changing existing codes or creating locations.
5. Import the synthetic [article-master fixture](../tests/fixtures/warehouse-master.csv) with `article_id`, `article_name`, and `location`. Configure `R01-03-02-01` on one location. In the separate analysis, find that code, inspect `SKU-300`, and check `OUTSIDE-01` is unmatched. Confirm analysis has no layout-edit controls.
6. Change geometry and zone use on a coded scope; reduce its locations and remove a coded level/bay/rack. Check affected-location/code/current-article-match/removal counts. Cancel each once, then confirm an edit and undo/redo it. Confirm retained IDs/codes and untouched scopes. Movement and rotation also warn when they affect existing locations.
7. Lock a rack. Confirm geometry, zone, location, and delete controls cannot modify it; selection and inspection remain possible. Check undo/redo respects current locks. Unlock and duplicate the structure: fresh physical IDs, Unassigned scopes, zero copied locations/codes.
8. Reload the app. Confirm geometry, uses, counts, codes, locks, and article matches persist. Export a workspace backup, restore as new, and compare the plan and matches. If migrating from paused Portable, use a backup exported by that historical version; direct storage sharing between origins is unavailable.
9. Restore a populated legacy layout-1 workspace backup. Compare every physical and position ID/code against its input. Confirm migrated scopes are Unassigned, existing codes remain editable and matchable, and subdivision creation requires classification. Classify one scope without changing its IDs/codes; leave another Unassigned. Reload and export/restore again.
10. Confirm ordinary import/analysis still works, and no remote assets or new mandatory service are required. Check storage failures leave the last saved layout and undo history intact where a controlled failure can be induced.
11. Set a common rack depth, extend at either end, and confirm existing IDs/codes remain. Restore mixed historical depths and confirm they change only after explicitly setting a common depth.
12. Add aisle/wall corners, T-junctions and crosses from their recipe categories. Change arms, snap compatible free ports, connect distant endpoints using preview/confirm/cancel and undo. Check endpoints remain fixed at creation and locked assemblies remain protected.
13. Configure a passage in an existing rack, connect routes through it, then supply vehicle dimensions. Check a clear passage, an actual upright/beam obstruction, and missing dimensions reported as unverified. Open/close a door in a wall opening; verify the lintel remains visible.
14. Overlap straight/junction route surfaces and rotate/zoom. Check uniform opacity and unchanged picking. In analysis compare blue frames/orange beams/gray decks with Structure/3D, switch to usage colors, and confirm article marker colors and stored layout do not change.
15. Check the permanent workspace frame in German and English, small/large windows and browser zoom. Banner/navigation remain reachable; forms/lists scroll internally. Scrolling the viewport zooms it; lists scroll without changing focused number/select fields. Check Tab focus, zoom buttons/keyboard and state retention after selection and redraw.

16. On a classified level create ten locations and reject an eleventh. Open **Edit level areas**, move sideways, resize widths and draw locations, change grid and hold Alt. Compare exact properties with the schematic front view and 3D footprints. Check a single full-depth row, unequal widths, overlap/bounds rejection, keyboard selection, duplicate with a fresh ID/blank code, remove, undo/redo, lock and failed saves. Retained areas keep their IDs/codes and other levels stay unchanged. Explicitly divide locations side by side and confirm rearrangement, including earlier prototype depth rows without losing IDs/codes. Reopen and backup/restore a layout-4 fixture and a free-placement workspace; compare every coordinate, code and ID.

17. Test enabled ground defaults, Ground (level 0) selection, independent use/codes and width/offset editing. Disable one bay, cancel once, confirm, undo/redo, reopen and backup/restore. Upper levels retain IDs/codes and heights. Check passage conversion disables ground and cannot silently restore storage there.
18. In the builder inspect the rotated top preview before insertion. Compare the gold front/aisle arrow at 0/90/180/270 degrees and an arbitrary angle in top plan and 3D, including translation and grouped movement. Verify ground/upper picking, direction hints and legend in EN/DE. Confirm marker geometry does not enter collision or route obstruction checks.

## Supplemental Edge fixture harness

For repeatable editor checks without changing the application's database:

```text
node tests/warehouse-browser-harness.cjs
```

Open the printed `http://127.0.0.1:8766/` URL in Edge. The harness serves the current bundled modules, creates synthetic fresh or migrated fixtures, uses a separate IndexedDB database (`openslotting-issue74-synthetic-acceptance`), and shows stored layout, match counts, and backup equality. Stop its temporary server with Ctrl+C.

The checkbox substitutes for `window.confirm`, recording the warning text and choosing accept/cancel. It does not test the app's native dialogs, full workspace import/activation UI, download/upload flow, launcher, or direct-file profile. This optional developer harness adds no production runtime dependency.

## Slot outline display development evidence — 2026-10-18

Source-tree checks on `codex/free-rack-locations`: the display correction leaves
workspace 20 / layout 6 unchanged. Frozen-reference tests compare every full
picking vertex and ID independently of the intentionally changed visible edges.
New cases cover inset-only display, selected-only tint, readable-zoom digits,
material colors, visibility and unchanged persistence/history. The complete Node
suite passed 405 tests with zero failures/skips; syntax, version-consistency and
whitespace checks passed.

The connected Edge browser was unavailable for this run. A synthetic fixture
was checked in the Codex integrated browser at a separate ephemeral Python
loopback origin: 3D showed the gray deck, outlines on the level without a deck,
front numbers at 400% zoom, selected tint and hide/show controls. Both editor
and analysis exposed the switch; no console errors appeared in those actions.
This does not establish company Edge, packaged runtime, direct mouse picking
or populated article-data acceptance. The full ID-buffer invariants are tested
automatically. Screenshots are synthetic development evidence only.

## Ground and rack-front development evidence — 2026-10-18

Uncommitted source tree on `codex/free-rack-locations`, based on
`bcbf8e712ecf4424cbddc86f5c0b4dc57778fd79`: workspace 20 / layout 6.

- Complete Node suite: 400 passed, zero failed/skipped. Eight ground-model,
  migration/scene/storage/orientation cases and two controller cases were added.
  Syntax, version consistency and whitespace checks passed.
- Edge through a temporary Python loopback fixture at a separate ephemeral
  origin: Ground (level 0) selection, width 900 to 700 mm and offset 0 to 100 mm,
  retained codes and persistence after reopening succeeded. Disabling and
  re-enabling an empty bay removed/restored the ground option. EN/DE labels and
  fields remained reachable; no console errors appeared in the checked actions.
- Visually checked floor footprints in 3D, the gold access edge/arrow in 3D and
  the top plan, and the builder preview at 90 degrees before applying. Gold
  orientation outlines remain gold when the rack is selected. Only synthetic
  fixtures were used; the fixed production origin was untouched.
- This is source-tree development evidence. Exact packaged-candidate/company
  Edge acceptance, native confirmation for removing coded ground locations,
  full backup UI, populated article inspection and grouped/free-angle visual
  checks remain pending. Model/controller tests cover those data and history
  invariants without establishing their complete browser workflows.

## Front-row correction — 2026-10-18

The initial free-area prototype below allowed depth rows. The current correction
uses a schematic front view and full-depth side-by-side locations. Adding and
duplicating cannot wrap into another depth row. Earlier prototype areas load
unchanged until explicitly divided side by side. The regression cases cover
these rules and preserved identities. The earlier browser evidence does not
establish visible acceptance of this corrected front-view interaction.

Complete Node suite after the correction: 390 passed, zero failed/skipped.
Syntax, version-consistency and whitespace checks passed. The controller tests
also verify that individual depth/forward-offset inputs are no longer exposed.
Full-depth locations follow subsequent rack-depth edits while retaining widths,
IDs and codes; historical partial-depth areas remain unchanged on loading.

## Initial free-location development evidence — 2026-10-18

Source-tree check on `codex/free-rack-locations`, based on
`bcbf8e712ecf4424cbddc86f5c0b4dc57778fd79`, with uncommitted feature changes.
This is development evidence, not acceptance of a packaged release candidate.

- Complete Node suite: 387 passed, zero failed/skipped. Includes eight new model,
  migration/scene/storage cases and one controller save/rollback case.
- Syntax checks on the four changed JavaScript modules and version consistency
  passed; whitespace check passed.
- Microsoft Edge, German UI, production application assets through a temporary
  Python loopback harness at an isolated ephemeral origin: numeric editing,
  mouse move, corner resize and drawing a third area succeeded. A level with ten
  locations disabled adding/drawing. Reopening the workspace retained the three
  freely placed areas and their two existing codes. No console errors appeared
  in the checked interactions. Only synthetic rack/area data was used; the fixed
  production origin was untouched.
- Exact packaged-candidate launch, company browser policies, native confirmation
  dialogs, EN layout, touchpad/Alt gestures, full backup UI and populated article
  inspection remain manual checks. Automated tests establish migration and backup
  round trips, not those visible workflows.

## Historical source-branch evidence — 2026-10-09

The following table was supplied with `72f992a` from the warehouse branch. It
documents that source candidate, not a new acceptance run of the merged localhost
candidate. The original two-profile scope belongs to that historical branch.

| Check | Result |
| --- | --- |
| Complete Node suite | 257 passed, zero failed/skipped. |
| Syntax checks | All seven baseline runtime files, four changed warehouse modules, and the optional harness passed. |
| Windows launcher logic | Portable and localhost launcher tests passed under both Windows PowerShell and PowerShell 7. |
| Supplemental Edge: fresh workflow | Zero implicit locations; Unassigned creation gate; Picking/Reserve/Unassigned in one rack; independent 3/1/0 counts and codes; colored floor plan and WebGL 3D. |
| Supplemental Edge: persistence | Reload retained schema 14, uses, IDs and codes; backup stringify/parse equality was true. |
| Supplemental Edge: legacy and analysis | Legacy IDs/codes retained, initially Unassigned; exact code search showed the synthetic matching article and unmatched outside code. |
| Supplemental Edge: warning cancellation | Changing a legacy lower-level use reported two existing locations, two codes, one current article match, and zero removals; cancellation retained Unassigned and the stored plan. Confirmation retained IDs/codes. |
| Supplemental Edge: locking | Locking disabled functional-use and bulk-assignment controls while selection remained available; unlocking restored editing. |
| Full Enhanced Local app acceptance | App opened from the existing localhost launcher. Native create-workspace prompt handling timed out in browser automation; restore upload was unavailable because local-file extension access was disabled. Full end-to-end workflow acceptance remains open. |
| Portable direct-file acceptance | Browser automation rejected `file:///` under its URL security policy. No permission or security workaround was used. Human runtime acceptance of the exact candidate remains open. |

## Merged localhost evidence — 2026-10-09

The merged candidate passed 310 application tests and 21 historical laboratory
module tests. Launcher logic passed under Windows PowerShell 5.1 and PowerShell 7.
An isolated Codex-browser harness run retained Picking/Reserve/Unassigned,
explicit 2/1/0 counts and three rack-generated codes after reload; its visible
schema-14/layout-2 backup comparison was equal. Native Edge was not connected
for this new run. Full localhost application acceptance remains open; see the
[integration and measurement report](performance/warehouse-layout-v2.md).
