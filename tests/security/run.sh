#!/bin/sh
# Security checks for the theme and plugin. PHP runs only in Docker.
#   1. PHP_CodeSniffer with the WordPress security sniffs (phpcs.xml.dist):
#      escaping, nonces, input sanitization, prepared SQL, dangerous functions,
#      PHP 8.0+ compatibility.
#   2. Plugin Check (WordPress.org), security category, in the wp-env tests site (localhost:8889).
#   3. Theme Check (WordPress.org) in the wp-env tests site (localhost:8889): honors its exit status.
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

wp() { npx wp-env run tests-cli -- wp "$@"; }
wp plugin is-installed plugin-check || wp plugin install plugin-check --quiet
wp plugin is-installed theme-check || wp plugin install theme-check --quiet
wp plugin activate plugin-check theme-check --quiet

echo "== Plugin Check (security)"
# Plugin Check may exit successfully even when its result contains ERROR rows.
# Preserve invocation failures and inspect the findings as a separate check.
if plugin=$(wp plugin check animewp-blocks --categories=security --format=csv --fields=file,line,type,code,message); then
	printf '%s\n' "$plugin"
else
	status=$?
	printf '%s\n' "$plugin"
	echo "Plugin Check could not complete" >&2
	exit "$status"
fi
if printf '%s' "$plugin" | grep -q ',ERROR,'; then
	echo "Plugin Check found security errors" >&2
	exit 1
fi

echo "== Theme Check"
# The default output is a table, so grepping for a line starting REQUIRED
# misses failures. The CLI already reports failed checks with a nonzero exit.
wp eval-file wp-content/animewp-tests/security/theme-check-policy-test.php
wp --require=wp-content/animewp-tests/security/theme-check-policy.php theme-check run animewp
echo "Security checks passed."
