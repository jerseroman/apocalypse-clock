# Apocalypse Clock — Audit Test Results and Impact Summary

**Repository:** https://github.com/jerseroman/apocalypse-clock  
**Audited commit:** `a9c9bbfbbf6b0ecfd5d6ac4ef337aee2ff190ab9`  
**Audit date:** 2026-05-20  
**Audit package:** Audit A, Audit B, Audit C, Audit D  
**Status:** **YELLOW — internally coherent, no critical headline-path defect found, but not externally scientifically validated**

---

## 1. Purpose of this file

This file summarizes the current internal audit results for the Apocalypse Clock repository.

It is intended to give reviewers a compact, structured view of:

1. what was tested;
2. how many checks were performed;
3. which tests passed;
4. which findings remain open;
5. whether each finding affects the final displayed result;
6. which fixes should be prioritized before stronger validation claims are made.

This file is **not** a scientific peer-review report. It is a repository-level audit summary based on the four internal audit reports listed below.

---

## 2. Source audit reports

| Report | Scope | File |
|---|---|---|
| Audit A | Repository structure, build, data integrity, basic runtime smoke checks | `AUDIT_A_REPORT.md` |
| Audit B | Numerical model, Monte Carlo, weighting, growth handling, edge cases | `AUDIT_B_REPORT.md` |
| Audit C | Logic, cascades, scenarios, rankings, model integration | `AUDIT_C_REPORT.md` |
| Audit D | UI correspondence, desktop/mobile parity, documentation, governance, security, false-confidence risk | `AUDIT_D_REPORT.md` |

---

## 3. Executive verdict

The four audits found **no high-severity defect proving that the main Apocalypse Clock headline is hardcoded, mathematically broken, or produced by a separate untracked calculation path**.

The audited model is internally traceable:

```text
dataset → MCDA base score → dependency amplification → priority → horizon → Monte Carlo aggregation → Dynamic Cascade P90 headline
```

However, the audits also found several unresolved issues affecting reproducibility, interpretability, future maintainability, and epistemic caution.

The correct public framing is therefore:

> Apocalypse Clock has passed internal repository, data-integrity, numerical, cascade-logic, UI-parity, documentation, governance, and security audits. These audits found no critical defect in the displayed headline calculation path. The model remains an illustrative, model-internal systemic-risk framework, not an empirically validated forecast, scientific peer review, or probability of civilizational collapse.

---

## 4. Test and check inventory

### 4.1 Formal automated test/check suite

| Category | Command / mechanism | Count | Result | Notes |
|---|---:|---:|---|---|
| Dependency install / npm audit | `npm install` | 1 gate | PASS | 3 packages added, 4 packages audited, 0 vulnerabilities |
| JavaScript syntax check | `node scripts/check-js.js` | 9 JS files | PASS | Syntax check only; no ESLint/TypeScript configured |
| Data validation | `node scripts/validate-data.js` | 184 parameters | PASS | Validates 23 threats × 8 metrics and embedded dataset copies |
| External URL format check | `node scripts/check-links.js` | 129 URLs | PASS | Format-only check; live reachability was not exercised in this audit |
| Playwright smoke test | `tests/smoke.spec.js` | 1 test | PASS | Static dashboard loads and core controls respond |
| Playwright headline determinism | `tests/headline-determinism.spec.js` | 2 tests | PASS | Golden headline match + bit-identical re-run, with reproducibility caveat below |
| Playwright unit tests | `tests/units.spec.js` | 3 tests | PASS | `quantile`, `fmtY`, `probabilityByDisplayedYear` |

**Formal Playwright tests:** 6 passed, 0 failed, 0 skipped.  
**Basic automated check units:** 9 JS syntax checks + 184 data checks + 129 URL format checks + 6 Playwright tests = **328 checked units**.  
**Including install/audit gate:** **329 total automated gates/check units**.

> Count note: `184` and `129` are counted as checked units because the validation tools explicitly traverse each dataset entry and URL-format entry. They are not all independent unit tests.

---

## 5. Audit-level results

| Audit | Main result | Headline-path status | Open finding count |
|---|---|---|---:|
| Audit A | Foundation sound; gate result YELLOW | No direct headline-path break found | 4 |
| Audit B | Numerical model internally consistent | One reproducibility issue may affect repeated headline under concurrency | 5 |
| Audit C | Cascade and scenario logic mostly sound | No double-counting in clock path; scenario UX caveat | 4 |
| Audit D | UI matches calculation; docs mostly consistent | No UI/calculation mismatch; interpretive false-confidence risk | 5 |
| **Total** | **No critical blocker found** | **Main path coherent, but not scientifically validated** | **18 findings** |

---

## 6. What passed

### 6.1 Data integrity

| Check | Result |
|---|---|
| 23 threats present | PASS |
| 8 metrics per threat | PASS |
| 184 model parameters excluding metadata | PASS |
| `lo ≤ mu ≤ hi` | PASS |
| No `NaN`, `Infinity`, `null`, or string-as-number in `mu/lo/hi` | PASS |
| Growth rates finite | PASS |
| No duplicate threat IDs | PASS |
| Embedded JSON in `index.html` and `404.html` byte-equal to standalone dataset | PASS |

### 6.2 Numerical model

| Check | Result |
|---|---|
| Deterministic scoring path traceable | PASS |
| `mu/lo/hi` interpretation consistent | PASS |
| P10/P50/P90 quantile method uniform | PASS |
| Growth rate annual compounding confirmed | PASS |
| No growth-rate double conversion found | PASS |
| MCDA weights sum to 1.0 | PASS |
| Domain weights normalized at point of use | PASS |
| Single-threat hand trace for `climate` matches code | PASS |
| Weibull parameters finite/plausible | PASS |
| Poisson-binomial diagnostic uses exact DP convolution | PASS |
| Edge cases do not crash or produce `Infinity` | PASS with caveats |

### 6.3 Cascade and scenario logic

| Check | Result |
|---|---|
| No headline-path double-counting found | PASS |
| `depFactor` is single-pass, not recursive | PASS |
| Dynamic cascade uses `Set` bookkeeping | PASS |
| Scenario switching does not mutate underlying `THREATS` data | PASS |
| Scenario changes reach scores/priorities/horizons/growth/GSI | PASS |
| Scenario changes do not alter thresholds/citations/methodology text | PASS |
| Headline label matches calculation: Dynamic Cascade P90 | PASS |
| Stress gauge and projected horizon are separate outputs | PASS |

### 6.4 UI, parity, governance, security

| Check | Result |
|---|---|
| Displayed priority/threshold values match computed values | PASS |
| No hardcoded displayed model values found | PASS |
| Desktop and mobile headline match | PASS |
| Desktop and mobile GSI match | PASS |
| Desktop and mobile top-ranking outputs match | PASS |
| Single responsive codebase; no mobile/desktop logic fork | PASS |
| Documentation mostly matches code | PASS |
| Non-forecast/non-prophecy disclaimers present | PASS |
| No secrets or API keys found | PASS |
| No analytics/tracking/beacons found | PASS |
| HTTPS-only external resources | PASS |

---

## 7. Open findings and effect on the final result

### 7.1 Summary table

| ID | Severity | Finding | Direct effect on final displayed headline? | Effect on interpretation / trust |
|---|---|---|---|---|
| A1-1 | Low–Medium | `404.html` is a near-duplicate of `index.html` with drifted/broken social-share links | No direct effect on main `index.html` headline | Maintenance hazard; 404 route may show broken share controls |
| A3-1 | Informational | 17 of 184 parameters have `source` text but no external URL | No computational effect | Weakens provenance for model anchors/expert-judgment entries |
| A4-1 | Low | `NOW = 2026` is hardcoded | Current audited run stable; future years may become stale | Calendar-year maintenance risk |
| A5-1 | Low / design | No `localStorage`, `sessionStorage`, or `indexedDB` persistence | No direct effect; reload recomputes deterministically | State is not preserved; any expected storage key does not exist |
| B-1 | Medium | Shared global PRNG can desynchronize Monte Carlo under concurrent stochastic routines | Yes, under overlap: observed Dynamic Cascade P90 may flip between 2045 and 2046 | Weakens reproducibility claim during post-load/concurrent run window |
| B-2 | Low | `NaN` in parameter `mu` can propagate into priority/GSI if validation is bypassed | No effect with validated dataset | Defense-in-depth gap for malformed injected data |
| B-3 | Low / informational | Negative `growth_rate` is silently coerced to near-zero positive growth | No effect with current non-negative dataset | If future negative-growth modelling is intended, behavior is misleading |
| B-4 | Low / informational | Audit brief weighting description differs from implemented code weights | No runtime effect | Documentation/brief mismatch; code must be treated as authoritative |
| B-5 | Low / informational | Beta fits accept J-shaped distributions for high-mean ordinal parameters | Affects MC distribution shape, not deterministic score | Valid mathematically, but should be documented as an assumption |
| C-1 | Low–Medium | Eigenvector centrality double-adds mutual dependency edges | No; diagnostic only | Inflates diagnostic centrality for mutual hubs such as climate/geopolitics |
| C-2 | Medium | `amplifier_risk` vs `catastrophic_pathway` is display-only | Yes conceptually: amplifier threats still enter horizons/cascade like pathway threats | UI implies a model-level distinction that is not enforced in dynamics |
| C-3 | Low | Scenario switch updates deterministic layer but does not automatically re-run Monte Carlo | Yes in UI workflow: headline may clear or remain stale until Run is pressed | User may believe a stale/blank headline reflects the selected scenario |
| C-4 | Low / informational | Top-N ranking metric is deterministic priority; headline is MC cascade P90 | No computational error | User may wrongly infer the #1 ranked threat directly determines the big year |
| D-1 | Low–Medium | CDN executable scripts lack Subresource Integrity | No, unless CDN/DNS compromise occurs | Supply-chain security risk |
| D-2 | Medium | Duplicated cascade logic in headline and explanation functions | No current effect if both copies match; future edit risk | Headline and explanation could silently diverge after tuning |
| D-3 | Low–Medium / epistemic | False-confidence surface: sophisticated statistics over AI-generated unreviewed inputs | No arithmetic effect | Users may overread the output as empirical validation |
| D-4 | Low | README understates `404.html` duplication/drift | No direct output effect | Documentation underreports a maintenance hazard |
| D-5 | Low | Large red headline year + `!` visually dominates caveats | No arithmetic effect | Rhetorical hierarchy overstates certainty relative to uncertainty bands |

---

## 8. Detailed impact analysis by final output area

### 8.1 Main headline year

**Current audited headline:** `2045` under baseline/expert/default seed in the audited run.

| Issue | Possible effect on headline |
|---|---|
| B-1 shared PRNG | The only finding with demonstrated direct ability to change the headline under overlap. Dynamic Cascade P90 was observed as 2045 vs 2046 across identically seeded overlapping runs. |
| C-3 scenario switch behavior | The headline may not immediately represent the newly selected scenario unless Monte Carlo is re-run or cached results exist. |
| D-2 duplicated cascade logic | No current effect, but future edits may cause the displayed headline and its explanation to diverge. |
| A4-1 hardcoded `NOW = 2026` | Current output is deterministic for the audited year; future calendar years may become stale if not updated. |

### 8.2 Global Stress Index / current stress gauge

| Issue | Possible effect |
|---|---|
| B-2 NaN propagation | If invalid data bypasses validation, `NaN` may poison priorities and GSI. With the current validated dataset, no effect. |
| Scenario changes | Expected effect: GSI changes under scenario shifts. Audit C confirmed scenario propagation is correct. |

### 8.3 Threat ranking / Top-N cards

| Issue | Possible effect |
|---|---|
| C-4 ranking vs headline metric | Threat cards rank deterministic `priority`, while headline is system-level Dynamic Cascade P90. This is valid but must be made clear. |
| C-2 amplifier display-only classification | Amplifier risks are ranked and counted like other threats despite UI language suggesting they are not direct pathways. |

### 8.4 Diagnostic panels

| Issue | Possible effect |
|---|---|
| C-1 eigenvector double-add | Inflates centrality for mutually dependent pairs in diagnostic centrality output. Does not feed headline. |
| B-5 J-shaped Beta distributions | Affects sampled uncertainty shapes for high-mean ordinal parameters. Valid but should be explicit. |

### 8.5 Public interpretation

| Issue | Possible effect |
|---|---|
| D-3 false-confidence surface | The final output can appear more empirically grounded than it is. |
| D-5 dramatic headline presentation | Large red year plus exclamation mark visually dominates the caveats. |
| A3-1 missing URLs | Some model anchors rely on source text without external URL, weakening evidence traceability. |

---

## 9. Severity classification

| Severity | Findings | Count |
|---|---|---:|
| Critical / blocker | None found | 0 |
| High | None found | 0 |
| Medium | B-1, C-2, D-2 | 3 |
| Low–Medium | A1-1, C-1, D-1, D-3 | 4 |
| Low | A4-1, A5-1, B-2, B-3, B-4, B-5, C-3, C-4, D-4, D-5 | 10 |
| Informational / provenance | A3-1 | 1 |
| **Total findings** |  | **18** |

---

## 10. Priority fix plan

### Priority 1 — Reproducibility and headline integrity

1. **Fix B-1: isolate Monte Carlo random streams.**  
   Each stochastic routine should receive its own local seeded RNG instance. Avoid one shared global `_mcRng` across `runMC`, `runSensitivity`, self-tests, bootstrap, and experimental diagnostics.

2. **Fix D-2: centralize cascade constants.**  
   Move duplicated cascade constants into one shared configuration object used by both `computeDynamicCascadeCrossing` and `explainCascadeCrossing`.

3. **Fix C-3: scenario headline refresh behavior.**  
   When a scenario is selected, either auto-run Monte Carlo for that scenario or display a clear message: `Run Monte Carlo to update this scenario headline.`

### Priority 2 — Interpretive clarity

4. **Fix C-2: clarify or enforce amplifier/pathway classification.**  
   Either make `amplifier_risk` a display-only explanatory taxonomy explicitly, or implement distinct model behavior if the label is meant to affect dynamics.

5. **Fix D-3/D-5: reduce false-confidence surface.**  
   Recommended UI changes:
   - remove or soften the exclamation mark after the headline year;
   - display P10/P50/P90 more prominently near the headline;
   - add a near-headline label such as `Illustrative model horizon, not a forecast`;
   - avoid wording that suggests empirical calibration unless there is outcome-based calibration.

6. **Fix A3-1: improve provenance for model-anchor entries.**  
   Add URLs or explicitly mark entries as internal model anchors with clear methodological justification.

### Priority 3 — Maintainability and security

7. **Fix A1-1/D-4: replace duplicated `404.html`.**  
   Avoid maintaining a full second copy of the dashboard. Use a small fallback page or a redirect-like GitHub Pages fallback strategy that does not duplicate the entire app.

8. **Fix D-1: add SRI or vendor executable CDN scripts locally.**  
   Add `integrity` and `crossorigin` attributes for CDN scripts, or bundle the scripts into the repository.

9. **Fix A4-1: centralize model year.**  
   Move `NOW = 2026` into versioned metadata/configuration and document whether it is intentionally fixed for reproducibility.

10. **Fix C-1: clarify eigenvector-centrality adjacency logic.**  
    Decide whether mutual dependency should intentionally count as stronger coupling. If yes, document it. If no, symmetrize using `max` or averaged edge weight.

---

## 11. Suggested GitHub badge / README wording

Use careful wording. Do not say “scientifically validated”.

Recommended:

```text
Internal audit status: YELLOW — no critical defect found in the displayed headline calculation path; remaining findings concern reproducibility, interpretation, provenance, security hardening, and maintainability.
```

Recommended README statement:

```text
The repository has undergone four internal audit layers covering structure, data integrity, numerical behavior, cascade logic, UI parity, documentation, governance, and security posture. The audits found no critical defect in the displayed headline calculation path. The model remains an illustrative, model-internal systemic-risk framework and should not be interpreted as an empirical forecast, scientific peer review, or probability of civilizational collapse.
```

---

## 12. Recommended repository placement

Recommended path:

```text
docs/AUDIT_TEST_RESULTS_AND_IMPACT.md
```

Alternative root-level path:

```text
AUDIT_TEST_RESULTS_AND_IMPACT.md
```

If placed in `docs/`, link it from `README.md` under a section such as:

```markdown
## Audit and validation status

- [Audit Test Results and Impact Summary](docs/AUDIT_TEST_RESULTS_AND_IMPACT.md)
- [Audit A — Foundation & Data Integrity](AUDIT_A_REPORT.md)
- [Audit B — Numerical Model & Math](AUDIT_B_REPORT.md)
- [Audit C — Logic, Cascades, Scenarios, Rankings](AUDIT_C_REPORT.md)
- [Audit D — UI, Parity, Documentation, Governance](AUDIT_D_REPORT.md)
```

---

## 13. Final interpretation

The audit package supports the following conclusion:

1. The model is internally coherent.
2. The displayed values trace to live calculations.
3. Desktop and mobile outputs match.
4. The headline is Dynamic Cascade P90, not a hardcoded number.
5. No critical mathematical or cascade double-counting defect was found in the headline path.
6. The strongest remaining issue is reproducibility under concurrent stochastic execution.
7. The strongest communication issue is the possibility that users overinterpret an internally generated model year as an empirical forecast.
8. The model should be presented as an internally audited heuristic framework, not as a validated scientific forecast.

