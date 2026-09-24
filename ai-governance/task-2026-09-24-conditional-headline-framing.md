# Task: conditional framing, trigger attribution and method range for the headline clocks

## Task

Make the two headline clocks (Dynamic cascade P50 and P90) state the condition they depend on, show which threats and which basket actually trigger the crossing, and show how far the P50 moves across the four aggregation methods. The two clocks and their numbers stay exactly as they are.

## Change class

LOGIC. No model equation, constant, dataset value, sampling rule or headline number changes.

Owner authorization (repository owner, 2026-09-24), for items 2 and 3 below only: "Append-only diagnostic fields may be added to `createMonteCarloAccumulator`, `recordMonteCarloSample` and `summarizeMonteCarloAccumulator`, provided they consume no random draws and change no existing value. `headline-determinism.spec.js` must pass with the existing golden values, unchanged."

## Background

A code review on 2026-09-24 (Baseline, Expert, 1000 runs) found:

- The deterministic Baseline crossing year (2036) is reached with `climate` as the only active threat: the `ecological_life_support` basket reaches 0.50 while global active mass is 5%.
- About 86% of Monte Carlo crossings occur through the `ecological_life_support` basket alone. That basket has two overlap groups (`climate`, `ecosystem_integrity`), so one active group reaches the 0.50 threshold.
- Growth is positive-only and activation is absorbing, so 100% of runs cross by 2050. The dates are conditional on continued pressure without recovery.
- The four aggregation methods disagree: for example, the Compensatory P50 is 2054 while the Dynamic cascade P50 is 2036.

Visitors currently read "Projected horizon 2036 / 2042" as a forecast. These three changes make the condition and the driver visible next to the numbers.

## Changes

### 1. Conditional title (COSMETIC part)

- `index.html` and `404.html`, `#heroAbsoluteClock`: change the kicker `Projected horizon` to `Conditional horizon`.
- Directly under `.cascade-headline-label`, add a line with id `cascadeConditionNote`:
  "If all modeled pressures keep growing at the assumed rates, with no recovery or adaptation."
- Keep `.cascade-headline-label` and every occurrence of `Dynamic cascade P90` unchanged. The latter is a protected identifier; see `ai-governance/protected-paths.md`.
- Style the new line with the existing muted hero text style in `src/styles.css`. It must fit at phone width.

### 2. What triggers the clock (LOGIC, uses the authorization above)

- In `recordMonteCarloSample`, `functional` (the result of `simulateFunctionalCascade(..., { collectAll: true })`) already carries the crossing snapshot: `year`, `activeThreats`, `activeMass` and `serviceLosses`. For each run with `functional.year <= YE`, record the following. Nothing else may be recomputed or resampled.
  - **Triggering baskets:** `global` if `activeMass >= threshold`, plus every service in `serviceLosses` with a value `>= threshold`. Use the same threshold as the run (`params.cascadeThreshold ?? 0.50`).
  - **Active threats at the crossing year:** `activeThreats`.
- Store the counts in a new accumulator field, for example `cascadeTriggers: { runs: 0, baskets: {}, threats: {} }`.
- In `summarizeMonteCarloAccumulator`, expose them as `cascadeTriggerShares` with these fields:
  - `crossingRuns`;
  - `baskets` and `threats`: each id mapped to its share of crossing runs;
  - `meaning`: "Share of Monte Carlo runs that crossed by 2100 in which this basket reached the threshold, or this threat was active, at the Dynamic cascade crossing year. Diagnostic attribution, not causal proof."
- Under the clocks, add an element with id `cascadeTriggerNote` that renders, for example:
  "What triggers the clock: ecological life support in 86% of crossing runs · most often active: climate 8x%, biodiversity 1x%, …"
  Show the dominant basket and the top 3 threats, using the threat display names. If no run crossed, show "No crossing within 2100 in this run set."
- Add the new summary to the JSON export under a new key. Do not rename or reorder existing export fields.

### 3. Method range (LOGIC, rendering only)

- Add an element with id `cascadeMethodRangeNote` under `cascadeTriggerNote`:
  "Across the four aggregation methods, P50 ranges from {min} to {max}."
  Take min and max over `mcRes.ensemble.{compensatory,maxRule,graphWeighted,dynamicCascade}.p50` and format them with `fmtY`, so a censored value shows as `>2100`.
- Add a tooltip naming each method's P50, and link to the existing "Model horizon markers" section.

## Files touched

- `index.html`, `404.html`: the `#heroAbsoluteClock` markup only. Never touch the `bundledSources` block.
- `src/app.js`:
  - `createMonteCarloAccumulator`, `recordMonteCarloSample`, `summarizeMonteCarloAccumulator`: append-only;
  - the headline render block around `cascadeHeadlineNote`;
  - `exportClockJSON`.
- `src/styles.css`
- `tests/`: new assertions, described under Validation strategy.
- `CHANGELOG.md`, `ai-governance/review-log.md`

## Files explicitly NOT touched

- `src/cascade-model.js`
- the dataset JSON and the embedded `bundledSources` copies
- `computeHorizon`, `sampleThreatNumerics`, `enrichMonteCarloThreats`, `summarizeCrossings`, `quantile`, `fmtY`, `probabilityByDisplayedYear`
- existing export field names and `headlineRule`

## Affected outputs

- **DOM nodes:** `#cascadeConditionNote`, `#cascadeTriggerNote` and `#cascadeMethodRangeNote` are new; the kicker text in `#heroAbsoluteClock` changes.
- **Export fields:** a new JSON key for trigger shares; existing keys are unchanged.
- **Headline-related numbers:** no.
- **Determinism under default seed:** preserved.

## Numerical risk

The attribution must be read from the existing crossing snapshot. It must not call the RNG, rerun the cascade or change the order of any draws. Any change to the golden values in `headline-determinism.spec.js` means the change is wrong. Revert it; do not update the golden values.

## Validation strategy

1. Start the app with `npm start` (http://127.0.0.1:8766/index.html) and check the page visually at desktop and phone width.
2. Run `npm test`, which runs the checks and all Playwright tests. `headline-determinism.spec.js` must pass unchanged.
3. Add tests:
   - The three new elements are visible after the model loads.
   - `#cascadeTriggerNote` names a basket and at least one threat.
   - Basket shares are each between 0 and 1, and `crossingRuns` equals the number of Dynamic cascade samples `<= 2100`.
   - Two consecutive runs with the same seed give identical `cascadeTriggerShares`.
   - The method-range min is `<=` the Dynamic cascade P50, which is `<=` the max.
4. Add a CHANGELOG entry and a review-log entry, following `ai-governance/change-policy.md`.

## Rollback plan

`git revert <commit>`. No dataset or schema changes.

## Status

drafted
