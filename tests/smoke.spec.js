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

  const shareToggle = page.locator('[data-action="toggle-share-menu"]');
  const missionActions = page.locator('#missionActions');
  const actionsBefore = await missionActions.boundingBox();
  expect(actionsBefore).not.toBeNull();

  await shareToggle.click();
  const shareDropdown = page.locator('#shareDropdown');
  await expect(shareDropdown).toBeVisible();

  const actionsAfter = await missionActions.boundingBox();
  expect(actionsAfter).not.toBeNull();
  const dropdownMetrics = await shareDropdown.evaluate(el => {
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      display: style.display,
      left: rect.left,
      position: style.position,
      top: rect.top,
      width: rect.width,
    };
  });
  const toggleBox = await shareToggle.boundingBox();
  expect(toggleBox).not.toBeNull();
  expect(['absolute', 'fixed']).toContain(dropdownMetrics.position);
  expect(dropdownMetrics.display).not.toBe('block');
  expect(dropdownMetrics.width).toBeLessThan(280);
  expect(dropdownMetrics.top).toBeGreaterThanOrEqual(toggleBox.y + toggleBox.height - 1);
  expect(Math.abs(actionsAfter.height - actionsBefore.height)).toBeLessThan(2);

  const encodedShareText = 'Explore%20the%20Apocalypse%20Clock%3A%20an%20independent%20systemic-risk%20monitor%20showing%20which%20civilizational%20threats%20are%20currently%20placing%20the%20greatest%20pressure%20on%20the%20global%20system.';
  const encodedShareUrl = 'https%3A%2F%2Fwww.apocalypseclock.com%2F';
  const shareLinks = {
    '#sh-twitter': ['twitter.com/intent/tweet', 'text='],
    '#sh-facebook': ['facebook.com/sharer/sharer.php', 'quote='],
    '#sh-telegram': ['t.me/share/url', 'text='],
    '#sh-reddit': ['reddit.com/submit', 'title='],
    '#sh-linkedin': ['linkedin.com/shareArticle', 'summary='],
  };
  for (const [selector, expectedParts] of Object.entries(shareLinks)) {
    const href = await page.locator(selector).getAttribute('href');
    expect(href).toContain(encodedShareText);
    expect(href).toContain(encodedShareUrl);
    for (const part of expectedParts) expect(href).toContain(part);
  }

  await page.locator('#sh-twitter').evaluate(el => {
    el.setAttribute('href', '#share-nav-regression-target');
    el.removeAttribute('target');
  });
  await page.locator('#sh-twitter').click();
  await expect(page).toHaveURL(/#share-nav-regression-target$/);
  await expect(shareDropdown).toBeHidden();

  await shareToggle.click();
  await expect(shareDropdown).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(shareDropdown).toBeHidden();

  expect(errors).toEqual([]);
  expect(warnings.filter(text => text.includes('custom wheel sensitivity'))).toEqual([]);
});
