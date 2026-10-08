#!/bin/sh
# Disposable WordPress tests site only; packages use physical directories, not source bind mounts.
set -eu
wp() { npx --no-install wp-env run tests-cli -- wp "$@"; }
qa=wp-content/animewp-qa
wp option update blog_public 0
wp theme install "$qa/animewp-1.3.0.zip" --force --activate
wp plugin install "$qa/animewp-blocks-1.3.0.zip" --force --activate
npx --no-install wp-env run tests-cli -- env ANIMEWP_QA_ACTION=seed wp eval-file wp-content/animewp-tests/browser/fixtures/upgrade.php
wp theme install "$qa/current-theme.zip" --force
wp plugin install "$qa/current-plugin.zip" --force
npx --no-install wp-env run tests-cli -- env ANIMEWP_QA_ACTION=verify wp eval-file wp-content/animewp-tests/browser/fixtures/upgrade.php
wp theme install twentytwentyfour
wp eval-file wp-content/animewp-tests/browser/fixtures/pages.php
mkdir -p artifacts/browser-results
cp artifacts/browser-fixtures/upgrade-result.json artifacts/browser-results/upgrade-result.json
