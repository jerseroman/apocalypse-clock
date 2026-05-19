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
