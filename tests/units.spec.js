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
});
