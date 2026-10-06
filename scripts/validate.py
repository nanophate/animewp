#!/usr/bin/env python3
"""Validate source syntax and repository contracts without installing WordPress.

PHP is linted with a local php binary when present, otherwise inside the
official php:8.0-cli Docker image, so no PHP install is needed on the host.
"""
import argparse
import ast
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# Webpack compiles src/ (ES modules + JSX); node --check only understands plain scripts.
NOT_PLAIN_JS = ("node_modules", "src")


def run(command):
    result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
    if result.returncode:
        print(result.stdout, end="")
        print(result.stderr, end="", file=sys.stderr)
        raise SystemExit(result.returncode)
    return result.stdout


def php_linter(skip):
    if skip:
        return None
    if shutil.which("php"):
        return "local"
    if shutil.which("docker"):
        return "docker"
    raise SystemExit("PHP lint needs php or Docker; use --skip-php only when reporting the separate PHP check")


def lint_php(mode, paths):
    if mode == "local":
        for path in paths:
            run(["php", "-l", str(path)])
        return
    relative = [str(path.relative_to(ROOT)) for path in paths]
    run(["docker", "run", "--rm", "-v", f"{ROOT}:/work:ro", "-w", "/work", "php:8.0-cli", "sh", "-eu", "-c",
         'for file in "$@"; do php -l "$file" > /dev/null; done', "lint", *relative])


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--skip-php", action="store_true", help="Explicitly skip PHP when a separate runtime performs its lint")
    parser.add_argument("--skip-build", action="store_true", help="Use the existing plugin build instead of running npm run build")
    parser.add_argument("--compare", metavar="REF", nargs="?", const="main",
                        help="Also prove saved block markup is unchanged against a git ref (default: main). Needs npm run env:start or ANIMEWP_WP_DIR")
    args = parser.parse_args()
    if not shutil.which("node"):
        raise SystemExit("Node.js is required for JavaScript syntax checks and the block build")
    if not args.skip_build:
        if not (ROOT / "node_modules").is_dir():
            raise SystemExit("Run npm ci first: the block build needs @wordpress/scripts")
        run(["npm", "run", "--silent", "build"])
    php = php_linter(args.skip_php)
    paths = [p for base in ("themes", "plugins", "scripts", "tests") for p in (ROOT / base).rglob("*")
             if p.is_file() and "node_modules" not in p.relative_to(ROOT).parts]
    counts = {"php": 0, "js": 0, "py": 0}
    php_paths = []
    for path in sorted(paths):
        if path.suffix == ".php" and php:
            php_paths.append(path)
        elif path.suffix == ".js" and not set(NOT_PLAIN_JS) & set(path.relative_to(ROOT).parts):
            run(["node", "--check", str(path)])
            counts["js"] += 1
        elif path.suffix == ".py":
            ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
            counts["py"] += 1
    if php:
        lint_php(php, php_paths)
        counts["php"] = len(php_paths)
    run([sys.executable, "scripts/design_tokens.py", "--check"])
    run([sys.executable, "scripts/assets_manifest.py", "--check"])
    run(["node", "tests/providers.test.js"])
    run(["node", "tests/editor-layout.test.js"])
    run([sys.executable, "tests/palette_contrast.py"])
    run([sys.executable, "scripts/package.py", "--check"])
    if args.compare:
        if not (ROOT / "tests/serialization/node_modules").is_dir():
            raise SystemExit("Run npm ci --prefix tests/serialization first")
        print(run(["node", "tests/serialization/compare.js", "--base-ref", args.compare]), end="")
    print(f"Source checks passed: {counts}; PHP {php or 'skipped'}; build {'existing' if args.skip_build else 'fresh'}")


if __name__ == "__main__":
    main()
