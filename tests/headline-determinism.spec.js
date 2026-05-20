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
 * Golden values recorded against Apocalypse Clock v1.2.7 on 2026-05-19,
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
  pinnedAt: '2026-05-19',
  modelVersion: 'Apocalypse Clock v1.2.7',
  datasetVersion: '1.7.1',
  scenario: 'baseline',
  weightProfile: 'expert',
  seed: GOLDEN_SEED,
  nSim: 3000,
  cascadeP10: 2037,
  cascadeP50: 2040,
  cascadeP90: 2045,
  headlineYearText: '2045',
});

test.describe('headline determinism under default baseline configuration', () => {
  test('headline values match recorded golden under Baseline + Expert + AC-1.2.6-2026 + nSim=3000', async ({ page }) => {
    test.setTimeout(60000);

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

    // Explicitly set scenario, weight profile, seed, and nSim — programmatically.
    // Going through the click handlers triggers scheduleWeightProfileAutoRun,
    // which would race with our explicit run. Setting state directly avoids
    // the auto-run path while leaving the resulting model state identical.
    await page.evaluate((seed) => {
      // Scenario state: update .sc-pill.active to match currentScenario()'s reader.
      document.querySelectorAll('.sc-pill').forEach(b => b.classList.remove('active'));
      document.querySelector('button[data-sc="baseline"]').classList.add('active');
      P.scenario = 'baseline';

      // Weight profile: refresh=false skips invalidate + view refresh.
      applyWeightProfile('expert', false);

      // Seed and nSim inputs: runAll reads from these on the next Run.
      document.getElementById('mcSeed').value = seed;
      document.getElementById('simCount').value = '3000';
      P.nSim = 3000;

    }, GOLDEN_SEED);

    // The page schedules runSelfTests() immediately after its initial
    // auto-run. runSelfTests reseeds and asynchronously consumes the shared
    // Monte Carlo PRNG, so it races with the first explicit run after page
    // load. Empirically only that first run is affected: a 6-run probe gave
    // run 1 = {2037, 2040, 2046} and runs 2-6 = {2037, 2040, 2045} bit-for-bit.
    // One warm-up run absorbs the overlap with runSelfTests; the pinned run
    // that follows has no concurrent PRNG consumer and is fully deterministic.
    // runAll is async; awaiting inside page.evaluate awaits the full pass.
    await page.evaluate(async () => { await runAll(); }); // warm-up
    await page.evaluate(async () => { await runAll(); }); // pinned run

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
    expect(await page.evaluate(() => currentMonteCarloSeed())).toBe(GOLDEN_SEED);

    // Strict equality. No tolerance bands.
    // To update EXPECTED after an intentional MODEL change, copy the
    // captured-values block above into EXPECTED and follow change-policy.md §MODEL.
    expect(captured.cascadeP10).toBe(EXPECTED.cascadeP10);
    expect(captured.cascadeP50).toBe(EXPECTED.cascadeP50);
    expect(captured.cascadeP90).toBe(EXPECTED.cascadeP90);
    expect(captured.headlineYearText).toBe(EXPECTED.headlineYearText);
  });
});
