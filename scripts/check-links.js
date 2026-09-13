const fs = require('node:fs');

const URL_ATTR_RE = /\b(?:href|src)="(https?:\/\/[^"]+)"/g;
const DATA_FILE = require('../package.json').config.primaryDataset;

function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

function collectUrls() {
  const urls = new Set();
  for (const htmlFile of ['index.html', '404.html']) {
    const html = readText(htmlFile);
    for (const match of html.matchAll(URL_ATTR_RE)) urls.add(match[1]);
  }

  const data = JSON.parse(readText(DATA_FILE));
  for (const source of data._meta.source_registry || []) if (source.url) urls.add(source.url);
  for (const value of Object.values(data)) {
    if (value && typeof value === 'object' && typeof value.url === 'string' && value.url.trim()) {
      urls.add(value.url.trim());
    }
  }
  return [...urls].sort();
}

function validateUrlFormat(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${url}: unsupported protocol ${parsed.protocol}`);
  }
  if (!parsed.hostname.includes('.')) {
    throw new Error(`${url}: hostname does not look public`);
  }
}

async function checkReachable(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    let response = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal });
    if (response.status === 405 || response.status === 403) {
      response = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal });
    }
    if (response.status >= 400) {
      throw new Error(`${url}: HTTP ${response.status}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

(async () => {
  const urls = collectUrls();
  for (const url of urls) validateUrlFormat(url);

  if (process.env.LIVE_LINK_CHECK === '1') {
    const failures = [];
    let next = 0;
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (next < urls.length) {
        const url = urls[next++];
        try { await checkReachable(url); }
        catch (error) { failures.push(`${url}: ${error.message}`); }
      }
    }));
    fs.writeFileSync('research_v1_9_0/live-link-validation.json', JSON.stringify({ checkedAt: new Date().toISOString(), checked: urls.length, failures, status: failures.length ? 'EXTERNAL_FAILURES' : 'PASS' }, null, 2) + '\n');
    if (failures.length) {
      console.error(failures.join('\n'));
      process.exit(1);
    }
  }

  console.log(`Checked ${urls.length} external URL${process.env.LIVE_LINK_CHECK === '1' ? 's for reachability' : ' formats'}.`);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
