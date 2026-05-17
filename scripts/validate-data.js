const fs = require('node:fs');

const DATA_FILE = 'data_v1_7_1metadata_revision.json';
const EXPECTED_THREATS = 23;
const EXPECTED_FIELDS = [
  'scale',
  'urgency',
  'acceleration',
  'interdependence',
  'irreversibility',
  'gov_failure',
  'growth_rate',
  'threshold',
];

function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

function parseJson(file) {
  return JSON.parse(readText(file));
}

function embeddedSourceMap(htmlFile) {
  const html = readText(htmlFile);
  const match = html.match(/<script id="bundledSources" type="application\/json">\s*([\s\S]*?)\s*<\/script>/);
  if (!match) throw new Error(`${htmlFile}: bundledSources JSON block not found`);
  return JSON.parse(match[1]);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function stableJson(value) {
  return JSON.stringify(value);
}

const data = parseJson(DATA_FILE);
const indexData = embeddedSourceMap('index.html');
const fallbackData = embeddedSourceMap('404.html');

assert(stableJson(data) === stableJson(indexData), 'index.html embedded JSON differs from standalone dataset');
assert(stableJson(data) === stableJson(fallbackData), '404.html embedded JSON differs from standalone dataset');

const keys = Object.keys(data).filter(key => key !== '_meta');
const threats = [...new Set(keys.map(key => key.split('.')[0]))].sort();
const fields = [...new Set(keys.map(key => key.split('.').slice(1).join('.')))].sort();

assert(data._meta && data._meta.schema_version === '1.7.1', 'dataset _meta.schema_version must be 1.7.1');
assert(threats.length === EXPECTED_THREATS, `expected ${EXPECTED_THREATS} threats, found ${threats.length}`);
assert(keys.length === EXPECTED_THREATS * EXPECTED_FIELDS.length, `expected ${EXPECTED_THREATS * EXPECTED_FIELDS.length} parameters, found ${keys.length}`);
assert(stableJson(fields) === stableJson([...EXPECTED_FIELDS].sort()), `unexpected metric fields: ${fields.join(', ')}`);

for (const key of keys) {
  assert(/^[a-z0-9_]+\.[a-z_]+$/i.test(key), `${key}: invalid parameter key`);
  const entry = data[key];
  assert(entry && typeof entry === 'object' && !Array.isArray(entry), `${key}: entry must be an object`);
  for (const prop of ['mu', 'lo', 'hi']) assert(Number.isFinite(entry[prop]), `${key}: ${prop} must be finite`);
  assert(entry.lo <= entry.mu && entry.mu <= entry.hi, `${key}: expected lo <= mu <= hi`);
  if (entry.url) {
    const url = new URL(entry.url);
    assert(url.protocol === 'http:' || url.protocol === 'https:', `${key}: URL must be http or https`);
  }
}

for (const htmlFile of ['index.html', '404.html']) {
  const html = readText(htmlFile);
  assert(/<title>Apocalypse Clock \| Global Systemic Risk Monitor<\/title>/.test(html), `${htmlFile}: missing title`);
  assert(/<meta name="description"/.test(html), `${htmlFile}: missing meta description`);
  assert(/<link rel="canonical" href="https:\/\/www\.apocalypseclock\.com\/">/.test(html), `${htmlFile}: missing canonical URL`);
  assert(/<meta property="og:title"/.test(html), `${htmlFile}: missing OpenGraph metadata`);
  assert(/<meta name="twitter:card"/.test(html), `${htmlFile}: missing Twitter metadata`);
  assert(!/decoding="async"\/\s+loading=/.test(html), `${htmlFile}: malformed img decoding/loading attributes`);
}

console.log(`Validated ${keys.length} dataset parameters and embedded HTML copies.`);
