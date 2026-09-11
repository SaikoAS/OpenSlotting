# OpenSlotting V0.2.1 Windows Launcher Acceptance

Run this checklist on the exact V0.2.1 release candidate on Windows. Use a fresh
extraction path containing spaces and only synthetic CSV fixtures. Automated
checks do not replace the visible Microsoft Edge and shortcut acceptance run.

## Candidate

| Item | Value |
| --- | --- |
| Candidate commit | |
| ZIP path | |
| Extraction path | |
| Windows version | |
| Microsoft Edge version | |
| Tester | |
| Date | |
| Result | Pending |

## Direct launcher

1. [ ] `Start-OpenSlotting.cmd` discovers Microsoft Edge without a `PATH` entry.
2. [ ] Edge opens the extracted local `index.html` in an app-style window.
3. [ ] The launched URL uses `file:///` and contains the correctly escaped extraction path.
4. [ ] No console window remains open while the Edge app window is running.
5. [ ] A synthetic CSV import and analysis still work with the network unavailable.

## Shortcut setup

6. [ ] `Install-OpenSlotting.cmd` clearly offers Start menu, Desktop, and both locations.
7. [ ] The default choice creates a current-user Start menu shortcut.
8. [ ] Desktop selection creates a current-user Desktop shortcut.
9. [ ] Both selection creates both shortcuts.
10. [ ] No administrator or Windows security elevation prompt appears.
11. [ ] Every generated shortcut targets the discovered local `msedge.exe` directly.
12. [ ] Every generated shortcut contains one quoted `--app="file:///.../index.html"` argument.
13. [ ] Launching each shortcut opens the exact extracted OpenSlotting copy.
14. [ ] A local `OpenSlotting.ico`, when supplied for the test, is used.
15. [ ] Setup succeeds without `OpenSlotting.ico` and uses a local Edge icon fallback.
16. [ ] A foreign `OpenSlotting.lnk` is not overwritten.
17. [ ] Start menu setup explains the optional user-controlled taskbar pin without changing taskbar policy.

## Removal and portability

18. [ ] `Remove-OpenSlotting.cmd` removes OpenSlotting-managed Start menu and Desktop shortcuts.
19. [ ] A foreign same-named shortcut is reported and remains untouched.
20. [ ] Removal leaves the extracted application files untouched.
21. [ ] Removal leaves browser-local OpenSlotting data untouched.
22. [ ] Moving the extracted folder invalidates the old shortcut as documented.
23. [ ] Running setup from the new folder location recreates a working shortcut.
24. [ ] Directly opening `index.html` remains functional without any launcher or shortcut.

## Offline and privacy boundary

25. [ ] Setup and launch work without a backend or localhost server.
26. [ ] Setup and launch make no runtime network, telemetry, or account request.
27. [ ] No real, anonymized, pseudonymized, or redacted operational data was used.
