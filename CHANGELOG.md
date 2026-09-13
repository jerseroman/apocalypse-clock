# Changelog

## v1.2.8 — 2026-09-12 (prepared locally, not deployed by this change)

Version 1.2.8 advances the public release sequence from 1.2.7. It incorporates the locally developed functional-cascade revision, previously carrying the provisional local identifier 1.3.0. This release-label alignment does not change numerical parameters or rerun results. The substantive changes from 1.2.7 are:

- Dataset 1.9.0: 184 parameter entries, 61 source URLs, 23 functional profiles; 43 numeric parameter triplets changed versus 1.8.0. Replaces indicator-growth substitutions with disclosed direct latent-pressure prior classes and revises incoming vulnerability semantics.
- Adds pure directed pressure-plus-capacity-loss propagation with one-year edge lags, initially censored target eligibility, fixed criticality weights, essential-service baskets and overlap-aware aggregation. Removes the all-three-domain/co-active-edge/induced-share veto.
- Retains event-specific initiation for nuclear, engineered biological, pandemic and autonomous-weapons events. All remain aggregate-eligible and can transmit after activation.
- Separates standalone and propagated first-functional-failure summaries in UI narrative and JSON/CSV exports. Corrects stale explanations and active dataset labels. Adds functional catalog/import/causal regression checks.
- Replaces the single headline P90 display with paired Dynamic-cascade P50 and P90 clocks plus their calendar-year interval. The pair exposes the median and later distribution quantile without changing the simulation, dataset, thresholds, random seed, or stored baseline result (P50 2036, P90 2043, interval 7 years).
- Adds a reproducible Wix Velo Custom Element delivery target (`wix/apocalypse-clock-element.js`) and a local harness. The generated Web Component renders the application in an encapsulated shadow root and contains no HTML iframe; the legacy Wix HTML embed can therefore be replaced without maintaining a second copy of the model inside Wix.
- Expands public methodology, model-scope and limitation documentation. It explicitly distinguishes a functional-disruption threshold from completed global collapse and separates reproducible engineering results from empirical predictive validation.
- Synchronizes the 1.2.8 identifier across runtime code, HTML delivery surfaces, npm metadata, tests, documentation, citation metadata and Zenodo metadata. The active dataset remains 1.9.0.
- Original 1.7.1 and 1.8.0 JSON files remain byte-identical to the backup. The full previous application is preserved in `backups/pre-functional-cascade-2026-09-09`.

Before/after, Baseline + Expert + `AC-1.2.6-2026`, 3000 simulations:

| Model / dataset | Dynamic P10 | P50 | P90 | No crossing by 2100 |
| --- | ---: | ---: | ---: | ---: |
| Archived 1.2.7 / 1.7.1, freshly reproduced | 2037 | 2041 | 2046 | 0% |
| New 1.2.8 / 1.9.0 | 2033 | 2036 | 2043 | 0% |

New values were captured before refreshing the golden test; repeated same-seed runs were identical. This is an intentional change of inputs and aggregation meaning, not evidence of improved forecast accuracy. At n=1000 the global-only trigger gives P50 2047/P90 2060 versus essential-service P50 2037/P90 2043: headline timing is particularly sensitive to the service-basket rule. The non-propagating reference gives P90 2044, so the early headline must not be attributed solely to propagation.

Verification details and caveats: [research_v1_9_0/README.md](research_v1_9_0/README.md). Full-suite completion is recorded there and in the review log separately from this pre-test change record.

## v1.2.7 2026-05-16

First public GitHub release of the Apocalypse Clock.

Earlier development versions existed internally, but they were not maintained as a complete public release sequence. For that reason, public versioning begins with `v1.2.7`.

### Main notes

- Finalized the current public release of Apocalypse Clock.
- Added GitHub Pages public review version.
- Updated the active dataset reference to `data_v1_7_1metadata_revision.json`.
- Uses dataset v1.7.1 metadata-cleanup export.
- Refreshed selected source and URL references.
- Preserved the 23-threat, 8-metric, 184-parameter model structure.
- Preserved numerical `mu`, `lo`, and `hi` values; this release is not a scientific recalibration.
- Improved the distinction between current systemic stress and projected Dynamic Cascade horizon.
- Clarified that the Dynamic Cascade P90 horizon is a model-derived upper-risk horizon, not a deterministic forecast.
- Improved public-facing explanations for uncertainty and diagnostic views.
- Added or updated Scientific Panel diagnostics.
- Expanded and clarified MCDA weighting model controls.
- Renamed export functions to clearer public names.
- Added visible public timestamp/version labeling.
- Preserved static browser-based deployment without backend requirements.

## Dataset v1.7.1

- Metadata cleanup only.
- Fixed broken or outdated source links where replacements were available.
- No scientific recalibration.
- No modification of model parameter values.
- 23 threat categories × 8 metrics = 184 model parameters, excluding metadata.
