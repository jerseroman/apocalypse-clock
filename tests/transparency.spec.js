const { test, expect } = require('@playwright/test');
const crypto = require('node:crypto');
const path = require('node:path');

// Focused provenance/UI checks only. Ten paired draws test that adding timing
// metadata does not change model mathematics; they do not calibrate a forecast.
test.describe('calculation transparency and timing metadata', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    page.transparencyErrors = [];
    page.on('pageerror', error => page.transparencyErrors.push(error.message));
    await page.goto('/index.html');
    await page.waitForFunction(() => typeof _running !== 'undefined' && !_running &&
      _calculationTraceStatus === 'complete' && window._lastInterpretData?.transparency,
    undefined, { timeout: 45000 });
  });

  test.afterEach(async ({ page }) => {
    expect(page.transparencyErrors).toEqual([]);
  });

  test('completed calculation exports a hashed frozen input and marks later changes stale', async ({ page }) => {
    const saved = await page.evaluate(() => ({
      snapshot: window._lastInterpretData.executionSnapshot,
      report: window._lastInterpretData.transparency,
      status: _calculationTraceStatus,
    }));
    expect(saved.status).toBe('complete');
    expect(saved.report.evidenceSummary.totalComponents).toBe(36);
    expect(saved.report.evidenceSummary.componentsUsedNumerically).toBe(0);
    expect(saved.report.engine.subsystemNumericalEngineImplemented).toBe(false);
    expect(saved.report.results).toBeTruthy();
    const expectedHash = crypto.createHash('sha256').update(JSON.stringify(saved.snapshot.sourceDocument), 'utf8').digest('hex');
    expect(saved.snapshot.inputSha256).toBe(expectedHash);
    expect(saved.report.execution.inputSha256).toBe(expectedHash);
    await page.locator('#calculationTransparency > summary').click();
    await expect(page.locator('#calculationTransparency')).toHaveAttribute('open', '');
    await expect(page.locator('#calculationTransparencyBody')).toBeVisible();
    await expect(page.locator('#calculationTransparencyBody')).toContainText(/36/);
    await page.locator('#calculationTransparency').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(__dirname, '../test-results/transparency-desktop.png') });

    const downloadPromise = page.waitForEvent('download');
    await page.evaluate(() => exportClockJSON());
    const download = await downloadPromise;
    expect(await download.failure()).toBeNull();
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const exported = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    expect(exported.resultStatus).toBe('complete');
    expect(exported.sourceDocument).toEqual(saved.snapshot.sourceDocument);
    expect(exported.executionSnapshot.inputSha256).toBe(expectedHash);
    expect(exported.transparency).toEqual(saved.report);

    const changed = await page.evaluate(() => {
      const before = JSON.stringify(window._lastInterpretData.transparency);
      invalidateCachedResults();
      return { status: _calculationTraceStatus,
        reportUnchanged: before === JSON.stringify(window._lastInterpretData.transparency),
        snapshot: window._lastInterpretData.executionSnapshot };
    });
    expect(changed.status).toBe('stale');
    expect(changed.reportUnchanged).toBe(true);
    expect(changed.snapshot).toEqual(saved.snapshot);
    await expect(page.locator('#calculationTransparencyBody > .transparency-warning')).toContainText(/changed|stale|rerun/i);
    await expect(page.locator('#calculationTransparencyBody > .transparency-warning')).toContainText('last completed calculation');
  });

  test('timing evidence survives import and shows honest mobile labels without changing numerical results', async ({ page }) => {
    const state = await page.evaluate(async () => {
      const params = { ...snapshotParams('baseline', 10), seed: 'timing-metadata-paired-10' };
      const before = await runMC('baseline', 10, null, params);
      const document = JSON.parse(serializeActiveSourceMap());
      const climate = document._meta.subsystem_models.climate.components.find(component => /amoc/i.test(component.id))
        || document._meta.subsystem_models.climate.components[0];
      const ocean = document._meta.subsystem_models.oceans.components[0];
      climate.timing_evidence = [{
        id: 'fixture-ci', kind: 'threshold_crossing',
        event_definition: 'Integration fixture: estimated transition time, not a predictive percentile',
        metric: 'transition_time', unit: 'calendar_year', scenario: 'Fixture scenario',
        time: { start_year: 2037, end_year: 2109, interval_kind: 'confidence_interval', confidence_level: 0.95 },
        reported_time_quantiles: { p50_year: null, p90_year: null },
        source: { title: 'Timing CI fixture', url: 'https://example.org/fixture-timing-ci', location: 'Fixture table' },
        verification_status: 'report_only', limitations: ['Synthetic integration-test record'],
      }];
      climate.timing_model = { mode: 'trajectory_threshold', evidence_ids: ['fixture-ci'],
        assumptions: [{ name: 'fixture-assumption', value: 0.4, status: 'not_calibrated' }] };
      ocean.timing_evidence = [{
        id: 'fixture-projection', kind: 'projection_period',
        event_definition: 'Integration fixture: projected state over a reporting period',
        time: { start_year: 2150, end_year: 2300, interval_kind: 'projection_period' },
        reported_time_quantiles: { p50_year: null, p90_year: null },
        source: { title: 'Projection fixture', url: 'https://example.org/fixture-projection-2300' },
        verification_status: 'report_only',
      }];
      ocean.timing_model = { mode: 'display_only', evidence_ids: ['fixture-projection'], assumptions: [] };
      const sanitized = sanitizeSourceMap(document);
      applySourceMap(sanitized, { mode: 'custom', fileName: 'timing-transparency-fixture.json',
        datasetVersion: 'timing-transparency-fixture', uploaded: true }, false);
      const roundTrip = sanitizeSourceMap(JSON.parse(serializeActiveSourceMap()));
      const after = await runMC('baseline', 10, null, params);
      invalidateCachedResults();
      refreshCurrentView(null);
      const numerical = result => ({ ensemble: result.ensemble, standalone: result.threatStats, propagated: result.functionalStats });
      return {
        climateId: climate.id, oceanId: ocean.id,
        climate: ACTIVE_SOURCE_DOCUMENT_META.subsystem_models.climate.components.find(component => component.id === climate.id),
        ocean: ACTIVE_SOURCE_DOCUMENT_META.subsystem_models.oceans.components.find(component => component.id === ocean.id),
        roundTripClimate: roundTrip._meta.subsystem_models.climate.components.find(component => component.id === climate.id),
        roundTripOcean: roundTrip._meta.subsystem_models.oceans.components.find(component => component.id === ocean.id),
        before: numerical(before), after: numerical(after),
      };
    });
    expect(state.after).toEqual(state.before);
    expect(state.roundTripClimate.timing_evidence).toEqual(state.climate.timing_evidence);
    expect(state.roundTripClimate.timing_model).toEqual(state.climate.timing_model);
    expect(state.roundTripOcean.timing_evidence).toEqual(state.ocean.timing_evidence);
    expect(state.climate.timing_evidence[0].reported_time_quantiles.p90_year).toBeNull();
    expect(state.ocean.timing_evidence[0].time.end_year).toBe(2300);

    const climateRow = page.locator(`[data-threat-card="climate"] [data-subsystem-summary="${state.climateId}"]`);
    const oceanRow = page.locator(`[data-threat-card="oceans"] [data-subsystem-summary="${state.oceanId}"]`);
    await expect(climateRow).toContainText('Reported 95% confidence interval');
    await expect(climateRow).toContainText('2037–2109');
    await expect(climateRow).toContainText('Mapping required');
    await expect(climateRow).not.toContainText('P90');
    await expect(climateRow.locator('.subsystem-compact-source')).toHaveAttribute('href', 'https://example.org/fixture-timing-ci');
    await expect(oceanRow).toContainText('Projection period');
    await expect(oceanRow).toContainText('2150–2300');
    await expect(oceanRow).toContainText('Context only');
    await expect(oceanRow).not.toContainText('P90');
    await expect(oceanRow.locator('.subsystem-compact-source')).toHaveAttribute('href', 'https://example.org/fixture-projection-2300');
    await expect(oceanRow.locator('.subsystem-mini-timeline')).toHaveAttribute('aria-label', /2300/);

    await page.setViewportSize({ width: 375, height: 812 });
    for (const row of [climateRow, oceanRow]) {
      await row.scrollIntoViewIfNeeded();
      await expect(row).toBeVisible();
      const rectangles = await row.evaluate(element => [element, ...element.children].map(child => {
        const rect = child.getBoundingClientRect();
        return { left: rect.left, right: rect.right };
      }));
      for (const rectangle of rectangles) {
        expect(rectangle.left).toBeGreaterThanOrEqual(-1);
        expect(rectangle.right).toBeLessThanOrEqual(376);
      }
    }
    await climateRow.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(__dirname, '../test-results/transparency-mobile.png') });
  });
});
