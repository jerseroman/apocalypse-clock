const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

// Browser integration contracts for the declared functional-cascade model.
// No calendar-year golden or empirical forecast is asserted here. Small Monte
// Carlo runs test plumbing, finite outputs and invariants, not tail precision.
const ROOT = path.resolve(__dirname, '..');
const FUNCTIONAL_FILE = 'data_v1_9_0_functional.json';
const LEGACY_FILE = 'data_v1_8_0_evidence_revision.json';
const EXPECTED_MODEL = 'Apocalypse Clock v1.2.9';
const EXPECTED_DATASET = '1.9.0';
const RANGE_FIELDS = ['scale', 'urgency', 'acceleration', 'interdependence',
  'irreversibility', 'gov_failure', 'growth_rate', 'threshold'];

function readDataset(fileName) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, fileName), 'utf8'));
}

function functionalFields(value) {
  return {
    functional_weight: value.functional_weight,
    critical_services: value.critical_services,
    dependency_weights: value.dependency_weights,
    functional_failure: value.functional_failure,
  };
}

function expectQuantiles(stats) {
  for (const key of ['p10', 'p50', 'p90']) {
    expect(Number.isFinite(stats[key]), key).toBe(true);
    expect(stats[key]).toBeGreaterThanOrEqual(2025);
    expect(stats[key]).toBeLessThanOrEqual(2101);
  }
  expect(stats.p10).toBeLessThanOrEqual(stats.p50);
  expect(stats.p50).toBeLessThanOrEqual(stats.p90);
}

function expectThreatSummaries(propagated, standalone) {
  expect(Object.keys(propagated).sort()).toEqual(Object.keys(standalone).sort());
  expect(Object.keys(propagated)).toHaveLength(23);
  for (const id of Object.keys(propagated)) {
    const functional = propagated[id];
    const intrinsic = standalone[id];
    expectQuantiles(functional);
    expectQuantiles(intrinsic);
    for (const key of ['p2050', 'censorFraction']) {
      expect(Number.isFinite(functional[key]), `${id}.${key}`).toBe(true);
      expect(functional[key]).toBeGreaterThanOrEqual(0);
      expect(functional[key]).toBeLessThanOrEqual(1);
    }
    // First functional failure includes spontaneous failure. Propagation cannot
    // delay that same threat's failure under the paired sampled inputs.
    for (const key of ['p10', 'p50', 'p90']) {
      expect(functional[key], `${id}.${key}`).toBeLessThanOrEqual(intrinsic[key]);
    }
    expect(functional.p2050 + 1e-12, `${id}.p2050`).toBeGreaterThanOrEqual(intrinsic.p2050);
  }
}

async function openCollapseCard(page, id) {
  const body = page.locator(`#${id}-body`);
  if (!(await body.getAttribute('class')).split(/\s+/).includes('open')) {
    await page.locator(`[data-collapse-target="${id}"]`).click();
  }
  await expect(body).toHaveClass(/\bopen\b/);
  await expect(body).toHaveCSS('opacity', '1');
  await expect(body).toHaveCSS('pointer-events', 'auto');
}

async function uploadDataset(page, fileName) {
  const data = readDataset(fileName);
  await openCollapseCard(page, 'sourceRegistryCard');
  const chooserPromise = page.waitForEvent('filechooser');
  await page.locator('label[for="sourceFileInput"]').click();
  await (await chooserPromise).setFiles(path.join(ROOT, fileName));
  await page.waitForFunction(({ fileName, version }) =>
    ACTIVE_SOURCE_META.fileName === fileName && currentDatasetVersion() === version,
  { fileName, version: data._meta.dataset_version }, { timeout: 10000 });
  await expect(page.locator('#sourceEntryCount')).toHaveText('184/184');
  await expect(page.locator('#sourceThreatCoverage')).toHaveText('23/23 threats');
  await expect(page.locator('#sourceMessage')).not.toContainText('Upload failed');
  return data;
}

async function downloadText(page, action) {
  const control = page.locator(`[data-action="${action}"]`);
  // Export actions are in the always-visible mission action bar, not its
  // expandable explanatory text or the separate sharing dropdown.
  await expect(page.locator('#missionActions')).toBeVisible();
  await expect(control).toBeVisible();
  await control.scrollIntoViewIfNeeded();
  const downloadPromise = page.waitForEvent('download');
  await control.click();
  const download = await downloadPromise;
  expect(await download.failure()).toBeNull();
  const stream = await download.createReadStream();
  expect(stream).not.toBeNull();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return { name: download.suggestedFilename(), text: Buffer.concat(chunks).toString('utf8') };
}

function csvMetadata(text, key) {
  const prefix = `"${key}",`;
  const rows = text.split(/\r?\n/).filter(row => row.startsWith(prefix));
  expect(rows, `one CSV metadata row for ${key}`).toHaveLength(1);
  const quoted = rows[0].slice(prefix.length);
  expect(quoted.startsWith('"') && quoted.endsWith('"')).toBe(true);
  return quoted.slice(1, -1).replace(/""/g, '"');
}

test.describe('functional model browser integration', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    page.functionalPageErrors = [];
    page.on('pageerror', error => page.functionalPageErrors.push(error.message));
    await page.goto('/index.html');
    // Wait for the real initial run, not merely the existence of declarations.
    await page.waitForFunction(() =>
      typeof _running !== 'undefined' && !_running &&
      window._lastInterpretData?.executionSnapshot &&
      _cdfCurves.baseline?.ensemble?.dynamicCascade,
    undefined, { timeout: 45000 });
  });

  test.afterEach(async ({ page }) => {
    expect(page.functionalPageErrors).toEqual([]);
  });

  test('bundled UI starts with the functional model and dataset identities', async ({ page }) => {
    await expect(page).toHaveTitle(/Apocalypse Clock/);
    await expect(page.getByRole('heading', { name: 'Apocalypse Clock' })).toBeVisible();
    await expect(page.locator('.validation-notice')).toContainText('Astra ULTRA');
    await expect(page.locator('#controlCard')).toHaveCount(0);
    await expect(page.locator('#structuralCard')).toHaveCount(0);
    await expect(page.locator('#cascadeHeadlineYear')).toContainText(/\d{4}|>2100/);
    await expect(page.locator('#cascadeMedianYear')).toContainText(/\d{4}|>2100/);
    await expect(page.locator('#cascadeHorizonPair')).toBeVisible();
    const state = await page.evaluate(() => ({
      model: MODEL_VERSION,
      dataset: currentDatasetVersion(),
      threatCount: THREATS.length,
      count: summarizeSourceMap(ACTIVE_SOURCE_DATA).entryCount,
      snapshot: window._lastInterpretData.executionSnapshot,
      functional: window._lastInterpretData.functionalResults,
    }));
    expect(state.model).toBe(EXPECTED_MODEL);
    expect(state.dataset).toBe(EXPECTED_DATASET);
    expect(state.threatCount).toBe(23);
    expect(state.count).toBe(184);
    expect(state.snapshot.codeIdentifier).toBe(EXPECTED_MODEL);
    expect(state.snapshot.dataIdentifier).toBe(EXPECTED_DATASET);
    expect(state.functional.meaning).toEqual(expect.any(String));
    expect(state.functional.domainMeaning).toContain('full-system directed propagation');
    expect(Object.keys(state.functional.domains).sort()).toEqual(['biosphere', 'civilization', 'technology']);
    Object.values(state.functional.domains).forEach(expectQuantiles);
    expectThreatSummaries(state.functional.propagated, state.functional.standalone);
  });

  test('main CDF follows the Dynamic Cascade clocks and Weibull reports censoring bounds without undefined values', async ({ page }) => {
    await expect(page.getByText('Dynamic Cascade first-crossing distribution', { exact: true })).toBeVisible();
    const cdf = await page.evaluate(() => {
      const result = _cdfCurves.baseline;
      const dynamic = result.ensemble.dynamicCascade;
      drawCDF();
      const option = ensureEChart('cdfCanvas').getOption();
      const mainSeries = option.series.find(series => String(series.name).includes('Dynamic Cascade'));
      return {
        legend: document.getElementById('cdfLegend').textContent.replace(/\s+/g, ' ').trim(),
        expectedQuantiles: [dynamic.p10, dynamic.p50, dynamic.p90],
        displayedMarkers: mainSeries.markLine.data
          .filter(marker => marker.name !== 'NOW')
          .map(marker => marker.xAxis),
        displayedP2050: mainSeries.data.find(point => point[0] === 2050)[1] / 100,
        expectedP2050: dynamic.cdf.find(point => point.year === 2050).prob,
        compensatoryP2050: result.cdf.find(point => point.year === 2050).prob,
      };
    });
    expect(cdf.legend).toContain('Baseline Dynamic Cascade P50: 2036');
    expect(cdf.displayedMarkers).toEqual(cdf.expectedQuantiles);
    expect(cdf.displayedP2050).toBeCloseTo(cdf.expectedP2050, 4);
    expect(cdf.displayedP2050).not.toBeCloseTo(cdf.compensatoryP2050, 2);

    await page.locator('[data-priority-mode-btn="weibull"]').click();
    const weibull = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#aggregateRow .agg-card')];
      const summaries = DOMAIN_LAYER_CARDS.map(domain => summarizeDomainLayer(
        priorityViewState.enriched.filter(threat => threat.domain === domain.key),
        priorityViewState.mcRes,
        domain.key,
      ));
      return {
        titles: cards.map(card => card.querySelector('.agg-name').textContent.trim()),
        years: cards.map(card => card.querySelector('.agg-year').textContent.trim()),
        text: cards.map(card => card.textContent.replace(/\s+/g, ' ').trim()).join(' '),
        summaries,
      };
    });
    expect(weibull.titles).toEqual([
      'Civilizational Functional-Disruption Horizon',
      'Biosphere Functional-Disruption Horizon',
      'Technological Functional-Disruption Horizon',
    ]);
    expect(weibull.years.every(year => /^>\d{4}$/.test(year))).toBe(true);
    expect(weibull.text).toContain('right-censored after 2100');
    expect(weibull.text).toContain('range');
    expect(weibull.text).not.toMatch(/\bundefined\b|NaN/);
    for (const summary of weibull.summaries) {
      expect(summary.status).toBe('partially_identified');
      expect(summary.mid).toBeNull();
      expect(summary.midLowerBound).toEqual(expect.any(Number));
      expect(summary.p2050Lower).toBeGreaterThanOrEqual(0);
      expect(summary.p2050Upper).toBeLessThanOrEqual(1);
      expect(summary.p2050Lower).toBeLessThanOrEqual(summary.p2050Upper);
    }
  });

  test('the file importer preserves all 184 ranges and threshold functional metadata', async ({ page }) => {
    const data = await uploadDataset(page, FUNCTIONAL_FILE);
    const state = await page.evaluate(() => ({
      source: ACTIVE_SOURCE_DATA,
      threats: THREATS.map(t => ({ id: t.id, threshold: t.threshold,
        functional_weight: t.functional_weight, critical_services: t.critical_services,
        dependency_weights: t.dependency_weights, functional_failure: t.functional_failure })),
    }));
    expect(Object.keys(state.source)).toHaveLength(184);
    expect(state.threats).toHaveLength(23);
    for (const threat of state.threats) {
      for (const field of RANGE_FIELDS) {
        const key = `${threat.id}.${field}`;
        for (const bound of ['lo', 'mu', 'hi']) expect(state.source[key][bound], `${key}.${bound}`).toBe(data[key][bound]);
      }
      const expected = functionalFields(data[`${threat.id}.threshold`]);
      expect(expected.functional_weight).toEqual(expect.any(Number));
      expect(expected.critical_services).toEqual(expect.any(Array));
      expect(expected.dependency_weights).toEqual(expect.any(Object));
      expect(functionalFields(state.source[`${threat.id}.threshold`])).toEqual(expected);
      expect(functionalFields(threat.threshold)).toEqual(expected);
      expect(functionalFields(threat)).toEqual(expected);
    }
  });

  test('a complete 1.8.0 source map imports while fixed functional catalog settings remain available', async ({ page }) => {
    const expectedCatalog = await page.evaluate(() => Object.fromEntries(THREATS.map(t => [t.id, {
      functional_weight: t.functional_weight, critical_services: t.critical_services,
      dependency_weights: t.dependency_weights, functional_failure: t.functional_failure,
    }])));
    const legacy = await uploadDataset(page, LEGACY_FILE);
    const state = await page.evaluate(async () => {
      const params = snapshotParams('baseline', 80);
      const result = await runMC('baseline', 80, null, params);
      return { dataset: currentDatasetVersion(), source: ACTIVE_SOURCE_DATA,
        threats: THREATS.map(t => ({ id: t.id, functional_weight: t.functional_weight,
          critical_services: t.critical_services, dependency_weights: t.dependency_weights,
          functional_failure: t.functional_failure })),
        standalone: result.threatStats, propagated: result.functionalStats,
        cascade: result.ensemble.dynamicCascade };
    });
    expect(state.dataset).toBe('1.8.0');
    expect(state.threats).toHaveLength(23);
    for (const threat of state.threats) {
      expect(legacy[`${threat.id}.threshold`].functional_weight).toBeUndefined();
      expect(functionalFields(threat)).toEqual(expectedCatalog[threat.id]);
      for (const field of RANGE_FIELDS) {
        const key = `${threat.id}.${field}`;
        for (const bound of ['lo', 'mu', 'hi']) expect(state.source[key][bound], `${key}.${bound}`).toBe(legacy[key][bound]);
      }
    }
    expectQuantiles(state.cascade);
    expectThreatSummaries(state.propagated, state.standalone);
  });

  test('all scenarios and weight profiles produce ordered finite functional statistics and matching explanations', async ({ page }) => {
    await uploadDataset(page, FUNCTIONAL_FILE);
    const matrix = await page.evaluate(async () => {
      const scenarios = Object.keys(SC);
      const profiles = Object.keys(WEIGHT_PROFILES);
      const rows = [];
      for (const scenario of scenarios) {
        for (const profile of profiles) {
          applyWeightProfile(profile, false);
          const params = { ...snapshotParams(scenario, 80), seed: 'functional-integration-80' };
          const enriched = buildEnriched(scenario, params);
          const simulation = simulateFunctionalCascade(enriched, params, { collectAll: true });
          const explanation = explainCascadeCrossing(enriched, params);
          const result = await runMC(scenario, 80, null, params);
          rows.push({ scenario, profile, simulationYear: simulation.year,
            explanationYear: explanation.year,
            directYear: computeDynamicCascadeCrossing(enriched, params),
            cascade: { p10: result.ensemble.dynamicCascade.p10,
              p50: result.ensemble.dynamicCascade.p50, p90: result.ensemble.dynamicCascade.p90 },
            domains: result.domainStats,
            standalone: result.threatStats, propagated: result.functionalStats });
        }
      }
      return { scenarios, profiles, rows };
    });
    expect(matrix.scenarios.length).toBeGreaterThanOrEqual(4);
    expect(matrix.profiles.length).toBeGreaterThanOrEqual(5);
    expect(matrix.rows).toHaveLength(matrix.scenarios.length * matrix.profiles.length);
    for (const row of matrix.rows) {
      expect(row.explanationYear, `${row.scenario}/${row.profile}`).toBe(row.simulationYear);
      expect(row.directYear, `${row.scenario}/${row.profile}`).toBe(row.simulationYear);
      expect(Number.isFinite(row.simulationYear)).toBe(true);
      expectQuantiles(row.cascade);
      expect(Object.keys(row.domains).sort()).toEqual(['biosphere', 'civilization', 'technology']);
      Object.values(row.domains).forEach(expectQuantiles);
      expectThreatSummaries(row.propagated, row.standalone);
    }
  });

  test('fixed baseline run snapshots and downloads standalone and propagated results', async ({ page }) => {
    const data = await uploadDataset(page, FUNCTIONAL_FILE);
    // Run the fixed baseline configuration programmatically; interactive
    // scenario and simulation controls are intentionally absent from the UI.
    await page.evaluate(async () => {
      P.scenario = 'baseline';
      P.nSim = 1000;
      P.seed = 'functional-export-1000';
      await runAll();
    });
    await page.waitForFunction(() => !_running &&
      window._lastInterpretData?.executionSnapshot?.seed === 'functional-export-1000' &&
      window._lastInterpretData.executionSnapshot.parameters.nSim === 1000,
    undefined, { timeout: 45000 });
    await expect(page.locator('#controlCard')).toHaveCount(0);
    await expect(page.locator('#cascadeHeadlineYear')).toContainText(/\d{4}|>2100/);
    await expect(page.locator('#cascadeMedianYear')).toContainText(/\d{4}|>2100/);

    const run = await page.evaluate(() => ({ snapshot: window._lastInterpretData.executionSnapshot,
      functional: window._lastInterpretData.functionalResults,
      modelCascade: _cdfCurves.baseline.ensemble.dynamicCascade,
    }));
    expect(run.snapshot.codeIdentifier).toBe(EXPECTED_MODEL);
    expect(run.snapshot.dataIdentifier).toBe(EXPECTED_DATASET);
    expect(run.snapshot.activeDataset).toBe(FUNCTIONAL_FILE);
    expect(run.snapshot.threatInputs).toHaveLength(23);
    for (const input of run.snapshot.threatInputs) {
      expect(functionalFields(input)).toEqual(functionalFields(data[`${input.id}.threshold`]));
    }
    expect(run.functional.meaning.length).toBeGreaterThan(0);
    expect(run.functional.domainMeaning).toContain('full-system directed propagation');
    expect(Object.keys(run.functional.domains).sort()).toEqual(['biosphere', 'civilization', 'technology']);
    Object.values(run.functional.domains).forEach(expectQuantiles);
    expectThreatSummaries(run.functional.propagated, run.functional.standalone);
    expect(Number.isFinite(run.functional.deterministic.year)).toBe(true);
    expectQuantiles(run.modelCascade);

    const jsonDownload = await downloadText(page, 'export-json');
    expect(jsonDownload.name).toBe('apocalypse_clock_export.json');
    const exported = JSON.parse(jsonDownload.text);
    expect(exported.modelVersion).toBe(EXPECTED_MODEL);
    expect(exported.datasetVersion).toBe(EXPECTED_DATASET);
    expect(exported.monteCarloIterations).toBe(1000);
    expect(exported.executionSnapshot).toEqual(run.snapshot);
    expect(exported.functionalResults).toEqual(run.functional);

    const csvDownload = await downloadText(page, 'export-csv');
    expect(csvDownload.name).toBe('apocalypse_clock_export.csv');
    expect(csvMetadata(csvDownload.text, 'modelVersion')).toBe(EXPECTED_MODEL);
    expect(csvMetadata(csvDownload.text, 'datasetVersion')).toBe(EXPECTED_DATASET);
    expect(JSON.parse(csvMetadata(csvDownload.text, 'functionalResultsJson'))).toEqual(run.functional);
    expect(JSON.parse(csvMetadata(csvDownload.text, 'threatInputsJson'))).toEqual(run.snapshot.threatInputs);
  });
});
