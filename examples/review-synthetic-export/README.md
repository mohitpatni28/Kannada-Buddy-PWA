# Review synthetic export

Prepare an admin export in isolated browser storage, then check it through the actual publishing CLI. The same runner also validates a checked-in synthetic review and rejects an incomplete attestation.

Run from the repository root after `pnpm install --frozen-lockfile` and `pnpm build`. Install Chromium with `pnpm exec playwright install chromium`.

```sh
pnpm examples:check -- review-synthetic-export
```

The runner prints `Synthetic review accepted; incomplete review rejected; no publication files changed.`

The browser workflow uses `example-reviewer` and `synthetic-example-password-only` solely for its local production server. It preserves the source wording, labels the usage note and reviewer as synthetic, checks the exported download, and validates it against an empty temporary publication artifact.

All attestations and the fixture are test data, not linguistic reviews. Only `--check` is used, and temporary publication artifacts are removed; no approvals are applied to the tracked content.
