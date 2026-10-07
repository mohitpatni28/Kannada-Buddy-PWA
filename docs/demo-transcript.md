# Speaking practice demo

The demo uses a fresh browser profile and empty storage. It records one self-reported speaking attempt without an account, microphone permission, or external speech service. It does not demonstrate pronunciation grading or native review.

1. Open the local app and choose `Speak Kannada`.
2. Read the displayed prompt and attempt its answer aloud.
3. Choose `Reveal and compare` to see the reference romanization.
4. Choose `Said it` to record independent recall in this isolated demonstration.
5. Open `/review` and reload it to inspect the persisted learning progress.

The visible result is a concept in learning progress with a saved review schedule. The outcome is a synthetic demonstration of persistence, not evidence of a real learner's mastery.

[View the static result](../.github/assets/demo-static.png). Reproduce the capture with `node scripts/capture-release-demo.mjs` after installing the documented dependencies and building the app. The [practice example](../examples/learn-first-phrase/README.md) asserts the same state transition.
