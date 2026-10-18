# Warehouse walk / Lager-Rundgang

The **Walk / Rundgang** menu opens a separate, read-only first-person view of the active workspace. It reuses the saved warehouse geometry, locations and current article-master assignments. It never saves geometry, source settings, article assignments or camera positions. No schema migration, dependency, external asset or network service is added; the existing Python standard-library localhost launcher serves the additional runtime files.

## Navigation

- The first entry starts on a free point near the first rack's access side. The minimap shows modeled object footprints, observer position/direction and the selected location. Click a free point to select a different start position. This is an explicit position jump, not a computed walking route.
- Focus the 3D canvas, then hold **WASD** or the **arrow keys** to walk. Diagonal input is normalized. Slow, Normal and Fast correspond to 0.7, 1.4 and 2.4 meters per second.
- Drag with the left mouse button to look around. **Enable mouse look / Mausblick aktivieren** requests browser pointer lock only after a user click. **Esc** releases mouse look and pauses movement. If pointer lock is unavailable, dragging remains available.
- Movement also stops on canvas/window blur, tab hiding and leaving the menu. Typing into search or controls never moves the observer. Merely opening the menu does not capture the pointer or start movement.
- Eye height is adjustable from 1,000 to 2,200 mm. An increase is rejected if there is insufficient modeled clearance at the current position.
- Search an exact location code (outer whitespace is ignored; leading zeros and case are retained). Search selects the location without changing the observer's position. **Stand in front of location / Vor Stellplatz stellen** offers an explicit jump to a free point on that rack's access side and looks toward the selected location. If the bounded search cannot find space on that side, the existing position is retained and a message explains the failure.
- Location labels appear nearby when they are in view and not hidden behind physical parts; clicking a label or visible location area opens its details. Labels are limited to 24 nearby candidates, checked for overlap and physical occlusion. Hide the details panel for more viewing space.
- The shared rack convention is retained: viewed from the access side, bay/location indices increase from left to right, including rotated racks and ground locations.

## Movement and geometry

Coordinates remain millimeters in saved warehouse data and are converted to meters for this view. A 0.28 m observer radius and a body extending from floor to eye height plus 0.15 m are checked against the actual rotated physical parts. Small movement substeps prevent crossing thin obstacles; movement can slide along walls. Traversable elevated gaps are tested by height. Logical location areas and route/function markings are not solid goods or obstacles.

The scene has a virtual level floor and an adaptive grid. Its extent is derived from modeled objects plus a four-meter border, with movement confined to that extent. This does not infer real hall dimensions, ceilings, stock, stairs, ramps or multistory navigation. Model actual walls/openings in the editor. The minimap's rack footprint does not represent an impassable solid volume; 3D movement uses individual parts.

## Location evaluation

The inspector shows code, rack/bay/level/position, use, width/depth and logical support height. Current article-master assignments use the same exact code matching as 3D analysis. Available analyzed articles show their order-line count, exact formatted quantity and active-day count, plus a link to the existing article detail/source evidence. If a period comparison has already been calculated, its A/B line counts and configured period names appear for that article. Use **Check data coverage / Datenabdeckung prüfen** to inspect the coverage calendar when available.

**Current assignment is not a stock measurement.** Demand is the aggregate of the currently assigned articles across all validated included data. It is not evidence of historical location visits or actual physical occupancy. Unknown article metrics remain unknown; quantities are displayed per article rather than summed across possibly different units.

Color modes affect location outlines while physical frame/beam/deck materials remain recognizable:

| Mode | Meaning |
| --- | --- |
| Assignments | Green: current article match; blue: code without a match; muted: no code. |
| Usage | Existing Unassigned, Picking and Reserve colors. |
| Demand | Logarithmically scaled order-line totals of currently assigned analyzed articles, blue to orange relative to the current maximum. Gray means unknown, including missing metric coverage for any assigned article. A known zero remains a known low value. |

No local date filter is introduced: overall demand uses the whole current validated analysis. Configure a comparison in the existing comparison workflow to see A/B counts. Changing data, workspace, language or colors refreshes the derived view when it is rendered again; no import-row scans run during walking.

## Rendering and fallback

`warehouse-walk-model.js` contains meter transforms, perspective math, spatial indexing, collision movement and ray selection. `warehouse-walk-renderer.js` builds typed world-space GPU buffers and uses a true perspective matrix with a 60-degree vertical field of view, a 0.05 m near plane and an 80 m far plane. The existing orthographic editor/analysis renderer remains separate. Meshes upload on scene/color changes; camera frames update uniforms only. Selection has its own small outline buffer. No per-frame geometry compilation or source aggregation is needed.

The two-meter spatial grid bounds local collision/ray queries; very large obstacles use a separate list instead of unbounded grid insertion. Distant objects are clipped/fogged. The minimap background is cached; only observer/selection indicators redraw during movement. Animation stops when there is no movement or pending view change.

Without WebGL2, code search, location/assignment details and the minimap remain available. GPU loss pauses movement and reports the fallback; restored contexts rebuild GPU buffers. Pointer lock and continuous native mouse/keyboard behavior still require acceptance on the intended company browser/device.

## Verification

Run `node --test tests/*.test.cjs`. The dedicated walk tests cover perspective/projection agreement, front-side orientation, rotated physical collisions, passage height, wall sliding/no tunneling, bounded search/index behavior, ray occlusion, unmodified source geometry, GPU buffer reuse/restoration, exact-code fallback search and focus-scoped movement stopping. Launcher tests request all four new runtime assets; the release ZIP allowlist includes them.

For manual acceptance use synthetic data. Check WASD/diagonal movement, drag/mouse lock and Esc, passage clearances, arbitrarily rotated racks, floor/upper locations, minimap jumps, blocked approach points, color meanings, article/source navigation, period comparisons, workspace switching, short viewports and context-loss fallback. Record browser/device-specific results separately from model/adapter tests.
