"""Prepare isolated real-ZIP upgrade inputs; no production files or settings."""
import hashlib
import json
import os
import re
import shutil
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
override = ROOT / ".wp-env.override.json"
if override.exists():
    raise SystemExit("Refusing to overwrite an existing .wp-env.override.json; use a disposable checkout.")
OUT = ROOT / "artifacts/browser-fixtures"
OUT.mkdir(parents=True, exist_ok=True)
version = re.search(r"^Version: (\S+)$", (ROOT / "themes/animewp/style.css").read_text(), re.M).group(1)
(OUT / "current-version.txt").write_text(version + "\n")
feeds = {}
for kind, slug in (("theme", "animewp"), ("plugin", "animewp-blocks")):
    current = ROOT / "artifacts/releases" / f"{slug}-{version}.zip"
    shutil.copyfile(current, OUT / f"current-{kind}.zip")
    future = OUT / f"future-{kind}.zip"
    with zipfile.ZipFile(current) as original, zipfile.ZipFile(future, "w") as archive:
        for item in original.infolist():
            data = original.read(item.filename)
            if Path(item.filename).suffix in {".php", ".css", ".json", ".txt", ".md"}:
                data = data.replace(version.encode(), b"99.0.0")
            archive.writestr(item, data)
    feeds[kind] = {
        "schema_version": 1, "status": "published", "type": kind, "slug": slug,
        "name": "AnimeWP browser QA", "version": "99.0.0", "requires": "6.6", "requires_php": "8.0", "tested": "7.1",
        "homepage": "https://github.com/nanophate/animewp",
        "download_url": f"https://github.com/nanophate/animewp/releases/download/v99.0.0/{slug}-99.0.0.zip",
        "sha256": hashlib.sha256(future.read_bytes()).hexdigest(),
        "last_updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "sections": {"description": "Disposable browser QA package.", "changelog": "Test-only future version."},
    }
(OUT / "feeds.json").write_text(json.dumps(feeds, indent=2) + "\n")
config = json.loads((ROOT / ".wp-env.json").read_text())
# Physical WordPress plugin/theme directories are essential: upgrades cannot rename bind mounts.
config.update({"core": "WordPress/WordPress#" + os.environ.get("ANIMEWP_WP_BRANCH", "6.6-branch"),
               "phpVersion": os.environ.get("ANIMEWP_PHP_VERSION", "8.0"), "themes": [], "plugins": []})
config.setdefault("mappings", {}).update({
    "wp-content/animewp-qa": "./artifacts/browser-fixtures",
    "wp-content/mu-plugins/animewp-browser.php": "./tests/browser/fixtures/mu.php",
})
config.setdefault("env", {}).setdefault("tests", {}).setdefault("config", {})["ANIMEWP_BROWSER_QA"] = True
override.write_text(json.dumps(config, indent=2) + "\n")
print("Prepared current/future ZIPs and isolated WordPress configuration.")
