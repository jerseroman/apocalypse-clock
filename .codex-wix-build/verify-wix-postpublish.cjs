const { chromium } = require('@playwright/test');

const targetUrl = process.argv[2]
  || `https://www.apocalypseclock.com/?verify=postpublish-${Date.now()}`;

const round = value => Number(Number(value).toFixed(2));

function assert(condition, message, details) {
  if (condition) return;
  const suffix = details === undefined ? '' : `\n${JSON.stringify(details, null, 2)}`;
  throw new Error(`${message}${suffix}`);
}

async function snapshot(page, label) {
  return page.evaluate(label => {
    const host = document.querySelector('wix-default-custom-element');
    const root = host?.shadowRoot;
    const appBody = root?.querySelector('.ac-body');
    const nav = root?.querySelector('.section-nav');
    const footer = root?.querySelector('.footer');
    const syncMethod = host?.syncViewportBleed;
    const syncSource = typeof syncMethod === 'function'
      ? Function.prototype.toString.call(syncMethod).replace(/\s+/g, '')
      : '';
    const scrollCandidateStart = syncSource.indexOf('window.scrollY');
    const scrollCandidateEnd = syncSource.indexOf('overflow-y');
    const scrollCandidateSource = scrollCandidateStart >= 0
      ? syncSource.slice(
        scrollCandidateStart,
        scrollCandidateEnd > scrollCandidateStart ? scrollCandidateEnd : undefined,
      )
      : '';
    const rect = element => {
      if (!element) return null;
      const value = element.getBoundingClientRect();
      return {
        top: value.top,
        bottom: value.bottom,
        left: value.left,
        right: value.right,
        width: value.width,
        height: value.height,
      };
    };
    return {
      label,
      href: location.href,
      state: host?.getAttribute('data-state') || null,
      markerRootScrollSemantics: scrollCandidateSource.includes('window.scrollY')
        && scrollCandidateSource.includes('window.pageYOffset')
        && /scrollingElement.*scrollTop/.test(scrollCandidateSource)
        && /documentElement.*scrollTop/.test(scrollCandidateSource)
        && /body.*scrollTop/.test(scrollCandidateSource)
        && syncSource.includes('Math.max')
        && syncSource.includes('overflow-y')
        && syncSource.includes('visible'),
      viewport: { width: innerWidth, height: innerHeight },
      scroll: {
        windowY: window.scrollY,
        pageYOffset: window.pageYOffset,
        scrollingElementTop: document.scrollingElement?.scrollTop ?? null,
        rootTop: document.documentElement.scrollTop,
        bodyTop: document.body.scrollTop,
      },
      document: {
        rootHeight: document.documentElement.scrollHeight,
        bodyHeight: document.body.scrollHeight,
        rootOverflowY: getComputedStyle(document.documentElement).overflowY,
        bodyOverflowX: getComputedStyle(document.body).overflowX,
        bodyOverflowY: getComputedStyle(document.body).overflowY,
      },
      host: rect(host),
      appBody: {
        rect: rect(appBody),
        marginTop: appBody ? parseFloat(getComputedStyle(appBody).marginTop) : null,
        overflowX: appBody ? getComputedStyle(appBody).overflowX : null,
        overflowY: appBody ? getComputedStyle(appBody).overflowY : null,
        currentSection: appBody?.dataset.navCurrent || null,
      },
      nav: rect(nav),
      footer: rect(footer),
      values: {
        p50: root?.querySelector('#cascadeMedianYear')?.textContent?.trim() || null,
        p90: root?.querySelector('#cascadeHeadlineYear')?.textContent?.trim() || null,
      },
    };
  }, label);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 360, height: 800 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const pageErrors = [];

  page.on('pageerror', error => pageErrors.push(error.message));

  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.waitForFunction(() => {
      const host = document.querySelector('wix-default-custom-element');
      const root = host?.shadowRoot;
      return host?.getAttribute('data-state') === 'ready'
        && root?.querySelector('.ac-body')
        && root?.querySelector('.section-nav')
        && root?.querySelector('.footer');
    }, undefined, { timeout: 120_000 });
    await page.waitForTimeout(1_000);

    const initial = await snapshot(page, 'initial');
    assert(initial.markerRootScrollSemantics,
      'FAIL: public custom element does not inspect every root-scroll candidate after Wix transpilation.', initial);
    assert(initial.values.p50 === '2038',
      'FAIL: published P50 result is not the validated precomputed value 2038.', initial);
    assert(initial.values.p90 === '2046',
      'FAIL: published P90 result is not the validated precomputed value 2046.', initial);
    assert(initial.document.rootHeight > initial.viewport.height,
      'FAIL: document is not vertically scrollable.', initial);
    assert(initial.document.bodyOverflowY === 'visible',
      'FAIL: BODY still owns/clips vertical scrolling; expected overflow-y: visible.', initial);
    assert(initial.appBody.overflowY === 'visible',
      'FAIL: .ac-body is still a vertical scroll container; expected overflow-y: visible.', initial);

    await page.evaluate(() => {
      window.scrollTo(0, 600);
      document.querySelector('wix-default-custom-element')?.syncViewportBleed?.();
    });
    await page.waitForTimeout(250);
    const scrolled = await snapshot(page, 'scrolled-600');
    assert(scrolled.scroll.windowY >= 590
        && scrolled.scroll.scrollingElementTop >= 590
        && scrolled.scroll.rootTop >= 590,
      'FAIL: window/root is not the effective vertical scroller.', scrolled);
    assert(scrolled.scroll.bodyTop === 0,
      'FAIL: BODY scrollTop is non-zero; BODY is still acting as the mobile scroller.', scrolled);
    assert(Math.abs(scrolled.appBody.marginTop - initial.appBody.marginTop) <= 1,
      'FAIL: application margin changed after scrolling.', { initial, scrolled });
    assert(Math.abs(scrolled.document.rootHeight - initial.document.rootHeight) <= 4,
      'FAIL: document height changed after scrolling.', { initial, scrolled });
    assert(Math.abs(scrolled.nav.top) <= 2,
      'FAIL: mobile section navigation is not sticky at viewport top.', scrolled);

    await page.setViewportSize({ width: 360, height: 700 });
    await page.waitForTimeout(350);
    const resized = await snapshot(page, 'viewport-height-700');
    assert(resized.scroll.windowY >= 590
        && resized.scroll.scrollingElementTop >= 590
        && resized.scroll.rootTop >= 590,
      'FAIL: viewport resize reset or displaced the root scroll position.', resized);
    assert(resized.scroll.bodyTop === 0,
      'FAIL: BODY became the scroller after viewport resize.', resized);
    assert(Math.abs(resized.appBody.marginTop - initial.appBody.marginTop) <= 1,
      'FAIL: application margin changed after mobile browser-chrome resize.', { initial, resized });
    assert(Math.abs(resized.document.rootHeight - initial.document.rootHeight) <= 4,
      'FAIL: document height changed after mobile browser-chrome resize.', { initial, resized });
    assert(Math.abs(resized.nav.top) <= 2,
      'FAIL: sticky navigation moved away from the viewport top after resize.', resized);

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(350);
    const bottom = await snapshot(page, 'document-bottom');
    assert(bottom.scroll.windowY + bottom.viewport.height >= bottom.document.rootHeight - 4,
      'FAIL: root document bottom is not reachable.', bottom);
    assert(bottom.footer.top < bottom.viewport.height && bottom.footer.bottom > 0,
      'FAIL: internal application footer is not visible at the reachable document bottom.', bottom);

    await page.evaluate(() => {
      const host = document.querySelector('wix-default-custom-element');
      host?.shadowRoot?.querySelector('[data-nav-target="mission"]')?.click();
    });
    await page.waitForTimeout(250);
    const switched = await snapshot(page, 'section-mission');
    assert(switched.appBody.currentSection === 'mission',
      'FAIL: mission section did not become active.', switched);
    assert(switched.scroll.windowY === 0
        && switched.scroll.pageYOffset === 0
        && switched.scroll.scrollingElementTop === 0
        && switched.scroll.rootTop === 0
        && switched.scroll.bodyTop === 0,
      'FAIL: section switch did not reset every possible outer scroll container.', switched);
    assert(pageErrors.length === 0,
      'FAIL: uncaught page errors occurred during public mobile verification.', pageErrors);

    const report = {
      pass: true,
      url: targetUrl,
      checks: {
        markerRootScrollSemantics: true,
        p50: initial.values.p50,
        p90: initial.values.p90,
        windowOwnsVerticalScroll: true,
        bodyScrollTopZero: true,
        stableMarginAfterScrollResize: true,
        stableDocumentHeightAfterScrollResize: true,
        stickyNav: true,
        footerReachable: true,
        sectionSwitchResetsScroll: true,
      },
      measurements: {
        initial: {
          documentHeight: initial.document.rootHeight,
          marginTop: round(initial.appBody.marginTop),
          bodyOverflowY: initial.document.bodyOverflowY,
          appOverflowY: initial.appBody.overflowY,
        },
        scrolled: {
          windowY: round(scrolled.scroll.windowY),
          bodyTop: round(scrolled.scroll.bodyTop),
          documentHeight: scrolled.document.rootHeight,
          marginTop: round(scrolled.appBody.marginTop),
          navTop: round(scrolled.nav.top),
        },
        resized: {
          windowY: round(resized.scroll.windowY),
          bodyTop: round(resized.scroll.bodyTop),
          documentHeight: resized.document.rootHeight,
          marginTop: round(resized.appBody.marginTop),
          navTop: round(resized.nav.top),
        },
        bottom: {
          windowY: round(bottom.scroll.windowY),
          documentHeight: bottom.document.rootHeight,
          footerTop: round(bottom.footer.top),
          footerBottom: round(bottom.footer.bottom),
        },
        switched: {
          currentSection: switched.appBody.currentSection,
          windowY: round(switched.scroll.windowY),
          rootTop: round(switched.scroll.rootTop),
          bodyTop: round(switched.scroll.bodyTop),
        },
      },
      values: initial.values,
      pageErrors,
    };
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
