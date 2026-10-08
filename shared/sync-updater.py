#!/usr/bin/env python3
"""Synchronize the dependency-free updater embedded in each distributable ZIP."""
import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "shared/distribution-updater.php"
TARGETS = (
    ROOT / "themes/animewp/inc/distribution-updater.php",
    ROOT / "plugins/animewp-blocks/includes/distribution-updater.php",
)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    source = SOURCE.read_bytes()
    stale = []
    for target in TARGETS:
        if not target.exists() or target.read_bytes() != source:
            if args.check:
                stale.append(str(target.relative_to(ROOT)))
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(source)
    if stale:
        parser.exit(1, "Updater copies differ; run python3 shared/sync-updater.py:\n" + "\n".join(stale) + "\n")
    print("Updater copies match the shared source.")

if __name__ == "__main__":
    main()
