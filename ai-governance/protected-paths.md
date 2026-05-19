# Protected Paths

Mechanical, grep-friendly companion to [project-specification.md](project-specification.md) and [model-invariants.md](model-invariants.md).

Lists what must not change without the gates in [change-policy.md](change-policy.md).

Line numbers are accurate as of Apocalypse Clock v1.2.7. If the file drifts, the function name is the primary reference, not the line number.

## Whole-file lock

Must not be edited without owner approval and a matching changelog or version bump:

- `data_v1_7_1metadata_revision.json`
- `docs/MODEL_SCOPE.md`
- `Statement.md`
- `CITATION.cff`
- `NOTICE.md`
- `LICENSE`
- `CHANGELOG.md`
- `vendor/echarts.bundle.js`
- `vendor/cytoscape.bundle.js`
- `.github/workflows/validate.yml`

## Byte-equal embeds

The JSON in `data_v1_7_1metadata_revision.json` must remain byte-equal with both copies of:

- `<script id="bundledSources" type="application/json">` in `index.html`
- `<script id="bundledSources" type="application/json">` in `404.html`

Enforced by `scripts/validate-data.js`. Any update to the dataset requires updating all three locations together and re-running `npm run validate:data`.

## Model regions in src/app.js

Identifies model identity. Edits require a MODEL change-class per [change-policy.md](change-policy.md).

- Time axis: `NOW, YS, YE` — `src/app.js:5`
- Model + dataset name strings: `MODEL_VERSION, PRIMARY_DATASET_NAME` — `src/app.js:6-7`
- Default PRNG seed: `DEFAULT_MC_SEED, DEFAULT_MC_SEED_HASH` — `src/app.js:67-68`
- Threat mechanism and reversibility tables — `src/app.js:198-272`
- Threshold policy and bounds: `GLOBAL_THRESHOLD, THRESHOLD_POLICY, THRESHOLD_MIN, THRESHOLD_MAX` — `src/app.js:387-390`
- Scenario table `SC` — `src/app.js:415-456`
- Range spread tables: `ORD_RANGE, GROWTH_RANGE, THRESH_RANGE, PARAM_FIELDS` — `src/app.js:559-562`
- Threat catalog `THREAT_SPECS` — `src/app.js:735-894`
- Weight profiles `WEIGHT_PROFILES` — `src/app.js:1212-1276`
- Effective-growth cap and conversion table: `EFFECTIVE_GROWTH_CAP, GROWTH_KIND_CONVERSION` — `src/app.js:1459-1470`

## Model functions in src/app.js

Function-level lock. Refactor only under a MODEL change-class with golden-value regression.

- Threshold: `getThreatThreshold`
- Horizons: `computeHorizon`, `sampleEventHorizon`, `sampleRegimeHorizon`, `deterministicEventHorizon`, `deterministicRegimeHorizon`, `computeThreatHorizon`
- Scoring: `baseScore`, `depFactor`, `domainWeightMultiplier`, `normalizedDomainWeights`
- Enrichment: `applyScenario`, `buildEnriched`, `buildDepGraph`, `rebuildThreatState`, `validateModelConfig`
- Growth-rate interpretation: `effectiveRiskGrowthForThreat`, `riskConversionOfThreat`, `growthKindOfThreat`, `growthMetaOfThreat`
- Sampling: `sampleThreatNumerics`, `sampleOrdinalRange`, `sampleLogNormalRange`, `fitScaledBeta`, `sampleBeta`, `sampleGamma`, `randn`, `random01`
- Seed primitives: `makeSeededRandom`, `resetMonteCarloSeed`, `hashSeedToUint32`, `normalizeMonteCarloSeed`
- Aggregators: `computeCompensatoryCrossing`, `graphAggregationScoreForYear`, `computeDynamicCascadeCrossing`, `computeAggregateYears`, `dependencyExposure`, `activeTransmissionShare`, `explainCascadeCrossing`
- Monte Carlo: `runMC`, `createMonteCarloAccumulator`, `enrichMonteCarloThreats`, `applyGlobalThresholdToSample`, `recordMonteCarloSample`
- Summary: `summarizeCrossings`, `buildCdf`, `quantile`, `summarizeMonteCarloAccumulator`, `summarizeThreatHorizonSamples`
- Public contracts: `probabilityByDisplayedYear`, `fmtY`
- Source ingestion: `makeThreat`, `sourceBackedRange`, `autoRange`, `normalizeSourceEntry`
- Evidence overlay: `applyEvidencePosterior`, `rebuildActiveSourceDataFromState`, `applySourceMap`, `applyEvidenceOverlay`
- Weibull: `weibullCDF`, `weibullShapeForThreat`, `weibullParamsForThreat`, `weibullProbability`, `weibullQuantile`

## Headline label strings

`Dynamic cascade P90` is a scientific identifier per [model-invariants.md](model-invariants.md). Must not be renamed in:

- `src/app.js:5083` — JSON export `headlineRule`
- `src/app.js:5135` — CSV export `headlineRule`
- `src/app.js:5165` — share-text builder
- `src/app.js:5261` — `_lastInterpretData.baselineResult.headlineRule`
- any user-facing copy in `index.html` or `404.html` that references it

## Cosmetic-edit surfaces

Safe to refactor under a COSMETIC or LOGIC change-class. The validation checklist in [validation-checklist.md](validation-checklist.md) must still pass.

- `src/styles.css`
- `src/action-delegation.js`
- `src/aria-status.js`
- HTML markup in `index.html` and `404.html` except the `bundledSources` script block
- Rendering helpers in `src/app.js`: any `render*`, `draw*`, `init*` (except `validateModelConfig`), HTML builders, the `calcConsole*` family, and copy strings outside export labels
