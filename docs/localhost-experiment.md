# Experimental localhost start

This branch adds an optional loopback-only start mode while keeping the existing
`file:///` workflow unchanged. OpenSlotting itself is not installed and no
application executable is built. The server uses only the Python 3 standard
library and serves the files from the extracted OpenSlotting folder.

Both startup profiles use the same application code and workspace contract.
Their central detection and capability rules are documented in
[`runtime-profiles.md`](runtime-profiles.md).

## Requirements and start

- Windows, macOS, or Linux with Python 3.8 or newer already available
- no Python package installation
- no administrator rights
- no internet connection

On Windows, double-click `Start-OpenSlotting-Localhost.cmd`. It checks whether
the matching server is already running, starts it hidden when needed, waits for
the health endpoint, and opens Microsoft Edge in app mode. Alternatively run
the server visibly for diagnostics:

```text
python Start-OpenSlotting-Localhost.py
```

The stable default address is:

```text
http://127.0.0.1:8765/index.html
```

Stop a visibly running server with `Ctrl+C`. A server started by the combined
launcher continues in the background so the app can be reopened; stop it with
`Stop-OpenSlotting-Localhost.cmd`. For diagnostics or automated tests, prevent
the browser from opening with `--no-browser`.

## Combined Windows shortcut

Run `Install-OpenSlotting-Localhost.cmd` and choose the Start menu, Desktop, or
both. The generated `OpenSlotting Localhost` shortcut points to the launcher in
this extracted folder, starts the server when necessary, and then opens the
stable localhost URL in Edge app mode. It does not modify the Edge-installed
web-app shortcut shown by Edge's "Install this site as an app" feature.

Run `Remove-OpenSlotting-Localhost.cmd` to remove only shortcuts carrying the
OpenSlotting localhost ownership marker. This does not stop the server or erase
browser data. Moving the extracted folder invalidates its shortcut; run setup
again from the new location.

## Storage boundary

Browser storage is separated by origin. Therefore workspaces previously stored
under `file:///` are not automatically visible under
`http://127.0.0.1:8765`, and another port creates another separate workspace
catalog. Use workspace backup and restore to move data between these origins.
The default port is deliberately fixed instead of choosing a random free port.

## Security and portability boundary

The server binds only to `127.0.0.1`; it is not reachable through the computer's
LAN address. It serves an explicit allowlist of OpenSlotting runtime files and
does not expose repository files, `.git`, documentation, or arbitrary parent
paths. All application processing remains local and the runtime still contains
no external network requests.

This experiment is portable as a folder but depends on a Python 3 interpreter
already present on the target computer. Bundling Python would require shipping
platform-specific executable files and is intentionally outside this branch.
