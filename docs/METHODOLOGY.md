# Methodology

This document describes Apocalypse Clock model 1.5.0 with dataset 1.9.0. It is an experimental scenario model, not a peer-reviewed or empirically validated forecast. Numerical conventions below describe the implementation; they are not measurements of collapse probability.

## Inputs and implementation

The dataset [data_v1_9_0.json](../data_v1_9_0.json) retains 23 threats and eight flat metric entries per threat: scale, urgency, acceleration, interdependence, irreversibility, governance failure, growth rate and threshold. The 184-entry contract does not include the additional model parameters in metadata.

Functional definitions, declared criticality weights, service memberships, overlap groups, inducibility and directed edge weights/lags are recorded in _meta.functional_model.nodes and mirrored on threshold entries. Growth conventions are recorded in _meta.growth_mode, _meta.growth_prior_classes, _meta.growth_inputs and _meta.calibration_method; this dataset does not have a separate _meta.growth_model object.

[src/app.js](../src/app.js) applies scenario transformations, samples parameters, calculates standalone horizons and builds cascade inputs. [src/cascade-model.js](../src/cascade-model.js) implements the directed first-activation cascade and functional aggregation. The bundledSources blocks in index.html and 404.html are dataset delivery surfaces; byte equality with the standalone JSON is an engineering validation requirement, not a claim established by this document.

Inputs were assembled with AI assistance and source review. A relevant, opened source can support a mechanism without validating its numerical score, prior, threshold or edge coefficient.

## Scoring and standalone horizons

Let x_ik denote the six ordinal scores for threat i after scenario transformation and, in Monte Carlo runs, sampling. Runtime ordinal support is [1,5]. Let w_k be the selected metric weights and d_i the domain multiplier: three times the selected domain weight divided by the sum of all three domain weights.

The pre-network score b_i and background-adjusted priority P_i are:

~~~text
b_i = sum_k w_k x_ik
P_i = b_i d_i F_i
~~~

F_i is the retained background dependency factor. If N_i is the declared set of upstream neighbours, n_i its size, n_bar the graph-average size and n_max the maximum size, the code uses:

~~~text
z_j = (scale_j + urgency_j + interdependence_j) / 15
F_i = clamp(1 + depAlpha * mean_(j in N_i)(z_j)
                  * (1 + n_i / max(1,n_bar)),
            1, 1 + depAlpha * (1 + n_max / max(1,n_bar)))
~~~

An empty N_i gives F_i=1. This is a background salience/topology heuristic, not the realized-loss cascade. Historical variable names containing OUT_DEGREE count the declared dependency lists; a dependency on target i identifies an upstream source j.

H_i is the operational threat threshold. The current getThreatThreshold and horizon functions clamp it to [7.8,9.2], with a global-policy alternative of 8.5. The positive-parameter importer/sampler permits wider threshold values, but those do not bypass this runtime clamp. H_i is a normalized analyst anchor, not a physical tipping point.

The standalone process families are retained:

- Continuous: when 0<P_i<H_i and g_i>0, the crossing year is ceil(2026 + log(H_i/P_i)/log(1+g_i)), capped at 2101. P_i>=H_i crosses at 2026; nonpositive priority or non-growing subthreshold pressure does not cross within the horizon.
- Event: annual hazard increments start with lambda_i0=max(0.00001,2*g_i*P_i/H_i), then lambda_it=clamp(lambda_i0*(1+g_i)^(t-2026),0.00001,5). A uniform draw is compared with 1-exp(-sum lambda_it); the deterministic diagnostic uses cumulative hazard log(2).
- Regime: uses the same first-passage mapping as the continuous family: when 0<P_i<H_i and g_i>0, the crossing year is ceil(2026 + log(H_i/P_i)/log(1+g_i)), capped at 2101. P_i>=H_i crosses at 2026. The regime label retains an abrupt state-transition interpretation but no longer adds an uncalibrated geometric calendar draw.

These calendar mappings, including the event use of g_i and the regime first-passage convention, are model hypotheses. They are not empirically fitted event frequencies or validated consequences of the functional-pressure interpretation. Removing the extra regime draw avoids treating a growth-blind logistic construction as empirical timing; it does not calibrate the remaining equation.

## Direct growth priors

g_i is a dimensionless annual relative growth parameter for autonomous latent functional pressure. A one-year unforced pressure step is R_i(t+1)=R_i(t)*(1+g_i). It is not an annual probability, mortality trend, percentage of physically lost capacity, or CAGR of an observed source indicator.

The shared analyst classes are:

| Class | lo | mu | hi before threat cap |
| --- | ---: | ---: | ---: |
| near_flat | 0.0005 | 0.003 | 0.015 |
| slow | 0.001 | 0.010 | 0.025 |
| moderate | 0.003 | 0.020 | 0.040 |
| rapid | 0.006 | 0.030 | 0.050 |

Threat-specific legacy caps remain numerical safeguards. The selected class, cap and rationale are in the dataset; none was fitted to a target calendar year. The effective_growth_calibrated flag means “already in engine units”: no log1p transformation or historical indicator-conversion multiplier is applied to these entries. Scenario scaling and sampling precede the effective rate clamp, whose floor is 0.0005 and upper limit is the smaller of the threat cap and 0.05.

Before a turn, the growth priors are positive and describe continued pressure. From model 1.5.0 the Monte Carlo lets each threat's pressure peak and decline (see Pressure turns and recovery). Deterministic views keep a fixed positive g_i over the displayed horizon, which is a structural scenario, not an observed trend guaranteed through 2100. No response is triggered by rising pressure itself.

## Directed functional activation

The simulation visits integer years 2025 through 2100. The pressure reference year is 2026; the exponent does not run backward before that year. For each target i:

~~~text
q_i(t) = clamp((b_i*d_i/H_i)*(1+g_i)^max(0,t-2026), 0, 1)
kappa_i = clamp((interdependence_i-1)/4, 0, 1)
          * (0.5 + 0.5*clamp((gov_failure_i-1)/4, 0, 1))
D_i(t) = clamp(sum_j a_ij * I(tau_j + lag_ij <= t), 0, 1)
~~~

tau_j is an upstream node's first activation year. a_ij is its fixed incoming edge weight, not a correlation. The current dataset allocates equal shares among each target's declared pathways, summing to one. Equal weighting, selected topology and the kappa_i mapping are explicit judgments; sources supporting a mechanism do not establish these coefficient values.

Interdependence means the target's incoming functional vulnerability, not the source's downstream importance. q_i uses pre-network b_i*d_i, excluding F_i, to avoid inserting the same background factor directly into this pressure term. This does not establish empirical independence between background and realized-loss effects.

Each year:

1. Add nodes whose standalone horizon has arrived.
2. For each inactive, inducible target, require positive incoming D_i and positive kappa_i. Activate it if q_i(t)+kappa_i*D_i(t)>=1.
3. Add all newly qualifying targets simultaneously, then repeat to the least fixed point. Every nonempty wave adds a node, so at most N waves are needed; there is no arbitrary three-wave cutoff.
4. Evaluate the global and essential-service trigger below.

All declared edges have a one-year lag, which the deterministic views use: a source activated in year t first contributes in t+1. The Monte Carlo samples each edge's lag as a whole number of years, uniformly from 0 to 5 (see Structural uncertainty). Neither the declared lag nor the sampled range is a measured delay estimate. Zero-lag paths can traverse several synchronous waves within a year. Source/target ordering does not determine activation.

The four nodes nuclear, bioengineered, pandemics and autonomousw have functional_inducible=false. Generic capacity loss cannot create their initiating war, biological event, outbreak or targeting escalation. They remain in all standalone processes, aggregate baskets and the source network, and can transmit after their modeled initiating activation. Additional hazard-specific initiation channels are not implemented, rather than declared physically impossible. AI and space retain broader functional definitions that allow disruption without, respectively, an advanced-agent takeover or destruction of satellites.

An initially censored standalone horizon does not bar induction for eligible nodes: q_i uses pressure and growth, not distance to 2101. q_i>=1 alone does not activate a node through the generic induction branch; positive incoming influence is also required. A node activated spontaneously at the start of a year retains that cause label.

Without a pressure turn, activation is an absorbing record of first functional-threshold passage. It is not zero remaining biomass, total service extinction or permanent physical destruction. In the Monte Carlo a node can recover after its sampled turn (see Pressure turns and recovery). Repair duration, partial function and recurring shocks are not modeled otherwise.

## Criticality and overlap-aware aggregation

Each node has an analyst-selected criticality tier c_i:

| Tier | Meaning |
| --- | --- |
| 1 | Primarily a cross-system amplifier |
| 2 | Major partial functional disruption with meaningful alternatives |
| 3 | Broad essential function with limited timely substitutes |

These are consequence tiers, not probabilities, GDP/population shares or sampled priorities. The Monte Carlo samples the numerical value of each tier within ±0.5 of 1, 2 and 3; all nodes of a tier share that value in a run, so the tiers keep their order. Service baskets are ecological_life_support, food_water, health_care, coordination_exchange and critical_infrastructure. Membership means the declared failure can impair a function; it does not quantify a real service-loss fraction.

Let B be all nodes, or the members of one service basket. Within B, partition nodes by overlap group G. Define:

~~~text
C_G,B = max_(i in G intersect B) c_i
L_G,B(t) = max_(i in G intersect B and active at t) c_i
          (zero if no member is active)
L_B(t) = sum_G L_G,B(t) / sum_G C_G,B

S(t) = max(L_all(t), max_service L_service(t))
T_cascade = first t with S(t) >= cascadeThreshold
~~~

An empty denominator contributes zero. Oceans and biodiversity share ecosystem_integrity; their maximum member weight and maximum active weight are counted once within each basket. They remain separate network nodes and per-threat outputs. Other groups are singletons. This prevents one specified overlap from being summed twice, not all possible ecological or socioeconomic double counting.

The declared cascadeThreshold is 0.50; the Monte Carlo samples it uniformly from 0.40 to 0.60 in each run. There is no requirement for all three administrative domains, a minimum co-active-edge share, a minimum induced share or several propagation waves. A single seed may suffice if its weight crosses an essential-service basket. In the current dataset, ecological_life_support has two weight-3 overlap groups: climate and ecosystem_integrity. Activation of either produces a basket score of 0.50, which reaches the declared threshold and the sampled threshold in about half of the runs. This is a direct consequence of the basket convention, not evidence that half of planetary life support has physically disappeared.

S is the maximum of normalized model indices. It is not an additive fraction of the world, and a “Dynamic Cascade” crossing need not include an induced activation. Healthy scores elsewhere cannot compensate away an essential-basket crossing under this rule. Co-active edges, active domains and induced mass are diagnostics, not eligibility vetoes.

## Domain functional horizons

Each domain card now reconstructs a functional first-crossing from the same full-system activation history used by Dynamic Cascade. Propagation is therefore simulated across all three domains first; only the reporting basket and its denominator are restricted to civilization, biosphere or technology. Within that domain basket, the same criticality tiers, overlap grouping, essential-service maximum and threshold as in the run, including its sampled structure, are applied.

This corrects the previous domain display, which crossed 40 percent of sampled priority mass from standalone horizons and then compared that different estimand with the system cascade P50. The three domain denominators are separate and are not additive components of a global 100 percent. A domain crossing is a model-defined warning horizon for functional disruption after cross-domain propagation, not a statement that the entire domain has physically collapsed.

## Structural uncertainty

From model 1.5.0 the Monte Carlo also samples the structural choices of the functional cascade, because they are model judgments rather than measurements. Each run draws:

| Choice | Declared value | Sampled in each run |
| --- | --- | --- |
| cascadeThreshold | 0.50 | uniform 0.40 to 0.60 |
| Criticality tier values | 1, 2, 3 | each tier value uniform within ±0.5; all nodes of a tier share it, so tiers keep their order |
| Dependency weights a_ij | equal shares per target | Dirichlet with the declared shares as mean and concentration 2 per edge; each target's total is kept |
| Dependency lags | 1 year | whole years, uniform 0 to 5, per edge |
| Growth class | assigned class | one class down (25%), unchanged (50%) or up (25%) on 0.003 / 0.01 / 0.02 / 0.03, continued beyond both ends by the adjacent step ratio (0.0009 below, 0.045 above) |

A growth-class shift multiplies the threat's sampled growth by the ratio between the new and the assigned class, so the within-class sampling width is kept. The shifted growth then passes through the existing effective-growth clamps (the 0.0005 floor, the 0.08 global cap and each threat's `threat_specific_cap`), which can cut a move short, mainly upward: at its central growth of 0.03, Climate Breakdown can move up only to its cap of 0.035 (×1.17 instead of ×1.5) and AI to 0.04 (×1.33), while their downward moves to 0.02 are complete. For these two threats a class move down therefore weighs more than a class move up. Service memberships, overlap groups, topology, inducibility, the equations and the headline rule are not sampled.

Structural draws come from seeded streams that are separate from the parameter and event draws, one stream per component. With structural sampling switched off, the Monte Carlo reproduces model 1.3.0 exactly; the headline-determinism tests pin both results. Deterministic views and the OAT, Sobol, SMAA and other sensitivity diagnostics keep the declared structure, so they continue to isolate parameter effects.

Under Baseline, Expert weights, seed AC-1.2.6-2026 and 3,000 runs, structural sampling moves Dynamic Cascade P10/P50/P90 from 2033/2036/2042 to 2034/2038/2044. One component at a time, the threshold moves P50/P90 by +1/+1 year, dependency lags and growth class move P90 by +1 year, and criticality levels and dependency weights leave them unchanged. The combined P50 shift of two years is larger than the sum of the single shifts because the components interact. The other aggregation rules read the same runs: compensatory P10/P50/P90 moves from 2046/2054/2066 to 2046/2055/2068, graph heuristic from 2063/2076/2090 to 2064/2079/2097 (runs below its threshold in 2100 rise from 3.5% to 7.1%), and max-rule stays at 2026/2031/2036.

## Pressure turns and recovery

From model 1.5.0 the Monte Carlo lets pressure fall as well as rise. The dataset's growth priors describe continued pressure and contain no information on whether or when a threat's pressure could peak and decline. By owner instruction, no historical data or historical examples are used. The assumption is therefore stated openly:

| Choice | Value in every run |
| --- | --- |
| Turn probability | each threat independently, 50% by 2100 |
| Turn year T | uniform over whole years 2027 to 2100 |
| Pressure after the turn | retraces its rise: pressure(T + k) = pressure(T) / (1 + g_i)^k |
| Recovery drop | 25% for reversible and 50% for partly reversible threats; irreversible threats do not recover |

Standalone continuous and regime horizons are unchanged when the crossing year is at or before T. Otherwise the pressure peaks below the threshold and the threat does not cross (coded 2101). Event hazards follow the same mirrored pressure path and keep their single process draw. In the functional cascade q_i(t) follows the same path after T. An active node past its turn recovers in the first year in which q_i(t) + kappa_i*D_i(t) is at most (1 - drop) times the smaller of 1 and its value at activation. Recovery is evaluated before activation in each year, synchronously to a fixed point. A recovered node can be induced again, but its spontaneous activation happens at most once. Dependency lags count from an upstream node's latest activation, and domain horizons use each node's activity intervals.

The recovery class is the declared reversibility class shown on the threat pills. Irreversibility of at most 3.0 is reversible, from 4.2 irreversible, and partly reversible in between, with the dashboard's overrides: authoritarian drift, governance fragmentation and geopolitical escalation are reversible, and critical minerals irreversible. Climate, biodiversity, oceans, nuclear conflict and critical minerals are therefore irreversible. The turn design and the reversibility-based recovery were chosen by the owner from proposed options; the drops of 25% and 50% were set by the assistant.

The clocks and all horizons keep their first-crossing meaning. A run can fall back below the threshold after it has crossed, and the share of crossing runs below the threshold again in 2100 is reported separately. Turn draws come from their own seeded stream, two per threat per run, so parameter, structural and process draws are unchanged. With pressure turns switched off the Monte Carlo reproduces the structural-sampling-only result (2034/2038/2044) exactly. Turns only lower pressure and recovery only removes failures, so every run crosses in the same year as without turns or later. Deterministic views and the sensitivity diagnostics keep the declared continued-pressure path.

Under Baseline, Expert weights, seed AC-1.2.6-2026 and 3,000 runs, pressure turns move Dynamic Cascade P10/P50/P90 from 2034/2038/2044 to 2034/2038/2046. 6 runs (0.2%) do not reach the threshold by 2100. Compensatory P10/P50/P90 moves from 2046/2055/2068 to 2047/2058/2079, graph heuristic from 2064/2079/2097 to 2071/2092/>2100, and max-rule from 2026/2031/2036 to 2026/2031/2037. A turn prevents a crossing only if it comes before it, and most runs cross in the 2030s, so later turns cannot move the first-crossing year. No crossing run is below the threshold again in 2100: 83% of runs cross through the Ecological life support basket, whose three threats are irreversible.

## Monte Carlo, alternative aggregators and headline

Ordinal sampling uses a scaled Beta distribution on [1,5], fitted from the center and approximate width (hi-lo)/3.29, with a clipped-normal fallback. Growth and thresholds use mean-adjusted log-normal sampling with log-space width (log hi-log lo)/3.29, followed by runtime bounds. Scenario and uncertainty multipliers alter these widths. Therefore lo/hi are analyst plausibility anchors with an approximate 90-percent operational role, not empirically fitted confidence intervals, exact recovered quantiles or hard sampling limits.

Parameter uncertainty, stochastic event draws and sampled structural choices are distinct sources of variation. Regime timing is deterministic conditional on sampled priority, growth and threshold; cascade propagation is deterministic conditional on all sampled inputs and standalone years. Repeated calculations with the same complete configuration and seed must reproduce the same results; repeatability is not predictive accuracy.

Four aggregation outputs remain: compensatory priority-share crossing, earliest standalone crossing (Max-rule), graph-weighted Gaussian heuristic, and Dynamic Cascade. The first three retain their own definitions and do not use the criticality service rule; growth-class sampling reaches all four through the standalone horizons. Their disagreement indicates structural sensitivity, not an empirically estimated standard deviation of reality. The graph-linked score is not a probability justified by a validated correlation matrix.

The headline remains Dynamic Cascade P90: the 90th percentile of simulated functional-trigger years under the selected configuration. The quantile implementation linearly interpolates at position (n-1)*p in sorted samples. Runs with no trigger by 2100 use sentinel 2101 and display as >2100. Censored samples stay in the unconditional quantiles and by-year denominators; 2101 is not an estimated event date, and >2100 is not safety through 2100.

Standalone horizons and propagated first-activation horizons are recorded separately. Continuing a run to collect all per-threat activations does not change its first aggregate crossing. Interacting-tipping-system research supports representing cross-system interactions and explicitly testing threshold and timescale uncertainty, but it does not validate this implementation's weights or dates; see Möller et al. (2024), Nature Communications, DOI [10.1038/s41467-024-49863-0](https://doi.org/10.1038/s41467-024-49863-0). This document reports the rules, not predictive validation.
