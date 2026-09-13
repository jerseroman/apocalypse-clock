const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

function javascriptString(value) {
  return JSON.stringify(value)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function extractApplicationBody(html) {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!match) throw new Error('index.html does not contain a body element.');
  return match[1].replace(/\s*<script\b[^>]*\bsrc=(?:"[^"]*"|'[^']*')[^>]*>\s*<\/script>/gi, '');
}

function scopeStylesForShadowRoot(css) {
  return css
    .replace(/:root/g, ':host')
    .replace(/(^|[\s,{>])html(?=\s*(?:,|\{))/g, '$1:host')
    .replace(/(^|[\s,{>])body(?=\s*(?:::|,|\{))/g, '$1.ac-body')
    // Viewport units escape the Wix element's layout box. Scope horizontal
    // sizing to the custom-element host so the P50/P90 pair cannot be clipped.
    .replace(/100vw/g, '100%')
    .concat('\n:host{display:block;width:100%;max-width:100%;overflow:visible;background:#14181e;box-shadow:0 0 0 100vmax #14181e;clip-path:inset(0 -100vmax);color-scheme:dark}.ac-body{width:100%;min-height:100%;overflow-x:hidden;isolation:isolate}\n');
}

const html = read('index.html');
const bodyHtml = extractApplicationBody(html);
const css = scopeStylesForShadowRoot(read('src/styles.css'));
const applicationSources = [
  read('src/action-delegation.js'),
  read('src/cascade-model.js'),
  read('src/app.js'),
  read('src/aria-status.js'),
].join('\n\n');

for (const requiredText of [
  'This clock has not been scientifically validated.',
  'Astra ULTRA',
  'id="cascadeMedianYear"',
  'id="cascadeHeadlineYear"',
  'id="cascadeHorizonGap"',
  'Model 1.2.9',
  'Data 1.9.0',
]) {
  if (!bodyHtml.includes(requiredText)) throw new Error(`Missing required Wix custom-element content: ${requiredText}`);
}
if (/<iframe\b/i.test(bodyHtml)) throw new Error('The Velo custom element must not contain an iframe.');

const runtime = `
;(() => {
  'use strict';

  const CLOCK_HTML = ${javascriptString(bodyHtml)};
  const CLOCK_CSS = ${javascriptString(css)};
  const TAG_NAME = 'apocalypse-clock';

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
      const timer = setTimeout(() => resolve(false), 8000);
      script.src = src;
      script.defer = true;
      script.dataset.acDependency = marker;
      script.onload = () => {
        clearTimeout(timer);
        script.dataset.acLoaded = 'true';
        resolve(true);
      };
      script.onerror = () => {
        clearTimeout(timer);
        console.warn(\`Optional Apocalypse Clock dependency failed to load: \${marker}\`);
        resolve(false);
      };
      nativeDocument.head.appendChild(script);
    });
  }

  function createScopedDocument(shadowRoot, host, body) {
    const nativeDocument = window.document;
    const domContentLoadedListeners = new WeakSet();
    // Wix wraps the live document in a security proxy whose createElement
    // property is read-only and non-configurable. Wrapping that proxy directly
    // would violate the JavaScript Proxy invariants when we return bound DOM
    // methods. Use an empty facade target and delegate reads to Wix's document.
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
        if (property === 'removeEventListener') return (type, listener, options) => shadowRoot.removeEventListener(type, listener, options);
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
      if (this._apocalypseClockMounted) return;
      this._apocalypseClockMounted = true;
      this.mountApplication();
    }

    async mountApplication() {
      this.setAttribute('data-model-version', '1.2.9');
      this.setAttribute('data-dataset-version', '1.9.0');
      this.setAttribute('data-integration', 'wix-velo-custom-element');
      this.setAttribute('data-state', 'loading');

      const shadowRoot = this.attachShadow({ mode: 'open' });
      addStylesheet(shadowRoot, 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Outfit:wght@800&family=Prompt:wght@900&family=Raleway:wght@900&display=swap');
      addStylesheet(shadowRoot, 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css');

      const style = window.document.createElement('style');
      style.textContent = CLOCK_CSS;
      shadowRoot.appendChild(style);

      const body = window.document.createElement('div');
      body.className = 'ac-body';
      body.innerHTML = CLOCK_HTML;
      shadowRoot.appendChild(body);

      const katexLoaded = await loadOptionalScript('https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js', 'katex');
      if (katexLoaded) {
        await loadOptionalScript('https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js', 'katex-auto-render');
      }

      try {
        installClockApplication(createScopedDocument(shadowRoot, this, body), window);
        this.setAttribute('data-state', 'ready');
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
  '/*! Apocalypse Clock 1.2.9 / Data 1.9.0 — generated Wix Velo Custom Element. See LICENSE. */',
  read('vendor/echarts.bundle.js'),
  read('vendor/cytoscape.bundle.js'),
  runtime,
].join('\n\n');

const outputDir = path.join(root, 'wix');
fs.mkdirSync(outputDir, { recursive: true });
const outputPath = path.join(outputDir, 'apocalypse-clock-element.js');
fs.writeFileSync(outputPath, output, 'utf8');

if (!output.includes("customElements.define(TAG_NAME, ApocalypseClockElement)")) throw new Error('Custom-element registration is missing.');
if (/<iframe\b/i.test(output)) throw new Error('Generated Velo custom element contains an iframe.');

console.log(`Built ${path.relative(root, outputPath)} (${Buffer.byteLength(output)} bytes).`);
