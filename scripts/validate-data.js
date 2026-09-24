const fs = require('node:fs');

const { config } = require('../package.json');
const DATA_FILE = config.primaryDataset;
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
  assert(match[1] === readText(DATA_FILE).trim(), `${htmlFile}: embedded payload bytes differ from standalone dataset (excluding enclosing whitespace)`);
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

assert(data._meta && data._meta.schema_version === config.datasetVersion, 'dataset schema version must match package config');
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

const catalog = data._meta.functional_model.nodes;
assert(stableJson(Object.keys(catalog).sort()) === stableJson(threats), 'functional catalog must contain exactly the dataset threats');
const services = new Set(Object.keys(data._meta.functional_model.services));
const registeredUrls = new Set(data._meta.source_registry.map(source => source.url));
for (const id of threats) {
  const threshold = data[`${id}.threshold`], growth = data[`${id}.growth_rate`];
  assert([1, 2, 3].includes(threshold.functional_weight), `${id}: invalid fixed criticality tier`);
  assert(Array.isArray(threshold.critical_services) && threshold.critical_services.every(service => services.has(service)), `${id}: unknown service`);
  assert(typeof threshold.functional_failure === 'string' && threshold.functional_failure.length > 20, `${id}: missing functional definition`);
  assert(typeof threshold.functional_inducible === 'boolean', `${id}: missing initiating-event policy`);
  let sum = 0;
  for (const [upstream, weight] of Object.entries(threshold.dependency_weights)) {
    assert(threats.includes(upstream) && upstream !== id, `${id}: invalid upstream id`);
    assert(Number.isFinite(weight) && weight >= 0, `${id}: invalid dependency weight`);
    assert(Number.isInteger(threshold.dependency_lags[upstream]) && threshold.dependency_lags[upstream] >= 0, `${id}: invalid dependency lag`);
    sum += weight;
  }
  assert(sum === 0 || Math.abs(sum - 1) < 1e-10, `${id}: incoming weights do not normalize`);
  assert(growth.effective_growth_calibrated === true && growth.risk_conversion === 1, `${id}: direct growth must not be reconverted`);
  assert(!('raw_indicator_growth' in growth), `${id}: observed indicator CAGR is not a latent-pressure prior`);
  for (const field of EXPECTED_FIELDS) assert(registeredUrls.has(data[`${id}.${field}`].url), `${id}.${field}: missing registry source`);
  for (const field of ['functional_weight', 'critical_services', 'dependency_weights', 'functional_failure', 'functional_overlap_group', 'functional_inducible', 'dependency_lags']) {
    assert(stableJson(threshold[field]) === stableJson(catalog[id][field]), `${id}: threshold/catalog ${field} mismatch`);
  }
}

for (const htmlFile of ['index.html', '404.html']) {
  const html = readText(htmlFile);
  assert(/<title>Apocalypse Clock \| Global Systemic Risk Monitor<\/title>/.test(html), `${htmlFile}: missing title`);
  assert(/<meta name="description"/.test(html), `${htmlFile}: missing meta description`);
  assert(/<link rel="canonical" href="https:\/\/jerseroman\.github\.io\/apocalypse-clock\/">/.test(html), `${htmlFile}: missing canonical URL`);
  assert(/<meta property="og:title"/.test(html), `${htmlFile}: missing OpenGraph metadata`);
  assert(/<meta name="twitter:card"/.test(html), `${htmlFile}: missing Twitter metadata`);
  assert(!/decoding="async"\/\s+loading=/.test(html), `${htmlFile}: malformed img decoding/loading attributes`);
}

console.log(`Validated ${keys.length} dataset parameters and embedded HTML copies.`);
