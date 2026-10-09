"""Exercise raw/peeled tag-event SHA representations at the event boundary."""
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import release
import release_automation as automation


class TagPayloadTests(unittest.TestCase):
    def test_annotated_tag_accepts_object_or_commit_but_never_an_unrelated_sha(self):
        tooling, source, annotation = "a" * 40, "b" * 40, "c" * 40
        ref = "refs/tags/v2.0.3"
        event = {"repository": {"full_name": release.REPOSITORY, "private": False},
                 "ref": ref, "created": True, "deleted": False, "forced": False}
        def git(*args):
            if args == ("rev-parse", "HEAD"):
                return tooling
            if args == ("rev-parse", "--verify", ref):
                return annotation
            raise AssertionError(args)
        with patch.object(release, "git", side_effect=git), \
                patch.object(release, "source_checkout"), \
                patch.object(release, "resolve_tag", return_value=source):
            for after in (source, annotation):
                with self.subTest(after=after):
                    result = automation.plan("push", ref, {**event, "after": after})
                    self.assertEqual(result["sha"], source)
                    self.assertEqual(result["tool_sha"], tooling)
                    self.assertEqual(result["publish"], "true")
            with self.assertRaisesRegex(release.ReleaseError, "Tag changed"):
                automation.plan("push", ref, {**event, "after": "d" * 40})

    def test_missing_or_invalid_visibility_and_repository_are_rejected_before_git(self):
        for repository in (None, [], {}, {"full_name": release.REPOSITORY},
                           {"full_name": release.REPOSITORY, "private": "false"}):
            with self.subTest(repository=repository), patch.object(release, "git") as git, \
                    self.assertRaises(release.ReleaseError):
                automation.plan("push", automation.MAIN_REF, {"repository": repository})
            git.assert_not_called()


if __name__ == "__main__":
    unittest.main()
