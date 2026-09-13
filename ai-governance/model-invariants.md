# Apocalypse Clock Model Invariants

These rules describe model 1.2.8 with dataset 1.9.0. They protect the declared model and its interpretation, not a claim of scientific validity. Changing them requires an explicit MODEL change and review.

## Headline and input identity

- The headline is Dynamic Cascade P90, not the median, a deterministic collapse date or an empirical probability of extinction.
- Preserve 23 threats and eight flat metric entries per threat, plus disclosed functional metadata. The 184-entry count does not exclude additional model assumptions in metadata.
- Preserve the four named aggregation systems and distinguish their estimands.
- Preserve scenario-conditioned enrichment, Monte Carlo architecture, seed identity, PRNG behavior, quantile interpolation and sentinel semantics unless explicitly reviewed.
- Standalone and propagated first-activation horizons are different outputs and must remain separately identifiable.

## Input interpretation

- Scores and thresholds are analyst model inputs with source provenance, not precise empirical measurements.
- Interdependence means incoming functional vulnerability of the target, not outgoing source importance.
- g is direct annual relative growth of latent functional pressure. Current positive-only class priors must not be reconverted through log1p or indicator-growth multipliers.
- The effective_growth_calibrated flag is an execution guard, not empirical validation.
- Disclose the shared prior classes, threat caps, runtime bounds, scenario shifts and approximate sampling-width convention. lo/hi are not automatically exact fitted quantiles.
- Do not tune parameters to recover a desired calendar year or an older numerical golden.

## Directed activation contract

For each inactive eligible target, the generic induction rule is q_i(t)+kappa_i*D_i(t)>=1, requiring both positive incoming exposure and positive vulnerability.

- q_i uses pre-network baseScore times the normalized domain multiplier, divided by the operational threshold and grown by (1+g_i) from 2026. It must not depend on the administrative end year or a censored standalone date.
- kappa_i is clamp((interdependence_i-1)/4,0,1) times (0.5+0.5*clamp((gov_failure_i-1)/4,0,1)). This is susceptibility, not probability.
- A dependency on target i points to upstream j. Fixed nonnegative a_ij values sum to at most one per target; current equal shares are judgments, not calibrated causal strengths.
- Exposure begins only when the upstream activation year plus its nonnegative integer edge lag has arrived. The standard dataset lag is one year; zero- and five-year alternatives are explicit sensitivity settings.
- Add spontaneous activations first, then evaluate induced activations synchronously to the least fixed point. Node ordering must not change the result; there is no three-wave cap.
- No inactive cycle can self-start without a spontaneous activation or other positive active upstream influence.
- Initially right-censored nodes remain inducible when eligible. An administrative >2100 horizon is not a propagation veto.
- nuclear, bioengineered, pandemics and autonomousw are not inducible through generic capacity loss. They retain spontaneous processes, aggregate eligibility and downstream effects after activation.
- Absorbing activation records first threshold passage, not irreversible physical destruction. Do not describe it as an explicit recovery or duration model.

## Fixed functional aggregation contract

- Criticality weights are fixed consequence tiers 1/2/3: amplifier, major partial disruption, and broad essential function with limited substitutes. They are not sampled priorities, physical capacity shares or probabilities.
- Service memberships and overlap groups are explicit dataset model inputs.
- Within each basket and overlap group, use the maximum member weight for the denominator and maximum activated member weight for the numerator, not the sum of overlapping nodes.
- Oceans and biodiversity share ecosystem_integrity but remain separate network nodes and per-threat outputs.
- The functional index is max(global overlap-deduplicated weighted activation share, maximum essential-service weighted activation share). The default trigger is 0.50.
- There is no three-domain, co-active-edge or induced-share eligibility gate. A single functional group may reach a basket threshold; induced propagation is not mandatory for every crossing.
- Co-active edges and domain counts are diagnostics, not proof of causation or independent loss.
- Fixed-weight monotonicity claims require the same nodes, baskets, thresholds and existing edge weights. Adding and renormalizing dependencies is a structural change, not a guaranteed monotone intervention.

## Retained limitations and censoring

The standalone hazard/horizon families and background depFactor remain model conventions. Excluding depFactor from q_i limits direct reuse but does not empirically separate background coupling from new propagation. Event/regime calendars, growth-to-hazard relationships and omitted hazard-specific initiation pathways must remain disclosed.

No crossing by 2100 is encoded as 2101 and displayed as >2100. Censored samples must not silently be dropped from unconditional quantiles or by-year denominators, or treated as known future dates. Linear interpolation and P10/P50/P90 meanings must not be altered without review.

S(t), its crossing year and the headline are normalized scenario outputs. They are not a physical percentage of destroyed services, a completed global-collapse forecast, consensus, an emergency warning or evidence of safety until the displayed year.

## Change and verification rule

Changes to any score, prior, threshold policy, growth meaning, standalone process, dependency graph, lag, vulnerability formula, criticality tier, service basket, overlap grouping, inducibility, aggregation, quantile or censoring rule are MODEL/DATASET changes as applicable, not cosmetic edits.

Review must distinguish source verification, mathematical consistency, engineering regression and predictive validity. Report exact configurations and completed tests; do not claim an unrun suite, new goldens or calendar calibration. Full equations and limits are maintained in [METHODOLOGY.md](../docs/METHODOLOGY.md) and [LIMITATIONS.md](../docs/LIMITATIONS.md).
