#!/usr/bin/env python3
"""Generate the monochrome base tokens with durable legacy aliases."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
THEME = ROOT / "themes/animewp"


def encoded(data):
    return json.dumps(data, ensure_ascii=False, indent=2) + "\n"


def palette(config, colors):
    result = [{"slug": slug, "name": config["labels"][slug], "color": ("var(--wp--preset--color--" + config["aliases"][slug] + "," + value + ")" if slug in config["aliases"] else value)} for slug, value in colors.items()]
    result += [{"slug": alias, "name": config["labels"][slug] + "（従来互換）", "color": colors[slug]} for slug, alias in config["aliases"].items()]
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    config = json.loads((THEME / "inc/design-tokens.json").read_text())
    theme = json.loads((THEME / "theme.json").read_text())
    theme["settings"]["color"]["palette"] = palette(config, config["colors"])
    outputs = {THEME / "theme.json": encoded(theme)}
    for path, value in outputs.items():
        if args.check:
            if not path.exists() or path.read_text() != value:
                raise SystemExit(f"Design tokens out of date: {path.relative_to(ROOT)}")
        else:
            path.write_text(value)
    print(f"Design tokens {'verified' if args.check else 'generated'}: monochrome tokens plus preserved aliases.")


if __name__ == "__main__":
    main()
