# Experimental localhost start

This branch adds an optional loopback-only start mode while keeping the existing
`file:///` workflow unchanged. OpenSlotting itself is not installed and no
application executable is built. The server uses only the Python 3 standard
library and serves the files from the extracted OpenSlotting folder.

## Requirements and start

- Windows, macOS, or Linux with Python 3.8 or newer already available
- no Python package installation
- no administrator rights
- no internet connection

On Windows, double-click `Start-OpenSlotting-Localhost.cmd`. Alternatively run:

```text
python Start-OpenSlotting-Localhost.py
```

The stable default address is:

```text
http://127.0.0.1:8765/index.html
```

Stop the server with `Ctrl+C`. For diagnostics or automated tests, prevent the
browser from opening with `--no-browser`.

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
