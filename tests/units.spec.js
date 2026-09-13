const { test, expect } = require('@playwright/test');

/*
 * Unit-test layer for pure-function model contracts.
 *
 * Scope per ai-governance/methodological-review.md and the units.spec.js task:
 *   1. quantile fixtures
 *   2. fmtY fixtures
 *   3. probabilityByDisplayedYear fixtures
 *
 * Functions are reached via Playwright page.evaluate against the live page.
 * No source file is modified; tests pin current behaviour only.
 */

test.describe('pure-function model contracts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForFunction(() =>
      typeof fmtY === 'function' &&
      typeof quantile === 'function' &&
      typeof probabilityByDisplayedYear === 'function'
    );
  });

  test('quantile: empty, single-element, exact and Type-7 interpolated positions', async ({ page }) => {
    const r = await page.evaluate(() => ({
      empty: quantile([], 0.5),
      single_q0: quantile([2050], 0),
      single_q05: quantile([2050], 0.5),
      single_q1: quantile([2050], 1),
      five_q0: quantile([2030, 2040, 2050, 2060, 2070], 0),
      five_q025: quantile([2030, 2040, 2050, 2060, 2070], 0.25),
      five_q05: quantile([2030, 2040, 2050, 2060, 2070], 0.5),
      five_q075: quantile([2030, 2040, 2050, 2060, 2070], 0.75),
      five_q1: quantile([2030, 2040, 2050, 2060, 2070], 1),
      five_q010: quantile([2030, 2040, 2050, 2060, 2070], 0.10),
      five_q090: quantile([2030, 2040, 2050, 2060, 2070], 0.90),
    }));

    expect(r.empty).toBe(0);
    expect(r.single_q0).toBe(2050);
    expect(r.single_q05).toBe(2050);
    expect(r.single_q1).toBe(2050);
    expect(r.five_q0).toBe(2030);
    expect(r.five_q025).toBe(2040);
    expect(r.five_q05).toBe(2050);
    expect(r.five_q075).toBe(2060);
    expect(r.five_q1).toBe(2070);
    // Type-7 linear interpolation: pos = (n-1)*q = 0.4 → 2030 + 10*0.4 = 2034
    expect(r.five_q010).toBeCloseTo(2034, 6);
    // Type-7 linear interpolation: pos = (n-1)*q = 3.6 → 2060 + 10*0.6 = 2066
    expect(r.five_q090).toBeCloseTo(2066, 6);
  });

  test('fmtY: floor, ceiling, sentinel, NaN and infinity handling', async ({ page }) => {
    const r = await page.evaluate(() => ({
      below_floor_low: fmtY(2024.4),
      below_floor_high: fmtY(2024.6),
      at_floor: fmtY(2025),
      mid_round_up: fmtY(2050.5),
      mid_round_down: fmtY(2050.4),
      at_ceiling: fmtY(2100),
      above_ceiling_low: fmtY(2100.4),
      above_ceiling_half: fmtY(2100.5),
      sentinel: fmtY(2101),
      nan: fmtY(NaN),
      positive_infinity: fmtY(Infinity),
      negative_infinity: fmtY(-Infinity),
    }));

    // Floor boundary: strict less-than YS, applied to the raw float.
    expect(r.below_floor_low).toBe('<2025');
    expect(r.below_floor_high).toBe('<2025');
    expect(r.at_floor).toBe('2025');
    // Mid-range: Math.round (half-up in JS for positive values).
    expect(r.mid_round_up).toBe('2051');
    expect(r.mid_round_down).toBe('2050');
    expect(r.at_ceiling).toBe('2100');
    // Sentinel boundary: strict greater-than YE, applied to the raw float.
    expect(r.above_ceiling_low).toBe('>2100');
    expect(r.above_ceiling_half).toBe('>2100');
    expect(r.sentinel).toBe('>2100');
    // Latent behaviour per methodological-review.md finding D4.
    expect(r.nan).toBe('NaN');
    expect(r.positive_infinity).toBe('>2100');
    expect(r.negative_infinity).toBe('<2025');
  });

  test('probabilityByDisplayedYear: guards, exact match, ≤-year fallback, sentinel truncation, crossing[] fallback', async ({ page }) => {
    const r = await page.evaluate(() => {
      const cdfSummary = {
        cdf: [
          { year: 2050, prob: 0.4 },
          { year: 2060, prob: 0.7 },
          { year: 2100, prob: 0.85 },
        ],
      };
      const crossingSummary = {
        crossing: [2050, 2060, 2070, 2080, 2090, 2101, 2101, 2101],
      };

      return {
        // Falsy / malformed summary
        null_summary: probabilityByDisplayedYear(null, 2050),
        undefined_summary: probabilityByDisplayedYear(undefined, 2050),
        empty_summary: probabilityByDisplayedYear({}, 2050),
        // Non-finite rawYear
        nan_year: probabilityByDisplayedYear(cdfSummary, NaN),
        infinity_year: probabilityByDisplayedYear(cdfSummary, Infinity),
        // Exact CDF year match
        exact_2050: probabilityByDisplayedYear(cdfSummary, 2050),
        exact_2060: probabilityByDisplayedYear(cdfSummary, 2060),
        exact_2100: probabilityByDisplayedYear(cdfSummary, 2100),
        // Last-entry-≤-year fallback when no exact match
        fallback_2055: probabilityByDisplayedYear(cdfSummary, 2055),
        fallback_2099: probabilityByDisplayedYear(cdfSummary, 2099),
        // Year before every CDF entry: no exact, no ≤-year match, no crossing[]
        before_all_2030: probabilityByDisplayedYear(cdfSummary, 2030),
        // Sentinel truncation: rawYear > YE → displayYear = YE = 2100
        sentinel_truncation_2101: probabilityByDisplayedYear(cdfSummary, 2101),
        far_sentinel_2500: probabilityByDisplayedYear(cdfSummary, 2500),
        // crossing[] fallback path (no cdf in summary)
        crossing_2055: probabilityByDisplayedYear(crossingSummary, 2055),
        crossing_2080: probabilityByDisplayedYear(crossingSummary, 2080),
        crossing_sentinel: probabilityByDisplayedYear(crossingSummary, 2101),
        crossing_before_all: probabilityByDisplayedYear(crossingSummary, 2030),
      };
    });

    expect(r.null_summary).toBeNaN();
    expect(r.undefined_summary).toBeNaN();
    expect(r.empty_summary).toBeNaN();
    expect(r.nan_year).toBeNaN();
    expect(r.infinity_year).toBeNaN();

    expect(r.exact_2050).toBeCloseTo(0.4, 10);
    expect(r.exact_2060).toBeCloseTo(0.7, 10);
    expect(r.exact_2100).toBeCloseTo(0.85, 10);

    expect(r.fallback_2055).toBeCloseTo(0.4, 10);
    expect(r.fallback_2099).toBeCloseTo(0.7, 10);

    // Below-first-entry: no last-≤-year, no crossing[] → NaN (with warn).
    expect(r.before_all_2030).toBeNaN();

    // Truncation: rawYear > YE looks up cdf[YE] = 0.85.
    expect(r.sentinel_truncation_2101).toBeCloseTo(0.85, 10);
    expect(r.far_sentinel_2500).toBeCloseTo(0.85, 10);

    // crossing[] path: counts entries with Number.isFinite(y) && y ≤ displayYear.
    expect(r.crossing_2055).toBeCloseTo(1 / 8, 10);
    expect(r.crossing_2080).toBeCloseTo(4 / 8, 10);
    expect(r.crossing_sentinel).toBeCloseTo(5 / 8, 10);
    expect(r.crossing_before_all).toBe(0);
  });

  test('targeted model corrections: caps, ordering, censoring, weights and immutable snapshot', async ({ page }) => {
    const r = await page.evaluate(() => {
      const calibrated = { growth_meta: { effective_growth_calibrated: true, risk_conversion: 0.1, threat_specific_cap: 0.03 } };
      const proxy = { growth_meta: { growth_kind: 'indicator_growth', risk_conversion: 0.5, threat_specific_cap: 0.02 } };
      const params = { ...defaultBaselineParams(), seed: 'TARGETED-REGRESSION', tailDependence: 0, vetoThreshold: 0.65 };
      const enriched = buildEnriched('baseline', params);
      const forward = computeAggregateYears(enriched, params);
      const reverse = computeAggregateYears([...enriched].reverse(), params);
      const censoredThreat = { ...enriched[0], horizon: YE + 1 };
      const censoredParams = weibullParamsForThreat(censoredThreat, { p50: YE + 1 });
      const zeroDomainParams = { ...params, domW: { civilization: 0, biosphere: 1, technology: 1 } };
      const snapshot = createExecutionSnapshot(params);
      const before = snapshot.parameters.threshold;
      P.threshold = before + 0.1;
      const smaa = perturbWeightsAroundBaseExperimental({ a: 0.75, b: 0.25, z: 0 }, 600, 80, createRngContext('SMAA-TEST'));
      const means = smaa.reduce((acc, row) => ({ a: acc.a + row.a / smaa.length, b: acc.b + row.b / smaa.length, z: acc.z + row.z / smaa.length }), { a: 0, b: 0, z: 0 });
      const spread = correlatedScenarioSpread([0.2, 0.3], 0.4);
      const expectedVariance = (1 - 0.4) * (0.2 * 0.8 + 0.3 * 0.7) + 0.4 * (Math.sqrt(0.2 * 0.8) + Math.sqrt(0.3 * 0.7)) ** 2;
      let allZeroRejected = false;
      try { normalizedDomainWeights({ civilization: 0, biosphere: 0, technology: 0 }); } catch (_) { allZeroRejected = true; }
      return {
        calibratedGrowth: effectiveRiskGrowthForThreat(calibrated, 0.2),
        proxyGrowth: effectiveRiskGrowthForThreat(proxy, 0.2),
        graphOrderInvariant: forward.graphWeighted === reverse.graphWeighted,
        cascadeOrderInvariant: forward.dynamicCascade === reverse.dynamicCascade,
        censored: censoredParams.censored,
        censoredProbability: weibullProbability(censoredThreat, 2050, { p50: YE + 1 }),
        zeroMultiplier: domainWeightMultiplier('civilization', zeroDomainParams),
        allZeroRejected,
        snapshotFrozen: Object.isFrozen(snapshot) && Object.isFrozen(snapshot.parameters),
        snapshotUnchanged: snapshot.parameters.threshold === before,
        smaaMeans: means,
        correlatedVarianceMatches: Math.abs(spread ** 2 - expectedVariance) < 1e-12,
      };
    });

    expect(r.calibratedGrowth).toBeCloseTo(0.03, 12);
    expect(r.proxyGrowth).toBeCloseTo(0.02, 12);
    expect(r.graphOrderInvariant).toBe(true);
    expect(r.cascadeOrderInvariant).toBe(true);
    expect(r.censored).toBe(true);
    expect(r.censoredProbability).toBeNull();
    expect(r.zeroMultiplier).toBe(0);
    expect(r.allZeroRejected).toBe(true);
    expect(r.snapshotFrozen).toBe(true);
    expect(r.snapshotUnchanged).toBe(true);
    expect(r.smaaMeans.a).toBeCloseTo(0.75, 1);
    expect(r.smaaMeans.b).toBeCloseTo(0.25, 1);
    expect(r.smaaMeans.z).toBe(0);
    expect(r.correlatedVarianceMatches).toBe(true);
  });

  test('targeted paired stress: zero intervention is identical with zero MC contrast error', async ({ page }) => {
    test.setTimeout(30000);
    const r = await page.evaluate(async () => {
      const params = { ...defaultBaselineParams(), seed: 'PAIRED-ZERO', tailDependence: 0, vetoThreshold: 0.65 };
      const stress = await runTailAndVetoStressExperimental('baseline', params, 24);
      return {
        cascadeIdentical: stress.raw.cascadeYears.every((year, i) => year === stress.raw.tailCascadeYears[i]),
        vetoIdentical: stress.raw.vetoYears.every((year, i) => year === stress.raw.tailVetoYears[i]),
        mean: stress.contrasts.tailCascade.meanDifferenceYears,
        se: stress.contrasts.tailCascade.mcStandardErrorYears,
        estimand: stress.contrasts.tailCascade.estimand,
        censorRatesEqual: stress.contrasts.tailCascade.baselineCensorRate === stress.contrasts.tailCascade.interventionCensorRate,
      };
    });
    expect(r.cascadeIdentical).toBe(true);
    expect(r.vetoIdentical).toBe(true);
    expect(r.mean).toBe(0);
    expect(r.se).toBe(0);
    expect(r.estimand).toContain('horizon-coded');
    expect(r.censorRatesEqual).toBe(true);
  });

  test('targeted Weibull: censored is not invalid or an invented domain horizon', async ({ page }) => {
    const r = await page.evaluate(() => {
      const enriched = buildEnriched('baseline', defaultBaselineParams());
      const items = enriched.slice(0, 2).map(t => ({ ...t, priority: 1, horizon: 2030 }));
      const stats = { [items[0].id]: { p50: 2030 }, [items[1].id]: { p50: YE + 1 } };
      const mc = { threatStats: stats };
      const timeline = threatTimelineForMode(items[1], mc, 'weibull');
      const domain = weightedDomainTimeline(items, mc, 'weibull');
      const zeroDomain = weightedDomainTimeline([items[0], { ...items[1], priority: 0 }], mc, 'weibull');
      const ref = independentFailureReference(items, 2035, stats);
      const invalidStats = { ...stats, [items[1].id]: { p50: NaN } };
      const invalid = independentFailureReference(items, 2035, invalidStats);
      const invalidJoint = jointFailureByDecade(items, { threatStats: invalidStats });
      const oldMode = priorityViewState.mode;
      priorityViewState.mode = 'weibull';
      let html, invalidHtml;
      try {
        const vm = priorityThreatViewModel(items[1], 1, items, mc);
        html = priorityThreatMetricsHtml(vm) + priorityThreatScoreHtml(vm)
          + threatMethodNotesHtml(items[1], timeline.lower, timeline.mid, timeline.upper, timeline.p2050)
          + domainStatsHtml({ ...domain, source: 'Weibull', avgSev: 3, avgUrg: 3, avgCas: 3 });
        renderAdvancedMethod(items, { threatStats: invalidStats });
        invalidHtml = document.getElementById('advancedMethodBox').textContent;
      } finally { priorityViewState.mode = oldMode; }
      return {
        timeline, domain, zeroDomain, ref, invalid,
        invalidJointSafe: invalidJoint.rows.every(row => row.invalidCount === 1 && row.expected === null && row.at30Lower === null),
        invalidParams: weibullParamsForThreat(items[1], { p50: NaN }),
        absentStats: weibullParamsForThreat(items[1], null).status,
        probability: weibullProbability(items[1], 2050, { p50: NaN }),
        pKnown: weibullProbability(items[0], 2035, stats[items[0].id]),
        pKnown2050: weibullProbability(items[0], 2050, stats[items[0].id]),
        html, invalidHtml,
        timelineHtml: renderTimelineBar(null, null, null, null, null),
      };
    });
    expect(r.timeline.status).toBe('right_censored');
    expect([r.timeline.lower, r.timeline.mid, r.timeline.upper, r.timeline.p2050]).toEqual([null, null, null, null]);
    expect([r.timeline.p2050Lower, r.timeline.p2050Upper]).toEqual([0, 0.5]);
    expect(r.timeline.medianLowerBound).toBe(2100);
    expect(r.domain.status).toBe('partially_identified');
    expect([r.domain.lower, r.domain.mid, r.domain.upper]).toEqual([null, null, null]);
    expect(r.domain.midLowerBound).toBeCloseTo(2065, 10);
    expect(r.domain.p2050Lower).toBeCloseTo(r.pKnown2050 / 2, 12);
    expect(r.domain.p2050Upper).toBeCloseTo((r.pKnown2050 + 0.5) / 2, 12);
    expect(r.zeroDomain.status).toBe('identified');
    expect(r.zeroDomain.mid).toBeCloseTo(2030, 10);
    expect(r.ref.censoredCount).toBe(1);
    expect(r.ref.expectedLower / 2).toBeCloseTo(r.pKnown / 2, 12);
    expect(r.ref.expectedUpper / 2).toBeCloseTo((r.pKnown + 0.5) / 2, 12);
    expect(r.invalidParams.status).toBe('invalid');
    expect(r.invalidParams.censored).toBe(false);
    expect(r.absentStats).toBe('identified');
    expect(r.probability).toBeNull();
    expect(r.invalid.invalidCount).toBe(1);
    expect([r.invalid.expectedLower, r.invalid.expectedUpper, r.invalid.lowerPmf]).toEqual([null, null, null]);
    expect(r.invalidJointSafe).toBe(true);
    expect(r.html).toContain('Not identified');
    expect(r.html).toContain('range');
    expect(r.html).not.toMatch(/\bundefined\b|NaN|≥2100|<2025/);
    expect(r.invalidHtml).toContain('n/a');
    expect(r.invalidHtml).not.toContain('NaN');
    expect(r.timelineHtml).toContain('Horizon not identifiable');
    expect(r.timelineHtml).not.toContain('No crossing');
  });

  test('targeted Monte Carlo errors: bootstrap SD and paired full OAT statistic', async ({ page }) => {
    const r = await page.evaluate(() => {
      const sd = values => {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1));
      };
      const values = [2030, 2030, 2030, 2030, 2100];
      const rng = createRngContext('AUDIT-BOOTSTRAP');
      const medians = Array.from({ length: 160 }, () => {
        const resample = values.map(() => values[Math.floor(rng.random01() * values.length)]).sort((a, b) => a - b);
        return resample[2];
      });
      const summary = summarizeCrossings(values, values.length, createRngContext('AUDIT-BOOTSTRAP'));
      const base = [2060, 2070, 2101], up = [2060, 2060, 2070], down = [...base];
      const oracleRng = createRngContext('OAT-SE');
      const contrasts = Array.from({ length: 160 }, () => {
        const indices = base.map(() => Math.floor(oracleRng.random01() * base.length));
        const response = data => {
          const ys = indices.map(i => data[i]).sort((a, b) => a - b);
          const p2035 = ys.filter(y => y <= 2035).length / ys.length;
          const p2050 = ys.filter(y => y <= 2050).length / ys.length;
          const normalizedMedian = 1 - Math.min(1, Math.max(0, (ys[1] - NOW) / (YE - NOW)));
          return 0.45 * p2035 + 0.45 * p2050 + 0.1 * normalizedMedian;
        };
        return (response(up) - response(base)) * 100;
      });
      return {
        bootstrapActual: summary.parameterSigma, bootstrapExpected: sd(medians),
        oatActual: pairedOatBootstrapStandardErrors(base, up, down, createRngContext('OAT-SE')),
        oatExpected: sd(contrasts),
        zero: pairedOatBootstrapStandardErrors(base, base, base, createRngContext('OAT-ZERO')),
        originalBase: base,
      };
    });
    expect(r.bootstrapActual).toBeGreaterThan(0);
    expect(r.bootstrapActual).toBeCloseTo(r.bootstrapExpected, 10);
    expect(r.oatActual.upMcSe).toBeGreaterThan(0);
    expect(r.oatActual.upMcSe).toBeCloseTo(r.oatExpected, 12);
    expect(r.oatActual.dnMcSe).toBe(0);
    expect(r.zero).toEqual({ upMcSe: 0, dnMcSe: 0 });
    expect(r.originalBase).toEqual([2060, 2070, 2101]);
  });

  test('targeted SMAA: original total concentration and exact zero weights', async ({ page }) => {
    const r = await page.evaluate(() => {
      const originalGamma = sampleGamma;
      const alphas = [];
      sampleGamma = alpha => { alphas.push(alpha); return alpha; };
      try {
        const rows = perturbWeightsAroundBaseExperimental({ a: 4, b: 2, c: 1, d: 1, e: 0, f: 0 }, 1, 8, createRngContext('SMAA-ALPHAS'));
        return { alphas, row: rows[0] };
      } finally { sampleGamma = originalGamma; }
    });
    expect(r.alphas).toEqual([24, 12, 6, 6]);
    expect(r.alphas.reduce((a, b) => a + b, 0)).toBe(48);
    expect(r.row).toEqual({ a: 4, b: 2, c: 1, d: 1, e: 0, f: 0 });
  });

  test('targeted provenance: loaded formula changes hash, frozen snapshot does not change', async ({ page }) => {
    const r = await page.evaluate(() => {
      const params = { ...defaultBaselineParams(), seed: 'HASH-TEST' };
      const original = effectiveRiskGrowthForThreat;
      const snapshot = createExecutionSnapshot(params);
      let changed;
      try {
        effectiveRiskGrowthForThreat = function fingerprintProbe(t, growth) { return original(t, growth); };
        changed = numericalCodeFingerprint().codeHashFNV1a32;
        params.threshold += 0.1;
      } finally { effectiveRiskGrowthForThreat = original; }
      return {
        before: snapshot.codeHashFNV1a32, changed, restored: numericalCodeFingerprint().codeHashFNV1a32,
        frozen: Object.isFrozen(snapshot), parametersUnchanged: snapshot.parameters.threshold !== params.threshold,
        scope: snapshot.codeHashScope,
        helpersIncluded: ['pairedOatBootstrapStandardErrors', 'weibullProbabilityBounds'].every(name => snapshot.codeHashFunctions.includes(name)),
      };
    });
    expect(r.changed).not.toBe(r.before);
    expect(r.restored).toBe(r.before);
    expect(r.frozen).toBe(true);
    expect(r.parametersUnchanged).toBe(true);
    expect(r.helpersIncluded).toBe(true);
    expect(r.scope).toContain('Loaded numerical function bodies');
  });

  test('targeted follow-up: ordered Weibull summaries, first annual crossing and small growth caps', async ({ page }) => {
    const r = await page.evaluate(() => {
      const base = { process_type: 'continuous', acceleration: 3, interdependence: 3, urgency: 3, gov_failure: 3, priority: 1 };
      const threats = [{ ...base, id: 'a', horizon: 2030 }, { ...base, id: 'b', horizon: 2090 }];
      const domain = weightedDomainTimeline(threats, null, 'weibull');
      const expectedUpper = threats.reduce((s, t) => s + weibullQuantile(t, 0.9), 0) / 2;
      const priority = 8.5 / Math.pow(1.04, 1.2);
      const capped = effectiveRiskGrowthForThreat({ growth_meta: { effective_growth_calibrated: true, threat_specific_cap: 0.0001 } }, 0.01);
      const medianFromSameCdf = sampleEventHorizon(8.5, capped, 8.5, { random01: () => 0.5 });
      return { domain, expectedUpper, crossing: computeHorizon(priority, 0.04, 8.5), noCrossing: computeHorizon(1, 0.0005, 8.5), event: sampleEventHorizon(8.5, capped, 8.5, { random01: () => 0.001 }), eventMedian: deterministicEventHorizon(8.5, capped, 8.5), medianFromSameCdf };
    });
    expect(r.domain.lower).toBeLessThanOrEqual(r.domain.mid);
    expect(r.domain.mid).toBeLessThanOrEqual(r.domain.upper);
    expect(r.domain.upper).toBeCloseTo(r.expectedUpper, 10);
    expect(r.domain.upper).toBeGreaterThan(2100);
    expect(r.crossing).toBe(2028);
    expect(r.noCrossing).toBe(2101);
    expect(r.event).toBe(2031);
    expect(r.eventMedian).toBe(r.medianFromSameCdf);
  });

  test('regime first passage uses sampled growth and is monotone without an extra random clock', async ({ page }) => {
    const r = await page.evaluate(() => {
      const priority = 5.1;
      const threshold = 8.5;
      const lowGrowth = deterministicRegimeHorizon(priority, 0.01, threshold);
      const highGrowth = deterministicRegimeHorizon(priority, 0.03, threshold);
      const sampled = sampleRegimeHorizon(priority, 0.03, threshold, { random01: () => { throw new Error('Regime rule must not consume an uncalibrated process draw.'); } });
      return {
        lowGrowth,
        highGrowth,
        sampled,
        direct: computeHorizon(priority, 0.03, threshold),
        zeroGrowth: deterministicRegimeHorizon(priority, 0, threshold),
        alreadyCritical: deterministicRegimeHorizon(threshold, 0.03, threshold),
      };
    });
    expect(r.highGrowth).toBeLessThan(r.lowGrowth);
    expect(r.sampled).toBe(r.direct);
    expect(r.zeroGrowth).toBe(2101);
    expect(r.alreadyCritical).toBe(2026);
  });

  test('targeted follow-up: identical threshold policies have identical paths and zero contrast SE', async ({ page }) => {
    await page.waitForFunction(() => !_running && !!_cdfCurves.baseline);
    const r = await page.evaluate(async () => {
      const original = recordMonteCarloSample;
      let different = 0, pairs = 0;
      recordMonteCarloSample = function(acc, current, global, params) {
        if (params.thresholdPolicy === 'global') {
          pairs++;
          if (current.some((t, i) => t.horizon !== global[i].horizon)) different++;
        }
        return original(acc, current, global, params);
      };
      try {
        const params = { ...defaultBaselineParams(), seed: 'NULL-THRESHOLD-REGRESSION', thresholdPolicy: 'global' };
        const result = await runMC('baseline', 96, () => {}, params);
        return { pairs, different, contrast: result.thresholdRobustness };
      } finally { recordMonteCarloSample = original; }
    });
    expect(r.pairs).toBe(96);
    expect(r.different).toBe(0);
    expect(r.contrast.deltaYears).toBe(0);
    expect(r.contrast.mcStandardErrorYears).toBe(0);
    expect(r.contrast.pairedRandomInputs).toBe(true);
    expect(r.contrast.policy).toBe('global');
  });

  test('targeted follow-up: constant Sobol response has no defined indices or ranking', async ({ page }) => {
    const r = await page.evaluate(async () => {
      const original = exploratorySensitivityTarget;
      exploratorySensitivityTarget = () => 7;
      try { return await runExploratorySensitivityIndices({ ...defaultBaselineParams(), seed: 'CONSTANT-SOBOL' }, 4); }
      finally { exploratorySensitivityTarget = original; }
    });
    expect(r.variance).toBe(0);
    expect(r.status).toBe('undefined_zero_variance');
    expect(r.rows).toEqual([]);
    expect(r.firstOrderSum).toBeNull();
  });

  test('targeted follow-up: censored runs are not plotted as event years and stale plots are discarded', async ({ page }) => {
    const r = await page.evaluate(async () => {
      const original = ensureScientificPlotly;
      const captured = [];
      ensureScientificPlotly = async () => ({ react: async (el, traces, layout) => { captured.push({ id: el.id, traces, layout }); } });
      const summary = summarizeCrossings([2030, 2101, 2101, 2101], 4, createRngContext('CENSOR-PLOT'));
      const result = { ...summary, ensemble: { compensatory: summary }, domainStats: { civilization: summary, biosphere: summary, technology: summary } };
      try {
        await drawDistributionDiagnosticsPlotly(result);
        const hist = captured.find(x => x.id === 'plotlyHistogramChart');
        const box = captured.find(x => x.id === 'plotlyBoxplotChart');
        const count = captured.length;
        let current = true;
        ensureScientificPlotly = async () => { current = false; return { react: async () => { captured.push('stale'); } }; };
        await drawDistributionDiagnosticsPlotly(result, () => current);
        const domain = domainMonteCarloTimeline({ domainStats: { technology: summary } }, 'technology');
        const domainHtml = domainStatsHtml({ ...domain, source: 'Dynamic cascade MC', weightedSummary: false, avgSev: 3, avgUrg: 3, avgCas: 3 });
        return { censored: summary.censorFraction, medianCensored: summary.medianCensored, histX: hist.traces[0].x, boxX: box.traces[0].x, histTitle: hist.layout.xaxis.title, boxTitle: box.layout.xaxis.title, noStale: captured.length === count, domain, domainHtml };
      } finally { ensureScientificPlotly = original; }
    });
    expect(r.censored).toBe(0.75);
    expect(r.medianCensored).toBe(true);
    expect(r.histX).toEqual([2030]);
    expect(r.boxX).toEqual([2030]);
    expect(r.histTitle).toContain('censored 3/4');
    expect(r.boxTitle).toContain('conditional');
    expect(r.noStale).toBe(true);
    expect(r.domain.status).toBe('unidentified');
    expect(r.domain.medianCensored).toBe(true);
    expect(r.domainHtml).toContain('Not identified');
    expect(r.domainHtml).toContain('75%');
  });

  test('targeted follow-up: weighting profiles remain programmatically available without UI controls', async ({ page }) => {
    await page.waitForFunction(() => !_running && !!_cdfCurves.baseline);
    const r = await page.evaluate(() => {
      applyWeightProfile('biosphere', false);
      const result = {
        profile: P.weightProfile,
        weights: { ...P.weights },
        domainWeights: { ...P.domW },
        controls: document.querySelectorAll('#controlCard, [data-weight-profile], .sc-pill').length,
      };
      applyWeightProfile('expert', false);
      return result;
    });
    expect(r.profile).toBe('biosphere');
    expect(r.weights.irreversibility).toBeGreaterThan(r.weights.scale);
    expect(r.domainWeights.biosphere).toBeGreaterThan(r.domainWeights.technology);
    expect(r.controls).toBe(0);
  });

  test('targeted follow-up: invalidated diagnostic cannot report completion after rendering', async ({ page }) => {
    await page.waitForFunction(() => !_running && !!_cdfCurves.baseline);
    const r = await page.evaluate(async () => {
      const originals = { runSensitivity, runExploratorySensitivityIndices, runSMAARobustnessExperimental, runTailAndVetoStressExperimental, drawSensChart, drawExploratorySensitivityChart, renderAllExperimentalDiagnostics, yieldForCalcConsole };
      runSensitivity = async () => [];
      runExploratorySensitivityIndices = async () => ({ rows: [], firstOrderSum: null, status: 'undefined_zero_variance', sampleSize: 4, warnings: ['undefined'], targetLabel: 'test', sampler: 'test' });
      runSMAARobustnessExperimental = async () => ({ nSamples: 1, topRankAcceptability: [] });
      runTailAndVetoStressExperimental = async () => ({ vetoSummary: { p50: 2040, p90: 2050 }, observedShockRate: 0, contrasts: { tailCascade: { meanDifferenceYears: 0, mcStandardErrorYears: 0, baselineCensorRate: 0, interventionCensorRate: 0 } } });
      drawSensChart = async () => {};
      drawExploratorySensitivityChart = async () => {};
      yieldForCalcConsole = async () => {};
      renderAllExperimentalDiagnostics = async () => { invalidateCachedResults(); };
      try {
        await runAdditionalScientificCalculations();
        return { badge: document.getElementById('simBadge').textContent, status: document.getElementById('experimentalScientificStatus').textContent, running: _advancedDiagnosticsRunning };
      } finally {
        runSensitivity = originals.runSensitivity; runExploratorySensitivityIndices = originals.runExploratorySensitivityIndices;
        runSMAARobustnessExperimental = originals.runSMAARobustnessExperimental; runTailAndVetoStressExperimental = originals.runTailAndVetoStressExperimental;
        drawSensChart = originals.drawSensChart; drawExploratorySensitivityChart = originals.drawExploratorySensitivityChart;
        renderAllExperimentalDiagnostics = originals.renderAllExperimentalDiagnostics; yieldForCalcConsole = originals.yieldForCalcConsole;
      }
    });
    expect(r.badge).toContain('Pending rerun');
    expect(r.status).not.toContain('Complete');
    expect(r.running).toBe(false);
  });

  test('targeted follow-up: clipboard rejection is not reported as success', async ({ page }) => {
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Permission denied'); } } });
      document.querySelector('[data-action="copy-share-link"]').click();
    });
    await expect(page.locator('[data-action="copy-share-link"]')).toHaveText('Copy failed — try again');
  });
});
