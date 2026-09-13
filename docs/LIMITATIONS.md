# Limitations

Apocalypse Clock 1.2.9 and dataset 1.9.0 are experimental and not peer reviewed. A reproducible numerical implementation is distinct from a valid description of reality.

## Evidence does not calibrate the model

The inputs were assembled with AI assistance and source review. An opened primary source can verify a reported observation or a mechanism without supporting the selected ordinal value, normalized threshold, annual latent-pressure prior or causal weight. Further independent source checking and domain review remain necessary.

The 184 flat entries are not exact measurements or the complete set of model assumptions. Functional definitions, service membership, criticality tiers, overlap groups, topology, lags and inducibility also affect results. Their uncertainty is incompletely represented by the per-entry lo/mu/hi values. Sources can become outdated or be superseded.

## Growth and calendar assumptions

The four shared growth classes are analyst priors, not empirical fits. Historical threat caps are execution safeguards, not scientific ceilings. The legacy effective_growth_calibrated flag prevents reconversion; it does not mean that a rate has been calibrated against observed functional failures.

Positive-only growth omits endogenous recovery, pressure reduction and successful adaptation. The continued-pressure assumption should not be confused with evidence that every threat is worsening. Maintaining the same g through 2100 is a scenario extrapolation, not a verified trend.

Standalone continuous, event and regime horizon equations remain heuristic. Event intensity uses the growth parameter and score/threshold ratio. Regime arrival now uses the same latent-pressure first-passage equation as the continuous family, so sampled growth affects its timing and no extra geometric draw is introduced. That choice removes an internally inconsistent growth-blind clock; it is still not fitted to observed regime-transition frequencies, durations or recovery.

Runtime threat thresholds are clamped to [7.8,9.2], although positive-parameter sampling permits a wider interval. Bounds, clipping and the nonlinear score-to-year mapping can materially affect the result. No normalized threshold is an independently measured physical tipping point.

## Background coupling and directed propagation

Standalone priorities retain the historical background depFactor. The new susceptibility pressure excludes that factor and adds realized, lagged upstream capacity loss separately. This is an explicit modeling separation, not an empirically identified decomposition: some climate or cross-sector effects may already be present in baseline scores and growth judgments.

Interdependence now measures target incoming vulnerability. Its transformation together with governance failure into kappa is heuristic. Related evidence may inform both scores; their combination must not be presented as independent statistical evidence.

All current incoming pathways receive equal fixed shares for each target. Mechanism evidence does not establish equal strength, completeness or sign in every context. Some topology is retained rather than newly verified. A sole declared upstream pathway receives weight one, while adding a pathway and renormalizing changes every existing share. Coefficient comparisons are monotone only when existing weights and other inputs are held fixed.

The standard one-year lag is a resolution assumption. Zero- and five-year alternatives are structural sensitivity cases, not empirical lower and upper delay bounds. Synchronous fixed-point closure handles zero-lag chains without ordering bias, but does not resolve subannual dynamics. Binary activation also suppresses gradual, regional and partial functional losses.

Nuclear, bioengineered, pandemics and autonomousw cannot be induced by generic capacity loss. This prevents unrelated service failures from being called a war, release, outbreak or targeting escalation. It also leaves additional hazard-specific causal initiation pathways unmodeled. The four threats remain eligible for spontaneous activation, aggregation and onward transmission.

## Aggregation is not physical loss

Fixed tiers 1/2/3 are judgments about conditional functional criticality. They are not probabilities, economic shares, population exposure or validated marginal impacts. Basket assignment and threshold choice are consequential structural assumptions.

The maximum of global weighted activation and the largest essential-service activation share is a non-compensatory model trigger, not a measured fraction of worldwide services lost. In particular, ecological_life_support contains two equal-weight overlap groups: climate and ecosystem_integrity. At the default 0.50 threshold, activation of either group alone reaches the service trigger. A Dynamic Cascade crossing therefore need not contain induced propagation or multiple activated groups.

Oceans and biodiversity are deduplicated through the maximum weight within ecosystem_integrity, separately in each basket. This addresses one explicit overlap, not all shared ecological mechanisms. Other threats share causes, affected people and services. The model does not turn those overlaps into independent observations or additive mortality estimates. Separate ocean/biodiversity nodes may still influence the network through distinct paths.

There is no all-three-domain requirement, co-active-edge threshold, induced-share threshold or three-wave limit. Removing these administrative gates makes the functional rule consistent with its declared meaning; it does not establish that the resulting trigger forecasts real global collapse.

Domain functional horizons inherit the full-system propagation path but recompute the functional trigger with a domain-specific node basket and denominator. They should not be summed, averaged as physical shares, or interpreted as independent probabilities. Because service membership and fixed tiers are analyst assignments, domain timing can be especially sensitive to one critical group and to cross-domain links.

## First passage, uncertainty and censoring

An activated node stays active because the output concerns first passage. It does not remain active because the model has demonstrated permanent destruction. No explicit repair rate, event duration, replacement, restoration or repeated cycle is modeled. A chronicle of first failures can accumulate even where real systems later recover.

Parameter ranges encode analyst plausibility. Beta and mean-adjusted log-normal sampling use approximate width conventions; lo/hi are not exact fitted 5th/95th percentiles or hard sampled bounds. Clipping can create endpoint concentrations. Parameter uncertainty is distinct from stochastic event draws, and neither spans all structural uncertainty.

No-crossing runs remain right-censored at 2100 and are encoded as sentinel 2101. The displayed >2100 is not a forecast for 2101, an estimate of the unresolved tail, a statement of safety or evidence that severe impacts occur only after 2100. Linear quantile interpolation involving censored samples requires this qualification.

The four aggregators describe different model estimands. Their spread is not a real-world confidence interval. Graph scores, centrality and co-active links are diagnostics rather than a validated causal or correlation model.

## Validation and use

Engineering checks can establish parsing, bounds, matching embeds, deterministic seeds, pure-function behavior, exports and UI contracts. They cannot establish causal coefficients, physical threshold values, calendar calibration or predictive skill. No new numerical run results, goldens or validation passes are claimed here.

Use the dashboard for assumption inspection, scenario comparison and criticism, not as an operational warning system or standalone basis for consequential decisions. Scientific validation would require independently specified outcomes, causal and recovery models, defensible data-to-parameter links and out-of-sample evaluation.
