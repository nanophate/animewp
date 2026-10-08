# Disposable browser and real ZIP checks

The `Browser and real ZIP upgrades` workflow runs Chromium, Firefox and the
WebKit engine. WebKit coverage is not a real Safari device test. Every job has
one Playwright worker and its own WordPress database. Chromium also runs against
the minimum supported WordPress/PHP pair.

The workflow first verifies the two existing 1.3.0 release ZIPs against that
release's SHA256SUMS. It installs them, seeds saved content and settings, then
uses WP-CLI `install --force` with the current build's real ZIPs. It verifies
versions and exact preservation of the page, saved template, Global Styles,
font settings and front-page options. This initial step is a manual ZIP
replacement: 1.3.0 has no self-hosted update client.

The browser tests then cover core-only and plugin pages at desktop and 375px,
heading/anchor visibility, carousel input and keyboard behavior, dialog focus,
video network opt-in, combined and reduced motion, no-JavaScript fallback, and
Post/Site Editor iframe editing and saving. The last three tests use the standard
WordPress Updates screen to install a test-only 99.0.0 ZIP with the optional
plugin inactive or another theme active, and to reject a mismatched checksum.

`prepare.py` creates a local wp-env override with physical installation
directories, avoiding source bind mounts that cannot be replaced by WordPress.
It refuses to overwrite an existing override. The MU fixture intercepts only
the exact AnimeWP feed/package URLs and only with `ANIMEWP_BROWSER_QA` enabled.
The live feed is never needed. None of the fixtures are included in releases.

For a local run, use a **disposable checkout** with Docker, Node/npm from the
workflow and access to the old GitHub release:

```sh
npm ci
npm run build
python3 scripts/package.py
python3 tests/browser/prepare.py
gh release download v1.3.0 --repo nanophate/animewp --dir artifacts/browser-fixtures --pattern animewp-1.3.0.zip --pattern animewp-blocks-1.3.0.zip --pattern SHA256SUMS
python3 tests/browser/verify-baseline.py
npx --no-install playwright install --with-deps chromium
npx --no-install wp-env start
sh tests/browser/setup.sh
npx --no-install playwright test --config tests/browser/playwright.config.js
```

Select an engine with `ANIMEWP_BROWSER=firefox` or `webkit`; install that engine
before running it. Set `ANIMEWP_WP_BRANCH` and `ANIMEWP_PHP_VERSION` before
`prepare.py` to choose the WordPress/PHP pair. The fixed default admin credentials
belong only to wp-env's disposable tests site. The setup and cleanup scripts
replace installed files and mutate that site's options/content.

Only manually selected screenshots and sanitized result/version JSON go into
`artifacts/browser-results` and the workflow artifact. Traces, HAR, videos,
storage state, cookies, request headers and full error DOM dumps are not uploaded.
The Playwright list reporter still prints ordinary failure diagnostics to the
Actions log. Actual browser execution requires the CI/Docker runtime; test
discovery or syntax checks alone are not an end-to-end result.
