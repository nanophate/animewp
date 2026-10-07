"""Regression tests for failed or malformed WordPress suite output."""
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

from wp_suite_report import report

ROOT = Path(__file__).resolve().parents[1]
PASSED = [{"test": "keeps existing content", "pass": True}]


class WordPressReportTests(unittest.TestCase):
    def test_wp_env_progress_and_warning_before_json(self):
        text = "\x1b[32mℹ Starting tests-cli.\x1b[0m\nWarning: optional checker notice\n"
        text += json.dumps(PASSED) + "\n✔ Ran wp eval-file.\n"
        self.assertEqual(report(text), PASSED)

    def test_explicit_results_object(self):
        self.assertEqual(report(json.dumps({"wordpress": "6.6", "results": PASSED})), PASSED)

    def test_invalid_or_empty_reports_cannot_pass(self):
        for data in ({}, {"error": "failed"}, [], {"results": []}, {"other": PASSED},
                     [{"test": "false string", "pass": "false"}],
                     [{"test": "numeric status", "pass": 1}], [{"pass": True}]):
            with self.subTest(data=data), self.assertRaises(ValueError):
                report(json.dumps(data))

    def test_php_fatal_and_trailing_failure_cannot_pass(self):
        for text in ("PHP Fatal error: missing function\n" + json.dumps(PASSED),
                     json.dumps(PASSED) + "\nUnexpected failure", "not JSON"):
            with self.subTest(text=text), self.assertRaises(ValueError):
                report(text)

    def test_report_cli_fails_on_failed_assertion(self):
        result = subprocess.run(["python3", "tests/wp_suite_report.py"], cwd=ROOT,
                                input=json.dumps([{"test": "assertion", "pass": False}]),
                                text=True, capture_output=True)
        self.assertEqual(result.returncode, 1)
        self.assertIn("FAIL", result.stdout)

    def test_wrapper_keeps_command_failures_and_rejects_bad_reports(self):
        stub = """#!/usr/bin/env python3
import json, os, sys
args = sys.argv[1:]
if args[:4] != ['wp-env', 'run', 'tests-cli', '--']:
    raise SystemExit(91)
if 'activate' in args:
    raise SystemExit(int(os.environ.get('ACTIVATE_EXIT', '0')))
print(os.environ['SUITE_REPORT'])
raise SystemExit(int(os.environ.get('SUITE_EXIT', '0')))
"""
        with tempfile.TemporaryDirectory(prefix="animewp-suite-tests-") as tmp:
            npx = Path(tmp) / "npx"
            npx.write_text(stub)
            npx.chmod(0o755)
            scenarios = [
                (json.dumps(PASSED), "0", "0", 0),
                (json.dumps(PASSED), "42", "0", 1),
                ("{}", "0", "0", 1),
                ("[]", "0", "0", 1),
                (json.dumps([{"test": "denial", "pass": False}]), "0", "0", 1),
                (json.dumps(PASSED), "0", "42", 42),
            ]
            for payload, exit_code, activate_exit, expected in scenarios:
                with self.subTest(payload=payload, exit_code=exit_code, activate_exit=activate_exit):
                    env = {**os.environ, "PATH": tmp + os.pathsep + os.environ["PATH"],
                           "SUITE_REPORT": payload, "SUITE_EXIT": exit_code, "ACTIVATE_EXIT": activate_exit}
                    result = subprocess.run(["sh", "tests/run-wp-suites.sh"], cwd=ROOT,
                                            env=env, text=True, capture_output=True)
                    self.assertEqual(result.returncode, expected, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
