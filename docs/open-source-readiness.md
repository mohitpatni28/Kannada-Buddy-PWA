# Open-source readiness

Release preparation was committed and pushed as `ccdc792` to `main` in the existing private repository. The hosted Release workflow passed all five jobs.

The maintainer intends to make the repository public; no agent changed its visibility. Packaged-audio redistribution rights remain unverified despite reproducible regeneration. GitHub private vulnerability reporting is selected for enablement and verification during publication.

## Publication scope

The proposed source tree includes application code, tests, scripts, content artifacts, packaged fonts and audio, contributor documentation, CI, examples, banners, and the captured demo. Preserve existing Git history rather than creating a forced initial import. Exclude local environments, credentials, browser storage, generated audio candidates, model caches, build/dependency directories, raw scanner/review receipts, and unrelated user work. Unrelated folders must not be staged or published.

The baseline before preparation was `1951615`. Read-only GitHub inspection confirmed the current destination is `mohitpatni28/Kannada-Buddy-PWA`, default branch `main`, with private visibility. This does not choose a different personal organization or authorize a transfer, settings change, or publication.

## Required decisions and blockers

- The maintainer chose CC BY-SA 4.0 for independently created learning text. [CONTENT-LICENSE.md](../CONTENT-LICENSE.md) defines the scope; Wikivoyage-derived content keeps its source obligations even when edited by an LLM or a reviewer. Packaged audio is excluded from this grant.
- Wikivoyage revision 5254654 was recovered and reproduced the complete 621-record import byte for byte using its recorded import timestamp. Adjacent provenance records the revision and hashes without changing immutable source fields or review records. Preserve upstream license-version obligations.
- Confirm redistribution rights and generation provenance for the sixteen packaged audio clips. Git history contains the generation scripts and quality reviews, but no original per-file generated metadata. The maintainer authorized regeneration, which produced all sixteen WAVs byte for byte identical to the packaged clips and passed audio validation. Adjacent provenance records that reproduction without claiming recovered historical metadata. Existing packaged bytes and genuine quality-review decisions remain unchanged; different replacement audio would need fresh review. Output licensing remains unresolved. On 2026-10-07, the maintainer accepted a release exception, citing noncommercial use. That decision records the maintainer's risk acceptance; noncommercial use does not establish redistribution permission, and audio remains excluded from the project content-license grant.
- Establish and verify a private vulnerability-reporting route during publication. GitHub supports this feature for public repositories; the current private repo endpoint returned HTTP 404, which does not establish a configuration defect. Enable reporting and verify the reporting page and maintainer notifications when publication is authorized, or use a maintainer-approved security email. No setting was changed.
- The unpatched lint-tool dependency was replaced only within the pinned Next ESLint plugin, with an immutable adapter patch and regression-tested bounds on hostile patterns. The resolved graph no longer includes `braces`, and its dependency audit reports zero vulnerabilities. See [dependency security](dependency-security.md); final full-suite and review receipts verify the proposed state.
- The initial optional Python audio-tool audit failed with Transformers and protobuf advisories and one unaudited legacy dependency. The inference tooling now uses patched pinned versions through an explicitly modified native-DAC Parler inference port, omitting that legacy chain. Separate final receipts record fresh installation, dependency checks, advisory coverage, inference tests, generation comparison, and affected independent reviews; the npm audit does not cover this environment.
- Both independent release-review panels, affected post-edit reviews, and the five separate exact-commit lenses completed before `ccdc792` was committed. Immutable reports and actual command receipts remain outside this tree. All five hosted Release jobs subsequently passed for that commit. Deployment is a separate check: after the repository and account connections were restored in Vercel, deployment of `ccdc792` was blocked by a mismatch between its historical author and the connected maintainer account. A reviewed follow-up commit using the maintainer's verified local identity is planned; its deployment result remains pending. Contributor identity requirements belong in local maintainer configuration, not this repository's agent instructions.

See [third-party material](third-party-material.md) and [NOTICE](../NOTICE) for the rights inventory. Project code remains MIT licensed. The explicit original-text license decision does not relicense source-derived content or recordings.

## Validation evidence

Exact immutable snapshot hashes, command outputs, exit statuses, vulnerability reports, redacted secret-scan reports, and full review findings are stored outside the publication tree. The table below preserves initial observations; it is not the final release result. Final-state command receipts and later independent reviews are stored separately. They do not establish audio redistribution rights or authorize external settings changes.

| Command or check | Initial observed result |
|---|---|
| `pnpm lint` | Passed on the original dependency tree. |
| `pnpm test` | Initial concurrent run timed out during ESLint startup; a serial rerun passed 183 tests in 25 files. No assertion was removed or weakened. |
| `pnpm build` | Passed on the original dependency tree. |
| `pnpm exec tsc --noEmit` | Passed on the original dependency tree. |
| `pnpm content:validate` | Passed for 40 calibration drafts. |
| `pnpm content:validate-all` | Passed for 621 source-linked drafts. |
| `pnpm test:e2e` | Passed all 11 browser tests against a production server with isolated data. |
| `node scripts/capture-release-demo.mjs` | Captured six asserted browser states and generated the GIF and static fallback. Local socket access required sandbox escalation. |
| Banner and demo inspection | Both banner renders and first, middle, and final demo frames were visually inspected. Local rendered README inspection and final capture receipts are stored separately; this is not verification of hosted GitHub rendering. |
| Gitleaks 8.30.0 history scan | `gitleaks git . --log-opts='--all --full-history' --redact`: passed across 14 commits. The first immutable proposed tree was independently scanned without leaks. Repeat receipts for the final state remain separate. |
| Dependency license reports | `pnpm licenses list --json` and `pnpm licenses list --prod --json`: passed on the initial installed tree. Repeat after dependency changes. |
| ScanCode 32.5.0 | Initial 171-file publication snapshot scanned with no scanner errors. Known detection false positives and binary limitations are recorded in the rights inventory. Repeat on the final snapshot. |
| `pnpm audit --json` | Found 23 advisory records initially, including critical Next.js issues. Next.js and its ESLint configuration were updated to 16.3.6 with compatible transitive patches. The subsequent version-scoped glob replacement removes `braces@3.0.3` from the resolved graph; its audit reports zero vulnerabilities. CI retains the strict audit check. Final immutable receipts cover complete-suite and independent review results. |

## Reproduction and review

Use Node.js and pnpm versions declared in `package.json`. Run the full suite in [CONTRIBUTING.md](../CONTRIBUTING.md), including all three examples and documentation checks, from a fresh snapshot with a frozen install and an initially empty task-specific store. Toolchain-floor validation and the additional supported line must be executed separately from the current local Node.js run.

Every panel has separate security/privacy, licensing/provenance, maintainability, correctness, testing/regression, UX/accessibility, and presentation/onboarding reviewers, plus a fresh whole-README reader. Each receives the exact snapshot and actual evidence without earlier panel findings. Any later edit requires the affected lenses to recheck it. Independent security review reproduced a microphone lifetime defect after delayed permission and recorder failures. The fix adds seven integration and four browser regressions; five integration assertions failed before the change, then all seven passed. Full-panel outcomes and all five exact-commit reviews for `ccdc792` are recorded in final immutable receipts. Later commits require their own reviews.

Keep post-check receipts outside the source tree to avoid changing the reviewed files while recording results. The final task report must identify executed checks, snapshot identity, review outcomes, and unresolved gates. Publication, repository protections, and deployment remain separate verification steps; the hosted Release workflow for `ccdc792` has passed.

The isolated Node.js 22.22.2 preparation run completed a frozen install from an empty temporary store, lint, tests, content validators, build, types, browser tests, all examples, and documentation checks. Subsequent source/license and microphone fixes require final-state repeats; exact receipts identify which revision each run covered.

Final-preparation runs on Node.js 26.8.1 and 24.15.0 each passed the complete ten-command suite with 199 tests and 16 browser tests, plus all three examples. An unrelated user folder was discovered in a temporary snapshot and removed from task-created copies; corrected-snapshot validation receipts are retained separately. `pnpm audio:validate` was initially unavailable because the optional Python environment was absent. The environment has since been installed for authorized regeneration, with its separate resolved dependency inventory retained outside this tree. Final regeneration and validation receipts identify actual outcomes; earlier unavailability is never counted as a pass.

Authorized audio regeneration completed successfully on Apple MPS. `pnpm audio:generate` and `pnpm audio:validate` exited 0; all sixteen reproduced WAV hashes match their packaged counterparts. `data/audio-provenance.json` records retrospective generation evidence, while original quality reviews remain untouched.

The final `ccdc792` source snapshot was validated on Node.js 22.22.2, 24.15.0, and 26.10.0 with frozen installation, lint, 222 tests, both content validators, production build, TypeScript checks, 18 browser tests, all three examples, and documentation checks. Each command exited 0. The separate fresh Python 3.12 environment passed dependency checks, 17 offline tests, and the strict installed-environment audit covering all 40 third-party distributions with zero findings or skipped packages.

Final receipts also record the source/history secret scans, license scan, and byte-identical regeneration of all sixteen WAVs. These results describe the existing release commit; the maintainer-identity documentation follow-up needs its own final-state validation and independent reviews.
