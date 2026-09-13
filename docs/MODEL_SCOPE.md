# Model Scope

Apocalypse Clock 1.2.8 with dataset 1.9.0 is an experimental browser-based model for comparing conditional systemic-risk scenarios. It supports inspection and criticism of explicit assumptions; it is not peer reviewed, an official risk assessment or an empirically validated collapse forecast.

## Represented functions

The model retains 23 threats and eight metric entries per threat. Additional metadata defines functional boundaries, directed dependencies, fixed criticality weights and five essential-service baskets:

- ecological and climatic regulation;
- food and usable-water provision;
- infection control and health-care continuity;
- coordination, information and exchange;
- essential technical infrastructure.

A functional boundary concerns failure to sustain a specified function despite the modeled allowance for buffers and substitutes. It does not require extinction, zero biomass, destruction of every asset or disappearance of every service. Conversely, the model does not infer current threshold crossing solely from a serious observed burden, rising indicator or high ordinal score.

Definitions and assignments are in [data_v1_9_0_functional.json](../data_v1_9_0_functional.json). They are analyst judgments, not observed global capacity fractions.

## Two paths to activation

Standalone continuous, event and regime processes supply model-derived activation years. A directed capacity-loss rule can additionally induce eligible targets before their standalone year, including targets whose standalone year is censored beyond 2100. It uses pre-network latent pressure, incoming vulnerability, declared fixed edge weights and propagation lags.

Nuclear conflict, engineered biological events, pandemics and autonomous-weapons escalation require their initiating event and cannot be created by generic capacity loss. They are not excluded from the model: they retain standalone processes, aggregate eligibility and effects as active upstream sources. Additional event-specific escalation or release mechanisms are outside the current implementation.

AI includes correlated deployment/control failures rather than only a hypothetical advanced-agent takeover. Space includes loss of navigation, timing, communication or observation rather than only destroyed satellites. These broader functions remain eligible for generic induction.

First activation is an absorbing first-passage marker. The model does not simulate subsequent duration, repair, restoration, adaptation or repeated failure/recovery cycles.

## Meaning of the headline

Dynamic Cascade P90 is the upper model quantile of the first year that a fixed-criticality functional index reaches its selected threshold globally or within an essential-service basket. The default threshold is 0.50.

The rule takes the maximum of those indices. It does not require all three administrative domains, a particular number of active edges or a minimum induced contribution. It may cross without a multi-node cascade. Oceans and biodiversity are counted once through their shared overlap group within each basket, but remain separate network nodes.

The headline is conditional on dataset, scoring, prior distributions, scenario, threshold policy, graph, weights, lags and random seed. It is not a physical fraction of lost civilization, an empirical 90-percent probability of collapse, a guaranteed date or a deadline before which serious harm cannot occur. >2100 means that the relevant quantile is unresolved beyond the model horizon, not absence of risk.

Four aggregation rules remain available. Their differing outputs are structural alternatives, not four independently validated forecasts. Weibull and network diagnostics do not validate the standalone calendar mappings or the cascade mechanism.

## Evidence and scenario boundary

Growth values are directly selected common-class priors for annual latent functional pressure. They are not transformed CAGRs of emissions, withdrawals, stocks, production, reported cases or technical benchmarks. Positive-only growth and fixed annual rates describe a continued-pressure scenario rather than all possible futures.

Sources can support mechanisms and present conditions while leaving normalized scores, fixed tiers 1/2/3, equal incoming weights and one-year propagation lags unidentified. The standard lag has zero- and five-year sensitivity alternatives. Such comparisons test assumptions; they do not estimate real causal delays.

Model 1.2.8 changes the functional estimand and propagation rules. Older importers may ignore the new metadata, and older headline goldens are not a scientific calibration target. The implementation and its limitations are documented in [METHODOLOGY.md](METHODOLOGY.md) and [LIMITATIONS.md](LIMITATIONS.md).

## Use boundary

The model can support scenario comparison, structural sensitivity analysis, source review and public methodological criticism. It is not a real-time emergency warning or a standalone basis for legal, financial, medical, security or policy decisions. No new numerical results or validation outcomes are asserted by this scope document.
