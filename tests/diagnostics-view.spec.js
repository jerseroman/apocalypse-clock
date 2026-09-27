const { test, expect } = require('@playwright/test');

// Model Diagnostics tabs: the run card sits above five tabs; before a run the chart tabs show an empty
// state with a run button; after the run the tabs show their charts, the audit lists every module as
// completed, and only the chosen tab is visible.
test('Model Diagnostics tabs show an empty state, then the charts of the finished run', async ({ page }) => {
  test.setTimeout(420000);
  await page.setViewportSize({ width: 1536, height: 900 });
  const problems = [];
  page.on('pageerror', error => problems.push(error.message));
  await page.goto('/index.html#section-scientific');
  await page.waitForFunction(() => document.querySelector('#conditionalTriggers')?.dataset.state === 'ready', null, { timeout: 200000 });

  const tabs = await page.$$eval('.diag-tab', buttons => buttons.map(button => button.textContent.trim()));
  expect(tabs).toEqual(['Sensitivity', 'Stress tests', 'Distribution', 'Audit', 'How the model works']);
  await expect(page.locator('#diagPanel-sensitivity .diag-empty')).toBeVisible();

  await page.click('[data-diag-tab="model"]');
  await expect(page.locator('#diagPanel-model')).toBeVisible();
  await expect(page.locator('#diagPanel-sensitivity')).toBeHidden();

  await page.click('[data-diag-tab="sensitivity"]');
  await page.click('#diagPanel-sensitivity .diag-empty-run');
  await expect(page.locator('#additionalCalcConsoleCopy')).toContainText('Complete', { timeout: 200000 });
  await expect(page.locator('#diagPanel-sensitivity .diag-empty')).toBeHidden();
  await expect.poll(async () => (await page.locator('#diagPanel-sensitivity .scientific-chart-surface').first().boundingBox())?.width || 0).toBeGreaterThan(300);

  await page.click('[data-diag-tab="stress"]');
  await expect.poll(async () => (await page.locator('#smaaDiagnosticChart').boundingBox())?.width || 0).toBeGreaterThan(600);

  await page.click('[data-diag-tab="audit"]');
  await expect(page.locator('#experimentalAuditBox .advanced-badge')).toHaveText(Array(5).fill('completed'), { ignoreCase: true });
  expect(problems).toEqual([]);
});
