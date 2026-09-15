const { test, expect } = require('@playwright/test');

test('static dashboard loads and core controls respond', async ({ page }) => {
  test.setTimeout(90000);
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
  await expect(page.locator('.validation-notice')).toContainText('not been scientifically validated');
  await expect(page.locator('.validation-notice')).toContainText('Astra ULTRA');
  await expect(page.locator('#controlCard')).toHaveCount(0);
  await expect(page.locator('#structuralCard')).toHaveCount(0);
  // The canonical 3000-run initialization can exceed 20 seconds when the full
  // suite runs two Monte Carlo-heavy browser workers in parallel.
  await expect(page.locator('#cascadeHeadlineYear')).toContainText(/\d{4}|>2100/, { timeout: 60000 });
  await expect(page.locator('#cascadeMedianYear')).toContainText(/\d{4}|>2100/);
  await expect(page.locator('#cascadeHorizonGap')).toContainText(/\d+|—/);
  await expect(page.locator('#cascadeMedianYearWrap')).toBeVisible();
  await expect(page.locator('#cascadeHeadlineYearWrap')).toBeVisible();

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

test('model loading indicator shows real monotonic progress on desktop and mobile widths', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/index.html');
  await expect(page.locator('#cascadeHeadlineYear')).toContainText(/\d{4}|>2100/, { timeout: 60000 });

  await page.evaluate(() => {
    document.getElementById('cascadeLoadingMsg').style.display = 'block';
    window._particleLoader.start();
    window._particleLoader.setProgress(0.52);
    window._particleLoader.setProgress(0.30);
  });

  await expect(page.locator('#cascadeLoadingPercent')).toHaveText('52%');
  await expect(page.locator('#cascadeLoadingLabel')).toHaveText('Running uncertainty simulation');
  await expect(page.locator('#cascadeLoadingProgress')).toHaveAttribute('aria-valuenow', '52');

  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const geometry = await page.locator('#cascadeLoadingMsg').evaluate(element => {
      const rect = element.getBoundingClientRect();
      const parentRect = element.parentElement.getBoundingClientRect();
      const track = element.querySelector('.cascade-loading-track').getBoundingClientRect();
      const fill = element.querySelector('.cascade-loading-fill').getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        parentLeft: parentRect.left,
        parentRight: parentRect.right,
        ratio: fill.width / track.width,
      };
    });
    expect(geometry.left).toBeGreaterThanOrEqual(geometry.parentLeft - 1);
    expect(geometry.right).toBeLessThanOrEqual(geometry.parentRight + 1);
    expect(geometry.ratio).toBeGreaterThan(0.50);
    expect(geometry.ratio).toBeLessThan(0.54);
  }
});
