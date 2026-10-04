# OpenSlotting project map

The active application runs in the browser at a loopback localhost origin.
Python serves the bundled interface files using only its standard library.
CSV import, normalization, analysis, and IndexedDB storage remain in the browser;
Python has no workspace database or upload endpoint.

## Code boundaries

| Files | Responsibility |
| --- | --- |
| `index.html`, `app.css`, `terminal-theme.css` | Interface shell and local styles |
| `app.js` | Bilingual interface, navigation, import controls, background worker, and workspace lifecycle |
| `runtime.js` | Loopback detection, startup rejection, and optional browser capabilities |
| `encoding.js`, `csv.js` | Decoding, streaming CSV parsing, mapping, preparation rules, validation, article registry, and analysis |
| `periods.js`, `terminal.js` | Coverage, period comparison, and analysis-desk projections |
| `workspace.js`, `storage.js` | Workspace/backup contract, validation, migration, and chunked IndexedDB persistence |
| `warehouse.js` | Layout validation, stable part IDs, location codes, collisions, and article matching |
| `warehouse-scene.js`, `warehouse-webgl.js` | Shared geometry and local WebGL2 rendering |
| `warehouse-editor.js`, `warehouse-editor.css` | Layout editing and top/3D views |
| `warehouse-analysis.js` | Read-only location analysis from current article-master data |
| `Start-OpenSlotting-Localhost.py` | Static loopback file service and launcher health identity |
| `OpenSlotting.Windows.psm1` | Shared Edge discovery and safe managed-shortcut helpers |
| `OpenSlotting.Localhost.Windows.psm1` | Python discovery, verified server ownership, start/stop, and localhost shortcut planning |

The normal user commands are `Start-OpenSlotting.cmd`, `Stop-OpenSlotting.cmd`,
`Install-OpenSlotting.cmd`, and `Remove-OpenSlotting.cmd`. The existing
`*-Localhost` script names remain compatibility entry points for current
shortcuts. They use the same server and data origin.

## Development and distribution

- `tests/`: Node logic/integration tests and Windows PowerShell launcher checks.
- `test-data/`: fully synthetic CSV fixtures.
- `tools/benchmark-*.cjs`: optional synthetic performance measurements.
- `tools/package-release.ps1`: ZIP packaging from an explicit Git commit.
- `.github/workflows/ci.yml`: syntax, tests, launcher checks, and packaging.
- `docs/`: current contracts and acceptance checklists; versioned acceptance
  records describe earlier releases only.
- `dist/` and `__pycache__/`: ignored local output, not application sources.

End users need an existing browser, Python 3.8 or newer, and the complete local
folder. Windows scripts use the PowerShell already supplied with Windows.
Node.js is only a contributor test/benchmark tool. No npm or pip packages,
installer, compiled OpenSlotting executable, or cloud account are required.

[Runtime](runtime.md), [startup](localhost-start.md), [data contract](data-format.md),
[workspace contract](workspace-format.md), and [Portable handoff](portable-mode-paused.md)
describe the supported boundaries in more detail.

## Structure proposal and isolated experiments

The repository-only `docs/project-structure-plan.md` maps the current files
to a possible future layout. No application files have been moved for that plan.
The repository-only `experiments/localhost-lab/README.md` describes
separate worker, source-byte storage, backup and Base64 validation candidates,
benchmarks and their evaluation. These files are not loaded by the application,
served by its Python runtime or included in the release package.
