"""Bootstrap refuses to mutate legacy environments that need an explicit migration."""

import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import venv

ROOT = Path(__file__).resolve().parents[2]


class BootstrapTests(unittest.TestCase):
    def test_legacy_environment_is_rejected_before_mutation(self):
        with tempfile.TemporaryDirectory() as directory:
            environment = Path(directory) / "legacy"
            venv.EnvBuilder(with_pip=False).create(environment)
            site_packages = environment / "lib/python3.12/site-packages"
            distribution = site_packages / "parler_tts-0.2.2.dist-info"
            distribution.mkdir(parents=True)
            (distribution / "METADATA").write_text("Metadata-Version: 2.1\nName: parler-tts\nVersion: 0.2.2\n")
            original = {path.relative_to(environment): path.read_bytes() for path in environment.rglob("*") if path.is_file()}
            result = subprocess.run(["sh", str(ROOT / "scripts/setup-audio-env.sh")], cwd=ROOT,
                                    env={**os.environ, "PYTHON_BIN": sys.executable, "AUDIO_ENV_DIR": str(environment),
                                         "PIP_INDEX_URL": "http://127.0.0.1:9", "PYTHONDONTWRITEBYTECODE": "1"},
                                    capture_output=True, text=True, timeout=15)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("Legacy Parler-TTS environment", result.stderr)
            self.assertEqual(original, {path.relative_to(environment): path.read_bytes() for path in environment.rglob("*") if path.is_file()})


if __name__ == "__main__":
    unittest.main()
