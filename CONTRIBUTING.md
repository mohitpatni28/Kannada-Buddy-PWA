# Contributing

Kannada Buddy accepts focused improvements to learning behavior, accessibility, validation, documentation, and content provenance. Keep learner history and browser storage compatible. Do not treat automated translation output as human review.

## Set up

Use the Node.js versions declared in [package.json](package.json) and pnpm. Install with `pnpm install --frozen-lockfile`, then run `pnpm dev`. Public learning routes need no account or credentials.

Protected admin work needs locally configured credentials. Follow the [admin reference](docs/reference-workflows.md#admin-access), keep `.env.local` private, and never use real credentials in fixtures.

## Validate a change

Run the same commands used for release validation. Build before browser tests, and install Chromium once for the environment.

```sh
pnpm lint
pnpm test
pnpm content:validate
pnpm content:validate-all
pnpm build
pnpm exec tsc --noEmit
pnpm exec playwright install chromium
pnpm test:e2e
pnpm examples:check
pnpm docs:check
```

Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` if using an existing Chromium executable. Browser tests use isolated storage and synthetic records. The [examples index](examples/README.md) explains the example assertions, and [AGENTS.md](AGENTS.md) defines regression coverage and exact-diff review requirements.

Describe the behavior changed, why it matters, actual checks executed, and remaining limits in the pull request. Add meaningful regression coverage for defects and cover failure paths for persistence, imports, and publication. A build alone does not replace tests.

## Contribute content safely

Preserve immutable source snapshots, source URLs, and license metadata. Keep raw imports and AI drafts distinct from admin, native-speaker, and audio reviews. Never confirm a check you did not perform.

Follow the [review publication workflow](docs/reference-workflows.md#publish-reviewed-phrases) for real reviewed exports. Synthetic example approvals belong only in isolated tests. Contributor permissions must be sufficient for the specific code or content proposed, and ambiguous rights remain a release blocker.

## Optional audio generation

The [audio workflow](docs/reference-workflows.md#generate-the-kannada-audio-pack) needs a separate Python environment and access to the gated model. It is not part of ordinary app setup. Generated candidates remain unshipped until separate genuine text and audio review completes.

`pnpm audio:generate` and `pnpm audio:validate` require that optional environment. Do not skip relevant audio checks when changing its pipeline, and do not claim they ran without executing them.

## Security and publication

Follow [SECURITY.md](SECURITY.md) before reporting a vulnerability. Do not commit secrets, personal learner data, generated environments, or raw scanner hits. Publication, deployment, and history rewriting require separate authorization.

Commits for the existing Vercel integration must follow the repository-local identity requirements in [AGENTS.md](AGENTS.md). Do not change global Git identity or assume that GitHub push authentication sets the commit author.

## Validate audio tooling

The optional inference environment supports Python 3.12 and the pinned Indic Parler-TTS model. It uses a modified [Apache-2.0 inference port](audio/vendor/parler-inference/UPSTREAM.md); web tests do not validate this code. Run these additional checks for audio-tooling changes.

```sh
PYTHON_BIN=python3.12 sh scripts/setup-audio-env.sh
audio/.venv/bin/python -m pip check
HF_HUB_OFFLINE=1 audio/.venv/bin/python -m unittest discover -s audio/tests -v
AUDIT_ENV_DIR=$(mktemp -d)
python3.12 -m venv "$AUDIT_ENV_DIR"
"$AUDIT_ENV_DIR/bin/python" -m pip install pip-audit==2.10.1
python3.12 scripts/audit-audio-env.py \
  --environment-python audio/.venv/bin/python \
  --auditor-python "$AUDIT_ENV_DIR/bin/python" \
  --output "$AUDIT_ENV_DIR/audio-audit.json"
```

The tests construct tiny models locally and check cached decoding, masks, and checkpoint loading without credentials or downloaded models. The audit gate rejects known vulnerabilities, unaudited third-party packages, incomplete reports, and source mismatches. The local inference port is verified against its source and reviewed independently; an advisory database cannot certify it.

Release CI runs these tests and the audit gate on CPU with no gated-model access. Real pinned-checkpoint generation requires existing authorized model access and a separate isolated candidate directory. Compare generated hashes and validate candidates; different audio needs fresh genuine review before packaging.
