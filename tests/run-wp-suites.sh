#!/bin/sh
# Run the WordPress integration suites inside the wp-env Docker site.
# They create and modify content, so they run on the separate tests site
# (localhost:8889), never on the development site at localhost:8888.
#   npm run env:start && npm run test:wp
set -eu
dir=wp-content/animewp-tests
origin=http://tests-wordpress   # the tests WordPress container as seen from tests-cli
# The tests site starts with a default theme; the suites expect this one.
npx wp-env run tests-cli -- wp theme activate animewp
status=0
for suite in wp-smoke wp-fixtures wp-regressions-v12 wp-motion wp-i18n wp-render wp-http wp-updates; do
	# wp-env occasionally fails its own Docker request ("lookup:" timing dump); retry once.
	for attempt in 1 2; do
		suite_status=0
		output=$(npx wp-env run tests-cli -- env ANIMEWP_HTTP_ORIGIN="$origin" wp eval-file "$dir/$suite.php" 2>&1) || suite_status=$?
		if [ "$suite_status" != 0 ] && [ "$attempt" = 1 ]; then
			case "$output" in *"lookup:"*) sleep 3; continue ;; esac
		fi
		break
	done
	if [ "$suite_status" != 0 ]; then
		printf '%s\n' "$suite: command exited $suite_status" "$output" >&2
		status=1
	fi
	summary=$(printf '%s' "$output" | python3 tests/wp_suite_report.py) || status=1
	echo "$suite: $summary"
done
exit $status
