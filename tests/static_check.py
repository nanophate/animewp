#!/usr/bin/env python3
"""Metadata, external-reference, SVG, and common-secret checks; no dependencies."""
import hashlib
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXCLUDED = {".git", ".testenv", "artifacts", "node_modules", "vendor", "__pycache__"}
LICENSE_SHA256 = "e1c15e91ce22ab264ab9919b44f16f6420e80f0e44444295853e8236d0470947"
URL = re.compile(r"(?:https?://|(?<![\w:])//|www\.)[A-Za-z0-9][^\s<>\"']*")
SCHEMA = re.compile(r"https:" + r"/" + r"/schemas\.wp\.org/(?:wp/6\.6/theme|trunk/block)\.json\Z")
SECRET_PATTERNS = (
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    re.compile(r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b"),
    re.compile(r"\bgh[pousr]_[A-Za-z0-9]{30,}\b"),
    re.compile(r"\bgithub_pat_[A-Za-z0-9_]{30,}\b"),
    re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{20,}\b"),
    re.compile(r"(?i)(?:api[_-]?key|client[_-]?secret|access[_-]?token|password)\s*[=:]\s*['\"][A-Za-z0-9/+_=.-]{16,}['\"]"),
)
errors = []


def check(condition, message):
    if not condition:
        errors.append(message)


def object_unique(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"Duplicate JSON key: {key}")
        result[key] = value
    return result


def audit(path):
    rel = path.relative_to(ROOT).as_posix()
    check(not path.is_symlink(), f"{rel}: symlinks are prohibited")
    check(not (path.name.startswith(".env") or path.suffix in {".pem", ".key", ".p12", ".pfx"}), f"{rel}: secret-bearing filename")
    try:
        data = path.read_bytes()
        if rel == "themes/animewp/screenshot.png":
            check(data.startswith(b"\x89PNG\r\n\x1a\n") and len(data) >= 33 and data[12:16] == b"IHDR", f"{rel}: invalid PNG signature/header")
            return
        text = data.decode("utf-8")
    except (UnicodeDecodeError, OSError):
        errors.append(f"{rel}: unreadable or unaudited binary file")
        return
    for pattern in SECRET_PATTERNS:
        match = pattern.search(text)
        if match:
            errors.append(f"{rel}:{text[:match.start()].count(chr(10)) + 1}: potential embedded secret (value omitted)")
    if path.name == "LICENSE":
        check(hashlib.sha256(data).hexdigest() == LICENSE_SHA256, f"{rel}: GPL text differs from reviewed full license")
        return
    audit_text = text
    if path.suffix == ".json":
        try:
            obj = json.loads(text, object_pairs_hook=object_unique)
            schema = obj.get("$schema") if isinstance(obj, dict) else None
            if schema:
                check(isinstance(schema, str) and bool(SCHEMA.fullmatch(schema)), f"{rel}: unexpected machine schema")
                if isinstance(schema, str) and SCHEMA.fullmatch(schema):
                    audit_text = audit_text.replace(schema, "MACHINE_SCHEMA")
        except (ValueError, TypeError) as error:
            errors.append(f"{rel}: invalid JSON ({error})")
    if path.suffix == ".svg":
        try:
            root = ET.fromstring(text)
            check(root.tag == "{http://www.w3.org/2000/svg}svg", f"{rel}: invalid SVG root")
            for node in root.iter():
                check(node.tag.split("}")[-1] not in {"script", "foreignObject"}, f"{rel}: active SVG content")
                for key, value in node.attrib.items():
                    local = key.split("}")[-1]
                    check(not local.lower().startswith("on"), f"{rel}: SVG event attribute")
                    if local in {"href", "src"}:
                        check(value.startswith("#"), f"{rel}: nonlocal SVG resource")
            audit_text = re.sub(r'xmlns="http:' + r'/' + r'/www\.w3\.org/2000/svg"', 'xmlns="SVG_NAMESPACE"', audit_text)
        except ET.ParseError:
            errors.append(f"{rel}: invalid SVG/XML")
    # The audit implementation contains namespace patterns, never public resource links.
    if path.resolve() == Path(__file__).resolve():
        audit_text = audit_text.replace("http://www.w3.org/2000/svg", "SVG_NAMESPACE")
    for match in URL.finditer(audit_text):
        errors.append(f"{rel}:{audit_text[:match.start()].count(chr(10)) + 1}: external reference (value omitted)")


def header(text, key):
    match = re.search(r"^\s*(?:\*\s*)?" + re.escape(key) + r":\s*(.+?)\s*$", text, re.M)
    return match.group(1) if match else ""


def main():
    files = sorted(p for p in ROOT.rglob("*") if (p.is_file() or p.is_symlink()) and not any(part in EXCLUDED for part in p.relative_to(ROOT).parts))
    for path in files:
        audit(path)
    theme = ROOT / "themes/animewp"
    plugin = ROOT / "plugins/animewp-blocks"
    for path, field, expected in ((theme / "style.css", "Theme Name", "animewp"), (plugin / "animewp-blocks.php", "Plugin Name", "AnimeWP Blocks")):
        text = path.read_text(encoding="utf-8")
        check(header(text, field) == expected, f"{path.name}: incorrect package name")
        check(bool(re.fullmatch(r"\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?", header(text, "Version"))), f"{path.name}: invalid version")
        check(header(text, "Requires at least") == "6.6", f"{path.name}: minimum WordPress must be explicit")
        check(header(text, "Requires PHP") == "8.0", f"{path.name}: minimum PHP must be explicit")
    check(not header((theme / "style.css").read_text(), "Template"), "Theme must not require a parent theme")
    check(not (theme / "templates/front-page.html").exists(), "Theme must preserve the existing front-page selection")
    theme_json = json.loads((theme / "theme.json").read_text())
    check(theme_json.get("version") == 3, "theme.json must use version 3")
    for name in ("index", "home", "page", "single", "singular", "archive", "search", "404"):
        check((theme / f"templates/{name}.html").is_file(), f"Missing template: {name}")
    for template in theme_json.get("customTemplates", []):
        check((theme / f"templates/{template['name']}.html").is_file(), f"Missing custom template: {template['name']}")
    for name in ("panel", "media", "video", "text-group"):
        obj = json.loads((plugin / f"blocks/{name}/block.json").read_text())
        check(obj.get("name") == f"animewp/{name}" and obj.get("apiVersion") == 3, f"Invalid block identity/API: {name}")
        for key, attr in obj.get("attributes", {}).items():
            if "default" not in attr:
                continue
            value = attr["default"]
            types = {"string": str, "boolean": bool, "number": (int, float), "array": list, "object": dict}
            valid_type = attr.get("type") in types and isinstance(value, types[attr["type"]])
            check(valid_type and not (attr.get("type") == "number" and isinstance(value, bool)), f"{name}.{key}: default/type mismatch")
            check("enum" not in attr or value in attr["enum"], f"{name}.{key}: default/enum mismatch")
    for workflow in (ROOT / ".github/workflows").glob("*.yml"):
        for action in re.findall(r"uses:\s*([^\s#]+)", workflow.read_text()):
            check(bool(re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_./-]+@[a-f0-9]{40}", action)), f"{workflow.name}: action must use a full commit SHA")
    if errors:
        print("\n".join(errors), file=sys.stderr)
        raise SystemExit(1)
    print(f"Static metadata, URL, SVG and common-secret audit passed ({len(files)} source files).")


if __name__ == "__main__":
    main()
