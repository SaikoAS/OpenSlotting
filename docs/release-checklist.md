# OpenSlotting V0.1 Release Checklist

Use this checklist on the exact release candidate. Automated results do not replace the manual Microsoft Edge acceptance run.

## Candidate record

| Item | Value |
| --- | --- |
| Version | `0.1.0` |
| Candidate branch | |
| Candidate commit | |
| Tester | |
| Planned publication date | |
| Acceptance date | |
| Result | Pending |

Before building the final candidate, replace `Unreleased` in `CHANGELOG.md` with the planned publication date recorded above. Complete the automated checks, packaging, ZIP extraction, and manual Edge acceptance only after that edit is part of the candidate commit.

Any later change to the publication date or another release-visible file invalidates the previous candidate. Commit the change, rebuild the ZIP, and repeat all automated and manual checks on the new exact candidate before tagging.

## Automated checks

- [ ] `node --check csv.js`
- [ ] `node --check app.js`
- [ ] `node --test tests/csv.test.cjs`
- [ ] `git diff --check` reports no whitespace errors
- [ ] `CHANGELOG.md` contains the planned publication date instead of `Unreleased`
- [ ] Required GitHub Actions check `quality` passes on the exact final PR head
- [ ] Runtime files contain no unexpected network, CDN, telemetry, backend, or localhost dependency
- [ ] `powershell -NoProfile -ExecutionPolicy Bypass -File tools/package-release.ps1` creates `dist/OpenSlotting-v0.1.0.zip`
- [ ] The ZIP contains only the documented user-facing files

Expected ZIP contents:

```text
OpenSlotting-v0.1.0/
├── index.html
├── app.css
├── app.js
├── csv.js
├── README.md
├── LICENSE
├── CHANGELOG.md
├── CONTRIBUTING.md
├── SECURITY.md
└── docs/
    └── data-format.md
```

## Manual Microsoft Edge Desktop acceptance

Run these checks on Windows in Microsoft Edge Desktop with the network unavailable. Extract the candidate ZIP into a new directory and open its `index.html` directly. Record failures with the candidate commit and source fixture; use only fully synthetic data.

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

## Pull request and release

- [ ] Branch is current with `main`.
- [ ] Codex review covers the exact final PR head and has no unresolved findings.
- [ ] All review threads are resolved.
- [ ] No release-visible file changed after the final package and acceptance run.
- [ ] The candidate record above contains the final passing Edge result.
- [ ] Release-preparation PR is squash-merged.
- [ ] CI succeeds on the resulting `main` commit.
- [ ] Tag `v0.1.0` points to that exact accepted `main` commit.
- [ ] A normal, non-prerelease GitHub Release named `OpenSlotting v0.1.0 — Order-Line Analysis` is created from the tag.
- [ ] `OpenSlotting-v0.1.0.zip` is attached to the release.
- [ ] The attached ZIP is independently downloaded, extracted, and verified again through direct `file:///` execution.
