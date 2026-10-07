# Workflow reference

This reference preserves the content import, review publication, audio generation, deployment, and storage contracts. Run commands from the repository root. Publication requires separate authorization and the gates in [AGENTS.md](../AGENTS.md).

## Import Wikivoyage

```bash
node scripts/import-wikivoyage.mjs
```

The importer reads the Wikivoyage Kannada phrasebook through the MediaWiki API and writes `data/wikivoyage-phrases.ts`. Imported phrases are marked `raw_imported`, `source: "wikivoyage"`, and `license: "CC BY-SA"` so they can be reviewed before entering lessons.

## Enrich the reference library safely

The imported Wikivoyage file remains the immutable source snapshot. Automated
enrichment is written to a separate, non-canonical draft artifact so a re-import
cannot silently turn model output into approved content.

Generate and validate the 40-item calibration pilot.

```bash
pnpm content:pilot
pnpm content:validate
```

After auditing the pilot, generate and validate the full Library-only artifact.

```bash
pnpm content:all
pnpm content:validate-all
```

The workflow writes these draft artifacts.

- `data/library-profile.json`: whole-corpus categories, anomaly counts, and risk tiers.
- `data/library-enrichment-pilot.json`: four deterministic 10-item cohorts covering
  clean basics, transport, food/shop, and deliberate source anomalies.
- `data/library-enrichment-all.json`: all 621 source occurrences, including duplicate
  source IDs preserved through an occurrence number and unique draft ID.
- `data/library-enrichment.schema.json`: the contract for draft wording, register,
  usage context, Bengaluru-naturalness assessment, confidence, and review queues.

Every record is tied to the exact imported source fields with a SHA-256 hash. The
validator rejects stale hashes, changed source fields, duplicate draft IDs, invalid
queues, empty fields, or any claim of human/native review. It also verifies that the
pilot does not promote a production-course/audio ID.

Draft eligibility has three explicit levels.

- `library_ai_draft`: may later be shown as an automated reference with clear labeling.
- `library_ai_draft_caution`: automated reference requiring a prominent safety warning.
- `hold_for_human_review`: structurally incomplete and not suitable for publication.

None of these statuses means `approved` or `reviewed`. The artifact does not modify
`data/wikivoyage-phrases.ts`, the hand-curated core concepts, authored lessons, or
public audio. AI4Bharat Indic Parler-TTS is a pronunciation generator rather than a
text-validation model, so it is intentionally not treated as evidence that draft
Kannada wording is correct.

It should only be used later for explicitly unreviewed
audio candidates after selected text has been promoted through a separate review.

The full artifact feeds the reference Library, Admin review queues, and an explicitly
labelled reference-learning deck. Regular `library_ai_draft` entries are included in
spaced-repetition sessions by default. `library_ai_draft_caution` entries require an
explicit Settings choice, while `hold_for_human_review` entries remain Admin-only and
cannot enter a session until reviewed and published through the workflow below.

The learning deck stores progress on the device and retains
AI-draft provenance in practice and history views. It does not turn a draft into an
approved lesson or claim native review.

Settings also offers a regular-AI-drafts-only
mode for focused reference study. Admin shows the exact source and draft side by side,
structural issue flags, confidence, and review priority.

## Publish reviewed phrases

1. Open protected `/admin`. Edit a candidate, then choose `Approve for export`. Resolved items leave pending queues. Find them in Approved.

   This decision affects only this browser.
2. In `Publish reviewed phrases`, inspect the selected phrases, enter the reviewer name, and confirm the four checks for meaning, Kannada script, romanization, and usage/context. Confirm only checks actually performed. Export the reviewed JSON.

   This export excludes learner progress and credentials.
3. In the project folder, validate and apply the downloaded file.

   ```bash
   pnpm reviews:check --input /path/to/kannada-reviewed-phrases.json
   pnpm reviews:apply --input /path/to/kannada-reviewed-phrases.json
   ```

   Checking changes no files. Applying merges reviews into `data/published-phrases.json`. It does not push or deploy. Unknown or duplicate IDs, stale original source fields/hashes, incomplete checks, missing script, unsupported fields, malformed dates, and older replacement reviews are rejected.

   Keep the downloaded export as a recovery copy of your reviewed edits.
4. Review the content diff, run the validation commands in the [contributor guide](../CONTRIBUTING.md#validate-a-change), obtain the independent reviews required by [AGENTS.md](../AGENTS.md), and obtain authorization before committing as `fakecoder28` and pushing. Confirm Vercel successfully deploys that exact commit.

After deployment, reviewed content is available in the shared course, search, and eligible practice decks, including candidates previously held for review. Stable IDs preserve existing learning history. Admin review is labeled separately from native-speaker review. Changing a reviewed phrase's Kannada form removes incompatible packaged audio.

Source licenses and attribution stay attached. The initial published artifact is empty: no human approvals have been invented.

Exports contain approved reviews, not deletions or rejected decisions. Rejecting a previously published phrase locally does not withdraw it from other users. Withdrawal currently requires a reviewed repository change.

Learning progress and preferences stay in local storage, with Settings backup/restore. This workflow adds no backend or device synchronization.

## Generate the Kannada audio pack

AI4Bharat Indic Parler-TTS generation is isolated from the web app. Generated candidates are never published automatically.

The [optional Python security assessment](dependency-security.md#optional-audio-environment) describes the supported inference port and its checks. The original audit found known advisories; the current native-DAC inference port has separate regression and audit checks. 

The npm audit does not cover it. Use only the pinned trusted model and local inputs. Arbitrary model or revision overrides are outside the verified scope.

1. Accept the gated model conditions at <https://huggingface.co/ai4bharat/indic-parler-tts>.
2. Create the local environment with Python 3.12. The [inference port](../audio/vendor/parler-inference/UPSTREAM.md) supports the pinned model and native DAC decoder; it does not support training or legacy codecs.

   ```bash
   PYTHON_BIN=python3.12 sh scripts/setup-audio-env.sh
   ```

If setup detects the previous Parler-TTS environment, preserve it outside `audio/.venv` before creating a fresh environment at that path. The setup script refuses to mutate the legacy environment. An `AUDIO_ENV_DIR` override can create an isolated check environment; `pnpm audio:*` commands still use `audio/.venv`.

3. Authenticate without writing a token into this repository.

   ```bash
   audio/.venv/bin/hf auth login
   ```

4. Generate one smoke-test clip, then the full candidate set. The generator pins the
   reviewed AI4Bharat model revision and records complete provenance beside every WAV.

   ```bash
   pnpm audio:generate -- --ids greet-hello
   pnpm audio:generate
   pnpm audio:validate
   ```

   Use `--device cpu` if an operation is unsupported on Apple MPS. Candidates and provenance metadata are written under the ignored `audio/generated/` directory.
   Output is normalized to a conservative `-22 dBFS` RMS with a `-1 dBFS` peak ceiling so lesson volume remains consistent; both the target and applied gain are recorded in provenance.

5. A fluent Kannada reviewer updates `audio/review.json`. `status` may become `approved` only when wording, register, script, romanization, and audio checks are all `true`, with reviewer identity and an ISO timestamp.
6. Package only approved clips and rebuild the PWA.

   ```bash
   pnpm audio:package
   pnpm build
   ```

The packaging command refuses incomplete approvals, copies passed WAV files to `public/audio/`, updates the app’s audio/review manifests, and leaves every other generated clip private and unshipped.

## Notes

The app is local-first. Learning progress and admin edits are stored in the browser, not synced to a server yet. Compatible v1 phrase progress is migrated into the current concept store on first load.

Unpublished course drafts retain their pending-review status. Published admin reviews are separately attributed and do not certify fluent native-speaker review. Generated audio must not be assigned to `audioUrl` until its separate wording, register, script, romanization, and audio review passes.

Admin decisions remain local until exported, validated, committed, and redeployed. Published admin reviews enter the shared course and library, with explicit admin-review attribution. They do not certify native-speaker or audio review.

Settings can export and restore local data through a JSON file. Restoring replaces the backed-up stores in this browser.

Clearing site data deletes local progress, preferences, and admin edits. A backup can recover learning history and settings. Admin edits are excluded and cannot be recovered from it.

There is no automatic synchronization or server database.

The service worker registers in production. Public offline availability depends on an initial online visit and successful caching.

Admin requires an online connection and is excluded from offline caches. The admin link opens a full browser navigation, and protected requests pass directly to the network so the browser can show its username/password prompt.

Browsers may reuse credentials already entered. Use a private window to test a fresh login. Device speech availability depends on installed voices and browser support.

## Admin access

`/admin` uses server-side HTTP Basic authentication. In Vercel, open the project `Settings → Environment Variables`, add `ADMIN_USERNAME` with value `adminforkannadaapp` and a strong `ADMIN_PASSWORD`, select Production (and Preview if needed), then redeploy.

Never prefix these names with `NEXT_PUBLIC_` or put the password in Git. For local development, copy `.env.example` to `.env.local` and set the password locally before starting the server.

Missing credentials leave admin unavailable. Incorrect credentials receive an authentication challenge.

Public learning routes remain available without admin credentials. Protected HTML, router responses, and admin API paths are not cached. Use HTTPS when hosting the app because Basic authentication relies on transport encryption.

## Understanding progress

Speaking outcomes are self-reported and do not measure pronunciation automatically. A phrase becomes retained after independent recall on two distinct scheduled review days, with the latest recall gap at least seven days, and remains retained only while its review is not overdue. Same-session corrections and initial successes cannot establish retention.

Speaking and reading evidence are tracked separately. Old history keeps its counters but does not receive invented recall dates.

The dashboard follows your selected decks and reading mode for due counts. Lifetime attempts use persistent counters, while detailed recent history holds the latest 500 checks.

The initial 84 scenario drafts retain source attribution and draft status until an explicit reviewed publication. Admin review never certifies native-speaker review or audio.

## License and attribution

Project code is licensed under the [MIT License](../LICENSE), copyright © 2026 fakecoder28.

Third-party content retains its own licenses and attribution and is not relicensed under MIT. Wikivoyage imports and source-derived reference material retain Creative Commons Attribution-ShareAlike requirements. See the [Kannada phrasebook and its contributors](https://en.wikivoyage.org/wiki/Kannada_phrasebook) for applicable terms and history.

Bundled Noto Sans Kannada fonts retain the [SIL Open Font License](../public/fonts/OFL.txt). Audio model weights and generated or packaged content retain applicable source/model terms and review requirements. This code license does not grant rights to model weights or separately licensed content.

Source metadata is recorded in [data/source-attribution.ts](../data/source-attribution.ts) and displayed on `/sources`. Historical seed labels remain intact for provenance. [CONTENT-LICENSE.md](../CONTENT-LICENSE.md) supplies CC BY-SA 4.0 reuse terms for independently created learning text within its stated scope.

Wikivoyage-derived drafts keep their source attribution and share-alike obligations. Byte-identical regeneration established reproducible provenance for all sixteen packaged WAVs; original historical generation metadata was not recovered. Output redistribution rights remain unresolved in the [readiness record](open-source-readiness.md).
