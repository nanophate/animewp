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
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[2]
ACCEPTED = json.loads((Path(__file__).with_name("npm-audit-accepted.json")).read_text())["accepted"]
SEVERITIES = ("info", "low", "moderate", "high", "critical")


def validate_report(data):
    """Reject incomplete/unknown audit output instead of interpreting it as clean."""
    if not isinstance(data, dict) or data.get("auditReportVersion") != 2:
        raise ValueError("expected npm audit report version 2")
    vulnerabilities = data.get("vulnerabilities")
    totals = data.get("metadata", {}).get("vulnerabilities")
    if not isinstance(vulnerabilities, dict) or not isinstance(totals, dict):
        raise ValueError("missing vulnerability report or totals")
    if any(type(totals.get(key)) is not int or totals[key] < 0 for key in (*SEVERITIES, "total")):
        raise ValueError("invalid vulnerability totals")
    if totals["total"] != len(vulnerabilities) or sum(totals[key] for key in SEVERITIES) != totals["total"]:
        raise ValueError("inconsistent vulnerability totals")
    for name, vulnerability in vulnerabilities.items():
        if not isinstance(vulnerability, dict) or vulnerability.get("name") != name:
            raise ValueError("invalid vulnerability record")
        if vulnerability.get("severity") not in SEVERITIES:
            raise ValueError(f"{name}: unknown severity")
        nodes, via = vulnerability.get("nodes"), vulnerability.get("via")
        if not isinstance(nodes, list) or not nodes or any(not isinstance(node, str) or not node for node in nodes):
            raise ValueError(f"{name}: missing affected dependency nodes")
        if not isinstance(via, list) or not via:
            raise ValueError(f"{name}: missing advisory details")
        for source in via:
            if isinstance(source, str):
                if source not in vulnerabilities:
                    raise ValueError(f"{name}: unresolved advisory dependency {source}")
            elif isinstance(source, dict):
                if (source.get("name") != name or source.get("severity") not in SEVERITIES
                        or any(not isinstance(source.get(key), str) or not source[key] for key in ("url", "title"))):
                    raise ValueError(f"{name}: invalid advisory details")
            else:
                raise ValueError(f"{name}: invalid advisory source")
    # Metavulnerabilities refer to other records; every chain must reach details.
    for name in vulnerabilities:
        pending, visited, detailed = [name], set(), False
        while pending:
            current = pending.pop()
            if current in visited:
                continue
            visited.add(current)
            for source in vulnerabilities[current]["via"]:
                if isinstance(source, dict):
                    detailed = True
                else:
                    pending.append(source)
        if not detailed:
            raise ValueError(f"{name}: advisory chain has no details")


def audit(directory, *, include_dev=True):
    # npm's offline mode can return a valid-looking empty report without asking
    # the registry. Override inherited npm config so it cannot bypass this gate.
    # Explicit includes also override omit=optional/peer from .npmrc or the
    # environment; those installed dependencies must be scanned in both modes.
    flags = ["--include=prod", "--include=optional", "--include=peer",
             "--include=dev" if include_dev else "--omit=dev"]
    result = subprocess.run(["npm", "audit", "--package-lock-only", "--ignore-scripts", "--offline=false",
                             "--audit-level=low", "--json", *flags],
                            cwd=ROOT / directory, text=True, capture_output=True)
    if result.returncode not in (0, 1):
        raise SystemExit(f"{directory}: npm audit exited {result.returncode}\n{result.stderr[-400:]}")
    try:
        data = json.loads(result.stdout)
    except ValueError:
        raise SystemExit(f"{directory}: npm audit returned no report\n{result.stderr[-400:]}")
    if isinstance(data, dict) and "error" in data:
        raise SystemExit(f"{directory}: npm audit failed: {data['error']}")
    try:
        validate_report(data)
    except (ValueError, TypeError, AttributeError) as error:
        raise SystemExit(f"{directory}: invalid npm audit report: {error}") from error
    if result.returncode == 1 and not data["vulnerabilities"]:
        raise SystemExit(f"{directory}: npm audit failed without reporting vulnerabilities")
    return data


def advisories(data):
    found = {}
    for vulnerability in data["vulnerabilities"].values():
        for via in vulnerability["via"]:
            if isinstance(via, dict):
                # Keep different packages and severities separate even if they
                # share an advisory ID; a later record must not hide a finding.
                key = (via["url"].rsplit("/", 1)[-1], via["name"], via["severity"])
                finding = found.setdefault(key, {**via, "nodes": set()})
                finding["nodes"].update(vulnerability["nodes"])
    return found


def accepted_entries():
    accepted = {}
    for entry in ACCEPTED:
        required = ("id", "package", "directory", "via_package", "review_by", "reason")
        if any(not isinstance(entry.get(key), str) or not entry[key] for key in required):
            raise SystemExit("Accepted npm advisories need an ID, package, directory, via_package, date and reason")
        if entry["id"] in accepted:
            raise SystemExit(f"Duplicate accepted npm advisory: {entry['id']}")
        datetime.date.fromisoformat(entry["review_by"])
        accepted[entry["id"]] = entry
    return accepted


class DependencyGraph:
    """Resolve the lockfile's installed dependency paths, including hoisted nodes."""

    def __init__(self, directory):
        lock = json.loads((ROOT / directory / "package-lock.json").read_text())
        self.packages = lock["packages"]
        if lock.get("lockfileVersion") not in (2, 3) or "" not in self.packages:
            raise ValueError("unsupported package-lock format")
        self.edges = {}
        for node, package in self.packages.items():
            names = set()
            for field in ("dependencies", "optionalDependencies", "peerDependencies"):
                names.update(package.get(field, {}))
            if not node:
                names.update(package.get("devDependencies", {}))
            self.edges[node] = {resolved for name in names if (resolved := self.resolve(node, name))}

    def resolve(self, parent, name):
        path = PurePosixPath(parent)
        for ancestor in (path, *path.parents):
            candidate = str(ancestor / "node_modules" / name)
            if candidate in self.packages:
                return candidate
        return None

    def reachable(self, blocked_package=None):
        pending, visited = [""], set()
        while pending:
            node = pending.pop()
            if node in visited:
                continue
            if node and node.rsplit("node_modules/", 1)[-1] == blocked_package:
                continue
            visited.add(node)
            pending.extend(self.edges[node])
        return visited

    def covers(self, finding, via_package):
        reachable = self.reachable()
        bypass = self.reachable(blocked_package=via_package)
        return all(node in reachable and node not in bypass
                   and self.packages[node].get("dev") is True
                   and node.rsplit("node_modules/", 1)[-1] == finding["name"]
                   for node in finding["nodes"])


def main():
    today = datetime.datetime.now(datetime.timezone.utc).date()
    accepted = accepted_entries()
    reported, problems = set(), []
    for directory in sys.argv[1:] or [".", "tests/serialization"]:
        directory = str(Path(directory))
        runtime = advisories(audit(directory, include_dev=False))
        for (key, _, _), via in sorted(runtime.items()):
            problems.append(f"{directory}: runtime dependency {via['name']} {via['severity']} {key}: {via['title']}")
        found = advisories(audit(directory))
        graph = DependencyGraph(directory)
        counts = {}
        for (key, _, _), via in sorted(found.items()):
            reported.add(key)
            counts[via["severity"]] = counts.get(via["severity"], 0) + 1
            if via["severity"] not in ("high", "critical"):
                continue
            entry = accepted.get(key)
            if not entry:
                problems.append(f"{directory}: new {via['severity']} advisory in a development tool: {via['name']} {key}: {via['title']}")
            elif (entry["directory"] != directory or entry["package"] != via["name"]
                  or via["url"] != f"https://github.com/advisories/{key}"
                  or not graph.covers(via, entry["via_package"])):
                problems.append(f"{directory}: advisory {key} ({via['name']}) is outside its reviewed dependency scope")
            elif datetime.date.fromisoformat(entry["review_by"]) < today:
                problems.append(f"{directory}: accepted advisory {key} ({via['name']}) passed its review date {entry['review_by']}")
            else:
                print(f"{directory}: accepted until {entry['review_by']}: {via['severity']} {via['name']} {key}")
        print(f"{directory}: development-tool advisories by severity: {counts or 'none'}")
    for key in sorted(set(accepted) - reported):
        print(f"No longer reported, remove from npm-audit-accepted.json: {key} ({accepted[key]['package']})")
    if problems:
        print("\n".join(problems), file=sys.stderr)
        raise SystemExit(1)
    print("npm audit passed: no runtime vulnerabilities; every high/critical development-tool advisory is reviewed.")


if __name__ == "__main__":
    main()
