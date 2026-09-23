# Canonical causal graph correction

## Task

Make the directed graph a fixed, reviewable code artifact used by both the
calculator and visual network, and remove the identified unreviewed direct
geopolitics-to-climate link.

## Change class and authorization

MODEL. Owner instruction: "tako , naredi", following the explicit agreement
that a canonical graph in code should drive both presentation and calculation
instead of the JSON dependency fields.

## Files touched

`src/causal-graph.js` (new), `src/app.js` (`makeThreat`, `networkEdgesFromThreats`,
`initNetwork`, model version and export model constants), HTML script loading and
network description in `index.html` and `404.html`, package versions, focused and
golden tests, README, methodology, limitations, invariants and changelog.

## Files explicitly not touched

All dataset JSON files and their byte-equal embedded copies; numerical `mu`,
`lo`, `hi`, threshold and growth-rate values; `src/cascade-model.js`; PRNG,
sampling, horizon, quantile and censoring functions; protected vendor assets.

## Affected outputs and numerical risk

The graph and model cascade change together. Dependency-aware scores, network
diagnostics and first-functional-crossing quantiles may move. A removed edge is
not a claim that politics cannot affect emissions; it removes an unsupported
direct one-year coefficient for the target's functional failure state. The
remaining climate weights stay at 0.25 each rather than being renormalized.
The baseline 3000-run Dynamic Cascade P10/P50/P90 moved from 2033/2036/2042
to 2034/2037/2043; the domain P50 values moved from 2045/2036/2040 to
2046/2037/2040. JSON/CSV exports retain the same field names but record the
active canonical threat inputs and the new model identifier.

## Validation and rollback

Run `npm run check`, focused network and functional-integration browser tests,
the headline determinism test and the full browser suite. Compare the fixed
seed baseline and update the golden once, without tuning the model to match an
older date. The prior active topology is recoverable from the unchanged
dataset 1.9.0 and the recorded 1.3 baseline; do not change the dataset to
roll back this code change.

## Status

Validated locally. `npm run check` passed (15 JavaScript files, 184 dataset
parameters and two matching embeds, 87 URL formats). The full browser suite
passed 46/46 after the animation-settling test timeout was made tolerant of
parallel load. A subsequent focused graph run passed 2/2 after the visual
flow addition. A direct browser check confirmed the flow offset advances and
the selected climate node has only biodiversity, soils and water upstream.
The private development copy has not been published.
