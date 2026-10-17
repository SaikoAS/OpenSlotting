# Contributing to OpenSlotting

Contributions are welcome. Keep changes small, reviewable, local-first, and supported by synthetic evidence.

## Workflow

1. Open an issue before a large behavioral or data-model change.
2. Do not work directly on `main`. Use a short-lived branch.
3. Submit the change through a pull request against `main`.
4. Keep the branch current with `main` and limit the PR to its stated issue.
5. Ensure the required `quality` check passes.
6. Address review findings and resolve every review thread before merge.

## Quality checks

Run the repository checks before requesting review:

```text
node tools/check-release.cjs --commit HEAD
node --check csv.js
node --check app.js
node --check encoding.js
node --check periods.js
node --check runtime.js
node --check workspace.js
node --check storage.js
node --check terminal.js
node --check warehouse.js
node --check warehouse-webgl.js
node --check warehouse-scene.js
node --check warehouse-editor.js
node --check warehouse-analysis.js
node --check src/application/import-profile-batch.js
node --check src/ui/import-profile-panel.js
node --check src/ui/coverage-calendar.js
node --test tests/*.test.cjs
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/windows-launcher.test.ps1
pwsh -NoProfile -File tests/windows-launcher.test.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/localhost-windows-launcher.test.ps1
pwsh -NoProfile -File tests/localhost-windows-launcher.test.ps1
```

Version/build, roadmap milestones and data-format numbers are separate contracts.
See [the versioning policy](docs/versioning.md) for SemVer decisions and the
release/tag/ZIP checks. Ordinary feature PRs keep development status and may
retain the last published product version; they do not create a release.

Runtime or UI changes require a manual Microsoft Edge Desktop check on
Windows through `Start-OpenSlotting.cmd` at the stable localhost origin.
Automated tests do not replace visible browser acceptance. Use
[`docs/acceptance-localhost.md`](docs/acceptance-localhost.md) and record the
exact candidate commit, Python/Windows/Edge versions, and extracted folder.

Windows launcher or shortcut changes require both PowerShell launcher suites
and the current localhost acceptance checklist. Use temporary copies and
synthetic data; do not modify unrelated user shortcuts.

## Runtime and dependency contract

Localhost is the only actively developed runtime. Python 3.8 or newer and its
standard library are the only additional end-user runtime dependency. Windows
PowerShell and the user's existing browser supply the launcher and interface.
Node.js is a contributor test/benchmark tool; it is not shipped or required
to use OpenSlotting. Do not add npm/pip runtime packages, an OpenSlotting
installer, executable, mandatory cloud service, telemetry, external assets,
or operational-data transmission.

Preserve all business workflows, original source bytes, provenance, IndexedDB
workspace isolation, backup compatibility, and the fixed loopback origin.
Python serves interface files only; it does not become a data backend.
Company device policies take precedence over launcher convenience.

Portable Mode is intentionally paused indefinitely. The preserved basis and
resumption instructions are in [docs/portable-mode-paused.md](docs/portable-mode-paused.md).
Direct-file fallback and dual-profile acceptance are no longer contribution
requirements on this line.

## Synthetic data only

Repository fixtures, screenshots, documentation, issues, pull requests, and bug reports must use fully synthetic data. Do not submit real company, customer, employee, order, article, warehouse, sales, ERP, or WMS data. Anonymized, pseudonymized, redacted, or otherwise modified real operational data is also prohibited.

For vulnerabilities and security-sensitive changes, follow [SECURITY.md](SECURITY.md). Do not disclose sensitive findings publicly before they have been reviewed.
