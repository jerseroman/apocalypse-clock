const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const outDir = __dirname;
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

function javascriptString(value) {
  return JSON.stringify(value)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function extractApplicationBody(html) {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!match) throw new Error('index.html does not contain a body element.');
  return match[1]
    .replace(/\s*<script\b[^>]*\bsrc=(?:"[^"]*"|'[^']*')[^>]*>\s*<\/script>/gi, '')
    .replace(/src="\.\/assets\//g, 'src="https://jerseroman.github.io/apocalypse-clock/assets/')
    .replace(/src="\.\/src\/threat-network\.html\?embed=1"/g,
      'data-network-inline="true"');
}

function scopeStylesForShadowRoot(css) {
  return css
    .replace(/:root/g, ':host')
    .replace(/(^|[\s,{>])html(?=\s*(?:,|\{))/g, '$1:host')
    // The application assigns state classes/attributes to document.body.  In
    // the custom element that body is a div, so compound type selectors such
    // as body.has-section-nav, body[data-nav-current], body.is-model-loading,
    // and body:not(...) must be scoped as well as bare body/ body::before.
    .replace(/(^|[,\s>+~({])body(?=$|[\s,>+~){.#:\[])/g, '$1.ac-body')
    .concat(`
:host{
  display:block;width:100%;max-width:none;overflow:visible;background:#14181e;
  box-shadow:none;clip-path:none;color-scheme:dark;-webkit-text-size-adjust:100%;text-size-adjust:100%;
}
.ac-body{
  width:100vw!important;max-width:none!important;margin-left:calc((100% - 100vw)/2);min-height:100%;overflow-x:clip;overflow-y:visible;
  isolation:isolate;-webkit-text-size-adjust:100%;text-size-adjust:100%;
}
@media(max-width:760px){
  .section-nav-drawer{top:calc(56px + env(safe-area-inset-top,0px));}
}
`);
}

const html = read('index.html');
const bodyHtml = extractApplicationBody(html);
const css = scopeStylesForShadowRoot(read('src/styles.css'));
const runtimeSourceHashSHA256 = crypto.createHash('sha256')
  .update(read('src/app.js'))
  .update('\0')
  .update(read('src/cascade-model.js'))
  .digest('hex');
const applicationSources = [
  read('src/action-delegation.js'),
  read('src/section-nav.js'),
  read('src/page-search.js'),
  read('src/diagnostics-view.js'),
  // Wix provides its own CommonJS `module`, so the UMD cascade source exports
  // into that module instead of installing window.FunctionalCascade. Capture
  // the export in an isolated module object and expose a local binding to the
  // dashboard code without mutating Wix's bundle-level module.exports.
  'const __cascadeModule = { exports: {} };',
  '((module, globalThis) => {',
  read('src/cascade-model.js'),
  '})(__cascadeModule, window);',
  'const FunctionalCascade = __cascadeModule.exports;',
  'if (!FunctionalCascade || typeof FunctionalCascade.simulate !== "function" || typeof FunctionalCascade.firstCrossingFromActivationYears !== "function") throw new Error("Functional cascade API failed to initialize.");',
  // Wix bundles these classic-script sources into a private module closure.
  // Explicit lexical bridges replace implicit browser-global identifier
  // bindings while retaining runtime guards for optional dependencies.
  'const renderMathInElement = (...args) => typeof window.renderMathInElement === "function" ? window.renderMathInElement(...args) : undefined;',
  'const Highlight = window.Highlight;',
  'const _rerunAdvanced = (...args) => typeof window._rerunAdvanced === "function" ? window._rerunAdvanced(...args) : undefined;',
  `const WIX_RUNTIME_SOURCE_HASH_SHA256 = ${javascriptString(runtimeSourceHashSHA256)};`,
  read('src/baseline-snapshot.js'),
  read('src/app.js'),
  read('src/aria-status.js'),
].join('\n\n');

for (const requiredText of [
  'This clock has not been scientifically validated.',
  'Astra ULTRA',
  'id="cascadeMedianYear"',
  'id="cascadeHeadlineYear"',
  'Model 1.5.0',
  'Data 1.9.0',
  'id="threatNetworkFrame"',
  'Certain large data, summaries, and analytical materials were compiled with the assistance of Claude, Gemini, GPT and other based LLS systems.',
  'https://www.apocalypseclock.com/methodology',
  'https://www.apocalypseclock.com/scoringmethodology',
  'mailto:info@apocalypseclock.com?subject=General%20Inquiry%20',
  'https://www.apocalypseclock.com/legal',
]) {
  if (!bodyHtml.includes(requiredText)) {
    throw new Error(`Missing required Wix custom-element content: ${requiredText}`);
  }
}
if (!bodyHtml.includes('data-network-inline="true"')) {
  throw new Error('The network iframe was not prepared for the self-contained Wix source.');
}
if (/src="\.\//.test(bodyHtml)) {
  throw new Error('A relative src URL remains in the Wix custom-element body.');
}

const runtime = `
;(() => {
  'use strict';

  // Wix's mobile-only HTML document owns its own scroll container. The old
  // 13,250px canvas must not become a second outer scroller or add blank space.
  // This stylesheet is inert in standalone embeds and on desktop.
  const mobileEmbedShellStyle = window.document.createElement('style');
  mobileEmbedShellStyle.textContent = '@media(max-width:760px){html:has(#comp-molz8s2u),html:has(#comp-molz8s2u) body{overflow:hidden!important;}html:has(#comp-molz8s2u) #SITE_HEADER,html:has(#comp-molz8s2u) #SITE_HEADER-placeholder,html:has(#comp-molz8s2u) #SITE_FOOTER,html:has(#comp-molz8s2u) #SITE_FOOTER_WRAPPER,html:has(#comp-molz8s2u) #comp-mtzl62z3{display:none!important;}#comp-molz8s2u{position:fixed!important;inset:0!important;left:0!important;top:0!important;width:100vw!important;max-width:none!important;height:100vh!important;height:100dvh!important;margin:0!important;transform:none!important;z-index:1000!important;}}';
  window.document.head.appendChild(mobileEmbedShellStyle);

  const CLOCK_HTML = ${javascriptString(bodyHtml)};
  const CLOCK_CSS = ${javascriptString(css)};
  const NETWORK_HTML = ${javascriptString(read('src/threat-network.html').replace(
    '<html lang="en">',
    '<html lang="en" class="embed">',
  ))};
  // Wix renders the configured legacy component with this host tag on the
  // published site.  The class must be registered for that exact tag or the
  // host remains an empty, black placeholder.
  const TAG_NAME = 'wix-default-custom-element';

  function addStylesheet(root, href) {
    const link = window.document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    root.appendChild(link);
  }

  function loadOptionalScript(src, marker) {
    const nativeDocument = window.document;
    return new Promise(resolve => {
      const existing = nativeDocument.querySelector(\`script[data-ac-dependency="\${marker}"]\`);
      if (existing) {
        if (existing.dataset.acLoaded === 'true') return resolve(true);
        existing.addEventListener('load', () => resolve(true), { once: true });
        existing.addEventListener('error', () => resolve(false), { once: true });
        return;
      }
      const script = nativeDocument.createElement('script');
      script.src = src;
      script.defer = true;
      script.dataset.acDependency = marker;
      script.onload = () => {
        script.dataset.acLoaded = 'true';
        resolve(true);
      };
      script.onerror = () => {
        console.warn(\`Optional Apocalypse Clock dependency failed to load: \${marker}\`);
        resolve(false);
      };
      nativeDocument.head.appendChild(script);
    });
  }

  function outerScrollTop() {
    const nativeDocument = window.document;
    // Wix makes BODY the vertical scrolling container on its mobile renderer,
    // while window.scrollY and document.scrollingElement.scrollTop can both
    // remain zero. Read every standards/legacy source and keep the largest
    // finite value so a browser-chrome resize cannot be mistaken for layout.
    return Math.max(0, ...[
      window.scrollY,
      window.pageYOffset,
      nativeDocument.scrollingElement && nativeDocument.scrollingElement.scrollTop,
      nativeDocument.documentElement && nativeDocument.documentElement.scrollTop,
      nativeDocument.body && nativeDocument.body.scrollTop,
    ].map(value => Number.isFinite(Number(value)) ? Number(value) : 0));
  }

  function createScopedDocument(shadowRoot, host, body) {
    const nativeDocument = window.document;
    const domContentLoadedListeners = new WeakSet();
    return new Proxy(Object.create(null), {
      get(_target, property) {
        if (property === 'getElementById') return id => shadowRoot.getElementById(id);
        if (property === 'querySelector') return selector => {
          const local = shadowRoot.querySelector(selector);
          return local || (String(selector).startsWith('script[') ? nativeDocument.querySelector(selector) : null);
        };
        if (property === 'querySelectorAll') return selector => shadowRoot.querySelectorAll(selector);
        if (property === 'addEventListener') return (type, listener, options) => {
          if (type === 'DOMContentLoaded') {
            if (typeof listener === 'function' && !domContentLoadedListeners.has(listener)) {
              domContentLoadedListeners.add(listener);
              queueMicrotask(() => listener.call(nativeDocument, new Event('DOMContentLoaded')));
            }
            return;
          }
          shadowRoot.addEventListener(type, listener, options);
        };
        if (property === 'removeEventListener') {
          return (type, listener, options) => shadowRoot.removeEventListener(type, listener, options);
        }
        if (property === 'body') return body;
        if (property === 'documentElement') return host;
        if (property === 'head') return nativeDocument.head;
        if (property === 'readyState') return 'complete';
        const value = Reflect.get(nativeDocument, property, nativeDocument);
        return typeof value === 'function' ? value.bind(nativeDocument) : value;
      },
    });
  }

  function installClockApplication(document, window) {
${applicationSources}
  }

  class ApocalypseClockElement extends HTMLElement {
    connectedCallback() {
      if (window.matchMedia('(max-width:760px)').matches && window.document.getElementById('comp-molz8s2u')) return;
      if (this._apocalypseClockMounted) {
        this.installViewportBleed();
        this.installOuterShellSync();
        return;
      }
      this._apocalypseClockMounted = true;
      this.mountApplication();
    }

    disconnectedCallback() {
      this.removeViewportBleed();
      this.removeOuterShellSync();
    }

    setManagedOuterStyle(element, property, value) {
      if (!element) return;
      if (!this._outerShellStyleSnapshot) this._outerShellStyleSnapshot = new Map();
      let properties = this._outerShellStyleSnapshot.get(element);
      if (!properties) {
        properties = new Map();
        this._outerShellStyleSnapshot.set(element, properties);
      }
      if (!properties.has(property)) {
        properties.set(property, {
          value: element.style.getPropertyValue(property),
          priority: element.style.getPropertyPriority(property),
        });
      }
      element.style.setProperty(property, value, 'important');
    }

    syncOuterShellHeight() {
      if (window.matchMedia('(max-width:760px)').matches && window.document.getElementById('comp-molz8s2u')) return;
      const root = this.shadowRoot;
      const body = root && root.querySelector('.ac-body');
      const page = root && root.querySelector('.page');
      const component = this.parentElement;
      const grid = component && component.parentElement;
      if (!body || !page || !component || !grid) return;

      // The Wix project still carries its former fixed 11,168px custom-element
      // height and a 21,190px page-grid minimum. Remove those floors and size
      // the shell to the bottom of the currently selected dashboard section.
      body.style.setProperty('min-height', '0', 'important');
      body.style.setProperty('height', 'auto', 'important');
      const bodyTop = body.getBoundingClientRect().top;
      const pageBottom = page.getBoundingClientRect().bottom;
      const contentHeight = Math.max(1, Math.ceil(pageBottom - bodyTop));
      const topBleed = Number.isFinite(this._verticalBleedOffset) ? this._verticalBleedOffset : 0;
      const height = Math.max(1, contentHeight - topBleed) + 'px';

      this.setManagedOuterStyle(this, 'height', height);
      this.setManagedOuterStyle(this, 'min-height', height);
      this.setManagedOuterStyle(component, '--custom-element-height', height);
      this.setManagedOuterStyle(component, 'height', height);
      this.setManagedOuterStyle(component, 'min-height', '0px');
      this.setManagedOuterStyle(grid, 'min-height', height);

      // This legacy Wix rich-text block duplicates the application copy and is
      // the remaining ~1,700px floor after the custom element is shortened.
      const legacyCopy = window.document.getElementById('comp-mobt6et3');
      if (legacyCopy && grid.contains(legacyCopy)) {
        this.setManagedOuterStyle(legacyCopy, 'display', 'none');
      }

      // The application now owns its compact legal/footer area; the Wix master
      // footer must not add another footer below the embedded application.
      this.setManagedOuterStyle(window.document.getElementById('SITE_FOOTER'), 'display', 'none');
      this.setManagedOuterStyle(window.document.getElementById('SITE_FOOTER_WRAPPER'), 'display', 'none');
    }

    scheduleOuterShellSync() {
      if (this._outerShellFrame != null) window.cancelAnimationFrame(this._outerShellFrame);
      this._outerShellFrame = window.requestAnimationFrame(() => {
        this._outerShellFrame = null;
        this.syncOuterShellHeight();
      });
    }

    installOuterShellSync() {
      const page = this.shadowRoot && this.shadowRoot.querySelector('.page');
      if (!page) return;
      if (!this._outerShellResizeObserver && window.ResizeObserver) {
        this._outerShellResizeObserver = new window.ResizeObserver(() => this.scheduleOuterShellSync());
        this._outerShellResizeObserver.observe(page);
      }
      if (!this._outerShellMutationObserver && window.MutationObserver && window.document.body) {
        this._outerShellMutationObserver = new window.MutationObserver(() => this.scheduleOuterShellSync());
        this._outerShellMutationObserver.observe(window.document.body, { childList: true, subtree: true });
      }
      this.syncOuterShellHeight();
    }

    removeOuterShellSync() {
      if (this._outerShellResizeObserver) this._outerShellResizeObserver.disconnect();
      if (this._outerShellMutationObserver) this._outerShellMutationObserver.disconnect();
      this._outerShellResizeObserver = null;
      this._outerShellMutationObserver = null;
      if (this._outerShellFrame != null) window.cancelAnimationFrame(this._outerShellFrame);
      this._outerShellFrame = null;
      if (this._outerShellStyleSnapshot) {
        this._outerShellStyleSnapshot.forEach((properties, element) => {
          properties.forEach(({ value, priority }, property) => {
            if (value) element.style.setProperty(property, value, priority);
            else element.style.removeProperty(property);
          });
        });
        this._outerShellStyleSnapshot = null;
      }
    }

    captureOuterOverflow() {
      if (this._outerOverflowSnapshot) return;
      const nativeDocument = window.document;
      this._outerOverflowSnapshot = [nativeDocument.documentElement, nativeDocument.body]
        .filter(Boolean)
        .map(element => ({
          element,
          properties: ['overflow-x', 'overflow-y'].map(property => ({
            property,
            value: element.style.getPropertyValue(property),
            priority: element.style.getPropertyPriority(property),
          })),
        }));
    }

    setManagedViewportChromeStyle(element, property, value) {
      if (!element) return;
      if (!this._viewportChromeStyleSnapshot) this._viewportChromeStyleSnapshot = new Map();
      let properties = this._viewportChromeStyleSnapshot.get(element);
      if (!properties) {
        properties = new Map();
        this._viewportChromeStyleSnapshot.set(element, properties);
      }
      if (!properties.has(property)) {
        properties.set(property, {
          value: element.style.getPropertyValue(property),
          priority: element.style.getPropertyPriority(property),
        });
      }
      element.style.setProperty(property, value, 'important');
    }

    restoreManagedViewportChrome() {
      if (!this._viewportChromeStyleSnapshot) return;
      this._viewportChromeStyleSnapshot.forEach((properties, element) => {
        properties.forEach(({ value, priority }, property) => {
          if (value) element.style.setProperty(property, value, priority);
          else element.style.removeProperty(property);
        });
      });
      this._viewportChromeStyleSnapshot = null;
    }

    syncViewportBleed() {
      const body = this.shadowRoot && this.shadowRoot.querySelector('.ac-body');
      const documentElement = window.document.documentElement;
      if (!body || !documentElement) return;
      if (window.matchMedia('(max-width:760px)').matches && window.document.getElementById('comp-molz8s2u')) {
        documentElement.style.setProperty('overflow', 'hidden', 'important');
        window.document.body.style.setProperty('overflow', 'hidden', 'important');
        return;
      }
      const viewportWidth = documentElement.clientWidth;
      const hostLeft = this.getBoundingClientRect().left;
      if (!(viewportWidth > 0) || !Number.isFinite(hostLeft)) return;

      // Wix can retain an empty mobile master-header above the full-screen custom
      // element. Even after the visual bleed removes its black strip, that header
      // remains on top and intercepts taps on the application's menu button. Hide
      // both the header and its placeholder only at the phone breakpoint.
      if (viewportWidth <= 760) {
        ['SITE_HEADER', 'SITE_HEADER-placeholder'].forEach(id => {
          const element = window.document.getElementById(id);
          this.setManagedViewportChromeStyle(element, 'display', 'none');
          this.setManagedViewportChromeStyle(element, 'pointer-events', 'none');
          this.setManagedViewportChromeStyle(element, 'height', '0px');
          this.setManagedViewportChromeStyle(element, 'min-height', '0px');
        });
      } else {
        this.restoreManagedViewportChrome();
      }

      // Wix may place the host hundreds of pixels into a fixed desktop canvas
      // even on a phone. Size to the real viewport and cancel that measured
      // host offset instead of centring relative to the host's own width.
      body.style.setProperty('width', viewportWidth + 'px', 'important');
      body.style.setProperty('max-width', 'none', 'important');
      body.style.setProperty('margin-left', (-hostLeft) + 'px', 'important');

      // Some Wix mobile layouts retain an empty master-header row above the custom element.
      // Bleed the application upward by the host's document offset so its own compact header
      // starts at the actual viewport edge. The matching height correction avoids adding the
      // recovered space back as blank scroll area at the bottom.
      const measuredHostTop = Math.round(this.getBoundingClientRect().top + outerScrollTop());
      // A small negative host top is legitimate in the retained Wix grid (the
      // old canvas starts 54px above zero), so it needs equal compensation.
      // Bound that compensation to one plausible header/safe-area band: even
      // if a future browser hides its real scroller, it cannot create the
      // hundreds-of-pixels blank region that caused the reported failure.
      const hostDocumentTop = Math.max(-96, Number.isFinite(measuredHostTop) ? measuredHostTop : 0);
      this._verticalBleedOffset = Math.max(0, hostDocumentTop);
      body.style.setProperty('margin-top', (-hostDocumentTop) + 'px', 'important');

      this.captureOuterOverflow();
      documentElement.style.setProperty('overflow-x', 'hidden', 'important');
      if (window.document.body) {
        // overflow-x:hidden coerces BODY's otherwise-visible Y overflow to
        // auto. Wix gives BODY a viewport-height box, so that coercion turns
        // it into a second, independent mobile scroller. Keep clipping without
        // the coercion and let the root HTML element own vertical scrolling.
        window.document.body.style.setProperty('overflow-x', 'clip', 'important');
        window.document.body.style.setProperty('overflow-y', 'visible', 'important');
      }
      this.scheduleOuterShellSync();
    }

    installViewportBleed() {
      if (!this.shadowRoot || !this.shadowRoot.querySelector('.ac-body')) return;
      if (!this._viewportBleedHandler) {
        this._viewportBleedHandler = () => {
          if (this._viewportBleedFrame != null) window.cancelAnimationFrame(this._viewportBleedFrame);
          this._viewportBleedFrame = window.requestAnimationFrame(() => {
            this._viewportBleedFrame = null;
            this.syncViewportBleed();
          });
        };
        window.addEventListener('resize', this._viewportBleedHandler, { passive: true });
        if (window.visualViewport) {
          window.visualViewport.addEventListener('resize', this._viewportBleedHandler, { passive: true });
        }
      }
      this.syncViewportBleed();
    }

    removeViewportBleed() {
      if (this._viewportBleedHandler) {
        window.removeEventListener('resize', this._viewportBleedHandler);
        if (window.visualViewport) {
          window.visualViewport.removeEventListener('resize', this._viewportBleedHandler);
        }
        this._viewportBleedHandler = null;
      }
      if (this._viewportBleedFrame != null) {
        window.cancelAnimationFrame(this._viewportBleedFrame);
        this._viewportBleedFrame = null;
      }
      if (this._outerOverflowSnapshot) {
        this._outerOverflowSnapshot.forEach(({ element, properties }) => {
          properties.forEach(({ property, value, priority }) => {
            if (value) element.style.setProperty(property, value, priority);
            else element.style.removeProperty(property);
          });
        });
        this._outerOverflowSnapshot = null;
      }
      this.restoreManagedViewportChrome();
    }

    async mountApplication() {
      this.setAttribute('data-model-version', '1.5.0');
      this.setAttribute('data-dataset-version', '1.9.0');
      this.setAttribute('data-integration', 'wix-velo-custom-element');
      this.setAttribute('data-state', 'loading');

      const shadowRoot = this.attachShadow({ mode: 'open' });
      addStylesheet(shadowRoot, 'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700;800;900&family=Outfit:wght@800&family=Prompt:wght@900&family=Raleway:wght@900&display=swap');
      addStylesheet(shadowRoot, 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css');

      const style = window.document.createElement('style');
      style.textContent = CLOCK_CSS;
      shadowRoot.appendChild(style);

      const body = window.document.createElement('div');
      body.className = 'ac-body';
      body.innerHTML = CLOCK_HTML;
      shadowRoot.appendChild(body);
      this.installViewportBleed();
      this.installOuterShellSync();

      const networkFrame = shadowRoot.getElementById('threatNetworkFrame');
      if (networkFrame) networkFrame.srcdoc = NETWORK_HTML;

      try {
        installClockApplication(createScopedDocument(shadowRoot, this, body), window);
        this.setAttribute('data-state', 'ready');
        this.scheduleOuterShellSync();

        // Optional presentation libraries must never block the verified
        // baseline or the mobile UI. Each one refreshes its own surfaces when
        // it eventually becomes available.
        void loadOptionalScript('https://cdn.jsdelivr.net/npm/echarts@6.0.0/dist/echarts.min.js', 'echarts')
          .then(loaded => {
            if (loaded) window.dispatchEvent(new CustomEvent('apocalypse-clock:optional-library-ready', {
              detail: { dependency: 'echarts' },
            }));
          });
        void loadOptionalScript('https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js', 'katex')
          .then(async loaded => {
            if (!loaded) return;
            const autoRenderLoaded = await loadOptionalScript('https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js', 'katex-auto-render');
            if (autoRenderLoaded) window.dispatchEvent(new CustomEvent('apocalypse-clock:optional-library-ready', {
              detail: { dependency: 'katex' },
            }));
          });
      } catch (error) {
        this.setAttribute('data-state', 'error');
        const message = window.document.createElement('p');
        message.setAttribute('role', 'alert');
        message.textContent = 'Apocalypse Clock could not initialize. Please reload the page or report the technical error.';
        message.style.cssText = 'margin:16px;padding:16px;border:1px solid #c94040;background:#14181e;color:#e2e8f4;font:14px sans-serif';
        shadowRoot.prepend(message);
        console.error('Apocalypse Clock Velo custom element initialization failed.', error);
      }
    }
  }

  if (!customElements.get(TAG_NAME)) customElements.define(TAG_NAME, ApocalypseClockElement);
})();
`;

const output = [
  '/*! Apocalypse Clock 1.5.0 / Data 1.9.0 - Wix-hosted Velo Custom Element. See LICENSE. */',
  runtime,
].join('\n\n');

const outputPath = path.join(outDir, 'apocalypse-clock.js');
fs.writeFileSync(outputPath, output, 'utf8');

const harness = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{height:100%;margin:0;background:#14181e}html{overflow-y:auto}body{overflow-y:scroll}#masterPage{display:grid;grid-template-rows:54px auto auto;min-height:100vh}#SITE_HEADER{height:54px}#PAGES_CONTAINER,#SITE_PAGES,#pageSection{position:relative;width:100%}#wixGrid{display:grid;width:100%;min-height:21190px;margin-top:-54px;grid-template-rows:1fr;grid-template-columns:100%}#comp-mobt6et3{height:1711px;margin:106px 0 10px 12%;grid-area:1/1/2/2}#wixHostFrame{width:calc(100% - 100px);height:auto;--custom-element-height:11168px;margin:0 auto 10px;display:flex;grid-area:1/1/2/2}.DURcgf>:first-child{width:100%;min-height:var(--custom-element-height)}#SITE_FOOTER{height:157px;background:#1b202a}@media(max-width:700px){#wixGrid{width:980px}#wixHostFrame{width:290px;margin-left:345px;margin-right:0}}</style></head><body><div id="site-root"><div id="masterPage"><header id="SITE_HEADER"></header><main id="PAGES_CONTAINER"><div id="SITE_PAGES"><section id="pageSection"><div data-mesh-id="pageSectioninlineContent"><div id="wixGrid" data-mesh-id="pageSectioninlineContent-gridContainer"><div id="comp-mobt6et3" data-testid="richTextElement">Legacy Wix copy</div><div id="wixHostFrame" class="DURcgf"><wix-default-custom-element></wix-default-custom-element></div></div></div></section></div></main><footer id="SITE_FOOTER">Legacy Wix footer</footer></div></div><script src="./apocalypse-clock.js"></script></body></html>`;
fs.writeFileSync(path.join(outDir, 'harness.html'), harness, 'utf8');
const transferPayload = JSON.stringify(output).replace(/<\/script/gi, '<\\/script');
fs.writeFileSync(
  path.join(outDir, 'source-transfer.html'),
  `<!doctype html><meta charset="utf-8"><script type="application/json" id="source-data">${transferPayload}</script><textarea id="source" aria-label="Wix source"></textarea><button id="copy" type="button">Copy Wix source</button><p id="status">ready</p><script>const source=document.getElementById('source');source.value=JSON.parse(document.getElementById('source-data').textContent);document.getElementById('copy').addEventListener('click',()=>{source.focus();source.select();const copied=document.execCommand('copy');document.getElementById('status').textContent=copied?'copied '+source.value.length:'copy failed';});<\/script>`,
  'utf8',
);

const pageCode = `// Apocalypse Clock 1.5.0 - Wix Velo page bridge\n$w.onReady(function () {\n  const headerCtaButton = $w("#headerCtaButton");\n  if (headerCtaButton && typeof headerCtaButton.hide === "function") {\n    headerCtaButton.hide();\n  }\n  const clock = $w("#apocalypseClock");\n  clock.setAttribute("integration", "wix-velo");\n  clock.setAttribute("model-version", "1.5.0");\n  clock.setAttribute("dataset-version", "1.9.0");\n});\n`;
fs.writeFileSync(path.join(outDir, 'home-page-code.js'), pageCode, 'utf8');

if (!output.includes('customElements.define(TAG_NAME, ApocalypseClockElement)')) {
  throw new Error('Custom-element registration is missing.');
}
if (!output.includes('width:100vw!important;max-width:none!important;margin-left:calc((100% - 100vw)/2)')) {
  throw new Error('Full-viewport bleed CSS is missing.');
}
if (!output.includes('.ac-body.has-section-nav{padding-left:256px}')) {
  throw new Error('Stateful body selectors were not scoped to the custom-element body.');
}
if (!output.includes("body.style.setProperty('margin-left', (-hostLeft) + 'px', 'important')")) {
  throw new Error('Measured viewport alignment is missing from the custom element.');
}
if (!output.includes("getElementById('SITE_FOOTER'), 'display', 'none'") ||
    !output.includes("getElementById('comp-mobt6et3')")) {
  throw new Error('Legacy Wix footer suppression is missing from the custom element.');
}
if (!output.includes("component, '--custom-element-height', height") ||
    !output.includes("grid, 'min-height', height")) {
  throw new Error('Outer Wix height synchronization is missing from the custom element.');
}
console.log(`Built ${path.relative(root, outputPath)} (${Buffer.byteLength(output)} bytes).`);
