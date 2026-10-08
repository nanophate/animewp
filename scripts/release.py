#!/usr/bin/env python3
"""Validate two installation ZIPs, stage a Release, then atomically publish feeds.

Only the publish subcommand writes to GitHub. Private repositories always stop
at the draft; --publish true is also required before publishing public releases.
"""
import argparse
import base64
import datetime
import hashlib
import html
import io
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = "nanophate/animewp"
HOMEPAGE = f"https://github.com/{REPOSITORY}"
TESTED = "7.1"
VERSION = r"(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)"
REQUIREMENT = r"[0-9]{1,4}\.[0-9]{1,4}(?:\.[0-9]{1,4})?"
COMPONENTS = {
    "wp-theme.json": ("theme", "animewp", "style.css", "Theme Name"),
    "wp-plugin.json": ("plugin", "animewp-blocks", "animewp-blocks.php", "Plugin Name"),
}


class ReleaseError(RuntimeError):
    pass


class APIError(ReleaseError):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


def require(condition, message):
    if not condition:
        raise ReleaseError(message)


def version_tuple(version):
    require(isinstance(version, str) and len(version) <= 30 and re.fullmatch(VERSION, version), f"Invalid release version: {version!r}")
    return tuple(map(int, version.split(".")))


def tag_version(tag):
    require(isinstance(tag, str) and tag.startswith("v"), "Tag must be vX.Y.Z")
    version_tuple(tag[1:])
    return tag[1:]


def dumps(data):
    return json.dumps(data, ensure_ascii=False, indent=2) + "\n"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def git(*args):
    result = subprocess.run(["git", *args], cwd=ROOT, text=True, capture_output=True)
    require(result.returncode == 0, f"git {' '.join(args)} failed: {result.stderr.strip()}")
    return result.stdout.strip()


def resolve_tag(tag, require_checkout=False):
    tag_version(tag)
    sha = git("rev-parse", "--verify", f"refs/tags/{tag}^{{commit}}")
    require(re.fullmatch(r"[0-9a-f]{40}", sha), "Invalid tag commit")
    git("merge-base", "--is-ancestor", sha, "refs/remotes/origin/main")
    if require_checkout:
        require(git("rev-parse", "HEAD") == sha, "Checkout does not match the release tag")
    return sha


def source_checkout(sha):
    require(isinstance(sha, str) and re.fullmatch(r"[0-9a-f]{40}", sha), "Invalid source SHA")
    require(git("rev-parse", "HEAD") == sha, "Checkout does not match the validated source")
    git("merge-base", "--is-ancestor", sha, "refs/remotes/origin/main")


def auto_candidate():
    sha = git("rev-parse", "HEAD")
    source_checkout(sha)
    versions = [headers((ROOT / path).read_text())["version"] for path in (
        "themes/animewp/style.css", "plugins/animewp-blocks/animewp-blocks.php")]
    require(len(set(versions)) == 1, "Theme and plugin versions differ")
    version_tuple(versions[0])
    tag = "v" + versions[0]
    result = subprocess.run(["git", "show-ref", "--verify", "--quiet", "refs/tags/" + tag], cwd=ROOT)
    require(result.returncode in (0, 1), "Could not check existing tags")
    return tag, sha, result.returncode == 0


def headers(text):
    return {name.lower(): value.strip() for name, value in re.findall(
        r"^\s*(?:\*\s*)?([A-Za-z][A-Za-z ]*):[ \t]*(.*?)\s*$", text[:8192], re.M)}


def changelog(readme, version):
    section = re.search(r"^== Changelog ==\s*$([\s\S]*?)(?=^== [^=]|\Z)", readme, re.M)
    require(section, "readme.txt needs a Changelog section")
    entry = re.search(rf"^= {re.escape(version)} =\s*$([\s\S]*?)(?=^= [^=]|\Z)", section[1], re.M)
    require(entry and entry[1].strip(), f"readme.txt needs release notes for {version}")
    return "<p>" + html.escape(entry[1].strip()).replace("\n", "<br>\n") + "</p>"


def zip_metadata(data, feed_path, version):
    kind, slug, header, name_field = COMPONENTS[feed_path]
    require(len(data) <= 64 * 1024 * 1024, "ZIP exceeds the updater's 64 MiB download limit")
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        names = archive.namelist()
        require(names and len(set(names)) == len(names), f"{slug}: empty or duplicate ZIP entries")
        require(sum(entry.file_size for entry in archive.infolist()) <= 256 * 1024 * 1024, "ZIP is unexpectedly large")
        for entry in archive.infolist():
            require(entry.filename.startswith(slug + "/") and ".." not in entry.filename.split("/")
                    and "\\" not in entry.filename and not stat.S_ISLNK(entry.external_attr >> 16), "Unsafe ZIP entry")
        require(archive.testzip() is None, f"{slug}: ZIP CRC failure")
        fields = headers(archive.read(f"{slug}/{header}").decode("utf-8"))
        readme = archive.read(f"{slug}/readme.txt").decode("utf-8")
        readme_fields = headers(readme)
        require(fields.get("version") == version, f"{slug}: ZIP version does not match tag")
        for field in ("requires at least", "requires php"):
            require(re.fullmatch(REQUIREMENT, fields.get(field, "")), f"{slug}: invalid {field}")
        require(fields.get(name_field.lower()) and fields.get("description"), f"{slug}: missing name/description")
        tested = fields.get("tested up to") if kind == "theme" else readme_fields.get("tested up to")
        require(tested == TESTED, f"{slug}: Tested up to must match the tested WordPress {TESTED} branch")
        if kind == "plugin":
            require(readme_fields.get("stable tag") == version, "Plugin Stable tag does not match")
            for field in ("requires at least", "requires php"):
                require(readme_fields.get(field) == fields[field], f"Plugin readme/header mismatch: {field}")
            blocks = [name for name in names if name.startswith(f"{slug}/build/blocks/") and name.endswith("/block.json")]
            require(blocks, "Plugin ZIP has no built blocks")
            for name in blocks:
                require(json.loads(archive.read(name)).get("version") == version, f"Block version mismatch: {name}")
    return {
        "schema_version": 1, "status": "published", "type": kind, "slug": slug,
        "version": version, "name": fields[name_field.lower()],
        "requires": fields["requires at least"], "requires_php": fields["requires php"], "tested": tested,
        "homepage": HOMEPAGE,
        "download_url": f"{HOMEPAGE}/releases/download/v{version}/{slug}-{version}.zip",
        "sha256": digest(data),
        "sections": {"description": "<p>" + html.escape(fields["description"]) + "</p>",
                     "changelog": changelog(readme, version)},
    }


def candidate(artifacts, tag, sha, create_tag=False):
    version = tag_version(tag)
    require(re.fullmatch(r"[0-9a-f]{40}", sha), "Invalid source SHA")
    feeds, hashes = {}, {}
    for feed_path, (_, slug, _, _) in COMPONENTS.items():
        name = f"{slug}-{version}.zip"
        data = (artifacts / name).read_bytes()
        feeds[feed_path] = zip_metadata(data, feed_path, version)
        # Enforce the same client limits before any draft or tag is created.
        validate_feed({**feeds[feed_path], "last_updated": "2000-01-01T00:00:00Z"}, feed_path)
        hashes[name] = digest(data)
    sums = "".join(f"{value}  {name}\n" for name, value in sorted(hashes.items()))
    require((artifacts / "SHA256SUMS").read_text(encoding="ascii") == sums, "SHA256SUMS must contain exactly the two matching ZIP hashes")
    hashes["SHA256SUMS"] = digest(sums.encode("ascii"))
    require(type(create_tag) is bool, "Invalid tag-creation flag")
    return {"schema_version": 1, "repository": REPOSITORY, "tag": tag, "source_sha": sha, "create_tag": create_tag,
            "assets": hashes, "feeds": feeds}


def validate_feed(feed, path):
    kind, slug, _, _ = COMPONENTS[path]
    base = {"schema_version": 1, "status": "unpublished", "type": kind, "slug": slug}
    require(isinstance(feed, dict) and type(feed.get("schema_version")) is int, f"Invalid feed schema: {path}")
    if feed == base:
        return
    require(isinstance(feed, dict) and feed.get("status") == "published", f"Invalid live feed: {path}")
    for key in ("schema_version", "type", "slug"):
        require(feed.get(key) == base[key], f"Invalid feed identity: {path}")
    version_tuple(feed.get("version"))
    require(set(feed) == set(base) | {"version", "name", "requires", "requires_php", "tested", "homepage",
            "download_url", "sha256", "last_updated", "sections"}, "Unexpected or missing feed fields")
    version = feed["version"]
    require(feed.get("homepage") == HOMEPAGE and feed.get("download_url") ==
            f"{HOMEPAGE}/releases/download/v{version}/{slug}-{version}.zip", "Unexpected feed URL")
    require(isinstance(feed.get("sha256"), str) and re.fullmatch(r"[0-9a-f]{64}", feed["sha256"]), "Invalid feed digest")
    for field in ("requires", "requires_php", "tested"):
        require(isinstance(feed.get(field), str) and re.fullmatch(REQUIREMENT, feed[field]), f"Invalid feed {field}")
    require(isinstance(feed.get("name"), str) and feed["name"] and len(feed["name"].encode("utf-8")) <= 200, "Missing or overlong feed name")
    require(isinstance(feed.get("sections"), dict) and all(isinstance(feed["sections"].get(k), str)
            and feed["sections"][k] and len(feed["sections"][k].encode("utf-8")) <= 24000
            for k in ("description", "changelog")), "Missing or overlong feed sections")
    timestamp = feed.get("last_updated")
    require(isinstance(timestamp, str) and re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z", timestamp), "Invalid feed date")
    try:
        datetime.datetime.strptime(timestamp, "%Y-%m-%dT%H:%M:%SZ")
    except ValueError as error:
        raise ReleaseError("Invalid feed date") from error


def guard_feeds(current, proposed):
    """Return True only when both files already describe this exact release."""
    states = set()
    unchanged = True
    for path in COMPONENTS:
        old, new = current[path], proposed[path]
        validate_feed(old, path)
        states.add((old["status"], old.get("version")))
        if old["status"] == "published":
            require(version_tuple(old["version"]) <= version_tuple(new["version"]), "Refusing to roll live feeds back to an older tag")
            if old["version"] == new["version"]:
                require(old == new, "This version is already published with different metadata or ZIP hashes")
        unchanged = unchanged and old == new
    require(len(states) == 1, "Theme and plugin live feeds disagree; repair them explicitly before publishing")
    return unchanged


class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers_, newurl):
        require(urllib.parse.urlsplit(newurl).scheme == "https", "Refusing an insecure download redirect")
        return super().redirect_request(request, response, code, message, headers_, newurl)


def download(url, token=None):
    require(urllib.parse.urlsplit(url).scheme == "https", "Downloads require HTTPS")
    request = urllib.request.Request(url, headers={"Accept": "application/octet-stream", "User-Agent": "animewp-release", "Cache-Control": "no-cache"})
    if token:
        require(urllib.parse.urlsplit(url).hostname == "api.github.com", "Authenticated downloads must use GitHub API")
        # Do not forward credentials to signed asset-storage redirects.
        request.add_unredirected_header("Authorization", "Bearer " + token)
    with urllib.request.build_opener(SafeRedirect()).open(request, timeout=60) as response:
        return response.read()


class GitHub:
    def __init__(self, token):
        require(token, "GITHUB_TOKEN is required for release publication")
        self.token = token
        self.prefix = f"/repos/{REPOSITORY}"

    def request(self, method, path, data=None, binary=None):
        host = "https://uploads.github.com" if binary is not None else "https://api.github.com"
        require(path.startswith(self.prefix + "/") or path == self.prefix, "Unexpected API path")
        payload = binary if binary is not None else (json.dumps(data).encode() if data is not None else None)
        request = urllib.request.Request(host + path, data=payload, method=method, headers={
            "Accept": "application/vnd.github+json", "Content-Type": "application/octet-stream" if binary is not None else "application/json",
            "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "animewp-release",
        })
        request.add_unredirected_header("Authorization", "Bearer " + self.token)
        try:
            with urllib.request.build_opener(SafeRedirect()).open(request, timeout=60) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            details = error.read().decode("utf-8", errors="replace")[:1200]
            raise APIError(error.code, f"GitHub {method} {path}: HTTP {error.code}: {details}") from error

    def repository(self):
        return self.request("GET", self.prefix)

    def tag_commit(self, tag):
        tag_version(tag)
        obj = self.request("GET", self.prefix + "/git/ref/tags/" + tag)["object"]
        for _ in range(8):
            if obj["type"] == "commit":
                return obj["sha"]
            require(obj["type"] == "tag", "Tag does not identify a commit")
            obj = self.request("GET", self.prefix + "/git/tags/" + obj["sha"])["object"]
        raise ReleaseError("Tag nesting is too deep")

    def create_tag(self, tag, source):
        try:
            existing = self.tag_commit(tag)
        except APIError as error:
            if error.status != 404:
                raise
        else:
            require(existing == source, "Automatic tag exists at another commit; refusing to move it")
            return
        # POST only creates a new ref. A race returns 422; never PATCH a tag.
        try:
            self.request("POST", self.prefix + "/git/refs", {"ref": "refs/tags/" + tag, "sha": source})
        except APIError as error:
            if error.status != 422:
                raise
            require(self.tag_commit(tag) == source, "Concurrent tag creation chose another commit; refusing to move it")

    def main_state(self):
        sha = self.request("GET", self.prefix + "/git/ref/heads/main")["object"]["sha"]
        commit = self.request("GET", self.prefix + "/git/commits/" + sha)
        feeds = {}
        for path in COMPONENTS:
            data = self.request("GET", self.prefix + "/contents/" + path + "?ref=" + sha)
            require(data.get("encoding") == "base64", "Unexpected feed content encoding")
            feeds[path] = json.loads(base64.b64decode(data["content"]))
        return sha, commit["tree"]["sha"], feeds

    def ancestor(self, source, main):
        data = self.request("GET", self.prefix + f"/compare/{source}...{main}")
        require(data.get("status") in ("ahead", "identical") and data["merge_base_commit"]["sha"] == source,
                "Tag is not an ancestor of main")

    def find_release(self, tag):
        found = []
        for page in range(1, 101):
            releases = self.request("GET", self.prefix + f"/releases?per_page=100&page={page}")
            found.extend(release for release in releases if release["tag_name"] == tag)
            if len(releases) < 100:
                break
        else:
            raise ReleaseError("Too many releases to check safely")
        require(len(found) <= 1, "Multiple releases have this tag; resolve them manually")
        return found[0] if found else None

    def create_draft(self, tag, source):
        return self.request("POST", self.prefix + "/releases", {
            "tag_name": tag, "target_commitish": source, "name": tag, "draft": True, "prerelease": False,
            "body": f"WordPress theme and plugin installation ZIPs. Verify SHA256SUMS before installing.\n\n<!-- animewp-source:{source} -->",
        })

    def assets(self, release):
        result = []
        for page in range(1, 101):
            items = self.request("GET", self.prefix + f"/releases/{release['id']}/assets?per_page=100&page={page}")
            result.extend(items)
            if len(items) < 100:
                return result
        raise ReleaseError("Too many release assets")

    def asset_bytes(self, asset):
        return download(f"https://api.github.com{self.prefix}/releases/assets/{asset['id']}", self.token)

    def upload(self, release, name, data):
        return self.request("POST", self.prefix + f"/releases/{release['id']}/assets?name=" + urllib.parse.quote(name), binary=data)

    def publish_release(self, release):
        return self.request("PATCH", self.prefix + f"/releases/{release['id']}",
                            {"draft": False, "prerelease": False, "make_latest": "legacy"})

    def commit_feeds(self, parent, tree, feeds):
        current = self.request("GET", self.prefix + "/git/ref/heads/main")["object"]["sha"]
        require(current == parent, "main changed before feed commit; rerun the same release")
        tree_data = self.request("POST", self.prefix + "/git/trees", {
            "base_tree": tree, "tree": [{"path": path, "mode": "100644", "type": "blob", "content": dumps(feed)}
                                        for path, feed in sorted(feeds.items())],
        })
        commit = self.request("POST", self.prefix + "/git/commits", {
            "message": "Publish WordPress update feeds for v" + feeds["wp-theme.json"]["version"],
            "tree": tree_data["sha"], "parents": [parent],
        })
        # A concurrent commit makes this non-fast-forward. Never force or bypass
        # branch protection; an orphaned commit does not alter either live feed.
        self.request("PATCH", self.prefix + "/git/refs/heads/main", {"sha": commit["sha"], "force": False})
        return commit["sha"]


def final_feeds(candidate_data, timestamp):
    datetime.datetime.strptime(timestamp, "%Y-%m-%dT%H:%M:%SZ")
    result = {path: {**feed, "last_updated": timestamp} for path, feed in candidate_data["feeds"].items()}
    for path, feed in result.items():
        validate_feed(feed, path)
    return result


def publish(api, artifacts, data, live, anonymous=download):
    tag, source = data["tag"], data["source_sha"]
    parent, tree, old_feeds = api.main_state()
    api.ancestor(source, parent)
    if data["create_tag"]:
        require(not live, "Automatic tag preparation cannot publish live feeds")
        api.create_tag(tag, source)
    require(api.tag_commit(tag) == source, "Release tag moved after validation")
    public = api.repository().get("private") is False
    release = api.find_release(tag)
    # Before making a release public, reject rollback even if downloads fail later.
    if public and live:
        timestamp = release.get("published_at") if release and not release["draft"] else "2000-01-01T00:00:00Z"
        proposed = final_feeds(data, timestamp)
        guard_feeds(old_feeds, proposed)
    if release is None:
        release = api.create_draft(tag, source)
    require(not release.get("prerelease"), "Refusing a prerelease")
    require(f"<!-- animewp-source:{source} -->" in (release.get("body") or ""), "Existing release has different or missing source provenance")
    assets = api.assets(release)
    require(len({asset["name"] for asset in assets}) == len(assets), "Duplicate release assets")
    require(set(asset["name"] for asset in assets) <= set(data["assets"]), "Release has unexpected assets")
    existing = {asset["name"]: asset for asset in assets}
    for name, expected_hash in sorted(data["assets"].items()):
        if name not in existing:
            require(release["draft"], "Published release is missing an asset; never modify published assets")
            existing[name] = api.upload(release, name, (artifacts / name).read_bytes())
        require(existing[name].get("name") == name, "Uploaded asset has an unexpected name")
        require(existing[name].get("state") == "uploaded", f"Asset is not fully uploaded: {name}")
        require(digest(api.asset_bytes(existing[name])) == expected_hash, f"Existing asset differs: {name}; do not clobber it")
    require(api.tag_commit(tag) == source, "Release tag moved during asset upload")
    if not public or not live:
        print("Draft assets are verified. Live feeds were not changed." if release["draft"] else "Existing release assets verified. Live feeds were not changed.")
        return "draft" if release["draft"] else "unchanged"
    require(api.repository().get("private") is False, "Repository became private; feeds were not changed")
    require(api.tag_commit(tag) == source, "Release tag moved; feeds were not changed")
    if release["draft"]:
        release = api.publish_release(release)
    require(not release["draft"] and not release.get("prerelease"), "Release did not become public and stable")
    feeds = final_feeds(data, release["published_at"])
    for path, feed in feeds.items():
        for attempt in range(3):
            try:
                require(digest(anonymous(feed["download_url"])) == feed["sha256"], f"Anonymous download hash mismatch: {path}")
                break
            except urllib.error.URLError:
                if attempt == 2:
                    raise
                time.sleep(2 * (attempt + 1))
    require(api.repository().get("private") is False and api.tag_commit(tag) == source, "Repository/tag changed before feed publication")
    parent, tree, current = api.main_state()
    if guard_feeds(current, feeds):
        print("This exact release is already in both live feeds; nothing to update.")
        return "unchanged"
    try:
        commit = api.commit_feeds(parent, tree, feeds)
    except ReleaseError as error:
        raise ReleaseError(f"Release is published, but live feeds were not updated: {error}\n"
                           f"Resolve the main-branch protection/conflict using the normal review process, then rerun Release with tag {tag} and publish=true. "
                           "Do not delete assets, move tags, or force-push main.") from error
    print(f"Published both WordPress update feeds in one commit: {commit}")
    return "published"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    resolve = commands.add_parser("resolve")
    choice = resolve.add_mutually_exclusive_group(required=True)
    choice.add_argument("--tag")
    choice.add_argument("--auto", action="store_true")
    resolve.add_argument("--github-output", type=Path)
    prepare = commands.add_parser("prepare")
    prepare.add_argument("--tag", required=True)
    prepare.add_argument("--source-sha", required=True)
    prepare.add_argument("--create-tag", choices=("true", "false"), default="false")
    prepare.add_argument("--artifacts", type=Path, default=ROOT / "artifacts/releases")
    prepare.add_argument("--output", type=Path, default=ROOT / "artifacts/release-candidate")
    release = commands.add_parser("publish")
    release.add_argument("--candidate", type=Path, required=True)
    release.add_argument("--publish", choices=("true", "false"), default="false")
    args = parser.parse_args()
    if args.command == "resolve":
        if args.auto:
            tag, sha, skip = auto_candidate()
        else:
            tag, sha, skip = args.tag, resolve_tag(args.tag), False
        output = (f"tag={tag}\nsha={sha}\nversion={tag_version(tag)}\n"
                  f"skip={str(skip).lower()}\ncreate_tag={str(args.auto).lower()}\n")
        if args.github_output:
            with args.github_output.open("a") as stream:
                stream.write(output)
        print(output, end="")
    elif args.command == "prepare":
        sha = args.source_sha
        source_checkout(sha)
        if args.create_tag == "false":
            require(resolve_tag(args.tag, require_checkout=True) == sha, "Tag differs from the validated source")
        data = candidate(args.artifacts, args.tag, sha, args.create_tag == "true")
        args.output.mkdir(parents=True, exist_ok=True)
        require(not list(args.output.iterdir()), "Candidate directory must start empty")
        for name in data["assets"]:
            shutil.copyfile(args.artifacts / name, args.output / name)
        (args.output / "candidate.json").write_text(dumps(data))
        print(f"Validated release candidate: {args.tag} ({sha})")
    else:
        data = json.loads((args.candidate / "candidate.json").read_text())
        require(data == candidate(args.candidate, data["tag"], data["source_sha"], data["create_tag"]), "Candidate metadata does not match the ZIPs")
        source_checkout(data["source_sha"])
        if not data["create_tag"]:
            require(resolve_tag(data["tag"], require_checkout=True) == data["source_sha"], "Checkout/tag differs from candidate")
        publish(GitHub(os.environ.get("GITHUB_TOKEN", "")), args.candidate, data, args.publish == "true")


if __name__ == "__main__":
    try:
        main()
    except (ReleaseError, OSError, ValueError, KeyError, zipfile.BadZipFile) as error:
        print(f"Release failed: {error}", file=sys.stderr)
        raise SystemExit(1)
