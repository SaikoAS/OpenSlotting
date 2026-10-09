# Warehouse workflow acceptance (issue #74)

Use only synthetic layouts, CSVs, article identifiers, and location codes. Run the checks against the exact candidate files intended for review. Follow the repository quality checks in [CONTRIBUTING](../CONTRIBUTING.md) and the localhost setup in [runtime acceptance](acceptance-localhost.md). Active development uses localhost only; Portable remains paused.

## Automated coverage

```text
node --test tests/*.test.cjs
```

The warehouse model, scene, editor-controller, workspace, storage, and backup tests cover:

- geometry creation with zero implicit locations; independent uses and subdivision counts; partially completed racks;
- scope selection across modes; wizard cancel and one-edit completion; explicit level or rack code generation without creating locations;
- preserved IDs/codes, impact counts, confirmation cancellation, deletion, duplication, locks, undo/redo, save failures, and workspace history boundaries;
- duplicate codes and IDs, orphaned references, subdivision invariants, and separate geometry/location limits;
- populated schema-12/13 workspaces and layout-1 backups migrated to schema 14 / layout 2, including Unassigned legacy code editing and exact article matches;
- metadata-only saves retaining actual source-byte and normalized-row chunks, plus backup round trips;
- functional 3D colors without locations and the read-only analysis inspector.

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

## Supplemental Edge fixture harness

For repeatable editor checks without changing the application's database:

```text
node tests/warehouse-browser-harness.cjs
```

Open the printed `http://127.0.0.1:8766/` URL in Edge. The harness serves the current bundled modules, creates synthetic fresh or migrated fixtures, uses a separate IndexedDB database (`openslotting-issue74-synthetic-acceptance`), and shows stored layout, match counts, and backup equality. Stop its temporary server with Ctrl+C.

The checkbox substitutes for `window.confirm`, recording the warning text and choosing accept/cancel. It does not test the app's native dialogs, full workspace import/activation UI, download/upload flow, launcher, or direct-file profile. This optional developer harness adds no production runtime dependency.

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
