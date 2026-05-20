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

  await page.locator('[data-action="toggle-share-menu"]').click();
  await expect(page.locator('#shareDropdown')).toBeVisible();
  await page.evaluate(() => {
    const link = document.createElement('a');
    link.id = 'share-nav-regression-link';
    link.href = '#share-nav-regression-target';
    link.setAttribute('data-action', 'close-share-menu');
    link.textContent = 'Regression share link';
    document.getElementById('shareDropdown').appendChild(link);
  });
  await page.locator('#share-nav-regression-link').click();
  await expect(page).toHaveURL(/#share-nav-regression-target$/);
  await expect(page.locator('#shareDropdown')).toBeHidden();

  expect(errors).toEqual([]);
  expect(warnings.filter(text => text.includes('custom wheel sensitivity'))).toEqual([]);
});
