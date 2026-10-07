# Material rights and provenance

This inventory separates project code from learning content, fonts, dependencies, and generated speech. It records provenance gaps and licensing uncertainty rather than certifying permission to publish every asset.

## Rights inventory

| Material | Evidence and terms | Release status |
| --- | --- | --- |
| Project code | Root `LICENSE`: MIT, copyright 2026 fakecoder28. | Preserve the license and copyright notice. Ownership of contributions still requires maintainer confirmation. |
| Original learning text | `CONTENT-LICENSE.md` grants CC BY-SA 4.0 for independently created learning text within its stated scope. Original seed labels are retained as historical provenance. | The maintainer selected CC BY-SA 4.0 for original learning text. Preserve its separation from Wikivoyage-derived material and audio; do not infer ownership from an LLM or review status. |
| Wikivoyage imports and source-derived drafts | `data/wikivoyage-phrases.ts`, course scenario drafts, and library enrichment retain source links. [Upstream policy](https://en.wikivoyage.org/wiki/Wikivoyage:Copyleft) specifies CC BY-SA 4.0; the [phrasebook](https://en.wikivoyage.org/wiki/Kannada_phrasebook) also credits earlier CC BY-SA 3.0 material. | Keep attribution, contributor-history links, license links, and modification notices. Stored `CC BY-SA` labels omit versions. Recovered revision 5254654 reproduces the full 621-record import byte for byte; adjacent provenance records its revision and hashes without modifying immutable source fields or review records. Preserve the upstream version obligations. |
| Noto Sans Kannada fonts | `public/fonts/NotoSansKannada-Regular.ttf` and `NotoSansKannada-SemiBold.ttf`; [official OFL](https://github.com/notofonts/kannada/blob/main/OFL.txt) and checked-in `public/fonts/OFL.txt`: SIL OFL 1.1, copyright 2022 The Noto Project Authors. | Keep OFL with redistributed fonts. Both bundled fonts identify version 2.006 internally and match the OFL copyright. Their hashes are recorded below; the original upstream download/commit remains unconfirmed. |
| Packaged speech | Sixteen WAVs in `public/audio/`; `audio/review.json` records existing reviewer decisions, model revision, and voice. [Pinned model card](https://huggingface.co/ai4bharat/indic-parler-tts/blob/7b527af5ee8ed1f9a28d80b19703ed9bb8ba10ca/README.md) declares Apache-2.0 for the model. | Model weights do not ship. Output redistribution rights, accepted gated conditions, and original audio licensing need confirmation. Original ignored generation metadata was absent from Git history. Authorized regeneration reproduced all sixteen packaged WAVs byte for byte; `data/audio-provenance.json` records the new observation, source parameters, and hashes without claiming recovered historical metadata or access terms. Human review records are preserved; they do not themselves grant redistribution rights. |
| Optional audio tooling | `audio/requirements.txt` pins the inference dependencies; a modified Parler-TTS inference source package is included under `audio/vendor/parler-inference/`. | Tools install separately and do not enter the web bundle. The original regeneration setup produced a separate 98-distribution Python inventory and license-metadata report outside the source tree. The current native-DAC inference port retains Apache-2.0, the original headers, complete license, source revision, and modification record. Its reduced dependency inventory and audit are recorded separately in final receipts. Installed license texts resolve the empty metadata for `ptyprocess` (ISC) and `parler_tts` (Apache-2.0); the pinned [Parler-TTS source license](https://github.com/huggingface/parler-tts/blob/d108732cd57788ec86bc857d99a6cabd66663d68/LICENSE) agrees. The original environment included `soxr` under LGPL-2.1-or-later; the reduced runtime omits it. `certifi` has MPL-2.0 terms, and `tqdm` has MPL-2.0 and MIT terms. Assess their obligations if redistributing the environment or binaries; they are not bundled with the source checkout. The npm report does not cover this tooling. |
| Planned sources | Tatoeba and Lingua Libre appear in `data/source-attribution.ts` as future sources. | No imported material from these sources was identified in the inspected content paths. Check item-specific terms before importing recordings or text. |

AI draft labels, native review, admin review, and audio approval describe quality and workflow state. They do not establish ownership or substitute for license permission. Existing reviewer identities, immutable import fields, and review decisions have not been changed by this inventory.

## Dependency obligations

The installed-tree report was obtained with `pnpm licenses list --json` and the production subset with `pnpm licenses list --prod --json`. These commands succeeded; raw reports remain outside the repository because they contain local machine paths. Installed packages are not proof of which bytes enter a browser bundle, server deployment, or release archive.

The initial full report contained 399 package-name/license groups. Repeat counts are kept in the final validation receipts because patched dependencies change the installed tree.

Besides MIT, Apache-2.0, ISC, BSD, and other permissive terms, it includes MPL-2.0 (`lightningcss`, its platform binary, and test-only `axe-core`), LGPL-3.0-or-later (the macOS libvips package), and CC-BY-4.0 (`caniuse-lite`). Copyleft terms are not automatically incompatible with this project; redistribution must preserve applicable notices and satisfy the obligations for the actual distributed components.

Before distributing built bundles or native binaries, identify the included components and retain their license texts and notices. Review MPL file-level source obligations and LGPL library/source and relinking obligations where those components are distributed. A source checkout with a lockfile and dependency installation is a different artifact from a bundled application.

## Checks still required

An initial tracked-and-proposed tree snapshot was scanned with ScanCode Toolkit 32.5.0 using `--license --copyright`; the scan completed with no scanner errors. The report is outside the repository. This scan does not cover later edits, dependency directories, ignored generation metadata, or publishable Git history.

Its version guesses from generic `CC BY-SA` labels are not evidence of the original import's exact terms. A `JSON` license detection in the CI command `pnpm licenses list --json` is a false positive, not a license obligation.

Combined detections in this inventory and `NOTICE` reflect descriptive references to multiple licenses, not a license applied to those documents. Binary WAVs and fonts require provenance review alongside their adjacent notices; absence of a detection is not clearance.

- Confirm rights to any contributed material beyond the independently created learning text covered by the maintainer's CC BY-SA 4.0 decision.
- Confirm packaged-audio output terms. Retain the byte-identical reproduction evidence for the sixteen shipped WAVs without treating it as historical access-term evidence.
- Retain the recovered import revision and upstream attributions without rewriting immutable source records. The exact original font download remains a documented minor provenance gap.
- Repeat tree license scanning on the final proposed snapshot, resolve findings against actual provenance, and audit optional Python dependencies if distributing or claiming coverage for that tooling.
- Inspect the final deployment/release artifact for third-party notices and obligations; a metadata report alone is insufficient.

This document and `NOTICE` describe the current evidence. They do not claim legal clearance, native-speaker certification, or completed release validation.

## Bundled font identity

Both font name tables declare version 2.006 and copyright 2022 The Noto Project Authors. These SHA-256 hashes identify the distributed bytes, not the original download location.

| File | SHA-256 |
|---|---|
| `NotoSansKannada-Regular.ttf` | `4b8dd08fc05afa13cc8daa8ac2187f35711be026286db8608e87c86f715e273d` |
| `NotoSansKannada-SemiBold.ttf` | `bd393508ca92abc96b1d804cafaf9d039d21df91c41469dc7dc566871aa5d050` |

The exact upstream artifact location is deferred to the maintainer because it was not recorded when bundled. Matching internal copyright, OFL accompaniment, and byte hashes establish the available evidence; no exact upstream match is claimed.

## Packaged-audio licensing exception

The maintainer accepted publication on 2026-10-07 with an audio-licensing exception, citing noncommercial use. Output redistribution terms remain unverified, and this acceptance does not establish permission. The recordings remain excluded from the original-text grant in [CONTENT-LICENSE.md](../CONTENT-LICENSE.md).

The existing review manifest identifies AI4Bharat Indic Parler-TTS, its pinned revision, and the Anu voice. The original per-file generation metadata was unavailable in Git history. Regeneration with the pinned model reproduced all sixteen packaged WAVs byte for byte and passed audio validation.

[The provenance manifest](../data/audio-provenance.json) records each file hash, model revision, input text, voice, and generation settings as retrospective reproduction evidence.

The [pinned model card](https://huggingface.co/ai4bharat/indic-parler-tts/blob/7b527af5ee8ed1f9a28d80b19703ed9bb8ba10ca/README.md) declares Apache-2.0 for the model. An [upstream discussion about generated-audio redistribution](https://huggingface.co/ai4bharat/indic-parler-tts/discussions/31) had no maintainer answer when rechecked on 2026-10-07. Obtain authoritative clarification or a documented rights assessment for the outputs and any accepted access terms before assigning a recording license; the absence of an answer does not itself establish a restriction.

The regenerated bytes match the existing packaged files, so no packaged clip or historical quality approval was replaced. If later generation produces different WAVs, those candidates need fresh genuine audio review. Byte-identical reproduction repairs the generation evidence without settling output licensing or inventing historical access terms.
