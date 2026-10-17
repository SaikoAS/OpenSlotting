# Versions, builds, milestones and data formats

These identifiers answer different questions. Their numbers do not advance
together and none can substitute for another.

| Identifier | Source of truth | Meaning |
| --- | --- | --- |
| Product version (`0.2.1`) | `APP_VERSION` in `csv.js`; a published release has the matching `v0.2.1` Git tag | Product behavior delivered in that release |
| Development/release build and full commit | `APP_BUILD` in `csv.js`; packaging stamps the resolved `CandidateCommit` into the ZIP | Exact code being tested; development status is not a release claim |
| Roadmap milestone (`M01`–`M11`) | [README roadmap](../README.md#roadmap) | Functional goal, with implementation and publication tracked separately |
| Workspace, layout and backup formats | Constants owned by `workspace.js` and `warehouse.js` | Storage/restore compatibility and migration contracts |

The source tree keeps `APP_BUILD.commit = null`; an unpackaged copy cannot
claim a commit. The existing packager supplies the actual candidate identity,
manifest and ZIP checksum. Schema numbers never determine the product version,
and a successful migration does not itself constitute a release.

## Published history

| Published tag | Tagged source commit | Included scope |
| --- | --- | --- |
| [v0.1.0](https://github.com/SaikoAS/OpenSlotting/releases/tag/v0.1.0) | `9e88d0f31da04eaf4bc26f4d89dd6caa0df538ca` | Initial order-line analysis (M01) |
| [v0.2.1](https://github.com/SaikoAS/OpenSlotting/releases/tag/v0.2.1) | `ef402eb33c303e7152f7ad54a0e16c9dcd28c1ee` | Import compatibility, multiple exports, optional Windows launcher and local workspaces (M02–M05) |

There is no published `0.1.1`, `0.2.0`, `0.3` or `0.6` release. In particular,
the `0.2.0` changelog entry records unpublished work subsequently included in
`0.2.1`. Former README headings such as “V0.3 Local Workspaces” were roadmap
labels, not published versions. Their current equivalents are M05 and, for
“V0.6 Article Master Data”, M08. Historical tags, release assets, changelog
entries and acceptance filenames retain their original names.

Implementation on `main`, passing automated checks, native Edge acceptance,
and publication are separate facts. The historical launcher acceptance
records a user-confirmed source-tree run; it is not evidence that a later ZIP
or the current localhost runtime passed. See the [release checklist](release-checklist.md)
and the exact [historical acceptance record](acceptance-v0.2.1.md).

## SemVer decisions

Version selection is a deliberate release-preparation change, reviewed against
user-visible behavior, import/export contracts, backup compatibility and runtime
requirements. Normal feature PRs do not increment `APP_VERSION` automatically.

- **Patch:** compatible bug fixes, corrections and maintenance that preserve
  supported workflows, data contracts and runtime requirements.
- **Minor:** new compatible functionality. While the major version is zero,
  an intentional breaking change also requires a new minor version, an explicit
  warning, migration/recovery instructions and appropriate acceptance evidence;
  a patch must not hide it.
- **Major:** after 1.0, incompatible changes to supported behavior, import/export
  or storage contracts, or runtime requirements. A 1.0 release explicitly
  establishes the supported stable contracts; it is not inferred from completing
  M11 or any other milestone.
- **Migrations:** increment the relevant data-format version whenever its
  contract changes. Choose the product bump separately: a transparent,
  backward-compatible migration may accompany a minor feature or patch fix;
  destructive changes, lost supported restore paths or new mandatory runtime
  requirements are breaking changes. Preserve original bytes and document the
  backup/restore and exact-candidate checks.

The current release process supports stable `X.Y.Z` identifiers with no leading
zeros, with matching tags `vX.Y.Z`. It does not currently package SemVer
prerelease/build suffixes. A candidate is identified by status and commit, not
by inventing a new published version or adding an `-rc` tag. Supporting other
SemVer forms later requires an explicit coordinated process/tooling change.

## Development and release candidates

A normal development commit keeps `development`, a null source commit and the
first changelog section `Unreleased`. Retaining `APP_VERSION = '0.2.1'` after
the published `0.2.1` release is valid. A reviewed future-version preparation
with development status is also valid. Neither state publishes anything.
After publication, the next development commit restores `development` and adds
a top `Unreleased` section while retaining the just-published version. A change
does not become another release merely because it descends from a release tag.

For an intended release, choose the version using the rules above, set source
`APP_BUILD.status` to `release`, and replace the top `Unreleased` heading with
`## X.Y.Z - YYYY-MM-DD` for that same version. Do not reuse a published version
for another commit. New release versions must advance beyond prior releases.
Only then commit the candidate and run:

```text
node tools/check-release.cjs --commit <full-candidate-commit>
powershell -NoProfile -ExecutionPolicy Bypass -File tools/package-release.ps1 -CandidateCommit <full-candidate-commit>
node tools/check-release.cjs --commit <full-candidate-commit> --artifacts dist
```

The checker is a contributor/CI tool using Node.js, Git and (for ZIP inspection)
the existing Python standard library. It is not shipped or required by users.
On Windows it probes `py.exe -3`, then `python.exe`, for Python 3.8 or newer,
matching the localhost launcher; on other systems it uses `python3`.
`OPENSLOTTING_PYTHON` can name an explicit executable path (including spaces,
without command-line arguments); a Windows `py.exe` override also receives `-3`.
The PowerShell packager retains its existing dependency contract. The checker
reads candidate files from Git, never from a dirty checkout, and makes no
network calls or repository changes.

The source check validates canonical version/build declarations, a null source
commit, changelog dates and duplicate release entries. Release builds require
the matching dated first changelog entry and cannot regress behind historical
releases or reuse a version tag pointing to another commit. Development builds
are allowed to retain the last released version or prepare a newer one, but
cannot regress below an existing release tag. Artifact checks compare the
manifest's version/status/commit, exact archive filename, actual ZIP SHA-256
and the version/status/stamped commit in archived `csv.js`.

CI runs these checks on PR heads and `main`, and also on pushes of `v*` tags.
It fetches tags/history for consistency checks. Tag builds additionally require
`vX.Y.Z`, release status and a tag resolving to the checked commit; annotated
and lightweight tags are supported. A tag push triggers validation only, never
publication. Existing historical tags predate this contract and are not
rewritten or retroactively assigned modern build metadata.

After the remaining automated and native Edge acceptance steps pass, the
maintainer follows the existing checklist for final-main packaging, tagging
and publication. Any candidate change invalidates its prior acceptance. These
checks do not replace the separate native Edge release gate (#77), infer a
version bump from code, create tags, or publish releases.
