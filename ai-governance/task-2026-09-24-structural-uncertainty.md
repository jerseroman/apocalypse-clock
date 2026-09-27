# Task

Sample the structural choices of the functional cascade (cascade threshold, criticality tier values, dependency weights, dependency lags and growth-class assignment) in every main Monte Carlo run, so that model-structure uncertainty becomes part of the Dynamic Cascade result.

## Change class

MODEL.

The owner adopted the structural review proposal "Strukturna negotovost v Monte Carlo: vzorčiti tudi prag košarice (0,4–0,6), stopnje pomembnosti, uteži povezav (Dirichlet), zamike (0–5 let) in razred rasti. Negotovost modela bi tako vključili v rezultat." and instructed "nA TOČKO 2" (2026-09-24).

The proposal fixes the threshold range, the lag range and the Dirichlet family. The remaining choices were made by the assistant and are disclosed: criticality tier values ±0.5, Dirichlet concentration 2 per edge, lags uniform over whole years, growth class one step down or up with probability 25% each on an extended class ladder.

This entry was written during implementation rather than before the first edit.

## Files touched

- `src/app.js`: new `STRUCTURAL_UNCERTAINTY`, `STRUCTURAL_COMPONENTS`, `structuralComponentsOf`, `growthClassFactors`, `createStructuralContext`, `applyStructuralUncertainty`; `runMC` (per-run structural draws and run parameters); `traceCascadeTriggers` (same draws, per-run threshold and group counts); `renderConditionalTriggers`, `renderConditionalScenario` and new `conditionalStructureText`; `P` and `snapshotParams` (`structuralUncertainty`); `createExecutionSnapshot` (model-constant text and `structuralUncertainty`); `MODEL_VERSION`; three copy strings that described fixed criticality.
- `index.html`, `404.html`: version label, `#conditionalStructure`, three copy passages. `bundledSources` blocks untouched.
- `package.json`, `package-lock.json`: version 1.4.0.
- `tests/headline-determinism.spec.js` (new golden; 1.3.0 golden pinned with structural sampling off), `tests/functional-integration.spec.js` (model version, CDF legend golden), `tests/structural-uncertainty.spec.js` (new).
- `README.md`, `CHANGELOG.md`, `docs/METHODOLOGY.md`, `docs/LIMITATIONS.md`, `docs/MODEL_SCOPE.md`, `ai-governance/model-invariants.md`, `ai-governance/review-log.md`.

## Files explicitly NOT touched

- Dataset JSON files and both `bundledSources` blocks; `src/cascade-model.js`; standalone horizon functions; aggregators; `summarize*`, `buildCdf`, `quantile`; the PRNG implementation.
- The sensitivity diagnostics (OAT, Sobol/Jansen, SMAA, veto, tail shock, exploratory), which keep the declared structure.
- `CITATION.cff` and `.zenodo.json`, which describe the published 1.3.0 release and are updated at release time.
- The `Dynamic cascade P90` headline-rule string and all export field names.

## Affected outputs

- DOM nodes: clock values, `#conditionalScenario` content, version label, the Model horizon markers (compensatory P10/P50/P90 2046/2054/2066 to 2046/2055/2068; graph heuristic P50 2076 to 2079; max-rule and top-threat P50 unchanged), the compensatory probability tiles (P ≤ 2050 31% to 29%, horizon-coded SD 7.9 to 9.0 years, P50 rule range 45 to 48 years), the main CDF and the domain and threat statistics.
- Export fields: `executionSnapshot.parameters.structuralUncertainty` and `executionSnapshot.modelConstants.structuralUncertainty` added; `cascadeRule` and `cascadeWeightMeaning` text updated. No field renamed.
- Headline-related numbers: yes. Baseline + Expert + AC-1.2.6-2026 + 3000: P10/P50/P90 2033/2036/2042 to 2034/2038/2044.
- Determinism under default seed: preserved, with a new golden.

## Numerical risk

- Invariants affected: fixed criticality tiers, the 0.50 trigger, fixed dependency shares and the one-year lag become declared central values with per-run sampling; growth-class sampling multiplies positive g by a positive class ratio without reconversion.
- The cascade engine accepts non-integer weights and integer lags; the Dirichlet draw keeps each target's weight total, so it stays at most one; shifted growth passes through the existing effective-growth clamps, and each threat's threat_specific_cap cuts the upward class move short for Climate Breakdown (0.035) and AI (0.04) at their central growth of 0.03, so for those two threats a move down weighs more than a move up.
- Structural draws use separate seeded streams, one per component, so parameter and event draws stay paired. With structural sampling off, every crossing array, threat statistic and functional statistic is bit-identical to 1.3.0 (checked by hash against the 1.3.0 application).

## Validation strategy

- Full `validation-checklist.md`, including the headline-determinism check (step 8).
- New golden 2034/2038/2044 recorded; the 1.3.0 golden stays pinned with structural sampling off.
- Unit tests for component switching, growth-class factors, sampled ranges, tier order, weight totals, whole-year lags, shift frequencies and input immutability.

## Rollback plan

`git revert` the resulting commit. Setting `P.structuralUncertainty = false` reproduces the 1.3.0 outputs without reverting.

## Status

validated
