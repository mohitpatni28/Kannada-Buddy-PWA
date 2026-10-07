"""Offline regression tests for the supported Parler inference port."""

import os
import tempfile
import unittest

os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

import torch
from parler_tts import (
    ParlerTTSConfig,
    ParlerTTSDecoderConfig,
    ParlerTTSForCausalLM,
    ParlerTTSForConditionalGeneration,
)
from transformers import DacConfig, EncodecConfig, T5Config
from transformers.cache_utils import DynamicCache, EncoderDecoderCache


def decoder_config(backend="eager", rotary=True):
    config = ParlerTTSDecoderConfig(
        vocab_size=17, hidden_size=16, ffn_dim=32, num_hidden_layers=2,
        num_attention_heads=2, num_key_value_heads=2,
        num_cross_attention_key_value_heads=2, max_position_embeddings=32,
        num_codebooks=2, dropout=0., attention_dropout=0.,
        activation_dropout=0., pad_token_id=16, bos_token_id=16,
        eos_token_id=15, rope_embeddings=rotary,
    )
    config._attn_implementation = backend
    return config


def composite_model(backend="eager", **kwargs):
    torch.manual_seed(47)
    text = T5Config(vocab_size=20, d_model=16, d_ff=32, num_layers=1,
                    num_heads=2, d_kv=8, dropout_rate=0.)
    audio = DacConfig(encoder_hidden_size=8, decoder_hidden_size=16,
                     downsampling_ratios=[2, 2], n_codebooks=2,
                     codebook_size=16, codebook_dim=4)
    config = ParlerTTSConfig.from_sub_models_config(
        text, audio, decoder_config(backend, rotary=False), vocab_size=20,
        **kwargs,
    )
    model = ParlerTTSForConditionalGeneration(config).eval()
    for name, value in {"decoder_start_token_id": 16, "bos_token_id": 16,
                        "pad_token_id": 16, "eos_token_id": 15}.items():
        setattr(model.generation_config, name, value)
    return model


def generation_inputs():
    return {
        "input_ids": torch.tensor([[2, 3, 0]]),
        "attention_mask": torch.tensor([[1, 1, 0]]),
        "prompt_input_ids": torch.tensor([[4, 5, 0]]),
        "prompt_attention_mask": torch.tensor([[1, 1, 0]]),
    }


class InferenceTests(unittest.TestCase):
    def test_decoder_only_generation_fails_clearly(self):
        model = ParlerTTSForCausalLM(decoder_config()).eval()
        with self.assertRaisesRegex(NotImplementedError, "Decoder-only generation is unsupported"):
            model.generate(torch.tensor([[16], [16]]), max_new_tokens=4)

    @classmethod
    def setUpClass(cls):
        torch.set_num_threads(1)

    def assert_state_equal(self, before, after):
        self.assertEqual(set(before.state_dict()), set(after.state_dict()))
        for name, value in before.state_dict().items():
            torch.testing.assert_close(value, after.state_dict()[name], rtol=0, atol=0)

    def test_cached_attention_masks_and_reload(self):
        for backend in ("eager", "sdpa"):
            with self.subTest(backend=backend), torch.inference_mode():
                torch.manual_seed(41)
                model = ParlerTTSForCausalLM(decoder_config(backend)).eval()
                ids = torch.tensor([[16, 2, 3], [16, 4, 5]])
                torch.manual_seed(99)
                encoder = torch.randn(1, 3, 16)
                prompt = torch.randn(1, 2, 16)
                common = {
                    "encoder_hidden_states": encoder,
                    "encoder_attention_mask": torch.tensor([[1, 1, 0]]),
                    "prompt_attention_mask": torch.tensor([[1, 0]]),
                }
                full = model(input_ids=ids, prompt_hidden_states=prompt,
                             use_cache=False, **common).logits
                cache = EncoderDecoderCache(DynamicCache(), DynamicCache())
                prefill = model(input_ids=ids[:, :2], prompt_hidden_states=prompt,
                                past_key_values=cache, use_cache=True, **common)
                next_step = model(input_ids=ids[:, 2:], past_key_values=prefill.past_key_values,
                                  use_cache=True, **common).logits
                torch.testing.assert_close(full[:, -1], next_step[:, -1], rtol=2e-5, atol=2e-5)
                self.assertEqual(cache.get_seq_length(), 5)

                # Masked conditioning cannot influence the final audio token logits.
                altered_encoder, altered_prompt = encoder.clone(), prompt.clone()
                altered_encoder[:, 2] += 100
                altered_prompt[:, 1] -= 100
                altered = model(input_ids=ids, prompt_hidden_states=altered_prompt,
                                use_cache=False, **{**common, "encoder_hidden_states": altered_encoder}).logits
                torch.testing.assert_close(full[:, -1], altered[:, -1], rtol=2e-5, atol=2e-5)

                with tempfile.TemporaryDirectory() as directory:
                    model.save_pretrained(directory)
                    reloaded = ParlerTTSForCausalLM.from_pretrained(
                        directory, local_files_only=True, attn_implementation=backend,
                    ).eval()
                    self.assert_state_equal(model, reloaded)
                    self.assertEqual(set(dict(model.named_buffers())), set(dict(reloaded.named_buffers())))
                    for name, value in model.named_buffers():
                        torch.testing.assert_close(value, dict(reloaded.named_buffers())[name], rtol=0, atol=0)
                    restored = reloaded(input_ids=ids, prompt_hidden_states=prompt,
                                        use_cache=False, **common).logits
                    torch.testing.assert_close(full, restored, rtol=2e-5, atol=2e-5)

    def test_composite_generation_cache_and_reload(self):
        for backend in ("eager", "sdpa"):
            with self.subTest(backend=backend), torch.inference_mode():
                model = composite_model(backend)
                self.assertEqual(model.text_encoder.shared.weight.data_ptr(),
                                 model.text_encoder.encoder.embed_tokens.weight.data_ptr())
                options = {"do_sample": False, "max_new_tokens": 6}
                cached = model.generate(**generation_inputs(), use_cache=True, **options)
                uncached = model.generate(**generation_inputs(), use_cache=False, **options)
                torch.testing.assert_close(cached, uncached, rtol=2e-5, atol=2e-5)
                self.assertEqual(tuple(cached.shape), (1, 20))
                self.assertTrue(torch.isfinite(cached).all())
                self.assertGreater(float(cached.abs().max()), 0.)
                with tempfile.TemporaryDirectory() as directory:
                    model.save_pretrained(directory)
                    reloaded = ParlerTTSForConditionalGeneration.from_pretrained(
                        directory, local_files_only=True,
                    ).eval()
                    self.assert_state_equal(model, reloaded)
                    self.assertEqual(reloaded.text_encoder.shared.weight.data_ptr(),
                                     reloaded.text_encoder.encoder.embed_tokens.weight.data_ptr())
                    restored = reloaded.generate(**generation_inputs(), use_cache=True, **options)
                    torch.testing.assert_close(cached, restored, rtol=2e-5, atol=2e-5)

    def test_unsupported_generation_caches_fail_clearly(self):
        model = composite_model()
        for cache_type in ("static", "sliding_window", "offloaded"):
            with self.subTest(cache_type=cache_type):
                with self.assertRaisesRegex(ValueError, "only dynamic caches"):
                    model.generate(**generation_inputs(), max_new_tokens=6,
                                   cache_implementation=cache_type)
        with self.assertRaisesRegex(ValueError, "legacy tuple caches"):
            model.generate(**generation_inputs(), max_new_tokens=6, past_key_values=())

    def test_legacy_forward_cache_fails_clearly(self):
        model = ParlerTTSForCausalLM(decoder_config()).eval()
        with self.assertRaisesRegex(ValueError, "Legacy tuple caches"):
            model(input_ids=torch.tensor([[16], [16]]), past_key_values=(), use_cache=True)

    def test_non_native_codec_fails_clearly(self):
        config = ParlerTTSConfig.from_sub_models_config(
            T5Config(vocab_size=20, d_model=16, d_ff=32, num_layers=1,
                     num_heads=2, d_kv=8, dropout_rate=0.),
            EncodecConfig(), decoder_config(), vocab_size=20,
        )
        with self.assertRaisesRegex(ValueError, "only native Transformers DAC"):
            ParlerTTSForConditionalGeneration(config)

    def test_encoder_decoder_tying_fails_clearly(self):
        with self.assertRaisesRegex(ValueError, "tied encoder-decoder weights"):
            composite_model(tie_encoder_decoder=True)


if __name__ == "__main__":
    unittest.main()
