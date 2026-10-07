"""The optional audio audit must fail closed on incomplete dependency evidence."""

import importlib.util
import json
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("audit_audio", Path(__file__).resolve().parents[2] / "scripts" / "audit-audio-env.py")
AUDIT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(AUDIT)


class DispatchTests(unittest.TestCase):
    def test_auditor_venv_symlink_is_preserved(self):
        with tempfile.TemporaryDirectory() as directory:
            auditor = Path(directory) / "python"
            auditor.symlink_to(sys.executable)
            output = Path(directory) / "report.json"
            with patch.object(sys, "argv", ["audit", "--environment-python", sys.executable,
                                           "--auditor-python", str(auditor), "--output", str(output)]), \
                 patch.object(AUDIT.subprocess, "run", return_value=SimpleNamespace(returncode=0)) as run:
                self.assertEqual(AUDIT.main(), 0)
            command = run.call_args.args[0]
            self.assertEqual(command[command.index("--auditor-python") + 1], str(auditor))


class AuditReportTests(unittest.TestCase):
    def validate(self, report, verified):
        inventory = {"kannada-parler-tts": "0.2.2+kb.inference.1"}
        if isinstance(report, dict) and isinstance(report.get("dependencies"), list):
            for entry in report["dependencies"]:
                if isinstance(entry, dict) and isinstance(entry.get("name"), str):
                    inventory.setdefault(AUDIT.canonical_name(entry["name"]), entry.get("version", "1"))
        return AUDIT.validate_audit_report(report, verified, inventory)

    def report(self, entry):
        return {"dependencies": [{"name": "kannada-parler-tts", "skip_reason": "local source"}, entry]}

    def test_only_verified_local_source_can_be_outside_advisory_database(self):
        self.assertEqual(self.validate(self.report({"name": "transformers", "version": "5.10.0", "vulns": []}), True), 1)

    def test_unverified_local_source_fails_even_if_scanner_recognizes_name(self):
        with self.assertRaisesRegex(ValueError, "Unaudited third-party"):
            self.validate(self.report({"name": "transformers", "vulns": []}), False)

    def test_unknown_dependency_skip_fails(self):
        with self.assertRaisesRegex(ValueError, "Unaudited third-party.*descript-audiotools"):
            self.validate(self.report({"name": "descript-audiotools", "skip_reason": "not on PyPI"}), True)

    def test_known_vulnerability_fails(self):
        with self.assertRaisesRegex(ValueError, "Known vulnerabilities.*protobuf"):
            self.validate(self.report({"name": "protobuf", "vulns": [{"id": "CVE-example"}]}), True)

    def test_missing_or_malformed_results_fail(self):
        for entry in [{"name": "torch"}, {"name": "torch", "vulns": ""}, None, {"vulns": []}]:
            with self.subTest(entry=entry), self.assertRaises(ValueError):
                self.validate(self.report(entry), True)
        for report in [None, {}, {"dependencies": {}}, {"dependencies": []}]:
            with self.subTest(report=report), self.assertRaises(ValueError):
                self.validate(report, True)

    def test_missing_or_duplicate_local_distribution_fails(self):
        third_party = {"name": "torch", "version": "1", "vulns": []}
        with self.assertRaisesRegex(ValueError, "did not cover"):
            self.validate({"dependencies": [third_party]}, True)
        report = self.report(third_party)
        report["dependencies"].append({"name": "kannada-parler-tts", "vulns": []})
        with self.assertRaisesRegex(ValueError, "Duplicate audit"):
            self.validate(report, True)

    def test_incomplete_duplicate_unexpected_and_wrong_version_results_fail(self):
        inventory = {"kannada-parler-tts": "0.2.2+kb.inference.1", "transformers": "5.10.0", "protobuf": "6.33.5"}
        base = self.report({"name": "transformers", "version": "5.10.0", "vulns": []})
        with self.assertRaisesRegex(ValueError, "did not cover"):
            AUDIT.validate_audit_report(base, True, inventory)
        base["dependencies"].append({"name": "protobuf", "version": "6.33.5", "vulns": []})
        self.assertEqual(AUDIT.validate_audit_report(base, True, inventory), 2)
        base["dependencies"][1]["version"] = "4.46.1"
        with self.assertRaisesRegex(ValueError, "version differs"):
            AUDIT.validate_audit_report(base, True, inventory)
        base["dependencies"][1]["version"] = "5.10.0"
        base["dependencies"].append({"name": "extra", "version": "1", "vulns": []})
        with self.assertRaisesRegex(ValueError, "Unexpected"):
            AUDIT.validate_audit_report(base, True, inventory)


class InstalledSourceTests(unittest.TestCase):
    def test_source_identity_and_byte_integrity_are_required(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "audio/vendor/parler-inference"
            modules = source / "parler_tts"
            modules.mkdir(parents=True)
            (source / "pyproject.toml").write_text('[project]\nname="kannada-parler-tts"\nversion="1"\n')
            (modules / "__init__.py").write_text("x = 1\n")
            installed = root / "installed/parler_tts"
            installed.mkdir(parents=True)
            (installed / "__init__.py").write_text("x = 1\n")
            identity = {"url": source.as_uri(), "dir_info": {}}
            distribution = SimpleNamespace(version="1", read_text=lambda _: json.dumps(identity),
                                           locate_file=lambda name: root / "installed" / name)
            with patch.object(AUDIT, "ROOT", root), patch.object(AUDIT.importlib.metadata, "distribution", return_value=distribution):
                AUDIT.verify_local_distribution()
                identity["url"] = (root / "unreviewed-source").as_uri()
                with self.assertRaisesRegex(ValueError, "not installed from"):
                    AUDIT.verify_local_distribution()
                identity["url"] = source.as_uri()
                (installed / "__init__.py").write_text("x = 2\n")
                with self.assertRaisesRegex(ValueError, "source differs"):
                    AUDIT.verify_local_distribution()
                (installed / "__init__.py").write_text("x = 1\n")
                (installed / "extra.py").write_text("x = 3\n")
                with self.assertRaisesRegex(ValueError, "modules differ"):
                    AUDIT.verify_local_distribution()


if __name__ == "__main__":
    unittest.main()
