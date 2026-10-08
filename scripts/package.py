#!/usr/bin/env python3
"""Build deterministic, separate WordPress installation archives."""
import argparse
import hashlib
import io
import json
import posixpath
import re
import stat
import subprocess
import sys
import zipfile
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
PACKAGES = (
    ("animewp", ROOT / "themes/animewp", "style.css"),
    ("animewp-blocks", ROOT / "plugins/animewp-blocks", "animewp-blocks.php"),
)
ALLOWED_SUFFIXES = {".php", ".css", ".scss", ".js", ".json", ".html", ".svg", ".md", ".txt", ".po", ".pot", ".mo"}
ZIP_DATE = (1980, 1, 1, 0, 0, 0)
MOTION_FILES = (
    "editor.js", "editor.asset.php", "view.js", "view.asset.php",
    "style.js", "style.asset.php", "style-style.css",
)


def local_file_references(value):
    """Read both scalar and array file references, including future metadata fields."""
    if isinstance(value, str) and value.startswith("file:"):
        yield value[5:]
    elif isinstance(value, dict):
        for child in value.values():
            yield from local_file_references(child)
    elif isinstance(value, list):
        for child in value:
            yield from local_file_references(child)


def plugin_installation_files(source):
    """Required ZIP entries from source metadata, plus non-block Motion entries."""
    required = {"languages/animewp-blocks-ja.mo", "languages/animewp-blocks-ja.po"}
    required.update(f"build/motion/{name}" for name in MOTION_FILES)
    for metadata in sorted((source / "src/blocks").glob("*/block.json")):
        built = PurePosixPath("build/blocks") / metadata.parent.name / "block.json"
        required.add(built.as_posix())
        for reference in local_file_references(json.loads(metadata.read_text(encoding="utf-8"))):
            target = PurePosixPath(posixpath.normpath((built.parent / reference).as_posix()))
            if not reference or "\\" in reference or "\0" in reference or not target.parts or target.is_absolute() or target.parts[0] == "..":
                raise ValueError(f"Unsafe block file reference in {metadata.name}: {reference!r}")
            required.add(target.as_posix())
            if target.suffix == ".js":
                required.add(target.with_suffix(".asset.php").as_posix())
    return sorted(required)


def version(source, header):
    match = re.search(r"^\s*(?:\*\s*)?Version:\s*([0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?)\s*$", (source / header).read_text(), re.M)
    if not match:
        raise ValueError(f"Missing or invalid Version header: {source / header}")
    return match.group(1)


def build_archive(slug, source):
    files = sorted(source.rglob("*"), key=lambda p: p.relative_to(source).as_posix())
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_STORED) as archive:
        for path in files:
            relative = path.relative_to(source)
            if path.is_symlink():
                raise ValueError(f"Symlink prohibited: {path}")
            if any(part.startswith(".") for part in relative.parts):
                raise ValueError(f"Hidden package entry prohibited: {path}")
            if path.is_dir():
                continue
            theme_preview = slug == "animewp" and relative.as_posix() == "screenshot.png"
            if not path.is_file() or (path.name != "LICENSE" and path.suffix not in ALLOWED_SUFFIXES and not theme_preview):
                raise ValueError(f"Unexpected package entry: {path}")
            info = zipfile.ZipInfo(f"{slug}/{relative.as_posix()}", ZIP_DATE)
            info.create_system = 3
            info.external_attr = (stat.S_IFREG | 0o644) << 16
            info.compress_type = zipfile.ZIP_STORED
            archive.writestr(info, path.read_bytes())
    return buffer.getvalue()


def inspect_archive(data, slug, required):
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        names = archive.namelist()
        if not names or len(names) != len(set(names)) or names != sorted(names):
            raise ValueError("Empty, duplicate, or unsorted archive entries")
        for info in archive.infolist():
            if not info.filename.startswith(slug + "/") or ".." in info.filename.split("/"):
                raise ValueError("Archive must have one safe folder root")
            if info.date_time != ZIP_DATE or (info.external_attr >> 16) != (stat.S_IFREG | 0o644):
                raise ValueError("Unstable archive metadata")
        for name in required:
            if f"{slug}/{name}" not in names:
                raise ValueError(f"Missing installation file: {name}")
        if archive.testzip() is not None:
            raise ValueError("Archive CRC check failed")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Build twice in memory and check; write nothing")
    parser.add_argument("--output", type=Path, default=ROOT / "artifacts/releases")
    args = parser.parse_args()
    subprocess.run([sys.executable, str(ROOT / "tests/static_check.py")], check=True)
    outputs = {}
    for slug, source, header in PACKAGES:
        data = build_archive(slug, source)
        if data != build_archive(slug, source):
            raise ValueError("Source changed during packaging, or archive is not reproducible")
        required = [header, "LICENSE"]
        if slug == "animewp":
            required += ["theme.json", "templates/index.html"]
        else:
            required += plugin_installation_files(source)
        inspect_archive(data, slug, required)
        outputs[f"{slug}-{version(source, header)}.zip"] = data
    manifest = "".join(f"{hashlib.sha256(data).hexdigest()}  {name}\n" for name, data in sorted(outputs.items()))
    if not args.check:
        args.output.mkdir(parents=True, exist_ok=True)
        for name, data in outputs.items():
            (args.output / name).write_bytes(data)
        (args.output / "SHA256SUMS").write_text(manifest, encoding="ascii")
    print("Reproducible package check passed." if args.check else f"Packages written to {args.output}")
    print(manifest, end="")


if __name__ == "__main__":
    main()
