const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 360, height: 800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  // Simulate a poor mobile connection where optional CDN assets do not answer
  // during the period in which the primary dashboard must become usable.
  await page.route('**/cdn.jsdelivr.net/**', async route => {
    await new Promise(resolve => setTimeout(resolve, 15000));
    await route.abort('timedout').catch(() => {});
  });

  const startedAt = Date.now();
  await page.goto('http://127.0.0.1:4179/.codex-wix-build/harness.html', {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForFunction(() => {
    const host = document.querySelector('wix-default-custom-element');
    const root = host && host.shadowRoot;
    return host && host.dataset.state === 'ready'
      && root && root.getElementById('cascadeMedianYear')?.textContent.trim() === '2038'
      && root.getElementById('cascadeHeadlineYear')?.textContent.trim() === '2046';
  }, null, { timeout: 3000 });

  const elapsedMs = Date.now() - startedAt;
  const state = await page.evaluate(() => {
    const host = document.querySelector('wix-default-custom-element');
    const root = host.shadowRoot;
    return {
      hostState: host.dataset.state,
      p50: root.getElementById('cascadeMedianYear')?.textContent.trim(),
      p90: root.getElementById('cascadeHeadlineYear')?.textContent.trim(),
      badge: root.getElementById('simBadge')?.textContent.trim(),
      echartsLoadedAtReady: typeof window.echarts !== 'undefined',
    };
  });

  if (elapsedMs > 2500) throw new Error(`Core UI took ${elapsedMs} ms under stalled optional CDNs.`);
  if (errors.length) throw new Error(`Page errors: ${errors.join(' | ')}`);
  console.log(JSON.stringify({ elapsedMs, ...state }, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
