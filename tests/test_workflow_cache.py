"""Regression guard for the reviewed workflows' explicit no-cache declarations.

This checks the checked-in YAML convention, not arbitrary YAML or authorization.
GitHub validates workflow syntax and enforces cache-mode with the job token.
"""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = ("check.yml", "browser.yml", "dependency-audit.yml", "release.yml")


class WorkflowCacheTests(unittest.TestCase):
    def test_every_entry_point_explicitly_denies_shared_cache(self):
        for name in WORKFLOWS:
            with self.subTest(workflow=name):
                source = (ROOT / ".github/workflows" / name).read_text(encoding="utf-8")
                # Require the literal top-level declaration: an env variable or
                # setup-node's package-manager-cache flag is not the permission.
                declarations = re.findall(r"^cache-mode:[^\n]*$", source, re.M)
                self.assertEqual(declarations, ["cache-mode: none"])

    def test_no_job_overrides_the_workflow_with_cache_access(self):
        for name in WORKFLOWS:
            with self.subTest(workflow=name):
                source = (ROOT / ".github/workflows" / name).read_text(encoding="utf-8")
                overrides = re.findall(r"^[ \t]+cache-mode:([^\n]*)$", source, re.M)
                for value in overrides:
                    self.assertEqual(value.strip(), "none", "A job must not regain cache access")


if __name__ == "__main__":
    unittest.main()
