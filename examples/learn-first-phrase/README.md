# Learn first phrase

Practice one phrase in a fresh mobile browser. This is the executable counterpart of the README quickstart.

Run from the repository root after `pnpm install --frozen-lockfile` and `pnpm build`. Install Chromium with `pnpm exec playwright install chromium`.

```sh
pnpm examples:check -- learn-first-phrase
```

The speaking workflow reveals Kannada script, records exactly one successful speaking attempt, and saves its four-day review schedule. It visits `/review`, reloads, and asserts that the visible learning count and saved progress remain identical.

A separate fresh-browser workflow enables `Speak + read` and romanization `when needed` in `/settings`, opens `/today`, completes one Kannada recognition check and one phrase-reading attempt, and asserts separate orthography, speaking and reading evidence.

Playwright creates fresh storage. No speech playback or private accounts are required.
