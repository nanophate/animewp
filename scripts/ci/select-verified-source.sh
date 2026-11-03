#!/usr/bin/env bash
# Called only after checking out the event's immutable github.sha. Never pass a
# workflow input directly to actions/checkout, even in a reusable workflow:
# github.event_name describes the caller's event, not "workflow_call".
set -euo pipefail

candidate=${ANIMEWP_RELEASE_SOURCE_SHA:-}
if [[ ! "$candidate" =~ ^[0-9a-f]{40}$ ]]; then
  echo '::error::Release source must be a full lowercase commit SHA' >&2
  exit 1
fi

# Release recovery may verify an older tag, but only code already on main.
# Fetch the fixed main ref, then check ancestry before executing any candidate.
git fetch --no-tags origin '+refs/heads/main:refs/remotes/origin/main'
if ! git merge-base --is-ancestor "$candidate" refs/remotes/origin/main; then
  echo '::error::Release source must be an ancestor of main' >&2
  exit 1
fi

git checkout --detach "$candidate"
