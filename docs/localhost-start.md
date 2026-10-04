# Localhost startup

OpenSlotting runs at `http://127.0.0.1:8765/index.html`. Python 3.8+ uses only
its standard library to serve interface files. Operational data is processed
and stored in the browser. No pip/npm packages, extra installation, OpenSlotting
executable, remote backend or internet access are required.

## Windows commands

1. Keep the complete extracted application in an approved local folder.
2. Run `Start-OpenSlotting.cmd`. It finds existing Edge/Python, verifies any
   listener on the fixed port, and starts only this folder's server if needed.
3. Optionally run `Install-OpenSlotting.cmd` for current-user Start menu or
   Desktop shortcuts. They open maximized Edge app mode without a launcher console.
4. Run `Stop-OpenSlotting.cmd` to stop the verified local service.
5. `Remove-OpenSlotting.cmd` removes only marked shortcuts, leaving application
   files and browser data intact.

Existing `Start/Stop/Install/Remove-OpenSlotting-Localhost.cmd` names remain
compatibility commands for separately named shortcuts. They use the same server
and origin.

Rerun setup from the current folder to update a managed standard shortcut that
still opens the previous Portable copy. Updating the shortcut does not migrate
browser data; export old workspaces first. Unmarked shortcuts are never
overwritten. Moving the folder requires updating shortcuts and stopping its old
server before starting a different copy.

Python must already be approved and available. Missing Python produces a clear
error and triggers no downloads. Windows supplies PowerShell. Device policies
can block scripts or processes; OpenSlotting changes no machine or browser
policy. Ask company IT for an approved launch path. Taskbar pinning remains a
user/IT action. The Windows launcher rejects remote application roots.

## Start Python directly

From the application folder, use `python Start-OpenSlotting-Localhost.py --no-browser`
on Windows, or `python3 Start-OpenSlotting-Localhost.py --no-browser` on macOS/Linux.
Those other platforms are outside the official Windows/Edge acceptance claim.
Open the printed URL in the intended browser profile; Ctrl+C stops this
foreground server. Omitting `--no-browser` opens the default browser instead
of selecting Edge app mode.

Port 8765 remains the normal storage origin. `--port PORT` is diagnostic;
another port creates separate IndexedDB storage and requires backup/restore for
migration. Port 0 is for automated tests.

## Process and data boundaries

The server binds only to `127.0.0.1`, validates HTTP Host and serves an explicit
runtime-file allowlist. It provides no directory listing, upload API, workspace
database or telemetry. Browser policy blocks application connection requests.
CSV input and workspace persistence stay in the browser.

Windows launchers verify the listener PID, Python executable, script entrypoint
and canonical application root before reuse or shutdown. A foreign application
or different OpenSlotting folder on the port is rejected. Failure cleanup stops
only owned processes. Closing Edge does not stop the server; shortcut removal
does not stop it or clear browser data.

Use a stable browser profile and protect backups like their original exports.
See [workspace-format.md](workspace-format.md) for recovery, and
[portable-mode-paused.md](portable-mode-paused.md) for migration from the
indefinitely paused direct-file application.
