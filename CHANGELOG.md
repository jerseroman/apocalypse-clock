# Changelog

## v1.3.0 - 2026-09-24

- Promotes the restored 23-threat application baseline to model version 1.3.0.
- Keeps dataset 1.9.0, all 184 numerical parameter entries and the established functional-cascade calculation unchanged.
- Renames the primary dataset from `data_v1_9_0_functional.json` to `data_v1_9_0.json` and updates all active references.
- Removes the unfinished subsystem-timing experiment from the active application and documentation.
- Preserves the separation between threat-level scientific evidence, parameter calibration and model assumptions.
- This is a version and delivery update, not an empirical recalibration or predictive validation.

## v1.2.9 — 2026-09-13

This MODEL correction makes the domain cards and regime timing internally consistent with the declared functional-pressure model. Dataset 1.9.0, its 184 numerical ranges, thresholds, topology, fixed criticality tiers, service memberships, edge weights and lags are unchanged.

### Same-version CDF, Weibull and presentation hotfix

- Corrects the main cumulative chart to display the existing Dynamic Cascade first-crossing distribution used by the paired P50/P90 clocks. It previously rendered the top-level compensatory distribution (Baseline P50 2054) even though the surrounding headline referred to Dynamic Cascade (P50 2036, P90 2042).
- Replaces JavaScript-style `undefined` output in the Weibull domain view with explicit partial-identification reporting. Positive-weight right-censored threats remain in the calculation: the UI shows a defensible lower bound for the weighted P50 and a weighted P≤2050 probability range instead of inventing a date or silently dropping late threats.
- Renames the three domain cards to Civilizational, Biosphere and Technological `Functional-Disruption Horizon`, and makes the paired-clock explanation easier to read without changing its scientific caveats.
- Extends the application's `#14181e` background across the full viewport width for the height of the dashboard, removing darker page gutters without changing the model or other page sections.
- Removes the obsolete page-builder delivery layer, its generator, harness and dedicated tests. The logo, Perplexity icon and all seven AI comparison presets are now served directly from the repository.
- This is a correction within application 1.2.9 and data 1.9.0. No model equation, dataset value, threshold, sampling rule, headline number or version identifier changes.

- Replaces the domain cards' former 40-percent standalone sampled-priority-mass crossing with a domain functional first crossing reconstructed from the full-system propagated activation history. Only the reporting node basket and denominator are restricted by domain; fixed criticality, overlap, essential-service and 0.50 trigger rules match the headline engine.
- Removes the misleading comparison of domain P50 values with the system P50 because the former rule measured a different estimand.
- Makes regime-process timing use sampled priority, growth and threshold in the same first-passage equation as continuous latent pressure. The previous growth-blind logistic/geometric waiting clock had no empirical calendar calibration and is removed.
- Adds explicit domain-method, censoring and `>2100` semantics to the UI and JSON/CSV export. Domain denominators are separate and non-additive.
- Advances the application model to 1.2.9 while keeping the active dataset at 1.9.0.

Fixed-seed baseline comparison (`baseline`, `expert`, seed `AC-1.2.6-2026`, 3000 simulations):

| Output | 1.2.8 | 1.2.9 |
| --- | ---: | ---: |
| Dynamic Cascade P10/P50/P90 | 2033 / 2036 / 2043 | 2033 / 2036 / 2042 |
| Civilizational domain P50 | 2068 | 2045 |
| Biosphere domain P50 | 2049 | 2036 |
| Technological domain P50 | 2097 | 2040 |

The new domain values are comparable model-defined functional warning horizons, not empirical probabilities or dates of completed domain collapse. The correction improves internal estimand consistency; it does not scientifically validate the coefficients, thresholds or calendar projections. A verified backup of commit `c39662e630c755706cb384663a9c9cf322b970ce` is at `C:/Users/error/Desktop/Apocalypse Clock backups/pre-domain-functional-fix-20260913`.

## v1.2.8 — 2026-09-12 (prepared locally, not deployed by this change)

Version 1.2.8 advances the public release sequence from 1.2.7. It incorporates the locally developed functional-cascade revision, previously carrying the provisional local identifier 1.3.0. This release-label alignment does not change numerical parameters or rerun results. The substantive changes from 1.2.7 are:

- Dataset 1.9.0: 184 parameter entries, 61 source URLs, 23 functional profiles; 43 numeric parameter triplets changed versus 1.8.0. Replaces indicator-growth substitutions with disclosed direct latent-pressure prior classes and revises incoming vulnerability semantics.
- Adds pure directed pressure-plus-capacity-loss propagation with one-year edge lags, initially censored target eligibility, fixed criticality weights, essential-service baskets and overlap-aware aggregation. Removes the all-three-domain/co-active-edge/induced-share veto.
- Retains event-specific initiation for nuclear, engineered biological, pandemic and autonomous-weapons events. All remain aggregate-eligible and can transmit after activation.
- Separates standalone and propagated first-functional-failure summaries in UI narrative and JSON/CSV exports. Corrects stale explanations and active dataset labels. Adds functional catalog/import/causal regression checks.
- Replaces the single headline P90 display with paired Dynamic-cascade P50 and P90 clocks plus their calendar-year interval. The pair exposes the median and later distribution quantile without changing the simulation, dataset, thresholds, random seed, or stored baseline result (P50 2036, P90 2043, interval 7 years).
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
