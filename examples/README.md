# Runnable examples

These examples use isolated browser storage and synthetic data. They require the supported Node.js toolchain and a frozen pnpm install from the repository root.

| You want | Example |
| --- | --- |
| Practise speaking and reading with a saved review schedule | [Learn a first phrase](./learn-first-phrase/) |
| Restore a backup and browse situations, search and sources | [Retain progress](./retain-progress/) |
| Export a synthetic admin review and check it without publishing | [Review a synthetic export](./review-synthetic-export/) |

Run all examples from the repository root.

```sh
pnpm build
pnpm exec playwright install chromium
pnpm examples:check
```

The runner validates this index and fails if a folder or runnable command is missing. Each browser example starts a local production server on port 3101 with a fresh Playwright profile.

The examples cover `/`, `/today`, `/review`, `/settings`, `/travel`, `/phrasebook`, `/library`, `/sources`, `/admin`, and the review validation command. Each folder's README explains the assertions for its related tasks.

The admin workflow uses the production server with explicit synthetic HTTP Basic credentials. Its checked attestations exist only in isolated browser storage and temporary downloads; they are not genuine linguistic reviews and are never applied to tracked publication data.

Browser requests outside the isolated server are blocked, and service workers are disabled for these task examples. Dedicated end-to-end tests cover service workers separately. The examples do not use personal accounts. There is no output normalization; browser assertions check visible results and stored state, and the command example checks the exact deterministic summary.
