# Security

This repository is currently private. GitHub private vulnerability reporting is a feature for public repositories, so its reporting route will need to be enabled and verified during publication. No private email or response-time commitment is claimed.

Do not post credentials, personal backup files, or exploit details in public issues. If GitHub displays a private `Report a vulnerability` option in this repository's Security tab, use it only after verifying that it creates a private report. If no private option is available, withhold sensitive details until the maintainer establishes one.

An exposed credential must be revoked or rotated with its provider. Removing it from the current tree does not remove it from Git history. History rewriting and account changes require explicit authorization.

## Maintainer setup at publication

Follow [GitHub's configuration instructions](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository). Once the repository is public, enable Private vulnerability reporting under Settings → Advanced Security. Check the Security → Advisories reporting page and the maintainer's notification settings, then replace the conditional guidance above with the verified reporting link.

A dedicated security email that the maintainer monitors is an alternative private route. Do not publish an address without the maintainer's consent, and do not claim the GitHub route works while the repository is private. Publication and account-setting changes require separate authorization.

## Application boundaries

Learning progress and admin edits stay in browser storage. Learner backups are private files and exclude admin edits and credentials. Clearing site data deletes these local stores.

`/admin` uses server-side HTTP Basic authentication and must be hosted over HTTPS. Keep `ADMIN_PASSWORD` out of Git and never use a `NEXT_PUBLIC_` prefix for admin credentials. Missing credentials make admin unavailable, and protected routes are excluded from offline caches.

Use isolated profiles and synthetic inputs for tests, screenshots, and demos. Do not share personal browser storage in a bug report. The current release-preparation state does not establish hosted CI success or configured repository protections.
