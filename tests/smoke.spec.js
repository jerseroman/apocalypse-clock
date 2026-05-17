const { test, expect } = require('@playwright/test');

test('static dashboard loads and core controls respond', async ({ page }) => {
  const errors = [];
  const warnings = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
    if (message.type() === 'warning' || message.type() === 'warn') warnings.push(message.text());
  });

  await page.goto('/index.html');

  await expect(page).toHaveTitle(/Apocalypse Clock/);
  await expect(page.getByRole('heading', { name: 'Apocalypse Clock' })).toBeVisible();
  await expect(page.locator('#runBtn')).toBeAttached();
  await expect(page.locator('#cascadeHeadlineYear')).toContainText(/\d{4}|>2100/, { timeout: 20000 });

  await page.locator('#missionToggle').click();
  await expect(page.locator('#missionMore')).toBeVisible();

  expect(errors).toEqual([]);
  expect(warnings.filter(text => text.includes('custom wheel sensitivity'))).toEqual([]);
});
