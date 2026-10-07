"""Regression tests for audit failures and the boundaries of reviewed exceptions."""
import contextlib
import copy
import importlib.util
import io
import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("npm_audit", Path(__file__).with_name("npm_audit.py"))
AUDIT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(AUDIT)
KNOWN = "GHSA-vfj7-8cjw-p6xm"


def report(findings=()):
    vulnerabilities = {}
    for name, advisory, severity in findings:
        record = vulnerabilities.setdefault(name, {
            "name": name, "severity": severity, "nodes": [f"node_modules/{name}"], "via": [],
        })
        record["via"].append({"name": name, "severity": severity, "title": "Test finding",
                              "url": f"https://github.com/advisories/{advisory}"})
    totals = dict.fromkeys(AUDIT.SEVERITIES, 0)
    for record in vulnerabilities.values():
        totals[record["severity"]] += 1
    totals["total"] = len(vulnerabilities)
    return {"auditReportVersion": 2, "vulnerabilities": vulnerabilities,
            "metadata": {"vulnerabilities": totals}}


class AuditOutputTests(unittest.TestCase):
    def run_audit(self, output, status=0):
        result = subprocess.CompletedProcess([], status, json.dumps(output), "service unavailable")
        with patch.object(AUDIT.subprocess, "run", return_value=result):
            return AUDIT.audit(".")

    def test_valid_empty_report(self):
        self.assertEqual(AUDIT.advisories(self.run_audit(report())), {})

    def test_offline_config_is_explicitly_overridden(self):
        result = subprocess.CompletedProcess([], 0, json.dumps(report()), "")
        with patch.dict("os.environ", {"npm_config_offline": "true"}), \
                patch.object(AUDIT.subprocess, "run", return_value=result) as run:
            AUDIT.audit(".")
        self.assertIn("--offline=false", run.call_args.args[0])

    def test_inherited_omit_cannot_remove_dependency_types(self):
        result = subprocess.CompletedProcess([], 0, json.dumps(report()), "")
        for include_dev in (False, True):
            for omitted in ("optional", "peer", "dev"):
                with self.subTest(include_dev=include_dev, omitted=omitted), \
                        patch.dict("os.environ", {"npm_config_omit": omitted, "npm_config_include": "dev"}), \
                        patch.object(AUDIT.subprocess, "run", return_value=result) as run:
                    AUDIT.audit(".", include_dev=include_dev)
                command = run.call_args.args[0]
                for kind in ("prod", "optional", "peer"):
                    self.assertIn(f"--include={kind}", command)
                self.assertIn("--include=dev" if include_dev else "--omit=dev", command)
                self.assertNotIn("--omit=dev" if include_dev else "--include=dev", command)

    def test_findings_exit_code_is_valid(self):
        data = report([("braces", KNOWN, "high")])
        self.assertTrue(AUDIT.advisories(self.run_audit(data, 1)))

    def test_service_or_process_failures_do_not_pass(self):
        for data, status in [({}, 2), (report(), 2), (report(), 1), ({"error": "offline"}, 1)]:
            with self.subTest(data=data, status=status), self.assertRaises(SystemExit):
                self.run_audit(data, status)

    def test_incomplete_or_unknown_reports_do_not_pass(self):
        missing_totals = report()
        del missing_totals["metadata"]
        wrong_totals = report()
        wrong_totals["metadata"]["vulnerabilities"]["total"] = 1
        unknown_version = report()
        unknown_version["auditReportVersion"] = 3
        for data in [{}, [], missing_totals, wrong_totals, unknown_version]:
            with self.subTest(data=data), self.assertRaises(SystemExit):
                self.run_audit(data)

    def test_missing_advisory_details_do_not_pass(self):
        for via in [[], ["missing-package"], ["braces"]]:
            data = report([("braces", KNOWN, "high")])
            data["vulnerabilities"]["braces"]["via"] = via
            with self.subTest(via=via), self.assertRaises(SystemExit):
                self.run_audit(data, 1)

    def test_metavulnerability_refers_to_detailed_advisory(self):
        data = report([("braces", KNOWN, "high")])
        data["vulnerabilities"]["build-tool"] = {
            "name": "build-tool", "severity": "high", "nodes": ["node_modules/build-tool"], "via": ["braces"],
        }
        data["metadata"]["vulnerabilities"].update(high=2, total=2)
        self.assertEqual(len(AUDIT.advisories(self.run_audit(data, 1))), 1)

    def test_same_id_cannot_overwrite_a_higher_severity(self):
        data = report([("braces", KNOWN, "high"), ("braces", KNOWN, "low")])
        self.assertEqual({key[2] for key in AUDIT.advisories(self.run_audit(data, 1))}, {"high", "low"})


class AcceptanceScopeTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.accepted = copy.deepcopy(AUDIT.ACCEPTED)
        for entry in self.accepted:
            entry["review_by"] = "2099-01-01"
        self.packages = {
            "": {"devDependencies": {"@wordpress/env": "1", "@wordpress/scripts": "1"}},
            "node_modules/@wordpress/env": {"dev": True, "dependencies": {"simple-git": "1"}},
            "node_modules/simple-git": {"dev": True, "dependencies": {"@simple-git/argv-parser": "1"}},
            "node_modules/@simple-git/argv-parser": {"dev": True},
            "node_modules/@wordpress/scripts": {"dev": True, "dependencies": {
                "braces": "1", "serialize-javascript": "1", "@wordpress/env": "1",
            }},
            "node_modules/braces": {"dev": True},
            "node_modules/serialize-javascript": {"dev": True},
        }

    def run_main(self, dev, runtime=None, directory="."):
        target = self.root / directory
        target.mkdir(parents=True, exist_ok=True)
        (target / "package-lock.json").write_text(json.dumps({"lockfileVersion": 3, "packages": self.packages}))
        output = io.StringIO()
        with patch.object(AUDIT, "ROOT", self.root), patch.object(AUDIT, "ACCEPTED", self.accepted), \
                patch.object(AUDIT.sys, "argv", ["npm_audit.py", directory]), \
                patch.object(AUDIT, "audit", side_effect=[runtime or report(), dev]), \
                contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
            try:
                AUDIT.main()
            except SystemExit as error:
                return error.code, output.getvalue()
        return 0, output.getvalue()

    def test_all_six_current_exceptions_keep_working(self):
        data = report([(entry["package"], entry["id"], "high") for entry in self.accepted])
        status, output = self.run_main(data)
        self.assertEqual(status, 0, output)
        self.assertEqual(output.count("accepted until"), 6)

    def test_runtime_finding_fails_even_when_accepted_and_low(self):
        data = report([("braces", KNOWN, "low")])
        status, output = self.run_main(data, runtime=data)
        self.assertEqual(status, 1, output)
        self.assertIn("runtime dependency", output)

    def test_new_high_advisory_fails(self):
        status, output = self.run_main(report([("braces", "GHSA-xxxx-yyyy-zzzz", "high")]))
        self.assertEqual(status, 1, output)
        self.assertIn("new high advisory", output)

    def test_moderate_development_finding_is_reported_only(self):
        status, output = self.run_main(report([("braces", "GHSA-xxxx-yyyy-zzzz", "moderate")]))
        self.assertEqual(status, 0, output)

    def test_exception_does_not_apply_in_another_directory(self):
        status, output = self.run_main(report([("braces", KNOWN, "high")]), directory="tests/serialization")
        self.assertEqual(status, 1, output)
        self.assertIn("outside its reviewed dependency scope", output)

    def test_exception_does_not_apply_to_another_package(self):
        self.packages["node_modules/other"] = {"dev": True}
        self.packages["node_modules/@wordpress/scripts"]["dependencies"]["other"] = "1"
        status, output = self.run_main(report([("other", KNOWN, "high")]))
        self.assertEqual(status, 1, output)

    def test_new_path_to_hoisted_package_is_not_accepted(self):
        self.packages[""]["devDependencies"]["other-tool"] = "1"
        self.packages["node_modules/other-tool"] = {"dev": True, "dependencies": {"braces": "1"}}
        status, output = self.run_main(report([("braces", KNOWN, "high")]))
        self.assertEqual(status, 1, output)

    def test_peer_dependency_path_also_needs_review(self):
        self.packages["node_modules/@wordpress/env"]["peerDependencies"] = {"braces": "1"}
        status, output = self.run_main(report([("braces", KNOWN, "high")]))
        self.assertEqual(status, 1, output)

    def test_nested_hoisted_resolution_and_optional_paths(self):
        self.packages["node_modules/@wordpress/scripts"]["dependencies"] = {"watcher": "1"}
        self.packages["node_modules/@wordpress/scripts/node_modules/watcher"] = {
            "dev": True, "optionalDependencies": {"braces": "1"},
        }
        status, output = self.run_main(report([("braces", KNOWN, "high")]))
        self.assertEqual(status, 0, output)

    def test_report_node_must_exist_in_the_reviewed_graph(self):
        data = report([("braces", KNOWN, "high")])
        data["vulnerabilities"]["braces"]["nodes"] = ["node_modules/unexpected/node_modules/braces"]
        status, output = self.run_main(data)
        self.assertEqual(status, 1, output)

    def test_expired_exception_fails(self):
        for entry in self.accepted:
            entry["review_by"] = "2000-01-01"
        status, output = self.run_main(report([("braces", KNOWN, "high")]))
        self.assertEqual(status, 1, output)
        self.assertIn("passed its review date", output)
        self.assertNotIn(f"No longer reported, remove from npm-audit-accepted.json: {KNOWN}", output)

    def test_duplicate_exception_is_rejected(self):
        self.accepted.append(self.accepted[0])
        status, _ = self.run_main(report())
        self.assertNotEqual(status, 0)


if __name__ == "__main__":
    unittest.main()
