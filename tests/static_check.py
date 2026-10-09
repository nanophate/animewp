#!/usr/bin/env python3
"""Metadata, external-reference, SVG, and common-secret checks; no dependencies."""
import hashlib
import json
import re
import sys
import struct
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from package import plugin_installation_files
from release import COMPONENTS, ReleaseError, validate_feed

EXCLUDED = {".git", ".testenv", ".claude", ".wp-env.override.json", "artifacts", "node_modules", "vendor", "__pycache__"}
# npm lockfiles list registry URLs; they are development-only and never packaged.
URL_AUDIT_EXEMPT = {"package-lock.json"}
LOCAL_WORKFLOWS = {
    "./.github/workflows/check.yml",
    "./.github/workflows/dependency-audit.yml",
    "./.github/workflows/browser.yml",
}
LICENSE_SHA256 = "e1c15e91ce22ab264ab9919b44f16f6420e80f0e44444295853e8236d0470947"
URL = re.compile(r"(?:https?://|(?<![\w:\\])//|www\.)[A-Za-z0-9][^\s<>\"']*")
SCHEMA = re.compile(r"https:" + r"/" + r"/schemas\.wp\.org/(?:wp/6\.6/theme|trunk/block)\.json\Z")
PROVIDER_ENDPOINTS = {
    "https://www.youtube-nocookie.com/embed/",
    "https://player.vimeo.com/video/",
    "www.youtube.com", "www.youtube-nocookie.com", "www.vimeo.com",
}
# The provider module, and the thumbnail importer (server-side, editor-initiated).
# Built bundles that include providers.js are allowed the same hosts below.
RUNTIME_ENDPOINTS = {
    "plugins/animewp-blocks/src/shared/providers.js": PROVIDER_ENDPOINTS,
    "plugins/animewp-blocks/includes/video-providers.php": PROVIDER_ENDPOINTS,
    "plugins/animewp-blocks/includes/youtube-poster.php": {"https://i.ytimg.com/vi/"},
}
# These PHP-only requests fetch update metadata and installation archives; they
# do not load JavaScript, CSS, fonts, or other browser resources from GitHub.
UPDATER_ENDPOINTS = {
    "https://github.com/nanophate/animewp",
    "https://raw.githubusercontent.com/nanophate/animewp/main/wp-",
    r"https://github\.com/nanophate/animewp/releases/download/v[0-9.]+/(animewp-blocks|animewp)-[0-9.]+\.zip\z#",
}
SERVER_ENDPOINTS = {
    "shared/distribution-updater.php": UPDATER_ENDPOINTS,
    "themes/animewp/inc/distribution-updater.php": UPDATER_ENDPOINTS,
    "plugins/animewp-blocks/includes/distribution-updater.php": UPDATER_ENDPOINTS,
    "themes/animewp/style.css": {"https://github.com/nanophate/animewp/tree/main/themes/animewp"},
    "plugins/animewp-blocks/animewp-blocks.php": {"https://github.com/nanophate/animewp/tree/main/plugins/animewp-blocks"},
    "scripts/release.py": {
        "https://github.com/{REPOSITORY}", "https://api.github.com", "https://uploads.github.com",
        "https://api.github.com{self.prefix}/releases/assets/{asset[",
    },
}
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
            if len(data) >= 24:
                check(struct.unpack(">II", data[16:24]) == (1200, 900), f"{rel}: preview must be 1200x900")
            return
        if path.suffix == ".mo":
            # Compiled gettext catalog: check the magic number and that its source PO is beside it.
            check(data[:4] in (b"\xde\x12\x04\x95", b"\x95\x04\x12\xde"), f"{rel}: invalid MO catalog")
            check(path.with_suffix(".po").is_file(), f"{rel}: missing source PO")
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
            if rel in COMPONENTS:
                validate_feed(obj, rel)
                if obj["status"] == "published":
                    # The feed validator checks exact owner/repo/tag/asset URLs.
                    for field in ("homepage", "download_url"):
                        audit_text = audit_text.replace(obj[field], "VALIDATED_UPDATE_ENDPOINT")
        except ReleaseError as error:
            errors.append(f"{rel}: invalid update feed ({error})")
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
    # Bundles embed their block.json, including its machine schema reference.
    if rel.startswith("plugins/animewp-blocks/build/") and path.suffix == ".js":
        audit_text = audit_text.replace("https:" + "/" + "/schemas.wp.org/trunk/block.json", "MACHINE_SCHEMA")
    # The audit implementation contains namespace patterns, never public resource links.
    if path.resolve() == Path(__file__).resolve():
        audit_text = audit_text.replace("http://www.w3.org/2000/svg", "SVG_NAMESPACE")
        for references in RUNTIME_ENDPOINTS.values():
            for reference in sorted(references, key=len, reverse=True):
                audit_text = audit_text.replace(reference, "DECLARED_RUNTIME_ENDPOINT")
    if rel in ("themes/animewp/style.css", "plugins/animewp-blocks/readme.txt"):
        audit_text = re.sub(r"^License URI: https://www\.gnu\.org/licenses/gpl-2\.0\.html$", "License URI: GPL_LICENSE", audit_text, flags=re.M)
    for match in URL.finditer(audit_text):
        # This exact, non-shipped audit report cites upstream advisory and
        # documentation links. Permit only reviewed HTTPS documentation hosts;
        # arbitrary endpoints in the report and every runtime file still fail.
        if rel == "docs/public-readiness-2026-10-08.md":
            if re.match(r"^https://(?:github\\.com|docs\\.github\\.com|registry\\.npmjs\\.org)(?:/|$)", match.group()):
                continue
        # Test fixtures intentionally exercise allowed and rejected third-party URLs.
        # They are never distributed in either installation ZIP.
        if rel.startswith("tests/") or rel == "docs/test-results.json" or path.name in URL_AUDIT_EXEMPT:
            continue
        if match.group() in RUNTIME_ENDPOINTS.get(rel, set()):
            continue
        if match.group() in SERVER_ENDPOINTS.get(rel, set()):
            continue
        if rel.startswith("plugins/animewp-blocks/build/") and match.group() in PROVIDER_ENDPOINTS:
            continue
        errors.append(f"{rel}:{audit_text[:match.start()].count(chr(10)) + 1}: external reference (value omitted)")


# The default palette stays monochrome. Color schemes are optional, editable presets
# (styles/colors) that must replace every color role and nothing else.
check({p.name for p in (ROOT / "themes/animewp/styles").glob("*.json")} == {"serif.json", "soft.json"}, "Unexpected full theme style variation")
TOKENS = json.loads((ROOT / "themes/animewp/inc/design-tokens.json").read_text())
ROLES = [item["slug"] for item in TOKENS["palette"]]
for item in TOKENS["palette"]:
    color = item["color"]
    check(color[1:3] == color[3:5] == color[5:7], f"Default color role {item['slug']} must remain monochrome")
for path in (ROOT / "themes/animewp/styles/colors").glob("*.json"):
    scheme = json.loads(path.read_text())
    check(set(scheme) <= {"$schema", "version", "title", "settings"} and set(scheme.get("settings", {})) == {"color"}, f"{path.name}: a color scheme may only set the palette")
    check([item["slug"] for item in scheme["settings"]["color"].get("palette", [])] == ROLES, f"{path.name}: must define every color role in order")

for path in (ROOT / "themes/animewp/patterns").glob("*.php"):
    for reference in re.findall(r"get_theme_file_uri\(\s*'([^']+)'", path.read_text()):
        check((ROOT / "themes/animewp" / reference).is_file(), f"{path.name}: missing packaged asset {reference}")

def header(text, key):
    match = re.search(r"^\s*(?:\*\s*)?" + re.escape(key) + r":\s*(.+?)\s*$", text, re.M)
    return match.group(1) if match else ""


def main():
    files = sorted(p for p in ROOT.rglob("*") if (p.is_file() or p.is_symlink()) and not any(part in EXCLUDED for part in p.relative_to(ROOT).parts))
    for path in files:
        audit(path)
    theme = ROOT / "themes/animewp"
    plugin = ROOT / "plugins/animewp-blocks"
    canonical_updater = ROOT / "shared/distribution-updater.php"
    for target in (theme / "inc/distribution-updater.php", plugin / "includes/distribution-updater.php"):
        check(target.is_file(), f"Missing installation file: {target.relative_to(theme if target.is_relative_to(theme) else plugin)}")
        if target.is_file():
            check(target.read_bytes() == canonical_updater.read_bytes(), f"{target.relative_to(ROOT)}: updater copy differs from shared source")
    for feed in COMPONENTS:
        check((ROOT / feed).is_file(), f"Missing update feed: {feed}")
    check(header((theme / "style.css").read_text(), "Update URI") == "https://github.com/nanophate/animewp/tree/main/themes/animewp", "Theme Update URI must identify this repository and component")
    check(header((plugin / "animewp-blocks.php").read_text(), "Update URI") == "https://github.com/nanophate/animewp/tree/main/plugins/animewp-blocks", "Plugin Update URI must identify this repository and component")
    theme_version = header((theme / "style.css").read_text(), "Version")
    plugin_version = header((plugin / "animewp-blocks.php").read_text(), "Version")
    check(theme_version == plugin_version, "Theme and plugin release versions must match")
    check((theme / "readme.txt").read_text().splitlines()[0] == f"animewp {theme_version}", "Theme readme version must match style.css")
    check(f"バージョン{plugin_version}。" in (plugin / "README.md").read_text(), "Plugin README version must match header")
    check(f"$animewp_version = '{plugin_version}';" in (plugin / "animewp-blocks.php").read_text(), "Plugin runtime cache version must match header")
    check(f"Stable tag: {plugin_version}" in (plugin / "readme.txt").read_text(), "Plugin readme.txt Stable tag must match header")
    for slug, value in (("animewp", theme_version), ("animewp-blocks", plugin_version)):
        check(f"{slug}-{value}.zip" in (ROOT / "README.md").read_text(), f"README package example must match {slug} version")
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
    # build/ must contain exactly the blocks in src/ (stale output would ship otherwise).
    source_blocks = {p.parent.name for p in (plugin / "src/blocks").glob("*/block.json")}
    built_blocks = {p.name for p in (plugin / "build/blocks").iterdir() if p.is_dir()} if (plugin / "build/blocks").is_dir() else set()
    check(source_blocks == built_blocks, f"build/blocks differs from src/blocks: {sorted(source_blocks ^ built_blocks)} (rebuild from a clean build/)")
    try:
        for required in plugin_installation_files(plugin):
            check((plugin / required).is_file(), f"Missing installation file: {required} (run npm run build)")
    except (OSError, ValueError) as error:
        check(False, f"Invalid block installation metadata: {error}")
    # npm packages are development tools only; nothing installed from npm ships.
    check(not json.loads((ROOT / "package.json").read_text()).get("dependencies"), "package.json: runtime dependencies are not allowed; use devDependencies")
    # BuildPolicyPlugin checks emitted modules. Keep the independent banner and
    # WordPress dependency checks as additional installation-package checks.
    for path in sorted((plugin / "build").rglob("*")):
        rel = path.relative_to(ROOT).as_posix()
        if path.suffix in (".js", ".css"):
            check(not re.search(r"/\*!|@license|@preserve", path.read_text(encoding="utf-8")), f"{rel}: third-party license banner (bundled library?)")
        if path.name.endswith(".asset.php"):
            listed = re.search(r"'dependencies'\s*=>\s*array\(([^)]*)\)", path.read_text(encoding="utf-8"))
            for handle in re.findall(r"'([^']+)'", listed.group(1) if listed else ""):
                check(bool(re.fullmatch(r"wp-[a-z0-9-]+|react|react-dom|react-jsx-runtime|@wordpress/[a-z0-9-]+", handle)), f"{rel}: depends on {handle}, which WordPress does not provide")
    for name in sorted(source_blocks):
        source = plugin / f"src/blocks/{name}/block.json"
        built = plugin / f"build/blocks/{name}/block.json"
        check(built.is_file(), f"Missing build for {name}: run npm run build")
        if built.is_file():
            check(json.loads(built.read_text()) == json.loads(source.read_text()), f"Stale build for {name}: run npm run build")
        obj = json.loads(source.read_text())
        check(obj.get("version") == plugin_version, f"Block metadata version must match plugin: {name}")
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
            if action.startswith("./"):
                check(action in LOCAL_WORKFLOWS and (ROOT / action).is_file(), f"{workflow.name}: unknown local workflow {action}")
            else:
                check(bool(re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_./-]+@[a-f0-9]{40}", action)), f"{workflow.name}: action must use a full commit SHA")
    if errors:
        print("\n".join(errors), file=sys.stderr)
        raise SystemExit(1)
    print(f"Static metadata, URL, SVG and common-secret audit passed ({len(files)} source files).")


if __name__ == "__main__":
    main()
