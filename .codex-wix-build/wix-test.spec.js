const { test, expect } = require('@playwright/test');

const url = 'http://127.0.0.1:4179/.codex-wix-build/harness.html';

async function waitForModel(page) {
  const host = page.locator('wix-default-custom-element');
  await expect(host).toHaveAttribute('data-state', 'ready');
  await expect(host.locator('#cascadeMedianYear')).toHaveText('2038', { timeout: 120000 });
  await expect(host.locator('#cascadeHeadlineYear')).toHaveText('2046');
  return host;
}

test('desktop custom element matches the section layout while bleeding to the viewport edges', async ({ page }) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 1280, height: 720 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(url);
  const host = await waitForModel(page);
  await expect(host).toHaveAttribute('data-model-version', '1.5.0');
  await expect(host).toHaveAttribute('data-dataset-version', '1.9.0');
  const layout = await host.evaluate(element => {
    const root = element.shadowRoot;
    const body = root.querySelector('.ac-body').getBoundingClientRect();
    const app = root.querySelector('.page').getBoundingClientRect();
    const nav = root.querySelector('.section-nav').getBoundingClientRect();
    const siteHeader = root.querySelector('.site-header');
    const horizonWindow = root.querySelector('.horizon-window');
    const horizon = horizonWindow.getBoundingClientRect();
    const clock = root.querySelector('#heroAbsoluteClock').getBoundingClientRect();
    const conditional = root.querySelector('#conditionalScenario').getBoundingClientRect();
    const iframe = root.querySelector('#threatNetworkFrame');
    const hostBox = element.getBoundingClientRect();
    const pageHeight = app.height;
    const component = element.parentElement;
    const grid = component.parentElement;
    return {
      viewport: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      hostWidth: hostBox.width,
      bodyLeft: body.left,
      bodyRight: body.right,
      bodyWidth: body.width,
      pageLeft: app.left,
      pageRight: app.right,
      pageWidth: app.width,
      navRight: nav.right,
      navWidth: nav.width,
      siteHeaderDisplay: getComputedStyle(siteHeader).display,
      horizonDisplay: getComputedStyle(horizonWindow).display,
      horizonGridColumns: getComputedStyle(horizonWindow).gridTemplateColumns,
      horizonLeft: horizon.left,
      horizonRight: horizon.right,
      horizonWidth: horizon.width,
      clockLeft: clock.left,
      clockRight: clock.right,
      clockWidth: clock.width,
      conditionalLeft: conditional.left,
      conditionalRight: conditional.right,
      conditionalWidth: conditional.width,
      nav: root.querySelector('.ac-body').dataset.navCurrent,
      iframeSrc: iframe.getAttribute('src'),
      iframeSrcdocLength: iframe.srcdoc.length,
      pageHeight,
      contentHeight: app.bottom - body.top,
      hostHeight: hostBox.height,
      componentHeight: component.getBoundingClientRect().height,
      gridHeight: grid.getBoundingClientRect().height,
      bodyScrollHeight: document.body.scrollHeight,
      legacyDisplay: getComputedStyle(document.getElementById('comp-mobt6et3')).display,
      footerDisplay: getComputedStyle(document.getElementById('SITE_FOOTER')).display,
    };
  });
  expect(layout.hostWidth).toBeLessThan(layout.viewport - 80);
  expect(Math.abs(layout.bodyWidth - 1280)).toBeLessThanOrEqual(1);
  expect(layout.navWidth).toBeCloseTo(256, 0);
  expect(layout.pageLeft).toBeGreaterThanOrEqual(layout.navRight + 7);
  expect(layout.pageLeft).toBeLessThanOrEqual(layout.navRight + 17);
  expect(layout.pageLeft - layout.bodyLeft - layout.navWidth).toBeCloseTo(16, 0);
  expect(layout.viewport - layout.pageRight).toBeLessThanOrEqual(17);
  expect(layout.bodyRight - layout.pageRight).toBeCloseTo(16, 0);
  expect(layout.documentScrollWidth).toBeLessThanOrEqual(layout.viewport);
  expect(layout.siteHeaderDisplay).toBe('none');
  expect(layout.horizonDisplay).toBe('grid');
  expect(Math.abs(layout.horizonLeft - layout.pageLeft)).toBeLessThanOrEqual(1);
  expect(Math.abs(layout.horizonRight - layout.pageRight)).toBeLessThanOrEqual(1);
  expect(Math.abs(layout.clockLeft - layout.horizonLeft)).toBeLessThanOrEqual(1);
  expect(layout.clockWidth).toBeCloseTo(520, 0);
  expect(Math.abs(layout.conditionalLeft - layout.clockRight)).toBeLessThanOrEqual(1);
  expect(Math.abs(layout.conditionalRight - layout.horizonRight)).toBeLessThanOrEqual(1);
  expect(layout.conditionalWidth).toBeGreaterThan(300);
  expect(layout.horizonGridColumns.startsWith('520px ')).toBe(true);
  expect(layout.nav).toBe('horizon');
  expect(layout.iframeSrc).toBeNull();
  expect(layout.iframeSrcdocLength).toBeGreaterThan(20000);
  expect(Math.abs(layout.hostHeight - layout.contentHeight)).toBeLessThanOrEqual(2);
  expect(Math.abs(layout.componentHeight - layout.contentHeight)).toBeLessThanOrEqual(2);
  expect(layout.gridHeight - layout.contentHeight).toBeLessThanOrEqual(12);
  expect(layout.bodyScrollHeight - layout.contentHeight).toBeLessThanOrEqual(12);
  expect(layout.legacyDisplay).toBe('none');
  expect(layout.footerDisplay).toBe('none');
  expect(errors).toEqual([]);

  await host.locator('[data-nav-target="mission"]').click();
  await expect.poll(() => host.evaluate(element => {
    const pageHeight = element.shadowRoot.querySelector('.page').getBoundingClientRect().height;
    return Math.abs(element.getBoundingClientRect().height - pageHeight);
  })).toBeLessThanOrEqual(2);
});

test('mobile custom element uses the complete phone width without horizontal overflow', async ({ page }) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(url);
  const host = await waitForModel(page);
  const layout = await host.evaluate(element => {
    const root = element.shadowRoot;
    const body = root.querySelector('.ac-body').getBoundingClientRect();
    const app = root.querySelector('.page').getBoundingClientRect();
    const siteHeader = root.querySelector('.site-header');
    const horizonWindow = root.querySelector('.horizon-window');
    const horizon = horizonWindow.getBoundingClientRect();
    const clock = root.querySelector('#heroAbsoluteClock').getBoundingClientRect();
    const conditional = root.querySelector('#conditionalScenario').getBoundingClientRect();
    const outerCanvas = document.getElementById('wixGrid').getBoundingClientRect();
    const hostBox = element.getBoundingClientRect();
    const component = element.parentElement;
    const grid = component.parentElement;
    return {
      viewport: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      outerCanvasWidth: outerCanvas.width,
      hostLeft: hostBox.left,
      hostWidth: hostBox.width,
      bodyLeft: body.left,
      bodyRight: body.right,
      bodyWidth: body.width,
      pageLeft: app.left,
      pageRight: app.right,
      pageWidth: app.width,
      shadowScrollWidth: root.querySelector('.ac-body').scrollWidth,
      menuVisible: getComputedStyle(root.querySelector('.section-nav-toggle')).display,
      bodyTextSizeAdjust: getComputedStyle(root.querySelector('.ac-body')).webkitTextSizeAdjust,
      navHeight: root.querySelector('.section-nav').getBoundingClientRect().height,
      titleFontSize: parseFloat(getComputedStyle(root.querySelector('.section-page-title')).fontSize),
      siteHeaderDisplay: getComputedStyle(siteHeader).display,
      horizonDisplay: getComputedStyle(horizonWindow).display,
      horizonGridColumns: getComputedStyle(horizonWindow).gridTemplateColumns,
      horizonWidth: horizon.width,
      clockWidth: clock.width,
      clockBottom: clock.bottom,
      conditionalWidth: conditional.width,
      conditionalTop: conditional.top,
      medianYear: root.querySelector('#cascadeMedianYear').textContent,
      headlineYear: root.querySelector('#cascadeHeadlineYear').textContent,
      outerHtmlOverflowX: getComputedStyle(document.documentElement).overflowX,
      outerBodyOverflowX: getComputedStyle(document.body).overflowX,
      outerHeaderDisplay: getComputedStyle(document.getElementById('SITE_HEADER')).display,
      pageHeight: app.height,
      contentHeight: app.bottom - body.top,
      hostHeight: hostBox.height,
      componentHeight: component.getBoundingClientRect().height,
      gridHeight: grid.getBoundingClientRect().height,
      bodyScrollHeight: document.body.scrollHeight,
      legacyDisplay: getComputedStyle(document.getElementById('comp-mobt6et3')).display,
      footerDisplay: getComputedStyle(document.getElementById('SITE_FOOTER')).display,
    };
  });
  expect(layout.viewport).toBe(390);
  expect(layout.outerCanvasWidth).toBe(980);
  expect(layout.hostLeft).toBeCloseTo(345, 0);
  expect(layout.hostWidth).toBe(290);
  expect(Math.abs(layout.bodyWidth - 390)).toBeLessThanOrEqual(1);
  expect(Math.abs(layout.bodyLeft)).toBeLessThanOrEqual(1);
  expect(layout.bodyRight).toBeLessThanOrEqual(391);
  expect(layout.pageLeft).toBeGreaterThanOrEqual(5);
  expect(layout.pageLeft).toBeLessThanOrEqual(7);
  expect(layout.pageRight).toBeLessThanOrEqual(385);
  expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewport - 11);
  expect(layout.shadowScrollWidth).toBeLessThanOrEqual(390);
  expect(layout.documentScrollWidth).toBeLessThanOrEqual(layout.viewport);
  expect(layout.outerHtmlOverflowX).toBe('hidden');
  expect(layout.outerBodyOverflowX).toBe('clip');
  expect(layout.outerHeaderDisplay).toBe('none');
  expect(layout.menuVisible).not.toBe('none');
  expect(layout.bodyTextSizeAdjust).toBe('100%');
  expect(layout.navHeight).toBeCloseTo(48, 0);
  expect(layout.titleFontSize).toBeLessThanOrEqual(21);
  expect(layout.siteHeaderDisplay).toBe('none');
  expect(layout.horizonDisplay).toBe('grid');
  expect(layout.horizonGridColumns.split(' ').length).toBe(1);
  expect(Math.abs(layout.clockWidth - layout.horizonWidth)).toBeLessThanOrEqual(2);
  expect(Math.abs(layout.conditionalWidth - layout.horizonWidth)).toBeLessThanOrEqual(2);
  expect(layout.conditionalTop).toBeGreaterThanOrEqual(layout.clockBottom - 1);
  expect(layout.medianYear).toBe('2038');
  expect(layout.headlineYear).toBe('2046');
  expect(Math.abs(layout.hostHeight - layout.contentHeight)).toBeLessThanOrEqual(2);
  expect(Math.abs(layout.componentHeight - layout.contentHeight)).toBeLessThanOrEqual(2);
  expect(layout.gridHeight - layout.contentHeight).toBeLessThanOrEqual(12);
  expect(layout.bodyScrollHeight - layout.contentHeight).toBeLessThanOrEqual(12);
  expect(layout.legacyDisplay).toBe('none');
  expect(layout.footerDisplay).toBe('none');
  expect(errors).toEqual([]);

  await host.locator('.section-nav-toggle').click();
  const drawer = await host.locator('.section-nav-drawer').evaluate(element => {
    const rect = element.getBoundingClientRect();
    const first = element.querySelector('.section-nav-link').getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, firstTop: first.top, firstHeight: first.height };
  });
  expect(drawer.top).toBeCloseTo(48, 0);
  expect(drawer.firstTop).toBeGreaterThanOrEqual(drawer.top + 7);
  expect(drawer.firstHeight).toBeLessThanOrEqual(40);
});

test('mobile layout removes a retained Wix header offset and keeps the network compact', async ({ page }) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(url);
  const host = await waitForModel(page);

  await page.evaluate(() => {
    const host = document.querySelector('wix-default-custom-element');
    const grid = document.getElementById('wixGrid');
    grid.style.marginTop = '0px';
    host.syncViewportBleed();
  });
  await expect.poll(() => host.evaluate(element => Math.abs(element.shadowRoot.querySelector('.ac-body').getBoundingClientRect().top))).toBeLessThanOrEqual(1);

  await host.locator('.section-nav-toggle').click();
  await host.locator('[data-nav-target="network"]').click();
  const metrics = await host.evaluate(element => {
    const root = element.shadowRoot;
    const frame = root.querySelector('#threatNetworkFrame');
    const frameDoc = frame.contentDocument;
    const canvas = frameDoc.getElementById('net');
    return {
      appTop: root.querySelector('.ac-body').getBoundingClientRect().top,
      frameWidth: frame.getBoundingClientRect().width,
      canvasWidth: canvas.getBoundingClientRect().width,
      canvasHeight: canvas.getBoundingClientRect().height,
      frameHeight: frame.getBoundingClientRect().height,
      bodyFontSize: parseFloat(getComputedStyle(frameDoc.body).fontSize),
      embeddedClass: frameDoc.documentElement.classList.contains('embed'),
      embeddedTitleDisplay: getComputedStyle(frameDoc.querySelector('.net-title')).display,
    };
  });
  expect(Math.abs(metrics.appTop)).toBeLessThanOrEqual(1);
  expect(metrics.canvasWidth).toBeLessThanOrEqual(metrics.frameWidth);
  expect(metrics.canvasHeight / metrics.canvasWidth).toBeLessThanOrEqual(1.1);
  expect(metrics.frameHeight).toBeLessThan(1500);
  expect(metrics.bodyFontSize).toBeLessThanOrEqual(11);
  expect(metrics.embeddedClass).toBe(true);
  expect(metrics.embeddedTitleDisplay).toBe('none');
});

test('mobile body scrolling remains stable when the browser chrome resizes', async ({ page }) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(url);
  const host = await waitForModel(page);

  const initial = await page.evaluate(() => {
    const host = document.querySelector('wix-default-custom-element');
    host.syncViewportBleed();
    const appBody = host.shadowRoot.querySelector('.ac-body');
    const nav = host.shadowRoot.querySelector('.section-nav');
    return {
      marginTop: parseFloat(getComputedStyle(appBody).marginTop),
      top: appBody.getBoundingClientRect().top,
      navTop: nav.getBoundingClientRect().top,
      appOverflowX: getComputedStyle(appBody).overflowX,
      appOverflowY: getComputedStyle(appBody).overflowY,
      rootScrollHeight: document.documentElement.scrollHeight,
      bodyScrollHeight: document.body.scrollHeight,
      rootOverflowY: getComputedStyle(document.documentElement).overflowY,
      bodyOverflowX: getComputedStyle(document.body).overflowX,
      bodyOverflowY: getComputedStyle(document.body).overflowY,
    };
  });
  expect(initial.rootScrollHeight).toBeGreaterThan(800);
  expect(initial.bodyScrollHeight).toBeGreaterThan(800);
  expect(initial.appOverflowX).toBe('clip');
  expect(initial.appOverflowY).toBe('visible');
  expect(initial.rootOverflowY).toBe('auto');
  expect(initial.bodyOverflowX).toBe('clip');
  expect(initial.bodyOverflowY).toBe('visible');

  const scrolled = await page.evaluate(() => {
    const host = document.querySelector('wix-default-custom-element');
    const appBody = host.shadowRoot.querySelector('.ac-body');
    const nav = host.shadowRoot.querySelector('.section-nav');
    window.scrollTo(0, 600);
    host.syncViewportBleed();
    return {
      windowScrollY: window.scrollY,
      rootScrollTop: document.documentElement.scrollTop,
      bodyScrollTop: document.body.scrollTop,
      marginTop: parseFloat(getComputedStyle(appBody).marginTop),
      top: appBody.getBoundingClientRect().top,
      navTop: nav.getBoundingClientRect().top,
      rootScrollHeight: document.documentElement.scrollHeight,
    };
  });

  expect(scrolled.windowScrollY).toBe(600);
  expect(scrolled.rootScrollTop).toBe(600);
  expect(scrolled.bodyScrollTop).toBe(0);
  expect(Math.abs(scrolled.marginTop - initial.marginTop)).toBeLessThanOrEqual(1);
  expect(Math.abs(scrolled.top - (initial.top - 600))).toBeLessThanOrEqual(1);
  expect(Math.abs(scrolled.navTop)).toBeLessThanOrEqual(1);
  expect(Math.abs(scrolled.rootScrollHeight - initial.rootScrollHeight)).toBeLessThanOrEqual(2);

  // Android changes the visual viewport height when its address bar collapses.
  // That resize must not move the application or manufacture blank space.
  await page.setViewportSize({ width: 360, height: 700 });
  await page.waitForTimeout(100);
  const resized = await page.evaluate(() => {
    const host = document.querySelector('wix-default-custom-element');
    const appBody = host.shadowRoot.querySelector('.ac-body');
    return {
      windowScrollY: window.scrollY,
      bodyScrollTop: document.body.scrollTop,
      marginTop: parseFloat(getComputedStyle(appBody).marginTop),
      top: appBody.getBoundingClientRect().top,
      rootScrollHeight: document.documentElement.scrollHeight,
    };
  });
  expect(resized.windowScrollY).toBe(600);
  expect(resized.bodyScrollTop).toBe(0);
  expect(Math.abs(resized.marginTop - initial.marginTop)).toBeLessThanOrEqual(1);
  expect(Math.abs(resized.top - (initial.top - 600))).toBeLessThanOrEqual(1);
  expect(Math.abs(resized.rootScrollHeight - initial.rootScrollHeight)).toBeLessThanOrEqual(2);

  const bottom = await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
    const host = document.querySelector('wix-default-custom-element');
    const footer = host.shadowRoot.querySelector('.footer').getBoundingClientRect();
    return {
      viewportBottom: window.scrollY + window.innerHeight,
      documentBottom: document.documentElement.scrollHeight,
      footerTop: footer.top,
      footerBottom: footer.bottom,
      viewportHeight: window.innerHeight,
    };
  });
  expect(bottom.viewportBottom).toBeGreaterThanOrEqual(bottom.documentBottom - 2);
  expect(bottom.footerTop).toBeLessThan(bottom.viewportHeight);
  expect(bottom.footerBottom).toBeGreaterThan(0);

  const switched = await page.evaluate(() => {
    const host = document.querySelector('wix-default-custom-element');
    host.shadowRoot.querySelector('[data-nav-target="mission"]').click();
    return {
      windowScrollY: window.scrollY,
      rootScrollTop: document.documentElement.scrollTop,
      bodyScrollTop: document.body.scrollTop,
      current: host.shadowRoot.querySelector('.ac-body').dataset.navCurrent,
    };
  });
  expect(switched.windowScrollY).toBe(0);
  expect(switched.rootScrollTop).toBe(0);
  expect(switched.bodyScrollTop).toBe(0);
  expect(switched.current).toBe('mission');
});

test('internal footer contains the requested disclaimer and plain-text links', async ({ page }) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(url);
  const host = await waitForModel(page);

  await expect(host.locator('.footer-disclaimer p')).toHaveText([
    'Certain large data, summaries, and analytical materials were compiled with the assistance of Claude, Gemini, GPT and other based LLS systems.',
    'Although extensive care has been taken, inaccuracies, omissions, or deviations may occur. The content is provided for informational purposes only, and no liability is accepted for errors or resulting consequences.',
    'Apocalypse Clock © 2026. Text and visual content: CC BY-ND 4.0 unless otherwise stated. Code, data, model logic, brand assets, and third-party materials: all rights reserved.',
  ]);
  await expect(host.locator('.footer')).not.toContainText(
    'Structured heuristic for reasoning under deep uncertainty not a validated empirical forecast.',
  );

  const alignment = await host.locator('.footer').evaluate(footer => {
    const links = footer.querySelector('.footer-links');
    const disclaimer = footer.querySelector('.footer-disclaimer');
    const footerRect = footer.getBoundingClientRect();
    const linksRect = links.getBoundingClientRect();
    const disclaimerRect = disclaimer.getBoundingClientRect();
    const centre = rect => rect.left + rect.width / 2;
    return {
      footerDisplay: getComputedStyle(footer).display,
      footerTextAlign: getComputedStyle(footer).textAlign,
      linksJustify: getComputedStyle(links).justifyContent,
      disclaimerJustify: getComputedStyle(disclaimer).justifyItems,
      linksCentreDelta: Math.abs(centre(linksRect) - centre(footerRect)),
      disclaimerCentreDelta: Math.abs(centre(disclaimerRect) - centre(footerRect)),
    };
  });
  expect(alignment.footerDisplay).toBe('block');
  expect(alignment.footerTextAlign).toBe('center');
  expect(alignment.linksJustify).toBe('center');
  expect(alignment.disclaimerJustify).toBe('center');
  expect(alignment.linksCentreDelta).toBeLessThanOrEqual(1);
  expect(alignment.disclaimerCentreDelta).toBeLessThanOrEqual(1);

  const links = await host.locator('.footer-links a').evaluateAll(anchors => anchors.map(anchor => ({
    text: anchor.textContent.trim(),
    href: anchor.getAttribute('href'),
    className: anchor.className,
    backgroundColor: getComputedStyle(anchor).backgroundColor,
  })));
  expect(links).toEqual([
    {
      text: 'Full Methodology',
      href: 'https://www.apocalypseclock.com/methodology',
      className: '',
      backgroundColor: 'rgba(0, 0, 0, 0)',
    },
    {
      text: 'Scoring Methodology',
      href: 'https://www.apocalypseclock.com/scoringmethodology',
      className: '',
      backgroundColor: 'rgba(0, 0, 0, 0)',
    },
    {
      text: 'Report Problem',
      href: 'mailto:info@apocalypseclock.com?subject=General%20Inquiry%20',
      className: '',
      backgroundColor: 'rgba(0, 0, 0, 0)',
    },
    {
      text: 'Legal & Privacy',
      href: 'https://www.apocalypseclock.com/legal',
      className: '',
      backgroundColor: 'rgba(0, 0, 0, 0)',
    },
  ]);
});

test('all phone sections use compact responsive structures without clipped controls', async ({ page }) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  const host = await waitForModel(page);

  const openSection = async id => {
    await host.evaluate((element, sectionId) => {
      element.shadowRoot.querySelector(`[data-nav-target="${sectionId}"]`).click();
    }, id);
    await expect(host.locator('.ac-body')).toHaveAttribute('data-nav-current', id);
    await page.waitForTimeout(id === 'network' ? 150 : 40);
  };

  const sectionIds = [
    'horizon', 'risk-horizons', 'top-threats', 'network', 'scientific', 'sources',
    'console', 'contribution', 'scenario-overview', 'register', 'mission',
  ];
  for (const id of sectionIds) {
    await openSection(id);
    const width = await host.evaluate(element => {
      const root = element.shadowRoot;
      const body = root.querySelector('.ac-body');
      const app = root.querySelector('.page');
      return {
        bodyScrollWidth: body.scrollWidth,
        appLeft: app.getBoundingClientRect().left,
        appRight: app.getBoundingClientRect().right,
      };
    });
    expect(width.bodyScrollWidth, `${id} shadow width`).toBeLessThanOrEqual(390);
    expect(width.appLeft, `${id} page left`).toBeGreaterThanOrEqual(5);
    expect(width.appRight, `${id} page right`).toBeLessThanOrEqual(385);
  }

  await openSection('risk-horizons');
  const risk = await host.evaluate(element => {
    const root = element.shadowRoot;
    const card = root.querySelector('.advanced-method-card');
    const grid = root.querySelector('.advanced-method-card-grid');
    const formula = root.querySelector('.advanced-method-formula');
    const mini = root.querySelector('.mini-row');
    return {
      cardWidth: card.getBoundingClientRect().width,
      gridWidth: grid.getBoundingClientRect().width,
      gridColumns: getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length,
      formulaWidth: formula.getBoundingClientRect().width,
      miniColumns: getComputedStyle(mini).gridTemplateColumns.trim().split(/\s+/).length,
    };
  });
  expect(risk.gridColumns).toBe(1);
  expect(risk.gridWidth).toBeLessThanOrEqual(risk.cardWidth);
  expect(risk.formulaWidth).toBeLessThanOrEqual(risk.gridWidth);
  expect(risk.miniColumns).toBe(3);

  await openSection('top-threats');
  const threats = await host.evaluate(element => {
    const root = element.shadowRoot;
    const card = root.querySelector('.climate-feature-card.is-collapsed');
    const header = card.querySelector('.t-header');
    return {
      firstCardHeight: card.getBoundingClientRect().height,
      headerColumns: getComputedStyle(header).gridTemplateColumns.trim().split(/\s+/).length,
      titleFontSize: parseFloat(getComputedStyle(card.querySelector('.t-name')).fontSize),
    };
  });
  expect(threats.firstCardHeight).toBeLessThan(220);
  expect(threats.headerColumns).toBe(2);
  expect(threats.titleFontSize).toBeLessThanOrEqual(15);

  await openSection('scientific');
  const diagnostics = await host.evaluate(element => {
    const root = element.shadowRoot;
    const row = root.querySelector('#scientificAdditionalRunPanel > div:first-child');
    const rowStyle = getComputedStyle(row);
    const children = [...row.children].map(child => child.getBoundingClientRect().width);
    const button = root.querySelector('#diagBtn').getBoundingClientRect();
    return {
      direction: rowStyle.flexDirection,
      rowWidth: row.getBoundingClientRect().width,
      contentWidth: row.clientWidth - parseFloat(rowStyle.paddingLeft) - parseFloat(rowStyle.paddingRight),
      children,
      buttonWidth: button.width,
    };
  });
  expect(diagnostics.direction).toBe('column');
  expect(diagnostics.children.every(width => width >= diagnostics.contentWidth - 2)).toBe(true);
  expect(diagnostics.buttonWidth).toBeGreaterThan(300);

  await openSection('sources');
  const sources = await host.evaluate(element => {
    const root = element.shadowRoot;
    const row = root.querySelector('.ai-preset-row');
    const list = root.querySelector('.ai-preset-btns');
    const run = root.querySelector('.ai-run-btn');
    const rowRect = row.getBoundingClientRect();
    const runRect = run.getBoundingClientRect();
    return {
      rowDisplay: getComputedStyle(row).display,
      presetColumns: getComputedStyle(list).gridTemplateColumns.trim().split(/\s+/).length,
      runInside: runRect.left >= rowRect.left - 1 && runRect.right <= rowRect.right + 1,
      runWidth: runRect.width,
    };
  });
  expect(sources.rowDisplay).toBe('grid');
  expect(sources.presetColumns).toBe(2);
  expect(sources.runInside).toBe(true);
  expect(sources.runWidth).toBeGreaterThan(300);

  await openSection('scenario-overview');
  const summaryColumns = await host.locator('.summary-strip').evaluate(element => (
    getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length
  ));
  expect(summaryColumns).toBe(2);

  await openSection('register');
  const register = await host.evaluate(element => {
    const root = element.shadowRoot;
    const wrap = root.querySelector('.tbl-wrap');
    const table = wrap.querySelector('table');
    const mobile = wrap.querySelector('#mobileThreatRegister');
    const first = mobile.querySelector('.mobile-register-card');
    return {
      tableDisplay: getComputedStyle(table).display,
      mobileDisplay: getComputedStyle(mobile).display,
      insideSectionTarget: wrap.contains(mobile),
      firstCardHeight: first.getBoundingClientRect().height,
    };
  });
  expect(register.tableDisplay).toBe('none');
  expect(register.mobileDisplay).not.toBe('none');
  expect(register.insideSectionTarget).toBe(true);
  expect(register.firstCardHeight).toBeLessThan(90);

  await openSection('mission');
  const missionFontSize = await host.locator('.hero-copy').evaluate(element => parseFloat(getComputedStyle(element).fontSize));
  expect(missionFontSize).toBeLessThanOrEqual(10.5);
});

test('phone dependency network idles efficiently and keeps every control reachable', async ({ page }) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  const host = await waitForModel(page);
  await host.evaluate(element => element.shadowRoot.querySelector('[data-nav-target="network"]').click());

  await expect.poll(() => host.evaluate(element => {
    const frame = element.shadowRoot.querySelector('#threatNetworkFrame');
    return Boolean(frame.contentDocument?.querySelector('#net'));
  })).toBe(true);
  await expect.poll(() => host.evaluate(element => {
    const frame = element.shadowRoot.querySelector('#threatNetworkFrame');
    const bodyHeight = frame.contentDocument ? Math.ceil(frame.contentDocument.body.scrollHeight) : 0;
    return Math.abs(frame.getBoundingClientRect().height - bodyHeight);
  })).toBeLessThanOrEqual(4);

  const network = await host.evaluate(element => {
    const frame = element.shadowRoot.querySelector('#threatNetworkFrame');
    const frameDoc = frame.contentDocument;
    const canvas = frameDoc.querySelector('#net');
    const canvasRect = canvas.getBoundingClientRect();
    const typeLegend = frameDoc.querySelector('.type-legend');
    const register = frameDoc.querySelector('.table-view');
    return {
      flow: frameDoc.querySelector('#toggleFlow').checked,
      pixelRatio: canvas.width / canvasRect.width,
      typeLegendFits: typeLegend.scrollWidth <= typeLegend.clientWidth + 1,
      registerOpen: register.open,
      frameHeight: frame.getBoundingClientRect().height,
      innerHeight: Math.ceil(frameDoc.body.scrollHeight),
    };
  });
  expect(network.flow).toBe(false);
  expect(network.pixelRatio).toBeLessThanOrEqual(1.51);
  expect(network.typeLegendFits).toBe(true);
  expect(network.registerOpen).toBe(false);
  expect(network.frameHeight).toBeGreaterThan(900);
  expect(Math.abs(network.frameHeight - network.innerHeight)).toBeLessThanOrEqual(4);
});
