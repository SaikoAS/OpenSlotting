# Warehouse walk / Lager-Rundgang

The **Walk / Rundgang** menu opens a separate, read-only first-person view of the active workspace. It reuses the saved warehouse geometry, locations and current article-master assignments. It never saves geometry, source settings, article assignments or camera positions. Only the field-of-view preference is saved, in workspace schema 21. No dependency, external asset or network service is added; the existing Python standard-library localhost launcher serves the additional runtime files.

## Navigation

- The first entry starts on a free point near the first rack's access side. The minimap shows modeled object footprints, observer position/direction and the selected location. Click a free point to select a different start position. This is an explicit position jump, not a computed walking route.
- Focus the 3D canvas, then hold **WASD** or the **arrow keys** to move. Diagonal/combined input is normalized. Choose **Walk / Gehen** or **Free flight (no collision) / Freiflug (ohne Kollision)** in Movement.
- Set speed with the slider or exact numeric field, **0.1–20.0 m/s in 0.1 m/s steps**; the adjacent output also shows km/h. Walk starts at 1.4 m/s, flight at 5 m/s. Each mode retains its own selected speed for the current workspace session. Switching workspace resets these transient settings; only FOV is persisted.
- In Walk, **Space** jumps and **hold C** crouches. The Jump button performs one jump; the Crouch button toggles crouching for use without holding a key. Crouching lowers eye height to 60% (minimum 0.65 m) and halves movement speed. Releasing C or turning crouching off only stands up when there is enough room. A held jump key never starts repeated jumps, and crouching prevents jumping.
- In Free flight, WASD moves along the viewing direction, **Space** ascends and **C** descends. Physical collisions and gravity are disabled, as stated in the selector and hints. Horizontal scene bounds still apply and view height is bounded to 0.3–80 m. Position, view height and mode are visible, including the fullscreen overlay. Switching back to Walk finds a nearby free floor position at the configured standing height. If no such point exists, flight and the current position are retained with a visible message.
- Drag with the left mouse button to look around. **Enable mouse look / Mausblick aktivieren** requests browser pointer lock only after a user click. **Esc** releases mouse look and pauses movement. If pointer lock is unavailable, dragging remains available.
- Movement also stops on canvas/window blur, tab hiding and leaving the menu. Typing into search or controls never moves the observer. Merely opening the menu does not capture the pointer or start movement.
- Standing eye height is adjustable from 1,000 to 2,200 mm in Walk. An increase is rejected if there is insufficient modeled clearance at the current position. This field is disabled during flight; it retains the walking height for returning to Walk.
- **Field of view (vertical) / Sichtfeld (vertikal)** adjusts the vertical angle from **45 to 100 degrees**, default **60 degrees**. The slider previews immediately; releasing it or changing it with the keyboard saves the value locally per workspace. **Reset field of view / Sichtfeld zurücksetzen** restores 60 degrees. Reopening and backup/restore retain the angle. A failed save restores the previously saved angle and shows a message. These presentation settings never change rack dimensions or location geometry.
- Search an exact location code (outer whitespace is ignored; leading zeros and case are retained). Search selects the location without changing the observer's position. **Stand in front of location / Vor Stellplatz stellen** offers an explicit jump to a free point on that rack's access side and looks toward the selected location. If the bounded search cannot find space on that side, the existing position is retained and a message explains the failure.
- Location labels appear nearby when they are in view and not hidden behind physical parts; clicking a label or visible location area opens its details. Labels are limited to 24 nearby candidates, checked for overlap and physical occlusion. Hide the details panel for more viewing space.
- The shared rack convention is retained: viewed from the access side, bay/location indices increase from left to right, including rotated racks and ground locations.

## Fullscreen and mouse look

**Enter fullscreen / Vollbild starten** opens the walk root in native browser fullscreen, then requests mouse look from the same explicit user action. While moving, the header, normal toolbar and inspector are hidden. A compact overlay retains Pause/Resume, Controls, Minimap, Details and an explicit Exit fullscreen button. **E** interacts with the location under the center crosshair; locked mouse clicks do not replace this interaction.

## Interacting with locations

Aim at a visible location surface within **6 m**. The crosshair prompt shows **E · Interact / E · Interagieren** and the exact location code only when a target is reachable. With no valid target the prompt is hidden; uncoded targets are identified by rack, bay, level/ground and position instead. Press E to open a centered, scrollable article dialog **inside the current fullscreen view**. Real physical parts occlude the interaction ray; an old selection never substitutes for the aimed location. The same FOV is used for rendering and selection. E is ignored in text fields, while paused in fullscreen, and while the dialog is already open.

Opening the dialog pauses walking/flying, clears held movement inputs and releases owned mouse look. Background controls become inert and Tab/Shift+Tab stay inside the dialog. The mouse operates the article selector and **Metrics / Kennzahlen**, **Master data / Stammdaten**, and **Period comparison / Periodenvergleich** sections. Multiple currently assigned articles can be inspected separately; quantities from different articles/units are not summed. Cards reuse already calculated quantity, line, order, customer, active-day and source-file counts across all validated data. Missing metrics remain unknown and known zero remains zero. Master custom values require article-master provenance, and up to twenty retained source references can be expanded. No import-row aggregation runs during interaction or movement.

**Back to walk / Zurück zum Rundgang** closes the dialog and explicitly resumes mouse look or the already offered drag fallback, retaining camera position, viewing direction, FOV, selected location and movement mode. If mouse look is denied, the existing pause/fallback controls remain available. **Close details / Details schließen** or Esc dismisses the dialog while movement remains paused; use Resume to continue. Browser Esc may also leave fullscreen. Choosing a location by label/search while in fullscreen opens the same dialog. The optional **Open article view (leave walk) / Artikelansicht öffnen (Rundgang verlassen)** action navigates to the existing article workflow and leaves fullscreen. Workspace/page changes, fullscreen exit and deletion of the inspected location clear the dialog and restore background controls.

**Esc**, loss of focus or pointer-lock release stops movement and exposes controls. Resume is explicit; paused fullscreen does not accept movement keys. Controls, the FOV slider, search, the minimap and details can be used after pausing. Opening an article/coverage workflow or changing workspace releases owned mouse look and fullscreen. Leaving fullscreen retains camera position and selected location. Mode, position and viewing direction remain transient; only FOV is persisted.

If fullscreen or mouse look is denied by the browser/device, show a visible message and retain normal navigation/drag controls. After a mouse-look denial, the fullscreen resume action explicitly offers movement without mouse lock, using drag to look around. Browser Esc behavior can release mouse look first and leave fullscreen on a later press. Native fullscreen and pointer-lock permissions require company-browser acceptance.

## Movement and geometry

Coordinates remain millimeters in saved warehouse data and are converted to meters for this view. In Walk, a 0.28 m observer radius and a body from the current foot position to eye height plus 0.15 m are checked against the actual rotated physical parts. Small movement substeps prevent crossing thin obstacles; movement can slide along walls. Jump starts with 3.8 m/s upward velocity and gravity is 9.81 m/s² (about 0.72 m maximum rise without obstacles). Vertical substeps stop at overhead parts and land on physical supports, including thin decks, or the virtual floor. Leaving a support resumes falling; logical location areas and route/function markings never support or block the observer. Pause/focus loss stops the simulation until movement resumes. These transient camera/body calculations never change stored geometry.

The scene has a virtual level floor and an adaptive grid. Its extent is derived from modeled objects plus a four-meter border, with movement confined to that extent. Real hall dimensions, ceilings, stock and continuous stairs/ramps are not inferred. Model actual walls/openings in the editor. The minimap's rack footprint does not represent an impassable solid volume; Walk uses individual parts and Free flight intentionally passes through them.

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

`warehouse-walk-model.js` contains meter transforms, perspective math, spatial indexing, collision movement and ray selection. `warehouse-walk-renderer.js` builds typed world-space GPU buffers and uses a true perspective matrix with a configurable 45–100-degree vertical field of view (default 60), a 0.05 m near plane and an 80 m far plane. Rendering, labels and selection rays use the same angle. The existing orthographic editor/analysis renderer remains separate. Meshes upload on scene/color changes; camera frames and live FOV previews update uniforms only. Selection has its own small outline buffer. No per-frame geometry compilation or source aggregation is needed.

The two-meter spatial grid bounds local collision/ray queries; very large obstacles use a separate list instead of unbounded grid insertion. Distant objects are clipped/fogged. The minimap background is cached; only observer/selection indicators redraw during movement. Animation stops when there is no movement or pending view change.

Without WebGL2, code search, location/assignment details and the minimap remain available. GPU loss pauses movement and reports the fallback; restored contexts rebuild GPU buffers. Pointer lock and continuous native mouse/keyboard behavior still require acceptance on the intended company browser/device.

## Verification

Run `node --test tests/*.test.cjs`. The dedicated walk tests cover perspective/projection agreement, front-side orientation, rotated physical collisions, passage height, wall sliding/no tunneling, bounded search/index behavior, ray occlusion, unmodified source geometry, GPU buffer reuse/restoration, exact-code fallback search and focus-scoped movement stopping. Launcher tests request all four new runtime assets; the release ZIP allowlist includes them.

For manual acceptance use synthetic data. Check WASD/diagonal movement, drag/mouse lock and Esc, passage clearances, arbitrarily rotated racks, floor/upper locations, minimap jumps, blocked approach points, color meanings, article/source navigation, period comparisons, workspace switching, short viewports and context-loss fallback. Record browser/device-specific results separately from model/adapter tests.
