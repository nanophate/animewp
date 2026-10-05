#!/usr/bin/env python3
"""Validate source syntax and repository contracts without installing WordPress."""
import argparse
import ast
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def run(command):
    result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
    if result.returncode:
        print(result.stdout, end="")
        print(result.stderr, end="", file=sys.stderr)
        raise SystemExit(result.returncode)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skip-php", action="store_true", help="Explicitly skip PHP when a separate runtime performs its lint")
    args = parser.parse_args()
    paths = [p for base in ("themes", "plugins", "scripts", "tests") for p in (ROOT / base).rglob("*") if p.is_file()]
    if not shutil.which("node"):
        raise SystemExit("Node.js is required for JavaScript syntax checks")
    if not args.skip_php and not shutil.which("php"):
        raise SystemExit("PHP is required; use --skip-php only when reporting the separate PHP check")
    counts = {"php": 0, "js": 0, "py": 0}
    for path in sorted(paths):
        if path.suffix == ".php" and not args.skip_php:
            run(["php", "-l", str(path)])
            counts["php"] += 1
        elif path.suffix == ".js":
            run(["node", "--check", str(path)])
            counts["js"] += 1
        elif path.suffix == ".py":
            ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
            counts["py"] += 1
    run([sys.executable, "scripts/design_tokens.py", "--check"])
    run([sys.executable, "scripts/assets_manifest.py", "--check"])
    run(["node", "tests/providers.test.js"])
    run(["node", "tests/editor-layout.test.js"])
    run([sys.executable, "tests/palette_contrast.py"])
    run([sys.executable, "scripts/package.py", "--check"])
    print(f"Source checks passed: {counts}; PHP skipped={args.skip_php}")


if __name__ == "__main__":
    main()
