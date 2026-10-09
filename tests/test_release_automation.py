"""Release trigger and same-run publication regressions; no network or real writes."""
import copy
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import urllib.error
import zipfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import release
import release_automation as automation

SOURCE = "a" * 40
STAMP = "2026-10-10T00:00:00Z"


def initial_feeds():
    return {path: {"schema_version": 1, "status": "unpublished", "type": item[0], "slug": item[1]}
            for path, item in release.COMPONENTS.items()}


def write_candidate(folder, version="2.0.3", create_tag=True):
    hashes = {}
    for _, (kind, slug, header, field) in release.COMPONENTS.items():
        archive = io.BytesIO()
        with zipfile.ZipFile(archive, "w") as output:
            output.writestr(slug + "/" + header,
                            f"{field}: Example\nDescription: Example\nVersion: {version}\n"
                            "Requires at least: 6.6\nRequires PHP: 8.0\nTested up to: 7.1\n")
            output.writestr(slug + "/readme.txt",
                            f"Stable tag: {version}\nRequires at least: 6.6\nRequires PHP: 8.0\n"
                            f"Tested up to: 7.1\n\n== Changelog ==\n= {version} =\n* Test release.\n")
            if kind == "plugin":
                output.writestr(slug + "/build/blocks/example/block.json", json.dumps({"version": version}))
        name = f"{slug}-{version}.zip"
        (folder / name).write_bytes(archive.getvalue())
        hashes[name] = release.digest(archive.getvalue())
    (folder / "SHA256SUMS").write_text("".join(f"{value}  {name}\n" for name, value in sorted(hashes.items())))
    return release.candidate(folder, "v" + version, SOURCE, create_tag)


class MemoryAPI:
    """Exercise release.publish itself, replacing only the external API boundary."""
    def __init__(self, private=False):
        self.private = private
        self.tag = None
        self.item = None
        self.feeds = initial_feeds()
        self.pending = None
        self.blobs = {}
        self.events = []
        self.fail_upload = False
        self.fail_pr = False

    def repository(self):
        return {"private": self.private}

    def main_state(self):
        return "b" * 40, "c" * 40, copy.deepcopy(self.feeds)

    def ancestor(self, source, parent):
        release.require(source == SOURCE, "Source is not on main")

    def create_tag(self, tag, source):
        if self.tag is None:
            self.events.append("tag")
            self.tag = source
        release.require(self.tag == source, "Tag creation race")

    def tag_commit(self, tag):
        return self.tag

    def find_release(self, tag):
        return self.item

    def create_draft(self, tag, source):
        self.events.append("draft")
        self.item = {"id": 1, "tag_name": tag, "draft": True, "prerelease": False,
                     "published_at": None, "body": f"<!-- animewp-source:{source} -->"}
        return self.item

    def assets(self, item):
        return [{"id": name, "name": name, "state": "uploaded"} for name in self.blobs]

    def upload(self, item, name, data):
        if self.fail_upload:
            raise release.ReleaseError("Upload interrupted")
        if name in self.blobs:
            raise AssertionError("Must not overwrite an asset")
        self.events.append("upload:" + name)
        self.blobs[name] = data
        return {"id": name, "name": name, "state": "uploaded"}

    def asset_bytes(self, item):
        return self.blobs[item["id"]]

    def publish_release(self, item):
        self.events.append("publish")
        self.item = {**item, "draft": False, "published_at": STAMP}
        return self.item

    def anonymous(self, url):
        self.events.append("anonymous")
        return self.blobs[url.rsplit("/", 1)[1]]

    def stage_feed_pr(self, parent, tree, feeds, tag, source):
        if self.fail_pr:
            raise release.ReleaseError("PR creation not permitted")
        if self.pending is None:
            self.events.append("pr")
            self.pending = copy.deepcopy(feeds)
        release.require(self.pending == feeds, "Pending PR differs")
        return release.HOMEPAGE + "/pull/999"


class EventPlanTests(unittest.TestCase):
    def setUp(self):
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        self.root = Path(folder.name)
        self.git("init", "--initial-branch=main")
        self.git("config", "user.name", "Release Test")
        self.git("config", "user.email", "test@example.invalid")
        self.git("config", "commit.gpgsign", "false")
        self.git("config", "tag.gpgsign", "false")
        for name in ("themes/animewp/style.css", "plugins/animewp-blocks/animewp-blocks.php"):
            path = self.root / name
            path.parent.mkdir(parents=True)
            path.write_text("Version: 2.0.3\n")
        self.git("add", ".")
        self.git("commit", "-m", "reviewed version bump")
        self.sha = self.git("rev-parse", "HEAD")
        self.git("update-ref", "refs/remotes/origin/main", self.sha)
        root_patch = patch.object(release, "ROOT", self.root)
        root_patch.start()
        self.addCleanup(root_patch.stop)

    def git(self, *args):
        return subprocess.check_output(["git", *args], cwd=self.root, text=True,
                                       stderr=subprocess.DEVNULL).strip()

    def event(self, ref=automation.MAIN_REF, **extra):
        return {"repository": {"full_name": release.REPOSITORY, "private": False},
                "ref": ref, "after": self.sha, "created": False, "deleted": False, "forced": False, **extra}

    def test_new_version_on_main_automatically_publishes_without_creating_ref_during_resolve(self):
        result = automation.plan("push", automation.MAIN_REF, self.event())
        self.assertEqual(result, {"tag": "v2.0.3", "sha": self.sha, "tool_sha": self.sha,
                                  "version": "2.0.3", "skip": "false", "create_tag": "true", "publish": "true"})
        self.assertEqual(self.git("tag", "--list"), "")

    def test_existing_tag_noops_for_normal_merges_and_withdrawal(self):
        self.git("tag", "v2.0.3")
        for feeds in (None, initial_feeds()):
            with self.subTest(withdrawn=feeds is not None):
                if feeds is not None:
                    for name, data in feeds.items():
                        (self.root / name).write_text(json.dumps(data))
                    self.git("add", ".")
                    self.git("commit", "-m", "withdraw both update feeds")
                    self.sha = self.git("rev-parse", "HEAD")
                    self.git("update-ref", "refs/remotes/origin/main", self.sha)
                result = automation.plan("push", automation.MAIN_REF, self.event())
                self.assertEqual((result["skip"], result["create_tag"], result["publish"]),
                                 ("true", "false", "false"))

    def test_lightweight_and_annotated_tag_push_select_tagged_not_newest_main_source(self):
        for annotated in (False, True):
            with self.subTest(annotated=annotated):
                tag = "v2.0.3" if not annotated else "v2.0.4"
                if annotated:
                    self.git("tag", "-a", tag, self.sha, "-m", "reviewed tag")
                else:
                    self.git("tag", tag, self.sha)
                ref = "refs/tags/" + tag
                after = self.git("rev-parse", ref)
                (self.root / "later.txt").write_text(tag)
                self.git("add", ".")
                self.git("commit", "-m", "newer main tooling")
                tooling = self.git("rev-parse", "HEAD")
                self.git("update-ref", "refs/remotes/origin/main", tooling)
                result = automation.plan("push", ref, self.event(ref, after=after, created=True))
                self.assertEqual(result["sha"], self.sha)
                self.assertEqual(result["tool_sha"], tooling)
                self.assertEqual((result["create_tag"], result["publish"]), ("false", "true"))

    def test_private_main_and_tag_only_stage_drafts(self):
        event = self.event(repository={"full_name": release.REPOSITORY, "private": True})
        self.assertEqual(automation.plan("push", automation.MAIN_REF, event)["publish"], "false")
        self.git("tag", "v2.0.3")
        event.update(ref="refs/tags/v2.0.3", created=True)
        self.assertEqual(automation.plan("push", event["ref"], event)["publish"], "false")

    def test_deleted_forced_mismatched_ref_and_unmerged_tag_are_rejected(self):
        self.git("tag", "v2.0.3")
        ref = "refs/tags/v2.0.3"
        event = self.event(ref, created=True)
        for extra in ({"deleted": True}, {"forced": True}, {"created": False},
                      {"after": "f" * 40}, {"ref": "refs/heads/other"},
                      {"repository": {"full_name": "other/animewp", "private": False}}):
            with self.subTest(extra=extra), self.assertRaises(release.ReleaseError):
                automation.plan("push", ref, {**event, **extra})
        self.git("checkout", "-b", "unmerged")
        (self.root / "unmerged.txt").write_text("not reviewed")
        self.git("add", ".")
        self.git("commit", "-m", "unmerged code")
        self.git("tag", "v2.0.4")
        after = self.git("rev-parse", "HEAD")
        self.git("checkout", "main")
        with self.assertRaises(release.ReleaseError):
            automation.plan("push", "refs/tags/v2.0.4", self.event("refs/tags/v2.0.4", created=True, after=after))

    def test_invalid_tag_and_branch_push_cannot_request_publication(self):
        for ref in ("refs/tags/v2.0.3-rc1", "refs/tags/latest", "refs/tags/v2.0.3\nmalicious=true", "refs/heads/dev"):
            with self.subTest(ref=ref), self.assertRaises(release.ReleaseError):
                automation.plan("push", ref, self.event(ref, created=True))
        with self.assertRaises(release.ReleaseError):
            automation.plan("pull_request", automation.MAIN_REF, self.event())
        with self.assertRaises(release.ReleaseError):
            automation.plan("push", automation.MAIN_REF, self.event(after="f" * 40))

    def test_manual_existing_tag_recovery_requires_main_and_explicit_publish(self):
        self.git("tag", "v2.0.2", self.sha)
        for flag, expected in ((None, "false"), (False, "false"), ("false", "false"), (True, "true"), ("true", "true")):
            inputs = {"tag": "v2.0.2"}
            if flag is not None:
                inputs["publish"] = flag
            result = automation.plan("workflow_dispatch", automation.MAIN_REF, self.event(inputs=inputs))
            self.assertEqual(result["publish"], expected)
            self.assertEqual(result["sha"], self.sha)
            self.assertEqual(result["create_tag"], "false")
        with self.assertRaises(release.ReleaseError):
            automation.plan("workflow_dispatch", "refs/heads/dev", self.event(inputs={"tag": "v2.0.2"}))
        with self.assertRaises(release.ReleaseError):
            automation.plan("workflow_dispatch", automation.MAIN_REF, self.event(inputs={"tag": "v2.0.2", "publish": "yes"}))

    def test_actual_resolve_cli_writes_safe_outputs_and_invalid_event_writes_nothing(self):
        event_file = self.root / "event.json"
        output = self.root / "outputs"
        event_file.write_text(json.dumps(self.event()))
        with patch.dict("os.environ", {"GITHUB_EVENT_NAME": "push", "GITHUB_REF": automation.MAIN_REF,
                                       "GITHUB_EVENT_PATH": str(event_file)}), \
                patch.object(sys, "argv", ["release_automation.py", "resolve", "--github-output", str(output)]), \
                patch("sys.stdout", new=io.StringIO()):
            automation.main()
            values = dict(line.split("=", 1) for line in output.read_text().splitlines())
            self.assertEqual(values["publish"], "true")
            self.assertEqual(values["tool_sha"], self.sha)
            previous = output.read_text()
            event_file.write_text(json.dumps(self.event(deleted=True)))
            with self.assertRaises(release.ReleaseError):
                automation.main()
            self.assertEqual(output.read_text(), previous)


class SameRunPublicationTests(unittest.TestCase):
    def setUp(self):
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        self.folder = Path(folder.name)
        self.data = write_candidate(self.folder)
        self.api = MemoryAPI()

    def run_publish(self, live=True, **kwargs):
        with patch("sys.stdout", new=io.StringIO()):
            return automation.publish_candidate(self.api, self.folder, self.data, live,
                                                kwargs.get("anonymous", self.api.anonymous))

    def test_automatic_tag_continues_to_publication_and_pr_in_one_call(self):
        before = copy.deepcopy(self.data)
        self.assertEqual(self.run_publish(), "pending")
        self.assertTrue(self.data["create_tag"])
        self.assertEqual(self.data, before, "Keep the immutable candidate unchanged")
        self.assertEqual(self.api.events.count("tag"), 1)
        self.assertEqual(self.api.events.count("draft"), 1)
        self.assertEqual(self.api.events.count("publish"), 1)
        self.assertEqual(self.api.events.count("anonymous"), 2)
        self.assertEqual(self.api.events.count("pr"), 1)
        self.assertEqual(self.api.feeds, initial_feeds(), "No direct main update")
        self.assertEqual(set(self.api.pending), set(release.COMPONENTS))
        self.assertLess(self.api.events.index("tag"), self.api.events.index("draft"))
        self.assertLess(self.api.events.index("publish"), self.api.events.index("anonymous"))
        self.assertLess(self.api.events.index("anonymous"), self.api.events.index("pr"))

    def test_retry_reuses_tag_assets_and_pr_then_noops_after_reviewed_merge(self):
        self.assertEqual(self.run_publish(), "pending")
        self.assertEqual(self.run_publish(), "pending")
        self.assertEqual(self.api.events.count("tag"), 1)
        self.assertEqual(self.api.events.count("publish"), 1)
        self.assertEqual(self.api.events.count("pr"), 1)
        self.assertEqual(len([event for event in self.api.events if event.startswith("upload:")]), 3)
        self.api.feeds = copy.deepcopy(self.api.pending)
        self.assertEqual(self.run_publish(), "unchanged")

    def test_private_stays_draft_even_when_automatic_publication_was_requested(self):
        self.api.private = True
        self.assertEqual(self.run_publish(), "draft")
        self.assertNotIn("publish", self.api.events)
        self.assertNotIn("pr", self.api.events)
        self.assertEqual(self.api.feeds, initial_feeds())

    def test_manual_false_and_existing_tag_publication_are_preserved(self):
        self.assertEqual(self.run_publish(live=False), "draft")
        self.assertNotIn("publish", self.api.events)
        self.data = {**self.data, "create_tag": False}
        self.assertEqual(self.run_publish(), "pending")
        self.assertEqual(self.api.events.count("tag"), 1)

    def test_rollback_and_same_version_mutation_stop_before_creating_any_tag(self):
        newer = write_candidate(self.folder, "2.0.4")
        self.api.feeds = release.final_feeds(newer, STAMP)
        with self.assertRaisesRegex(release.ReleaseError, "roll live feeds back"):
            self.run_publish()
        self.assertIsNone(self.api.tag)
        self.assertEqual(self.api.events, [])
        self.api.feeds = release.final_feeds(self.data, STAMP)
        self.api.feeds["wp-theme.json"]["sha256"] = "f" * 64
        with self.assertRaises(release.ReleaseError):
            self.run_publish()
        self.assertEqual(self.api.events, [])

    def test_upload_failure_cannot_publish_and_resumes_same_tag(self):
        self.api.fail_upload = True
        with self.assertRaisesRegex(release.ReleaseError, "Upload interrupted"):
            self.run_publish()
        self.assertNotIn("publish", self.api.events)
        self.assertEqual(self.api.feeds, initial_feeds())
        self.api.fail_upload = False
        self.assertEqual(self.run_publish(), "pending")
        self.assertEqual(self.api.events.count("tag"), 1)

    def test_bad_anonymous_download_and_pr_permission_failure_never_advance_feeds(self):
        with self.assertRaisesRegex(release.ReleaseError, "Anonymous download hash mismatch"):
            self.run_publish(anonymous=lambda _: b"not the ZIP")
        self.assertIsNone(self.api.pending)
        self.assertEqual(self.api.feeds, initial_feeds())
        self.api.fail_pr = True
        with self.assertRaisesRegex(release.ReleaseError, "feed PR is not ready"):
            self.run_publish()
        self.assertEqual(self.api.feeds, initial_feeds())
        self.api.fail_pr = False
        self.assertEqual(self.run_publish(), "pending")

    def test_tag_movement_and_visibility_change_between_stages_are_rechecked(self):
        real_publish = release.publish
        for change, expected in (("tag", "error"), ("private", "draft")):
            with self.subTest(change=change):
                self.api = MemoryAPI()
                def switch(api, artifacts, data, live, anonymous):
                    result = real_publish(api, artifacts, data, live, anonymous)
                    if data["create_tag"]:
                        if change == "tag":
                            api.tag = "f" * 40
                        else:
                            api.private = True
                    return result
                with patch.object(release, "publish", side_effect=switch):
                    if expected == "error":
                        with self.assertRaises(release.ReleaseError):
                            self.run_publish()
                    else:
                        self.assertEqual(self.run_publish(), expected)
                self.assertNotIn("publish", self.api.events)
                self.assertIsNone(self.api.pending)

    def test_network_failure_preserves_feeds(self):
        def offline(_):
            raise urllib.error.URLError("offline")
        with patch.object(release.time, "sleep"), self.assertRaises(urllib.error.URLError):
            self.run_publish(anonymous=offline)
        self.assertEqual(self.api.feeds, initial_feeds())
        self.assertIsNone(self.api.pending)


class WorkflowWiringTests(unittest.TestCase):
    def test_auto_policy_output_drives_final_job_and_manual_recovery_stays_opt_in(self):
        text = (ROOT / ".github/workflows/release.yml").read_text()
        self.assertIn("branches: [main]", text)
        self.assertIn("tags: ['v*']", text)
        self.assertIn("!github.event.deleted", text)
        self.assertIn("publish: ${{ steps.source.outputs.publish }}", text)
        self.assertIn("PUBLISH: ${{ needs.resolve.outputs.publish }}", text)
        self.assertIn('python3 scripts/release_automation.py resolve --github-output "$GITHUB_OUTPUT"', text)
        self.assertIn('python3 scripts/release_automation.py publish --candidate artifacts/release-candidate --publish "$PUBLISH"', text)
        self.assertIn("ref: ${{ needs.resolve.outputs.tool_sha }}", text)
        self.assertIn("ref: ${{ needs.resolve.outputs.sha }}", text)
        self.assertIn("default: false", text)
        self.assertIn("cancel-in-progress: false", text)
        self.assertIn("needs: [resolve, source-checks, dependency-audit, browser-checks]", text)
        self.assertIn("needs: [resolve, package]", text)
        self.assertNotIn("actions: write", text)
        self.assertNotIn("secrets.", text)
        self.assertNotIn("pull_request_target", text)


if __name__ == "__main__":
    unittest.main()
