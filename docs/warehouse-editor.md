# Warehouse editor prototype

The **Warehouse editor / 3D-Editor** has three freely selectable modes: **Structure / Struktur**, **Zones / Zonen**, and **Locations / Lagerplätze**. The separate **3D analysis / 3D-Auswertung** reads the saved plan and current article-master data. Complete one level or rack while leaving others unfinished; there is no warehouse-wide completion gate.

## Structure

Build physical geometry first. New racks and levels have an Unassigned functional scope and **zero locations**. The three-step rack builder edits only type/name, bays/uprights, and levels/decks. Its front preview shows dimensions. Cancel or Escape leaves the saved layout unchanged; finishing is one undoable edit.

Pallet and shelf racks have 1–30 bays. Each bay has independent width, depth, and 1–12 levels. Each level has clear height, beam/shelf thickness, and an optional deck with its own thickness. Each upright has independent width, depth, and height. Adding bays retains existing differences and starts new bays with the first bay's level count. Stacks taller than an adjacent upright are rejected. All dimensions are millimeters.

Walls, gates, doors, emergency exits, aisles/roads, goods-in, and goods-out are physical objects with dimensions, coordinates, and rotation. Their floor-plan overlap never assigns Picking or Reserve use. These are planning symbols, not building or fire-safety validation.

## Zones

Assign each rack level **Picking / Kommissionierung**, **Reserve**, or **Unassigned / Nicht zugewiesen**. The level list allows independent assignments at different heights within one rack. Apply a use to the selected bay or whole rack as a convenience; each level remains independently editable afterward. Assigning a zone does not create locations.

Green represents Picking, purple Reserve, and gray Unassigned. The legend is shown in both editor views and analysis. In 3D, beams and decks show the functional color even when there are no locations. In the floor plan, each bay's bands represent its levels from bottom to top, not separate physical floor areas. Clicking a band or 3D beam/deck selects that level; bay/level selectors remain available.

## Locations

Select a classified level and explicitly choose **0–4 locations**. Counts are independent per level. Existing IDs and codes survive expansion; only added subdivisions receive new IDs. Enter codes individually or fill empty codes in the selected level from a prefix in `PREFIX-BAY-LEVEL-POSITION` form with two-digit indices. Code generation does not touch other levels or create locations.

Codes are trimmed at their ends, case-sensitive, at most 80 characters, and unique workspace-wide. Leading zeros remain significant. Progress for the selected level shows its modeled state, functional use, and the number of coded locations. A scope can have an assigned use and no locations yet.

An Unassigned level explains the classification prerequisite and links directly to Zones. Its count controls are disabled. Locations retained after removing a classification remain visible and keep their IDs and codes. Migrated legacy locations additionally allow code editing before classification; resizing still requires a use assignment.

## Existing locations and safe edits

Changing dimensions, placement, functional use, subdivision counts, or existing codes prompts with the number of affected existing locations, codes, current article matches, and removed locations. Cancel retains the full saved layout. Confirmation applies one undoable edit. Geometry changes retain surviving physical IDs, zone IDs, location IDs, and codes; deleting a level/bay/object removes only its referenced zones and locations. Validation rejects orphaned references rather than silently dropping them. The warning counts current article-master matches, not inventory quantities.

**Duplicate structure** copies physical measurements with fresh part IDs, starts unlocked and Unassigned, and creates no locations. It preserves the original rack's assignments and codes. Undo/redo covers the last 20 saved edits within the current workspace. Mode changes are session state. Lock changes are saved outside history; undo/redo preserves current locks and refuses changes affecting a locked object's geometry, zones, or locations. Unlock before editing. A lock prevents accidental edits and is not an access-control mechanism.

## Views and layout checks

The bundled WebGL2 renderer uses a depth buffer and an offscreen color-ID pass for picking. In 3D, left drag rotates; right/middle drag or Shift+drag pans; the wheel zooms. Double-click or **Focus object** focuses the selected object. **Fit view** restores framing. **Walls** cycles solid/transparent/hidden without changing saved geometry. If WebGL2 is unavailable or lost, the top view remains available. Camera settings are session-only.

In Structure's top view, drag an object to move it with 100 mm snapping, or use X/Z for exact coordinates. In Zones and Locations, the plan selects scopes and pans without moving geometry. Optional **Magnetic snap**, initially off, joins nearby compatible wall/gate/door/exit endpoints before grid snapping, previews the target, and uses release hysteresis. Wall corners are supported; gates and doors connect in a straight line. Locked objects can be connection targets. Doors/gates do not cut openings in continuous walls; arrange wall segments explicitly.

Collision checks use rotated floor footprints and report overlap or obstructed aisles. Intentional goods-in/out overlays and touching edges are allowed. Warnings do not assess route suitability, structural loads, access, or safety requirements.

## Read-only article analysis

The separate analysis matches only current `location` values from imported **article-master** data to configured codes. It shows matched articles and unmatched codes. Click a location marker or search its exact code to inspect rack/bay/level/position, functional use, and matched articles. Multiple articles may share one location. Historical order-line locations do not determine occupancy. The analysis has no layout save controls and does not show unreliable stock-by-location quantities.

## Storage, migration, and limits

Workspace schema **14** stores layout schema **2**: physical `objects`, level-reference `zones`, and explicit `locations`. Migrating a populated layout schema 1 moves nested `levels[].positions[]` into the location collection, preserving every position ID and code. All migrated scopes are Unassigned; no Picking/Reserve classification is inferred. Current article-master matching therefore remains exact. Workspaces predating a warehouse plan receive an empty schema-2 plan.

Layout changes use metadata-only, revision-checked IndexedDB writes and do not rewrite CSV bytes, normalized row chunks, or article-registry chunks. Existing workspace backups include the complete plan and migrate legacy backups during restore. The database version remains 3. The plan is limited to 150 physical objects and 5,000 logical locations.

Both app views use bundled local assets in Portable (`file:///`) and Enhanced Local Mode. Neither requires network assets or a new service. Browser storage remains origin-specific; move plans between profiles through backup export/restore.

For automated and manual acceptance, see [warehouse workflow acceptance](acceptance-warehouse-workflow.md).
