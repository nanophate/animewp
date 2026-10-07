#!/bin/sh
# Security checks for the theme and plugin. PHP runs only in Docker.
#   1. PHP_CodeSniffer with the WordPress security sniffs (phpcs.xml.dist):
#      escaping, nonces, input sanitization, prepared SQL, dangerous functions,
#      PHP 8.0+ compatibility.
#   2. Plugin Check (WordPress.org), security category, in the wp-env tests site (localhost:8889).
#   3. Theme Check (WordPress.org) in the wp-env tests site (localhost:8889): fails on REQUIRED items.
# Needs: Docker, npm ci, npm run build, npm run env:start.
set -eu
root=$(cd "$(dirname "$0")/../.." && pwd)
cd "$root"

echo "== PHPCS (WordPress security sniffs)"
if [ ! -d tests/security/vendor ]; then
	docker run --rm -v "$root/tests/security:/app" -w /app composer:2 install --no-interaction --no-progress --quiet
fi
docker run --rm -v "$root:/work" -w /work php:8.0-cli tests/security/vendor/bin/phpcs --standard=phpcs.xml.dist --report=summary
echo "PHPCS: no issues"

wp() { npx wp-env run tests-cli -- wp "$@" 2>/dev/null; }
wp plugin is-installed plugin-check || wp plugin install plugin-check --quiet
wp plugin is-installed theme-check || wp plugin install theme-check --quiet
wp plugin activate plugin-check theme-check --quiet

echo "== Plugin Check (security)"
plugin=$(wp plugin check animewp-blocks --categories=security --format=csv --fields=file,line,type,code,message || true)
printf '%s\n' "$plugin" | grep -v '^\(ℹ\|✔\)'
if printf '%s' "$plugin" | grep -q ',ERROR,'; then
	echo "Plugin Check found security errors" >&2
	exit 1
fi

echo "== Theme Check"
theme=$(wp theme-check run animewp || true)
printf '%s\n' "$theme" | sed 's/<[^>]*>//g' | grep -v '^\(ℹ\|✔\)'
if printf '%s' "$theme" | grep -q '^REQUIRED'; then
	echo "Theme Check found required changes" >&2
	exit 1
fi
echo "Security checks passed."
