# Parler-TTS inference source

This package adapts Hugging Face's [Parler-TTS source](https://github.com/huggingface/parler-tts/tree/d108732cd57788ec86bc857d99a6cabd66663d68) at commit `d108732cd57788ec86bc857d99a6cabd66663d68` for the pinned Transformers 5.10.0 API. The original Apache-2.0 headers and complete license are retained. `UPSTREAM.patch` records the changes to the four included upstream modules.

The maintained scope is inference with the pinned AI4Bharat Indic Parler-TTS checkpoint, its T5 text encoder, native Transformers DAC decoder, and dynamic caches. Decoder-only generation, legacy DAC wrappers, streaming exports, static caches, encoder/decoder weight tying, and training are outside this package's supported scope. The unused legacy codec dependency chain is omitted rather than relaxing its incompatible dependency constraints.

The port updates configuration defaults, generation preparation, cache access and positions, and framework weight initialization. Regression tests exercise eager and SDPA attention, cached and uncached decoding, attention masks, and checkpoint save/reload. Model and generated-audio rights remain separate from this source license.
