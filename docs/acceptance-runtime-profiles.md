# Runtime profiles acceptance

Record the candidate commit, Edge version, Windows version, extracted folder,
and test date. Use only synthetic CSV and workspace data. Complete the standard
Enhanced Local start and the independent Portable profile from the same
candidate package before accepting it.

## Shared preconditions

- [ ] The candidate ZIP was built from the recorded commit.
- [ ] The extracted folder contains the standard localhost launcher and the
      independently usable direct `index.html` entry point.
- [ ] Network access is disabled or independently monitored for unexpected
      external requests.
- [ ] A small synthetic workspace backup is available for migration checks.

## Standard Windows start (Enhanced Local Mode)

- [ ] `Start-OpenSlotting.cmd` starts the matching loopback server when needed.
- [ ] Edge opens in app mode with the window maximized.
- [ ] The managed `OpenSlotting` shortcut follows the same start path.
- [ ] The header displays `Runtime · Enhanced Local` or its German translation.
- [ ] Runtime diagnostics show `Enhanced Local Mode` and the expected origin.
- [ ] Workspace creation, CSV import, mapping, analysis, export, backup, and
      reopening succeed.
- [ ] `Stop-OpenSlotting-Localhost.cmd` stops only the verified server belonging
      to the extracted copy.

## Direct Portable Mode (`file:///`)

- [ ] Opening `index.html` directly in Edge starts the extracted copy.
- [ ] The header displays `Runtime · Portable` or its German translation.
- [ ] Runtime diagnostics show `Portable Mode` and origin `file:///`.
- [ ] Workspace creation, CSV import, mapping, analysis, export, backup, and
      reopening succeed.
- [ ] Closing and reopening does not require Python or a localhost process.

## Localhost launcher variants

- [ ] `Start-OpenSlotting-Localhost.cmd` and the separately named managed
      shortcut also reuse or start the matching server and maximize Edge.
- [ ] Requests for allowed browser runtime files succeed.
- [ ] Requests for repository, documentation, parent, and runtime-control files
      remain blocked.
- [ ] Workspace creation, CSV import, mapping, analysis, export, backup, and
      reopening have the same observable semantics as Portable Mode.

## Migration and isolation

- [ ] Portable and Enhanced Local workspaces are isolated by browser origin.
- [ ] A Portable workspace is not silently visible in Enhanced Local Mode.
- [ ] Portable backup -> Enhanced Local restore preserves sources, mappings,
      normalized rows, analysis state, reconstructed raw fields, and provenance.
- [ ] Enhanced Local backup -> Portable restore preserves the same contract.
- [ ] A malformed backup is rejected before changing either origin.
- [ ] Failure or absence of an enhanced capability leaves the supported
      IndexedDB workflow usable and does not alter analysis results.

## Evidence boundary

- [ ] Automated test output is attached or referenced.
- [ ] Visible Edge behavior, diagnostics text, and both launch paths are recorded
      separately from automated evidence.
- [ ] Any untested browser capability is recorded as pending rather than passed.
