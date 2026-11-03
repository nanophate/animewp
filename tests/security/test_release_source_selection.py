"""The reusable release checks may execute only immutable, main-derived code."""

import os
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SELECT_SOURCE = ROOT / "scripts/ci/select-verified-source.sh"


class ReleaseSourceSelectionTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="animewp-release-source-")
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name)
        self.work = root / "work"
        remote = root / "origin.git"
        self.git("init", "-b", "main", str(self.work), cwd=root)
        self.git("init", "--bare", "-b", "main", str(remote), cwd=root)
        self.git("config", "user.email", "ci@example.invalid")
        self.git("config", "user.name", "CI test")
        (self.work / "content.txt").write_text("first\n", encoding="utf-8")
        self.git("add", "content.txt")
        self.git("commit", "-m", "first main commit")
        self.old_main = self.git("rev-parse", "HEAD").stdout.strip()
        self.git("remote", "add", "origin", str(remote))
        self.git("push", "-u", "origin", "main")

        (self.work / "content.txt").write_text("second\n", encoding="utf-8")
        self.git("commit", "-am", "second main commit")
        self.latest_main = self.git("rev-parse", "HEAD").stdout.strip()
        self.git("push", "origin", "main")

        self.git("switch", "-c", "untrusted", self.old_main)
        (self.work / "untrusted.txt").write_text("not on main\n", encoding="utf-8")
        self.git("add", "untrusted.txt")
        self.git("commit", "-m", "untrusted branch commit")
        self.untrusted = self.git("rev-parse", "HEAD").stdout.strip()
        self.git("switch", "main")

    def git(self, *args, cwd=None):
        return subprocess.run(
            ["git", *args], cwd=cwd or self.work, text=True,
            capture_output=True, check=True,
        )

    def select(self, candidate):
        environment = dict(os.environ, ANIMEWP_RELEASE_SOURCE_SHA=candidate)
        return subprocess.run(
            ["bash", str(SELECT_SOURCE)], cwd=self.work,
            env=environment, text=True, capture_output=True,
        )

    def test_older_main_commit_is_allowed_for_release_recovery(self):
        result = self.select(self.old_main)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.git("rev-parse", "HEAD").stdout.strip(), self.old_main)

    def test_non_main_commit_is_rejected_without_checkout(self):
        result = self.select(self.untrusted)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("ancestor of main", result.stderr)
        self.assertEqual(self.git("rev-parse", "HEAD").stdout.strip(), self.latest_main)

    def test_ref_names_and_invalid_sha_are_rejected(self):
        for candidate in ("main", "", "A" * 40, "f" * 39, "abc\nref=evil"):
            with self.subTest(candidate=candidate):
                result = self.select(candidate)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("full lowercase commit SHA", result.stderr)
                self.assertEqual(
                    self.git("rev-parse", "HEAD").stdout.strip(),
                    self.latest_main,
                )


if __name__ == "__main__":
    unittest.main()
