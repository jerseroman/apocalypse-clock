# Review Log

Append-only record of accepted, rejected, or reverted changes.

Do not edit prior entries. Do not delete prior entries. Add new entries at the bottom of the table.

## Format

- `date`: YYYY-MM-DD
- `task`: one-line title matching the corresponding [task-template.md](task-template.md) entry
- `class`: COSMETIC | LOGIC | MODEL | DATASET (see [change-policy.md](change-policy.md))
- `files`: comma-separated list of files touched
- `result`: accepted | rejected | reverted
- `note`: optional pointer to the changelog entry, PR number, or authorizing instruction

## Entries

| date | task | class | files | result | note |
|------|------|-------|-------|--------|------|
| 2026-05-19 | Headline tooltip and long-note wording revision | COSMETIC | src/app.js (lines 5236, 5243) | accepted | Addresses audit items A4, C2, C5, E1, E2, E3, E4 from methodological-review.md §2. No numerics changed. Validation steps 1-4 and 7 passed. |
| 2026-05-19 | First unit-test layer: quantile, fmtY, probabilityByDisplayedYear | COSMETIC | tests/units.spec.js (new) | accepted | Playwright page.evaluate against the live page; pins current behaviour, no source-file edits, no new dependencies. Validation steps 1-4 and 7 passed (8 JS files, 184 dataset parameters, 124 URL formats, 4 tests passing). |
| 2026-05-20 | Headline-determinism Test A: Baseline + Expert + AC-1.2.6-2026 + nSim=3000 | COSMETIC | tests/headline-determinism.spec.js (new) | accepted | Pins golden values cascadeP10=2037, cascadeP50=2040, cascadeP90=2045, headline='2045' against v1.2.7. Warm-up + pinned run architecture isolates the pinned run from runSelfTests PRNG contention. No source-file edits, no new dependencies. Validation steps 1-4 and 7 passed (9 JS files, 184 dataset parameters, 124 URL formats, 5 tests passing). |
| 2026-05-20 | Headline-determinism Test B: two-run repeatability | COSMETIC | tests/headline-determinism.spec.js (added one test) | accepted | Adds a repeatability test asserting two consecutive runs in one session produce bit-identical Dynamic-cascade outputs. Compares the two runs only against each other; pins no golden value, so it cannot drift on intentional model revision. Golden values from Test A unchanged. No source-file edits, no new dependencies. Validation steps 1-4 and 7 passed (6 tests passing). |
| 2026-05-20 | Share menu links preserve default navigation | LOGIC | src/action-delegation.js, tests/smoke.spec.js | accepted | Fixes data-action close-share-menu anchor handling so share links close the menu without blocking navigation. No model, data, bundledSources, or share URL changes. Validation steps 1-4 passed (9 JS files, 184 dataset parameters, 124 URL formats, 6 tests passing). |
| 2026-05-20 | World Bank LPI source URL refresh | DATASET | data_v1_7_1metadata_revision.json, index.html bundledSources, 404.html bundledSources | accepted | Source-refresh only: replaced three broken World Bank LPI URL fields; no mu, lo, hi, threshold, growth_rate, or model values changed. check:js, validate:data, check:links, and test:smoke passed; global LIVE_LINK_CHECK still fails on pre-existing non-LPI external URLs. |
| 2026-05-20 | Share popover layout and prefilled share text | LOGIC | index.html, src/styles.css, src/action-delegation.js, tests/smoke.spec.js | accepted | Fixes Share as a compact overlay, preserves share-link navigation, and adds prefilled text for X/Facebook/Telegram/Reddit/LinkedIn. No model, calculation, dataset, or bundledSources values changed. check:js, validate:data, check:links, and final test:smoke run passed. |
| 2026-05-20 | Repository documentation infrastructure | COSMETIC | README.md, CONTRIBUTING.md, SECURITY.md, docs/METHODOLOGY.md, docs/MODEL_SCOPE.md, docs/VALIDATION.md, docs/LIMITATIONS.md, docs/CHANGE_CLASSES.md | accepted | Adds public documentation summarizing existing governance, validation, scope, limitations, contribution, and integrity-reporting rules. No model, calculation, dataset, bundledSources, package, or workflow files changed. check:js, validate:data, and test:smoke passed. |
| 2026-05-20 | Pull request checklist template | COSMETIC | .github/pull_request_template.md | accepted | Adds a practical PR checklist derived from existing governance rules. No source code, model logic, dataset, HTML, package, or workflow files changed. check:js, validate:data, and test:smoke passed. |
| 2026-05-20 | Zenodo metadata support | COSMETIC | .zenodo.json | accepted | Adds Zenodo metadata for version 1.2.7 without a license field because the custom source-available non-commercial fork license has no confirmed Zenodo identifier. No model, data, source, test, HTML, package, README, CITATION, or CHANGELOG changes. check:js, validate:data, check:links, and test:smoke passed. |
