# OpenSlotting V0.2.1 Release Checklist

Use this checklist on the exact release candidate. Automated results do not replace the manual Microsoft Edge acceptance run.

## Candidate record

| Item | Value |
| --- | --- |
| Version | `0.2.1` |
| Candidate branch | |
| PR candidate commit | |
| Final `main` commit | |
| Tester | |
| Planned publication date | |
| Acceptance date | |
| Result | Pending |

Before building the final PR candidate, replace `Unreleased` in `CHANGELOG.md` with the planned publication date recorded above. Complete the automated checks, packaging, ZIP extraction, and manual Edge acceptance only after that edit is part of the recorded PR candidate commit.

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
- [ ] `node --test tests/*.test.cjs`
- [ ] `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/windows-launcher.test.ps1`
- [ ] `pwsh -NoProfile -File tests/windows-launcher.test.ps1`
- [ ] `git diff --check` reports no whitespace errors
- [ ] `CHANGELOG.md` contains the planned publication date instead of `Unreleased`
- [ ] Required GitHub Actions check `quality` passes on the exact final PR head
- [ ] Runtime files contain no unexpected network, CDN, telemetry, backend, or localhost dependency
- [ ] The full candidate commit hash is recorded above
- [ ] `tools/package-release.ps1 -CandidateCommit <full-commit-hash>` reports that exact commit and creates `dist/OpenSlotting-v0.2.1.zip`
- [ ] The ZIP contains only the documented user-facing files

Expected ZIP contents:

```text
OpenSlotting-v0.2.1/
├── index.html
├── app.css
├── app.js
├── encoding.js
├── csv.js
├── OpenSlotting.Windows.psm1
├── Start-OpenSlotting.cmd
├── Start-OpenSlotting.ps1
├── Install-OpenSlotting.cmd
├── Install-OpenSlotting.ps1
├── Remove-OpenSlotting.cmd
├── Remove-OpenSlotting.ps1
├── OpenSlotting.ico (optional)
├── README.md
├── LICENSE
├── CHANGELOG.md
├── CONTRIBUTING.md
├── SECURITY.md
└── docs/
    ├── data-format.md
    ├── acceptance-v0.2.md
    └── acceptance-v0.2.1.md
```

## Manual Microsoft Edge Desktop acceptance

Run these checks on Windows in Microsoft Edge Desktop with the network unavailable. Extract the candidate ZIP into a new directory and open its `index.html` directly. Record failures with the candidate commit and source fixture; use only fully synthetic data. Complete the multi-export checks in `docs/acceptance-v0.2.md` and the launcher/shortcut checks in `docs/acceptance-v0.2.1.md` on this same candidate.

The V0.2 and V0.2.1 source-tree acceptance checklists were confirmed by the user on 2026-09-11 for commit `ebb6d6ec8333e564e63079d1eec6a60f3ab52495`. Final acceptance of the dated release ZIP remains pending.

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
25. [ ] No localhost, backend, Node.js, or Python runtime is required.
26. [ ] `Start-OpenSlotting.cmd` opens this extracted copy in Edge app mode.
27. [ ] Start menu and Desktop shortcut setup work without administrator rights.
28. [ ] Generated shortcuts target Edge directly and leave no console window open.
29. [ ] A path containing spaces is encoded correctly in the local file URL.
30. [ ] Missing optional `OpenSlotting.ico` does not block setup.
31. [ ] Removal deletes only OpenSlotting-managed shortcuts.
32. [ ] Direct `index.html` startup remains independent of setup and shortcuts.
33. [ ] Setup leaves taskbar pinning to the user and does not change taskbar policy.

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
- [ ] Tag `v0.2.1` points to that exact accepted final `main` commit.
- [ ] A normal, non-prerelease GitHub Release named `OpenSlotting v0.2.1 — Optional Windows Edge Launcher` is created from the tag.
- [ ] `OpenSlotting-v0.2.1.zip` is attached to the release.
- [ ] The attached ZIP is independently downloaded, extracted, and verified again through direct `file:///` execution.
