#!/usr/bin/env python3
"""Resolve main/tag release events and finish publication in the same workflow.

Event resolution is read-only. Only the publish subcommand writes to GitHub,
using the immutable candidate and the reviewed release.py transaction. Automatic
GITHUB_TOKEN tags do not need to trigger another workflow. Live feeds still
require a normal two-file PR merge; private repositories only stage drafts.
"""
import argparse
import json
import os
from pathlib import Path
import re
import sys
import zipfile

import release

MAIN_REF = "refs/heads/main"
TAG_PREFIX = "refs/tags/"
SHA_PATTERN = r"[0-9a-f]{40}"


def plan(event_name, ref, event):
    """Return scalar workflow outputs without creating tags, releases or PRs."""
    release.require(isinstance(event, dict), "Invalid release event payload")
    repository = event.get("repository", {})
    release.require(isinstance(repository, dict), "Invalid event repository")
    release.require(repository.get("full_name") == release.REPOSITORY,
                    "Release event belongs to another repository")
    release.require(type(repository.get("private")) is bool, "Missing repository visibility")
    release.require(isinstance(ref, str), "Missing event ref")
    release.require(event_name in ("push", "workflow_dispatch"), "Unsupported release event")
    if event_name == "push":
        release.require(event.get("ref") == ref, "Release event ref mismatch")
        release.require(type(event.get("deleted")) is bool, "Missing deletion state")
        release.require(type(event.get("forced")) is bool, "Missing force-push state")
        release.require(not event["deleted"], "Deleted refs cannot publish releases")
        release.require(not event["forced"], "Forced ref updates cannot publish releases")
    tooling = release.git("rev-parse", "HEAD")
    release.source_checkout(tooling)
    create_tag, skip = False, False
    if event_name == "push" and ref == MAIN_REF:
        release.require(event.get("after") == tooling,
                        "main checkout differs from the triggering commit")
        tag, source, exists = release.auto_candidate()
        # Ordinary merges (including feed/withdrawal PRs) must not replay old
        # tags or republish a deliberately withdrawn version. Recovery of an
        # existing draft/tag is an explicit workflow_dispatch operation.
        skip, create_tag = exists, not exists
        live = not skip
    elif event_name == "push" and ref.startswith(TAG_PREFIX):
        tag = ref[len(TAG_PREFIX):]
        release.tag_version(tag)
        release.require(event.get("created") is True, "Tag updates are not release requests")
        # Accept the pushed ref object or its peeled commit. An annotated tag
        # has distinct object/commit SHAs; either representation must identify
        # this same immutable code, not a ref that moved to a different commit.
        after = event.get("after")
        release.require(isinstance(after, str) and re.fullmatch(SHA_PATTERN, after),
                        "Invalid tag event SHA")
        source = release.resolve_tag(tag)
        release.require(after in (release.git("rev-parse", "--verify", ref), source),
                        "Tag changed since the triggering event")
        live = True
    elif event_name == "workflow_dispatch":
        release.require(ref == MAIN_REF, "Manual recovery must run from main")
        inputs = event.get("inputs", {})
        release.require(isinstance(inputs, dict), "Invalid recovery inputs")
        tag = inputs.get("tag")
        release.tag_version(tag)
        source = release.resolve_tag(tag)
        requested = inputs.get("publish", False)
        release.require(type(requested) is bool or requested in ("true", "false"),
                        "Recovery publish must be a boolean")
        live = requested is True or requested == "true"
    else:
        raise release.ReleaseError("Only main and stable tag pushes can release")
    return {
        "tag": tag, "sha": source, "version": release.tag_version(tag),
        "tool_sha": tooling, "skip": str(skip).lower(),
        "create_tag": str(create_tag).lower(),
        "publish": str(live and not repository["private"]).lower(),
    }


def publish_candidate(api, artifacts, data, live, anonymous=release.download):
    """Keep the existing draft transaction, then finish without a second event.

    Stage verifies all uploaded bytes and create-only tags. A public automatic
    candidate is preflighted against the live feeds before *any* tag write, so
    an older queued version cannot create tags/assets after a newer release.
    The second transaction repeats the immutable-asset/visibility/tag checks.
    """
    release.require(type(live) is bool, "Publication flag must be boolean")
    if data["create_tag"]:
        if live and api.repository().get("private") is False:
            parent, _, current = api.main_state()
            api.ancestor(data["source_sha"], parent)
            existing = api.find_release(data["tag"])
            timestamp = (existing.get("published_at") if existing and not existing["draft"]
                         else "2000-01-01T00:00:00Z")
            release.guard_feeds(current, release.final_feeds(data, timestamp))
        staged = release.publish(api, artifacts, data, False, anonymous)
        if not live:
            return staged
        # The verified tag now exists. Do not wait for its suppressed push
        # event, rewrite candidate.json, move the tag, or bypass protection.
        data = {**data, "create_tag": False}
    return release.publish(api, artifacts, data, live, anonymous)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    resolve = commands.add_parser("resolve")
    resolve.add_argument("--github-output", type=Path, required=True)
    publish = commands.add_parser("publish")
    publish.add_argument("--candidate", type=Path, required=True)
    publish.add_argument("--publish", choices=("true", "false"), required=True)
    args = parser.parse_args()
    if args.command == "resolve":
        event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text(encoding="utf-8"))
        outputs = plan(os.environ.get("GITHUB_EVENT_NAME"), os.environ.get("GITHUB_REF"), event)
        text = "".join(f"{key}={value}\n" for key, value in outputs.items())
        with args.github_output.open("a", encoding="utf-8") as stream:
            stream.write(text)
        print(text, end="")
    else:
        data = json.loads((args.candidate / "candidate.json").read_text(encoding="utf-8"))
        release.require(data == release.candidate(args.candidate, data["tag"], data["source_sha"], data["create_tag"]),
                        "Candidate metadata does not match the ZIPs")
        release.publisher_checkout(data["source_sha"], os.environ.get("RELEASE_TOOL_SHA"))
        if not data["create_tag"]:
            release.require(release.resolve_tag(data["tag"]) == data["source_sha"],
                            "Release tag differs from candidate")
        publish_candidate(release.GitHub(os.environ.get("GITHUB_TOKEN", "")),
                          args.candidate, data, args.publish == "true")


if __name__ == "__main__":
    try:
        main()
    except (release.ReleaseError, OSError, ValueError, KeyError, TypeError, zipfile.BadZipFile) as error:
        print(f"Release automation failed: {error}", file=sys.stderr)
        raise SystemExit(1)
