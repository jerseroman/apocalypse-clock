const { test, expect } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs');
const source = path.join(__dirname, '../assets/threat-pages/threat-report.js');
const slugs = [...fs.readFileSync(source, 'utf8').matchAll(/"slug":\s*"([a-z]+)"/g)].map(m => m[1]);

async function mount(page, slug) {
  await page.setContent(`<style>
    *{box-sizing:border-box} body{margin:0} #site-root{overflow:clip}
    #masterPage{display:grid;grid-template-rows:max-content min-content max-content}
    #PAGES_CONTAINER{grid-row:2;height:3703px}
    #SITE_PAGES{height:100%}
    .mesh{display:grid;grid-template-columns:100%;min-height:3703px}
    #report{height:119px;display:flex;width:320px;--custom-element-height:119px}
    #SITE_FOOTER{grid-row:3;height:80px;background:#ddd}
  </style><div id="site-root"><div id="masterPage">
    <main id="PAGES_CONTAINER"><div id="SITE_PAGES"><section><div class="mesh">
      <div id="report"><wix-default-custom-element slug="${slug}"></wix-default-custom-element></div>
    </div></section></div></main><footer id="SITE_FOOTER">End of page</footer>
  </div></div>`);
  await page.addScriptTag({ path: source });
  await expect(page.locator('wix-default-custom-element')).toHaveAttribute('data-state', 'ready');
}

async function bounds(page) {
  return page.evaluate(() => {
    const host = document.querySelector('wix-default-custom-element');
    const bottom = host.shadowRoot.querySelector('.pager').getBoundingClientRect().bottom + scrollY;
    return { bottom, pageBottom: document.querySelector('#PAGES_CONTAINER').getBoundingClientRect().bottom + scrollY,
      footerTop: host.shadowRoot.querySelector('.report-footer').getBoundingClientRect().top + scrollY,
      documentBottom: document.documentElement.scrollHeight, scrollY, viewport: innerHeight };
  });
}

test('all 23 reports expand the clipped mobile page and leave the footer reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  expect(slugs.length).toBe(23);
  for (const slug of slugs) {
    await mount(page, slug);
    const b = await bounds(page);
    expect(b.pageBottom, slug).toBeGreaterThanOrEqual(b.bottom - 1);
    expect(b.footerTop, slug).toBeGreaterThanOrEqual(b.bottom - 1);
    await expect(page.locator('.report-footer nav[aria-label="Threat pages"] a'), slug).toHaveCount(23);
    await expect(page.locator('#SITE_FOOTER'), slug).toBeHidden();
    await page.locator('.report-footer').scrollIntoViewIfNeeded();
    await expect(page.locator('.report-footer'), slug).toBeInViewport();
  }
});

test('late Wix height resets and width changes cannot truncate the report', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mount(page, 'climatebreakdown');
  // Reproduce Wix hydrating/refreshing layout after the report has already rendered.
  await page.evaluate(() => {
    for (const id of ['report', 'PAGES_CONTAINER', 'SITE_PAGES', 'masterPage', 'site-root']) {
      document.getElementById(id).style.setProperty('height', '119px', 'important');
      document.getElementById(id).style.setProperty('max-height', '119px', 'important');
    }
  });
  await expect.poll(async () => {
    const b = await bounds(page); return b.documentBottom >= b.bottom;
  }).toBe(true);
  for (const width of [320, 560, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.locator('#report').evaluate((e, w) => { e.style.width = `${w}px`; }, width);
    await expect.poll(async () => {
      const b = await bounds(page); return b.footerTop >= b.bottom - 1;
    }).toBe(true);
    await page.locator('.report-footer').scrollIntoViewIfNeeded();
    await expect(page.locator('.report-footer')).toBeInViewport();
  }
});

test('phone type is unchanged and desktop type is 25 percent smaller', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mount(page, 'climatebreakdown');
  const sizes = () => page.evaluate(() => {
    const root = document.querySelector('wix-default-custom-element').shadowRoot;
    return ['h1', '.prose > p', '.findings ol', '.byline', 'svg text[font-size="13"]']
      .map(selector => Number.parseFloat(getComputedStyle(root.querySelector(selector)).fontSize));
  });
  const phone = await sizes();
  [29, 16.5, 15, 12.5, 13].forEach((size, i) => expect(phone[i]).toBeCloseTo(size * 0.65, 3));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.locator('#report').evaluate(e => { e.style.width = '1120px'; });
  const desktop = await sizes();
  [46, 18, 16, 14, 13].forEach((size, i) => expect(desktop[i]).toBeCloseTo(size * 0.75, 3));
});

test('head CSS hides legacy copy before report JS and does not hide other pages', async ({ page }) => {
  const head = fs.readFileSync(path.join(__dirname, '../assets/threat-pages/wix-initial-display.html'), 'utf8');
  await page.setContent(`${head}<div id="SITE_PAGES"><div id="tbozo"><div data-testid="richTextElement">Old article</div></div></div><footer id="SITE_FOOTER">Old footer</footer>`);
  await expect(page.getByText('Old article')).toBeHidden();
  await expect(page.locator('#SITE_FOOTER')).toBeHidden();
  await page.setContent(`${head}<div id="SITE_PAGES"><div id="home"><div data-testid="richTextElement">Home content</div></div></div><footer id="SITE_FOOTER">Home footer</footer>`);
  await expect(page.getByText('Home content')).toBeVisible();
  await expect(page.locator('#SITE_FOOTER')).toBeVisible();
});

test('leaving a threat report restores the native footer for other Wix pages', async ({page}) => {
  await mount(page, 'climatebreakdown');
  await expect(page.locator('#SITE_FOOTER')).toBeHidden();
  await page.locator('wix-default-custom-element').evaluate(element => element.remove());
  await expect(page.locator('#SITE_FOOTER')).toBeVisible();
});

test('desktop footer type is 25 percent smaller while phone and spacing are unchanged', async ({page}) => {
  await mount(page, 'climatebreakdown');
  const sizes = () => page.locator('.report-footer').evaluate(element => {
    const style = getComputedStyle(element);
    return [parseFloat(style.fontSize), parseFloat(style.paddingTop), parseFloat(style.paddingBottom)];
  });
  const phone = await sizes();
  expect(phone[0]).toBeCloseTo(7.15 * 1.12, 3);
  expect(phone.slice(1)).toEqual([15.6, 20.8]);
  await page.setViewportSize({width:1280,height:900});
  await page.locator('#report').evaluate(element => {element.style.width='1120px';});
  const desktop = await sizes();
  expect(desktop[0]).toBeCloseTo(9.1 * 1.12 * 0.75, 3);
  expect(desktop.slice(1)).toEqual([23.4, 33.8]);
  await expect(page.locator('.report-footer a')).toHaveCount(27);
});
