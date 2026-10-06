#!/bin/sh
# Download WordPress editor scripts for the serialization harness when wp-env
# is not running (CI). Prints the directory to use as ANIMEWP_WP_DIR.
#   sh tests/serialization/fetch-wordpress.sh [branch]   (default 6.6-branch)
set -eu
branch="${1:-6.6-branch}"
target=".testenv/wordpress-$branch"
if [ ! -f "$target/wp-includes/version.php" ]; then
	mkdir -p "$target"
	curl -fsSL "https://github.com/WordPress/WordPress/archive/refs/heads/$branch.tar.gz" |
		tar -xz -C "$target" --strip-components=1
fi
echo "$PWD/$target"
