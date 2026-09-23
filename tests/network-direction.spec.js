const { test, expect } = require('@playwright/test');

test('the 1.2.9 dependency view and source-map graph are restored', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof _running !== 'undefined' && !_running &&
    _cdfCurves.baseline?.ensemble?.dynamicCascade &&
    typeof _netCyInstance !== 'undefined' && _netCyInstance?.nodes().length === 23);

  const restored = await page.evaluate(() => ({
    renderer: typeof window.cytoscape,
    edgeCount: _netCyInstance.edges().length,
    climateDeps: THREATS.find(threat => threat.id === 'climate').deps,
    spaceDeps: THREATS.find(threat => threat.id === 'space').deps,
    climateWeight: THREATS.find(threat => threat.id === 'climate').dependency_weights.geopolitics,
  }));
  expect(restored.renderer).toBe('function');
  expect(restored.edgeCount).toBe(71);
  expect(restored.climateDeps).toContain('geopolitics');
  expect(restored.climateWeight).toBe(0.25);
  expect(restored.spaceDeps.sort()).toEqual(['ai', 'cyber', 'geopolitics']);

  await page.evaluate(() => _netCyInstance.getElementById('climate').emit('mouseover'));
  await expect(page.locator('#netTitle')).toHaveText('Climate Breakdown');
  await expect(page.locator('#netImpactList')).toContainText('Geopolitical Escalation');
  expect(await page.evaluate(() => _netCyInstance.getElementById('geopolitics').hasClass('neighbor'))).toBe(true);

  await page.evaluate(() => _netCyInstance.getElementById('space').emit('tap'));
  await expect(page.locator('#netTitle')).toHaveText('Space Infrastructure Disruption');
  for (const target of ['Advanced AI Destabilizer', 'Systemic Cyberattacks', 'Geopolitical Escalation']) {
    await expect(page.locator('#netImpactList')).toContainText(target);
  }
});
