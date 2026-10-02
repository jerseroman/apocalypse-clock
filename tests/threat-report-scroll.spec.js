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
      footerTop: document.querySelector('#SITE_FOOTER').getBoundingClientRect().top + scrollY,
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
    await page.locator('#SITE_FOOTER').scrollIntoViewIfNeeded();
    await expect(page.locator('#SITE_FOOTER'), slug).toBeInViewport();
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
    await page.locator('#SITE_FOOTER').scrollIntoViewIfNeeded();
    await expect(page.locator('#SITE_FOOTER')).toBeInViewport();
  }
});
