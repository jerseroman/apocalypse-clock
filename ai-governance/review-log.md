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
