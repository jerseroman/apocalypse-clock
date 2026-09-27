# Task

Show the paired P50/P90 clocks in context: add a "Conditional scenario" block below them with the cumulative first-crossing curve P(threshold reached by year X | model assumptions), the range across the four aggregation rules, the share of runs still below the threshold in 2100, and which essential-service basket triggers the clock. The clocks keep their appearance and values.

## Change class

LOGIC (new UI panel, new render helper and a diagnostic that only calls model functions).

The owner asked for the honest-display proposal and for the two clocks to stay exactly as they are: "TEH 2 UR VIDEZA NE SPREMINJAJ GLEJ SLIKO ! TO OSTANE. ZAČNI DELATI 1" (2026-09-24).

## Files touched

- `src/app.js`: new `traceCascadeTriggers` and `cascadeBasketLayout` (diagnostic replay), new `renderConditionalScenario` and its helpers; `updateUI` and the window resize handler call the renderer; `runAll` stores the inputs the replay needs on the result object.
- `index.html`, `404.html`: new `#conditionalScenario` block inside `#heroAbsoluteClock`, after `#cascadeHeadlineNote`. `bundledSources` blocks stay byte-identical.
- `src/styles.css`: styles scoped to `.conditional-scenario`.
- `tests/conditional-scenario.spec.js` (new).
- `ai-governance/review-log.md`: validation record.

## Files explicitly NOT touched

- `runMC`, `createMonteCarloAccumulator`, `enrichMonteCarloThreats`, `applyGlobalThresholdToSample`, `recordMonteCarloSample`, all `summarize*` functions, `buildCdf`, `quantile`, `probabilityByDisplayedYear`, `fmtY`, the aggregators and `src/cascade-model.js`.
- The paired clock markup, styles and rendering (`#cascadeHorizonPair` and its children).
- Dataset values, `bundledSources`, thresholds, weights, service memberships, dependency graph, PRNG and seed.
- Export fields and the `Dynamic cascade P90` headline-rule string.

## Affected outputs

- DOM nodes: new `#conditionalScenario`, `#conditionalCdfChart`, `#conditionalLegend`, `#conditionalCensored`, `#conditionalRules`, `#conditionalRulesNote`, `#conditionalTriggers`.
- Export fields: none.
- Headline-related numbers: no.
- Determinism under default seed: preserved. The replay uses its own RNG context with the headline seed and does not draw from the headline stream.

## Numerical risk

- The curve and the rule table read the existing `ensemble` summaries; nothing is re-summarized.
- The trigger attribution repeats `runMC`'s draw order (per-threat `sampleThreatNumerics`, then the process draws of `enrichMonteCarloThreats`) with the same scenario, seed and run count, then runs `simulateFunctionalCascade` without `collectAll`, which returns the same first-crossing snapshot. The sorted replayed crossing years must equal `ensemble.dynamicCascade.crossing` element by element; otherwise the attribution is withheld and the panel says so.
- A run counts for every basket whose loss had reached the cascade threshold in the crossing year, so basket shares can add up to more than 100%. The panel states this. Shares are taken over runs that cross by 2100.

## Validation strategy

- Run all items in `validation-checklist.md`, including the full Playwright suite and the pinned headline-determinism check (step 8).
- New test: panel visible, four rule rows, dynamic-cascade row equal to the clocks, trigger replay marked consistent, no console errors or warnings.
- Visual check of the clock card on desktop and phone widths.
- No new golden value: model outputs must stay bit-identical.

## Rollback plan

`git revert` the resulting commit. No data or version changes to restore.

## Status

validated
