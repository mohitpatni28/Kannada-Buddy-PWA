# Retain progress

Compose speaking practice with preferences, a downloaded backup, and an actual restore. Browse situations and provenance through a separate fresh-browser workflow.

Run from the repository root after `pnpm install --frozen-lockfile` and `pnpm build`. Install Chromium with `pnpm exec playwright install chromium`.

```sh
pnpm examples:check -- retain-progress
```

The mode and session length survive reload. The workflow downloads the synthetic learner backup, clears only learner progress and preferences, checks the restore preview, restores the file, and verifies both stores and the progress page after reload.

The browsing workflow opens `/travel`, chooses the phone-call scenario, searches `/phrasebook`, checks an empty result, filters an AI draft in `/library`, and reads `/sources`. It verifies source links and draft labels without creating learner progress.

Playwright creates fresh storage. No speech playback or private accounts are required.
