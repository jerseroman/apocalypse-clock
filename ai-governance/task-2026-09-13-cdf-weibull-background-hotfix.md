# Task

Correct the main cumulative chart binding, make censored Weibull diagnostics readable instead of displaying JavaScript-style `undefined`, align the domain titles and explanatory copy with their intended meaning, and remove the visible page-background colour mismatch without changing model or dataset versions.

## Change class

LOGIC (with COSMETIC presentation changes).

The owner explicitly requested these corrections and publication without creating a new version: "KO VSE KONČAŠ objavi - updejtaj github in spletno stran vendar ne kot novo verzijo."

## Files touched

- `src/app.js`: `drawCDF`, CDF legend rendering, domain-card rendering helpers, domain display names, and paired-horizon explanatory copy.
- `index.html`, `404.html`: main CDF heading, explanation and accessibility label; bundled dataset blocks remain byte-identical.
- `tests/*`: focused binding, censoring-label, title, background and regression assertions.
- `README.md`, `CHANGELOG.md`, `ai-governance/review-log.md`: same-version hotfix documentation and validation record.

## Files explicitly NOT touched

- No model functions, constants, scores, thresholds, growth logic, sampling, PRNG, aggregation, cascade, quantile interpolation or censoring semantics listed in `protected-paths.md`.
- No dataset values, bundled source-map payloads, threat taxonomy, dependency graph, functional criticality or service memberships.
- No package, model or dataset version number.
- No export field names or the protected `Dynamic cascade P90` headline-rule string.

## Affected outputs

- DOM nodes: `#cdfCanvas`, `#cdfLegend`, CDF heading/copy, `#aggregateRow`, `#cascadeHeadlineNote`, and application background.
- Export fields: none.
- Headline-related numbers: no.
- Determinism under default seed: preserved.

## Numerical risk

- The chart must use the existing `ensemble.dynamicCascade` summary rather than the top-level compensatory summary. No distribution is recalculated.
- Right-censored Weibull inputs must remain unidentified. The UI may show honest bounds or plain-language status but must not invent a post-2100 date, silently drop censored threats, or change quantile definitions.
- P10/P50/P90 ordering, 2101 sentinel handling, NaN/null handling and displayed rounding require focused regression checks.

## Validation strategy

- Run all items 1-8 in `validation-checklist.md`, including the full Playwright suite and the pinned headline-determinism check.
- Add focused tests proving the main CDF series/markers/legend use Dynamic Cascade P10/P50/P90, and that Weibull mode contains no `undefined` or `NaN` while retaining right-censoring disclosure.
- Verify desktop and mobile geometry plus the full-width `#14181e` application background after deployment.
- No new numerical golden is recorded because model outputs must remain bit-identical.

## Rollback plan

Revert the resulting Git commit or restore commit `f9c40dbddc6cc0d2249b14d1af9ea7e67b59eda8` from `C:/Users/error/Desktop/Apocalypse Clock backups/pre-cdf-weibull-background-hotfix-20260913/apocalypse-clock-f9c40db-clean.zip`.

## Status

validated
