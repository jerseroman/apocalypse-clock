const { test, expect } = require('@playwright/test');

/*
 * Headline-determinism test (Test A only).
 *
 * Pins the Apocalypse Clock Dynamic-cascade ensemble headline values under
 * the canonical reference configuration:
 *   - Scenario: baseline
 *   - Weight profile: expert
 *   - Seed: AC-1.2.6-2026 (DEFAULT_MC_SEED)
 *   - Monte Carlo iterations: 3000
 *
 * Golden values refreshed after the explicitly authorized functional-cascade
 * model 1.2.8 / dataset 1.9.0 revision on 2026-09-12,
 * Chromium-via-Playwright. If you intentionally change model code, update
 * EXPECTED in a single edit and record the change in
 * ai-governance/review-log.md per change-policy.md §MODEL.
 *
 * Browser assumption: Chromium (Playwright default). Migrating to WebKit or
 * Firefox may produce ULP-level float drift; record as a test-infrastructure
 * change in ai-governance/review-log.md.
 */

const GOLDEN_SEED = 'AC-1.2.6-2026';
const GOLDEN_NSIM = '3000';

const EXPECTED = Object.freeze({
  pinnedAt: '2026-09-09',
  modelVersion: 'Apocalypse Clock v1.2.8',
  datasetVersion: '1.9.0',
  scenario: 'baseline',
  weightProfile: 'expert',
  seed: GOLDEN_SEED,
  nSim: 3000,
  cascadeP10: 2033,
  cascadeP50: 2036,
  cascadeP90: 2043,
  headlineYearText: '2043',
});

test.describe('headline determinism under default baseline configuration', () => {
  test('headline values match recorded golden under Baseline + Expert + AC-1.2.6-2026 + nSim=3000', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/index.html');

    // Wait for the initial auto-run to complete:
    //   _running === false  AND  _cdfCurves.baseline is populated.
    await page.waitForFunction(
      () =>
        typeof _running !== 'undefined' && _running === false &&
        typeof _cdfCurves !== 'undefined' &&
        _cdfCurves?.baseline?.ensemble?.dynamicCascade &&
        Number.isFinite(_cdfCurves.baseline.ensemble.dynamicCascade.p90),
      { timeout: 55000 }
    );

    // Pre-flight: page's default seed must match the historical seed
    // pinned in this test.
    expect(await page.evaluate(() => DEFAULT_MC_SEED)).toBe(GOLDEN_SEED);
    expect(await page.evaluate(() => MODEL_VERSION)).toBe(EXPECTED.modelVersion);
    expect(await page.evaluate(() => currentDatasetVersion())).toBe(EXPECTED.datasetVersion);

    // Explicitly set the fixed baseline configuration programmatically.
    await page.evaluate((seed) => {
      P.scenario = 'baseline';

      // Weight profile: refresh=false skips invalidate + view refresh.
      applyWeightProfile('expert', false);

      P.seed = seed;
      P.nSim = 3000;

    }, GOLDEN_SEED);

    // runSelfTests and runAll use isolated RNG contexts, so the first explicit
    // run is the measured run; no warm-up draw sequence is needed.
    await page.evaluate(async () => { await runAll(); });

    // Capture the four pinned values from the pinned run.
    const captured = await page.evaluate(() => {
      const ens = _cdfCurves.baseline.ensemble.dynamicCascade;
      const headline = document.getElementById('cascadeHeadlineYear').textContent;
      return {
        cascadeP10: ens.p10,
        cascadeP50: ens.p50,
        cascadeP90: ens.p90,
        headlineYearText: headline,
      };
    });

    // First-time golden capture: print actuals so the maintainer can paste
    // them into EXPECTED. Only fires while EXPECTED has placeholders.
    if (
      EXPECTED.cascadeP10 === null ||
      EXPECTED.cascadeP50 === null ||
      EXPECTED.cascadeP90 === null ||
      EXPECTED.headlineYearText === null
    ) {
      console.log('=== HEADLINE-DETERMINISM CAPTURE ===');
      console.log(JSON.stringify(captured, null, 2));
      console.log('=== Paste these values into EXPECTED at the top of this file. ===');
    }

    // Post-flight: seed was normalised and applied.
    expect(await page.evaluate(() => window._lastInterpretData.executionSnapshot.seed)).toBe(GOLDEN_SEED);

    // Strict equality. No tolerance bands.
    // To update EXPECTED after an intentional MODEL change, copy the
    // captured-values block above into EXPECTED and follow change-policy.md §MODEL.
    expect(captured).toEqual({
      cascadeP10: EXPECTED.cascadeP10,
      cascadeP50: EXPECTED.cascadeP50,
      cascadeP90: EXPECTED.cascadeP90,
      headlineYearText: EXPECTED.headlineYearText,
    });
    expect(await page.locator('#cascadeMedianYear').textContent()).toBe(String(EXPECTED.cascadeP50));
    expect(await page.locator('#cascadeHorizonGap').textContent()).toBe(String(EXPECTED.cascadeP90 - EXPECTED.cascadeP50));
  });

  // Test B — repeatability.
  // Verifies that two consecutive full runs in the same browser session,
  // under the same configuration, produce bit-identical Dynamic-cascade
  // outputs. This test pins no golden value; it compares the two runs only
  // against each other, so it cannot drift when the model is intentionally
  // revised. (Golden-value pinning is Test A's responsibility.)
  test('two consecutive runs in one browser session produce bit-identical Dynamic Cascade outputs', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/index.html');

    // Wait for the initial auto-run to complete.
    await page.waitForFunction(
      () =>
        typeof _running !== 'undefined' && _running === false &&
        typeof _cdfCurves !== 'undefined' &&
        _cdfCurves?.baseline?.ensemble?.dynamicCascade &&
        Number.isFinite(_cdfCurves.baseline.ensemble.dynamicCascade.p90),
      { timeout: 55000 }
    );

    // Pre-flight: page's default seed matches the seed pinned in this file.
    expect(await page.evaluate(() => DEFAULT_MC_SEED)).toBe(GOLDEN_SEED);

    // Set the fixed baseline configuration directly; controls are not exposed.
    await page.evaluate((seed) => {
      P.scenario = 'baseline';
      applyWeightProfile('expert', false);
      P.seed = seed;
      P.nSim = 3000;
    }, GOLDEN_SEED);

    // Two measured runs, same session, same configuration.
    const runA = await page.evaluate(async () => {
      await runAll();
      const ens = _cdfCurves.baseline.ensemble.dynamicCascade;
      return {
        cascadeP10: ens.p10,
        cascadeP50: ens.p50,
        cascadeP90: ens.p90,
        medianYearText: document.getElementById('cascadeMedianYear').textContent,
        gapText: document.getElementById('cascadeHorizonGap').textContent,
        headlineYearText: document.getElementById('cascadeHeadlineYear').textContent,
      };
    });

    const runB = await page.evaluate(async () => {
      await runAll();
      const ens = _cdfCurves.baseline.ensemble.dynamicCascade;
      return {
        cascadeP10: ens.p10,
        cascadeP50: ens.p50,
        cascadeP90: ens.p90,
        medianYearText: document.getElementById('cascadeMedianYear').textContent,
        gapText: document.getElementById('cascadeHorizonGap').textContent,
        headlineYearText: document.getElementById('cascadeHeadlineYear').textContent,
      };
    });

    // Strict equality, field by field. No tolerance bands.
    expect(runB.cascadeP10).toBe(runA.cascadeP10);
    expect(runB.cascadeP50).toBe(runA.cascadeP50);
    expect(runB.cascadeP90).toBe(runA.cascadeP90);
    expect(runB.medianYearText).toBe(runA.medianYearText);
    expect(runB.gapText).toBe(runA.gapText);
    expect(runB.headlineYearText).toBe(runA.headlineYearText);
  });
});
