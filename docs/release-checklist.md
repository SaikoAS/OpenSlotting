# OpenSlotting Release Checklist

Use this checklist on the exact release candidate. Automated results do not replace the manual Microsoft Edge acceptance run.

## Candidate record

| Item | Value |
| --- | --- |
| Version | Read from `csv.js` (`APP_VERSION`) for the candidate |
| Candidate branch | |
| PR candidate commit | |
| Final `main` commit | |
| Tester | |
| Planned publication date | |
| Acceptance date | |
| Result | Pending |

The latest published release is `0.2.1`; `main` may contain unreleased work without an assigned next version. Before building a release candidate, decide the next version, update the single `APP_VERSION` source in `csv.js`, and record it above. Replace the current `Unreleased` heading in `CHANGELOG.md` with that version and publication date only when the release is ready. Complete the automated checks, packaging, ZIP extraction, and manual Edge acceptance only after those edits are part of the recorded PR candidate commit.

Any later change to the publication date or another release-visible file invalidates the previous candidate. Commit the change, rebuild the ZIP, and repeat all automated and manual checks on the new exact candidate before tagging.

The packaging script reads release files from the explicitly supplied Git commit, never from uncommitted working-tree content. Use the full hash recorded in this checklist:

```text
powershell -NoProfile -ExecutionPolicy Bypass -File tools/package-release.ps1 -CandidateCommit <full-commit-hash>
```

Confirm that the commit printed by the script exactly matches the recorded candidate commit.

## Automated checks

- [ ] `node --check csv.js`
- [ ] `node --check app.js`
- [ ] `node --check encoding.js`
- [ ] `node --check periods.js`
- [ ] `node --check runtime.js`
- [ ] `node --check workspace.js`
- [ ] `node --check storage.js`
- [ ] `node --test tests/*.test.cjs`
- [ ] `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/windows-launcher.test.ps1`
- [ ] `pwsh -NoProfile -File tests/windows-launcher.test.ps1`
- [ ] `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/localhost-windows-launcher.test.ps1`
- [ ] `pwsh -NoProfile -File tests/localhost-windows-launcher.test.ps1`
- [ ] `git diff --check` reports no whitespace errors
- [ ] `CHANGELOG.md` contains the planned publication date instead of `Unreleased`
- [ ] Required GitHub Actions check `quality` passes on the exact final PR head
- [ ] Runtime files contain no unexpected network, CDN, telemetry, backend, or localhost dependency
- [ ] The full candidate commit hash is recorded above
- [ ] `tools/package-release.ps1 -CandidateCommit <full-commit-hash>` reports that exact commit and creates `dist/OpenSlotting-v<APP_VERSION>.zip`
- [ ] The ZIP contains only the documented user-facing files

Expected ZIP contents:

```text
OpenSlotting-v<APP_VERSION>/
├── index.html
├── app.css
├── runtime.js
├── app.js
├── encoding.js
├── csv.js
├── periods.js
├── workspace.js
├── storage.js
├── OpenSlotting.Windows.psm1
├── Start-OpenSlotting.cmd
├── Start-OpenSlotting.ps1
├── Install-OpenSlotting.cmd
├── Install-OpenSlotting.ps1
├── Remove-OpenSlotting.cmd
├── Remove-OpenSlotting.ps1
├── OpenSlotting.Localhost.Windows.psm1
├── Start-OpenSlotting-Localhost.cmd
├── Start-OpenSlotting-Localhost.ps1
├── Start-OpenSlotting-Localhost.py
├── Stop-OpenSlotting-Localhost.cmd
├── Stop-OpenSlotting-Localhost.ps1
├── Install-OpenSlotting-Localhost.cmd
├── Install-OpenSlotting-Localhost.ps1
├── Remove-OpenSlotting-Localhost.cmd
├── Remove-OpenSlotting-Localhost.ps1
├── OpenSlotting.ico (optional)
├── README.md
├── LICENSE
├── CHANGELOG.md
├── CONTRIBUTING.md
├── SECURITY.md
└── docs/
    ├── data-format.md
    ├── workspace-format.md
    ├── period-comparison.md
    ├── runtime-profiles.md
    ├── localhost-experiment.md
    ├── acceptance-runtime-profiles.md
    ├── acceptance-workspaces.md
    ├── acceptance-period-comparison.md
    ├── acceptance-v0.2.md
    └── acceptance-v0.2.1.md
```

## Manual Microsoft Edge Desktop acceptance

Run these checks on Windows in Microsoft Edge Desktop with the network unavailable. Extract the candidate ZIP into a new directory and open its `index.html` directly. Record failures with the candidate commit and source fixture; use only fully synthetic data. This checklist is the reusable candidate record. The versioned V0.2 and V0.2.1 acceptance files below are historical evidence only; do not use their results as evidence for a later candidate. Use `docs/acceptance-runtime-profiles.md`, `docs/acceptance-workspaces.md`, and `docs/acceptance-period-comparison.md` as detailed references while recording the fresh results here.

The V0.2 and V0.2.1 acceptance checklists are historical records. A future release candidate requires a new exact-commit acceptance run; do not copy historical results into the current candidate record.

1. [ ] `index.html` opens directly through `file:///` without a server.
2. [ ] The application loads without blocking runtime errors.
3. [ ] A synthetic CSV can be imported.
4. [ ] Automatic column mapping works.
5. [ ] Manual mapping works.
6. [ ] Missing optional fields remain valid.
7. [ ] Invalid rows produce understandable validation information.
8. [ ] The article overview renders correctly.
9. [ ] The article ID remains visible when a description exists.
10. [ ] Missing article descriptions render safely.
11. [ ] The description-conflict indication works.
12. [ ] Search works by article ID.
13. [ ] Search works by primary description.
14. [ ] Search works by a conflicting or alternate description variant.
15. [ ] Sorting works.
16. [ ] Article pagination works.
17. [ ] The article detail view opens.
18. [ ] Detail rows belong to the selected article and preserve source-line traceability.
19. [ ] Detail pagination works.
20. [ ] Returning to the overview does not require re-importing the CSV.
21. [ ] English/German switching works for new and existing UI.
22. [ ] Analysis CSV export works.
23. [ ] Exported text remains protected against spreadsheet formula injection.
24. [ ] The core workflow remains usable with the network unavailable.
25. [ ] Portable Mode requires no localhost, backend, Node.js, or Python runtime.
26. [ ] `Start-OpenSlotting.cmd` opens this extracted copy in Edge app mode.
27. [ ] Start menu and Desktop shortcut setup work without administrator rights.
28. [ ] Generated shortcuts target Edge directly and leave no console window open.
29. [ ] A path containing spaces is encoded correctly in the local file URL.
30. [ ] Missing optional `OpenSlotting.ico` does not block setup.
31. [ ] Removal deletes only OpenSlotting-managed shortcuts.
32. [ ] Direct `index.html` startup remains independent of setup and shortcuts.
33. [ ] Setup leaves taskbar pinning to the user and does not change taskbar policy.
34. [ ] Enhanced Local Mode starts through its loopback launcher and displays the expected runtime diagnostics.
35. [ ] A workspace can be created, reopened, renamed, cleared, and deleted without affecting another workspace.
36. [ ] Workspace backup and restore as new or explicit replacement preserve source bytes, mappings, normalized rows, validation results, and provenance.
37. [ ] Multiple sources can be mapped, validated, combined, and traced to their source file and line; blocked files remain excluded.
38. [ ] Date coverage and missing expected weekdays are reported for the candidate workspace.
39. [ ] Calendar-week and custom periods can be compared, including article details and comparison export.

## Pull request and release

- [ ] Branch is current with `main`.
- [ ] Codex review covers the exact final PR head and has no unresolved findings.
- [ ] All review threads are resolved.
- [ ] No release-visible file changed after the PR-head package and acceptance run.
- [ ] The candidate record above contains the passing PR-head Edge result.
- [ ] Release-preparation PR is squash-merged.
- [ ] The resulting full `main` commit hash is recorded above.
- [ ] CI succeeds on the resulting `main` commit.
- [ ] The shipped-file tree on the resulting `main` commit matches the accepted PR head.
- [ ] A fresh ZIP is built with `-CandidateCommit <final-main-commit>` and the script reports that exact commit.
- [ ] All automated checks and all required manual Edge `file:///` checks pass again on the extracted ZIP from the final `main` commit.
- [ ] No release-visible file changed after the final-`main` package and acceptance run.
- [ ] Tag `v<APP_VERSION>` points to that exact accepted final `main` commit.
- [ ] A normal, non-prerelease GitHub Release named `OpenSlotting v<APP_VERSION>` is created from the tag.
- [ ] `OpenSlotting-v<APP_VERSION>.zip` is attached to the release.
- [ ] The attached ZIP is independently downloaded, extracted, and verified again through direct `file:///` execution.
