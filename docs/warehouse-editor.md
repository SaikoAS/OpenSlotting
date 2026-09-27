# Warehouse editor prototype

The editor is available from the **Warehouse 3D / Lager 3D** item in an opened workspace. It stores a parametric plan in that workspace's IndexedDB metadata and includes it in the existing workspace backup. The same local assets run through the standard loopback start and by opening `index.html` directly through `file:///`; no network asset or additional service is required.

## Recipes and dimensions

- **Pallet rack** and **shelf rack** have 1–30 bays. Every bay has its own width and depth and 1–12 levels. Each level has a clear height, beam or shelf thickness, an optional deck with its own thickness, and 1–4 position IDs. Each upright has its own width, depth, and height.
- **Wall, gate, emergency exit, aisle/road, goods-in, and goods-out** are dimensioned objects that can be positioned and rotated. Gates and emergency exits are drawn as frames; aisles and zones are flat surfaces. These are planning symbols, not safety or building-code verification.
- All dimensions and coordinates are in millimeters. X and Z define the floor plane; height is vertical. The 3D canvas supports drag to rotate, wheel to zoom, click to select, fit view, and top view. Objects are positioned precisely in the properties panel.
- Generated geometry is derived from the saved measurements. Each rack, bay, upright, level, and position has a stable ID. Increasing counts retains existing IDs and codes. Reducing counts warns before coded positions are removed. A level exceeding an adjacent upright blocks that edit.

## Location codes and imported articles

Each position can hold one location code. Codes can be entered individually or generated into empty positions from a prefix in `PREFIX-BAY-LEVEL-POSITION` form, with two-digit numbers. Codes are trimmed at their ends, case-sensitive, and must be unique in a workspace; leading zeros remain significant.

The overlay uses only the current `location` from imported **article-master** data. It matches that code exactly to a modeled position, shows matched article counts, and lists the first unmatched article locations for review. Multiple articles may refer to the same modeled position. Historical `location` values from order lines are not treated as current occupancy. The current import does not contain reliable quantity-by-position inventory data, so the prototype does not show stock quantities.

## Storage and current limits

Schema version `12` adds an empty plan to earlier workspaces during validated activation. Layout edits use metadata-only revision-checked writes, so they do not rewrite original CSV bytes or normalized row chunks. Backup export and restore include the plan. The plan is limited to 150 objects and 5,000 positions; this first version is intended for layout and code validation rather than building-code assessment, collision detection, or large-facility CAD editing.
