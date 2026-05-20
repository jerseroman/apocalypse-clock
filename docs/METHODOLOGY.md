# Methodology

Apocalypse Clock is an experimental, static, browser-based systemic-risk dashboard. It is designed to make assumptions, uncertainty ranges, source references, dependencies, and scenario effects inspectable.

This document summarizes the current repository and governance files. It does not introduce a new methodology, does not claim peer review, and does not change model behavior.

## Status

The model is not peer reviewed. It should be read as a transparent scenario model and review target, not as scientific consensus or an official risk assessment.

The structured dataset was created with AI assistance and repeated AI-assisted checks. That process is useful for transparency and consistency review, but it is not independent source verification, domain-expert assessment, or scientific peer review.

## Model Inputs

The current public dataset is `data_v1_7_1metadata_revision.json`. It contains:

- 23 threat categories;
- 8 metrics per threat;
- 184 model parameters excluding metadata;
- source metadata used for traceability and review.

The same dataset is embedded in `index.html` and `404.html` inside the `bundledSources` block. `scripts/validate-data.js` checks that the JSON file and both embedded copies remain byte-equal.

The protected model-input fields include `mu`, `lo`, `hi`, thresholds, `growth_rate`, threat taxonomy, normalized metric interpretation, and source-map semantics.

## Scenario and Uncertainty Workflow

The dashboard combines structured model inputs with scenario controls, uncertainty ranges, dependency-aware aggregation, Monte Carlo sampling, horizon diagnostics, network analysis, and exportable outputs.

The governance files treat the following as model identity:

- 23 threats;
- 8 metrics per threat;
- four aggregation systems;
- Monte Carlo simulation architecture;
- dependency-network propagation logic;
- scenario-conditioned threat enrichment.

Changing these is a MODEL change, not a documentation or UI change.

## Dynamic Cascade P90

The main displayed year is governed by the `Dynamic Cascade P90` headline rule.

It is a model-derived horizon under the selected dataset, scenario, weights, thresholds, uncertainty ranges, dependency logic, and Monte Carlo seed. It is not a deterministic forecast, a prophecy, an empirical probability of collapse, or a guaranteed date.

`Dynamic Cascade P90` is the 90th-percentile year of the model's dynamic-cascade crossing-year distribution under the current implementation. In practical terms, it is an upper quantile of simulated dynamic-cascade onset years, not a claim that collapse will occur in that year.

The current model uses a sentinel convention for runs that do not cross by 2100. Those runs are represented internally as a value above the modeled year range and displayed as `>2100`. This convention is part of the current model behavior and affects how quantiles near the end of the modeled range should be interpreted.

The cascade output represents the modeled onset of a cascade trigger condition. A real systemic cascade would be a process over time, not a single instant.

## Thresholds and Parameters

Thresholds are analytical anchors used by the model. They are not physical tipping points.

Dataset values and uncertainty ranges are model inputs. They are not exact real-world measurements. Changes to `mu`, `lo`, `hi`, thresholds, `growth_rate`, or model logic require explicit review under the repository change policy.

## Interpretation Boundary

The model output represents:

- systemic-risk horizon estimation under stated assumptions;
- uncertainty-aware scenario analysis;
- probabilistic structural dynamics within the model.

The model output does not represent:

- a deterministic prediction;
- a measured probability of civilizational collapse;
- a real-time emergency warning;
- legal, financial, medical, security, or policy advice;
- peer-reviewed scientific consensus.
