# Dependency security

The release preparation upgrades Next.js and its ESLint configuration to 16.3.6. The lockfile also selects patched compatible versions of affected transitive dependencies.

## Scoped glob replacement

`braces@3.0.3` has an unpatched stack-exhaustion advisory, [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). Its only resolved path was `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces`.

The package override replaces `fast-glob` only beneath `@next/eslint-plugin-next@16.3.6` with `glob@13.0.6`. This removes the vulnerable implementation from the resolved graph; it does not suppress an audit finding or disable an ESLint rule.

The pinned Next plugin imports `fast-glob` only in `dist/utils/get-root-dirs.js`. That helper calls the named `globSync` export with a string pattern and `{ onlyDirectories: true }`, after normalizing backslashes.

[Glob](https://github.com/isaacs/node-glob) supplies the synchronous matcher without `braces`. A version-bound pnpm patch adapts only the Next helper to retain directory filtering, case sensitivity, relative and absolute paths, trailing slashes, and symlink traversal.

The helper scans normalized pattern characters before entering the matcher. It rejects patterns that exceed these conservative syntax limits.

| Syntax | Limit | Reason |
| --- | --- | --- |
| Nested braces | 100 | Bound recursive brace expansion. |
| Total extglob groups | 5 | Bound nested recursion and repeated negative-group expansion. |
| Total opening parentheses | 5 | Bound groups even when brace alternatives join operators and parentheses. |
| Total alternation pipes | 8 | Bound wide negative-group alternatives, including brace-joined tokens. |
| Normalized input length | 2,048 UTF-16 code units | Bound parser input size before matching. |
| Nested brackets | 16 | Bound literal, malformed, and character-class grouping before parsing. |

Every raw `(` is also counted independently of operator adjacency. Brace alternatives can turn `{!,!}(a|b)` or `!{(,(}a|b)` into negative extglobs, so an adjacency-only guard is insufficient. The total-opening-parenthesis and pipe limits apply to literal filenames too.

Width is bounded independently: five negative groups with 100 alternatives each, or two with 1,000 each, previously exhausted a 256 MB child despite the group limit. The scan rejects more than eight raw `|` characters, then checks normalized length before invoking the matcher. Syntax violations can be reported before length violations.

An extglob group is counted when `(` immediately follows `@`, `!`, `?`, `+`, or `*`. The scan counts raw punctuation conservatively, including punctuation within a character class or an unbalanced pattern; it is not a full glob lexer.

The existing helper replaces backslashes with slashes before scanning. These limits therefore also apply to punctuation preceded by backslashes.

Brace depths 99 and 100, extglob counts 4 and 5, total opening-parenthesis counts 4 and 5, and bracket depths 15 and 16 remain accepted. Patterns with two raw openings per brace alternative can reach the limit earlier, even if each expanded candidate would contain fewer groups. The limits intentionally change pathological lint configuration patterns; they do not change application routes or browser behavior.

Nested extglobs previously caused a timeout or stack exhaustion in the replacement matcher. Repeated flat negative extglobs could exhaust a 256 MB child process even without deep nesting, so a nesting-only guard was insufficient.

The resolved matcher also limits brace expansion to 10,000 results, and its `brace-expansion@5.0.12` dependency bounds accumulated output length to 4,000,000 characters. A bounded child-process test checks flat repeated alternatives that would have exponentially many combinations without those limits.

This is compatibility for the plugin's observed root discovery usage, not a claim that every fast-glob API or arbitrary matcher input is interchangeable or universally safe.

The [dependency regression tests](../tests/dependency-security.integration.test.ts) exercise the actual Next helper with temporary directories. They check default and explicit roots, wildcard and recursive patterns, brace patterns, arrays, missing matches, hidden directories, directory symlinks, relative paths, trailing slashes, and backslash normalization.

The resolved `brace-expansion@5.0.12` recognizes numeric and ASCII-letter ranges only. Numeric ranges emit digits and signs; letter endpoints lie between ASCII 65 and 122, above `(` at ASCII 40 and below `|` at ASCII 124. Punctuation ranges such as `{!..?}` remain literal.

Alternatives and concatenation preserve source substrings, so every expanded candidate has no more opening parentheses or pipes than the raw pattern. Tests exercise the actual resolved expander for ascending and descending letter ranges, numeric ranges, punctuation ranges, and mixed alternatives. Recheck this invariant on dependency updates.

Child processes test the reproduced wide negative groups, pipe counts 7/8/9, normalized lengths 2,047/2,048/2,049, brace-mixed pipes, mixed brace/extglob patterns, total opening parentheses, brace boundaries, all five extglob operators, repeated flat negative groups, parenthesis and bracket boundaries, and flat character classes. They distinguish controlled errors from stack exhaustion, timeouts, and process crashes. The earlier 4,000-flat-character-class regression now expects controlled rejection by the length limit; its input remains covered.

The extglob checks accept counts 4 and 5 and reject counts 6, 100, 1,000 and 4,000 before entering the matcher. Flat negative-group checks also cover counts 10, 16 and 40 with a 256 MB memory limit and a five-second timeout.

The tests also verify that `@next/next/no-html-link-for-pages` still reports an invalid internal page link and that the full resolved dependency graph excludes `braces`. The existing lint integration tests continue to check TypeScript and React hook enforcement.

## Updating dependencies

Before changing the pinned Next ESLint plugin, inspect all glob imports and callers again. Run the dependency regression tests, the full validation suite, and `pnpm audit --audit-level low` against the new frozen lockfile.

Remove both the override and helper patch when an upstream dependency chain supplies a verified fix without `braces`, or after verifying a patched `braces` release. Track the [upstream issue](https://github.com/micromatch/braces/issues/70) and the advisory rather than assuming a higher package version is safe.

An updated plugin version does not inherit this override automatically. Its exact version scope and the regression checks make a changed dependency contract visible for review.

## Optional audio environment

The initial Python audit found 45 advisory records across Transformers 4.46.1 and protobuf 4.25.9, including duplicates. It also could not audit descript-audiotools 0.7.4. That failed audit is retained in the preparation evidence.

The inference environment now pins Transformers 5.10.0 and protobuf 6.33.5. Upstream Parler-TTS still requires Transformers 4.46.1, so the repository includes an explicitly modified, Apache-2.0 inference port in [audio/vendor/parler-inference](../audio/vendor/parler-inference/UPSTREAM.md). It uses the default checkpoint's native DAC decoder and omits the incompatible legacy codec/audio-tools dependency chain.

The supported scope is Python 3.12, the pinned Indic Parler-TTS checkpoint, its T5 encoder, native DAC decoder, dynamic caches, and eager or SDPA attention. Decoder-only generation, training, custom legacy codecs, static/sliding caches, streaming exports, and encoder/decoder weight tying are outside this port's supported contract. The [upstream record](../audio/vendor/parler-inference/UPSTREAM.md) documents the original source and compatibility changes.

Run the isolated inference and audit checks in [CONTRIBUTING.md](../CONTRIBUTING.md#validate-audio-tooling) after dependency changes. The audit gate checks the installed dependency contracts, verifies the local port's source identity, and rejects known vulnerabilities or unaudited third-party packages. The advisory service does not assess the local port; independent source review and real cache, mask, checkpoint-loading, and generation tests cover that separate boundary.

The audio environment is installed separately from the web app. Use the pinned trusted model and local inputs; arbitrary model or revision overrides remain outside the verified generation scope. Changing tools never creates a genuine audio approval or establishes output redistribution rights.
