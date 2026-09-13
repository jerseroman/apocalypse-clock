# Methodology

This document describes Apocalypse Clock model 1.2.9 with dataset 1.9.0. It is an experimental scenario model, not a peer-reviewed or empirically validated forecast. Numerical conventions below describe the implementation; they are not measurements of collapse probability.

## Inputs and implementation

The dataset [data_v1_9_0_functional.json](../data_v1_9_0_functional.json) retains 23 threats and eight flat metric entries per threat: scale, urgency, acceleration, interdependence, irreversibility, governance failure, growth rate and threshold. The 184-entry contract does not include the additional model parameters in metadata.

Functional definitions, fixed weights, service memberships, overlap groups, inducibility and directed edge weights/lags are recorded in _meta.functional_model.nodes and mirrored on threshold entries. Growth conventions are recorded in _meta.growth_mode, _meta.growth_prior_classes, _meta.growth_inputs and _meta.calibration_method; this dataset does not have a separate _meta.growth_model object.

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

The positive-only model is conditional on continued pressure. It does not implement endogenous recovery or a negative-growth pathway. Fixed g_i over the displayed horizon is a structural scenario, not an observed trend guaranteed through 2100.

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

All declared edges currently have a one-year lag. Thus a source activated in year t normally first contributes in t+1. Zero- and five-year uniform lag overrides are defined structural sensitivity cases, not measured delay estimates. Zero-lag paths can traverse several synchronous waves within a year. Source/target ordering does not determine activation.

The four nodes nuclear, bioengineered, pandemics and autonomousw have functional_inducible=false. Generic capacity loss cannot create their initiating war, biological event, outbreak or targeting escalation. They remain in all standalone processes, aggregate baskets and the source network, and can transmit after their modeled initiating activation. Additional hazard-specific initiation channels are not implemented, rather than declared physically impossible. AI and space retain broader functional definitions that allow disruption without, respectively, an advanced-agent takeover or destruction of satellites.

An initially censored standalone horizon does not bar induction for eligible nodes: q_i uses pressure and growth, not distance to 2101. q_i>=1 alone does not activate a node through the generic induction branch; positive incoming influence is also required. A node activated spontaneously at the start of a year retains that cause label.

Activation is an absorbing record of first functional-threshold passage. It is not zero remaining biomass, total service extinction or permanent physical destruction. Duration, repair and recovery after first passage are outside this state representation.

## Fixed criticality and overlap-aware aggregation

Each node has an analyst-selected fixed weight c_i:

| Tier | Meaning |
| --- | --- |
| 1 | Primarily a cross-system amplifier |
| 2 | Major partial functional disruption with meaningful alternatives |
| 3 | Broad essential function with limited timely substitutes |

These are consequence tiers, not probabilities, GDP/population shares or sampled priorities. Service baskets are ecological_life_support, food_water, health_care, coordination_exchange and critical_infrastructure. Membership means the declared failure can impair a function; it does not quantify a real service-loss fraction.

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

The default cascadeThreshold is 0.50. There is no requirement for all three administrative domains, a minimum co-active-edge share, a minimum induced share or several propagation waves. A single seed may suffice if its fixed weight crosses an essential-service basket. In the current dataset, ecological_life_support has two weight-3 overlap groups: climate and ecosystem_integrity. Activation of either produces a basket score of 0.50. This is a direct consequence of the basket convention, not evidence that half of planetary life support has physically disappeared.

S is the maximum of normalized model indices. It is not an additive fraction of the world, and a “Dynamic Cascade” crossing need not include an induced activation. Healthy scores elsewhere cannot compensate away an essential-basket crossing under this rule. Co-active edges, active domains and induced mass are diagnostics, not eligibility vetoes.

## Domain functional horizons

Each domain card now reconstructs a functional first-crossing from the same full-system activation history used by Dynamic Cascade. Propagation is therefore simulated across all three domains first; only the reporting basket and its denominator are restricted to civilization, biosphere or technology. Within that domain basket, the same fixed criticality tiers, overlap grouping, essential-service maximum and default 0.50 threshold are applied.

This corrects the previous domain display, which crossed 40 percent of sampled priority mass from standalone horizons and then compared that different estimand with the system cascade P50. The three domain denominators are separate and are not additive components of a global 100 percent. A domain crossing is a model-defined warning horizon for functional disruption after cross-domain propagation, not a statement that the entire domain has physically collapsed.

## Monte Carlo, alternative aggregators and headline

Ordinal sampling uses a scaled Beta distribution on [1,5], fitted from the center and approximate width (hi-lo)/3.29, with a clipped-normal fallback. Growth and thresholds use mean-adjusted log-normal sampling with log-space width (log hi-log lo)/3.29, followed by runtime bounds. Scenario and uncertainty multipliers alter these widths. Therefore lo/hi are analyst plausibility anchors with an approximate 90-percent operational role, not empirically fitted confidence intervals, exact recovered quantiles or hard sampling limits.

Parameter uncertainty and stochastic event draws are distinct sources of variation. Regime timing is deterministic conditional on sampled priority, growth and threshold; cascade propagation is deterministic conditional on all sampled inputs and standalone years. Repeated calculations with the same complete configuration and seed must reproduce the same results; repeatability is not predictive accuracy.

Four aggregation outputs remain: compensatory priority-share crossing, earliest standalone crossing (Max-rule), graph-weighted Gaussian heuristic, and Dynamic Cascade. The first three retain their own definitions and do not inherit the new fixed-criticality service rule. Their disagreement indicates structural sensitivity, not an empirically estimated standard deviation of reality. The graph-linked score is not a probability justified by a validated correlation matrix.

The headline remains Dynamic Cascade P90: the 90th percentile of simulated functional-trigger years under the selected configuration. The quantile implementation linearly interpolates at position (n-1)*p in sorted samples. Runs with no trigger by 2100 use sentinel 2101 and display as >2100. Censored samples stay in the unconditional quantiles and by-year denominators; 2101 is not an estimated event date, and >2100 is not safety through 2100.

Standalone horizons and propagated first-activation horizons are recorded separately. Continuing a run to collect all per-threat activations does not change its first aggregate crossing. Interacting-tipping-system research supports representing cross-system interactions and explicitly testing threshold and timescale uncertainty, but it does not validate this implementation's weights or dates; see Möller et al. (2024), Nature Communications, DOI [10.1038/s41467-024-49863-0](https://doi.org/10.1038/s41467-024-49863-0). This document reports the rules, not predictive validation.
