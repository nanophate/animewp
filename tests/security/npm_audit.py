#!/usr/bin/env python3
"""npm audit with a reviewed list of accepted development-tool advisories.

Fails when:
  - anything outside devDependencies has a known vulnerability (any severity);
  - a development tool has a high or critical advisory that is not accepted
    in tests/security/npm-audit-accepted.json, or whose review date has passed;
  - npm cannot reach the audit service.
Moderate and low development-tool findings are reported only.

  python3 tests/security/npm_audit.py [directory ...]   (default: . and tests/serialization)
"""
import datetime
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ACCEPTED = json.loads((Path(__file__).with_name("npm-audit-accepted.json")).read_text())["accepted"]


def audit(directory, *flags):
    result = subprocess.run(["npm", "audit", "--package-lock-only", "--ignore-scripts", "--json", *flags],
                            cwd=ROOT / directory, text=True, capture_output=True)
    try:
        data = json.loads(result.stdout)
    except ValueError:
        raise SystemExit(f"{directory}: npm audit returned no report\n{result.stderr[-400:]}")
    if "error" in data:
        raise SystemExit(f"{directory}: npm audit failed: {data['error'].get('summary', data['error'])}")
    return data


def advisories(data):
    found = {}
    for vulnerability in data.get("vulnerabilities", {}).values():
        for via in vulnerability["via"]:
            if isinstance(via, dict):
                found[via["url"].rsplit("/", 1)[-1]] = via
    return found


def main():
    today = datetime.date.today()
    accepted = {entry["id"]: entry for entry in ACCEPTED}
    seen, problems = set(), []
    for directory in sys.argv[1:] or [".", "tests/serialization"]:
        runtime = advisories(audit(directory, "--omit=dev"))
        for key, via in sorted(runtime.items()):
            problems.append(f"{directory}: runtime dependency {via['name']} {via['severity']} {key}: {via['title']}")
        found = advisories(audit(directory, "--include=dev"))
        counts = {}
        for key, via in sorted(found.items()):
            counts[via["severity"]] = counts.get(via["severity"], 0) + 1
            if via["severity"] not in ("high", "critical"):
                continue
            entry = accepted.get(key)
            if not entry:
                problems.append(f"{directory}: new {via['severity']} advisory in a development tool: {via['name']} {key}: {via['title']}")
            elif datetime.date.fromisoformat(entry["review_by"]) < today:
                problems.append(f"{directory}: accepted advisory {key} ({via['name']}) passed its review date {entry['review_by']}")
            else:
                seen.add(key)
                print(f"{directory}: accepted until {entry['review_by']}: {via['severity']} {via['name']} {key}")
        print(f"{directory}: development-tool advisories by severity: {counts or 'none'}")
    for key in sorted(set(accepted) - seen):
        print(f"No longer reported, remove from npm-audit-accepted.json: {key} ({accepted[key]['package']})")
    if problems:
        print("\n".join(problems), file=sys.stderr)
        raise SystemExit(1)
    print("npm audit passed: no runtime vulnerabilities; every high/critical development-tool advisory is reviewed.")


if __name__ == "__main__":
    main()
