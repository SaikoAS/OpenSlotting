# Contributing to OpenSlotting

Contributions are welcome. Keep changes small, reviewable, local-first, and supported by synthetic evidence.

## Workflow

1. Open an issue before a large behavioral or data-model change.
2. Do not work directly on `main`. Use a short-lived branch.
3. Submit the change through a pull request against `main`.
4. Keep the branch current with `main` and limit the PR to its stated issue.
5. Ensure the required `quality` check passes.
6. Address review findings and resolve every review thread before merge.

## Quality checks

Run the repository checks before requesting review:

```text
node --check csv.js
node --check app.js
node --test tests/csv.test.cjs
```

Runtime or UI changes that may affect local execution also require a manual Microsoft Edge Desktop check on Windows by opening `index.html` directly through `file:///`. Compilation and automated tests do not replace this runtime acceptance.

## Local-first compatibility

Normal use must continue to work without a local server, backend, internet connection, installer, Node.js, or Python. Do not add mandatory runtime network requests, CDNs, remote fonts, telemetry, or cloud services. If a proposed capability cannot preserve direct local-file compatibility, discuss it in an issue before implementation.

## Synthetic data only

Repository fixtures, screenshots, documentation, issues, pull requests, and bug reports must use fully synthetic data. Do not submit real company, customer, employee, order, article, warehouse, sales, ERP, or WMS data. Anonymized, pseudonymized, redacted, or otherwise modified real operational data is also prohibited.

For vulnerabilities and security-sensitive changes, follow [SECURITY.md](SECURITY.md). Do not disclose sensitive findings publicly before they have been reviewed.
