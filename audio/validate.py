#!/usr/bin/env python3
"""Validate generated audio candidates without approving or publishing them."""

import hashlib
import json
import math
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    phrases = json.loads((ROOT / "audio" / "phrases.json").read_text(encoding="utf-8"))
    review = json.loads((ROOT / "audio" / "review.json").read_text(encoding="utf-8"))
    generated = ROOT / "audio" / "generated"
    errors: list[str] = []
    warnings: list[str] = []
    hashes: dict[str, str] = {}

    print(f"{'ID':28} {'SEC':>6} {'PEAK':>7} {'RMS dB':>8} {'CLIP %':>8}")
    for phrase in phrases:
        phrase_id = phrase["id"]
        wav_path = generated / f"{phrase_id}.wav"
        metadata_path = generated / f"{phrase_id}.json"
        if not wav_path.is_file() or not metadata_path.is_file():
            errors.append(f"{phrase_id}: WAV or metadata is missing")
            continue

        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        digest = hashlib.sha256(wav_path.read_bytes()).hexdigest()
        expected = {
            "id": phrase_id,
            "script": phrase["script"],
            "roman": phrase["roman"],
            "model": review["model"],
            "modelRevision": review["modelRevision"],
            "voice": review["voice"],
            "reviewStatus": "unreviewed",
        }
        for field, value in expected.items():
            if metadata.get(field) != value:
                errors.append(f"{phrase_id}: metadata {field} does not match its manifest")
        if metadata.get("sha256") != digest:
            errors.append(f"{phrase_id}: SHA-256 does not match its metadata")
        normalization = metadata.get("normalization", {})
        if normalization.get("method") != "rms" or normalization.get("targetDbfs") != -22.0:
            errors.append(f"{phrase_id}: expected recorded RMS normalization metadata")
        if digest in hashes:
            errors.append(f"{phrase_id}: audio duplicates {hashes[digest]}")
        hashes[digest] = phrase_id

        audio, sample_rate = sf.read(wav_path, always_2d=True)
        duration = len(audio) / sample_rate
        finite = np.isfinite(audio)
        peak = float(np.max(np.abs(audio[finite]))) if np.any(finite) else 0.0
        rms = float(np.sqrt(np.mean(np.square(audio[finite])))) if np.any(finite) else 0.0
        rms_db = 20 * math.log10(max(rms, 1e-12))
        clipped = float(np.mean(np.abs(audio[finite]) >= 0.999)) * 100 if np.any(finite) else 0.0
        print(f"{phrase_id:28} {duration:6.2f} {peak:7.3f} {rms_db:8.2f} {clipped:8.4f}")

        if sample_rate != 44100 or audio.shape[1] != 1:
            errors.append(f"{phrase_id}: expected 44.1 kHz mono audio")
        if not np.all(finite):
            errors.append(f"{phrase_id}: contains non-finite samples")
        if not 0.3 <= duration <= 12:
            errors.append(f"{phrase_id}: suspicious duration of {duration:.2f} seconds")
        if peak < 0.03:
            errors.append(f"{phrase_id}: audio is effectively silent")
        elif peak < 0.1:
            warnings.append(f"{phrase_id}: low peak level ({peak:.3f})")
        if not -23 <= rms_db <= -21:
            warnings.append(f"{phrase_id}: RMS level is outside the normalization tolerance ({rms_db:.2f} dBFS)")
        if clipped > 0.01:
            errors.append(f"{phrase_id}: clipping affects {clipped:.4f}% of samples")

    for message in warnings:
        print(f"WARNING: {message}")
    if errors:
        for message in errors:
            print(f"ERROR: {message}")
        raise SystemExit(f"Validation failed with {len(errors)} error(s).")
    print(f"Validated {len(phrases)} unreviewed candidates with {len(warnings)} warning(s).")


if __name__ == "__main__":
    main()
