"""Release transaction regressions: no network calls or repository mutations."""
import copy
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import urllib.error
import zipfile

SPEC = importlib.util.spec_from_file_location("release", Path(__file__).resolve().parents[1] / "scripts/release.py")
release = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(release)
SHA = "a" * 40
TIMESTAMP = "2026-10-08T12:34:56Z"


def initial_feeds():
    return {path: {"schema_version": 1, "status": "unpublished", "type": values[0], "slug": values[1]}
            for path, values in release.COMPONENTS.items()}


def archive(kind, version="2.0.1", extra=None):
    slug = "animewp" if kind == "theme" else "animewp-blocks"
    field = "Theme Name" if kind == "theme" else "Plugin Name"
    header = "style.css" if kind == "theme" else "animewp-blocks.php"
    entries = {
        slug + "/" + header: f"{field}: Example\nDescription: Safe <script>text</script>\nVersion: {version}\nRequires at least: 6.6\nRequires PHP: 8.0\nTested up to: 7.1\n",
        slug + "/readme.txt": f"Stable tag: {version}\nRequires at least: 6.6\nRequires PHP: 8.0\nTested up to: 7.1\n\n== Changelog ==\n= {version} =\n* Fixed <markup>.\n\n= 2.0.0 =\nOlder changes.\n",
    }
    if kind == "plugin":
        entries[slug + "/build/blocks/example/block.json"] = json.dumps({"version": version})
    entries.update(extra or {})
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w") as zipped:
        for name, value in entries.items():
            zipped.writestr(zipfile.ZipInfo(name, (1980, 1, 1, 0, 0, 0)), value)
    return output.getvalue()


def artifacts(path, version="2.0.1", create_tag=False):
    hashes = {}
    for kind, slug in (("theme", "animewp"), ("plugin", "animewp-blocks")):
        name = f"{slug}-{version}.zip"
        data = archive(kind, version)
        (path / name).write_bytes(data)
        hashes[name] = release.digest(data)
    (path / "SHA256SUMS").write_text("".join(f"{value}  {name}\n" for name, value in sorted(hashes.items())))
    return release.candidate(path, "v" + version, SHA, create_tag)


class FakeGitHub:
    def __init__(self, private=True):
        self.private = private
        self.feeds = initial_feeds()
        self.release = None
        self.tag = SHA
        self.blobs = {}
        self.events = []
        self.commits = []
        self.fail_commit = False

    def repository(self):
        return {"private": self.private}

    def main_state(self):
        return "b" * 40, "c" * 40, copy.deepcopy(self.feeds)

    def ancestor(self, source, main):
        self.events.append("ancestor")
        if source != SHA:
            raise release.ReleaseError("not an ancestor")

    def tag_commit(self, tag):
        return self.tag

    def create_tag(self, tag, source):
        if self.tag is not None:
            if self.tag != source:
                raise release.ReleaseError("tag race")
            return
        self.events.append("create_tag")
        self.tag = source

    def find_release(self, tag):
        return self.release

    def create_draft(self, tag, source):
        self.events.append("draft")
        self.release = {"id": 1, "tag_name": tag, "draft": True, "prerelease": False,
                        "body": f"<!-- animewp-source:{source} -->", "published_at": None}
        return self.release

    def assets(self, item):
        return [{"id": name, "name": name, "state": "uploaded"} for name in self.blobs]

    def upload(self, item, name, data):
        self.events.append("upload:" + name)
        if name in self.blobs:
            raise AssertionError("Assets must never be overwritten")
        self.blobs[name] = data
        return {"id": name, "name": name, "state": "uploaded"}

    def asset_bytes(self, asset):
        return self.blobs[asset["id"]]

    def publish_release(self, item):
        self.events.append("publish")
        self.release = {**item, "draft": False, "published_at": TIMESTAMP}
        return self.release

    def commit_feeds(self, parent, tree, feeds):
        self.events.append("commit")
        if self.fail_commit:
            raise release.ReleaseError("branch protection or CAS conflict")
        self.commits.append(copy.deepcopy(feeds))
        self.feeds = copy.deepcopy(feeds)
        return "d" * 40

    def anonymous(self, url):
        self.events.append("anonymous:" + url.rsplit("/", 1)[1])
        return self.blobs[url.rsplit("/", 1)[1]]


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name)
        self.data = artifacts(self.path)

    def run_publish(self, api, live=True, data=None, anonymous=None):
        with patch("sys.stdout", new=io.StringIO()):
            return release.publish(api, self.path, data or self.data, live, anonymous or api.anonymous)

    def test_metadata_is_derived_from_zip_and_escaped(self):
        for path, feed in release.final_feeds(self.data, TIMESTAMP).items():
            release.validate_feed(feed, path)
            self.assertEqual(feed["version"], "2.0.1")
            self.assertEqual(feed["requires_php"], "8.0")
            self.assertIn("&lt;script&gt;", feed["sections"]["description"])
            self.assertIn("&lt;markup&gt;", feed["sections"]["changelog"])
            self.assertNotIn("Older changes", feed["sections"]["changelog"])

    def test_strict_tag_and_archive_version(self):
        for tag in ("2.0.1", "v02.0.1", "v2.0.1-beta", "v2.0.1\nmalicious=x", "v2.0.1+build"):
            with self.subTest(tag=tag), self.assertRaises(release.ReleaseError):
                release.tag_version(tag)
        with self.assertRaisesRegex(release.ReleaseError, "version does not match"):
            release.zip_metadata(archive("theme", "2.0.0"), "wp-theme.json", "2.0.1")

    def test_manifest_must_match_exactly_both_zips(self):
        (self.path / "SHA256SUMS").write_text("0" * 64 + "  animewp-2.0.1.zip\n")
        with self.assertRaisesRegex(release.ReleaseError, "SHA256SUMS"):
            release.candidate(self.path, "v2.0.1", SHA)

    def test_archive_rejects_traversal_and_mismatched_block(self):
        for extra in ({"animewp/../evil.php": "bad"}, {"outside.php": "bad"}):
            with self.subTest(extra=extra), self.assertRaisesRegex(release.ReleaseError, "Unsafe"):
                release.zip_metadata(archive("theme", extra=extra), "wp-theme.json", "2.0.1")
        with self.assertRaisesRegex(release.ReleaseError, "Block version"):
            release.zip_metadata(archive("plugin", extra={"animewp-blocks/build/blocks/example/block.json": '{"version":"2.0.0"}'}), "wp-plugin.json", "2.0.1")

    def test_schema_rejects_malformed_types_dates_and_extra_fields(self):
        original = release.final_feeds(self.data, TIMESTAMP)["wp-theme.json"]
        for field, value in (("schema_version", True), ("sha256", 123), ("requires", None),
                             ("last_updated", "2026-02-30T00:00:00Z"), ("last_updated", "2026-1-1T00:00:00Z"),
                             ("download_url", "https://example.com/theme.zip"), ("unknown", "field"),
                             ("version", "1" * 27 + ".1.1"), ("requires_php", "12345.0"), ("name", "あ" * 67),
                             ("sections", {"description": "あ" * 8001, "changelog": "Valid"})):
            with self.subTest(field=field, value=value), self.assertRaises(release.ReleaseError):
                release.validate_feed({**original, field: value}, "wp-theme.json")
        for path, feed in initial_feeds().items():
            release.validate_feed(feed, path)
            with self.assertRaises(release.ReleaseError):
                release.validate_feed({**feed, "version": "2.0.1"}, path)

    def test_private_repository_stops_at_verified_draft_even_when_live_requested(self):
        api = FakeGitHub(private=True)
        self.assertEqual(self.run_publish(api), "draft")
        self.assertEqual(len(api.blobs), 3)
        self.assertNotIn("publish", api.events)
        self.assertEqual(api.feeds, initial_feeds())
        self.assertEqual(api.commits, [])

    def test_public_repository_requires_explicit_publish(self):
        api = FakeGitHub(private=False)
        self.assertEqual(self.run_publish(api, live=False), "draft")
        self.assertNotIn("publish", api.events)
        self.assertEqual(api.commits, [])

    def test_publication_checks_anonymous_bytes_before_atomic_pair_commit(self):
        api = FakeGitHub(private=False)
        self.assertEqual(self.run_publish(api), "published")
        self.assertEqual(len(api.commits), 1)
        self.assertEqual(set(api.commits[0]), set(release.COMPONENTS))
        self.assertTrue(all(feed["last_updated"] == TIMESTAMP for feed in api.feeds.values()))
        publish_index, commit_index = api.events.index("publish"), api.events.index("commit")
        downloads = [index for index, event in enumerate(api.events) if event.startswith("anonymous:")]
        self.assertEqual(len(downloads), 2)
        self.assertTrue(all(publish_index < index < commit_index for index in downloads))
        previous_uploads = sum(event.startswith("upload:") for event in api.events)
        self.assertEqual(self.run_publish(api), "unchanged")
        self.assertEqual(len(api.commits), 1)
        self.assertEqual(sum(event.startswith("upload:") for event in api.events), previous_uploads)

    def test_partial_draft_resumes_without_overwriting_an_asset(self):
        api = FakeGitHub(private=True)
        api.create_draft(self.data["tag"], SHA)
        name = "animewp-2.0.1.zip"
        api.blobs[name] = (self.path / name).read_bytes()
        self.assertEqual(self.run_publish(api), "draft")
        self.assertNotIn("upload:" + name, api.events)
        self.assertEqual(len(api.blobs), 3)

    def test_conflicting_asset_is_never_clobbered(self):
        api = FakeGitHub(private=False)
        api.create_draft(self.data["tag"], SHA)
        api.blobs["SHA256SUMS"] = b"incorrect bytes"
        with self.assertRaisesRegex(release.ReleaseError, "do not clobber"):
            self.run_publish(api)
        self.assertNotIn("publish", api.events)
        self.assertEqual(api.blobs["SHA256SUMS"], b"incorrect bytes")
        self.assertEqual(api.commits, [])

    def test_published_release_missing_asset_is_never_modified(self):
        api = FakeGitHub(private=False)
        api.publish_release(api.create_draft(self.data["tag"], SHA))
        with self.assertRaisesRegex(release.ReleaseError, "never modify published"):
            self.run_publish(api)
        self.assertEqual(api.blobs, {})
        self.assertEqual(api.commits, [])

    def test_anonymous_hash_mismatch_preserves_both_old_feeds(self):
        api = FakeGitHub(private=False)
        with self.assertRaisesRegex(release.ReleaseError, "Anonymous download hash mismatch"):
            self.run_publish(api, anonymous=lambda url: b"wrong bytes")
        self.assertFalse(api.release["draft"])
        self.assertEqual(api.feeds, initial_feeds())
        self.assertEqual(api.commits, [])

    def test_anonymous_network_failure_preserves_both_old_feeds(self):
        api = FakeGitHub(private=False)
        def unavailable(url):
            raise urllib.error.URLError("unavailable")
        with patch.object(release.time, "sleep"), self.assertRaises(urllib.error.URLError):
            self.run_publish(api, anonymous=unavailable)
        self.assertEqual(api.feeds, initial_feeds())
        self.assertEqual(api.commits, [])

    def test_older_tag_rejected_before_publication(self):
        api = FakeGitHub(private=False)
        newer = artifacts(self.path, "2.1.0")
        api.feeds = release.final_feeds(newer, TIMESTAMP)
        with self.assertRaisesRegex(release.ReleaseError, "roll live feeds back"):
            self.run_publish(api)
        self.assertIsNone(api.release)
        self.assertEqual(api.commits, [])

    def test_same_version_different_hash_or_partial_feed_state_rejected(self):
        api = FakeGitHub(private=False)
        self.run_publish(api)
        api.feeds["wp-theme.json"]["sha256"] = "0" * 64
        with self.assertRaisesRegex(release.ReleaseError, "different metadata"):
            self.run_publish(api)
        partial = release.final_feeds(self.data, TIMESTAMP)
        partial["wp-theme.json"] = initial_feeds()["wp-theme.json"]
        with self.assertRaisesRegex(release.ReleaseError, "disagree"):
            release.guard_feeds(partial, release.final_feeds(self.data, TIMESTAMP))

    def test_tag_move_or_unrecognized_release_stops_transaction(self):
        api = FakeGitHub(private=False)
        api.tag = "f" * 40
        with self.assertRaisesRegex(release.ReleaseError, "tag moved"):
            self.run_publish(api)
        self.assertIsNone(api.release)
        api.tag = SHA
        api.create_draft(self.data["tag"], "f" * 40)
        with self.assertRaisesRegex(release.ReleaseError, "provenance"):
            self.run_publish(api)
        self.assertEqual(api.blobs, {})

    def test_tag_move_during_upload_stops_even_private_draft(self):
        api = FakeGitHub(private=True)
        upload = api.upload
        def moving_tag(*args):
            result = upload(*args)
            api.tag = "f" * 40
            return result
        api.upload = moving_tag
        with self.assertRaisesRegex(release.ReleaseError, "tag moved during"):
            self.run_publish(api)
        self.assertEqual(api.commits, [])

    def test_protection_or_cas_failure_preserves_feeds_and_explains_resume(self):
        api = FakeGitHub(private=False)
        api.fail_commit = True
        with self.assertRaisesRegex(release.ReleaseError, "normal review process.*rerun Release.*publish=true"):
            self.run_publish(api)
        self.assertFalse(api.release["draft"])
        self.assertEqual(api.feeds, initial_feeds())
        api.fail_commit = False
        self.assertEqual(self.run_publish(api), "published")

    def test_automatic_tag_is_created_only_for_draft_and_races_do_not_move_it(self):
        automatic = {**self.data, "create_tag": True}
        api = FakeGitHub(private=True)
        api.tag = None
        self.assertEqual(self.run_publish(api, live=False, data=automatic), "draft")
        self.assertLess(api.events.index("ancestor"), api.events.index("create_tag"))
        self.assertLess(api.events.index("create_tag"), api.events.index("draft"))
        self.assertEqual(self.run_publish(api, live=False, data=automatic), "draft")
        self.assertEqual(api.events.count("create_tag"), 1)
        api.tag = "f" * 40
        with self.assertRaisesRegex(release.ReleaseError, "tag race"):
            self.run_publish(api, live=False, data=automatic)
        api = FakeGitHub(private=False)
        api.tag = None
        with self.assertRaisesRegex(release.ReleaseError, "cannot publish live feeds"):
            self.run_publish(api, live=True, data=automatic)
        self.assertIsNone(api.tag)

    def test_git_api_feed_commit_is_one_two_file_commit_and_nonforced_cas(self):
        api = release.GitHub("test-token")
        calls = []
        def request(method, path, data=None):
            calls.append((method, path, data))
            if method == "GET":
                return {"object": {"sha": "b" * 40}}
            return {"sha": "e" * 40}
        api.request = request
        feeds = release.final_feeds(self.data, TIMESTAMP)
        api.commit_feeds("b" * 40, "c" * 40, feeds)
        tree = next(data for method, path, data in calls if path.endswith("/git/trees"))
        self.assertEqual({entry["path"] for entry in tree["tree"]}, set(release.COMPONENTS))
        self.assertEqual(tree["base_tree"], "c" * 40)
        commit = next(data for method, path, data in calls if path.endswith("/git/commits"))
        self.assertEqual(commit["parents"], ["b" * 40])
        self.assertEqual(calls[-1], ("PATCH", api.prefix + "/git/refs/heads/main", {"sha": "e" * 40, "force": False}))
        calls.clear()
        with self.assertRaisesRegex(release.ReleaseError, "main changed"):
            api.commit_feeds("f" * 40, "c" * 40, feeds)
        self.assertEqual(len(calls), 1)

    def test_git_api_tag_is_create_only_and_non404_errors_abort(self):
        api = release.GitHub("test-token")
        calls = []
        api.request = lambda method, path, data=None: calls.append((method, path, data))
        with patch.object(api, "tag_commit", side_effect=release.APIError(404, "missing")):
            api.create_tag("v2.0.1", SHA)
        self.assertEqual(calls, [("POST", api.prefix + "/git/refs", {"ref": "refs/tags/v2.0.1", "sha": SHA})])
        for effect in (release.APIError(403, "denied"), None):
            calls.clear()
            with patch.object(api, "tag_commit", side_effect=effect, return_value="f" * 40), self.assertRaises(release.ReleaseError):
                api.create_tag("v2.0.1", SHA)
            self.assertEqual(calls, [])
        with patch.object(api, "tag_commit", return_value=SHA):
            api.create_tag("v2.0.1", SHA)
        self.assertEqual(calls, [])
        with patch.object(api, "tag_commit", side_effect=[release.APIError(404, "missing"), SHA]), \
                patch.object(api, "request", side_effect=release.APIError(422, "race")):
            api.create_tag("v2.0.1", SHA)

    def test_download_token_is_not_forwarded_to_storage_redirect(self):
        captured = []
        class Opener:
            def open(self, request, timeout):
                captured.append(request)
                return io.BytesIO(b"archive")
        with patch.object(release.urllib.request, "build_opener", return_value=Opener()):
            self.assertEqual(release.download("https://api.github.com/repos/nanophate/animewp/releases/assets/1", "test-token"), b"archive")
        original = captured[0]
        self.assertEqual(original.get_header("Authorization"), "Bearer test-token")
        redirected = release.SafeRedirect().redirect_request(original, None, 302, "Found", {}, "https://release-assets.githubusercontent.com/file")
        self.assertIsNone(redirected.get_header("Authorization"))
        with self.assertRaises(release.ReleaseError):
            release.SafeRedirect().redirect_request(original, None, 302, "Found", {}, "http://example.com/file")


class LocalGitTests(unittest.TestCase):
    def test_main_push_skips_existing_tag_and_off_main_tag_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            def git(*args):
                return subprocess.check_output(["git", *args], cwd=root, text=True, stderr=subprocess.DEVNULL).strip()
            git("init", "--initial-branch=main")
            git("config", "user.email", "test@example.invalid")
            git("config", "user.name", "Release Test")
            # A developer's global signing setup (e.g. a password manager) must not block the fixture.
            git("config", "commit.gpgsign", "false")
            git("config", "tag.gpgsign", "false")
            for relative in ("themes/animewp/style.css", "plugins/animewp-blocks/animewp-blocks.php"):
                path = root / relative
                path.parent.mkdir(parents=True)
                path.write_text("Version: 2.0.1\n")
            git("add", ".")
            git("commit", "-m", "fixture")
            sha = git("rev-parse", "HEAD")
            git("update-ref", "refs/remotes/origin/main", sha)
            with patch.object(release, "ROOT", root):
                self.assertEqual(release.auto_candidate(), ("v2.0.1", sha, False))
                git("tag", "v2.0.1")
                self.assertEqual(release.auto_candidate(), ("v2.0.1", sha, True))
                self.assertEqual(release.resolve_tag("v2.0.1", True), sha)
                git("checkout", "-b", "unmerged")
                (root / "unmerged.txt").write_text("new code")
                git("add", ".")
                git("commit", "-m", "unmerged")
                git("tag", "v2.0.2")
                with self.assertRaises(release.ReleaseError):
                    release.resolve_tag("v2.0.2")


if __name__ == "__main__":
    unittest.main()
