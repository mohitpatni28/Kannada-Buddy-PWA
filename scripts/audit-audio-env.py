#!/usr/bin/env python3
"""Audit every installed third-party audio dependency; verify our source fork separately."""

import argparse
import hashlib
import importlib.metadata
import json
import re
from pathlib import Path
import subprocess
import sys
import sysconfig
import tomllib
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
LOCAL_NAME = "kannada-parler-tts"


def verify_local_distribution() -> None:
    source = (ROOT / "audio" / "vendor" / "parler-inference").resolve()
    project = tomllib.loads((source / "pyproject.toml").read_text())["project"]
    distribution = importlib.metadata.distribution(LOCAL_NAME)
    direct = json.loads(distribution.read_text("direct_url.json") or "null")
    if not isinstance(direct, dict) or not isinstance(direct.get("url"), str):
        raise ValueError("The local inference distribution has no source installation identity")
    url = urlparse(direct["url"])
    if url.scheme != "file" or url.netloc or Path(unquote(url.path)).resolve() != source:
        raise ValueError("The inference distribution was not installed from this repository")
    if distribution.version != project["version"] or project["name"] != LOCAL_NAME:
        raise ValueError("The inference distribution identity differs from its source project")
    sources = sorted((source / "parler_tts").glob("*.py"))
    if not sources:
        raise ValueError("The inference source package is empty")
    installed_root = Path(distribution.locate_file("parler_tts"))
    if {path.name for path in installed_root.glob("*.py")} != {path.name for path in sources}:
        raise ValueError("Installed inference modules differ from repository source")
    for original in sources:
        installed = Path(distribution.locate_file(f"parler_tts/{original.name}"))
        if hashlib.sha256(installed.read_bytes()).digest() != hashlib.sha256(original.read_bytes()).digest():
            raise ValueError(f"Installed inference source differs: {original.name}")


def canonical_name(name: str) -> str:
    return re.sub(r"[-_.]+", "-", name).lower()


def installed_inventory() -> dict[str, str]:
    inventory = {}
    for distribution in importlib.metadata.distributions(path=[sysconfig.get_paths()["purelib"]]):
        name = canonical_name(distribution.metadata["Name"])
        if name in inventory:
            raise ValueError(f"Duplicate installed distribution: {name}")
        inventory[name] = distribution.version
    return inventory


def validate_audit_report(report: object, local_verified: bool, installed: dict[str, str]) -> int:
    if not isinstance(report, dict) or not isinstance(report.get("dependencies"), list):
        raise ValueError("Invalid dependency audit report")
    checked = 0
    local_count = 0
    seen = set()
    for dependency in report["dependencies"]:
        if not isinstance(dependency, dict) or not isinstance(dependency.get("name"), str):
            raise ValueError("Invalid dependency audit entry")
        name = canonical_name(dependency["name"])
        if name in seen:
            raise ValueError(f"Duplicate audit result: {name}")
        seen.add(name)
        if name not in installed:
            raise ValueError(f"Unexpected audit result: {name}")
        if "vulns" in dependency and not isinstance(dependency["vulns"], list):
            raise ValueError(f"Invalid vulnerability results: {name}")
        if "skip_reason" in dependency:
            if name != LOCAL_NAME or not local_verified or not dependency.get("skip_reason"):
                raise ValueError(f"Unaudited third-party dependency: {name}")
        elif not isinstance(dependency.get("vulns"), list):
            raise ValueError(f"Missing vulnerability results: {name}")
        if dependency.get("vulns"):
            raise ValueError(f"Known vulnerabilities remain: {name}")
        if name != LOCAL_NAME or "version" in dependency:
            if dependency.get("version") != installed[name]:
                raise ValueError(f"Audited version differs from installed version: {name}")
        if name == LOCAL_NAME:
            if not local_verified:
                raise ValueError("Local inference source was not verified")
            local_count += 1
        else:
            checked += 1
    if seen != set(installed) or local_count != 1 or checked == 0:
        raise ValueError("Audit did not cover the installed audio environment")
    return checked


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--environment-python", type=Path)
    parser.add_argument("--auditor-python", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--cache-dir", type=Path)
    args = parser.parse_args()
    if args.environment_python:
        command = [str(args.environment_python), str(Path(__file__).resolve()),
                   "--auditor-python", str(args.auditor_python.absolute()), "--output", str(args.output.resolve())]
        if args.cache_dir:
            command.extend(["--cache-dir", str(args.cache_dir.resolve())])
        return subprocess.run(command, check=False).returncode
    subprocess.run([sys.executable, "-m", "pip", "check"], check=True)
    verify_local_distribution()
    inventory = installed_inventory()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    cache = args.cache_dir or args.output.parent / "audio-audit-cache"
    result = subprocess.run([str(args.auditor_python), "-m", "pip_audit", "--path",
                             sysconfig.get_paths()["purelib"], "--format=json", "--output", str(args.output),
                             "--cache-dir", str(cache)], check=False)
    checked = validate_audit_report(json.loads(args.output.read_text()), local_verified=True, installed=inventory)
    if result.returncode != 0:
        raise ValueError(f"The vulnerability scanner failed with exit {result.returncode}")
    print(f"Audited {checked} third-party distributions: no known vulnerabilities or unaudited third-party packages.")
    print("The local inference fork was verified against repository source; it requires independent source review.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ValueError, OSError, importlib.metadata.PackageNotFoundError, subprocess.CalledProcessError) as error:
        print(f"Audio audit failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error
