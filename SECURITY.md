# Security

Report suspected vulnerabilities through [GitHub private vulnerability reporting](https://github.com/mohitpatni28/Kannada-Buddy-PWA/security/advisories/new). The repository is public, private vulnerability reporting is enabled, and the reporting route has been verified. No response-time commitment is promised.

Do not post credentials, personal backup files, or exploit details in public issues. If the private reporting route is unavailable, withhold sensitive details until a private channel is available. This route verification does not establish delivery of maintainer notifications.

An exposed credential must be revoked or rotated with its provider. Removing it from the current tree does not remove it from Git history. History rewriting and account changes require explicit authorization.

## Application boundaries

Learning progress and admin edits stay in browser storage. Learner backups are private files and exclude admin edits and credentials. Clearing site data deletes these local stores.

`/admin` uses server-side HTTP Basic authentication and must be hosted over HTTPS. Keep `ADMIN_PASSWORD` out of Git and never use a `NEXT_PUBLIC_` prefix for admin credentials. Missing credentials make admin unavailable, and protected routes are excluded from offline caches.

Use isolated profiles and synthetic inputs for tests, screenshots, and demos. Do not share personal browser storage in a bug report. See the [readiness record](docs/open-source-readiness.md) for verified release checks and repository protections.
