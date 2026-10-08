#!/bin/sh
# Regenerate AnimeWP Blocks translation files with WP-CLI inside the wp-env
# Docker container (npm run env:start first). No PHP is needed on the host.
#
#   1. build, so string references point at build/ (what WordPress loads)
#   2. extract the POT, 3. merge new strings into each PO,
#   4. compile MO (PHP strings) and JSON (one file per editor script).
# Translate new entries in languages/*.po, then run this again.
set -eu
dir=wp-content/plugins/animewp-blocks
wp() { npx wp-env run cli -- wp "$@"; }

npm run --silent build
wp i18n make-pot "$dir" "$dir/languages/animewp-blocks.pot" --domain=animewp-blocks --exclude=src,node_modules \
	--headers='{"Report-Msgid-Bugs-To":"","Language-Team":""}'
wp i18n update-po "$dir/languages/animewp-blocks.pot" "$dir/languages"
wp i18n make-mo "$dir/languages"
wp i18n make-json "$dir/languages" --no-purge

# make-json does not delete catalogs left behind by removed or renamed blocks.
python3 - <<'PY'
import json
from pathlib import Path
plugin = Path('plugins/animewp-blocks')
for path in (plugin / 'languages').glob('animewp-blocks-*.json'):
    source = json.loads(path.read_text()).get('source', '')
    if isinstance(source, str) and source.startswith('build/') and not (plugin / source).is_file():
        path.unlink()
        print('Removed obsolete translation catalog:', path.name)
PY
