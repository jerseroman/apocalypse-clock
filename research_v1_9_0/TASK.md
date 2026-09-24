# Functional cascade revision

Date: 2026-09-09. Change class: MODEL, including a DATASET revision.

Owner authorization: "Prosim da ponovno narediš json tako da bo pravilno vrednotil prav tako je teba uro kodo spisati tako da bo to pravilno računala, da bo pravilno utežen, najbolj racionalno."

Problem: selected indicator growth was misidentified as functional-pressure growth; a right-censored independent horizon blocked induced failures; aggregation required all three domains and used state-dependent salience weights. Loss of ecosystem function need not require zero remaining organisms.

Implementation plan: model 1.2.8 and dataset 1.9.0. Preserve the 23-threat / 8-metric contract, independent process models, PRNG, quantiles, four aggregators and P90 identity. Introduce a pure, directed functional-threshold cascade with fixed critical-function weights, explicit essential-service baskets, synchronous within-year closure and no administrative censoring/domain veto. A single seed may propagate, but every seed is not automatically a global collapse. Use direct, clearly judgmental growth-pressure prior classes, not unvalidated conversions of unrelated indicator CAGRs. Record functional-failure definitions and causal mechanisms in the dataset.

Numerical risks: new headline estimand and weights; uncertain conversion of normalized scores into time; absorbing first-failure states (not physical permanence); within-year cascade timing; possible double counting of baseline coupling and dynamic transmission; positive-growth conditional scenarios omit endogenous recovery. Coefficients, service baskets and loss thresholds are explicit hypotheses, not empirical probability estimates.

Files: new src/cascade-model.js; src/app.js ingestion, wrappers, MC accumulation, snapshots/exports and method wording; new data_v1_9_0.json; index.html and 404.html matching embeds/script/method text; scripts/validate-data.js, scripts/check-links.js; package.json and lock version; tests; CHANGELOG.md, README.md, docs/METHODOLOGY.md, docs/LIMITATIONS.md, ai-governance/model-invariants.md, review-log.md; research_v1_9_0 evidence, assembly and verification artifacts.

Not touched: vendor libraries, CSS/layout apart from essential existing text, public accounts/deployment, legal/license/author documents, original 1.7.1 and standalone 1.8.0 JSON. No unrelated engine or manuscript migration.

Affected output: Dynamic Cascade P10/P50/P90, conditional CDF and diagnostics, with separate standalone and propagated functional horizons. Existing export keys remain; new fields are additive. Same-seed repeatability remains required, old numerical goldens intentionally change.

Validation: baseline capture before changes; pure causal/monotonic/boundary tests; strict data validation and byte-equal embeds; source checks; complete npm check and npm test; all scenarios and weight profiles; JSON/CSV exports; actual file upload; comparison of old/new data and old/new model; multiple seeds, sample sizes and explicit structural sensitivity; visual UI inspection. Any unavailable live URL or incomplete scientific calibration is reported, not silently passed.

Baseline: model1.2.7 + bundled1.7.1, baseline/expert/default seed/3000: P10=2037,P50=2041,P90=2046. Archived app SHA256=720fe27c8675e343e86d38476b17ed7b09af4712c2d7f22d9232a6065499f444. All pre-change source, tests, scripts, datasets and documentation are copied to backups/pre-functional-cascade-2026-09-09. Restoring is an explicit owner-authorized backup operation, not an automatic destructive rollback.

Quota: initial combined task used2%, this implementation starts12%; retain the original ceiling31.4% used (30% of initially available98%), with reserve. Three research/review agents use Astra Ultra. No credit redemption.

Status: implemented and verified locally. Final full npm test: 40/40 PASS, exit0, with two workers and unchanged refreshed golden2033/2036/2043. The first full run had38/40 with two timing failures at five workers; unnecessary aggregate recomputation was removed without changing mathematical outputs. Actual pointer-driven import/run/JSON/CSV workflows pass. Live URL checks have disclosed external403 responses and resource-hint404s, not universal reachability PASS. See final-validation.json and README.md. No predictive-validity or deployment claim.
