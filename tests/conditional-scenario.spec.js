const { test, expect } = require('@playwright/test');

test('conditional scenario panel reads the clock distribution and traces its trigger', async ({ page }) => {
  test.setTimeout(120000);
  const problems = [];
  page.on('pageerror', error => problems.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' || message.type() === 'warning') problems.push(message.text());
  });

  await page.goto('/index.html#section-all');
  await expect(page.locator('#cascadeHeadlineYear')).toContainText(/\d{4}|>2100/, { timeout: 60000 });

  const panel = page.locator('#conditionalScenario');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Conditional scenario');
  await expect(panel).toContainText('P(threshold reached by year X | model assumptions)');

  const clockP50 = (await page.locator('#cascadeMedianYear').innerText()).trim();
  const clockP90 = (await page.locator('#cascadeHeadlineYear').innerText()).trim();
  const clockP50Prob = (await page.locator('#cascadeMedianProb').innerText()).trim();
  const clockP90Prob = (await page.locator('#cascadeHeadlineProb').innerText()).trim();

  const rows = page.locator('#conditionalRules tbody tr');
  await expect(rows).toHaveCount(4);
  await expect(rows.first()).toContainText('Dynamic cascade');
  await expect(rows.first().locator('td').nth(0)).toHaveText(clockP50);
  await expect(rows.first().locator('td').nth(1)).toHaveText(clockP90);
  await expect(page.locator('#conditionalLegend')).toContainText(`P50 ${clockP50} · ${clockP50Prob} reached`);
  await expect(page.locator('#conditionalLegend')).toContainText(`P90 ${clockP90} · ${clockP90Prob} reached`);
  await expect(page.locator('#conditionalCensored')).toContainText('2100');
  await expect(page.locator('#conditionalRulesNote')).toContainText('P50 spans');

  const triggers = page.locator('#conditionalTriggers');
  await expect(triggers).toHaveAttribute('data-state', 'ready', { timeout: 90000 });
  await expect(triggers).toHaveAttribute('data-consistent', 'true');
  await expect(triggers).toContainText('of the runs that reach the threshold');
  await expect(triggers.locator('.conditional-bar-row').first()).toContainText('%');

  expect(problems).toEqual([]);
});

test('basket layout counts overlap groups once and finds the fewest failing groups', async ({ page }) => {
  await page.goto('/index.html#section-all');
  const layout = await page.evaluate(() => {
    const nodes = [
      { id: 'a', weight: 3, services: ['life'], overlapGroup: 'a' },
      { id: 'b', weight: 3, services: ['life'], overlapGroup: 'eco' },
      { id: 'c', weight: 2, services: ['life', 'water'], overlapGroup: 'eco' },
      { id: 'd', weight: 1, services: ['water'], overlapGroup: 'd' },
    ];
    const half = cascadeBasketLayout(nodes, 0.5);
    const higher = cascadeBasketLayout(nodes, 0.6);
    return {
      lifeGroups: half.life.groupCount,
      ecoWeight: half.life.groups.eco.weight,
      lifeAtHalf: half.life.minGroupsToCross,
      lifeAtHigher: higher.life.minGroupsToCross,
      waterAtHalf: half.water.minGroupsToCross,
      systemGroups: half[CASCADE_SYSTEM_BASKET].groupCount,
    };
  });
  expect(layout).toEqual({ lifeGroups: 2, ecoWeight: 3, lifeAtHalf: 1, lifeAtHigher: 2, waterAtHalf: 1, systemGroups: 3 });
});
