# Apocalypse Clock Model Invariants

These rules describe model 1.5.0 with dataset 1.9.0. They protect the declared model and its interpretation, not a claim of scientific validity. Changing them requires an explicit MODEL change and review.

## Headline and input identity

- The headline is Dynamic Cascade P90, not the median, a deterministic collapse date or an empirical probability of extinction.
- Preserve 23 threats and eight flat metric entries per threat, plus disclosed functional metadata. The 184-entry count does not exclude additional model assumptions in metadata.
- Preserve the four named aggregation systems and distinguish their estimands.
- Preserve scenario-conditioned enrichment, Monte Carlo architecture, seed identity, PRNG behavior, quantile interpolation and sentinel semantics unless explicitly reviewed. Structural sampling and pressure turns use separate seeded streams. Switching pressure turns off must reproduce the structural-sampling-only result (developed as 1.4.0) exactly, and switching both off must reproduce model 1.3.0 exactly.
- Standalone and propagated first-activation horizons are different outputs and must remain separately identifiable.

## Input interpretation

- Scores and thresholds are analyst model inputs with source provenance, not precise empirical measurements.
- Interdependence means incoming functional vulnerability of the target, not outgoing source importance.
- g is direct annual relative growth of latent functional pressure. Current positive-only class priors must not be reconverted through log1p or indicator-growth multipliers. Growth-class sampling multiplies sampled g by a class ratio and keeps it positive. After a sampled pressure turn the pressure falls by the factor 1/(1+g) per year; g itself stays positive.
- The effective_growth_calibrated flag is an execution guard, not empirical validation.
- Disclose the shared prior classes, threat caps, runtime bounds, scenario shifts and approximate sampling-width convention. lo/hi are not automatically exact fitted quantiles.
- Do not tune parameters to recover a desired calendar year or an older numerical golden.

## Directed activation contract

For each inactive eligible target, the generic induction rule is q_i(t)+kappa_i*D_i(t)>=1, requiring both positive incoming exposure and positive vulnerability.

- q_i uses pre-network baseScore times the normalized domain multiplier, divided by the operational threshold and grown by (1+g_i) from 2026. It must not depend on the administrative end year or a censored standalone date.
- kappa_i is clamp((interdependence_i-1)/4,0,1) times (0.5+0.5*clamp((gov_failure_i-1)/4,0,1)). This is susceptibility, not probability.
- A dependency on target i points to upstream j. Declared nonnegative a_ij values sum to at most one per target; the current equal shares are judgments, not calibrated causal strengths. The Monte Carlo samples a_ij from a Dirichlet distribution with the declared shares as mean (concentration 2 per edge) and keeps each target's total.
- Exposure begins only when the upstream activation year plus its nonnegative integer edge lag has arrived. The dataset declares one year for every edge and the deterministic views use it; the Monte Carlo samples each edge's lag uniformly from whole years 0 to 5.
- Add spontaneous activations first, then evaluate induced activations synchronously to the least fixed point. Node ordering must not change the result; there is no three-wave cap.
- No inactive cycle can self-start without a spontaneous activation or other positive active upstream influence.
- Initially right-censored nodes remain inducible when eligible. An administrative >2100 horizon is not a propagation veto.
- nuclear, bioengineered, pandemics and autonomousw are not inducible through generic capacity loss. They retain spontaneous processes, aggregate eligibility and downstream effects after activation.
- Without a pressure turn, activation is absorbing and records first threshold passage, not irreversible physical destruction. After a sampled turn the recovery rule in the pressure-turn section applies; it is a threshold rule, not a repair-duration model.

## Functional aggregation contract

- Criticality weights are declared consequence tiers 1/2/3: amplifier, major partial disruption, and broad essential function with limited substitutes. The Monte Carlo samples each tier's value within ±0.5, shared by all nodes of the tier in a run, so tiers keep their order. They are not MCDA priorities, physical capacity shares or probabilities.
- Service memberships and overlap groups are explicit dataset model inputs.
- Within each basket and overlap group, use the maximum member weight for the denominator and maximum activated member weight for the numerator, not the sum of overlapping nodes.
- Oceans and biodiversity share ecosystem_integrity but remain separate network nodes and per-threat outputs.
- The functional index is max(global overlap-deduplicated weighted activation share, maximum essential-service weighted activation share). The declared trigger is 0.50; the Monte Carlo samples it uniformly from 0.40 to 0.60 in each run.
- There is no three-domain, co-active-edge or induced-share eligibility gate. A single functional group may reach a basket threshold; induced propagation is not mandatory for every crossing.
- Co-active edges and domain counts are diagnostics, not proof of causation or independent loss.
- Monotonicity claims require the same nodes, baskets, thresholds and edge weights, that is, the same sampled structure within a run. Adding and renormalizing dependencies is a structural change, not a guaranteed monotone intervention.

## Structural uncertainty (model 1.5.0)

What changed: every main Monte Carlo run samples the cascade threshold (uniform 0.40 to 0.60), the value of each criticality tier (uniform within ±0.5), the dependency weights (Dirichlet around the declared shares, concentration 2 per edge), the dependency lags (whole years, uniform 0 to 5) and the growth-class assignment of each threat (one class down or up with probability 25% each on the ladder 0.003 / 0.01 / 0.02 / 0.03, continued beyond its ends by the adjacent step ratio). The shifted growth still passes through the existing effective-growth clamps, including each threat's threat_specific_cap, which cut the upward move short for Climate Breakdown (0.035) and AI (0.04) at their central growth. The ranges are defined once, in STRUCTURAL_UNCERTAINTY in src/app.js.

What did not change: the dataset and its 184 entries, the cascade engine, the standalone equations, service memberships, overlap groups, topology, inducibility, the Dynamic Cascade P90 headline rule, quantile interpolation and censoring. Structural draws come from their own seeded streams, so parameter and event draws are unchanged, and params.structuralUncertainty === false reproduces model 1.3.0 exactly. Deterministic views and the sensitivity diagnostics keep the declared structure.

The sampling ranges are model judgments. Changing a range, a distribution or the list of sampled choices is a MODEL change.

## Pressure turns and recovery (model 1.5.0)

What changed: in every main Monte Carlo run each threat, independently, has a 50% chance that its latent pressure peaks in a year drawn uniformly from 2027 to 2100 and then retraces its rise, falling by the factor 1/(1+g) per year. A standalone crossing that has not happened by the turn year does not happen; event hazards follow the mirrored pressure path with their single process draw. After its turn, an active cascade node recovers once q_i(t)+kappa_i*D_i(t) is at most (1 - drop) times min(1, its value at activation). The drop is 25% for reversible and 50% for partly reversible threats, by the declared reversibility class; irreversible threats do not recover. Recovered nodes can be induced again but are not spontaneously reactivated. Lags count from an upstream node's latest activation, and domain horizons use activity intervals. The per-run end state and the share of crossing runs below the threshold again in 2100 are reported. The values are defined once, in PRESSURE_TURNS in src/app.js. No historical data sets them.

What did not change: the dataset and its 184 entries, growth before a turn, growth sampling and clamps, structural sampling, the aggregation rules, the Dynamic Cascade P90 headline rule and the first-crossing meaning of every clock and horizon, quantile interpolation and censoring. Turn draws come from their own seeded stream, so parameter, structural and process draws are unchanged. params.pressureTurns === false reproduces the structural-sampling-only result exactly, and with params.structuralUncertainty === false as well it reproduces model 1.3.0. Nodes without a turn behave as before. Deterministic views and the sensitivity diagnostics keep the declared continued-pressure path.

The turn probability, the turn-year distribution and the recovery drops are model judgments. Changing them, the mirrored decline or the recovery rule is a MODEL change.

## Retained limitations and censoring

The standalone hazard/horizon families and background depFactor remain model conventions. Continuous and regime nodes use the same growth-responsive first-passage equation; regime nodes receive no additional geometric waiting-time draw. Event nodes retain their separate cumulative-hazard convention. Excluding depFactor from q_i limits direct reuse but does not empirically separate background coupling from new propagation. Growth-to-calendar relationships and omitted hazard-specific initiation pathways must remain disclosed.

Domain functional horizons must be reconstructed from full-system propagated activation years, then scored with a domain-restricted node basket using the same criticality, overlap, service and threshold rules as the run, including its sampled structure. Domain denominators are separate, non-additive reporting denominators. Do not compare a domain priority-mass clock with the system functional horizon as if they were the same estimand.

No crossing by 2100 is encoded as 2101 and displayed as >2100. Censored samples must not silently be dropped from unconditional quantiles or by-year denominators, or treated as known future dates. Linear interpolation and P10/P50/P90 meanings must not be altered without review.

S(t), its crossing year and the headline are normalized scenario outputs. They are not a physical percentage of destroyed services, a completed global-collapse forecast, consensus, an emergency warning or evidence of safety until the displayed year.

## Change and verification rule

Changes to any score, prior, threshold policy, growth meaning, standalone process, dependency graph, lag, vulnerability formula, criticality tier, service basket, overlap grouping, inducibility, structural sampling range, pressure-turn probability, timing or recovery rule, aggregation, quantile or censoring rule are MODEL/DATASET changes as applicable, not cosmetic edits.

Review must distinguish source verification, mathematical consistency, engineering regression and predictive validity. Report exact configurations and completed tests; do not claim an unrun suite, new goldens or calendar calibration. Full equations and limits are maintained in [METHODOLOGY.md](../docs/METHODOLOGY.md) and [LIMITATIONS.md](../docs/LIMITATIONS.md).
