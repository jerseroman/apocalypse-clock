const { test, expect } = require('@playwright/test');

// Left-hand section menu: every item opens only its own section, with visible content; the clock
// column keeps its width; #section-all shows every section; charts are drawn at full size; the menu
// links to GitHub, Facebook and Perplexity and has Share and Email buttons; the network panel shows the embedded canvas network.
test('section menu opens each section on its own and keeps the clocks unchanged', async ({ page }) => {
  test.setTimeout(240000);
  await page.setViewportSize({ width: 1536, height: 900 });
  const problems = [];
  page.on('pageerror', error => problems.push(error.message));
  await page.goto('/index.html');
  await page.waitForFunction(() => document.querySelector('#conditionalTriggers')?.dataset.state === 'ready', null, { timeout: 200000 });

  await expect(page.locator('.section-nav-link.is-active')).toHaveText('Projected horizon');
  expect(Math.round((await page.locator('#heroAbsoluteClock').boundingBox()).width)).toBe(520);

  const ids = await page.$$eval('.section-nav-link', links => links.map(link => link.dataset.navTarget));
  expect(ids.length).toBe(11);
  for (const id of ids) {
    await page.click(`[data-nav-target="${id}"]`);
    const state = await page.evaluate(sectionId => {
      const own = [...document.querySelectorAll(`[data-nav-section="${sectionId}"]`)];
      const others = [...document.querySelectorAll('[data-nav-section]')].filter(el => el.dataset.navSection !== sectionId);
      return {
        ownVisible: own.filter(el => el.getClientRects().length).length,
        othersVisible: others.filter(el => el.getClientRects().length).length,
        hash: location.hash,
      };
    }, id);
    expect(state.ownVisible, id).toBeGreaterThan(0);
    expect(state.othersVisible, id).toBe(0);
    expect(state.hash).toBe(`#section-${id}`);
  }

  await page.click('[data-nav-target="contribution"]');
  await expect.poll(async () => (await page.locator('#barCanvas canvas').first().boundingBox())?.width || 0).toBeGreaterThan(300);

  const social = await page.$$eval('.section-nav-social-link', links => links.map(link => link.textContent.trim() + ' ' + link.href));
  expect(social.length).toBe(5);
  expect(social[3]).toContain('Share');
  expect(social[4]).toContain('Email mailto:');
  expect(social[0]).toContain('GitHub https://github.com/jerseroman/apocalypse-clock');
  expect(social[1]).toContain('facebook.com');
  expect(social[2]).toContain('perplexity.ai');

  await page.click('[data-nav-target="network"]');
  const frame = page.frameLocator('#threatNetworkFrame');
  await expect(frame.locator('#net')).toBeVisible();
  await expect.poll(async () => (await page.locator('#threatNetworkFrame').boundingBox()).height).toBeGreaterThan(500);
  await expect(frame.locator('#statLinks')).toHaveText('102');

  await page.evaluate(() => { location.hash = '#section-all'; });
  const hiddenInWholePage = await page.locator('.nav-hidden').count();
  expect(hiddenInWholePage).toBe(0);
  expect(problems).toEqual([]);
});
