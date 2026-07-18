#!/usr/bin/env python3
"""Generate unreviewed Kannada WAV candidates with AI4Bharat Indic Parler-TTS."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import unicodedata

os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
# The Xet backend can stall indefinitely on large gated files on macOS. Standard
# resumable HTTP downloads were reliable in our local setup.
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")

import soundfile as sf
import torch
import numpy as np
from huggingface_hub import HfApi
from parler_tts import ParlerTTSForConditionalGeneration
from transformers import AutoTokenizer

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MODEL = "ai4bharat/indic-parler-tts"
DEFAULT_REVISION = "7b527af5ee8ed1f9a28d80b19703ed9bb8ba10ca"
DEFAULT_DESCRIPTION = (
    "Anu speaks Kannada in a neutral, natural conversational style at a slightly slow pace. "
    "Her voice is very clear and close, with balanced pitch and no background noise or reverberation."
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ids", nargs="*", help="Generate only these phrase IDs; default is every phrase.")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--revision", default=DEFAULT_REVISION)
    parser.add_argument("--voice", default="Anu")
    parser.add_argument("--description", default=DEFAULT_DESCRIPTION)
    parser.add_argument("--device", choices=["auto", "cuda", "mps", "cpu"], default="auto")
    parser.add_argument("--seed", type=int, default=20260718)
    parser.add_argument("--target-rms-dbfs", type=float, default=-22.0)
    parser.add_argument("--peak-ceiling-dbfs", type=float, default=-1.0)
    parser.add_argument("--force", action="store_true")
    return parser.parse_args()


def choose_device(requested: str) -> str:
    if requested != "auto":
        return requested
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def main() -> None:
    args = parse_args()
    phrases = json.loads((ROOT / "audio" / "phrases.json").read_text(encoding="utf-8"))
    selected = [item for item in phrases if not args.ids or item["id"] in set(args.ids)]
    missing = set(args.ids or []) - {item["id"] for item in phrases}
    if missing:
        raise SystemExit(f"Unknown phrase IDs: {', '.join(sorted(missing))}")

    output_dir = ROOT / "audio" / "generated"
    cache_dir = ROOT / "audio" / "model-cache"
    output_dir.mkdir(parents=True, exist_ok=True)
    cache_dir.mkdir(parents=True, exist_ok=True)
    pending = []
    for index, phrase in enumerate(selected, start=1):
        wav_path = output_dir / f"{phrase['id']}.wav"
        metadata_path = output_dir / f"{phrase['id']}.json"
        if wav_path.exists() and metadata_path.exists() and not args.force:
            print(f"[{index}/{len(selected)}] {phrase['id']}: already generated; use --force to replace")
        else:
            pending.append((index, phrase))
    if not pending:
        return

    device = choose_device(args.device)
    print(f"Loading {args.model} on {device}. Generated files remain unreviewed.")

    try:
        revision = HfApi().model_info(args.model, revision=args.revision).sha
        model = ParlerTTSForConditionalGeneration.from_pretrained(
            args.model, revision=args.revision, cache_dir=cache_dir
        ).to(device)
        prompt_tokenizer = AutoTokenizer.from_pretrained(
            args.model, revision=args.revision, cache_dir=cache_dir
        )
        description_tokenizer = AutoTokenizer.from_pretrained(
            model.config.text_encoder._name_or_path, cache_dir=cache_dir
        )
    except Exception as error:
        message = str(error)
        if "gated" in message.lower() or "401" in message or "403" in message:
            raise SystemExit(
                "Hugging Face access is not ready. Accept the model terms at "
                "https://huggingface.co/ai4bharat/indic-parler-tts and run "
                "`audio/.venv/bin/hf auth login`, then retry."
            ) from error
        raise

    description = args.description.replace("Anu", args.voice)
    description_inputs = description_tokenizer(description, return_tensors="pt").to(device)

    for index, phrase in pending:
        wav_path = output_dir / f"{phrase['id']}.wav"
        metadata_path = output_dir / f"{phrase['id']}.json"
        phrase_seed = int.from_bytes(
            hashlib.sha256(f"{args.seed}:{phrase['id']}".encode()).digest()[:4], "big"
        )
        torch.manual_seed(phrase_seed)

        script = unicodedata.normalize("NFC", phrase["script"])
        prompt_inputs = prompt_tokenizer(script, return_tensors="pt").to(device)
        with torch.inference_mode():
            generation = model.generate(
                input_ids=description_inputs.input_ids,
                attention_mask=description_inputs.attention_mask,
                prompt_input_ids=prompt_inputs.input_ids,
                prompt_attention_mask=prompt_inputs.attention_mask,
            )
        audio = generation.detach().cpu().float().numpy().squeeze()
        rms = float(np.sqrt(np.mean(np.square(audio))))
        peak = float(np.max(np.abs(audio)))
        if rms <= 1e-9 or peak <= 1e-9:
            raise RuntimeError(f"{phrase['id']} generated effectively silent audio")
        desired_gain_db = args.target_rms_dbfs - 20 * np.log10(rms)
        peak_limited_gain_db = args.peak_ceiling_dbfs - 20 * np.log10(peak)
        gain_db = min(desired_gain_db, peak_limited_gain_db)
        audio = audio * (10 ** (gain_db / 20))
        temporary = wav_path.with_suffix(".part.wav")
        sf.write(temporary, audio, model.config.sampling_rate, subtype="PCM_16")
        temporary.replace(wav_path)
        digest = hashlib.sha256(wav_path.read_bytes()).hexdigest()
        metadata = {
            "id": phrase["id"],
            "script": script,
            "roman": phrase["roman"],
            "intent": phrase["intent"],
            "model": args.model,
            "modelRevision": revision,
            "voice": args.voice,
            "description": description,
            "baseSeed": args.seed,
            "seed": phrase_seed,
            "sampleRate": model.config.sampling_rate,
            "normalization": {
                "method": "rms",
                "targetDbfs": args.target_rms_dbfs,
                "peakCeilingDbfs": args.peak_ceiling_dbfs,
                "appliedGainDb": round(float(gain_db), 4)
            },
            "sha256": digest,
            "reviewStatus": "unreviewed"
        }
        metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"[{index}/{len(selected)}] wrote {wav_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
