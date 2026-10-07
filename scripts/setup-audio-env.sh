#!/bin/sh
set -eu

PYTHON_BIN="${PYTHON_BIN:-python3}"
REPO_ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$REPO_ROOT"
AUDIO_ENV_DIR="${AUDIO_ENV_DIR:-audio/.venv}"
"$PYTHON_BIN" -c 'import sys; sys.version_info[:2] == (3, 12) or sys.exit("The audio environment is validated on Python 3.12")'
if [ -x "$AUDIO_ENV_DIR/bin/python" ]; then
  "$AUDIO_ENV_DIR/bin/python" -c 'import importlib.metadata as m; import sys
try:
    m.distribution("parler-tts")
except m.PackageNotFoundError:
    pass
else:
    sys.exit("Legacy Parler-TTS environment: preserve it and choose a fresh AUDIO_ENV_DIR before installing the inference port.")'
fi
"$PYTHON_BIN" -m venv "$AUDIO_ENV_DIR"
"$AUDIO_ENV_DIR/bin/python" -m pip install pip==26.2.1
"$AUDIO_ENV_DIR/bin/python" -m pip install -r audio/requirements.txt
"$AUDIO_ENV_DIR/bin/python" -m pip check
"$AUDIO_ENV_DIR/bin/python" -c 'import torch, soundfile, transformers, huggingface_hub, parler_tts; print("Audio inference environment ready; torch", torch.__version__, "Transformers", transformers.__version__)'
