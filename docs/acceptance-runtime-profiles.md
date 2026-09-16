# Runtime profiles acceptance

Record the candidate commit, Edge version, Windows version, extracted folder,
and test date. Use only synthetic CSV and workspace data. Complete both profiles
from the same candidate package before promoting Enhanced Local Mode from
experimental status.

## Shared preconditions

- [ ] The candidate ZIP was built from the recorded commit.
- [ ] The extracted folder contains both normal and localhost launchers.
- [ ] Network access is disabled or independently monitored for unexpected
      external requests.
- [ ] A small synthetic workspace backup is available for migration checks.

## Portable Mode (`file:///`)

- [ ] `Start-OpenSlotting.cmd` opens the extracted copy in Edge app mode.
- [ ] The header displays `Runtime · Portable` or its German translation.
- [ ] Runtime diagnostics show `Portable Mode` and origin `file:///`.
- [ ] Workspace creation, CSV import, mapping, analysis, export, backup, and
      reopening succeed.
- [ ] Closing and reopening does not require Python or a localhost process.

## Enhanced Local Mode

- [ ] `Start-OpenSlotting-Localhost.cmd` starts the matching loopback server
      when it is not already running.
- [ ] Reopening through the managed `OpenSlotting Localhost` shortcut reuses or
      restarts the server and opens Edge app mode.
- [ ] The header displays `Runtime · Enhanced Local` or its German translation.
- [ ] Runtime diagnostics show `Enhanced Local Mode`, the expected origin, and
      browser capability availability.
- [ ] Requests for allowed browser runtime files succeed.
- [ ] Requests for repository, documentation, parent, and runtime-control files
      remain blocked.
- [ ] Workspace creation, CSV import, mapping, analysis, export, backup, and
      reopening succeed with the same observable semantics as Portable Mode.
- [ ] `Stop-OpenSlotting-Localhost.cmd` stops only the verified server belonging
      to the extracted copy.

## Migration and isolation

- [ ] A Portable workspace is not silently visible in Enhanced Local Mode.
- [ ] Portable backup -> Enhanced Local restore preserves sources, mappings,
      normalized rows, analysis state, raw fields, and provenance.
- [ ] Enhanced Local backup -> Portable restore preserves the same contract.
- [ ] A malformed backup is rejected before changing either origin.
- [ ] Failure or absence of an enhanced capability leaves the supported
      IndexedDB workflow usable and does not alter analysis results.

## Evidence boundary

- [ ] Automated test output is attached or referenced.
- [ ] Visible Edge behavior, diagnostics text, and both launch paths are recorded
      separately from automated evidence.
- [ ] Any untested browser capability is recorded as pending rather than passed.
