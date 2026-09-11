# OpenSlotting V0.2.1 Windows Launcher Acceptance

Run this checklist on the exact V0.2.1 release candidate on Windows. Use a fresh
extraction path containing spaces and only synthetic CSV fixtures. Automated
checks do not replace the visible Microsoft Edge and shortcut acceptance run.

## Candidate

| Item | Value |
| --- | --- |
| Candidate commit | `ebb6d6ec8333e564e63079d1eec6a60f3ab52495` |
| ZIP path | Not documented |
| Extraction path | Not documented |
| Windows version | Not documented |
| Microsoft Edge version | Not documented |
| Tester | User-confirmed manual acceptance |
| Date | 2026-09-11 |
| Result | Passed (user-confirmed) |

The user confirmed the manual acceptance for the source tree at the commit above. The missing ZIP, extraction, and environment details were not inferred. Final release-package acceptance remains a separate release step.

## Direct launcher

1. [x] `Start-OpenSlotting.cmd` discovers Microsoft Edge without a `PATH` entry.
2. [x] Edge opens the extracted local `index.html` in an app-style window.
3. [x] The launched URL uses `file:///` and contains the correctly escaped extraction path.
4. [x] No console window remains open while the Edge app window is running.
5. [x] A synthetic CSV import and analysis still work with the network unavailable.

## Shortcut setup

6. [x] `Install-OpenSlotting.cmd` clearly offers Start menu, Desktop, and both locations.
7. [x] The default choice creates a current-user Start menu shortcut.
8. [x] Desktop selection creates a current-user Desktop shortcut.
9. [x] Both selection creates both shortcuts.
10. [x] No administrator or Windows security elevation prompt appears.
11. [x] Every generated shortcut targets the discovered local `msedge.exe` directly.
12. [x] Every generated shortcut contains one quoted `--app="file:///.../index.html"` argument.
13. [x] Launching each shortcut opens the exact extracted OpenSlotting copy.
14. [x] A local `OpenSlotting.ico`, when supplied for the test, is used.
15. [x] Setup succeeds without `OpenSlotting.ico` and uses a local Edge icon fallback.
16. [x] A foreign `OpenSlotting.lnk` is not overwritten.
17. [x] Start menu setup explains the optional user-controlled taskbar pin without changing taskbar policy.

## Removal and portability

18. [x] `Remove-OpenSlotting.cmd` removes OpenSlotting-managed Start menu and Desktop shortcuts.
19. [x] A foreign same-named shortcut is reported and remains untouched.
20. [x] Removal leaves the extracted application files untouched.
21. [x] Removal leaves browser-local OpenSlotting data untouched.
22. [x] Moving the extracted folder invalidates the old shortcut as documented.
23. [x] Running setup from the new folder location recreates a working shortcut.
24. [x] Directly opening `index.html` remains functional without any launcher or shortcut.

## Offline and privacy boundary

25. [x] Setup and launch work without a backend or localhost server.
26. [x] Setup and launch make no runtime network, telemetry, or account request.
27. [x] No real, anonymized, pseudonymized, or redacted operational data was used.
