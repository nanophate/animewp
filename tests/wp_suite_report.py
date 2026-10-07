#!/usr/bin/env python3
"""Validate the result list emitted by a WordPress integration suite."""
import json
import re
import sys


def report(output):
    output = re.sub(r"\x1b\[[0-9;]*[A-Za-z]", "", output)
    # wp-env surrounds WP-CLI output with progress messages.
    text = "\n".join(line for line in output.splitlines()
                     if not line.lstrip().startswith(("ℹ", "✔")))
    start = re.search(r"(?m)^\s*[\[{]", text)
    if not start or re.search(r"(?:PHP )?(?:Fatal error|Parse error):", text):
        raise ValueError("missing result list or PHP failure")
    data = json.loads(text[start.start():])
    results = data.get("results") if isinstance(data, dict) else data
    if not isinstance(results, list) or not results:
        raise ValueError("expected a non-empty results list")
    if any(not isinstance(item, dict) or not isinstance(item.get("test"), str)
           or not item["test"] or not isinstance(item.get("pass"), bool)
           for item in results):
        raise ValueError("each result needs a test name and a boolean pass value")
    return results


def main():
    output = sys.stdin.read()
    try:
        results = report(output)
    except (ValueError, TypeError) as error:
        print(f"ERROR: {error}\n{output[-1800:]}")
        return 1
    failed = [item for item in results if not item["pass"]]
    print(f"{len(results) - len(failed)}/{len(results)} passed")
    for item in failed:
        print("    FAIL " + json.dumps(item, ensure_ascii=False))
    return int(bool(failed))


if __name__ == "__main__":
    raise SystemExit(main())
