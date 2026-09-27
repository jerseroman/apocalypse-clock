const { test, expect } = require('@playwright/test');

// Page search: a keyword lists matches by section; choosing one opens the section, expands the
// collapsed threat card that holds the match and scrolls to it. The validation notice can be closed.
test('page search finds a threat and opens its collapsed card', async ({ page }) => {
  test.setTimeout(240000);
  await page.setViewportSize({ width: 1536, height: 900 });
  const problems = [];
  page.on('pageerror', error => problems.push(error.message));
  await page.goto('/index.html');
  await page.waitForFunction(() => document.querySelector('#conditionalTriggers')?.dataset.state === 'ready', null, { timeout: 200000 });

  await page.fill('#pageSearchInput', 'Mass displacement risk reflects');
  const first = page.locator('#pageSearchResults [data-result]').first();
  await expect(first).toContainText('Threats by Rank');
  await expect(first).toContainText('Mass Displacement');
  await page.keyboard.press('Enter');

  await expect(page.locator('#sectionPageTitle')).toHaveText('Threats by Rank');
  const card = page.locator('[data-threat-card="displacement"]');
  await expect(card).not.toHaveClass(/is-collapsed/);
  await expect(page.locator('.page-search-flash')).toBeInViewport();

  await page.fill('#pageSearchInput', 'xyzzy-not-on-page');
  await expect(page.locator('#pageSearchResults')).toContainText('No matches on the page.');

  await page.click('[data-nav-target="horizon"]');
  await page.click('.validation-notice-close');
  await expect(page.locator('.validation-notice')).toBeHidden();
  expect(problems).toEqual([]);
});
