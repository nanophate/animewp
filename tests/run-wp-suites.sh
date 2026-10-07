#!/bin/sh
# Run the WordPress integration suites inside the wp-env Docker site.
# They create and modify content, so use only the disposable wp-env database.
#   npm run env:start && npm run test:wp
set -eu
dir=wp-content/animewp-tests
origin=http://wordpress   # the WordPress container as seen from the CLI container
status=0
for suite in wp-smoke wp-fixtures wp-regressions-v12 wp-render wp-http; do
	# wp-env occasionally fails its own Docker request ("lookup:" timing dump); retry once.
	for attempt in 1 2; do
		suite_status=0
		output=$(npx wp-env run cli -- env ANIMEWP_HTTP_ORIGIN="$origin" wp eval-file "$dir/$suite.php" 2>&1) || suite_status=1
		case "$output" in *"lookup:"*) [ "$attempt" = 1 ] && sleep 3 && continue ;; esac
		break
	done
	[ "$suite_status" = 0 ] || status=1
	summary=$(printf '%s' "$output" | python3 -c '
import json, re, sys
text = "\n".join(line for line in sys.stdin.read().splitlines() if not line.startswith(("ℹ", "✔")))
start = min([i for i in (text.find("["), text.find("{")) if i != -1] or [-1])
try:
    data = json.loads(text[start:]) if start != -1 else None
except ValueError:
    data = None
if isinstance(data, dict):
    data = next((v for v in data.values() if isinstance(v, list) and v and isinstance(v[0], dict) and "pass" in v[0]), data)
if not isinstance(data, list):
    print("ran (no pass/fail list)" if data is not None and "Fatal" not in text else "ERROR: " + text[-400:]); sys.exit(0)
results = data
failed = [r for r in results if not r.get("pass")]
print(f"{len(results) - len(failed)}/{len(results)} passed" + "".join(f"\n    FAIL {r}" for r in failed))
')
	echo "$suite: $summary"
	case "$summary" in *FAIL*|ERROR*) status=1 ;; esac
done
exit $status
