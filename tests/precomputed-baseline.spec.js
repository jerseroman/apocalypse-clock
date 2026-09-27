const { test, expect } = require('@playwright/test');

test.describe('instant bundled baseline', () => {
  test.use({ viewport: { width: 360, height: 800 } });

  test('renders the verified 3000-run reference without an automatic Monte Carlo pass', async ({ page }) => {
    const startedAt = Date.now();
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#cascadeMedianYear')).toHaveText('2038', { timeout: 5000 });
    await expect(page.locator('#cascadeHeadlineYear')).toHaveText('2046');

    const state = await page.evaluate(() => ({
      running: _running,
      elapsedSinceNavigationMs: Math.round(performance.now()),
      snapshot: window._lastInterpretData.executionSnapshot,
      resultRuns: _cdfCurves.baseline.ensemble.dynamicCascade.crossing.length,
      hasReplayInputs: Object.prototype.hasOwnProperty.call(_cdfCurves.baseline, 'triggerReplayInputs'),
      badge: document.getElementById('simBadge').textContent.replace(/\s+/g, ' ').trim(),
    }));
    expect(Date.now() - startedAt).toBeLessThan(5000);
    expect(state.elapsedSinceNavigationMs).toBeLessThan(5000);
    expect(state.running).toBe(false);
    expect(state.snapshot.codeIdentifier).toBe('Apocalypse Clock v1.5.0');
    expect(state.snapshot.dataIdentifier).toBe('1.9.0');
    expect(state.snapshot.parameters.nSim).toBe(3000);
    expect(state.snapshot.seed).toBe('AC-1.2.6-2026');
    expect(state.resultRuns).toBe(3000);
    expect(state.hasReplayInputs).toBe(false);
    expect(state.badge).toContain('3,000 precomputed');
  });

  test('keeps the mobile notice, title and search field compact', async ({ page }) => {
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#cascadeMedianYear')).toHaveText('2038', { timeout: 5000 });
    const metrics = await page.evaluate(() => {
      const style = selector => getComputedStyle(document.querySelector(selector));
      const notice = document.querySelector('.validation-notice').getBoundingClientRect();
      const title = document.querySelector('.section-page-title').getBoundingClientRect();
      const search = document.querySelector('.page-search-box').getBoundingClientRect();
      return {
        detailDisplay: style('.validation-detail').display,
        noticeHeight: notice.height,
        noticeFont: parseFloat(style('.validation-notice').fontSize),
        titleHeight: title.height,
        titleFont: parseFloat(style('.section-page-title').fontSize),
        searchHeight: search.height,
        searchFont: parseFloat(style('.page-search-box input').fontSize),
      };
    });
    expect(metrics.detailDisplay).toBe('none');
    expect(metrics.noticeHeight).toBeLessThanOrEqual(30);
    expect(metrics.noticeFont).toBeLessThanOrEqual(8.5);
    expect(metrics.titleHeight).toBeLessThanOrEqual(20);
    expect(metrics.titleFont).toBeLessThanOrEqual(17);
    expect(metrics.searchHeight).toBeLessThanOrEqual(24);
    expect(metrics.searchFont).toBeLessThanOrEqual(12);
  });
});
