# Portable Mode: paused indefinitely

As of 2026-10-04, active OpenSlotting development targets localhost only.
Portable Mode (`file:///index.html`) is deliberately paused for an indefinite
period. It has not been abandoned: interested contributors can resume its
development independently from the preserved source below.

## Preserved development basis

- Source branch: `codex/parametric-warehouse-editor`
- Exact source commit: `cb193338342cd23f5cb89814c33bee0bf65cc77e`
- Localhost continuation branch: `codex/localhost-development`

That commit contains the complete application before the separation, including
CSV and article-master import, preparation rules, workspaces, backups, period
comparison, the analysis desk, the warehouse editor, and the separate 3D view.
The source branch is not changed by the localhost refactoring. The exact commit
is the recovery reference even if a branch later moves. It is a development
snapshot, not a newly accepted release.

To resume from that basis in a Git checkout:

```text
git switch -c codex/portable-resume cb193338342cd23f5cb89814c33bee0bf65cc77e
```

Future maintainers can port newer domain features from localhost development.
They own direct-file startup, browser storage behavior, workers, distribution,
and fresh Edge acceptance for their resumed version. Active localhost changes
do not require a direct-file fallback or a second Portable acceptance run.
The earlier direct-file launcher functions and runtime checks remain available
in the preserved commit rather than as dormant paths in the active application.

## Existing Portable workspaces

Browser data stays where it was stored. This change does not delete, migrate,
or merge any browser database. The current localhost application intentionally
does not open workspaces from direct-file origins.

1. Keep the existing application copy and its original Edge profile available.
2. Open that previous Portable copy in the same way as before. Merely checking
   out the preserved commit at a different path may expose a different file
   origin; do not move the only working copy before exporting its workspaces.
3. Export each required workspace as a complete JSON backup.
4. Start the current application at `http://127.0.0.1:8765/index.html` with the
   same intended Edge profile and restore each backup as a new workspace.
5. Check sources, mappings, validation, results, and warehouse layout before
   removing any old application copy or clearing browser data.

Existing localhost workspaces retain their database name and stable origin;
this runtime separation does not require their export or migration.
Portable backup means a transferable JSON format here. That backup capability
continues to be supported in the active application and does not depend on
resuming Portable Mode.

Backups contain original operational data. Store and transfer them only through
approved local or company-controlled paths; do not attach them to public issues
or commit them to this repository. The pause has no planned end date or automatic
reactivation. Contributions to resume it are welcome.
