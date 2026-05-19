# Validation Checklist

Run after every change. Order matters — fastest checks first, so failures surface early.

Read together with [change-policy.md](change-policy.md). Steps marked "MODEL/LOGIC" or "MODEL/DATASET" are required only for those classes.

## 1. Lint and parse

```
npm run check:js
```

Runs `node --check` over every JS file under `src/`, `scripts/`, and `tests/`. Must pass.

## 2. Dataset integrity

```
npm run validate:data
```

Enforces:
- `_meta.schema_version === "1.7.1"` (or the current schema version on a DATASET change)
- 23 threats, 184 parameters
- `lo <= mu <= hi` for every parameter
- required HTML metadata present
- byte-equal JSON across `data_v1_7_1metadata_revision.json`, `<script id="bundledSources">` in `index.html`, and the same in `404.html`

Must pass.

## 3. Link format

```
npm run check:links
```

Parses every `href`, `src`, and dataset `url`. For any added URL, also run:

```
LIVE_LINK_CHECK=1 npm run check:links
```

Must pass.

## 4. Smoke

```
npm run test:smoke
```

Playwright: page loads, headline year renders, no console errors or warnings, mission toggle works.

Must pass.

## 5. Aggregate

```
npm run check
npm test
```

Both umbrella commands must pass.

## 6. Manual sanity — LOGIC and MODEL only

Start a local server and open the page:

```
python -m http.server 8766 --bind 127.0.0.1
```

Verify:
- `#cascadeHeadlineYear` populates after pressing Run
- Priority cards toggle MC ↔ Weibull
- JSON and CSV exports download and parse
- Every weight profile applies
- Every scenario applies

## 7. Invariant diff — COSMETIC and LOGIC only

```
git diff
```

Inspect against the regions listed in [protected-paths.md](protected-paths.md). The diff inside those regions must be empty. If non-empty, reclassify as MODEL and stop.

## 8. Headline-determinism check — LOGIC and MODEL

Under default settings — Baseline scenario, Expert weight profile, default seed `AC-1.2.6-2026`, `nSim=3000`:

- record the deterministic Dynamic-cascade year and `mcRes.ensemble.dynamicCascade.{p10, p50, p90}` before the change
- record the same after the change
- for LOGIC: assert bit-equal
- for MODEL: explain every drifted digit in [review-log.md](review-log.md) and update the recorded golden value

## 9. Sentinel and NaN sweep — MODEL and DATASET

Confirm:
- no headline integer reads `2101`
- `fmtY(p90)` returns `>2100` whenever `p90 > YE`
- `probabilityByDisplayedYear` returns a finite number for any `mcRes` produced by a normal run
- console shows no warnings during a full run

## 10. Record the run

Append one line to [review-log.md](review-log.md) in the format defined in that file.
