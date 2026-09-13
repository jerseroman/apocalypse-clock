const { test, expect } = require('@playwright/test');

test('Wix Velo custom element renders the audited dual-clock application without an iframe', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1264, height: 720 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('/wix/custom-element-harness.html');

  const host = page.locator('apocalypse-clock');
  await expect(host).toHaveAttribute('data-integration', 'wix-velo-custom-element');
  await expect(host).toHaveAttribute('data-model-version', '1.2.8');
  await expect(host).toHaveAttribute('data-dataset-version', '1.9.0');
  await expect(host).toHaveAttribute('data-state', 'ready');
  await expect(host.locator('iframe')).toHaveCount(0);
  await expect(host.locator('.validation-notice')).toContainText('not been scientifically validated');
  await expect(host.locator('.validation-notice')).toContainText('Astra ULTRA');
  await expect(host.locator('#controlCard')).toHaveCount(0);
  await expect(host.locator('#structuralCard')).toHaveCount(0);
  await expect(host.locator('#cascadeHorizonPair')).toBeVisible({ timeout: 60000 });
  await expect(host.locator('#cascadeMedianYear')).toHaveText('2036');
  await expect(host.locator('#cascadeHeadlineYear')).toHaveText('2043');
  await expect(host.locator('#cascadeHorizonGap')).toHaveText('7');

  const horizontalLayout = await host.evaluate(element => {
    const body = element.shadowRoot.querySelector('.ac-body');
    const page = element.shadowRoot.querySelector('.page');
    const pair = element.shadowRoot.querySelector('#cascadeHorizonPair');
    const p90 = element.shadowRoot.querySelector('#cascadeHeadlineYear');
    const hostBox = element.getBoundingClientRect();
    const pairBox = pair.getBoundingClientRect();
    const p90Box = p90.getBoundingClientRect();
    return {
      hostClientWidth: element.clientWidth,
      bodyOverflowX: getComputedStyle(body).overflowX,
      pageWidth: page.getBoundingClientRect().width,
      pairRight: pairBox.right,
      p90Right: p90Box.right,
      hostRight: hostBox.right,
    };
  });
  expect(horizontalLayout.hostClientWidth).toBe(1165);
  expect(horizontalLayout.bodyOverflowX).toBe('hidden');
  expect(horizontalLayout.pageWidth).toBeLessThanOrEqual(horizontalLayout.hostClientWidth);
  expect(horizontalLayout.pairRight).toBeLessThanOrEqual(horizontalLayout.hostRight);
  expect(horizontalLayout.p90Right).toBeLessThanOrEqual(horizontalLayout.hostRight);
  expect(errors).toEqual([]);
});

test('Wix Velo document facade does not wrap the live document as its Proxy target', async ({ request }) => {
  const response = await request.get('/wix/apocalypse-clock-element.js');
  expect(response.ok()).toBeTruthy();
  const source = await response.text();
  expect(source).toContain('new Proxy(Object.create(null), {');
  expect(source).not.toContain('new Proxy(nativeDocument, {');
});
