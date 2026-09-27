# Task

Let each threat's latent functional pressure turn in a sampled year, peaking and then declining, and let failed cascade nodes recover after such a turn, so that the main Monte Carlo can represent improvement and runs in which the threshold is never reached.

## Change class

MODEL.

The owner adopted the structural review proposal "Omogočiti izboljšanje: razpon rasti g naj vključuje tudi negativne vrednosti, dodati je treba okrevanje. Zgodovinski primeri obstajajo: ozonska luknja, jedrski arzenali (z okoli 70.000 bojnih glav leta 1986 na okoli 12.000 danes). Šele takrat postane »>2100« realen izid." with the constraint "kAR JE ZGODOVINSKEGA NE UPORABLJAMA TOREJ NE OZIAMA SE NA ZGODOVINSKE PODATKE KER SMO MLADA TEHNOLOŠKA CIVILIZACIJA IN NI PODAKOV", and instructed "GREMA NA 3" (2026-09-24). No historical data or historical examples are used to set any value.

Design choices put to the owner, each answered with the recommended option:

- How the turn is drawn: "Vsaka grožnja zase, 50 %". Each threat independently has a 50% chance of a turn by 2100, in a year drawn uniformly from 2027 to 2100.
- How failed threats recover: "Po nepovratnosti". After a turn the pressure falls at the rate it rose. A failed threat recovers once its drive has fallen far enough below its level at failure; how far is set by the dashboard's reversibility class. Irreversible threats do not recover before 2100.

Values chosen by the assistant and disclosed: the drive must fall 25% for reversible and 50% for partly reversible threats; the class is the declared (not per-run sampled) reversibility class shown on the threat pills.

This entry was written before the first code edit. A scratchpad prototype (no repository edits) measured the turn variants first.

## Planned design

- Sampling: a separate seeded stream `<seed>:turn`; two draws per threat per run in THREATS order, whether or not the threat turns, so the stream stays aligned.
- Pressure after a turn at year T mirrors its rise: pressure(T + k) = pressure(T) / (1 + g)^k. Growth before the turn is unchanged and stays positive.
- Continuous and regime horizons: unchanged when the crossing year is at or before T; no crossing (coded 2101) when it would come later, because pressure peaks below the threshold.
- Event horizons: the hazard follows the same mirrored pressure path; the single process draw per event threat is unchanged, so parameter, structural and process draws stay paired.
- Cascade engine: optional node fields `turnYear` and `recoveryDrop`. After its turn, an active node recovers when own pressure plus vulnerability times upstream exposure is at most (1 - recoveryDrop) times the smaller of 1 and its value at activation. Recovery is evaluated before activation each year, to a fixed point. A recovered node can be induced again but not spontaneously activated again. Lags count from an upstream node's latest activation. First activation years, the first-crossing year and the headline estimand are unchanged.
- New outputs: per run, whether the system is above the threshold in 2100 and the first year it fell back below; summarized as the share of crossing runs back below the threshold in 2100.
- Switch: `P.pressureTurns` (default true). `false` reproduces model 1.4.0 exactly; with structural sampling also off, model 1.3.0.
- Deterministic views and the sensitivity diagnostics keep the declared continued-pressure path.

## Files touched

- `src/cascade-model.js`: `prepare` (validation of the optional fields), `pressureRatio` (mirrored path after a turn), `simulate` (recovery, spontaneous activation once, latest activation years for lags, activity intervals, end state), `firstCrossingFromActivationYears` (optional activity intervals).
- `src/app.js`: new `PRESSURE_TURNS`, `createPressureTurnContext`, `applyPressureTurns`, `turnedHorizon`; `sampleEventHorizon` and `computeThreatHorizon` (optional turn year); `enrichMonteCarloThreats` and `applyGlobalThresholdToSample` (pass the turn year); `functionalCascadeNodes` (turn fields); `computeDomainFunctionalCrossing` (activity intervals); `runMC` (turn draws); `createMonteCarloAccumulator`, `recordMonteCarloSample`, `summarizeMonteCarloAccumulator` (end state and recovery summary); `traceCascadeTriggers` (same turn draws); conditional-scenario text; `P`, `snapshotParams` and `createExecutionSnapshot` (`pressureTurns`); `MODEL_VERSION`; export copy that called activation absorbing.
- `index.html`, `404.html`: version label, two new notes in `#conditionalScenario`. `bundledSources` blocks untouched.
- `package.json`, `package-lock.json`: version 1.5.0.
- Tests: `tests/headline-determinism.spec.js` (new golden; 1.4.0 and 1.3.0 goldens pinned with the switches off), `tests/functional-integration.spec.js` (model version), `tests/pressure-turns.spec.js` (new).
- `README.md`, `CHANGELOG.md`, `docs/METHODOLOGY.md`, `docs/LIMITATIONS.md`, `docs/MODEL_SCOPE.md`, `ai-governance/model-invariants.md`, `ai-governance/review-log.md`.

## Files explicitly NOT touched

- Dataset JSON files and both `bundledSources` blocks, including their text that positive-only growth omits recovery and that activation is absorbing; the documentation explains that the model now adds sampled turns on top of the dataset's continued-pressure priors.
- `effectiveRiskGrowthForThreat` and the growth caps; growth before a turn is unchanged.
- Aggregators, `summarizeCrossings`, `buildCdf`, `quantile`, the PRNG, structural sampling, deterministic horizons and views, sensitivity diagnostics.
- `CITATION.cff` and `.zenodo.json` (updated at release time).
- The `Dynamic cascade P90` headline-rule string and all export field names.

## Affected outputs

- DOM nodes: clock values, `#conditionalScenario` content, horizon markers and probability tiles, version label.
- Export fields: `executionSnapshot.parameters.pressureTurns`, `executionSnapshot.modelConstants.pressureTurns` and `functionalResults.cascadeRecovery` added; engine results, including `functionalResults.deterministic`, gain `recoveryYears`, `activeIntervals`, `aboveThresholdAtEnd` and `backBelowYear`; the cascade time meaning text updated. No field renamed.
- Headline-related numbers: yes. Baseline + Expert + AC-1.2.6-2026 + 3000: Dynamic Cascade P10/P50/P90 2034/2038/2044 to 2034/2038/2046, headline 2044 to 2046; 6 of 3000 runs (0.2%) no longer reach the threshold by 2100. Domain P50 2046/2038/2041 to 2047/2038/2041. Compensatory 2046/2055/2068 to 2047/2058/2079; graph heuristic 2064/2079/2097 to 2071/2092/>2100; max-rule 2026/2031/2036 to 2026/2031/2037. None of the 2994 crossing runs is below the threshold again in 2100.
- Determinism under default seed: preserved, with a new golden.

## Numerical risk

- Touches growth_rate logic (numerical-integrity-rules.md): pressure may now decline after a sampled turn. Growth before the turn, its sampling and its clamps are unchanged.
- Touches the no-crossing <= 2100 logic: turned threats can be censored at 2101, and the Dynamic Cascade can now be censored; censored runs stay in all denominators and quantiles.
- Affects the invariants that g stays positive and that activation is absorbing. First passage remains the estimand of every clock and horizon; recovery changes which nodes count toward functional loss and exposure after they recover.
- Engine behaviour without the optional fields must stay bit-identical (checked by the 1.4.0 and 1.3.0 goldens with the switches off).

## Validation strategy

- Full `validation-checklist.md`, including the headline-determinism check (step 8).
- New golden recorded; the 1.4.0 golden pinned with turns off and the 1.3.0 golden with turns and structural sampling off.
- Unit tests: turn draw frequency and year range, off switch and input immutability, mirrored horizons for continuous and event threats, engine recovery timing, no recovery for irreversible nodes, identical engine output without the optional fields, domain reconstruction with activity intervals.

## Rollback plan

`git revert` the resulting commit. Setting `P.pressureTurns = false` reproduces the 1.4.0 outputs without reverting.

## Status

validated
