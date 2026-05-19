# Methodological Review — Dynamic Cascade P90 Chain

Formal record of the methodological audit of the public-facing Dynamic Cascade P90 headline output in Apocalypse Clock v1.2.7. This document does not propose implementation changes.

Read together with [project-specification.md](project-specification.md), [numerical-integrity-rules.md](numerical-integrity-rules.md), [model-invariants.md](model-invariants.md), [protected-paths.md](protected-paths.md), and [change-policy.md](change-policy.md).

## Executive summary

The Dynamic Cascade P90 chain is numerically internally consistent. The audit identified one model-level assumption, three numerical limitations bounded in magnitude (most below one year on the displayed integer), and a larger set of interpretive limitations where wording does not always make the underlying statistical meaning unambiguous to a non-specialist reader. Eight examined behaviours were confirmed harmless. Communication issues can be addressed without touching model code; methodological choices cannot be changed without a model-version bump.

## Audited code paths

- `fmtY` — `src/app.js:13`
- `probabilityByDisplayedYear` — `src/app.js:15-35`
- `quantile` — `src/app.js:60-65`
- `buildCdf` — `src/app.js:1696-1704`
- `summarizeCrossings` — `src/app.js:1706-1732`
- Sentinel-returning paths: `computeHorizon`, `sampleEventHorizon`, `sampleRegimeHorizon`, `computeDynamicCascadeCrossing`
- Headline display: `updateUI` — `src/app.js:5226-5243`

Finding IDs (A1–E6) refer to the prior audit.

## 1. Confirmed harmless behaviours

Behaviours examined and confirmed correct, defensible, or harmless under current code paths.

| ID | Behaviour | Why harmless |
|---|---|---|
| A2 | `buildCdf` excludes sentinel from CDF | Loop bounded to `[YS, YE]`; sentinel `YE+1` never advances the cumulative pointer |
| B1 | `quantile` uses Type-7 linear interpolation | Standard default (Hyndman and Fan, 1996); matches R, NumPy default, D3 |
| B2 | `quantile([])` returns 0 | Defensive guard; current pipeline never produces an empty crossing array |
| C1 | CDF and raw-count probability paths agree | Both filter `Number.isFinite(y) && y ≤ displayYear` |
| C3 | NaN return renders as empty string | Caller checks `Number.isFinite`; `'NaN'` cannot appear in the badge |
| C4 | `cdf[2025].prob = 0` always | All horizon samplers clamp at `NOW = 2026`; first CDF cell is structurally zero |
| D2 | `Math.round` is round-half-up | JavaScript standard; consistent with user expectation for positive integers |
| D4 | `fmtY(NaN)` would render `'NaN'` | Latent only; no current path produces NaN that reaches the formatter |

## 2. Interpretive limitations

Numerics are internally consistent. The reading of the displayed values can be misled by wording, framing, or output combinations.

| ID | Issue | Surface |
|---|---|---|
| A4 | Sentinel headline `>2100` paired with sub-90% probability in the badge | Tooltip text and badge value |
| B3 | Fractional quantile-derived year and integer CDF-derived probability can disagree by up to one year | Display vs. badge |
| C2 | Sentence template "on or before `${displayYear}`" renders as "on or before `>2100`" when sentinel is shown | Tooltip text |
| C5 | Badge percent can drift above or below 90% depending on rounding direction; tooltip warns only about the upward case | Tooltip text |
| D1 | `fmtY`'s boundary check uses the raw float, not the rounded value | Documentation vs. observed behaviour |
| D3 | Same formatter used for per-threat horizons (single events) and ensemble quantiles (distributions) | Conflation of semantic types |
| E1 | "P90 upper edge" framing suggests a worst-case bound; statistically it is a centre-of-distribution quantile | Tooltip and headline note |
| E2 | "On or before `>2100`" in tooltip | Tooltip sentence template |
| E3 | Tooltip warns only about the upward rounding bias; the downward bias is symmetric and unaddressed | Tooltip text |
| E4 | Cascade described as a multi-year feedback process but reported as a single onset year | Headline long note |
| E5 | Headline rule not always disambiguated against the four-aggregator ensemble | Public-facing display |
| E6 | Badge couples CDF-derived percent with quantile-derived year | Tooltip + badge layout |

None of these changes a number in any JSON or CSV export. All are within the COSMETIC change class per [change-policy.md](change-policy.md), provided the revisions preserve every numerical claim.

## 3. Numerical limitations

Issues where the displayed or exported number is influenced by a specific implementation choice, even when defensible.

| ID | Issue | Numerical effect |
|---|---|---|
| A1 | Sentinel value `YE+1 = 2101` participates in `quantile` linear interpolation | P90 can be a fractional year representing a mix of real-year and never-crossed samples |
| A3 | `fmtY` applies the sentinel check (`y > YE`) on the raw float, not the rounded value | Years in `(YE, YE+0.5]` jump to the sentinel display rather than rounding down to `2100` |
| A5 | Bootstrap CI in `summarizeCrossings` inherits the sentinel-as-year convention | Bootstrapped P50 quantiles inflate when sentinel mass is large; `structuralSigma` inherits this |

Each is bounded in magnitude: A1 and A3 by at most one year on the displayed integer, A5 by the difference between sentinel-included and sentinel-excluded percentiles. Each is a deterministic property of the current implementation and should be cited when results are interpreted.

## 4. Model-level assumptions

Methodological choices that constitute the model's identity rather than implementation details. None can be changed silently; each is governed by [model-invariants.md](model-invariants.md).

### 4.1 Single-number P90 over a mixed-support distribution (B4)

The Dynamic-cascade crossing-year distribution mixes:
- runs that crossed in a real year `∈ [NOW, YE]`
- runs that did not cross by `YE` (encoded as sentinel `YE+1`)

The reported P90 is well-defined under the convention that the sentinel is treated as a finite integer strictly greater than every real year. The headline number is therefore conditional on this convention, not a measurement of the underlying systemic risk in isolation.

Three equivalent representations of the same information exist:
- the year `P90` quantile (current headline)
- the empirical CDF value `P(crossing ≤ y)` for a chosen reference year `y`
- the share of runs that did not cross by `YE` (sentinel rate)

All three are computed; the first is elevated to the public-facing headline.

### 4.2 Cascade onset as a single year

`computeDynamicCascadeCrossing` returns the first year in which all four cascade gates (`activeDomains ≥ 3`, `transmissionShare ≥ 0.25`, `activeMass ≥ params.cascadeThreshold`, `cascadeBoost ≥ 0.06`) fire simultaneously. The model encodes this single onset year as the cascade's representative timestamp. A cascade is physically a multi-year process; the headline year reports the start of the trigger condition, not the midpoint or completion.

### 4.3 Quantile-type commitment

Type-7 linear interpolation across order statistics is one of nine standard quantile definitions. Choice of type would shift the headline year deterministically by up to one year for typical sample sizes. The current choice is defensible and standard.

### 4.4 Sentinel-value convention

Choice of `YE+1` (rather than `Infinity`, `null`, or `YE` clipped) gives the sentinel a stable, sortable integer position above every real year. This permits ordinary sort, quantile, and percentile arithmetic to operate without special-casing, at the cost of allowing the sentinel to participate in interpolation (A1).

### 4.5 Single shared PRNG stream

`random01` is sourced from a single seeded Mulberry-style PRNG. Monte Carlo sampling, regime sampling, event sampling, and bootstrap resampling all draw from the same stream. The bootstrap CI is therefore deterministic given the seed but is not independent of the sample it summarises.

## 5. Issues that affect communication only

The following do not change a single number in any export, CDF, or quantile. They affect only the public reading of the dashboard.

- A4, B3, C2, C5, D1, D3, E1, E2, E3, E4, E5, E6.

All can be addressed by wording or layout changes without touching model code. Per [change-policy.md](change-policy.md), these are COSMETIC class.

## 6. Issues that affect actual statistical meaning

The following influence at least one numerical output non-trivially, or alter the semantic class of a reported number.

- **A1** — the P90 quantile is a hybrid of real and sentinel years when the crossing distribution straddles `YE`.
- **A3** — half-year boundary asymmetry between `fmtY` and `Math.round`.
- **A5** — bootstrap CI inherits the sentinel convention; flows into `structuralSigma` and the CDF bootstrap band.
- **B3** — fractional quantile and integer CDF can disagree by up to one year, and the headline display and its accompanying badge are sourced from those two different paths.
- **B4** — the single-number P90 over a mixed-support distribution is a methodological commitment; alternative summaries (CDF, conditional-on-crossing P90, sentinel rate) yield different headline values.

These are the items where the boundary between "make wording clearer" and "change the model" runs through the audit.

## 7. Issues requiring a model-version bump if changed

Per [change-policy.md](change-policy.md), any change to the following would require:

- a `MODEL_VERSION` bump in `src/app.js`
- a matching `package.json` version bump
- a `CHANGELOG.md` entry stating rationale and headline impact
- a refreshed golden value for the headline determinism test
- an updated section in [model-invariants.md](model-invariants.md)

| Item | Reason model-class |
|---|---|
| A1 — sentinel participation in `quantile` | Changes the P90 numeric whenever any sample is a sentinel |
| A3 — `fmtY` boundary rule | Changes the displayed year for samples in `(YE, YE+0.5]` |
| A5 — bootstrap on a sentinel-excluded subset | Changes `samplingSigma`, `parameterSigma`, and the CDF bootstrap band |
| B4 — choice of headline statistic | Changes the value of `headlineRule` and the displayed integer |
| §4.3 — quantile type | Changes every p10/p50/p90 across all four aggregators |
| §4.4 — sentinel value | Cascades through every comparison against `YE+1`, `Number.isFinite`, and `fmtY` |
| §4.5 — independent bootstrap PRNG | Numerically changes every CI, even when conceptually correct |

The interpretive issues in Section 2 do not require a model-version bump. They remain COSMETIC class provided wording revisions preserve every numerical claim.

## 8. Recommended future research directions

Open methodological questions, not implementation tasks. Each could be studied without modifying model code, or could form the basis of a research note or public methodology statement.

### 8.1 Headline statistic robustness across sample sizes

At `nSim = 3000`, the headline P90 is dominated by approximately the 30 latest order statistics. A controlled study of headline convergence across `nSim ∈ {1k, 3k, 10k, 30k, 100k}` would document the sample-size sensitivity of the public-facing number, particularly for runs near the sentinel boundary.

### 8.2 Sensitivity of P90 to the sentinel convention

Comparing four alternative encodings of "no crossing" — `YE+1`, `Infinity`, exclusion (`null`), and `YE` clipping — under the same MC draws would quantify how the choice of sentinel value moves the headline. Computable from existing exports.

### 8.3 Conditional versus unconditional summaries

A side-by-side comparison of three framings would clarify which best communicates with non-specialist audiences:
- current unconditional P90 with sentinel-as-year
- conditional P90 (over runs that crossed) paired with sentinel rate
- CDF reference points: `P(cross ≤ 2050)`, `P(cross ≤ 2075)`, `P(cross ≤ 2100)`

### 8.4 CDF-derived versus quantile-derived headline

The current headline uses `Math.round(quantile(_, 0.9))`. An alternative is `min{y : cdf(y) ≥ 0.9}`. Documenting the frequency and magnitude of disagreement between the two over the dataset's parameter ranges, and selecting one as canonical, would close issue B3.

### 8.5 Reader-comprehension study

Items E1–E6 are user-side reading errors that show up only with real readers. A small structured study (around five non-specialist participants reading the dashboard and answering targeted questions) would identify the misreadings most worth addressing in tooltip and headline-note wording.

### 8.6 Cascade onset versus trajectory

`computeDynamicCascadeCrossing` returns onset year only. A diagnostic returning onset year, "60% loaded" year, and "fully loaded" year would reveal whether the headline year is a robust summary of the cascade arc or merely an early-warning point.

### 8.7 Alternative quantile types

Reporting the P90 under three quantile types (Type-4 nearest-rank, Type-7 linear interpolation, Type-8 median-unbiased) alongside the headline, even as a diagnostic-panel-only number, would expose the model's sensitivity to this commitment.

### 8.8 Independent bootstrap

Studying whether an independent PRNG stream for the bootstrap meaningfully changes the reported CIs would clarify whether the current CIs are conservative, anti-conservative, or empirically unaffected.

### 8.9 Cross-aggregator agreement under sentinel pressure

The four aggregators (compensatory, max-rule, graph-weighted, dynamic cascade) currently disagree by `structuralSigma` years. A study of how this disagreement behaves as the sentinel mass increases (high-cooperation scenarios) would clarify whether `structuralSigma` is meaningful at the boundary.

## Document status

This is a confidential governance document, not a public methodology statement. It records the state of the Dynamic-cascade-P90 chain at version 1.2.7. Subsequent revisions append; prior text is not deleted. Any change to a finding here must reference the corresponding entry in [review-log.md](review-log.md).
