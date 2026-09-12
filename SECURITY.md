# Security Policy

OpenSlotting is a local-first warehouse data analysis tool.

Security and data privacy are core project requirements. The application is designed to process imported operational data locally in the user's browser without uploading that data to a server.

## Supported Versions

OpenSlotting 0.1.x is the first supported release line. The `main` branch contains ongoing development and may change before the next release.

| Version | Supported |
| --- | --- |
| `0.1.x` | Yes |
| `main` | Development |
| Older development snapshots / older `0.x` | No |

## Reporting a Security Vulnerability

Please do not publicly disclose security vulnerabilities before they have been reviewed.

If GitHub private vulnerability reporting is available for this repository, use the **Report a vulnerability** option in the repository's Security section.

If private vulnerability reporting is not available, report the issue privately by email to **mail@cbahl.de**.

When reporting a vulnerability, please include:

- a description of the issue
- affected files or functionality
- steps to reproduce the issue
- the potential security impact
- any suggested mitigation, if known

Do not include real customer, company, employee, article, warehouse, or operational data in a vulnerability report.

Synthetic examples should be used whenever possible.

## Operational Data Must Not Be Committed

Real operational data must never be committed to this public repository.

This includes, but is not limited to:

- customer data
- employee data
- real order data
- real article or SKU master data
- real warehouse locations
- inventory data
- sales data
- supplier data
- internal company identifiers
- ERP or WMS exports
- screenshots containing operational information
- internal documents
- access credentials
- API keys
- passwords or authentication tokens

Test fixtures, examples, screenshots, documentation, and bug reports must use fully synthetic data. Anonymized, pseudonymized, redacted, or otherwise modified real operational datasets must not be committed to the public repository.

Removing sensitive data in a later commit is not sufficient because the original content may remain accessible through Git history, forks, clones, caches, or other copies.

If sensitive data is accidentally committed, treat it as a security incident and remove it from the repository history where necessary. If the exposed data includes an access credential, API key, password, authentication token, or other secret, revoke or rotate that credential immediately before or alongside history cleanup. History cleanup alone must never be treated as sufficient remediation for an exposed credential.

## Local-First Security Model

The core OpenSlotting workflow is designed to operate locally.

Normal use must not require:

- uploading imported files to a remote server
- a backend service
- telemetry
- analytics services
- an internet connection
- a local HTTP server
- administrator privileges

Imported CSV data should remain on the user's device unless the user explicitly exports or transfers the data themselves.

Core functionality must remain compatible with direct local execution through:

```text
file:///.../index.html
```

Changes that introduce network communication, remote storage, telemetry, external APIs, or other data transmission must be clearly documented and reviewed before becoming part of the core workflow.

## Browser-Local Workspace Storage

Persistent workspaces use IndexedDB in the current browser profile and origin.
The application retains original imported bytes, normalized rows, mappings,
validation results, and source provenance so the workspace can be reconstructed
without uploading the source files.

Browser-local storage is not a file beside `index.html` and is not a central or
multi-user database. Clearing browser site data can remove it. A different
browser profile or origin, including changing between `file:///` and localhost,
can expose a different storage area. The complete single-workspace backup is the
supported user-controlled migration and recovery path.

Workspace backup files can contain the complete original operational CSV bytes.
They must be protected like the source exports and must never be committed,
uploaded, attached to public issues, or included in screenshots. Restore input
is validated before any existing workspace is changed, and replacement requires
an explicit named target and confirmation. OpenSlotting provides no merge restore
path.

## Optional Windows Launcher

The optional Windows launcher and shortcut setup only resolve the adjacent local
`index.html`, locate a local Microsoft Edge installation, and start Edge with a
local `file:///` URL. They do not read imported CSV files, transmit data, install
system-wide components, modify Edge settings, or require administrator rights.

Shortcut setup operates only in the current user's Start menu and Desktop. It
marks generated shortcuts with an OpenSlotting ownership description. Setup must
not overwrite, and removal must not delete, a same-named shortcut without that
marker. Removing shortcuts must not delete application files or browser-local
data.

## External Resources and Dependencies

Runtime dependencies should be kept to a minimum.

Core functionality should not depend on:

- external CDNs
- externally hosted JavaScript
- remote fonts
- analytics platforms
- tracking services
- mandatory cloud services

Any future external dependency that can receive user or operational data must be explicitly documented and reviewed from both a security and privacy perspective.

## Data Processing Responsibility

OpenSlotting provides software for analyzing data locally.

Users are responsible for ensuring that they are authorized to process the data they import into the application and that their use complies with applicable company policies, contractual obligations, and data-protection requirements.

The OpenSlotting repository itself must remain free of real operational datasets.

## Security-Sensitive Changes

Changes involving the following areas deserve additional review:

- CSV parsing
- file decoding
- spreadsheet exports
- formula injection protection
- local file handling
- storage APIs
- data persistence
- external network requests
- third-party dependencies
- authentication or authorization
- import/export functionality

Security-sensitive changes should include appropriate tests whenever practical.

## Spreadsheet Export Safety

Exported CSV data may be opened with spreadsheet applications such as Microsoft Excel.

Text imported from untrusted sources must therefore be handled in a way that prevents spreadsheet formula injection where applicable.

Changes to CSV export behavior should preserve this protection.

## Privacy by Default

OpenSlotting should follow these principles:

1. Process data locally by default.
2. Collect no telemetry by default.
3. Transmit no imported operational data by default.
4. Store no real company data in the public repository.
5. Use fully synthetic test data only.
6. Keep security-relevant behavior explicit and reviewable.
7. Avoid unnecessary external dependencies.

## Disclosure

Security issues will be evaluated based on their impact and reproducibility.

Confirmed vulnerabilities should be fixed before detailed public disclosure whenever reasonably possible.
