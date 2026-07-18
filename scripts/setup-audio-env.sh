#!/bin/sh
set -eu

PYTHON_BIN="${PYTHON_BIN:-python3}"

# AudioTools keeps optional examples in Git LFS. Inference needs only its Python
# source, so disable LFS filters for pip's temporary dependency checkout.
export GIT_CONFIG_COUNT=2
export GIT_CONFIG_KEY_0=filter.lfs.process
export GIT_CONFIG_VALUE_0=
export GIT_CONFIG_KEY_1=filter.lfs.required
export GIT_CONFIG_VALUE_1=false

"$PYTHON_BIN" -m venv audio/.venv
audio/.venv/bin/python -m pip install --upgrade pip
audio/.venv/bin/python -m pip install -r audio/requirements.txt
audio/.venv/bin/python -c 'import torch, soundfile, transformers, huggingface_hub, parler_tts; print("Audio environment ready; torch", torch.__version__)'
