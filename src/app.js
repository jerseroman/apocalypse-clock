/*!
 * Apocalypse Clock — https://jerseroman.github.io/apocalypse-clock/
 * (c) 2026 Apocalypse Clock project authors. See LICENSE.
 */
const NOW = 2026, YS = 2025, YE = 2100, YR = YE - YS + 1;
const MODEL_VERSION = 'Apocalypse Clock v1.5.0';
const PRIMARY_DATASET_NAME = 'data_v1_9_0.json';
const AVERAGE_EXPORT_WARNING = 'Average export is numeric-only.';
const AVERAGE_SOURCE_LIMITATION = 'Average dataset/export preserves averaged numeric mu, lo, and hi values only unless a separate source-list payload is supplied; the current All-AI Average preset does not preserve per-parameter source lists.';

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const pct = v => `${Math.round(v * 100)}%`;
const fmtY = y => (y > YE ? '>2100' : y < YS ? '<'+YS : String(Math.round(y)));

function probabilityByDisplayedYear(summary, rawYear) {
  if (!summary || !Number.isFinite(rawYear)) return NaN;
  const displayYear = rawYear > YE ? YE : Math.round(rawYear);
  if (Array.isArray(summary.cdf) && summary.cdf.length) {
    const exact = summary.cdf.find(e => e.year === displayYear);
    if (exact && Number.isFinite(exact.prob)) return clamp(exact.prob, 0, 1);
    let last = null;
    for (const e of summary.cdf) {
      if (e.year <= displayYear) last = e;
      else break;
    }
    if (last && Number.isFinite(last.prob)) return clamp(last.prob, 0, 1);
  }
  if (Array.isArray(summary.crossing) && summary.crossing.length) {
    const n = summary.crossing.length;
    const k = summary.crossing.reduce((a, y) => a + (Number.isFinite(y) && y <= displayYear ? 1 : 0), 0);
    return clamp(k / n, 0, 1);
  }
  console.warn('Missing CDF/crossing data for displayed-year probability.');
  return NaN;
}
const AXIS_START = 2000, AXIS_END = 2100;
const AXIS_YEARS = [2000,2010,2020,2030,2040,2050,2060,2070,2080,2090,2100];
const yearPos = y => clamp(((Math.min(y, AXIS_END) - AXIS_START) / (AXIS_END - AXIS_START)) * 100, 0, 100);
// One formatter for all timeline rows: constructing a locale formatter per
// toLocaleDateString call dominated the timeline render on slow phones.
const NOW_STAMP_FORMAT = new Intl.DateTimeFormat('en-GB', { day:'2-digit', month:'short', year:'numeric' });
const nowStamp = () => NOW_STAMP_FORMAT.format(new Date());
const fmtYearsLeft = y => {
  if (!Number.isFinite(y)) return ' ';
  if (y > YE) return 'No cross';
  const raw = y - NOW;
  const val = Math.abs(raw) < 0.05 ? 0 : raw;
  return `${val.toFixed(Math.abs(val) >= 10 ? 0 : 1)} yr`;
};
const daysLeft = y => y > YE ? ' ' : `${Math.max(0, Math.round((y - NOW) * 365.25))} d`;
const describeHorizonBand = y => {
  if (!Number.isFinite(y) || y > YE) return 'no crossing ≤ 2100';
  const decade = Math.floor(y / 10) * 10;
  const pos = y - decade;
  const band = pos <= 2 ? 'early' : pos <= 6 ? 'mid' : 'late';
  return `${band}-${decade}s`;
};

function quantile(sorted, q) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

const DEFAULT_MC_SEED = 'AC-1.2.6-2026';
const DEFAULT_MC_SEED_HASH = 0x27db295a;
const RNG_VERSION = 'mulberry32-v1';
let _mcSeedString = DEFAULT_MC_SEED;
let _mcRng = null;

function normalizeMonteCarloSeed(seed) {
  const value = String(seed ?? '').trim();
  return value || DEFAULT_MC_SEED;
}

function hashSeedToUint32(seed) {
  let h = 2166136261 >>> 0;
  const s = normalizeMonteCarloSeed(seed);
  if (s === DEFAULT_MC_SEED) return DEFAULT_MC_SEED_HASH;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h || 0x9e3779b9;
}

function makeSeededRandom(seed) {
  let a = hashSeedToUint32(seed);
  return function seededRandom01() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createRngContext(seed) {
  const normalizedSeed = normalizeMonteCarloSeed(seed);
  const next = makeSeededRandom(normalizedSeed);
  const random = () => next();
  const gaussian = () => {
    let u = 0, v = 0;
    while (!u) u = random();
    while (!v) v = random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return Object.freeze({
    seed: normalizedSeed,
    version: RNG_VERSION,
    random01: random,
    randn: gaussian,
    normalSample: (mean, sd) => mean + gaussian() * sd,
  });
}

function resetMonteCarloSeed(seed) {
  _mcSeedString = normalizeMonteCarloSeed(seed);
  _mcRng = makeSeededRandom(_mcSeedString);
  return _mcSeedString;
}

function random01() {
  if (!_mcRng) resetMonteCarloSeed(P && P.seed ? P.seed : DEFAULT_MC_SEED);
  return _mcRng();
}

function randn() {
  let u = 0, v = 0;
  while (!u) u = random01();
  while (!v) v = random01();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const normalSample = (mean, sd) => mean + randn() * sd;

function erf(x) {
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

const normCdf = x => 0.5 * (1 + erf(x / Math.SQRT2));

function normInv(p) {
  const pp = clamp(p, 1e-9, 1 - 1e-9);
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const pl = 0.02425, ph = 1 - pl;
  if (pp < pl) {
    const q = Math.sqrt(-2 * Math.log(pp));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (pp > ph) {
    const q = Math.sqrt(-2 * Math.log(1 - pp));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = pp - 0.5;
  const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
         (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

const muOf = x => (x && typeof x === 'object' && 'mu' in x ? x.mu : x);
const loOf = x => (x && typeof x === 'object' && 'lo' in x ? x.lo : x);
const hiOf = x => (x && typeof x === 'object' && 'hi' in x ? x.hi : x);
const sourceOf = x => (x && typeof x === 'object' && 'source' in x ? x.source : '');

const SOURCE_TRACEABILITY_LIMITATION = 'Some expert-judgment threshold or growth-rate entries intentionally keep an empty raw URL because no single primary source defines the normalized destabilization threshold. These are retained as anchored judgments and are not filled with invented citations.';
function normalizeRawUrlForExport(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  const md = raw.match(/^\[[^\]]+\]\((https?:\/\/[^\s)]+)\)$/i);
  return md ? md[1] : raw;
}
function normalizeHttpUrl(url) {
  const raw = normalizeRawUrlForExport(url);
  if (!/^https?:\/\//i.test(raw)) return '';
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : '';
  } catch {
    return '';
  }
}
function getSourceTraceabilityLimitations(sourceMap = ACTIVE_SOURCE_DATA || {}) {
  return Object.entries(sourceMap || {})
    .filter(([, value]) => value && !normalizeHttpUrl(value.url))
    .map(([key, value]) => ({
      key,
      source: value.source || '',
      strength: value.strength || '',
      limitation: 'No raw URL is supplied for this parameter; do not infer or fabricate a citation.'
    }));
}

const escapeHtml = s => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const THREAT_MECHANISM_CLASSIFICATION = Object.freeze({
  ai: "amplifier_risk",
  amr: "amplifier_risk",
  authoritarian: "amplifier_risk",
  autonomousw: "amplifier_risk",
  biodiversity: "catastrophic_pathway",
  bioengineered: "catastrophic_pathway",
  climate: "catastrophic_pathway",
  cyber: "amplifier_risk",
  debt: "amplifier_risk",
  displacement: "amplifier_risk",
  economic: "amplifier_risk",
  epistemic: "amplifier_risk",
  fragmentation_gov: "amplifier_risk",
  geopolitics: "catastrophic_pathway",
  minerals: "amplifier_risk",
  nuclear: "catastrophic_pathway",
  oceans: "catastrophic_pathway",
  pandemics: "catastrophic_pathway",
  pollution: "amplifier_risk",
  soils: "amplifier_risk",
  space: "amplifier_risk",
  supply: "amplifier_risk",
  water: "amplifier_risk"
});

const THREAT_MECHANISM_COPY = Object.freeze({
  catastrophic_pathway: {
    title: "Catastrophic pathway",
    short: "Potential direct systemic failure pathway.",
    note: "Catastrophic pathway threat - Potential direct systemic failure pathway.",
    tooltip: "This threat can plausibly act as a direct systemic failure pathway. The displayed year is still a modelled risk horizon, not a deterministic event date.",
    aria: "Catastrophic pathway threat - Potential direct systemic failure pathway.",
    css: "catastrophic"
  },
  amplifier_risk: {
    title: "Amplifier risk",
    short: "Cascading systemic pressure, not a direct collapse pathway.",
    note: "Amplifier risk threat - Cascading systemic pressure, not a direct collapse pathway. A bar near the end means this risk is highly saturated in the model and may strongly amplify other threats.",
    tooltip: "This threat mainly amplifies systemic instability through cascading interactions. The displayed year is a modelled stress horizon, not a standalone civilization-collapse prediction.",
    aria: "Amplifier risk threat - Cascading systemic pressure, not a direct collapse pathway. A bar near the end means this risk is highly saturated in the model and may strongly amplify other threats.",
    css: "amplifier"
  }
});

const AMPLIFIER_CONTINUATION_A11Y = "No direct crossing through 2100; systemic pressure may persist and amplify other threats.";
const AMPLIFIER_NO_CROSSING_LABEL = "No direct crossing ≤ 2100; systemic pressure may persist and amplify other threats.";

const THREAT_REVERSIBILITY_OVERRIDES = Object.freeze({
  authoritarian: "reversible",
  fragmentation_gov: "reversible",
  geopolitics: "reversible",
  minerals: "irreversible"
});

const THREAT_REVERSIBILITY_COPY = Object.freeze({
  reversible: {
    label: "Reversible",
    css: "reversible",
    tooltip: "Relatively reversible in this dashboard classification: damage is serious, but recovery or institutional correction remains plausible.",
    aria: "Reversible threat classification"
  },
  partial: {
    label: "Partly reversible",
    css: "partial",
    tooltip: "Partly reversible in this dashboard classification: some damage can be repaired, but recovery may be slow, incomplete, or path-dependent.",
    aria: "Partly reversible threat classification"
  },
  irreversible: {
    label: "Irreversible",
    css: "irreversible",
    tooltip: "Irreversible in this dashboard classification: key damage cannot be fully repaired within a human lifetime. Depending on the threat type, impacts may persist for decades, centuries, or longer, with no plausible recovery, institutional correction, or technical mitigation on a typical human or generational timescale.",
    aria: "Irreversible threat classification"
  }
});

function normalizeMechanismType(value) {
  const normalized = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return normalized === 'catastrophic_pathway' || normalized === 'amplifier_risk'
    ? normalized
    : 'amplifier_risk';
}

function mechanismTypeForThreat(entry) {
  const threatKey = entry && entry.id ? String(entry.id) : '';
  const mechanismType =
    entry?.mechanism_classification ||
    entry?.risk_mechanism_classification ||
    THREAT_MECHANISM_CLASSIFICATION[threatKey] ||
    "amplifier_risk";
  return normalizeMechanismType(mechanismType);
}

function mechanismCopyForThreat(entry) {
  const mechanismType = mechanismTypeForThreat(entry);
  return THREAT_MECHANISM_COPY[mechanismType] || THREAT_MECHANISM_COPY.amplifier_risk;
}

function threatMechanismNoteHtml(entry) {
  const copy = mechanismCopyForThreat(entry);
  return `<div class="threat-mechanism-note ${escapeHtml(copy.css)}" title="${escapeHtml(copy.tooltip)}" aria-label="${escapeHtml(copy.aria)}">${copy.css === 'catastrophic' ? '<span style="margin-right:5px">⚠</span>' : ''}${escapeHtml(copy.note || (copy.title + ' threat - ' + copy.short))}</div>`;
}

function threatMechanismBadgeHtml(entry, extraClass = '') {
  const copy = mechanismCopyForThreat(entry);
  return `<span class="threat-mechanism-pill threat-mechanism-table ${escapeHtml(copy.css)} ${escapeHtml(extraClass)}" title="${escapeHtml(copy.tooltip)}" aria-label="${escapeHtml(copy.aria)}">${escapeHtml(copy.title)}</span>`;
}

function reversibilityTypeForThreat(entry) {
  const threatKey = entry && entry.id ? String(entry.id) : '';
  if (THREAT_REVERSIBILITY_OVERRIDES[threatKey]) return THREAT_REVERSIBILITY_OVERRIDES[threatKey];
  const score = Number(muOf(entry?.irreversibility));
  if (!Number.isFinite(score)) return 'partial';
  if (score <= 3.0) return 'reversible';
  if (score >= 4.2) return 'irreversible';
  return 'partial';
}

function threatReversibilityPillHtml(entry, extraClass = '') {
  const type = reversibilityTypeForThreat(entry);
  const copy = THREAT_REVERSIBILITY_COPY[type] || THREAT_REVERSIBILITY_COPY.partial;
  const score = Number(muOf(entry?.irreversibility));
  const scoreText = Number.isFinite(score) ? ` Irreversibility score: ${score.toFixed(1)}/5.` : '';
  return `<span class="t-pill reversibility ${escapeHtml(copy.css)} ${escapeHtml(extraClass)}" title="${escapeHtml(copy.tooltip + scoreText)}" aria-label="${escapeHtml(copy.aria)}">${escapeHtml(copy.label)}</span>`;
}

const SOBOL_JOE_KUO_46 = [{"s":1,"a":0,"m":[1]},{"s":2,"a":1,"m":[1,3]},{"s":3,"a":1,"m":[1,3,1]},{"s":3,"a":2,"m":[1,1,1]},{"s":4,"a":1,"m":[1,1,3,3]},{"s":4,"a":4,"m":[1,3,5,13]},{"s":5,"a":2,"m":[1,1,5,5,17]},{"s":5,"a":4,"m":[1,1,5,5,5]},{"s":5,"a":7,"m":[1,1,7,11,19]},{"s":5,"a":11,"m":[1,1,5,1,1]},{"s":5,"a":13,"m":[1,1,1,3,11]},{"s":5,"a":14,"m":[1,3,5,5,31]},{"s":6,"a":1,"m":[1,3,3,9,7,49]},{"s":6,"a":13,"m":[1,1,1,15,21,21]},{"s":6,"a":16,"m":[1,3,1,13,27,49]},{"s":6,"a":19,"m":[1,1,1,15,7,5]},{"s":6,"a":22,"m":[1,3,1,15,13,25]},{"s":6,"a":25,"m":[1,1,5,5,19,61]},{"s":7,"a":1,"m":[1,3,7,11,23,15,103]},{"s":7,"a":4,"m":[1,3,7,13,13,15,69]},{"s":7,"a":7,"m":[1,1,3,13,7,35,63]},{"s":7,"a":8,"m":[1,3,5,9,1,25,53]},{"s":7,"a":14,"m":[1,3,1,13,9,35,107]},{"s":7,"a":19,"m":[1,3,1,5,27,61,31]},{"s":7,"a":21,"m":[1,1,5,11,19,41,61]},{"s":7,"a":28,"m":[1,3,5,3,3,13,69]},{"s":7,"a":31,"m":[1,1,7,13,1,19,1]},{"s":7,"a":32,"m":[1,3,7,5,13,19,59]},{"s":7,"a":37,"m":[1,1,3,9,25,29,41]},{"s":7,"a":41,"m":[1,3,5,13,23,1,55]},{"s":7,"a":42,"m":[1,3,7,3,13,59,17]},{"s":7,"a":50,"m":[1,3,1,3,5,53,69]},{"s":7,"a":55,"m":[1,1,5,5,23,33,13]},{"s":7,"a":56,"m":[1,1,7,7,1,61,123]},{"s":7,"a":59,"m":[1,1,7,9,13,61,49]},{"s":7,"a":62,"m":[1,3,3,5,3,55,33]},{"s":8,"a":14,"m":[1,3,1,15,31,13,49,245]},{"s":8,"a":21,"m":[1,3,5,15,31,59,63,97]},{"s":8,"a":22,"m":[1,3,1,11,11,11,77,249]},{"s":8,"a":38,"m":[1,3,1,11,27,43,71,9]},{"s":8,"a":47,"m":[1,1,7,15,21,11,81,45]},{"s":8,"a":49,"m":[1,3,7,3,25,31,65,79]},{"s":8,"a":50,"m":[1,3,1,1,19,11,3,205]},{"s":8,"a":52,"m":[1,1,5,9,19,21,29,157]},{"s":8,"a":56,"m":[1,3,7,11,1,33,89,185]}];
const SOBOL_BITS = 30;
const SOBOL_RECIP = 1 / (2 ** SOBOL_BITS);
const _sobolDirectionCache = new Map();

function lowZeroBit(n) {
  let bit = 1;
  let x = n >>> 0;
  while (x & 1) {
    bit += 1;
    x >>>= 1;
  }
  return bit;
}

function getSobolDirections(dimCount) {
  if (_sobolDirectionCache.has(dimCount)) return _sobolDirectionCache.get(dimCount);
  if (dimCount < 1 || dimCount > 1 + SOBOL_JOE_KUO_46.length) {
    throw new Error(`Sobol direction table supports 1..${1 + SOBOL_JOE_KUO_46.length} dimensions, received ${dimCount}.`);
  }
  const dirs = Array.from({ length: dimCount }, () => new Uint32Array(SOBOL_BITS));
  for (let bit = 0; bit < SOBOL_BITS; bit++) {
    dirs[0][bit] = (1 << (SOBOL_BITS - bit - 1)) >>> 0;
  }
  for (let dim = 1; dim < dimCount; dim++) {
    const meta = SOBOL_JOE_KUO_46[dim - 1];
    const row = dirs[dim];
    for (let bit = 0; bit < Math.min(meta.s, SOBOL_BITS); bit++) {
      row[bit] = (meta.m[bit] << (SOBOL_BITS - bit - 1)) >>> 0;
    }
    for (let bit = meta.s; bit < SOBOL_BITS; bit++) {
      let value = (row[bit - meta.s] ^ (row[bit - meta.s] >>> meta.s)) >>> 0;
      for (let k = 1; k < meta.s; k++) {
        if ((meta.a >> (meta.s - 1 - k)) & 1) value = (value ^ row[bit - k]) >>> 0;
      }
      row[bit] = value >>> 0;
    }
  }
  _sobolDirectionCache.set(dimCount, dirs);
  return dirs;
}

function generateSobolPoints(dimCount, count, skip = 1) {
  const dirs = getSobolDirections(dimCount);
  const state = new Uint32Array(dimCount);
  const points = [];
  let index = 0;
  function nextPoint() {
    const point = Array.from(state, value => value * SOBOL_RECIP);
    const c = lowZeroBit(index);
    const col = Math.min(SOBOL_BITS, c) - 1;
    for (let dim = 0; dim < dimCount; dim++) state[dim] = (state[dim] ^ dirs[dim][col]) >>> 0;
    index += 1;
    return point;
  }
  for (let i = 0; i < skip; i++) nextPoint();
  for (let i = 0; i < count; i++) points.push(nextPoint());
  return points;
}

const domCol = d => d === 'biosphere' ? '#2a9d6e' : d === 'technology' ? '#3a78c9' : '#c94040';

/* Threshold horizon: T = NOW + log(threshold / priority) / log(1 + growth_rate). */
const GLOBAL_THRESHOLD = 8.5; // destabilization level on the raw priority scale
const THRESHOLD_POLICY = 'per_threat_anchored';
const THRESHOLD_MIN = 7.8;
const THRESHOLD_MAX = 9.2;

function getThreatThreshold(threat, policy = THRESHOLD_POLICY) {
  if (policy === 'global') return GLOBAL_THRESHOLD;

  const raw = Number(threat && threat.threshold != null
    ? muOf(threat.threshold)
    : GLOBAL_THRESHOLD);

  if (!Number.isFinite(raw)) return GLOBAL_THRESHOLD;

  return clamp(raw, THRESHOLD_MIN, THRESHOLD_MAX);
}

function computeHorizon(priority, growthRate, threshold) {
  threshold = Number(threshold);
  if (!Number.isFinite(threshold)) threshold = GLOBAL_THRESHOLD;
  threshold = clamp(threshold, THRESHOLD_MIN, THRESHOLD_MAX);
  if (priority <= 0 || isNaN(priority)) return YE + 1;
  if (priority >= threshold) return NOW;        // already critical
  if (growthRate <= 0) return YE + 1;           // static no crossing
  const t = NOW + Math.log(threshold / priority) / Math.log(1 + growthRate);
  return isFinite(t) ? Math.min(YE + 1, Math.ceil(t)) : YE + 1;
}

const SC = {
  baseline: {
    label: 'Baseline', color: '#c94040',
    s: { sc:0, ur:0, ac:0, id:0, ir:0, gf:0 },
    domMult: { civilization:1, biosphere:1, technology:1 },
    grMult:  { civilization:1, biosphere:1, technology:1 },
    threatMult: {},
    uncWidthMult: 1.0,
  },
  coordination: {
    label: 'High Cooperation', color: '#2a9d6e',
    s: { sc:-.4, ur:-.3, ac:-.25, id:-.2, ir:.1, gf:-.35 },
    domMult: { civilization:.85, biosphere:.80, technology:.90 },
    grMult:  { civilization:.70, biosphere:.65, technology:.80 },
    threatMult: { geopolitics:.7, nuclear:.6, fragmentation_gov:.7 },
    uncWidthMult: 0.8,
  },
  cascade: {
    label: 'Polycrisis Cascade', color: '#8b2222',
    s: { sc:.4, ur:.4, ac:.35, id:.35, ir:.2, gf:.3 },
    domMult: { civilization:1.25, biosphere:1.20, technology:1.10 },
    grMult:  { civilization:1.50, biosphere:1.40, technology:1.20 },
    threatMult: { pandemics:1.4, nuclear:1.3, geopolitics:1.35, displacement:1.4, economic:1.3 },
    uncWidthMult: 1.5,
  },
  techaccel: {
    label: 'Tech Acceleration', color: '#7c5cbf',
    s: { sc:.1, ur:.2, ac:.3, id:.15, ir:.05, gf:.15 },
    domMult: { civilization:1.0, biosphere:1.0, technology:1.45 },
    grMult:  { civilization:1.0, biosphere:1.0, technology:1.60 },
    threatMult: { ai:1.5, cyber:1.4, autonomousw:1.35, space:1.3, epistemic:1.3 },
    uncWidthMult: 1.3,
  },
  fragmentation: {
    label: 'Fragmentation', color: '#a03030',
    s: { sc:.25, ur:.3, ac:.2, id:.28, ir:.1, gf:.25 },
    domMult: { civilization:1.20, biosphere:1.0, technology:.95 },
    grMult:  { civilization:1.35, biosphere:1.10, technology:1.0 },
    threatMult: { geopolitics:1.3, fragmentation_gov:1.4, nuclear:1.2, displacement:1.35, authoritarian:1.3 },
    uncWidthMult: 1.25,
  },
};


/* MCDA inputs use 1-5 ordinal ranges; growth_rate and threshold remain judgment-based model fields. */
const PARAM_FIELDS = ['scale','urgency','acceleration','interdependence','irreversibility','gov_failure','growth_rate','threshold'];
const ORD_RANGE = { strong:0.40, moderate:0.65, weak:0.95 };
const GROWTH_RANGE = { strong:0.22, moderate:0.38, weak:0.60 };
const THRESH_RANGE = { strong:0.28, moderate:0.42, weak:0.60 };
const BUNDLED_SOURCE_DATA = JSON.parse(document.getElementById('bundledSources').textContent || '{}');
function datasetVersionFromSourceMap(sourceMap) {
  const meta = sourceMap && typeof sourceMap === 'object' ? sourceMap._meta : null;
  const raw = meta && (meta.schema_version || meta.dataset_version || meta.version);
  return String(raw || '').trim();
}
function currentDatasetVersion() {
  const base = (ACTIVE_SOURCE_META && ACTIVE_SOURCE_META.datasetVersion)
    || datasetVersionFromSourceMap(BUNDLED_SOURCE_DATA)
    || 'unknown';
  if (ACTIVE_EVIDENCE_META && ACTIVE_EVIDENCE_META.active) {
    const overlayVersion = ACTIVE_EVIDENCE_META.datasetVersion || 'evidence overlay';
    return `${base} + ${overlayVersion}`;
  }
  return base;
}
let ACTIVE_SOURCE_DATA = JSON.parse(JSON.stringify(BUNDLED_SOURCE_DATA));
let CUSTOM_SOURCE_DATA = null;
let ACTIVE_EVIDENCE_DATA = null;
let ACTIVE_SOURCE_DOCUMENT_META = JSON.parse(JSON.stringify(BUNDLED_SOURCE_DATA._meta || {}));
let ACTIVE_SOURCE_META = { mode:'bundled', fileName:'data_v1_9_0.json', datasetVersion: datasetVersionFromSourceMap(BUNDLED_SOURCE_DATA) || 'unknown', message:'Bundled data_v1_9_0.json parameter map embedded in widget as the default primary source.', uploaded:false };
let ACTIVE_EVIDENCE_META = { active:false, fileName:'', datasetVersion:'', message:'', entryCount:0, threatCount:0 };
const cleanSourceText = s => String(s ?? '')
  .replace(/\s*\[(?:cite|web)\s*:[^\]]+\]/gi, '')
  .replace(/\[([^\]\n]{1,160})\]\((https?:\/\/[^\s)]+(?:\([^\)]*\)[^\s)]*)?)\)/gi, '$1')
  .replace(/\s{2,}/g, ' ')
  .trim();
function classifySourceType(source, url, strength) {
  const s = `${source || ''} ${url || ''}`.toLowerCase();
  if ((strength || '').toLowerCase().includes('expert') || s.includes('expert judgment')) return 'expert judgment';
  if (s.includes('model assumption') || s.includes('model convention')) return 'model assumption';
  if (s.includes('science.org') || s.includes('nature.com') || s.includes('journal') || s.includes('doi.org')) return 'peer-reviewed';
  if (s.includes('ipcc') || s.includes('wmo') || s.includes('who') || s.includes('un ') || s.includes('unep') || s.includes('unesco') || s.includes('iea') || s.includes('world bank') || s.includes('fao') || s.includes('sipri') || s.includes('unhcr') || s.includes('v-dem')) return 'official report';
  if (s.includes('dataset') || s.includes('our world in data') || s.includes('speciesradar') || s.includes('data')) return 'institutional dataset';
  if (s.includes('industry') || s.includes('market') || s.includes('forecast')) return 'industry report';
  return 'institutional dataset';
}
function confidenceGradeFromStrength(strength) {
  const key = String(strength || '').toLowerCase();
  if (key === 'strong') return 'A';
  if (key === 'moderate' || key === 'uploaded') return 'B';
  if (key === 'weak' || key === 'anchored_judgment') return 'C';
  if (key === 'expert_judgment' || key.includes('expert')) return 'D';
  return 'C';
}

const EVIDENCE_GRADES = Object.freeze(['A', 'B', 'C', 'D', 'U']);

function normalizeEvidenceGrade(value, fallback = 'U') {
  if (value == null || String(value).trim() === '') return fallback;
  const grade = String(value).trim().toUpperCase();
  return EVIDENCE_GRADES.includes(grade) ? grade : fallback;
}

function cloneJsonValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function normalizeParameterEvidence(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return {
    calibration_grade: normalizeEvidenceGrade(value.calibration_grade ?? value.parameter_calibration_grade ?? value.evidence_grade),
    mapping_type: cleanSourceText(value.mapping_type || ''),
    directness: cleanSourceText(value.directness || ''),
    assessment_status: cleanSourceText(value.assessment_status || ''),
    rationale: cleanSourceText(value.rationale || ''),
    assessed_at: typeof value.assessed_at === 'string' ? value.assessed_at.trim() : '',
  };
}
function rangeMetaOf(x) {
  const meta = x && typeof x === 'object' ? x : {};
  return {
    url: meta.url ? meta.url : '',
    accessed: meta.accessed ? meta.accessed : '',
    strength: meta.strength ? meta.strength : '',
    note: meta.note ? meta.note : '',
    type: meta.type ? meta.type : '',
    confidence: meta.confidence ? meta.confidence : '',
    fallback: !!meta.fallback,
    overlay: !!meta.overlay,
    overlaySource: meta.overlaySource ? meta.overlaySource : '',
    overlayWeight: Number.isFinite(meta.overlayWeight) ? meta.overlayWeight : null,

    growth_kind: typeof meta.growth_kind === 'string' ? meta.growth_kind : '',
    risk_conversion: Number.isFinite(meta.risk_conversion) ? meta.risk_conversion : null,
    raw_indicator_growth: Number.isFinite(meta.raw_indicator_growth) ? meta.raw_indicator_growth : null,
    effective_growth_calibrated: meta.effective_growth_calibrated === true,
    threat_specific_cap: Number.isFinite(meta.threat_specific_cap) ? Math.max(0, meta.threat_specific_cap) : null,
    calibration_note: typeof meta.calibration_note === 'string' ? meta.calibration_note : '',
    parameter_evidence: meta.parameter_evidence ? cloneJsonValue(meta.parameter_evidence) : null,
  };
}

function rangedValue(mu, lo, hi, source, extras) {
  return { mu, lo, hi, source, ...(extras || {}) };
}

function autoRange(mu, quality, source, kind, bounds) {
  const [loB, hiB] = bounds;
  const spreadMap = kind === 'growth_rate' ? GROWTH_RANGE : kind === 'threshold' ? THRESH_RANGE : ORD_RANGE;
  const frac = spreadMap[quality] || spreadMap.moderate;
  const extras = {
    strength: quality,
    type: quality === 'uploaded' ? 'institutional dataset' : (String(source).toLowerCase().includes('expert judgment') ? 'expert judgment' : 'model assumption'),
    confidence: confidenceGradeFromStrength(String(source).toLowerCase().includes('expert judgment') ? 'expert_judgment' : quality),
    note: `Derived range used when no explicit source-map entry exists for ${kind === 'growth_rate' ? 'scenario risk-growth proxy' : kind}; value derived from the evidence-strength band.`,
    fallback: true,
  };
  if (kind === 'growth_rate') {
    return rangedValue(mu, Math.max(loB, mu * (1 - frac)), Math.min(hiB, mu * (1 + frac)), source, extras);
  }
  if (kind === 'threshold') {
    return rangedValue(mu, Math.max(loB, mu * (1 - frac * 0.5)), Math.min(hiB, mu * (1 + frac * 0.5)), source, extras);
  }
  return rangedValue(mu, clamp(mu - frac, loB, hiB), clamp(mu + frac, loB, hiB), source, extras);
}

const fieldKind = field => field === 'growth_rate' ? 'growth_rate' : field === 'threshold' ? 'threshold' : 'ordinal';
const fieldBounds = field => field === 'growth_rate' ? [0.0005, 0.25] : field === 'threshold' ? [4.5, 12] : [1, 5];
const sourceKey = (id, field) => `${id}.${field}`;

function normalizeSourceEntry(entry, fallbackSource, fallbackStrength) {
  if (!entry || typeof entry !== 'object') return null;
  if (![entry.mu, entry.lo, entry.hi].every(Number.isFinite)) return null;
  if (!(entry.lo <= entry.mu && entry.mu <= entry.hi)) return null;

  const strength = typeof entry.strength === 'string' ? entry.strength : fallbackStrength;

  const normalized = {
    mu: entry.mu,
    lo: entry.lo,
    hi: entry.hi,
    source: cleanSourceText(typeof entry.source === 'string' && entry.source.trim() ? entry.source : fallbackSource),
    url: normalizeHttpUrl(entry.url),
    accessed: typeof entry.accessed === 'string' ? entry.accessed : '',
    strength,
    note: cleanSourceText(typeof entry.note === 'string' ? entry.note : ''),
    type: classifySourceType(entry.source, entry.url, strength),
    confidence: confidenceGradeFromStrength(strength),
    fallback: false,
  };

  const explicitParameterEvidence = entry.parameter_evidence || (
    entry.parameter_calibration_grade != null || entry.evidence_grade != null
      ? {
          calibration_grade: entry.parameter_calibration_grade ?? entry.evidence_grade,
          mapping_type: entry.mapping_type,
          directness: entry.directness,
          assessment_status: entry.assessment_status,
          rationale: entry.rationale,
          assessed_at: entry.assessed_at,
        }
      : null
  );
  if (explicitParameterEvidence) normalized.parameter_evidence = normalizeParameterEvidence(explicitParameterEvidence);

  if (typeof entry.growth_kind === 'string' && entry.growth_kind.trim()) {
    normalized.growth_kind = entry.growth_kind.trim();
  }

  if (Number.isFinite(entry.risk_conversion)) {
    normalized.risk_conversion = clamp(entry.risk_conversion, 0, 1);
  }

  if (Number.isFinite(entry.raw_indicator_growth)) {
    normalized.raw_indicator_growth = Math.max(0, entry.raw_indicator_growth);
  }

  if (entry.effective_growth_calibrated === true) {
    normalized.effective_growth_calibrated = true;
  }

  if (Number.isFinite(entry.threat_specific_cap)) {
    normalized.threat_specific_cap = Math.max(0, entry.threat_specific_cap);
  }

  if (typeof entry.calibration_note === 'string' && entry.calibration_note.trim()) {
    normalized.calibration_note = cleanSourceText(entry.calibration_note);
  }

  if (entry.functional_weight != null) {
    if (!Number.isFinite(entry.functional_weight) || entry.functional_weight < 0) throw new Error('Invalid functional weight.');
    normalized.functional_weight = entry.functional_weight;
  }
  if (entry.critical_services != null) {
    if (!Array.isArray(entry.critical_services) || !entry.critical_services.every(x => typeof x === 'string' && /^[a-z_]+$/.test(x))) throw new Error('Invalid critical services.');
    normalized.critical_services = [...new Set(entry.critical_services)];
  }
  if (entry.dependency_weights != null) {
    const edges = entry.dependency_weights;
    if (!edges || typeof edges !== 'object' || Array.isArray(edges) || !Object.entries(edges).every(([id, weight]) => /^[a-z0-9_]+$/.test(id) && Number.isFinite(weight) && weight >= 0) || Object.values(edges).reduce((s, v) => s + v, 0) > 1 + 1e-10) throw new Error('Invalid fixed dependency weights.');
    normalized.dependency_weights = { ...edges };
  }
  if (typeof entry.functional_failure === 'string') normalized.functional_failure = cleanSourceText(entry.functional_failure);
  if (typeof entry.functional_overlap_group === 'string' && /^[a-z0-9_]+$/.test(entry.functional_overlap_group)) normalized.functional_overlap_group = entry.functional_overlap_group;
  if (typeof entry.functional_inducible === 'boolean') normalized.functional_inducible = entry.functional_inducible;
  if (entry.dependency_lags != null) {
    if (!entry.dependency_lags || typeof entry.dependency_lags !== 'object' || Array.isArray(entry.dependency_lags) || !Object.values(entry.dependency_lags).every(x => Number.isInteger(x) && x >= 0 && x <= 100)) throw new Error('Invalid dependency lag.');
    normalized.dependency_lags = { ...entry.dependency_lags };
  }

  return normalized;
}

function sourceBackedRange(spec, field) {
  const explicitSource = field === 'growth_rate'
    ? (spec.growthSource || spec.source || 'internal calibration convention')
    : field === 'threshold'
      ? (spec.thresholdSource || spec.source || 'internal calibration convention')
      : (spec.source || 'internal calibration convention');
  const fromMap = normalizeSourceEntry(ACTIVE_SOURCE_DATA[sourceKey(spec.id, field)], explicitSource, spec.evStr);
  if (fromMap) {
    const [loB, hiB] = fieldBounds(field);
    return {
      ...fromMap,
      lo: clamp(fromMap.lo, loB, hiB),
      mu: clamp(fromMap.mu, loB, hiB),
      hi: clamp(fromMap.hi, loB, hiB),
    };
  }
  return autoRange(spec[field], spec.evStr, explicitSource, fieldKind(field), fieldBounds(field));
}

function makeThreat(spec) {
  const threshold = sourceBackedRange(spec, 'threshold');
  const fallback = BUNDLED_SOURCE_DATA._meta?.functional_model?.nodes?.[spec.id] || {};
  const dependencyWeights = threshold.dependency_weights || fallback.dependency_weights;
  return {
    ...spec,
    deps: dependencyWeights ? Object.keys(dependencyWeights) : [...(spec.deps || [])],
    dependency_weights: dependencyWeights ? { ...dependencyWeights } : Object.fromEntries((spec.deps || []).map(id => [id, 1 / spec.deps.length])),
    functional_weight: threshold.functional_weight ?? fallback.functional_weight ?? 1,
    critical_services: [...(threshold.critical_services || fallback.critical_services || [])],
    functional_failure: threshold.functional_failure || fallback.functional_failure || 'Standalone normalized functional-failure anchor; not a measured physical tipping point.',
    functional_overlap_group: threshold.functional_overlap_group || fallback.functional_overlap_group || spec.id,
    functional_inducible: threshold.functional_inducible ?? fallback.functional_inducible ?? true,
    dependency_lags: { ...(threshold.dependency_lags || fallback.dependency_lags || {}) },
    scale: sourceBackedRange(spec, 'scale'),
    urgency: sourceBackedRange(spec, 'urgency'),
    acceleration: sourceBackedRange(spec, 'acceleration'),
    interdependence: sourceBackedRange(spec, 'interdependence'),
    irreversibility: sourceBackedRange(spec, 'irreversibility'),
    gov_failure: sourceBackedRange(spec, 'gov_failure'),
    growth_rate: sourceBackedRange(spec, 'growth_rate'),
    threshold,
  };
}

const THREAT_SPECS = [
  ({ id:'climate', name:'Climate Breakdown', domain:'biosphere', category:'Climate', evStr:'strong', process_type:'continuous',
    source:'IPCC AR6 Synthesis Report, Summary for Policymakers (2023)',
    scale:5, urgency:5, acceleration:4.8, interdependence:5, irreversibility:4.8, gov_failure:4.2,
    growth_rate:0.010, threshold:8.8,
    deps:['water','soils','geopolitics','oceans'],
    mechanism:'Warming, tipping cascades, crop loss, sea-level rise, compound extremes' }),

  ({ id:'biodiversity', name:'Biodiversity Loss', domain:'biosphere', category:'Biosphere', evStr:'strong', process_type:'continuous',
    source:'IPBES Global Assessment Report on Biodiversity and Ecosystem Services (2019)',
    scale:5, urgency:5, acceleration:4.7, interdependence:5, irreversibility:5, gov_failure:4.5,
    growth_rate:0.012, threshold:9.0,
    deps:['climate','soils','oceans'],
    mechanism:'Mass extinction, ecosystem collapse, food-web breakdown' }),

  ({ id:'soils', name:'Soil & Food System', domain:'biosphere', category:'Food', evStr:'strong', process_type:'continuous',
    source:'FAO The State of the World’s Land and Water Resources for Food and Agriculture 2021',
    scale:4, urgency:4, acceleration:4.2, interdependence:5, irreversibility:4.0, gov_failure:4.2,
    growth_rate:0.009, threshold:8.0,
    deps:['climate','water'],
    mechanism:'Topsoil depletion, desertification, agricultural capacity loss' }),

  ({ id:'water', name:'Freshwater Stress', domain:'biosphere', category:'Water', evStr:'strong', process_type:'continuous',
    source:'WMO State of Global Water Resources 2023 (2024)',
    scale:5, urgency:5, acceleration:4.6, interdependence:5, irreversibility:4.1, gov_failure:4.3,
    growth_rate:0.011, threshold:8.8,
    deps:['climate','soils','geopolitics'],
    mechanism:'Aquifer depletion, glacial retreat, demand-supply gap' }),

  ({ id:'oceans', name:'Ocean Degradation', domain:'biosphere', category:'Oceans', evStr:'strong', process_type:'continuous',
    source:'UNESCO State of the Ocean Report 2024',
    scale:5, urgency:4, acceleration:4.1, interdependence:5, irreversibility:4.4, gov_failure:4.5,
    growth_rate:0.014, threshold:8.0,
    deps:['climate','biodiversity'],
    mechanism:'Acidification, deoxygenation, marine ecosystem collapse' }),

  ({ id:'pollution', name:'Toxic Pollution & PFAS', domain:'biosphere', category:'Pollution', evStr:'moderate', process_type:'continuous',
    source:'UNEP Global Chemicals Outlook II (2019)',
    scale:4, urgency:3, acceleration:4.0, interdependence:4.2, irreversibility:4.2, gov_failure:2.8,
    growth_rate:0.006, threshold:7.5,
    deps:['oceans','biodiversity'],
    mechanism:'PFAS persistence, microplastic bioaccumulation, endocrine disruption' }),
  ({ id:'pandemics', name:'Pandemic & Biosecurity', domain:'civilization', category:'Health', evStr:'strong', process_type:'event',
    source:'WHO Pathogens prioritization: a scientific framework for epidemic and pandemic research preparedness (2024)',
    scale:5, urgency:5, acceleration:4.4, interdependence:5, irreversibility:2.9, gov_failure:4.2,
    growth_rate:0.018, threshold:8.5,
    deps:['amr','geopolitics','supply'],
    mechanism:'Zoonotic spillover, engineered pathogens, global spread vectors' }),

  ({ id:'amr', name:'Antimicrobial Resistance', domain:'civilization', category:'Health', evStr:'strong', process_type:'continuous',
    source:'WHO outlines 40 research priorities on antimicrobial resistance (2023)',
    scale:4, urgency:4, acceleration:4.2, interdependence:4.5, irreversibility:3.9, gov_failure:3.8,
    growth_rate:0.012, threshold:8.0,
    deps:['pandemics','geopolitics'],
    mechanism:'Post-antibiotic era, surgical risk collapse, agricultural overuse' }),

  ({ id:'bioengineered', name:'Engineered Biological Event', domain:'civilization', category:'Biosecurity', evStr:'moderate', process_type:'event',
    source:'internal calibration convention',
    scale:5, urgency:4, acceleration:3.2, interdependence:4.7, irreversibility:4.8, gov_failure:5,
    growth_rate:0.025, threshold:9.0,
    deps:['ai','geopolitics','pandemics'],
    mechanism:'AI-accelerated biodesign, dual-use research, state/non-state actors' }),

  ({ id:'nuclear', name:'Nuclear Conflict', domain:'civilization', category:'War', evStr:'moderate', process_type:'event',
    source:'SIPRI Yearbook 2024',
    scale:5, urgency:5, acceleration:2.7, interdependence:5, irreversibility:5, gov_failure:5,
    growth_rate:0.022, threshold:9.2,
    deps:['geopolitics','ai','autonomousw'],
    mechanism:'Escalation ladder failure, accidental launch, arms-control collapse' }),

  ({ id:'supply', name:'Energy & Supply Chains', domain:'civilization', category:'Energy', evStr:'strong', process_type:'event',
    source:'World Economic Forum Global Risks Report 2025',
    scale:4, urgency:5, acceleration:4.6, interdependence:5, irreversibility:3.2, gov_failure:4.0,
    growth_rate:0.014, threshold:8.2,
    deps:['geopolitics','climate','cyber','minerals'],
    mechanism:'Critical infrastructure fragility, just-in-time breakdown, energy transition risk' }),

  ({ id:'geopolitics', name:'Geopolitical Escalation', domain:'civilization', category:'Geopolitics', evStr:'strong', process_type:'event',
    source:'World Economic Forum Global Risks Report 2025',
    scale:5, urgency:5, acceleration:4.4, interdependence:5, irreversibility:3.5, gov_failure:4.1,
    growth_rate:0.016, threshold:8.8,
    deps:['nuclear','supply','ai','pandemics'],
    mechanism:'Multi-polar rivalry, arms races, breakdown of international order' }),

  ({ id:'fragmentation_gov', name:'Global Governance Fragmentation', domain:'civilization', category:'Governance', evStr:'moderate', process_type:'regime',
    source:'World Economic Forum Global Risks Report 2025; internal calibration convention',
    scale:4, urgency:4, acceleration:4.0, interdependence:5, irreversibility:3.8, gov_failure:5,
    growth_rate:0.014, threshold:8.2,
    deps:['geopolitics','authoritarian','epistemic'],
    mechanism:'Institutional paralysis, UN dysfunction, coordination failure on global commons' }),

  ({ id:'economic', name:'Economic Fracture', domain:'civilization', category:'Finance', evStr:'moderate', process_type:'regime',
    source:'World Economic Forum Global Risks Report 2025',
    scale:4, urgency:4, acceleration:3.8, interdependence:4.8, irreversibility:3.0, gov_failure:3.5,
    growth_rate:0.013, threshold:8.0,
    deps:['geopolitics','supply','cyber'],
    mechanism:'Sovereign debt cascade, currency crises, financial system contagion' }),

  ({ id:'debt', name:'Debt / Financial Contagion', domain:'civilization', category:'Finance', evStr:'moderate', process_type:'continuous',
    source:'World Bank International Debt Report 2024',
    scale:4, urgency:3, acceleration:3.5, interdependence:4.5, irreversibility:2.8, gov_failure:3.2,
    growth_rate:0.010, threshold:7.8,
    deps:['economic','geopolitics','supply'],
    mechanism:'Overleveraged sovereign balance sheets, contagion via global bond markets' }),

  ({ id:'displacement', name:'Mass Displacement', domain:'civilization', category:'Society', evStr:'moderate', process_type:'continuous',
    source:'UNHCR Global Trends Report 2024, published June 2025',
    scale:4, urgency:4, acceleration:4.0, interdependence:4.5, irreversibility:3.2, gov_failure:3.8,
    growth_rate:0.013, threshold:8.0,
    deps:['climate','geopolitics','soils','water'],
    mechanism:'Climate and conflict migration, receiving-state capacity collapse' }),

  ({ id:'authoritarian', name:'Authoritarian Drift', domain:'civilization', category:'Governance', evStr:'moderate', process_type:'continuous',
    source:'V-Dem Democracy Report 2025',
    scale:4, urgency:4, acceleration:3.9, interdependence:4.0, irreversibility:3.5, gov_failure:3.6,
    growth_rate:0.010, threshold:7.8,
    deps:['geopolitics','epistemic','economic'],
    mechanism:'Democratic backsliding, surveillance-state lock-in, political violence' }),

  ({ id:'epistemic', name:'Epistemic Breakdown', domain:'civilization', category:'Society', evStr:'moderate', process_type:'continuous',
    source:'World Economic Forum Global Risks Report 2025',
    scale:3, urgency:4, acceleration:4.0, interdependence:4.2, irreversibility:3.0, gov_failure:3.2,
    growth_rate:0.011, threshold:7.5,
    deps:['ai','authoritarian'],
    mechanism:'Mass disinformation, AI-generated reality distortion, trust collapse' }),
  ({ id:'ai', name:'Advanced AI Destabilizer', domain:'technology', category:'AI', evStr:'moderate', process_type:'regime',
    source:'internal calibration convention',
    scale:4, urgency:4, acceleration:3.8, interdependence:5, irreversibility:3.7, gov_failure:4.6,
    growth_rate:0.020, threshold:8.5,
    deps:['cyber','geopolitics','bioengineered','supply'],
    mechanism:'Misaligned AGI, AI-enabled disinformation, autonomous decision loops' }),

  ({ id:'cyber', name:'Systemic Cyberattacks', domain:'technology', category:'Cyber', evStr:'strong', process_type:'event',
    source:'ENISA Threat Landscape 2024',
    scale:4, urgency:5, acceleration:4.3, interdependence:5, irreversibility:2.5, gov_failure:3.9,
    growth_rate:0.018, threshold:8.2,
    deps:['ai','geopolitics','supply'],
    mechanism:'Critical infrastructure breach, SCADA attacks, internet fragmentation' }),

  ({ id:'autonomousw', name:'Autonomous Weapons Escalation', domain:'technology', category:'AI', evStr:'weak', process_type:'regime',
    source:'internal calibration convention',
    scale:4, urgency:3, acceleration:3.0, interdependence:4.2, irreversibility:4.0, gov_failure:4.5,
    growth_rate:0.015, threshold:8.0,
    deps:['ai','geopolitics','nuclear'],
    mechanism:'Autonomous weapon proliferation, speed-of-machine escalation, attribution failure' }),

  ({ id:'minerals', name:'Critical Minerals Bottleneck', domain:'technology', category:'Resources', evStr:'moderate', process_type:'continuous',
    source:'IEA Global Critical Minerals Outlook 2024',
    scale:3, urgency:3, acceleration:3.6, interdependence:3.8, irreversibility:3.1, gov_failure:2.6,
    growth_rate:0.008, threshold:7.0,
    deps:['geopolitics','supply'],
    mechanism:'Rare-earth concentration, transition-metal demand surge, geopolitical weaponisation' }),

  ({ id:'space', name:'Space Infrastructure Disruption', domain:'technology', category:'Space', evStr:'weak', process_type:'event',
    source:'internal calibration convention',
    scale:4, urgency:2, acceleration:2.8, interdependence:4.0, irreversibility:3.5, gov_failure:3.8,
    growth_rate:0.012, threshold:7.8,
    deps:['geopolitics','cyber','ai'],
    mechanism:'Kessler syndrome, satellite denial, GPS/comms loss, Carrington-scale solar event' }),
];

let THREATS = [];
let THREAT_ID_LIST = [];
let THREAT_ID_SET = new Set();
let GLOBAL_STRESS_CAPACITY = 0;
let OUT_DEGREES = [];
let MAX_OUT_DEGREE = 1;
let MEAN_OUT_DEGREE = 1;
let DEP_GRAPH = { idx:{}, matrix:[] };

function buildDepGraph(threats) {
  const idx = Object.fromEntries(threats.map((t, i) => [t.id, i]));
  const matrix = threats.map(() => threats.map(() => 0));
  threats.forEach((t, i) => { matrix[i][i] = 1; });
  threats.forEach((t, i) => {
    const direct = new Set(t.deps || []);
    const twoHop = new Set();
    direct.forEach(id => {
      const other = threats[idx[id]];
      (other?.deps || []).forEach(x => {
        if (x !== t.id && !direct.has(x)) twoHop.add(x);
      });
    });
    threats.forEach((u, j) => {
      if (i === j) return;
      const forward = direct.has(u.id) ? 0.5 : twoHop.has(u.id) ? 0.25 : 0;
      const reverseDirect = new Set(u.deps || []);
      const reverseTwoHop = new Set();
      reverseDirect.forEach(id => {
        const other = threats[idx[id]];
        (other?.deps || []).forEach(x => {
          if (x !== u.id && !reverseDirect.has(x)) reverseTwoHop.add(x);
        });
      });
      const reverse = reverseDirect.has(t.id) ? 0.5 : reverseTwoHop.has(t.id) ? 0.25 : 0;
      matrix[i][j] = Math.max(forward, reverse);
    });
  });
  return { idx, matrix };
}

function rebuildThreatState() {
  THREATS = THREAT_SPECS.map(spec => makeThreat(spec));
  THREAT_ID_LIST = THREATS.map(t => t.id);
  THREAT_ID_SET = new Set(THREAT_ID_LIST);
  GLOBAL_STRESS_CAPACITY = THREATS.reduce((sum, t) => sum + getThreatThreshold(t), 0);
  OUT_DEGREES = THREATS.map(t => (t.deps || []).length);
  MAX_OUT_DEGREE = Math.max(...OUT_DEGREES, 1);
  MEAN_OUT_DEGREE = OUT_DEGREES.reduce((s, v) => s + v, 0) / (OUT_DEGREES.length || 1);
  DEP_GRAPH = buildDepGraph(THREATS);
}

/* Startup validation for threat ids, scenario refs, and parameter ranges. */
function validateModelConfig() {
  const dupes = THREAT_ID_LIST.filter((id, idx) => THREAT_ID_LIST.indexOf(id) !== idx);
  const missingDeps = THREATS.flatMap(t =>
    (t.deps || [])
      .filter(id => !THREAT_ID_SET.has(id))
      .map(id => `${t.id} -> ${id}`)
  );
  const missingScenarioRefs = Object.entries(SC).flatMap(([scKey, sc]) =>
    Object.keys(sc.threatMult || {})
      .filter(id => !THREAT_ID_SET.has(id))
      .map(id => `${scKey} -> ${id}`)
  );

  const issues = [];
  if (dupes.length) issues.push(`Duplicate threat ids: ${dupes.join(', ')}`);
  if (missingDeps.length) issues.push(`Broken dependency ids: ${missingDeps.join('; ')}`);
  if (missingScenarioRefs.length) issues.push(`Broken scenario multipliers: ${missingScenarioRefs.join('; ')}`);
  THREATS.forEach(t => {
    if (!['continuous','event','regime'].includes(t.process_type)) {
      issues.push(`Invalid process_type on ${t.id}: ${t.process_type}`);
    }
    PARAM_FIELDS.forEach(field => {
      const v = t[field];
      if (!v || typeof v !== 'object' || !['mu','lo','hi','source'].every(k => k in v)) {
        issues.push(`Missing structured range on ${t.id}.${field}`);
        return;
      }
      if (![v.mu, v.lo, v.hi].every(Number.isFinite)) {
        issues.push(`Non-finite range on ${t.id}.${field}`);
      }
      if (!(v.lo <= v.mu && v.mu <= v.hi)) {
        issues.push(`Inverted range on ${t.id}.${field}`);
      }
    });
  });

  try {
    normalizedDomainWeights(P.domW);
  } catch (err) {
    issues.push(err.message);
  }

  if (issues.length) {
    throw new Error(`Invalid Apocalypse Clock configuration. ${issues.join(' | ')}`);
  }
}

function summarizeSourceMap(sourceMap) {
  const keys = Object.keys(sourceMap || {}).filter(key => key !== '_meta');
  const threats = new Set(keys.map(k => String(k).split('.')[0]).filter(Boolean));
  return { entryCount: keys.length, threatCount: threats.size };
}

function sanitizeSourceMap(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Source file must be a JSON object keyed by "threat.parameter".');
  }
  const sanitized = {};
  if (raw._meta && typeof raw._meta === 'object' && !Array.isArray(raw._meta)) {
    sanitized._meta = cloneJsonValue(raw._meta);
  }
  Object.entries(raw).forEach(([key, value]) => {
    if (!/^[a-z0-9_]+\.[a-z_]+$/i.test(key)) return;
    const entry = normalizeSourceEntry(value, 'expert judgment uploaded source map', 'uploaded');
    if (entry) sanitized[key] = { ...entry };
  });
  if (!Object.keys(sanitized).length) {
    throw new Error('Uploaded file contains no valid parameter entries.');
  }
  return sanitized;
}

function detectUploadedJsonMode(raw) {
  let sourceLike = 0;
  let evidenceLike = 0;
  Object.values(raw || {}).forEach(value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    const hasRange = [value.mu, value.lo, value.hi].every(Number.isFinite);
    const obsRaw = value.obs ?? value.value ?? value.observed ?? value.obsValue;
    const hasObs = Number.isFinite(obsRaw);
    if (hasRange) sourceLike += 1;
    else if (hasObs) evidenceLike += 1;
  });
  if (sourceLike && !evidenceLike) return 'source';
  if (evidenceLike && !sourceLike) return 'evidence';
  if (sourceLike && evidenceLike) return sourceLike >= evidenceLike ? 'source' : 'evidence';
  throw new Error('Upload file contains no recognized source-range entries or evidence-overlay observations.');
}

function normalizeEvidenceEntry(entry, key) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
  const field = String(key).split('.')[1];
  if (!PARAM_FIELDS.includes(field)) return null;
  const [loB, hiB] = fieldBounds(field);
  const obsRaw = entry.obs ?? entry.value ?? entry.observed ?? entry.obsValue;
  const weightRaw = entry.weight ?? entry.obsWeight ?? entry.precision ?? 1;
  if (!Number.isFinite(obsRaw)) return null;
  const strength = typeof entry.strength === 'string' ? entry.strength : 'moderate';
  return {
    obs: clamp(Number(obsRaw), loB, hiB),
    weight: clamp(Number.isFinite(weightRaw) ? Number(weightRaw) : 1, 0.25, 8),
    source: cleanSourceText(typeof entry.source === 'string' && entry.source.trim() ? entry.source : 'uploaded evidence overlay'),
    url: normalizeHttpUrl(entry.url),
    accessed: typeof entry.accessed === 'string' ? entry.accessed : '',
    strength,
    note: cleanSourceText(typeof entry.note === 'string' ? entry.note : ''),
    type: classifySourceType(entry.source, entry.url, strength),
    confidence: confidenceGradeFromStrength(strength),
  };
}

function sanitizeEvidenceMap(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Evidence overlay must be a JSON object keyed by "threat.parameter".');
  }
  const sanitized = {};
  Object.entries(raw).forEach(([key, value]) => {
    if (!/^[a-z0-9_]+\.[a-z_]+$/i.test(key)) return;
    const entry = normalizeEvidenceEntry(value, key);
    if (entry) sanitized[key] = entry;
  });
  if (!Object.keys(sanitized).length) {
    throw new Error('Evidence overlay contains no valid observation entries. Use { obs, weight, source } per parameter.');
  }
  return sanitized;
}

function explicitSourceForSpecField(spec, field) {
  return field === 'growth_rate'
    ? (spec.growthSource || spec.source || 'internal calibration convention')
    : field === 'threshold'
      ? (spec.thresholdSource || spec.source || 'internal calibration convention')
      : (spec.source || 'internal calibration convention');
}

/** Precision-weighted pooling on the native parameter scale. */
function applyEvidencePosterior(baseEntry, evidenceEntry, field) {
  const [loB, hiB] = fieldBounds(field);
  const span = Math.max(1e-6, hiB - loB);
  const priorSigma = Math.max((baseEntry.hi - baseEntry.lo) / 3.29, span * 0.02);
  const obsSigma = clamp(span / (4 + evidenceEntry.weight * 2), span * 0.03, span * 0.50);
  const priorPrecision = 1 / (priorSigma ** 2);
  const obsPrecision = 1 / (obsSigma ** 2);
  const postMu = clamp(
    (priorPrecision * baseEntry.mu + obsPrecision * evidenceEntry.obs) / (priorPrecision + obsPrecision),
    loB,
    hiB
  );
  const postSigma = Math.sqrt(1 / (priorPrecision + obsPrecision));
  const half90 = 1.645 * postSigma;
  return {
    ...baseEntry,
    mu: postMu,
    lo: clamp(postMu - half90, loB, hiB),
    hi: clamp(postMu + half90, loB, hiB),
    note: cleanSourceText(`${baseEntry.note ? `${baseEntry.note} ` : ''}Uploaded evidence overlay (${evidenceEntry.source}) adjusted this parameter with weight ${evidenceEntry.weight.toFixed(2)}.`),
    accessed: evidenceEntry.accessed || baseEntry.accessed || '',
    url: evidenceEntry.url || baseEntry.url || '',
    strength: evidenceEntry.strength || baseEntry.strength || '',
    type: evidenceEntry.type || baseEntry.type || '',
    confidence: evidenceEntry.confidence || baseEntry.confidence || '',
    overlay: true,
    overlaySource: evidenceEntry.source || '',
    overlayWeight: evidenceEntry.weight,
  };
}

function rebuildActiveSourceDataFromState() {
  const baseRaw = { ...BUNDLED_SOURCE_DATA, ...(CUSTOM_SOURCE_DATA || {}) };
  const normalized = {};
  Object.entries(baseRaw).forEach(([key, value]) => {
    const normalizedEntry = normalizeSourceEntry(value, (value && value.source) || 'source map entry', (value && value.strength) || 'moderate');
    if (normalizedEntry) normalized[key] = normalizedEntry;
  });
  if (ACTIVE_EVIDENCE_DATA) {
    Object.entries(ACTIVE_EVIDENCE_DATA).forEach(([key, evidenceEntry]) => {
      const [id, field] = key.split('.');
      if (!PARAM_FIELDS.includes(field)) return;
      const spec = THREAT_SPECS.find(t => t.id === id);
      if (!spec) return;
      const baseEntry = normalized[key] || autoRange(spec[field], spec.evStr, explicitSourceForSpecField(spec, field), fieldKind(field), fieldBounds(field));
      normalized[key] = applyEvidencePosterior(baseEntry, evidenceEntry, field);
    });
  }
  ACTIVE_SOURCE_DATA = normalized;
}

function serializeActiveSourceMap() {
  return JSON.stringify(ACTIVE_SOURCE_DATA, null, 2);
}

function renderSourceRegistry() {
  const summary = summarizeSourceMap(ACTIVE_SOURCE_DATA);
  const badge = document.getElementById('sourceBadge');
  const fileName = document.getElementById('sourceFileName');
  const entryCount = document.getElementById('sourceEntryCount');
  const threatCoverage = document.getElementById('sourceThreatCoverage');
  const mode = document.getElementById('sourceMode');
  const msg = document.getElementById('sourceMessage');
  const jsonView = document.getElementById('sourceJsonView');
  const overlayActive = !!(ACTIVE_EVIDENCE_META && ACTIVE_EVIDENCE_META.active);
  if (badge) badge.textContent = overlayActive ? 'Evidence overlay active' : ACTIVE_SOURCE_META.uploaded ? 'Custom source map active' : 'Bundled source map active';
  if (fileName) fileName.textContent = overlayActive
    ? `${ACTIVE_SOURCE_META.fileName || 'data_v1_9_0.json'} + ${ACTIVE_EVIDENCE_META.fileName}`
    : (ACTIVE_SOURCE_META.fileName || 'data_v1_9_0.json');
  if (entryCount) entryCount.textContent = `${summary.entryCount}/${THREAT_SPECS.length * PARAM_FIELDS.length}`;
  if (threatCoverage) threatCoverage.textContent = `${summary.threatCount}/${THREAT_SPECS.length} threats`;
  if (mode) mode.textContent = overlayActive ? (ACTIVE_SOURCE_META.uploaded ? 'Custom + Evidence' : 'Bundled + Evidence') : (ACTIVE_SOURCE_META.uploaded ? 'Custom merge' : 'Bundled');
  if (msg) msg.textContent = overlayActive ? ACTIVE_EVIDENCE_META.message : (ACTIVE_SOURCE_META.message || 'Bundled data_v1_9_0.json parameter map embedded in widget as the default primary source.');
  if (jsonView) jsonView.textContent = serializeActiveSourceMap();
}

function applySourceMap(sourceMap, meta, rerender) {
  CUSTOM_SOURCE_DATA = meta && meta.mode === 'bundled' ? null : JSON.parse(JSON.stringify(sourceMap || {}));
  ACTIVE_SOURCE_DOCUMENT_META = {
    ...cloneJsonValue(BUNDLED_SOURCE_DATA._meta || {}),
    ...cloneJsonValue((sourceMap && sourceMap._meta) || {}),
  };
  if (meta && meta.clearEvidence) {
    ACTIVE_EVIDENCE_DATA = null;
    ACTIVE_EVIDENCE_META = { active:false, fileName:'', datasetVersion:'', message:'', entryCount:0, threatCount:0 };
  }
  rebuildActiveSourceDataFromState();
  ACTIVE_SOURCE_META = {
    mode: meta && meta.mode ? meta.mode : 'bundled',
    fileName: meta && meta.fileName ? meta.fileName : 'data_v1_9_0.json',
    datasetVersion: meta && meta.datasetVersion
      ? meta.datasetVersion
      : ((meta && meta.uploaded) ? 'custom source map' : (datasetVersionFromSourceMap(sourceMap) || datasetVersionFromSourceMap(BUNDLED_SOURCE_DATA) || 'unknown')),
    message: meta && meta.message ? meta.message : 'Bundled data_v1_9_0.json parameter map embedded in widget as the default primary source.',
    uploaded: !!(meta && meta.uploaded),
  };
  rebuildThreatState();
  validateModelConfig();
  if (rerender !== false) {
    invalidateCachedResults();
    refreshCurrentView(null);
  }
  renderSourceRegistry();
}

function applyEvidenceOverlay(evidenceMap, meta, rerender) {
  ACTIVE_EVIDENCE_DATA = JSON.parse(JSON.stringify(evidenceMap || {}));
  const stats = summarizeSourceMap(evidenceMap);
  ACTIVE_EVIDENCE_META = {
    active: true,
    fileName: meta && meta.fileName ? meta.fileName : 'evidence overlay.json',
    datasetVersion: meta && meta.datasetVersion ? meta.datasetVersion : '',
    message: meta && meta.message ? meta.message : `Evidence overlay adjusted ${stats.entryCount} parameters across ${stats.threatCount} threats by precision-weighted pooling on the current source ranges.`,
    entryCount: stats.entryCount,
    threatCount: stats.threatCount,
  };
  rebuildActiveSourceDataFromState();
  rebuildThreatState();
  validateModelConfig();
  if (rerender !== false) {
    invalidateCachedResults();
    refreshCurrentView(null);
  }
  renderSourceRegistry();
}

let P = {
  scenario: 'baseline',
  nSim: 3000,
  seed: DEFAULT_MC_SEED,
  threshold: 0.40,          // compensatory: fraction of weighted threat mass for aggregate event
  cascadeThreshold: 0.50,   // cascade-only: stricter mass fraction before cascade can trigger
  structuralUncertainty: true, // Monte Carlo samples the cascade structure (STRUCTURAL_UNCERTAINTY)
  pressureTurns: true,      // Monte Carlo samples pressure turns and recovery (PRESSURE_TURNS)
  depAlpha: 0.22,           // dependency amplification factor
  uncMult: 1.0,             // uncertainty multiplier on fitted parameter ranges
  tailDependence: 0.15,     // optional diagnostic: probability of correlated systemic tail-shock draw
  vetoThreshold: 0.65,      // optional diagnostic: domain-level non-compensatory veto boundary
  domW: { civilization:1, biosphere:1, technology:1 },
  weightProfile: 'expert',
  weights: { scale:0.20, urgency:0.18, acceleration:0.14, interdependence:0.18, irreversibility:0.16, gov_failure:0.14 },
};

// The dashboard runs the Baseline scenario; the other SC scenarios remain available to runMC and buildEnriched.
function currentScenario() {
  return 'baseline';
}

const WEIGHT_PROFILES = {
  expert: {
    label: 'Expert Baseline',
    method: 'Transparent expert-prior MCDA baseline',
    weights: { scale:0.20, urgency:0.18, acceleration:0.14, interdependence:0.18, irreversibility:0.16, gov_failure:0.14 },
    domainWeights: { civilization:1.00, biosphere:1.00, technology:1.00 },
    summary: 'Preserves the original clock behavior. Scale receives the largest weight because civilizational or biospheric magnitude should dominate a global-risk screen; urgency and interdependence follow because this is a time-sensitive cascade model. Acceleration and governance failure remain material but lower to avoid double-counting growth-rate and scenario effects.',
    logic: 'This is a defensible baseline rather than an empirical law. It follows standard composite-indicator practice: make the theoretical framework explicit, keep weights transparent, and test sensitivity rather than pretending one vector is uniquely true.',
    sources: [
      ['OECD/JRC composite indicators', 'https://www.oecd.org/en/publications/handbook-on-constructing-composite-indicators-methodology-and-user-guide_9789264043466-en.html'],
      ['UK MCDA guide', 'https://analysisfunction.civilservice.gov.uk/policy-store/an-introductory-guide-to-mcda/']
    ]
  },
  cascade: {
    label: 'Cascade-Calibrated',
    method: 'Systems-cascade expert prior',
    weights: { scale:0.14, urgency:0.12, acceleration:0.10, interdependence:0.28, irreversibility:0.20, gov_failure:0.16 },
    domainWeights: { civilization:1.05, biosphere:1.05, technology:1.05 },
    summary: 'Strongly increases interdependence and irreversibility so the profile is visibly sensitive to coupled systemic threats rather than isolated hazard size. Domain priors remain broadly balanced; the main change is the MCDA interpretation of cascade coupling.',
    logic: 'This profile is informed by resilience theory, planetary-boundary coupling, and composite-index sensitivity practice. It is useful when the question is not only “which threat is large?” but “which threat can transmit instability through the system?”.',
    sources: [
      ['Holling resilience theory', 'https://www.annualreviews.org/content/journals/10.1146/annurev.es.04.110173.000245'],
      ['Planetary boundaries update', 'https://www.science.org/doi/10.1126/sciadv.adh2458'],
      ['OECD/JRC sensitivity logic', 'https://www.oecd.org/en/publications/handbook-on-constructing-composite-indicators-methodology-and-user-guide_9789264043466-en.html']
    ]
  },
  governance: {
    label: 'Governance-Stress',
    method: 'Coordination-failure stress profile',
    weights: { scale:0.14, urgency:0.10, acceleration:0.08, interdependence:0.22, irreversibility:0.16, gov_failure:0.30 },
    domainWeights: { civilization:1.30, biosphere:0.85, technology:0.95 },
    summary: 'Raises governance failure to the dominant weight and tilts the domain prior toward civilizational coordination stress. This profile asks what happens when mitigation capacity, institutional trust, collective action, arms control, public-health coordination, and international bargaining degrade before hazards are contained.',
    logic: 'The profile is grounded in risk-governance reasoning: the same physical or technological hazard becomes more dangerous when decision systems cannot coordinate, finance, enforce, or adapt. It should be read as a stress-test profile, not as a replacement for the baseline.',
    sources: [
      ['IPCC AR6 risk management', 'https://www.ipcc.ch/report/ar6/wg2/chapter/chapter-17/'],
      ['Cooke structured expert judgment', 'https://www.cooke-aspinall.net/RO%20cooke%20%26%20nane%20SEJ%20A4.pdf'],
      ['UK MCDA guide', 'https://analysisfunction.civilservice.gov.uk/policy-store/an-introductory-guide-to-mcda/']
    ]
  },
  biosphere: {
    label: 'Biosphere-Stability',
    method: 'Ecological-resilience and Earth-system profile',
    weights: { scale:0.20, urgency:0.08, acceleration:0.08, interdependence:0.22, irreversibility:0.30, gov_failure:0.12 },
    domainWeights: { civilization:0.85, biosphere:1.35, technology:0.90 },
    summary: 'Strongly emphasizes irreversibility, interdependence, and biospheric domain weight. It is designed for biospheric and Earth-system risks where damage can accumulate slowly, cross thresholds, and reduce the shock-absorbing capacity of ecosystems even when short-term political urgency looks lower.',
    logic: 'This profile reflects the literature on ecological resilience and planetary boundaries: persistent loss of resilience can matter as much as immediate speed, because recovery may become impossible or very slow on human timescales.',
    sources: [
      ['Holling resilience theory', 'https://www.annualreviews.org/content/journals/10.1146/annurev.es.04.110173.000245'],
      ['Planetary boundaries update', 'https://www.science.org/doi/10.1126/sciadv.adh2458'],
      ['Stockholm Resilience Centre', 'https://www.stockholmresilience.org/research/planetary-boundaries.html']
    ]
  },
  equal: {
    label: 'Equal Weights',
    method: 'Neutral benchmark profile',
    weights: { scale:1/6, urgency:1/6, acceleration:1/6, interdependence:1/6, irreversibility:1/6, gov_failure:1/6 },
    domainWeights: { civilization:1.00, biosphere:1.00, technology:1.00 },
    summary: 'Gives every MCDA dimension the same weight. This is not necessarily more scientific; it is a neutrality benchmark for seeing how much rankings depend on the baseline judgment structure.',
    logic: 'Equal weighting is useful when there is no defensible reason to privilege one criterion, or when the user wants a clean robustness comparison against more theory-driven profiles.',
    sources: [
      ['OECD/JRC composite indicators', 'https://www.oecd.org/en/publications/handbook-on-constructing-composite-indicators-methodology-and-user-guide_9789264043466-en.html'],
      ['UK MCDA guide', 'https://analysisfunction.civilservice.gov.uk/policy-store/an-introductory-guide-to-mcda/']
    ]
  }
};

function normalizedWeightProfileWeights(profileKey) {
  const profile = WEIGHT_PROFILES[profileKey] || WEIGHT_PROFILES.expert;
  const keys = Object.keys(WEIGHT_PROFILES.expert.weights);
  const raw = profile.weights || WEIGHT_PROFILES.expert.weights;
  const sum = keys.reduce((s, k) => s + Number(raw[k] || 0), 0) || 1;
  return Object.fromEntries(keys.map(k => [k, Number(raw[k] || 0) / sum]));
}

function applyWeightProfile(profileKey, refresh = true) {
  const key = WEIGHT_PROFILES[profileKey] ? profileKey : 'expert';
  P.weightProfile = key;
  P.weights = normalizedWeightProfileWeights(key);
  P.domW = { ...(WEIGHT_PROFILES[key].domainWeights || WEIGHT_PROFILES.expert.domainWeights) };
  if (refresh) {
    invalidateCachedResults();
    refreshCurrentView(null);
  }
}

function shiftRange(x, shift, mult, loBound, hiBound) {
  return rangedValue(
    clamp((muOf(x) + shift) * mult, loBound, hiBound),
    clamp((loOf(x) + shift) * mult, loBound, hiBound),
    clamp((hiOf(x) + shift) * mult, loBound, hiBound),
    sourceOf(x),
    rangeMetaOf(x)
  );
}

function scalePositiveRange(x, mult, loBound, hiBound) {
  return rangedValue(
    clamp(muOf(x) * mult, loBound, hiBound),
    clamp(loOf(x) * mult, loBound, hiBound),
    clamp(hiOf(x) * mult, loBound, hiBound),
    sourceOf(x),
    rangeMetaOf(x)
  );
}

function sampleGamma(shape, rng) {
  const random = rng ? rng.random01 : random01;
  const gaussian = rng ? rng.randn : randn;
  if (shape < 1) {
    const u = random();
    return sampleGamma(shape + 1, rng) * Math.pow(u, 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    const x = gaussian();
    let v = 1 + c * x;
    if (v <= 0) continue;
    v = v * v * v;
    const u = random();
    if (u < 1 - 0.0331 * x ** 4) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function sampleBeta(alpha, beta, rng) {
  const g1 = sampleGamma(alpha, rng);
  const g2 = sampleGamma(beta, rng);
  return g1 / (g1 + g2);
}

/**
 * Fit a Beta distribution on [min, max] from mean and 90% interval width.
 * σ ≈ (hi − lo) / 3.29 converts a 90% range into a standard deviation estimate. (Method of moments; Johnson et al. 1995)
 */
function fitScaledBeta(rangeObj, min, max, spreadMult) {
  const scale = max - min;
  const mu = clamp((muOf(rangeObj) - min) / scale, 1e-4, 1 - 1e-4);
  const sigma = Math.max(1e-4, ((hiOf(rangeObj) - loOf(rangeObj)) / 3.29) * spreadMult / scale);
  const variance = sigma * sigma;
  const common = mu * (1 - mu) / variance - 1;
  if (!Number.isFinite(common) || common <= 0) return null;
  const alpha = mu * common;
  const beta = (1 - mu) * common;
  if (!(alpha > 0 && beta > 0)) return null;
  return { alpha, beta };
}

/**
 * Sample ordinal MCDA dimensions from a fitted Beta on [1, 5].
 * Beta is the formal bounded alternative to Gaussian + clamping for ordinal-like bounded scores. (Ferreri 2005 Beta scaling practice)
 */
function sampleOrdinalRange(rangeObj, spreadMult, rng) {
  const fit = fitScaledBeta(rangeObj, 1, 5, spreadMult);
  if (fit) return 1 + 4 * sampleBeta(fit.alpha, fit.beta, rng);
  const sigma = ((hiOf(rangeObj) - loOf(rangeObj)) / 3.29) * spreadMult;
  return clamp(rng ? rng.normalSample(muOf(rangeObj), sigma) : normalSample(muOf(rangeObj), sigma), 1, 5);
}

/**
 * Sample positive parameters from a fitted log-normal distribution.
 * σ_ln ≈ (ln hi − ln lo) / 3.29 maps a 90% interval to log-space spread. (Aitchison & Brown 1957 log-normal moments)
 */
function sampleLogNormalRange(rangeObj, spreadMult, loBound, hiBound, rng) {
  const lo = Math.max(loBound, loOf(rangeObj));
  const hi = Math.max(lo * 1.01, hiOf(rangeObj));
  const sigmaLn = Math.max(1e-4, ((Math.log(hi) - Math.log(lo)) / 3.29) * spreadMult);
  const muLn = Math.log(Math.max(loBound, muOf(rangeObj))) - 0.5 * sigmaLn * sigmaLn;
  return clamp(Math.exp(rng ? rng.normalSample(muLn, sigmaLn) : normalSample(muLn, sigmaLn)), loBound, hiBound);
}

function sampleThreatNumerics(scThreat, spreadMult, rng) {
  const sampledGrowthRate = sampleLogNormalRange(scThreat.growth_rate, spreadMult, 0.0005, 0.25, rng);

  return {
    ...scThreat,
    scale: sampleOrdinalRange(scThreat.scale, spreadMult, rng),
    urgency: sampleOrdinalRange(scThreat.urgency, spreadMult, rng),
    acceleration: sampleOrdinalRange(scThreat.acceleration, spreadMult, rng),
    interdependence: sampleOrdinalRange(scThreat.interdependence, spreadMult, rng),
    irreversibility: sampleOrdinalRange(scThreat.irreversibility, spreadMult, rng),
    gov_failure: sampleOrdinalRange(scThreat.gov_failure, spreadMult, rng),

    // Keep sampled raw/proxy growth and preserve metadata separately.
    // growth_rate remains the sampled numeric value for backward compatibility.
    growth_rate: sampledGrowthRate,
    growth_rate_raw: sampledGrowthRate,
    growth_meta: rangeMetaOf(scThreat.growth_rate),

    threshold: sampleLogNormalRange(scThreat.threshold, spreadMult, 4.5, 12, rng),
  };
}

const EFFECTIVE_GROWTH_CAP = 0.08;

/* Raw-indicator to systemic-risk growth calibration. */
const GROWTH_KIND_CONVERSION = Object.freeze({
  effective_risk_growth: 1.00,
  direct_risk_proxy: 1.00,
  event_frequency_growth: 0.70,
  expert_mapping: 0.60,
  indicator_growth: 0.35,
  market_growth: 0.25,
  capability_growth: 0.15,
});

function growthMetaOfThreat(t) {
  if (!t || typeof t !== 'object') return {};
  if (t.growth_meta && typeof t.growth_meta === 'object') return t.growth_meta;
  if (t.growth_rate && typeof t.growth_rate === 'object') return t.growth_rate;
  return {};
}

function growthKindOfThreat(t) {
  const meta = growthMetaOfThreat(t);
  if (typeof meta.growth_kind === 'string' && meta.growth_kind.trim()) {
    return meta.growth_kind.trim();
  }
  // Treat missing growth_kind as calibrated effective growth.
  return 'effective_risk_growth';
}

function riskConversionOfThreat(t) {
  const meta = growthMetaOfThreat(t);

  if (meta.effective_growth_calibrated === true) {
    return 1.0;
  }

  if (Number.isFinite(meta.risk_conversion)) {
    return clamp(meta.risk_conversion, 0, 1);
  }

  const kind = growthKindOfThreat(t);
  return GROWTH_KIND_CONVERSION[kind] ?? 1.0;
}

function effectiveRiskGrowthForThreat(t, rawGrowthRate) {
  const raw = Math.max(0, Number(rawGrowthRate) || 0);
  const meta = growthMetaOfThreat(t);
  const kind = growthKindOfThreat(t);
  const specificCap = Number.isFinite(meta.threat_specific_cap) ? Math.max(0, meta.threat_specific_cap) : EFFECTIVE_GROWTH_CAP;
  const cap = Math.min(EFFECTIVE_GROWTH_CAP, specificCap);
  const calibrated = meta.effective_growth_calibrated === true || kind === 'effective_risk_growth' || kind === 'direct_risk_proxy';
  const converted = calibrated ? raw : Math.log1p(raw) * riskConversionOfThreat(t);
  return clamp(converted, Math.min(0.0005, cap), cap);
}

/**
 * Sample the first-arrival year of an event process from a non-homogeneous Poisson hazard.
 * λ(t) = λ0 × (1 + g)^(t − NOW) lets event risk pressure grow through time instead of freezing it at NOW;
 * after an optional pressure turn (PRESSURE_TURNS) the hazard retraces its rise. (Ross 2014 non-homogeneous Poisson process)
 * Annual hazard is clamped to [1e-5, 5] for numerical stability.
 */
function sampleEventHorizon(priority, growthRate, threshold, rng, turnYear) {
  const u = clamp(rng ? rng.random01() : random01(), 1e-9, 1 - 1e-9);
  const g = Math.max(0, Number(growthRate) || 0);
  // The baseline hazard floor is distinct from the already capped growth rate.
  const lambda0 = Math.max(1e-5, (priority / threshold) * g * 2);
  const turned = Number.isFinite(turnYear);
  let cumHazard = 0;
  for (let yr = NOW; yr <= YE; yr++) {
    // After a sampled pressure turn the hazard retraces its rise with the pressure.
    const years = turned && yr > turnYear ? 2 * turnYear - yr - NOW : yr - NOW;
    const lambdaYr = clamp(lambda0 * Math.pow(1 + g, years), 1e-5, 5);
    cumHazard += lambdaYr;
    if (1 - Math.exp(-cumHazard) >= u) return yr;
  }
  return YE + 1;
}

/**
 * Regime transitions use the same sampled latent-pressure first-passage rule as
 * continuous threats. The state change may be abrupt, but its arrival is not
 * assigned an additional uncalibrated geometric clock. Monte Carlo variation
 * comes from the sampled score, growth and threshold inputs.
 */
function sampleRegimeHorizon(priority, growthRate, threshold) {
  return computeHorizon(priority, growthRate, threshold);
}

function deterministicEventHorizon(priority, growthRate, threshold) {
  const g = Math.max(0, Number(growthRate) || 0);
  // The baseline hazard floor is distinct from the already capped growth rate.
  const lambda0 = Math.max(1e-5, (priority / threshold) * g * 2);
  // Median first-arrival year solves H(t) = ln(2) for the cumulative hazard H(t) of the non-homogeneous Poisson process. (Ross 2014 NHPP cumulative hazard)
  let cumHazard = 0;
  for (let yr = NOW; yr <= YE; yr++) {
    const lambdaYr = clamp(lambda0 * Math.pow(1 + g, yr - NOW), 1e-5, 5);
    cumHazard += lambdaYr;
    if (cumHazard >= Math.log(2)) return yr;
  }
  return YE + 1;
}

function deterministicRegimeHorizon(priority, growthRate, threshold) {
  return computeHorizon(priority, growthRate, threshold);
}

/**
 * First passage when the pressure peaks in turnYear and then declines (PRESSURE_TURNS): a
 * crossing that has not happened by the turn year never happens.
 */
function turnedHorizon(horizon, turnYear) {
  return Number.isFinite(turnYear) && horizon > turnYear ? YE + 1 : horizon;
}

// turnYear is optional and used only by the Monte Carlo; stochastic event horizons follow the mirrored hazard.
function computeThreatHorizon(priority, growthRate, threshold, processType, stochastic, rng, turnYear) {
  threshold = Number(threshold);
  if (!Number.isFinite(threshold)) threshold = GLOBAL_THRESHOLD;
  threshold = clamp(threshold, THRESHOLD_MIN, THRESHOLD_MAX);
  if (priority <= 0 || !Number.isFinite(priority)) return YE + 1;
  if (processType === 'event') return stochastic ? sampleEventHorizon(priority, growthRate, threshold, rng, turnYear) : deterministicEventHorizon(priority, growthRate, threshold);
  if (processType === 'regime') return turnedHorizon(stochastic ? sampleRegimeHorizon(priority, growthRate, threshold, rng) : deterministicRegimeHorizon(priority, growthRate, threshold), turnYear);
  return turnedHorizon(computeHorizon(priority, growthRate, threshold), turnYear);
}


function baseScore(t, w) {
  w = w || P.weights;
  return w.scale * muOf(t.scale)
       + w.urgency * muOf(t.urgency)
       + w.acceleration * muOf(t.acceleration)
       + w.interdependence * muOf(t.interdependence)
       + w.irreversibility * muOf(t.irreversibility)
       + w.gov_failure * muOf(t.gov_failure);
}

/**
 * Dependency amplification factor for threat i given all threats.
 * Neighbour pressure is the mean direct-neighbour salience on [0, 1], and topology scaling uses the current graph's
 * out-degree relative to the network mean so dense neighbourhoods amplify without introducing an unconstrained tuning constant.
 * This is a degree-normalized exposure heuristic inspired by Bonacich-style network influence. (Bonacich 1987)
 */
function depFactor(t, all, params) {
  params = params || P;
  const direct = (t.deps || []).map(id => all.find(x => x.id === id)).filter(Boolean);
  if (!direct.length) return 1;
  const q = x => ((muOf(x.scale) + muOf(x.urgency) + muOf(x.interdependence)) / 3) / 5;
  const meanQ = direct.reduce((s, x) => s + q(x), 0) / direct.length;
  const topologyScale = 1 + direct.length / Math.max(1, MEAN_OUT_DEGREE);
  const maxScale = 1 + MAX_OUT_DEGREE / Math.max(1, MEAN_OUT_DEGREE);
  return clamp(1 + meanQ * params.depAlpha * topologyScale, 1, 1 + params.depAlpha * maxScale);
}

/* Scenario shifts are clamped to [1, 5]. */
function applyScenario(t, scKey) {
  const sc = SC[scKey] || SC.baseline;
  const s = sc.s;
  const dm = (sc.domMult[t.domain] || 1);
  const grM = (sc.grMult[t.domain] || 1);
  const tM = (sc.threatMult[t.id] || 1); // per-threat stress multiplier

  return {
    ...t,
    scale: shiftRange(t.scale, s.sc, dm * tM, 1, 5),
    urgency: shiftRange(t.urgency, s.ur, dm * tM, 1, 5),
    acceleration: shiftRange(t.acceleration, s.ac, dm * tM, 1, 5),
    interdependence: shiftRange(t.interdependence, s.id, dm * tM, 1, 5),
    irreversibility: shiftRange(t.irreversibility, s.ir, dm, 1, 5),
    gov_failure: shiftRange(t.gov_failure, s.gf, dm * tM, 1, 5),
    growth_rate: scalePositiveRange(t.growth_rate, grM * tM, 0.0005, 0.25),
  };
}

function buildEnriched(scKey, params) {
  params = params || P;
  const adj = THREATS.map(t => applyScenario(t, scKey));

  return adj.map(t => {
    const bs = baseScore(t, params.weights);
    const priority = bs * depFactor(t, adj, params) * domainWeightMultiplier(t.domain, params);
    const threshold = getThreatThreshold(t, params.thresholdPolicy || THRESHOLD_POLICY);

    const rawGrowth = muOf(t.growth_rate);
    const effectiveGrowth = effectiveRiskGrowthForThreat(t, rawGrowth);

    const horizon = computeThreatHorizon(
      priority,
      effectiveGrowth,
      threshold,
      t.process_type,
      false
    );

    return {
      ...t,
      bs,
      priority,
      threshold_value: threshold,
      growth_rate_raw: rawGrowth,
      growth_rate_effective: effectiveGrowth,
      horizon,
    };
  });
}

function calcGSI(enriched) {
  if (!enriched.length || !GLOBAL_STRESS_CAPACITY) return 0;
  const weighted = enriched.reduce((s, t) => s + t.priority, 0);
  return clamp((weighted / GLOBAL_STRESS_CAPACITY) * 100, 0, 100);
}

function normalizedDomainWeights(domW) {
  const keys = ['civilization', 'biosphere', 'technology'];
  const values = keys.map(key => domW && domW[key]);
  if (!values.every(value => Number.isFinite(value) && value >= 0)) {
    throw new Error('Domain weights must be finite, non-negative numbers.');
  }
  const total = values.reduce((s, v) => s + v, 0);
  if (!(total > 0)) throw new Error('Domain weights cannot all be zero.');
  return {
    civilization: domW.civilization / total,
    biosphere: domW.biosphere / total,
    technology: domW.technology / total,
  };
}

function domainWeightMultiplier(domain, params) {
  const norm = normalizedDomainWeights((params || P).domW || {});
  const domainCount = Object.keys(norm).length || 1;
  const mult = norm[domain] * domainCount;
  return Number.isFinite(mult) && mult >= 0 ? mult : 1;
}

function compensatoryShareByYear(enriched, yr) {
  const totalPri = enriched.reduce((s, t) => s + t.priority, 0) || 1;
  const crossedPri = enriched.reduce((s, t) => s + (t.horizon <= yr ? t.priority : 0), 0);
  return crossedPri / totalPri;
}

function normalizedHorizonSignal(horizon) {
  if (!Number.isFinite(horizon) || horizon > YE) return 0;
  return 1 - clamp((horizon - YS) / Math.max(1, YE - YS), 0, 1);
}

/**
 * Continuous composite response for exploratory sensitivity.
 * Combining GSI, compensatory threshold-share by 2035/2050, and normalized central horizon reduces discrete-year artefacts
 * when compared with using a single threshold year alone. (screening-style composite response; heuristic variance target)
 */
function exploratorySensitivityTarget(enriched, params) {
  const years = computeAggregateYears(enriched, params);
  const gsi = calcGSI(enriched) / 100;
  const share2035 = compensatoryShareByYear(enriched, 2035);
  const share2050 = compensatoryShareByYear(enriched, 2050);
  const horizon = normalizedHorizonSignal(years.comp);
  return 0.35 * gsi + 0.20 * share2035 + 0.20 * share2050 + 0.25 * horizon;
}

/* Monte Carlo horizon ensemble. */
let _cdfCurves = {};
function buildCdf(sortedCrossings, n) {
  const cdf = [];
  let ptr = 0;
  for (let yr = YS; yr <= YE; yr++) {
    while (ptr < sortedCrossings.length && sortedCrossings[ptr] <= yr) ptr++;
    cdf.push({ year: yr, prob: ptr / n });
  }
  return cdf;
}

function summarizeCrossings(crossing, nSim, rng) {
  const sorted = [...crossing].sort((a, b) => a - b);
  const cdf = buildCdf(sorted, nSim);
  const bootstrapRng = rng || createRngContext(`${DEFAULT_MC_SEED}:bootstrap`);
  const BS = 160;
  const bsP50s = [];
  const bsCdfs = [];
  for (let b = 0; b < BS; b++) {
    const sample = Array.from({ length: nSim }, () => sorted[0 | bootstrapRng.random01() * nSim]).sort((a, c) => a - c);
    bsP50s.push(quantile(sample, 0.5));
    bsCdfs.push(buildCdf(sample, nSim).map(x => x.prob));
  }
  bsP50s.sort((a, b) => a - b);
  const bLo = [], bHi = [];
  for (let yi = 0; yi < YR; yi++) {
    const vals = bsCdfs.map(row => row[yi]).sort((a, b) => a - b);
    bLo.push(quantile(vals, 0.10));
    bHi.push(quantile(vals, 0.90));
  }
  const p10 = quantile(sorted, 0.10);
  const p50 = quantile(sorted, 0.50);
  const p90 = quantile(sorted, 0.90);
  const mean = sorted.reduce((s, v) => s + v, 0) / sorted.length;
  const samplingSigma = Math.sqrt(sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / sorted.length);
  const bsMean = bsP50s.reduce((sum, value) => sum + value, 0) / bsP50s.length;
  const parameterSigma = Math.sqrt(bsP50s.reduce((sum, value) => sum + (value - bsMean) ** 2, 0) / (bsP50s.length - 1));
  const censorFraction = sorted.filter(year => year > YE).length / sorted.length;
  return {
    crossing: sorted, cdf, bLo, bHi, p10, p50, p90, samplingSigma, parameterSigma,
    censorFraction,
    medianCensored: p50 > YE,
    censorCodeYear: YE + 1,
    estimand: 'horizon-coded crossing times; no crossing by YE is coded as YE + 1; dispersion and bootstrap precision describe these coded times, not unidentified actual crossing times',
  };
}

/**
 * Graph-weighted Gaussian aggregation score from latent z-scores and graph-derived correlations.
 * This is a latent-normal graph aggregation heuristic rather than a full joint copula, and the UI describes it as a structural aggregation choice rather than an empirical truth. (latent-normal approximation; Nelsen 2006)
 */
function graphAggregationScoreForYear(enriched, yr) {
  const weights = enriched.map(t => t.priority);
  const totalW = weights.reduce((s, v) => s + v, 0) || 1;
  const q = enriched.map(t => {
    const crossed = t.horizon <= yr;
    const ratio = clamp(t.priority / getThreatThreshold(t), 0, 1.4);
    const u = crossed
      ? clamp(0.58 + 0.28 * ratio, 0.58, 0.97)
      : clamp(0.03 + 0.16 * ratio * ((yr - YS + 1) / YR), 0.03, 0.45);
    return normInv(u);
  });
  let meanQ = 0;
  let variance = 0;
  for (let i = 0; i < enriched.length; i++) meanQ += (weights[i] / totalW) * q[i];
  for (let i = 0; i < enriched.length; i++) {
    for (let j = 0; j < enriched.length; j++) {
      const graphI = DEP_GRAPH.idx[enriched[i].id];
      const graphJ = DEP_GRAPH.idx[enriched[j].id];
      const graphWeight = Number.isInteger(graphI) && Number.isInteger(graphJ) ? DEP_GRAPH.matrix[graphI][graphJ] : 0;
      variance += (weights[i] / totalW) * (weights[j] / totalW) * graphWeight;
    }
  }
  return normCdf(meanQ / Math.sqrt(Math.max(variance, 1e-6)));
}

/**
 * Compensatory crossing year for a basket of threats under the current global threshold.
 * The basket crosses once the share of weighted priorities with horizon <= year reaches the slider threshold.
 * (weighted-share threshold crossing rule)
 */
function computeCompensatoryCrossing(enriched, threshold) {
  const totalPri = enriched.reduce((s, t) => s + t.priority, 0) || 1;
  for (let yr = YS; yr <= YE; yr++) {
    const crossedW = enriched.reduce((s, t) => s + (t.horizon <= yr ? t.priority : 0), 0);
    if (crossedW / totalPri >= threshold) return yr;
  }
  return YE + 1;
}

/**
 * Structural ensemble of four aggregation rules over the same threat horizons.
 * Compensatory = weighted-share threshold, Max-rule = earliest single-threat crossing, graph-weighted Gaussian = dependence-linked joint score threshold,
 * Dynamic cascade = year-by-year dependency propagation.
 * Running them in parallel exposes model-structure uncertainty rather than parameter uncertainty alone. (multi-model ensemble framing)
 */
function computeAggregateYears(enriched, params, cascadeResult) {
  const comp = computeCompensatoryCrossing(enriched, params.threshold);
  let graphWeighted = YE + 1;
  const maxRule = enriched.reduce((m, t) => Math.min(m, t.horizon), YE + 1);
  for (let yr = YS; yr <= YE; yr++) {
    if (graphWeighted > YE && graphAggregationScoreForYear(enriched, yr) >= params.threshold) graphWeighted = yr;
    if (graphWeighted <= YE) break;
  }
  const dynamicCascade = cascadeResult ? cascadeResult.year : computeDynamicCascadeCrossing(enriched, params);
  return { comp, maxRule, graphWeighted, dynamicCascade };
}

function dependencyExposure(target, active, byId) {
  const deps = (target.deps || []).filter(id => byId.has(id));
  return clamp(deps.reduce((sum, id) => sum + (active.has(id) ? (target.dependency_weights?.[id] ?? 1 / Math.max(1, deps.length)) : 0), 0), 0, 1);
}

function cascadeVulnerability(t) {
  // Ordinal capacity-loss susceptibility, not an estimated probability.
  return clamp((muOf(t.interdependence) - 1) / 4, 0, 1) * (0.5 + 0.5 * clamp((muOf(t.gov_failure) - 1) / 4, 0, 1));
}

function cascadePressureRatio(t, year, params) {
  // Use pre-network base pressure for susceptibility: avoid counting background depFactor again.
  const base = Number.isFinite(t.bs) ? t.bs * domainWeightMultiplier(t.domain, params || P) : t.priority;
  const threshold = t.threshold_value ?? getThreatThreshold(t, (params || P).thresholdPolicy);
  const growth = t.growth_rate_effective ?? effectiveRiskGrowthForThreat(t, muOf(t.growth_rate));
  return clamp(Math.max(0, base || 0) / threshold * Math.pow(1 + Math.max(0, growth), Math.max(0, year - NOW)), 0, 1);
}

function functionalCascadeNodes(enriched, params) {
  const ids = new Set(enriched.map(t => t.id));
  return enriched.map(t => {
    const deps = (t.deps || []).filter(id => ids.has(id) && id !== t.id);
    return { id: t.id, domain: t.domain, weight: t.functional_weight ?? 1, services: [...(t.critical_services || [])], overlapGroup: t.functional_overlap_group || t.id,
      dependencies: deps.map(id => ({ id, weight: t.dependency_weights?.[id] ?? 1 / Math.max(1, (t.deps || []).length), lag: params?.propagationLagYears ?? t.dependency_lags?.[id] ?? 0 })),
      inducible: t.functional_inducible ?? true,
      pressureRatio: cascadePressureRatio(t, NOW, params),
      growth: t.growth_rate_effective ?? effectiveRiskGrowthForThreat(t, muOf(t.growth_rate)),
      vulnerability: cascadeVulnerability(t), spontaneousYear: Number.isFinite(t.horizon) ? t.horizon : YE + 1,
      ...(Number.isFinite(t.pressure_turn_year) ? { turnYear: t.pressure_turn_year, recoveryDrop: t.pressure_recovery_drop ?? null } : {}) };
  });
}

function configuredFunctionalCascadeNodes(enriched, params) {
  params = params || P;
  const nodes = functionalCascadeNodes(enriched, params);
  if (params.functionalServiceRule === 'global_only') nodes.forEach(node => { node.services = []; });
  if (params.functionalWeightRule === 'equal') nodes.forEach(node => { node.weight = 1; });
  if (Number.isFinite(params.dependencyScale)) nodes.forEach(node => { node.vulnerability = clamp(node.vulnerability * params.dependencyScale, 0, 1); });
  return nodes;
}

function simulateFunctionalCascade(enriched, params, options) {
  params = params || P;
  const nodes = configuredFunctionalCascadeNodes(enriched, params);
  return FunctionalCascade.simulate({ nodes, startYear: YS, pressureYear: NOW, endYear: YE,
    threshold: params.cascadeThreshold ?? 0.50, ...(options || {}) });
}

function computeDomainFunctionalCrossing(enriched, cascadeResult, domain, params) {
  params = params || P;
  return FunctionalCascade.firstCrossingFromActivationYears({
    nodes: configuredFunctionalCascadeNodes(enriched, params),
    activationYears: cascadeResult.firstActivationYears,
    activationCauses: cascadeResult.activationCauses,
    activeIntervals: cascadeResult.activeIntervals,
    startYear: YS,
    endYear: YE,
    threshold: params.cascadeThreshold ?? 0.50,
    domain,
  }).year;
}

function activeTransmissionShare(enriched, active) {
  let possible = 0;
  let transmitted = 0;
  const byId = new Map(enriched.map(t => [t.id, t]));
  enriched.forEach(target => {
    (target.deps || []).forEach(depId => {
      const dep = byId.get(depId);
      if (!dep) return;
      const edgeWeight = Math.sqrt(Math.max(0.001, target.priority || 1) * Math.max(0.001, dep.priority || 1));
      possible += edgeWeight;
      if (active.has(dep.id) && active.has(target.id)) transmitted += edgeWeight;
    });
  });
  return possible ? transmitted / possible : 0;
}

/**
 * Year-by-year cascade propagation model.
 * A dependency listed on target T is treated as an upstream pressure source for T:
 * once enough upstream dependencies are active, vulnerable targets can be pulled
 * forward before their standalone horizon. The cascade crossing year is the first
 * year where weighted functional loss reaches the chosen threshold globally or
 * within an essential-service basket. Domains, co-active edges and induced share
 * are diagnostic, not vetoes. One seed may propagate to initially censored nodes.
 */
function computeDynamicCascadeCrossing(enriched, params) {
  return simulateFunctionalCascade(enriched, params).year;
}

function explainCascadeCrossing(enriched, params) {
  const result = simulateFunctionalCascade(enriched, params, { collectTrace: true });
  // Compatibility diagnostics only: co-active edges are not proof of causal transmission.
  return { ...result, transmissionShare: activeTransmissionShare(enriched, new Set(result.activeThreats)),
    cascadeBoost: result.functionalLoss, cascadeBoostMeaning: 'legacy key: functional-loss score, no additive boost' };
}

/**
 * Composite response target for quick sensitivity screens combines near-term crossing shares
 * with a normalized central horizon so small but real probability shifts remain visible even
 * when the median calendar year itself does not move. (screening-style scalar response target)
 */
function oatCompositeResponseFromYears(sortedYears, sampleSize) {
  if (!sortedYears.length) return { p50: YE + 1, p2035: 0, p2050: 0, normalizedHorizon: 0, score: 0 };
  const p50 = quantile(sortedYears, 0.5);
  const p2035 = sortedYears.filter(year => year <= 2035).length / Math.max(1, sampleSize);
  const p2050 = sortedYears.filter(year => year <= 2050).length / Math.max(1, sampleSize);
  const normalizedHorizon = 1 - clamp((p50 - NOW) / Math.max(1, YE - NOW), 0, 1);
  const score = 0.45 * p2035 + 0.45 * p2050 + 0.10 * normalizedHorizon;
  return { p50, p2035, p2050, normalizedHorizon, score };
}

function pairedOatBootstrapStandardErrors(baseYears, upYears, dnYears, rng) {
  const n = baseYears.length;
  if (n < 2) return { upMcSe: 0, dnMcSe: 0 };
  const upContrasts = [], dnContrasts = [];
  for (let b = 0; b < 160; b++) {
    const base = [], up = [], dn = [];
    for (let i = 0; i < n; i++) {
      const index = Math.floor(rng.random01() * n);
      base.push(baseYears[index]); up.push(upYears[index]); dn.push(dnYears[index]);
    }
    const score = values => oatCompositeResponseFromYears(values.sort((a, c) => a - c), n).score;
    const baseScore = score(base);
    upContrasts.push((score(up) - baseScore) * 100);
    dnContrasts.push((baseScore - score(dn)) * 100);
  }
  const standardDeviation = values => {
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1));
  };
  return { upMcSe: standardDeviation(upContrasts), dnMcSe: standardDeviation(dnContrasts) };
}

function createMonteCarloAccumulator() {
  return {
    compCrossing: [],
    maxCrossing: [],
    graphCrossing: [],
    cascadeCrossing: [],
    cascadeAboveAtEnd: [],
    cascadeBackBelowYear: [],
    globalThresholdCascadeCrossing: [],
    domainCrossing: {
      civilization: [],
      biosphere: [],
      technology: [],
    },
    threatHorizonSamples: Object.fromEntries(THREATS.map(t => [t.id, []])),
    functionalHorizonSamples: Object.fromEntries(THREATS.map(t => [t.id, []])),
  };
}

function enrichMonteCarloThreats(sampled, params, rng) {
  return sampled.map(t => {
    const bs = baseScore(t, params.weights);
    const priority = bs * depFactor(t, sampled, params) * domainWeightMultiplier(t.domain, params);
    const threshold = getThreatThreshold(t, params.thresholdPolicy || THRESHOLD_POLICY);
    const rawGrowth = t.growth_rate;
    const effectiveGrowth = effectiveRiskGrowthForThreat(t, rawGrowth);
    const horizon = computeThreatHorizon(priority, effectiveGrowth, threshold, t.process_type, true, rng, t.pressure_turn_year);

    return {
      ...t,
      bs,
      priority,
      threshold_value: threshold,
      growth_rate_raw: rawGrowth,
      growth_rate_effective: effectiveGrowth,
      horizon,
    };
  });
}

function applyGlobalThresholdToSample(enriched, rng) {
  return enriched.map(t => {
    const threshold = getThreatThreshold(t, 'global');
    return {
      ...t,
      threshold_value: threshold,
      horizon: computeThreatHorizon(t.priority, t.growth_rate_effective, threshold, t.process_type, true, rng, t.pressure_turn_year),
    };
  });
}

function recordMonteCarloSample(acc, enriched, globalThresholdEnriched, params) {
  enriched.forEach(t => acc.threatHorizonSamples[t.id].push(t.horizon));

  const functional = simulateFunctionalCascade(enriched, params, { collectAll: true });
  enriched.forEach(t => acc.functionalHorizonSamples[t.id].push(functional.firstActivationYears[t.id]));
  acc.cascadeAboveAtEnd.push(functional.aboveThresholdAtEnd);
  acc.cascadeBackBelowYear.push(functional.backBelowYear);
  const years = computeAggregateYears(enriched, params, functional);
  acc.compCrossing.push(years.comp);
  acc.maxCrossing.push(years.maxRule);
  acc.graphCrossing.push(years.graphWeighted);
  acc.cascadeCrossing.push(years.dynamicCascade);
  acc.globalThresholdCascadeCrossing.push(computeAggregateYears(globalThresholdEnriched, params).dynamicCascade);

  Object.keys(acc.domainCrossing).forEach(domain => {
    acc.domainCrossing[domain].push(computeDomainFunctionalCrossing(enriched, functional, domain, params));
  });
}

function summarizeThreatHorizonSamples(threatHorizonSamples) {
  const threatStats = {};
  THREATS.forEach(t => {
    const samples = threatHorizonSamples[t.id].sort((a, b) => a - b);
    threatStats[t.id] = {
      p10: quantile(samples, 0.10),
      p50: quantile(samples, 0.50),
      p90: quantile(samples, 0.90),
      p2050: samples.length ? samples.filter(s => s <= 2050).length / samples.length : 0,
      censorFraction: samples.length ? samples.filter(s => s > YE).length / samples.length : 0,
    };
  });
  return threatStats;
}

function pairedQuantileContrastStandardError(baseYears, alternativeYears, q, rng) {
  const n = baseYears.length;
  if (n < 2) return 0;
  const contrasts = [];
  for (let b = 0; b < 160; b++) {
    const base = [], alternative = [];
    for (let i = 0; i < n; i++) {
      const index = Math.floor(rng.random01() * n);
      base.push(baseYears[index]); alternative.push(alternativeYears[index]);
    }
    contrasts.push(quantile(alternative.sort((a, c) => a - c), q) - quantile(base.sort((a, c) => a - c), q));
  }
  const mean = contrasts.reduce((sum, value) => sum + value, 0) / contrasts.length;
  return Math.sqrt(contrasts.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (contrasts.length - 1));
}

/** How many Dynamic Cascade runs that reached the threshold are below it again in the last model year. */
function summarizeCascadeRecovery(acc) {
  let crossedRuns = 0;
  let backBelowAtEnd = 0;
  const firstBackBelow = [];
  acc.cascadeCrossing.forEach((year, i) => {
    if (year > YE) return;
    crossedRuns++;
    if (!acc.cascadeAboveAtEnd[i]) backBelowAtEnd++;
    if (acc.cascadeBackBelowYear[i] <= YE) firstBackBelow.push(acc.cascadeBackBelowYear[i]);
  });
  firstBackBelow.sort((a, b) => a - b);
  return {
    crossedRuns,
    backBelowAtEnd,
    shareOfCrossed: crossedRuns ? backBelowAtEnd / crossedRuns : 0,
    everBackBelow: firstBackBelow.length,
    firstBackBelowP50: firstBackBelow.length ? quantile(firstBackBelow, 0.5) : null,
    meaning: `Runs that reached the Dynamic Cascade threshold and are below it again in ${YE} because failed threats recovered after a pressure turn. The clocks still date the first crossing.`,
  };
}

function summarizeMonteCarloAccumulator(acc, nSim, seed, thresholdPolicy = THRESHOLD_POLICY) {
  const summaryRng = label => createRngContext(`${normalizeMonteCarloSeed(seed)}:bootstrap:${label}`);
  const thresholdMcStandardError = pairedQuantileContrastStandardError(acc.cascadeCrossing,
    acc.globalThresholdCascadeCrossing, 0.90, summaryRng('paired-threshold-contrast'));
  const compSummary = summarizeCrossings(acc.compCrossing, nSim, summaryRng('compensatory'));
  const maxSummary = summarizeCrossings(acc.maxCrossing, nSim, summaryRng('max-rule'));
  const graphSummary = summarizeCrossings(acc.graphCrossing, nSim, summaryRng('graph'));
  const cascadeSummary = summarizeCrossings(acc.cascadeCrossing, nSim, summaryRng('cascade'));
  const globalThresholdCascadeSummary = summarizeCrossings(acc.globalThresholdCascadeCrossing, nSim, summaryRng('global-threshold-cascade'));
  const domainStats = Object.fromEntries(
    Object.entries(acc.domainCrossing).map(([domain, crossing]) => [domain, summarizeCrossings(crossing, nSim, summaryRng(`domain:${domain}`))])
  );
  const structuralSigma = Math.max(compSummary.p50, maxSummary.p50, graphSummary.p50, cascadeSummary.p50) - Math.min(compSummary.p50, maxSummary.p50, graphSummary.p50, cascadeSummary.p50);

  return {
    ...compSummary,
    threatStats: summarizeThreatHorizonSamples(acc.threatHorizonSamples),
    functionalStats: summarizeThreatHorizonSamples(acc.functionalHorizonSamples),
    functionalStatsMeaning: 'First functional-threshold activation, spontaneous or induced. Not extinction, permanent failure or completion of collapse.',
    domainStats,
    cascadeRecovery: summarizeCascadeRecovery(acc),
    domainStatsMeaning: 'Within-domain functional-loss first crossing after full-system directed propagation, using the same criticality, overlap, essential-service and cascade-threshold rules as the headline model, including each run’s sampled structure. Domain-specific denominators mean these are not additive parts of the system horizon.',
    structuralSigma,
    ensemble: {
      compensatory: compSummary,
      maxRule: maxSummary,
      graphWeighted: graphSummary,
      dynamicCascade: cascadeSummary,
    },
    thresholdRobustness: {
      label: 'Threshold robustness check — diagnostic only, does not overwrite the main clock date.',
      policy: thresholdPolicy,
      globalThreshold: GLOBAL_THRESHOLD,
      perThreatHeadline: cascadeSummary.p90,
      globalHeadline: globalThresholdCascadeSummary.p90,
      deltaYears: globalThresholdCascadeSummary.p90 - cascadeSummary.p90,
      mcStandardErrorYears: thresholdMcStandardError,
      mcErrorMethod: 'paired bootstrap standard deviation of the P90 contrast; 160 resamples',
      pairedRandomInputs: true,
      estimand: 'global minus current-policy P90 of horizon-coded times; not an identified actual-time contrast when either P90 is censored',
      currentP90Censored: cascadeSummary.p90 > YE,
      globalP90Censored: globalThresholdCascadeSummary.p90 > YE,
      currentCensorFraction: cascadeSummary.censorFraction,
      globalCensorFraction: globalThresholdCascadeSummary.censorFraction,
    },
  };
}

/**
 * Structural uncertainty of the functional cascade (model 1.5.0). These choices are model
 * judgments rather than measurements, so every main Monte Carlo run samples them around the
 * dataset's declared values:
 * - cascade threshold: uniform 0.40 to 0.60 (declared 0.50);
 * - criticality levels 1/2/3: each level value uniform within ±0.5, so levels keep their order;
 * - dependency weights: Dirichlet with the declared weights as mean, concentration 2 per edge;
 * - dependency lags: whole years, uniform 0 to 5 (declared 1);
 * - growth class: each threat moves one class down (25%), stays (50%) or moves up (25%) on the
 *   ladder 0.003 / 0.01 / 0.02 / 0.03, continued beyond both ends by the adjacent step ratio.
 *   The shifted growth still passes through effectiveRiskGrowthForThreat, whose caps can cut an
 *   upward move short (Climate Breakdown and AI at their central growth).
 * Structural draws use their own seeded streams, one per component, so a run's parameter and
 * process draws are the same with structural sampling on or off. With
 * params.structuralUncertainty === false the Monte Carlo reproduces model 1.3.0 exactly.
 * Deterministic views and the sensitivity diagnostics keep the declared structure.
 */
const STRUCTURAL_UNCERTAINTY = Object.freeze({
  cascadeThreshold: Object.freeze({ lo: 0.40, hi: 0.60 }),
  criticalityLevelHalfWidth: 0.5,
  dependencyWeightConcentration: 2,
  dependencyLagYears: Object.freeze({ lo: 0, hi: 5 }),
  growthClassLadder: Object.freeze([0.003, 0.01, 0.02, 0.03]),
  growthClassShift: Object.freeze({ down: 0.25, up: 0.25 }),
});
const STRUCTURAL_COMPONENTS = Object.freeze(['threshold', 'criticality', 'dependencyWeights', 'lags', 'growthClass']);

function structuralComponentsOf(params) {
  if (!params || params.structuralUncertainty === false) return [];
  const selected = params.structuralComponents;
  return STRUCTURAL_COMPONENTS.filter(name => !selected || selected[name]);
}

function growthClassFactors(declaredMu) {
  const ladder = STRUCTURAL_UNCERTAINTY.growthClassLadder;
  const last = ladder.length - 1;
  const extended = [ladder[0] * ladder[0] / ladder[1], ...ladder, ladder[last] * ladder[last] / ladder[last - 1]];
  let index = 1;
  for (let i = 2; i <= ladder.length; i++) {
    if (Math.abs(Math.log(declaredMu / extended[i])) < Math.abs(Math.log(declaredMu / extended[index]))) index = i;
  }
  return { down: extended[index - 1] / extended[index], up: extended[index + 1] / extended[index] };
}

/** Per-run-series state for structural sampling, or null when it is switched off. */
function createStructuralContext(params) {
  const components = structuralComponentsOf(params);
  if (!components.length) return null;
  const base = `${normalizeMonteCarloSeed(params.seed || DEFAULT_MC_SEED)}:structure`;
  const context = { growthFactors: new Map(THREATS.map(t => [t.id, growthClassFactors(muOf(t.growth_rate))])) };
  STRUCTURAL_COMPONENTS.forEach(name => { context[name] = components.includes(name) ? createRngContext(`${base}:${name}`) : null; });
  return context;
}

/** Draws one run's structural choices; returns the structured threats and the run's parameters. */
function applyStructuralUncertainty(sampled, params, context) {
  if (!context) return { threats: sampled, params };
  const spec = STRUCTURAL_UNCERTAINTY;
  const runParams = context.threshold
    ? { ...params, cascadeThreshold: spec.cascadeThreshold.lo + context.threshold.random01() * (spec.cascadeThreshold.hi - spec.cascadeThreshold.lo) }
    : params;
  let levelValues = null;
  if (context.criticality) {
    const levels = [...new Set(sampled.map(t => t.functional_weight ?? 1))].sort((a, b) => a - b);
    levelValues = new Map(levels.map(level => [level, level + (2 * context.criticality.random01() - 1) * spec.criticalityLevelHalfWidth]));
  }
  const lagSpan = spec.dependencyLagYears.hi - spec.dependencyLagYears.lo + 1;
  const threats = sampled.map(t => {
    const next = { ...t };
    if (levelValues) next.functional_weight = levelValues.get(t.functional_weight ?? 1);
    if (context.growthClass) {
      const u = context.growthClass.random01();
      const factors = context.growthFactors.get(t.id);
      if (factors && u < spec.growthClassShift.down) next.growth_rate = t.growth_rate * factors.down;
      else if (factors && u >= 1 - spec.growthClassShift.up) next.growth_rate = t.growth_rate * factors.up;
    }
    const deps = [...(t.deps || [])].sort();
    if (context.dependencyWeights && deps.length) {
      const declared = deps.map(id => t.dependency_weights?.[id] ?? 1 / deps.length);
      const total = declared.reduce((sum, weight) => sum + weight, 0);
      const draws = declared.map(weight => (total > 0 ? sampleGamma(spec.dependencyWeightConcentration * deps.length * weight / total, context.dependencyWeights) : 0));
      const drawSum = draws.reduce((sum, value) => sum + value, 0);
      if (drawSum > 0) next.dependency_weights = { ...t.dependency_weights, ...Object.fromEntries(deps.map((id, i) => [id, total * draws[i] / drawSum])) };
    }
    if (context.lags && deps.length) {
      next.dependency_lags = { ...t.dependency_lags, ...Object.fromEntries(deps.map(id => [id, spec.dependencyLagYears.lo + Math.floor(context.lags.random01() * lagSpan)])) };
    }
    return next;
  });
  return { threats, params: runParams };
}

/**
 * Pressure turns and recovery (model 1.5.0). The dataset's growth priors describe continued
 * pressure and say nothing about whether or when a threat's pressure could peak and decline; no
 * historical base rates are used. Each main Monte Carlo run therefore gives every threat,
 * independently, an even chance of a turn by 2100, in a year drawn uniformly from 2027 to 2100.
 * After the turn the pressure retraces its rise at the same rate, so a crossing that has not
 * happened by the turn year never happens. After its turn, a failed cascade node recovers once its
 * drive has fallen by recoveryDrop below its level at failure; the drop follows the declared
 * reversibility class, and irreversible threats do not recover. Turn draws use their own seeded
 * stream, two per threat per run, so parameter, structural and process draws stay paired. With
 * params.pressureTurns === false the Monte Carlo reproduces the structural-sampling-only result exactly. Deterministic
 * views and the sensitivity diagnostics keep the declared continued-pressure path.
 */
const PRESSURE_TURNS = Object.freeze({
  probabilityBy2100: 0.5,
  firstYear: NOW + 1,
  lastYear: YE,
  recoveryDrop: Object.freeze({ reversible: 0.25, partial: 0.5, irreversible: null }),
});

/** Per-run-series state for pressure turns, or null when they are switched off. */
function createPressureTurnContext(params) {
  if (!params || params.pressureTurns === false) return null;
  return {
    rng: createRngContext(`${normalizeMonteCarloSeed(params.seed || DEFAULT_MC_SEED)}:turn`),
    recoveryDrop: new Map(THREATS.map(t => [t.id, PRESSURE_TURNS.recoveryDrop[reversibilityTypeForThreat(t)] ?? null])),
  };
}

/** Draws one run's pressure turns; returns new objects for turned threats and leaves the inputs untouched. */
function applyPressureTurns(threats, context) {
  if (!context) return threats;
  const spec = PRESSURE_TURNS;
  const span = spec.lastYear - spec.firstYear + 1;
  return threats.map(t => {
    const turns = context.rng.random01() < spec.probabilityBy2100;
    const turnYear = spec.firstYear + Math.floor(context.rng.random01() * span);
    return turns ? { ...t, pressure_turn_year: turnYear, pressure_recovery_drop: context.recoveryDrop.get(t.id) ?? null } : t;
  });
}

async function runMC(scKey, nSim, onProg, params) {
  params = params || P;
  const runRng = createRngContext(params.seed || DEFAULT_MC_SEED);
  const structure = createStructuralContext(params);
  const turns = createPressureTurnContext(params);
  const sc = SC[scKey] || SC.baseline;
  const spreadMult = params.uncMult * sc.uncWidthMult;
  const scenarioThreats = THREATS.map(t => applyScenario(t, scKey));
  const acc = createMonteCarloAccumulator();

  const CHUNK = 60;
  let done = 0;
  while (done < nSim) {
    const n = Math.min(CHUNK, nSim - done);
    for (let i = 0; i < n; i++) {
      const sampled = scenarioThreats.map(t => sampleThreatNumerics(t, spreadMult, runRng));
      const run = applyStructuralUncertainty(sampled, params, structure);
      const threats = applyPressureTurns(run.threats, turns);
      const processDraws = [];
      const enriched = enrichMonteCarloThreats(threats, run.params, { random01: () => {
        const draw = runRng.random01();
        processDraws.push(draw);
        return draw;
      } });
      let replayIndex = 0;
      const globalThresholdEnriched = applyGlobalThresholdToSample(enriched, { random01: () => {
        if (replayIndex >= processDraws.length) throw new Error('Threshold-policy process draw pairing mismatch.');
        return processDraws[replayIndex++];
      } });
      if (replayIndex !== processDraws.length) throw new Error('Threshold-policy process draw pairing mismatch.');
      recordMonteCarloSample(acc, enriched, globalThresholdEnriched, run.params);
    }
    done += n;
    if (onProg) onProg(done / nSim);
    await new Promise(r => setTimeout(r, 0));
  }

  return summarizeMonteCarloAccumulator(acc, nSim, params.seed, params.thresholdPolicy || THRESHOLD_POLICY);
}

const CASCADE_SYSTEM_BASKET = 'system_wide';

/**
 * Reporting-basket structure for trigger attribution. Each basket is split into overlap
 * groups counted once at their largest member weight, as FunctionalCascade.metrics does, and
 * records the fewest groups whose failure reaches the cascade threshold.
 */
function cascadeBasketLayout(nodes, threshold) {
  const baskets = Object.create(null);
  const add = (key, node) => {
    const basket = baskets[key] || (baskets[key] = { groups: Object.create(null) });
    const group = basket.groups[node.overlapGroup] || (basket.groups[node.overlapGroup] = { id: node.overlapGroup, members: [], weight: 0 });
    group.members.push(node.id);
    group.weight = Math.max(group.weight, node.weight);
  };
  nodes.forEach(node => {
    add(CASCADE_SYSTEM_BASKET, node);
    node.services.forEach(service => add(service, node));
  });
  Object.values(baskets).forEach(basket => {
    const weights = Object.values(basket.groups).map(group => group.weight).sort((a, b) => b - a);
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let lost = 0;
    let needed = 0;
    while (needed < weights.length && lost / total < threshold) lost += weights[needed++];
    basket.groupCount = weights.length;
    basket.minGroupsToCross = needed;
  });
  return baskets;
}

/**
 * Which reporting basket triggers the Dynamic cascade clocks. Diagnostic only, not a model
 * output. Replays runMC's draw streams (same scenario, seed, run count, call order and
 * structural draws), so replayed run i is headline run i, and records every basket whose
 * functional loss had reached that run's cascade threshold in the first-crossing year. If the
 * replayed crossing years differ from the headline distribution the trace is marked
 * inconsistent and must not be shown. Several baskets can reach the threshold in the same
 * year, so basket shares can add up to more than 100%. groupsNeeded counts, over all runs, how
 * many failing groups each basket needs to reach the run's sampled threshold.
 */
async function traceCascadeTriggers(inputs, headline, isCurrent) {
  const { scKey, nSim, params } = inputs;
  const runRng = createRngContext(params.seed || DEFAULT_MC_SEED);
  const structure = createStructuralContext(params);
  const turns = createPressureTurnContext(params);
  const sc = SC[scKey] || SC.baseline;
  const spreadMult = params.uncMult * sc.uncWidthMult;
  const scenarioThreats = THREATS.map(t => applyScenario(t, scKey));
  const crossings = [];
  const counts = Object.create(null);
  const groupsNeeded = Object.create(null);
  let layout = null;
  let crossedRuns = 0;
  let multiBasketRuns = 0;

  for (let i = 0; i < nSim; i++) {
    const sampled = scenarioThreats.map(t => sampleThreatNumerics(t, spreadMult, runRng));
    const run = applyStructuralUncertainty(sampled, params, structure);
    const enriched = enrichMonteCarloThreats(applyPressureTurns(run.threats, turns), run.params, { random01: () => runRng.random01() });
    const threshold = run.params.cascadeThreshold ?? 0.50;
    layout = cascadeBasketLayout(configuredFunctionalCascadeNodes(enriched, run.params), threshold);
    Object.entries(layout).forEach(([key, basket]) => {
      const histogram = groupsNeeded[key] || (groupsNeeded[key] = Object.create(null));
      histogram[basket.minGroupsToCross] = (histogram[basket.minGroupsToCross] || 0) + 1;
    });
    const result = simulateFunctionalCascade(enriched, run.params);
    crossings.push(result.year);
    if (result.year <= YE) {
      crossedRuns++;
      const reached = Object.keys(result.serviceLosses).filter(key => result.serviceLosses[key] >= threshold);
      if (result.activeMass >= threshold) reached.push(CASCADE_SYSTEM_BASKET);
      if (reached.length > 1) multiBasketRuns++;
      const active = new Set(result.activeThreats);
      reached.forEach(key => {
        const count = counts[key] || (counts[key] = { runs: 0, groups: Object.create(null) });
        count.runs++;
        Object.values(layout[key].groups).forEach(group => {
          if (group.members.some(id => active.has(id))) count.groups[group.id] = (count.groups[group.id] || 0) + 1;
        });
      });
    }
    if (i % 60 === 59) {
      await new Promise(resolve => setTimeout(resolve, 0));
      if (!isCurrent()) return null;
    }
  }

  crossings.sort((a, b) => a - b);
  const expected = (headline && headline.crossing) || [];
  const consistent = crossings.length === expected.length && crossings.every((year, i) => year === expected[i]);
  const baskets = Object.entries(counts).map(([key, count]) => ({
    key,
    runs: count.runs,
    share: count.runs / crossedRuns,
    groupCount: layout[key].groupCount,
    groupsNeeded: Object.fromEntries(Object.entries(groupsNeeded[key]).map(([needed, runs]) => [needed, runs / nSim])),
    groups: Object.values(layout[key].groups)
      .map(group => ({ id: group.id, members: [...group.members], runs: count.groups[group.id] || 0, share: (count.groups[group.id] || 0) / count.runs }))
      .sort((a, b) => b.runs - a.runs || a.id.localeCompare(b.id)),
  })).sort((a, b) => b.runs - a.runs || a.key.localeCompare(b.key));
  const declaredThreshold = params.cascadeThreshold ?? 0.50;
  const threshold = structure && structure.threshold ? { ...STRUCTURAL_UNCERTAINTY.cascadeThreshold } : { lo: declaredThreshold, hi: declaredThreshold };
  return { consistent, nSim, crossedRuns, multiBasketRuns, threshold, baskets };
}

/* One-at-a-time growth-rate sensitivity diagnostic. */
let _sensData = null;
let _exploratoryData = null;
let _exploratoryPromise = null;
const CALC_STEP_KIND = {
  exact: {
    key: 'exact',
    label: 'Exact internal',
    note: 'Deterministic arithmetic over current model inputs; valid inside model assumptions.',
  },
  mc: {
    key: 'mc',
    label: 'Monte Carlo estimate',
    note: 'Sampling estimate from model distributions; precision improves with sample count.',
  },
  heuristic: {
    key: 'heuristic',
    label: 'Model heuristic',
    note: 'Transparent model rule or reduced-order diagnostic, not an empirical proof.',
  },
  stress: {
    key: 'stress',
    label: 'Stress test',
    note: 'Scenario diagnostic for alternative failure rules or tail shocks.',
  },
  report: {
    key: 'report',
    label: 'Report only',
    note: 'Audit or rendering summary rather than a numerical model calculation.',
  },
};
// Console steps in display order. core: sets the clocks; diagnostic: describes the result without
// changing the clocks; optional: Model Diagnostics, run on request. async steps finish after the run.
const CALC_STEPS = [
  { group:'core', id:'scenario', kind:'exact', label:'Scenario conditioning', pending:'Scenario multipliers have not yet been applied.' },
  { group:'core', id:'base', kind:'exact', label:'Base MCDA scoring', pending:'Weighted six-dimension base scores are waiting for a rerun.' },
  { group:'core', id:'dependency', kind:'heuristic', label:'Dependency amplification', pending:'Dependency-adjusted priorities are waiting for a rerun.' },
  { group:'core', id:'domainweights', kind:'exact', label:'Normalized domain weighting', pending:'Domain slider shares have not yet been normalized for scoring.' },
  { group:'core', id:'horizon', kind:'heuristic', label:'Process-specific threat horizon model', pending:'Continuous, event, and regime horizons are not yet recomputed.' },
  { group:'core', id:'gsi', kind:'exact', label:'Global Stress Index', pending:'Aggregate systemic stress has not yet been recomputed.' },
  { group:'core', id:'priorityrank', kind:'exact', label:'Lead-threat priority ranking', pending:'Top-priority threat ranking is waiting for deterministic scores.' },
  { group:'core', id:'structuresample', kind:'mc', label:'Structural uncertainty sampling', pending:'Cascade threshold, criticality levels, dependency weights and lags, and growth class are sampled in every run.' },
  { group:'core', id:'turns', kind:'mc', label:'Pressure turns and recovery', pending:'Pressure turns and recovery by reversibility class are sampled in every run.' },
  { group:'core', id:'montecarlo', kind:'mc', label:'Monte Carlo sampling and crossing simulation', pending:'Beta / log-normal parameter sampling and the crossing simulation have not started yet.' },
  { group:'core', id:'compensatory', kind:'exact', label:'Compensatory aggregation', pending:'Weighted-share threshold aggregation is pending.' },
  { group:'core', id:'maxrule', kind:'exact', label:'Non-compensatory max-rule aggregation', pending:'Earliest single-threat crossing aggregation is pending.' },
  { group:'core', id:'cascade', kind:'heuristic', label:'Dynamic cascade propagation', pending:'Year-by-year dependency propagation is pending.' },
  { group:'core', id:'domainmc', kind:'mc', label:'Domain functional-cascade distributions', pending:'Domain-specific functional first-crossing summaries are pending.' },
  { group:'core', id:'structural', kind:'exact', label:'Aggregation-rule spread', pending:'Cross-aggregator structural spread has not yet been computed.' },
  { group:'core', id:'bootstrap', kind:'mc', label:'Bootstrap interval estimation', pending:'Bootstrap uncertainty summaries are pending.' },
  { group:'core', id:'recovery', kind:'exact', label:'Recovery check', pending:'Runs still below the threshold in 2100 and runs that fall back below it are counted after the simulation.' },
  { group:'core', async:true, id:'triggers', kind:'mc', label:'Trigger attribution', pending:'The runs are replayed to find which essential-service basket sets the clocks off.' },
  { group:'diagnostic', id:'graph', kind:'heuristic', label:'Graph-weighted heuristic index', pending:'Dependency-linked heuristic index is pending.' },
  { group:'diagnostic', id:'weibull', kind:'heuristic', label:'Weibull survival analysis', pending:'Accelerating hazard diagnostics are pending.' },
  { group:'diagnostic', id:'eigen', kind:'exact', label:'Network eigenvector centrality', pending:'Cascade hub centrality ranking is pending.' },
  { group:'diagnostic', id:'poissonbinomial', kind:'exact', label:'Poisson-binomial convergence tail', pending:'Exact unequal-probability convergence tail is pending.' },
  { group:'diagnostic', id:'entropy', kind:'exact', label:'Shannon entropy risk landscape', pending:'Risk concentration / spread entropy has not yet been computed.' },
  { group:'optional', id:'oat', kind:'heuristic', label:'Fast OAT sensitivity', pending:'Idle. Use “Run diagnostics” to run OAT sensitivity.' },
  { group:'optional', id:'sobol', kind:'mc', label:'Sobol low-discrepancy Jansen S1/ST', pending:'Idle. Use “Run diagnostics” to run Sobol/Jansen sensitivity.' },
  { group:'optional', id:'smaa', kind:'mc', label:'SMAA weight robustness', pending:'Idle. Use “Run diagnostics” to run SMAA robustness.' },
  { group:'optional', id:'veto', kind:'stress', label:'Non-compensatory veto diagnostic', pending:'Idle. Use “Run diagnostics” to run veto-rule stress testing.' },
  { group:'optional', id:'tailshock', kind:'stress', label:'Tail-dependence stress test', pending:'Idle. Use “Run diagnostics” to run tail-dependence stress testing.' },
  { group:'optional', id:'audit', kind:'report', label:'Scientific audit summary', pending:'Idle. Use “Run diagnostics” to build the audit summary.' },
];
const CORE_CALC_STEPS = CALC_STEPS.filter(step => step.group !== 'optional');
const ADDITIONAL_CALC_STEPS = CALC_STEPS.filter(step => step.group === 'optional');
// Steps the loading bar and the completion message wait for (the trigger replay runs afterwards).
const BLOCKING_CALC_STEPS = CORE_CALC_STEPS.filter(step => !step.async);
const calcStepRange = steps => `${CALC_STEPS.indexOf(steps[0]) + 1}–${CALC_STEPS.indexOf(steps[steps.length - 1]) + 1}`;
let _calcConsoleState = null;
let _calcConsoleExpanded = true;

function makeCalcConsoleState(summary, runLabel) {
  const steps = {};
  CALC_STEPS.forEach(step => {
    steps[step.id] = {
      status: 'pending',
      detail: step.pending,
      startedAt: null,
      endedAt: null,
    };
  });
  return {
    summary: summary || 'Waiting for a full model pass.',
    runLabel: runLabel || 'Idle',
    startedAt: null,
    updatedAt: Date.now(),
    steps,
  };
}

function ensureCalcConsoleState() {
  if (!_calcConsoleState) _calcConsoleState = makeCalcConsoleState();
  return _calcConsoleState;
}

function calcClock(ts) {
  return ts
    ? new Date(ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' })
    : ' ';
}

function calcDuration(step) {
  if (!step || !step.startedAt || !step.endedAt) return '';
  const ms = Math.max(0, step.endedAt - step.startedAt);
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const sec = ms / 1000;
  return sec >= 10 ? `${Math.round(sec)} s` : `${sec.toFixed(1)} s`;
}

const CALC_GROUP_TITLES = { diagnostic: 'Diagnostics of the result: they describe it and do not change the clocks' };

function calcStepGroupHtml(stepDefs, state, numberOffset) {
  return stepDefs.map((def, idx) => {
    const step = state.steps[def.id];
    const heading = idx > 0 && def.group !== stepDefs[idx - 1].group && CALC_GROUP_TITLES[def.group]
      ? `<div class="calc-step-group">${escapeHtml(CALC_GROUP_TITLES[def.group])}</div>`
      : '';
    const icon = step.status === 'done' ? '✓'
      : step.status === 'running' ? '…'
      : step.status === 'queued' ? '○'
      : step.status === 'error' ? '!'
      : '·';
    const stamp = step.status === 'done'
      ? calcClock(step.endedAt)
      : step.status === 'running'
        ? `Started ${calcClock(step.startedAt)}`
        : step.status === 'queued'
          ? 'Queued'
          : step.status === 'error'
            ? `Stopped ${calcClock(step.endedAt)}`
            : 'Pending';
    const dur = step.status === 'done' ? calcDuration(step) : '';
    const numberedLabel = `${String(numberOffset + idx + 1).padStart(2, '0')}  ${def.label}`;
    const kind = CALC_STEP_KIND[def.kind] || CALC_STEP_KIND.heuristic;
    const kindTitle = `${kind.label}: ${kind.note}`;
    return `${heading}<div class="calc-step calc-${step.status}">
      <div class="calc-step-icon">${icon}</div>
      <div class="calc-step-body">
        <div class="calc-step-label"><span class="calc-step-name">${escapeHtml(numberedLabel)}</span><span class="calc-step-kind calc-kind-${kind.key}" title="${escapeHtml(kindTitle)}">${escapeHtml(kind.label)}</span></div>
        <div class="calc-step-detail">${escapeHtml(step.detail || def.pending || 'Pending')}</div>
      </div>
      <div class="calc-step-meta">${escapeHtml(dur ? `${stamp}  ${dur}` : stamp)}</div>
    </div>`;
  }).join('');
}

function calcRailHtml(stepDefs, state, numberOffset) {
  return stepDefs.map((def, idx) => {
    const step = state.steps[def.id];
    const numberedLabel = `${String(numberOffset + idx + 1).padStart(2, '0')}  ${def.label}`;
    const kind = CALC_STEP_KIND[def.kind] || CALC_STEP_KIND.heuristic;
    return `<span class="calc-rail-dot calc-dot-${escapeHtml(step.status)}" title="${escapeHtml(numberedLabel)}  ${escapeHtml(kind.label)}  ${escapeHtml(step.status)}"></span>`;
  }).join('');
}

function renderAdditionalCalcConsole(state) {
  const list = document.getElementById('additionalCalcStepList');
  const copy = document.getElementById('additionalCalcConsoleCopy');
  const rail = document.getElementById('additionalCalcRail');
  if (!list && !copy && !rail) return;
  const statuses = ADDITIONAL_CALC_STEPS.map(def => state.steps[def.id]?.status || 'pending');
  const done = statuses.filter(s => s === 'done').length;
  const running = ADDITIONAL_CALC_STEPS.find(def => state.steps[def.id]?.status === 'running');
  const anyError = statuses.includes('error');
  if (copy) {
    copy.textContent = running
      ? `Running ${running.label}…`
      : anyError
        ? 'One or more additional scientific calculations failed. Main clock result remains valid.'
        : done === ADDITIONAL_CALC_STEPS.length
          ? `Complete. Additional diagnostic graphs ${calcStepRange(ADDITIONAL_CALC_STEPS)} are rendered below with type badges.`
          : done > 0
            ? `${done}/${ADDITIONAL_CALC_STEPS.length} additional diagnostic calculations completed.`
            : `Idle. Use “Run diagnostics” to run optional diagnostics ${calcStepRange(ADDITIONAL_CALC_STEPS)}.`;
  }
  if (rail) rail.innerHTML = calcRailHtml(ADDITIONAL_CALC_STEPS, state, CORE_CALC_STEPS.length);
  if (list) list.innerHTML = calcStepGroupHtml(ADDITIONAL_CALC_STEPS, state, CORE_CALC_STEPS.length);
}

function renderCalcConsole() {
  const shell = document.getElementById('calcConsole');
  const list = document.getElementById('calcStepList');
  const run = document.getElementById('calcConsoleRun');
  const copy = document.getElementById('calcConsoleCopy');
  const rail = document.getElementById('calcRail');
  const toggle = document.getElementById('calcConsoleToggle');
  const state = ensureCalcConsoleState();

  if (run) run.textContent = state.runLabel;
  if (copy) copy.textContent = state.summary;
  if (shell) shell.classList.toggle('is-collapsed', !_calcConsoleExpanded);
  if (toggle) {
    toggle.textContent = _calcConsoleExpanded ? 'Compact' : 'Details';
    toggle.setAttribute('aria-expanded', _calcConsoleExpanded ? 'true' : 'false');
  }
  if (rail) rail.innerHTML = calcRailHtml(CORE_CALC_STEPS, state, 0);
  if (list) list.innerHTML = calcStepGroupHtml(CORE_CALC_STEPS, state, 0);

  renderAdditionalCalcConsole(state);
}

function resetCalcConsole(summary, runLabel) {
  _calcConsoleExpanded = true;
  _calcConsoleState = makeCalcConsoleState(summary, runLabel);
  renderCalcConsole();
}

function startCalcConsole(scKey, nSim) {
  _calcConsoleExpanded = true;
  const state = makeCalcConsoleState(
    'Run initialized. Each stage is labelled as exact internal math, Monte Carlo estimate, model heuristic, stress test, or report.',
    `${SC[scKey].label}  ${Number(nSim || 0).toLocaleString()} runs`
  );
  state.startedAt = Date.now();
  _calcConsoleState = state;
  renderCalcConsole();
}

function setCalcStepStatus(id, status, detail, summary) {
  const state = ensureCalcConsoleState();
  const step = state.steps[id];
  if (!step) return;
  const now = Date.now();
  if (status === 'running') {
    if (!step.startedAt) step.startedAt = now;
    step.endedAt = null;
  } else if (status === 'done' || status === 'error') {
    if (!step.startedAt) step.startedAt = now;
    step.endedAt = now;
  } else if (status === 'queued' || status === 'pending') {
    step.startedAt = null;
    step.endedAt = null;
  }
  step.status = status;
  if (detail !== undefined) step.detail = detail;
  const blockingIndex = BLOCKING_CALC_STEPS.findIndex(def => def.id === id);
  const stepLine = document.getElementById('cascadeLoadingStep');
  if (stepLine && status === 'running' && blockingIndex >= 0) {
    stepLine.textContent = `Step ${blockingIndex + 1} of ${BLOCKING_CALC_STEPS.length} · ${BLOCKING_CALC_STEPS[blockingIndex].label}`;
  }
  if (summary) state.summary = summary;
  state.updatedAt = now;
  if (window._particleLoader) {
    const total = BLOCKING_CALC_STEPS.length;
    const done = BLOCKING_CALC_STEPS.filter(s => state.steps[s.id] && state.steps[s.id].status === 'done').length;
    window._particleLoader.setProgress(done / total);
  }
  renderCalcConsole();
}

function finalizeCalcConsoleSummary() {
  const state = ensureCalcConsoleState();
  const statuses = BLOCKING_CALC_STEPS.map(step => state.steps[step.id].status);
  if (statuses.every(status => status === 'done')) {
    state.summary = `Main model run complete. Calculations ${calcStepRange(CORE_CALC_STEPS)} finished; badges separate exact internal math from estimates and heuristics. Optional diagnostics ${calcStepRange(ADDITIONAL_CALC_STEPS)} are available in Model Diagnostics.`;
    if (window._particleLoader) window._particleLoader.stop();
  } else if (statuses.includes('error')) {
    state.summary = 'One or more core model stages failed. Main outputs may still be partially available.';
    if (statuses.every(s => s === 'done' || s === 'error') && window._particleLoader) window._particleLoader.stop();
  }
  renderCalcConsole();
}

function markCalcConsolePending(reason) {
  resetCalcConsole(reason || 'Parameters changed. Waiting for a fresh rerun.', 'Pending rerun');
}

async function yieldForCalcConsole() {
  await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
}

async function runSensitivity(params, baseN) {
  params = params || P;
  const scKey = params.scenario;
  const sc = SC[scKey] || SC.baseline;
  const N = baseN || 500;
  const GR_DELTA = 0.20;
  const spreadMult = params.uncMult * sc.uncWidthMult;
  const scenarioThreats = THREATS.map(t => applyScenario(t, scKey));
  const results = [];
  for (const t of THREATS) {
    const parameterRng = createRngContext(`${params.seed || DEFAULT_MC_SEED}:oat:parameters`);
    const baseYears = [], upYears = [], dnYears = [];
    for (let i = 0; i < N; i++) {
      const sampled = scenarioThreats.map(sourceThreat => sampleThreatNumerics(sourceThreat, spreadMult, parameterRng));
      const evaluate = factor => {
        const adjusted = sampled.map(sampledThreat => sampledThreat.id === t.id ? {
          ...sampledThreat,
          growth_rate: clamp(sampledThreat.growth_rate * factor, 0.0005, 0.25),
          growth_rate_raw: clamp(sampledThreat.growth_rate * factor, 0.0005, 0.25),
        } : sampledThreat);
        const processRng = createRngContext(`${params.seed || DEFAULT_MC_SEED}:oat:process:${i}`);
        return computeAggregateYears(enrichMonteCarloThreats(adjusted, params, processRng), params).comp;
      };
      const baseYear = evaluate(1);
      const upYear = evaluate(1 + GR_DELTA);
      const dnYear = evaluate(1 - GR_DELTA);
      baseYears.push(baseYear); upYears.push(upYear); dnYears.push(dnYear);
      if (i % 40 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }
    const { upMcSe, dnMcSe } = pairedOatBootstrapStandardErrors(baseYears, upYears, dnYears,
      createRngContext(`${params.seed || DEFAULT_MC_SEED}:oat:bootstrap:${t.id}`));
    [baseYears, upYears, dnYears].forEach(values => values.sort((a, b) => a - b));
    const base = oatCompositeResponseFromYears(baseYears, N);
    const up = oatCompositeResponseFromYears(upYears, N);
    const dn = oatCompositeResponseFromYears(dnYears, N);
    const upShift = (up.score - base.score) * 100;
    const dnShift = (base.score - dn.score) * 100;
    results.push({
      id: t.id, name: t.name, domain: t.domain,
      upShift,
      dnShift,
      totalImpact: Math.max(0, Math.abs(upShift) - 1.96 * upMcSe) + Math.max(0, Math.abs(dnShift) - 1.96 * dnMcSe),
      rawTotalImpact: Math.abs(upShift) + Math.abs(dnShift),
      baseP50: base.p50,
      upP50: up.p50,
      dnP50: dn.p50,
      baseP2035: base.p2035,
      upP2035: up.p2035,
      dnP2035: dn.p2035,
      baseP2050: base.p2050,
      upP2050: up.p2050,
      dnP2050: dn.p2050,
      upMcSe,
      dnMcSe,
      pairedRandomInputs: true,
      mcErrorMethod: 'paired bootstrap standard deviation of the full OAT composite contrast; 160 resamples',
      totalImpactDescription: 'heuristic sum of absolute contrasts beyond 1.96 bootstrap standard errors; not a confidence bound',
    });
  }
  results.sort((a, b) => b.totalImpact - a.totalImpact);
  return results;
}

async function runExploratorySensitivityIndices(params, baseN) {
  params = params || P;
  const diagnosticRng = createRngContext(`${params.seed || DEFAULT_MC_SEED}:sobol-fit`);
  const scKey = params.scenario;
  const sc = SC[scKey] || SC.baseline;
  const spreadMult = params.uncMult * sc.uncWidthMult;
  const N = baseN || 512;
  const k = THREATS.length;
  const sobolDim = 2 * k;
  const meanThreats = buildEnriched(scKey, params);

  const effectiveDistributions = meanThreats.map(t => {
    const samples = [];
    for (let i = 0; i < 160; i++) {
      const sampled = sampleThreatNumerics(applyScenario(THREATS.find(x => x.id === t.id), scKey), spreadMult, diagnosticRng);
      const bs = baseScore(sampled, params.weights);
      const priority = Math.max(1e-6, bs * depFactor(t, meanThreats, params) * domainWeightMultiplier(sampled.domain, params));
      samples.push(Math.log(priority));
    }
    return samples.sort((a, b) => a - b);
  });

  function fromU(i, u) {
    return quantile(effectiveDistributions[i], clamp(u, 1e-6, 1 - 1e-6));
  }

  function evaluate(logVector) {
    const synthetic = meanThreats.map((t, i) => {
      const priority = Math.exp(logVector[i]);
      const threshold = getThreatThreshold(t, params.thresholdPolicy || THRESHOLD_POLICY);

      const rawGrowth = muOf(t.growth_rate);
      const effectiveGrowth = effectiveRiskGrowthForThreat(t, rawGrowth);

      const horizon = computeThreatHorizon(
        priority,
        effectiveGrowth,
        threshold,
        t.process_type,
        false
      );

      return {
        ...t,
        priority,
        threshold_value: threshold,
        growth_rate_raw: rawGrowth,
        growth_rate_effective: effectiveGrowth,
        horizon,
      };
    });

    return exploratorySensitivityTarget(synthetic, params);
  }

  /**
   * Saltelli's pick-freeze layout is driven here by Sobol low-discrepancy points in 2k dimensions,
   * split into A and B blocks before constructing A_Bi hybrids. (Saltelli et al. 2010 Sobol design)
   */
  const sobolPoints = generateSobolPoints(sobolDim, N, 1);
  const A = sobolPoints.map(row => row.slice(0, k));
  const B = sobolPoints.map(row => row.slice(k));
  const fA = [];
  const fB = [];
  let evalCount = 0;

  for (let r = 0; r < N; r++) {
    fA.push(evaluate(A[r].map((u, i) => fromU(i, u))));
    fB.push(evaluate(B[r].map((u, i) => fromU(i, u))));
    evalCount += 2;
    if (evalCount % 200 === 0) await new Promise(rz => setTimeout(rz, 0));
  }

  const all = [...fA, ...fB];
  const mean = all.reduce((s, v) => s + v, 0) / all.length;
  const variance = all.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, all.length - 1);
  if (!(variance > 0)) return {
    rows: [], firstOrderSum: null, variance, status: 'undefined_zero_variance', sampleSize: N,
    sampler: 'Sobol low-discrepancy A/B/A_Bi design',
    targetLabel: 'Continuous composite response: Global Stress Index, threshold-share by 2035/2050, and normalized central horizon',
    warnings: ['The sampled target has zero or invalid variance; Sobol/Jansen indices and ranking are undefined.'],
  };
  const varDen = variance;

  const rows = [];
  for (let i = 0; i < k; i++) {
    const fABi = [];
    for (let r = 0; r < N; r++) {
      const row = A[r].slice();
      row[i] = B[r][i];
      fABi.push(evaluate(row.map((u, j) => fromU(j, u))));
      evalCount += 1;
      if (evalCount % 200 === 0) await new Promise(rz => setTimeout(rz, 0));
    }

    /**
     * Jansen first-order and total-order estimators on a Sobol-driven A/B/A_Bi pick-freeze design compare
     * the variance explained by one factor alone versus the variance retained when every interaction
     * containing that factor is included. (Jansen 1999; Saltelli et al. 2010)
     */
    const S1 = 1 - (fB.reduce((s, v, r) => s + (v - fABi[r]) ** 2, 0) / (2 * N * varDen));
    const ST = fA.reduce((s, v, r) => s + (v - fABi[r]) ** 2, 0) / (2 * N * varDen);
    rows.push({ id: THREATS[i].id, name: THREATS[i].name, S1, ST });
  }

  const firstOrderSum = rows.reduce((s, r) => s + r.S1, 0);
  const s1Values = rows.map(r => r.S1);
  const s1Mean = s1Values.reduce((s, v) => s + v, 0) / Math.max(1, s1Values.length);
  const s1Std = Math.sqrt(s1Values.reduce((s, v) => s + (v - s1Mean) ** 2, 0) / Math.max(1, s1Values.length));
  const warnings = [];
  if (N < 256) warnings.push('Base sample size is small, so the exploratory indices are coarse.');
  if (variance < 1e-6) warnings.push('Target variance is near zero, so the indices are weakly identified.');
  if (rows.some(r => r.S1 < -0.02 || r.ST < -0.02)) warnings.push('Negative indices appeared due to estimator noise.');
  if (rows.every(r => r.ST > 0.9)) warnings.push('Total-order indices are clustered near 1.0, suggesting low discrimination.');
  if (s1Std < 0.015) warnings.push('First-order indices are unusually uniform, so ranking is likely fragile.');
  if (Math.abs(firstOrderSum) > 1.05) warnings.push(`ΣS1 = ${firstOrderSum.toFixed(2)} deviates from 1.0 enough to flag finite-sample instability rather than a UI-normalized correction.`);
  rows.sort((a, b) => b.ST - a.ST);
  return {
    rows,
    firstOrderSum,
    variance,
    status: 'identified',
    sampleSize: N,
    sampler: 'Sobol low-discrepancy A/B/A_Bi design',
    targetLabel: 'Continuous composite response: Global Stress Index, threshold-share by 2035/2050, and normalized central horizon',
    warnings,
  };
}


function shortThreatLabel(name, maxLen = 24) {
  if (!name) return '';
  return name.length > maxLen ? name.slice(0, maxLen - 1) + '…' : name;
}

function renderDomainComp(enriched) {
  const el = document.getElementById('domainComp'); if (!el) return;
  const totals = {};
  enriched.forEach(t => totals[t.domain] = (totals[t.domain]||0) + t.priority);
  const total = Object.values(totals).reduce((s,v)=>s+v,0)||1;
  el.innerHTML = ['civilization','biosphere','technology'].map(d => {
    const col=domCol(d), frac=totals[d]/total, count=enriched.filter(t=>t.domain===d).length;
    const label=d.charAt(0).toUpperCase()+d.slice(1);
    const tip = `<strong>${label} stress share</strong><br>${pct(frac)} of the current model pressure comes from ${count} ${count === 1 ? 'threat' : 'threats'} in this domain. The bar compares this domain's adjusted priority share against the total priority across all domains.`;
    return `<div data-tip="${escapeHtml(tip)}" style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px">
        <span style="color:${col};font-weight:600">${label}</span>
        <span style="color:var(--text3);font-family:var(--mono)">${pct(frac)}  ${count} threats</span>
      </div>
      <div class="dom-bar-bg"><div class="dom-bar-fill" style="width:${pct(frac)};background:${col};color:${col}"></div></div>
    </div>`;
  }).join('');
}

const TIMELINE_RISK_GRADIENT = 'linear-gradient(to right, #2a9d6e 0%, #d4a017 50%, #c94040 100%)';

function renderTimelineBar(low, mid, high, uncLow, uncHigh, threatEntryOrShowPercentileLabels = false, showPercentileLabels = false) {
  const threatEntry = threatEntryOrShowPercentileLabels && typeof threatEntryOrShowPercentileLabels === 'object'
    ? threatEntryOrShowPercentileLabels
    : null;
  if (!threatEntry) showPercentileLabels = Boolean(threatEntryOrShowPercentileLabels);
  const isAmplifierRisk = threatEntry && mechanismTypeForThreat(threatEntry) === 'amplifier_risk';
  const amplifierTrackAttrs = isAmplifierRisk
    ? ` role="img" aria-label="${escapeHtml(AMPLIFIER_CONTINUATION_A11Y)}" title="${escapeHtml(AMPLIFIER_CONTINUATION_A11Y)}"`
    : '';
  const percentilePoints = [
    { year: low, name: 'P10' },
    { year: mid, name: 'P50' },
    { year: high, name: 'P90' }
  ].filter(p => Number.isFinite(p.year));
  const core = percentilePoints.map(p => p.year).filter(v => v <= AXIS_END).sort((a, b) => a - b);
  const lo = core[0];
  const hi = core[2] ?? core[1] ?? core[0];
  const uVals = [uncLow, uncHigh].filter(v => Number.isFinite(v)).sort((a, b) => a - b);
  const uLo = uVals[0];
  const uHi = uVals[1] ?? uVals[0];
  const nowX = yearPos(NOW);
  const tickHtml = AXIS_YEARS.map(y => `<span class="bar-ax-tick" style="left:${yearPos(y)}%">${y}</span>`).join('');

  if (!core.length) {
    return `
      <div class="bar-axis">
        <div class="bar-axis-line"></div>
        ${tickHtml}
      </div>
      <div class="bar-track"${amplifierTrackAttrs}>
        <div class="bar-fill" style="width:100%;background:linear-gradient(to right,#d0d0d0 0%,#d4a017 50%,#c94040 100%);opacity:.55"></div>
        <div class="meta-sub" style="position:absolute;left:10px;top:24px">${!percentilePoints.length ? 'Horizon not identifiable' : isAmplifierRisk ? AMPLIFIER_NO_CROSSING_LABEL : 'No crossing ≤ 2100'}</div>
        <div class="bar-now" style="left:${nowX}%">
          <span class="bar-now-cue bar-now-cue-left" aria-hidden="true">⮞⮞⮞</span>
          <div class="bar-now-lbl">${nowStamp()}</div>
          <span class="bar-now-cue bar-now-cue-right" aria-hidden="true">⮞⮞⮞</span>
          <span class="bar-now-status" aria-hidden="true">Currently</span>
        </div>
      </div>
    `;
  }

  const loX = yearPos(lo), hiX = yearPos(hi);
  const uLoX = Number.isFinite(uLo) && uLo <= AXIS_END ? yearPos(uLo) : loX;
  const uHiX = Number.isFinite(uHi) ? yearPos(uHi > AXIS_END && uLo <= AXIS_END ? AXIS_END : uHi) : hiX;
  const gradient = TIMELINE_RISK_GRADIENT;
  const percentileTickHtml = percentilePoints
    .filter(p => p.year <= AXIS_END)
    .map(p => {
      const x = yearPos(p.year);
      const label = showPercentileLabels ? `${p.name}  ${fmtY(p.year)}` : fmtY(p.year);
      return `<div class="bar-tick" style="left:${x}%"></div><div class="bar-tick-lbl" style="left:${x}%">${label}</div>`;
    })
    .join('');
  const offAxisNames = percentilePoints.filter(p => p.year > AXIS_END).map(p => p.name);
  const offAxisLabel = offAxisNames.length
    ? `<div class="bar-tick-lbl" style="left:100%;transform:translateX(-100%)">${offAxisNames.join('/')} &gt;2100</div>`
    : '';
  const amplifierTail = isAmplifierRisk && hiX < 100
    ? `<div class="amplifier-continuation-tail" style="left:${hiX}%;right:0" role="img" aria-label="${escapeHtml(AMPLIFIER_CONTINUATION_A11Y)}" title="${escapeHtml(AMPLIFIER_CONTINUATION_A11Y)}"></div>`
    : '';

  return `
    <div class="bar-axis">
      <div class="bar-axis-line"></div>
      ${tickHtml}
    </div>
    <div class="bar-track"${amplifierTrackAttrs}>
      <div class="bar-fill" style="width:${hiX}%;background:${gradient}"></div>
      ${amplifierTail}
      <div class="bar-unc" style="left:${uLoX}%;width:${Math.max(1, uHiX - uLoX)}%"></div>
      ${percentileTickHtml}
      ${offAxisLabel}
      <div class="bar-now" style="left:${nowX}%">
        <span class="bar-now-cue bar-now-cue-left" aria-hidden="true">⮞⮞⮞</span>
        <div class="bar-now-lbl">${nowStamp()}</div>
        <span class="bar-now-cue bar-now-cue-right" aria-hidden="true">⮞⮞⮞</span>
        <span class="bar-now-status" aria-hidden="true">Currently</span>
      </div>
    </div>
  `;
}

function renderOverviewStrip(enriched, mcRes) {
  const el = document.getElementById('overviewStrip'); if (!el) return;
  const items = [...enriched].sort((a, b) => b.priority - a.priority);
  const rows = items.map(t => {
    const stats = mcRes && mcRes.threatStats ? mcRes.threatStats[t.id] : null;
    const low = stats ? stats.p10 : t.horizon;
    const mid = stats ? stats.p50 : t.horizon;
    const high = stats ? stats.p90 : t.horizon;
    const midPos = Number.isFinite(mid) ? yearPos(mid) : 100;
    const visibleYears = [low, mid, high].filter(v => Number.isFinite(v) && v <= AXIS_END).sort((a, b) => a - b);
    const solidEndYear = visibleYears.length ? visibleYears[visibleYears.length - 1] : high;
    const solidEndPos = Number.isFinite(solidEndYear) ? yearPos(solidEndYear) : 100;
    const miniGradient = TIMELINE_RISK_GRADIENT;
    const isAmplifierRisk = mechanismTypeForThreat(t) === 'amplifier_risk';
    const miniAmplifierTail = isAmplifierRisk && solidEndPos < 100
      ? `<div class="amplifier-continuation-tail" style="left:${solidEndPos}%;right:0" role="img" aria-label="${escapeHtml(AMPLIFIER_CONTINUATION_A11Y)}" title="${escapeHtml(AMPLIFIER_CONTINUATION_A11Y)}"></div>`
      : '';
    return `
      <div class="mini-row">
        <div class="mini-name"><span class="mini-dot" style="background:rgba(226,226,235,.72)"></span>${t.name}</div>
        <div>
          <div class="mini-bar" style="background:var(--bg3);border:1px solid var(--border)">
            <div class="mini-bar-fill" style="width:${solidEndPos}%;background:${miniGradient}"></div>
            ${miniAmplifierTail}
            <div class="mini-bar-now" style="left:${yearPos(NOW)}%"></div>
            ${mid <= AXIS_END ? `<div class="mini-bar-mid" style="left:${midPos}%"></div>` : ''}
          </div>
        </div>
        <div class="mini-score">${t.priority.toFixed(2)}</div>
      </div>
    `;
  }).join('');

  el.innerHTML = `
    <div style="padding:0 0 12px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
      <span class="card-title" style="margin:0">All-threat overview</span>
      <span style="font-family:var(--mono);font-size:9px;color:var(--text-3)">${items.length} threats</span>
    </div>
    <div style="padding-top:10px">
      <div class="mini-row" style="border-bottom:2px solid var(--border2);padding-bottom:2px">
        <div></div>
        <div class="mini-axis">${AXIS_YEARS.map(y => `<span class="mini-ax-tick" style="left:${yearPos(y)}%">${y}</span>`).join('')}</div>
        <div></div>
      </div>
      ${rows}
    </div>
  `;
}

const DOMAIN_LAYER_CARDS = [
  {
    key:'civilization',
    cls:'dom-civ',
    icon:'<svg width="19" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;flex-shrink:0"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    label:'Civilizational layer',
    title:'Civilizational Functional-Disruption Horizon',
    desc:'First within-domain functional-loss horizon after full-system propagation across human-system risks. It is a model trigger for disrupted function, not a date of completed civilizational collapse.'
  },
  {
    key:'biosphere',
    cls:'dom-bio',
    icon:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;flex-shrink:0"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>',
    label:'Biospheric layer',
    title:'Biosphere Functional-Disruption Horizon',
    desc:'First within-domain functional-loss horizon after full-system propagation across climate, oceans, biodiversity, water, soils and pollution. Remaining species or biomass do not rule out functional failure.'
  },
  {
    key:'technology',
    cls:'dom-tech',
    icon:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;flex-shrink:0"><rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx=".5" fill="currentColor" stroke="none"/><line x1="9" y1="6" x2="9" y2="3"/><line x1="12" y1="6" x2="12" y2="3"/><line x1="15" y1="6" x2="15" y2="3"/><line x1="9" y1="18" x2="9" y2="21"/><line x1="12" y1="18" x2="12" y2="21"/><line x1="15" y1="18" x2="15" y2="21"/><line x1="6" y1="9" x2="3" y2="9"/><line x1="6" y1="12" x2="3" y2="12"/><line x1="6" y1="15" x2="3" y2="15"/><line x1="18" y1="9" x2="21" y2="9"/><line x1="18" y1="12" x2="21" y2="12"/><line x1="18" y1="15" x2="21" y2="15"/></svg>',
    label:'Technological layer',
    title:'Technological Functional-Disruption Horizon',
    desc:'First within-domain functional-loss horizon after full-system propagation across AI, cyber, autonomous-weapons, space and critical-minerals risks. It is not a forecast of total technological collapse.'
  },
];

function priorityWeight(t) {
  return Math.max(0.0001, t.priority || 1);
}

function weightedFiniteAverage(items, valueForItem, options = {}) {
  const maxValue = Number.isFinite(options.maxValue) ? options.maxValue : Infinity;
  let total = 0;
  let weightTotal = 0;

  items.forEach(t => {
    const value = valueForItem(t);
    if (!Number.isFinite(value) || value > maxValue) return;
    const weight = priorityWeight(t);
    total += value * weight;
    weightTotal += weight;
  });

  return weightTotal ? total / weightTotal : options.fallback;
}

function weightedThreatAverages(items) {
  let weightTotal = 0;
  let severity = 0;
  let urgency = 0;
  let cascade = 0;

  items.forEach(t => {
    const weight = priorityWeight(t);
    weightTotal += weight;
    severity += muOf(t.scale) * weight;
    urgency += muOf(t.urgency) * weight;
    cascade += muOf(t.acceleration) * weight;
  });

  return {
    avgSev: severity / weightTotal,
    avgUrg: urgency / weightTotal,
    avgCas: cascade / weightTotal,
  };
}

function domainMonteCarloTimeline(mcRes, domainKey) {
  const stats = domainKey && mcRes && mcRes.domainStats ? mcRes.domainStats[domainKey] : null;
  if (!stats) return null;

  const p2050Entry = Array.isArray(stats.cdf) ? stats.cdf.find(entry => entry.year === 2050) : null;
  return {
    lower: stats.p10,
    mid: stats.p50,
    upper: stats.p90,
    p2050: p2050Entry && Number.isFinite(p2050Entry.prob) ? p2050Entry.prob : null,
    censorFraction: stats.censorFraction,
    medianCensored: stats.medianCensored,
    lowerCensored: stats.p10 > YE,
    upperCensored: stats.p90 > YE,
    nearMedianCensorBoundary: !stats.medianCensored && stats.censorFraction >= 0.40,
    status: stats.medianCensored ? 'unidentified' : 'identified',
  };
}

function threatTimelineForMode(t, mcRes, mode, options = {}) {
  const stats = mcRes && mcRes.threatStats ? mcRes.threatStats[t.id] : null;

  if (mode === 'weibull') {
    const canShowProbability = !options.requireMcForWeibullProbability || mcRes;
    const params = weibullParamsForThreat(t, stats);
    const probabilityBounds = canShowProbability
      ? weibullProbabilityBounds(t, 2050, stats)
      : { lower: null, upper: null };
    const probabilityIdentified = Number.isFinite(probabilityBounds.lower)
      && Number.isFinite(probabilityBounds.upper)
      && Math.abs(probabilityBounds.upper - probabilityBounds.lower) < 1e-12;
    return {
      lower: weibullQuantile(t, 0.10, stats),
      mid: weibullQuantile(t, 0.50, stats),
      upper: weibullQuantile(t, 0.90, stats),
      p2050: probabilityIdentified ? probabilityBounds.lower : null,
      p2050Lower: probabilityBounds.lower,
      p2050Upper: probabilityBounds.upper,
      censored: params.censored,
      status: params.status,
      medianLowerBound: params.censored ? YE : null,
    };
  }

  const p2050 = stats && Number.isFinite(stats.p2050)
    ? stats.p2050
    : options.fallbackToWeibullProbability && mcRes ? weibullProbability(t, 2050, stats) : null;
  return {
    lower: stats ? stats.p10 : t.horizon,
    mid: stats ? stats.p50 : t.horizon,
    upper: stats ? stats.p90 : t.horizon,
    p2050,
    p2050Lower: p2050,
    p2050Upper: p2050,
  };
}

function weightedDomainTimeline(items, mcRes, mode) {
  // A zero-priority member contributes no weight to this diagnostic summary.
  if (mode === 'weibull') items = items.filter(t => Number.isFinite(t.priority) && t.priority > 0);
  const timelineFor = t => threatTimelineForMode(t, mcRes, mode);
  const timelines = items.map(timelineFor);
  const timelineById = new Map(items.map((t, index) => [t.id, timelines[index]]));
  const censoredCount = timelines.filter(timeline => timeline.censored).length;
  const invalidCount = timelines.filter(timeline => timeline.status === 'invalid').length;
  const p2050Lower = invalidCount ? null : weightedFiniteAverage(items, t => timelineById.get(t.id).p2050Lower, { fallback: null });
  const p2050Upper = invalidCount ? null : weightedFiniteAverage(items, t => timelineById.get(t.id).p2050Upper, { fallback: null });
  if (mode === 'weibull' && (!items.length || censoredCount || invalidCount)) {
    // Censoring does not identify an exact weighted quantile. Keep every positive-weight
    // member and expose only defensible lower/probability bounds instead of inventing a date.
    const midLowerBound = invalidCount ? null : weightedFiniteAverage(items, t => {
      const timeline = timelineById.get(t.id);
      return timeline.censored ? YE : timeline.mid;
    }, { fallback: null });
    const upperLowerBound = invalidCount ? null : weightedFiniteAverage(items, t => {
      const timeline = timelineById.get(t.id);
      return timeline.censored ? YE : timeline.upper;
    }, { fallback: null });
    return {
      lower: null,
      mid: null,
      upper: null,
      midLowerBound,
      upperLowerBound,
      p2050: null,
      p2050Lower,
      p2050Upper,
      censored: false,
      censoredCount,
      invalidCount,
      status: invalidCount ? 'invalid' : 'partially_identified',
    };
  }
  const quantileLimit = mode === 'weibull' ? Infinity : YE;
  return {
    lower: weightedFiniteAverage(items, t => timelineFor(t).lower, { maxValue: quantileLimit, fallback: YE + 1 }),
    mid: weightedFiniteAverage(items, t => timelineFor(t).mid, { maxValue: quantileLimit, fallback: YE + 1 }),
    upper: weightedFiniteAverage(items, t => timelineFor(t).upper, { maxValue: quantileLimit, fallback: YE + 1 }),
    p2050: weightedFiniteAverage(items, t => timelineById.get(t.id).p2050, { fallback: null }),
    p2050Lower,
    p2050Upper,
    censored: false,
    censoredCount: 0,
    invalidCount: 0,
    status: 'identified',
  };
}

function summarizeDomainLayer(items, mcRes, domainKey) {
  if (!items.length) return null;

  const mode = priorityViewMode();
  const timeline = mode === 'mc'
    ? domainMonteCarloTimeline(mcRes, domainKey) || weightedDomainTimeline(items, mcRes, mode)
    : weightedDomainTimeline(items, mcRes, mode);

  return {
    ...timeline,
    weightedSummary: mode === 'weibull',
    source: mode === 'weibull'
      ? (timeline.status === 'partially_identified'
          ? `Weighted Weibull bounds; ${timeline.censoredCount} right-censored`
          : timeline.status === 'invalid'
            ? `Weighted Weibull unavailable; ${timeline.invalidCount} invalid`
            : 'Weighted Weibull')
      : mcRes ? 'Dynamic cascade MC' : 'Deterministic preview',
    ...weightedThreatAverages(items),
  };
}

function domainNoDataHtml(dom) {
  return `<div class="agg-card ${dom.cls}"><div class="agg-domain">${dom.label}</div><div class="agg-name">${dom.title}</div><div class="agg-desc">${dom.desc}</div><div style="font-size:10px;color:var(--text-3)">No data for current scenario</div></div>`;
}

function domainStatsHtml(agg) {
  const yearsLabel = (year, lowerBound = null) => Number.isFinite(year)
    ? (year > YE ? 'Not identified' : fmtYearsLeft(year))
    : Number.isFinite(lowerBound)
      ? `>${Math.max(0, Math.floor(lowerBound - NOW))} yr`
      : 'Not identified';
  const daysLabel = year => Number.isFinite(year) && year <= YE ? daysLeft(year) : '';
  const weightedQuantileTip = 'Priority-weighted summary of individual threat Weibull diagnostics, not a domain-cascade probability. If one input is right-censored, the card keeps it and reports only a defensible bound.';
  const probabilityLabel = probabilityRangeLabel(agg.p2050, agg.p2050Lower, agg.p2050Upper, 'Not available');
  return `<div class="agg-stats">
    <div class="agg-stat" data-tip="<strong>P10 lower estimate</strong>${agg.weightedSummary ? weightedQuantileTip : 'Earlier quantile of the within-domain functional-loss first-crossing distribution after full-system propagation.'}"><div class="agg-stat-label">${agg.weightedSummary ? 'Weighted P10' : 'To lower P10'}</div><div class="agg-stat-val">${yearsLabel(agg.lower)}<br><span style="font-size:8px;color:var(--text-3)" data-year="${agg.lower}">${daysLabel(agg.lower)}</span></div></div>
    <div class="agg-stat" data-tip="<strong>P50 middle estimate</strong>${agg.weightedSummary ? weightedQuantileTip : 'Median within-domain functional-loss first crossing after full-system propagation. If at least half of runs do not cross by 2100, the actual P50 is not identified.'}"><div class="agg-stat-label">${agg.weightedSummary && Number.isFinite(agg.midLowerBound) ? 'Weighted P50 bound' : agg.weightedSummary ? 'Weighted P50' : 'To mid P50'}</div><div class="agg-stat-val">${yearsLabel(agg.mid, agg.midLowerBound)}<br><span style="font-size:8px;color:var(--text-3)" data-year="${agg.mid}">${daysLabel(agg.mid)}</span></div></div>
    <div class="agg-stat" data-tip="<strong>P90 upper estimate</strong>${agg.weightedSummary ? weightedQuantileTip : 'Later quantile of the same within-domain functional-loss distribution. A value beyond 2100 is right-censored, not evidence of safety.'}"><div class="agg-stat-label">${agg.weightedSummary && Number.isFinite(agg.upperLowerBound) ? 'Weighted P90 bound' : agg.weightedSummary ? 'Weighted P90' : 'To high P90'}</div><div class="agg-stat-val">${yearsLabel(agg.upper, agg.upperLowerBound)}<br><span style="font-size:8px;color:var(--text-3)" data-year="${agg.upper}">${daysLabel(agg.upper)}</span></div></div>
    <div class="agg-stat" data-tip="<strong>P≤2050 (${agg.source})</strong>${agg.weightedSummary ? 'Priority-weighted range for individual threat probabilities by 2050, not the probability of a joint domain crossing. Right-censored threats remain in the range.' : 'Share of Monte Carlo runs in which the domain functional-loss trigger is reached on or before 2050.'}"><div class="agg-stat-label">${agg.weightedSummary ? 'Weighted P≤2050' : 'P≤2050'}</div><div class="agg-stat-val">${probabilityLabel}<br><span style="font-size:8px;color:var(--text-3)">(${agg.source})</span></div></div>
    ${agg.weightedSummary ? '' : `<div class="agg-stat" data-tip="<strong>Right-censored by 2100</strong>Share of runs that do not reach this domain functional trigger inside the model horizon. These runs are not estimated as occurring in 2101."><div class="agg-stat-label">No cross by 2100</div><div class="agg-stat-val">${pct(agg.censorFraction || 0)}<br><span style="font-size:8px;color:var(--text-3)">right-censored</span></div></div>`}
    <div class="agg-stat" data-tip="<strong>Avg severity</strong>Average damage potential for threats in this domain. 1 means limited damage; 5 means global or systemic damage."><div class="agg-stat-label">Avg severity</div><div class="agg-stat-val">${agg.avgSev.toFixed(1)}/5</div></div>
    <div class="agg-stat" data-tip="<strong>Avg urgency</strong>How soon the threats in this domain are becoming relevant. Higher means the pressure is closer and more active now."><div class="agg-stat-label">Avg urgency</div><div class="agg-stat-val">${agg.avgUrg.toFixed(1)}/5</div></div>
    <div class="agg-stat" data-tip="<strong>Avg cascade</strong>How strongly threats in this domain can amplify each other or pull other systems with them. Higher means more domino-effect potential."><div class="agg-stat-label">Avg cascade</div><div class="agg-stat-val">${agg.avgCas.toFixed(1)}/5</div></div>
  </div>`;
}

function domainLayerCardHtml(dom, enriched, mcRes) {
  const items = enriched.filter(t => t.domain === dom.key);
  const agg = summarizeDomainLayer(items, mcRes, dom.key);
  if (!agg) return domainNoDataHtml(dom);
  const cardDescription = agg.weightedSummary
    ? 'Weibull comparison view: a priority-weighted summary of individual threat timing diagnostics. It is not the domain functional-cascade horizon shown in MC mode.'
    : dom.desc;

  const medianWarning = agg.weightedSummary && agg.status === 'partially_identified'
    ? `<div class="source-traceability-warning"><strong>Weibull year only partly identified.</strong> ${agg.censoredCount} positive-weight input${agg.censoredCount === 1 ? ' is' : 's are'} right-censored after 2100. The card keeps ${agg.censoredCount === 1 ? 'it' : 'them'}, shows a lower bound for the weighted P50, and reports a P≤2050 range.</div>`
    : agg.weightedSummary && agg.status === 'invalid'
      ? '<div class="source-traceability-warning"><strong>Weibull result unavailable.</strong> At least one input is invalid; no numerical value is substituted.</div>'
      : agg.medianCensored
    ? '<div class="source-traceability-warning"><strong>P50 not identified.</strong> At least half of runs do not reach this domain trigger by 2100.</div>'
    : agg.nearMedianCensorBoundary
      ? '<div class="source-traceability-warning"><strong>P50 near the censoring boundary.</strong> Interpret the displayed median as structurally unstable.</div>'
      : '';
  return `<div class="agg-card ${dom.cls}">
    <div class="agg-bracket-group">
      <div class="agg-bracket-rail"></div>
      <span class="agg-bracket-arrow"></span>
      <div class="agg-name" style="display:flex;align-items:center">${dom.icon || ''}${dom.title}</div>
      <div class="agg-desc">${cardDescription}</div>
      <div class="agg-year-row" data-tip="${agg.weightedSummary ? '<strong>Weighted threat P50 summary</strong>Priority-weighted average of individual Weibull medians, not a domain crossing median.' : '<strong>Domain functional P50</strong>The large year is the median first crossing of this domain\'s functional-loss trigger after propagation through the full threat network. It uses the same criticality, overlap, service-basket and threshold rules as Dynamic cascade, but a domain-specific denominator; it is not a completed-collapse date.'}">
        <div>
          <div class="agg-year">${Number.isFinite(agg.mid) ? fmtY(agg.mid) : Number.isFinite(agg.midLowerBound) ? `>${Math.floor(agg.midLowerBound)}` : 'Not identified'}</div>
          <div class="agg-year-percentile">${agg.weightedSummary && Number.isFinite(agg.midLowerBound) ? 'Weighted threat P50 lower bound' : agg.weightedSummary ? 'Weighted threat P50 not identified' : agg.medianCensored ? 'Domain P50 not identified' : 'Domain functional P50'}</div>
        </div>
      </div>
    </div>
    ${renderTimelineBar(agg.lower, agg.mid, agg.upper, agg.lower, agg.upper, true)}
    ${medianWarning}
    ${domainStatsHtml(agg)}
  </div>`;
}

function renderAggregateRow(enriched, mcRes) {
  const el = document.getElementById('aggregateRow');
  if (!el) return;

  cachePriorityRenderContext(enriched, mcRes);
  el.innerHTML = DOMAIN_LAYER_CARDS
    .map(dom => domainLayerCardHtml(dom, enriched, mcRes))
    .join('');
}

function renderPriorityPanel(enriched, mcRes) {
  const top = [...enriched].sort((a, b) => b.priority - a.priority)[0];
  const labelEl = document.getElementById('priorityLabel');
  const nameEl = document.getElementById('priorityName');
  const descEl = document.getElementById('priorityDesc');
  const scoreEl = document.getElementById('priorityScore');
  const scoreLblEl = document.getElementById('priorityScoreLbl');
  const tlEl = document.getElementById('priorityTimeline');
  const metaEl = document.getElementById('priorityMeta');
  if (!nameEl || !descEl || !scoreEl || !tlEl || !metaEl || !top) return;

  const stats = mcRes && mcRes.threatStats ? mcRes.threatStats[top.id] : null;
  const low = stats ? stats.p10 : top.horizon;
  const mid = stats ? stats.p50 : top.horizon;
  const high = stats ? stats.p90 : top.horizon;
  const p2050 = mcRes ? (mcRes.cdf.find(entry => entry.year === 2050) || { prob: 0 }).prob : 0;
  const hilp = isHilpThreat(top);
  if (labelEl) labelEl.textContent = 'Highest-priority threat  current weighting + scenario';

  nameEl.textContent = top.name;
  descEl.textContent = `${top.mechanism} Current weighted window ${fmtY(low)}–${fmtY(high)} with central model horizon ${fmtY(mid)}.`;
  scoreEl.textContent = top.priority.toFixed(2);
  if (scoreLblEl) scoreLblEl.textContent = 'Priority score';
  tlEl.innerHTML = renderTimelineBar(low, mid, high, low, high, top);
  metaEl.innerHTML = `
    <div class="meta-grid">
      ${climateMetric('To lower', fmtYearsLeft(low), daysLeft(low))}
      ${climateMetric('To mid', fmtYearsLeft(mid), daysLeft(mid))}
      ${climateMetric('To upper', fmtYearsLeft(high), daysLeft(high))}
      ${climateMetric('Cascade', muOf(top.acceleration).toFixed(2))}
      ${climateMetric('P / 2050', pct(p2050))}
      ${climateMetric('HILP', hilp ? 'Yes' : 'No')}
    </div>
  `;
}

function sourceTooltip(rangeObj) {
  const parts = [];
  const src = sourceOf(rangeObj) || 'No provenance recorded.';
  parts.push(`<div><strong>${escapeHtml(src)}</strong></div>`);
  if (rangeObj && rangeObj.type) parts.push(`<div>Type: ${escapeHtml(rangeObj.type)}</div>`);
  if (rangeObj && rangeObj.parameter_evidence) {
    const evidence = rangeObj.parameter_evidence;
    parts.push(`<div>Input calibration grade: ${escapeHtml(evidence.calibration_grade || 'U')}</div>`);
    if (evidence.mapping_type) parts.push(`<div>Mapping type: ${escapeHtml(evidence.mapping_type)}</div>`);
    if (evidence.rationale) parts.push(`<div style="margin-top:6px">${escapeHtml(evidence.rationale)}</div>`);
  } else if (rangeObj && rangeObj.confidence) {
    parts.push(`<div>Legacy input-strength grade: ${escapeHtml(rangeObj.confidence)}</div>`);
  }
  if (rangeObj && rangeObj.fallback) parts.push('<div>Range basis: synthetic fallback from the current evidence-strength band</div>');
  if (rangeObj && rangeObj.overlay) parts.push(`<div>Evidence overlay: ${escapeHtml(rangeObj.overlaySource || 'uploaded observation')}  weight ${Number.isFinite(rangeObj.overlayWeight) ? rangeObj.overlayWeight.toFixed(2) : ' '}</div>`);
  if (rangeObj && rangeObj.strength) parts.push(`<div>Strength: ${escapeHtml(rangeObj.strength)}</div>`);
  if (rangeObj && rangeObj.accessed) parts.push(`<div>Accessed: ${escapeHtml(rangeObj.accessed)}</div>`);
  if (rangeObj && rangeObj.note) parts.push(`<div style="margin-top:6px">${escapeHtml(rangeObj.note)}</div>`);
  const safeUrl = rangeObj ? normalizeHttpUrl(rangeObj.url) : '';
  if (safeUrl) parts.push(`<div style="margin-top:6px"><a class="source-link" href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">Open source</a></div>`);
  return parts.join('');
}

function scientificEvidenceForThreat(t) {
  const raw = ACTIVE_SOURCE_DOCUMENT_META?.threat_evidence?.[t.id] || null;
  if (!raw) {
    return {
      grade: 'U',
      phenomenonGrade: 'U',
      mechanismGrade: 'U',
      systemicGrade: 'U',
      rationale: 'No explicit threat-level scientific evidence assessment is supplied in the active JSON.',
    };
  }
  return {
    grade: normalizeEvidenceGrade(raw.scientific_evidence_grade ?? raw.overall_grade ?? raw.summary_grade ?? raw.evidence_grade),
    phenomenonGrade: normalizeEvidenceGrade(raw.phenomenon_grade),
    mechanismGrade: normalizeEvidenceGrade(raw.causal_mechanism_grade),
    systemicGrade: normalizeEvidenceGrade(raw.systemic_relevance_grade),
    rationale: cleanSourceText(raw.rationale || ''),
  };
}

function parameterCalibrationGrade(rangeObj) {
  if (rangeObj?.parameter_evidence?.calibration_grade) {
    return { grade: normalizeEvidenceGrade(rangeObj.parameter_evidence.calibration_grade), legacy: false };
  }
  if (rangeObj?.confidence) return { grade: normalizeEvidenceGrade(rangeObj.confidence), legacy: true };
  if (rangeObj?.strength) return { grade: confidenceGradeFromStrength(rangeObj.strength), legacy: true };
  return { grade: 'U', legacy: true };
}

function parameterCalibrationProfileForThreat(t) {
  const counts = Object.fromEntries(EVIDENCE_GRADES.map(grade => [grade, 0]));
  let legacyFallback = false;
  PARAM_FIELDS.forEach(field => {
    const result = parameterCalibrationGrade(t[field]);
    counts[result.grade] += 1;
    legacyFallback = legacyFallback || result.legacy;
  });
  const label = EVIDENCE_GRADES.filter(grade => counts[grade] > 0)
    .map(grade => `${counts[grade]}${grade}`)
    .join(' / ');
  return { counts, label: label || '8U', legacyFallback };
}

function evidenceChipClass(grade) {
  return grade === 'A' ? 'chip-h' : grade === 'B' ? 'chip-m' : grade === 'C' ? 'chip-l' : 'chip-d';
}

function scientificEvidenceCellHtml(t) {
  const evidence = scientificEvidenceForThreat(t);
  const detail = `Phenomenon ${evidence.phenomenonGrade} · Mechanism ${evidence.mechanismGrade} · Systemic relevance ${evidence.systemicGrade}${evidence.rationale ? ` | ${evidence.rationale}` : ''}`;
  return `<span class="chip ${evidenceChipClass(evidence.grade)}" title="${escapeHtml(detail)}">${escapeHtml(evidence.grade)}</span>`;
}

function parameterCalibrationCellHtml(t) {
  const calibration = parameterCalibrationProfileForThreat(t);
  const legacy = calibration.legacyFallback ? ' Legacy strength labels were used where explicit calibration grades were not supplied.' : '';
  return `<span class="chip ${evidenceChipClass(calibration.counts.D ? 'D' : calibration.counts.C ? 'C' : calibration.counts.B ? 'B' : calibration.counts.A ? 'A' : 'U')}" title="Eight parameter-level grades; they are not averaged.${escapeHtml(legacy)}">${escapeHtml(calibration.label)}</span>`;
}

function sourceBadge(value, rangeObj, digits = 1, suffix = '') {
  return `<span class="src-pop">${Number.isFinite(value) ? value.toFixed(digits) : ' '}${suffix}<button class="src-i" type="button" tabindex="0" aria-label="Show parameter source" title="Show parameter source">i</button><span class="src-tip">${sourceTooltip(rangeObj)}</span></span>`;
}

function weibullCDF(year, t0, eta, beta) {
  if (!Number.isFinite(year) || !Number.isFinite(t0) || !Number.isFinite(eta) || !Number.isFinite(beta) || eta <= 0) return 0;
  if (year <= t0) return 0;
  return clamp(1 - Math.exp(-Math.pow((year - t0) / eta, beta)), 0, 0.9999);
}

function weibullShapeForThreat(t) {
  const processBase = t.process_type === 'continuous' ? 1.18 : t.process_type === 'regime' ? 1.08 : 0.98;
  const accel = (muOf(t.acceleration) - 3) * 0.10;
  const inter = (muOf(t.interdependence) - 3) * 0.08;
  const urg = (muOf(t.urgency) - 3) * 0.07;
  const gov = (muOf(t.gov_failure) - 3) * 0.05;
  const evidence = t.evStr === 'strong' ? 0.05 : t.evStr === 'weak' ? -0.05 : 0;
  return clamp(processBase + accel + inter + urg + gov + evidence, 0.75, 3.20);
}

function weibullParamsForThreat(t, stats) {
  const rawMid = stats == null ? t.horizon : stats.p50;
  const beta = weibullShapeForThreat(t);
  if (!Number.isFinite(rawMid) || !Number.isFinite(beta) || beta <= 0) {
    return { t0: NOW, eta: null, beta, mid: null, censored: false, censorYear: null, status: 'invalid' };
  }
  if (rawMid > YE) {
    return { t0: NOW, eta: null, beta, mid: null, censored: true, censorYear: YE, status: 'right_censored' };
  }
  const mid = clamp(rawMid, NOW + 0.5, YE);
  const eta = Math.max(0.25, (mid - NOW) / Math.pow(Math.log(2), 1 / beta));
  return { t0: NOW, eta, beta, mid, censored: false, censorYear: null, status: 'identified' };
}

function weibullProbability(t, year, stats) {
  const p = weibullParamsForThreat(t, stats);
  if (p.status !== 'identified' || !Number.isFinite(year)) return null;
  return weibullCDF(year, p.t0, p.eta, p.beta);
}

function weibullProbabilityBounds(t, year, stats) {
  const params = weibullParamsForThreat(t, stats);
  if (params.status === 'invalid' || !Number.isFinite(year)) return { status: 'invalid', lower: null, upper: null };
  if (params.censored) {
    // Only the median's right-censoring is known, not a fitted scale or point probability.
    return { status: params.status, lower: 0, upper: year <= NOW ? 0 : year <= YE ? 0.5 : 1 };
  }
  const p = weibullProbability(t, year, stats);
  return { status: params.status, lower: p, upper: p };
}

function weibullQuantile(t, q, stats) {
  const p = weibullParamsForThreat(t, stats);
  if (p.status !== 'identified' || !Number.isFinite(q)) return null;
  const qc = clamp(q, 0.0001, 0.9999);
  return p.t0 + p.eta * Math.pow(-Math.log(1 - qc), 1 / p.beta);
}

const priorityViewState = {
  mode: 'mc',
  enriched: null,
  mcRes: null,
};

function normalizePriorityViewMode(mode) {
  return mode === 'weibull' ? 'weibull' : 'mc';
}

function priorityViewMode() {
  return priorityViewState.mode;
}

function cachePriorityRenderContext(enriched, mcRes) {
  if (!Array.isArray(enriched)) return;
  priorityViewState.enriched = enriched;
  priorityViewState.mcRes = mcRes || null;
}

function syncPriorityModeButtons() {
  document.querySelectorAll('[data-priority-mode-btn]').forEach(btn => {
    btn.setAttribute('aria-pressed', btn.dataset.priorityModeBtn === priorityViewState.mode ? 'true' : 'false');
  });
}

function renderPriorityViewFromCache() {
  if (!priorityViewState.enriched) return;
  renderAggregateRow(priorityViewState.enriched, priorityViewState.mcRes);
  renderClimateBreakdownDetail(priorityViewState.enriched, priorityViewState.mcRes);
}

function bindPriorityModeToggle(root = document) {
  root.querySelectorAll('[data-priority-mode-btn]').forEach(btn => {
    if (btn.dataset.priorityModeBound === '1') return;
    btn.dataset.priorityModeBound = '1';
    btn.addEventListener('click', () => setPriorityViewMode(btn.dataset.priorityModeBtn));
  });
  syncPriorityModeButtons();
}

function setPriorityViewMode(mode) {
  priorityViewState.mode = normalizePriorityViewMode(mode);
  renderPriorityViewFromCache();
  syncPriorityModeButtons();
}

function networkEigenvectorCentrality(enriched) {
  const n = enriched.length;
  if (!n) return [];
  const byId = Object.fromEntries(enriched.map((t, i) => [t.id, { t, i }]));
  const adj = Array.from({ length:n }, () => Array(n).fill(0));
  enriched.forEach((t, i) => {
    (t.deps || []).forEach(depId => {
      const dep = byId[depId];
      if (!dep || dep.i === i) return;
      const w = 0.70 + 0.06 * muOf(t.interdependence) + 0.04 * muOf(dep.t.interdependence);
      adj[i][dep.i] += w;
      adj[dep.i][i] += w;
    });
  });
  let v = Array(n).fill(1 / Math.sqrt(n));
  for (let iter = 0; iter < 28; iter++) {
    const next = adj.map(row => row.reduce((s, w, j) => s + w * v[j], 0) + 0.001);
    const norm = Math.sqrt(next.reduce((s, x) => s + x * x, 0)) || 1;
    v = next.map(x => x / norm);
  }
  const sum = v.reduce((s, x) => s + x, 0) || 1;
  return enriched.map((t, i) => ({
    ...t,
    centrality: v[i] / sum,
    weightedCentrality: (v[i] / sum) * Math.max(0.001, t.priority || 1),
  }));
}

function dependencyEdgeStats(enriched) {
  const ids = new Set(enriched.map(t => t.id));
  const edges = new Set();
  enriched.forEach(t => {
    (t.deps || []).forEach(depId => {
      if (!ids.has(depId) || depId === t.id) return;
      edges.add([t.id, depId].sort().join('|'));
    });
  });
  const n = enriched.length;
  const possible = n > 1 ? (n * (n - 1)) / 2 : 1;
  return { edges: edges.size, density: edges.size / possible };
}

function poissonBinomialPMF(ps) {
  let pmf = [1];
  ps.forEach(rawP => {
    const p = clamp(rawP, 0, 0.9999);
    const next = Array(pmf.length + 1).fill(0);
    for (let k = 0; k < pmf.length; k++) {
      next[k] += pmf[k] * (1 - p);
      next[k + 1] += pmf[k] * p;
    }
    pmf = next;
  });
  return pmf;
}

function poissonAtLeast(pmf, k) {
  return pmf.slice(k).reduce((s, p) => s + p, 0);
}

function independentFailureReference(enriched, year, threatStats) {
  const statuses = enriched.map(t => weibullProbabilityBounds(t, year, threatStats ? threatStats[t.id] : null));
  const censoredCount = statuses.filter(p => p.status === 'right_censored').length;
  const invalidCount = statuses.filter(p => p.status === 'invalid').length;
  const unidentifiedCount = censoredCount + invalidCount;
  if (invalidCount) return { censoredCount, invalidCount, unidentifiedCount, lowerPs: null, upperPs: null, expectedLower: null, expectedUpper: null, lowerPmf: null, upperPmf: null };
  const lowerPs = statuses.map(p => p.lower);
  const upperPs = statuses.map(p => p.upper);
  return {
    censoredCount,
    invalidCount,
    unidentifiedCount,
    lowerPs,
    upperPs,
    expectedLower: lowerPs.reduce((s, p) => s + p, 0),
    expectedUpper: upperPs.reduce((s, p) => s + p, 0),
    lowerPmf: poissonBinomialPMF(lowerPs),
    upperPmf: poissonBinomialPMF(upperPs),
  };
}

function correlatedScenarioSpread(ps, rho) {
  const variances = ps.map(p => p * (1 - p));
  const sumVariance = variances.reduce((s, v) => s + v, 0);
  const sumSd = variances.reduce((s, v) => s + Math.sqrt(v), 0);
  return Math.sqrt(Math.max(0, (1 - rho) * sumVariance + rho * sumSd ** 2));
}

function effectiveCascadeCorrelation(enriched) {
  if (!enriched.length) return 0;
  const domainCorr = { civilization:0.55, biosphere:0.62, technology:0.48 };
  const total = enriched.reduce((s, t) => s + Math.max(0.001, t.priority || 1), 0) || 1;
  const weightedDomain = enriched.reduce((s, t) => s + Math.max(0.001, t.priority || 1) * (domainCorr[t.domain] || 0.5), 0) / total;
  const graph = dependencyEdgeStats(enriched);
  return clamp(weightedDomain + graph.density * 0.55, 0, 0.85);
}

function jointFailureByDecade(enriched, mcRes) {
  const years = [2030, 2035, 2040, 2050, 2060, 2070, 2080];
  const n = enriched.length;
  const k30 = Math.ceil(n * 0.30);
  const k50 = Math.ceil(n * 0.50);
  const k70 = Math.ceil(n * 0.70);
  const k80 = Math.ceil(n * 0.80);
  return {
    k30,
    k50,
    k70,
    k80,
    rho: effectiveCascadeCorrelation(enriched),
    rows: years.map(year => {
      const ref = independentFailureReference(enriched, year, mcRes && mcRes.threatStats ? mcRes.threatStats : null);
      const boundedTail = k => ref.invalidCount ? { lower: null, upper: null } : { lower: poissonAtLeast(ref.lowerPmf, k), upper: poissonAtLeast(ref.upperPmf, k) };
      const at30 = boundedTail(k30), at50 = boundedTail(k50), at70 = boundedTail(k70), at80 = boundedTail(k80);
      return {
        year,
        censoredCount: ref.censoredCount,
        invalidCount: ref.invalidCount,
        expected: ref.unidentifiedCount ? null : ref.expectedLower,
        expectedLower: ref.expectedLower,
        expectedUpper: ref.expectedUpper,
        at30: ref.unidentifiedCount ? null : at30.lower, at30Lower: at30.lower, at30Upper: at30.upper,
        at50: ref.unidentifiedCount ? null : at50.lower, at50Lower: at50.lower, at50Upper: at50.upper,
        at70: ref.unidentifiedCount ? null : at70.lower, at70Lower: at70.lower, at70Upper: at70.upper,
        at80: ref.unidentifiedCount ? null : at80.lower, at80Lower: at80.lower, at80Upper: at80.upper,
      };
    }),
  };
}

function shannonEntropyRisk(enriched) {
  const weights = enriched.map(t => Math.max(0.001, Number.isFinite(t.priority) ? t.priority : 1));
  const total = weights.reduce((s, w) => s + w, 0) || 1;
  const shares = enriched.map((t, i) => ({ ...t, share: weights[i] / total })).sort((a, b) => b.share - a.share);
  const h = shares.reduce((s, t) => s - t.share * Math.log2(t.share), 0);
  const hMax = Math.log2(Math.max(1, enriched.length));
  return {
    h,
    hMax,
    normalized: hMax ? h / hMax : 0,
    concentration: hMax ? 1 - h / hMax : 0,
    effectiveN: Math.pow(2, h),
    shares,
  };
}

function advancedPct(v) {
  if (!Number.isFinite(v)) return ' ';
  if (v > 0 && v < 0.005) return '<1%';
  return pct(v);
}

let _wAdvCmpYear = 2035;
let _advCache = { enriched: null, mcRes: null };
window._rerunAdvanced = function(yr) { _wAdvCmpYear = yr; if (_advCache.enriched) renderAdvancedMethod(_advCache.enriched, _advCache.mcRes); };

function renderAdvancedMethod(enriched, mcRes) {
  const box = document.getElementById('advancedMethodBox');
  if (!box) return;
  if (!enriched || !enriched.length) { box.innerHTML = ''; return; }
  _advCache = { enriched, mcRes };

  const threatStats = mcRes && mcRes.threatStats ? mcRes.threatStats : null;
  const rhoE = effectiveCascadeCorrelation(enriched);
  const graph = dependencyEdgeStats(enriched);
  const CMP = _wAdvCmpYear;
  const card = (accentColor, num, title, formula, leftBody, refStr, rightBody) => `
    <div class="advanced-method-card" style="background:var(--surface);border:1px solid var(--border);border-top:3px solid ${accentColor};border-radius:var(--r8);padding:22px 26px;margin-bottom:14px">
      <div class="advanced-method-card-grid" style="display:grid;grid-template-columns:340px 1fr;gap:32px;align-items:start">
        <div>
          <div style="font-family:var(--mono);font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:${accentColor};margin-bottom:6px">Algorithm ${num}</div>
          <div class="advanced-method-title" style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:10px;line-height:1.25">${title}</div>
          <div class="advanced-method-formula" style="font-size:10px;color:var(--text-2);background:var(--bg3);border:1px solid ${accentColor}33;border-left:3px solid ${accentColor};border-radius:var(--r4);padding:10px 13px;margin-bottom:10px;line-height:1.9;overflow-x:auto">${formula}</div>
          <div class="advanced-method-copy" style="font-size:11px;color:var(--text-3);line-height:1.75;margin-bottom:10px">${leftBody}</div>
          <div class="advanced-method-ref" style="font-size:9.5px;color:var(--text-3);line-height:1.7;border-top:1px solid var(--border);padding-top:8px"><em>${refStr}</em></div>
        </div>
        <div class="advanced-method-right" style="min-width:0;overflow:hidden">${rightBody}</div>
      </div>
    </div>`;
  const allW = [...enriched].sort((a, b) => b.priority - a.priority).map(t => {
    const stats = threatStats ? threatStats[t.id] : null;
    const wp = weibullParamsForThreat(t, stats);
    const wP = weibullProbability(t, CMP, stats);
    const bP = wp.status === 'identified' ? clamp(1 - Math.pow(0.5, Math.max(0, CMP - NOW) / Math.max(1, wp.mid - NOW)), 0, 0.9999) : null;
    return { name: t.name, domain: t.domain, beta: wp.beta, wP, bP, delta: Number.isFinite(wP) && Number.isFinite(bP) ? wP - bP : null, censored: wp.censored, status: wp.status };
  });
  const betaMean = allW.reduce((s, r) => s + r.beta, 0) / Math.max(1, allW.length);
  const meanRef = independentFailureReference(enriched, CMP, threatStats);
  const wMeanLower = enriched.length && Number.isFinite(meanRef.expectedLower) ? meanRef.expectedLower / enriched.length : null;
  const wMeanUpper = enriched.length && Number.isFinite(meanRef.expectedUpper) ? meanRef.expectedUpper / enriched.length : null;
  const wMeanLabel = !Number.isFinite(wMeanLower) ? 'n/a' : meanRef.censoredCount
    ? `${Math.round(wMeanLower * 100)}–${Math.round(wMeanUpper * 100)}%` : `${Math.round(wMeanLower * 100)}%`;
  const fastestW = allW.reduce((best, r) => r.beta > (best ? best.beta : 0) ? r : best, null);
  const COL = 'minmax(0,1.6fr) 56px minmax(0,1fr) minmax(0,1fr) 52px';
  const wRight = `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:14px;flex-wrap:wrap">
      <span style="font-family:var(--mono);font-size:9px;color:var(--text-3);margin-right:4px">Comparison year:</span>
      ${[2035,2045,2055,2065].map(yr => `<button type="button" data-action="rerun-advanced" data-year="${yr}"
        style="font-family:var(--mono);font-size:9px;padding:4px 12px;border-radius:4px;cursor:pointer;border:1px solid;transition:all .15s;
        background:${yr===CMP?'var(--blue)':'var(--bg3)'};color:${yr===CMP?'#fff':'var(--text-3)'};border-color:${yr===CMP?'var(--blue)':'var(--border2)'}">${yr}</button>`).join('')}
      <span style="font-family:var(--mono);font-size:8.5px;color:var(--text-3);margin-left:4px">· ${allW.length} threats  by priority</span>
    </div>
    <div class="advanced-method-kpis" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
      ${[
        {l:'Mean β',v:betaMean.toFixed(2),note:'β > 1 means accelerating hazard',tip:'<b>Mean β shows the average speed of risk acceleration across all threats.</b> A value above 1 means that, on average, hazards are not just present, but are increasing dynamically. Higher values mean the model sees faster escalation pressure.'},
        {l:`Mean P by ${CMP}`,v:wMeanLabel,note:`All ${allW.length} threats; ${meanRef.censoredCount} censored, ${meanRef.invalidCount} invalid`,tip:`<b>This mean retains every threat.</b> Right-censored medians imply probability bounds [0, 0.5] within the horizon. Invalid inputs leave the full-population mean undefined.`},
        {l:'Fastest hazard',v:fastestW?fastestW.beta.toFixed(2):' ',note:fastestW?escapeHtml(fastestW.name):' ',tip:'<b>This shows which threat is currently accelerating fastest in the model.</b> It is not necessarily the biggest threat overall; it is the one whose modeled risk pressure grows fastest under the current settings.'},
      ].map(x=>`<div class="advanced-kpi-tooltip-card" data-tip="${escapeHtml(x.tip || '')}" tabindex="0" style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r4);padding:12px 26px 12px 12px;text-align:center;position:relative">
        <div style="font-family:var(--mono);font-size:22px;font-weight:700;color:var(--red);line-height:1">${x.v}</div>
        <div style="font-family:var(--mono);font-size:8px;color:var(--text-3);margin-top:4px">${x.l}</div>
        <div style="font-size:9px;color:var(--text-3);margin-top:4px;line-height:1.4">${x.note}</div>
      </div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:${COL};gap:10px;padding:5px 0 7px;border-bottom:2px solid var(--border2)">
      <div style="font-family:var(--mono);font-size:8px;color:var(--text-3)">Threat</div>
      <div style="font-family:var(--mono);font-size:8px;color:var(--text-3);text-align:center">β</div>
      <div style="font-family:var(--mono);font-size:8px;color:rgba(201,64,64,.9)">Weibull ${CMP}</div>
      <div style="font-family:var(--mono);font-size:8px;color:rgba(91,180,214,.9)">Geometric ${CMP}</div>
      <div style="font-family:var(--mono);font-size:8px;color:var(--text-3);text-align:center">Δ</div>
    </div>
    ${(()=>{
      const SHOW = 10;
      const barCol = v => v>=75?'#c94040':v>=50?'#d67a1c':v>=25?'#d4a017':'#2a9d6e';
      const rowHtml = (r,i) => {
        const dc = r.domain==='biosphere'?'#2a9d6e':r.domain==='technology'?'#3a78c9':'#c94040';
        const bc = r.beta>1.7?'#c94040':r.beta>1.45?'#d67a1c':r.beta>1.2?'#d4a017':'#2a9d6e';
        const wP = Number.isFinite(r.wP) ? Math.round(r.wP*100) : null, bP = Number.isFinite(r.bP) ? Math.round(r.bP*100) : null;
        const unavailable = r.censored ? 'cens.' : 'n/a';
        const dTxt = !Number.isFinite(r.delta) ? unavailable : Math.abs(r.delta)<0.005?'≈':(r.delta>0?'+':'')+Math.round(r.delta*100)+'pp';
        const dCol = !Number.isFinite(r.delta) ? 'var(--text-3)' : r.delta>0.005?'#c94040':r.delta<-0.005?'#2a9d6e':'var(--text-3)';
        const bg = i%2===0?'rgba(255,255,255,.013)':'transparent';
        return `<div style="display:grid;grid-template-columns:${COL};gap:10px;align-items:center;padding:5px 0;border-bottom:1px solid var(--border);background:${bg}">
          <div style="display:flex;align-items:center;gap:6px;min-width:0">
            <span style="display:inline-block;width:5px;height:5px;border-radius:50%;flex-shrink:0;background:${dc}"></span>
            <span style="font-size:10px;color:var(--text-2);overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${escapeHtml(r.name)}</span>
          </div>
          <div style="text-align:center;font-family:var(--mono);font-size:12px;font-weight:700;color:${bc}">${r.beta.toFixed(2)}</div>
          <div style="display:flex;align-items:center;gap:5px;min-width:0">
            <div style="flex:1;height:5px;background:var(--bg3);border-radius:3px;overflow:hidden;min-width:0">
              <div style="height:100%;width:${wP ?? 0}%;background:${r.censored?'var(--text-3)':barCol(wP)};border-radius:3px"></div>
            </div>
            <span style="font-family:var(--mono);font-size:10px;color:${wP===null?'var(--text-3)':barCol(wP)};flex-shrink:0;width:32px;text-align:right">${wP===null?unavailable:wP+'%'}</span>
          </div>
          <div style="display:flex;align-items:center;gap:5px;min-width:0">
            <div style="flex:1;height:5px;background:var(--bg3);border-radius:3px;overflow:hidden;min-width:0">
              <div style="height:100%;width:${bP ?? 0}%;background:${r.censored?'var(--text-3)':barCol(bP)};border-radius:3px"></div>
            </div>
            <span style="font-family:var(--mono);font-size:10px;color:${bP===null?'var(--text-3)':barCol(bP)};flex-shrink:0;width:32px;text-align:right">${bP===null?unavailable:bP+'%'}</span>
          </div>
          <div style="font-family:var(--mono);font-size:10px;font-weight:600;color:${dCol};text-align:center">${dTxt}</div>
        </div>`;
      };
      const visible = allW.slice(0, SHOW).map((r,i) => rowHtml(r,i)).join('');
      const hidden  = allW.slice(SHOW).map((r,i) => rowHtml(r, SHOW+i)).join('');
      const extra = allW.length > SHOW ? `
        <div id="weibullExtraRows" style="display:none">${hidden}</div>
        <button type="button" data-action="toggle-weibull-extra" data-hidden-count="${allW.length - SHOW}" id="weibullShowMoreBtn"
          style="margin-top:10px;width:100%;padding:7px;background:transparent;border:1px solid var(--border2);border-radius:var(--r4);font-family:var(--mono);font-size:9px;color:var(--text-3);cursor:pointer;letter-spacing:.08em;transition:border-color .15s">Show ${allW.length - SHOW} more threats ▾</button>` : '';
      return visible + extra;
    })()}
    <div style="display:flex;flex-wrap:wrap;gap:14px;margin-top:12px;font-size:9px;color:var(--text-3)">
      <span><span style="color:#c94040;font-weight:700">●</span> β&gt;1.7 rapidly accelerating</span>
      <span><span style="color:#d67a1c;font-weight:700">●</span> β 1.45–1.7 moderate</span>
      <span><span style="color:#d4a017;font-weight:700">●</span> β 1.2–1.45 mild</span>
      <span><span style="color:#2a9d6e;font-weight:700">●</span> β&lt;1.2 ≈ constant hazard</span>
      <span style="color:var(--border2)">|</span>
      <span>Δ = Weibull − Geometric baseline in pp</span>
    </div>`;
  const ec = networkEigenvectorCentrality(enriched).sort((a, b) => b.centrality - a.centrality).slice(0, 8);
  const maxCent = Math.max(...ec.map(e => e.centrality), 0.001);
  const ecRight = `
    <div class="advanced-method-kpis" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">
      ${[
        {l:'Top hub share',v:ec[0]?Math.round(ec[0].centrality*100)+'%':' ',note:ec[0]?escapeHtml(ec[0].name):' ',c:'var(--red)',tip:'<b>This shows how dominant the most connected threat is in the risk network.</b> A high value means one threat acts like a central hub that can influence many others. A lower value means risk is more evenly spread.'},
        {l:'Dependency links',v:graph.edges,note:'Undirected dependency pairs',c:'var(--text)',tip:'<b>This counts how many threat-to-threat connections the model currently detects.</b> More links mean risks are more entangled: one problem can more easily intensify or trigger another.'},
        {l:'Network density',v:Math.round(graph.density*100)+'%',note:'Share of possible links',c:'var(--blue)',tip:'<b>This shows how connected the whole risk network is.</b> A higher percentage means more possible connections between threats are active. In plain terms: the system is more interdependent.'},
      ].map(x=>`<div class="advanced-kpi-tooltip-card" data-tip="${escapeHtml(x.tip || '')}" tabindex="0" style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r4);padding:14px 26px 12px 12px;text-align:center;position:relative">
        <div style="font-family:var(--mono);font-size:24px;font-weight:700;color:${x.c};line-height:1">${x.v}</div>
        <div style="font-family:var(--mono);font-size:8px;color:var(--text-3);margin-top:4px">${x.l}</div>
        <div style="font-size:9px;color:var(--text-3);margin-top:4px;line-height:1.4">${x.note}</div>
      </div>`).join('')}
    </div>
    <div style="font-family:var(--mono);font-size:9px;color:var(--text-3);margin-bottom:10px">Highest dependency hubs  centrality shares, bars scaled to top hub</div>
    ${ec.map((e,i) => {
      const dc = e.domain==='biosphere'?'var(--green)':e.domain==='technology'?'var(--blue)':'var(--red)';
      const bar = Math.round((e.centrality / maxCent) * 100);
      return `<div style="display:grid;grid-template-columns:18px 1fr 44px;gap:8px;align-items:center;padding:4px 0;border-bottom:1px solid var(--border)">
        <div style="font-family:var(--mono);font-size:9px;color:var(--text-3);text-align:center">${i+1}</div>
        <div>
          <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px">
            <span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:${dc};flex-shrink:0"></span>
            <span style="font-size:10px;color:var(--text-2);overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${escapeHtml(e.name)}</span>
          </div>
          <div style="height:3px;background:var(--bg3);border-radius:2px;overflow:hidden">
            <div style="height:100%;width:${bar}%;background:${dc};border-radius:2px;transition:width .4s"></div>
          </div>
        </div>
        <div style="font-family:var(--mono);font-size:11px;font-weight:700;color:${dc};text-align:right">${bar}%</div>
      </div>`;
    }).join('')}
    <div style="display:flex;gap:16px;margin-top:10px;font-size:9px;color:var(--text-3)">
      <span><span style="color:var(--red)">●</span> Civilization</span>
      <span><span style="color:var(--green)">●</span> Biosphere</span>
      <span><span style="color:var(--blue)">●</span> Technology</span>
    </div>`;
  const jfYears = [2030, 2035, 2040, 2050, 2060, 2070, 2080];
  const fixedTh = [{k:3,col:'#3a78c9',label:'≥3'},{k:5,col:'#d4a017',label:'≥5'},{k:10,col:'#d67a1c',label:'≥10'},{k:15,col:'#c94040',label:'≥15'}];
  const jfRows = jfYears.map(year => {
    const ref = independentFailureReference(enriched, year, threatStats);
    if (ref.invalidCount) return {
      yr: year, mu: 'n/a', muValue: null, sigma: 'n/a', censoredCount: ref.censoredCount,
      invalidCount: ref.invalidCount, pGe3: null, pGe5: null, pGe10: null, pGe15: null,
    };
    const sigmaLower = correlatedScenarioSpread(ref.lowerPs, rhoE);
    const sigmaUpper = correlatedScenarioSpread(ref.upperPs, rhoE);
    const tail = k => ({ lower: poissonAtLeast(ref.lowerPmf, k), upper: poissonAtLeast(ref.upperPmf, k) });
    return {
      yr: year,
      mu: ref.censoredCount ? `${ref.expectedLower.toFixed(1)}–${ref.expectedUpper.toFixed(1)}` : ref.expectedLower.toFixed(1),
      muValue: ref.expectedLower,
      sigma: ref.censoredCount ? `${sigmaLower.toFixed(1)}–${sigmaUpper.toFixed(1)}` : sigmaLower.toFixed(1),
      censoredCount: ref.censoredCount,
      pGe3: tail(3), pGe5: tail(5), pGe10: tail(10), pGe15: tail(15),
    };
  });
  const muMax = Math.max(...jfRows.map(d => d.muValue).filter(Number.isFinite), 1);
  const jfRight = `
    <div style="font-family:var(--mono);font-size:9px;color:var(--text-3);margin-bottom:8px;letter-spacing:.06em">
      EXPECTED ACTIVE THRESHOLD CROSSINGS  μ(t) = Σ pᵢ(t)  ρ_eff=${Math.round(rhoE*100)}%
    </div>
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:14px 16px;margin-bottom:14px">
      <svg viewBox="0 0 560 72" style="width:100%;height:72px;display:block;overflow:visible">
        ${[5,10,15,20].filter(g=>g<=muMax*1.1).map(g=>{const y=62-(g/muMax)*56;return`<line x1="0" y1="${y.toFixed(1)}" x2="560" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,.05)" stroke-width="1"/>
          <text x="-4" y="${(y+3).toFixed(1)}" fill="rgba(255,255,255,.2)" font-size="7" font-family="var(--mono)" text-anchor="end">${g}</text>`;}).join('')}
        ${jfRows.map((d,i)=>{
          const x=14+i*(560/jfRows.length), bw=560/jfRows.length-8;
          if (!Number.isFinite(d.muValue)) return `<text x="${(x+bw/2).toFixed(1)}" y="58" fill="var(--text-3)" font-size="10" text-anchor="middle">n/a</text><text x="${(x+bw/2).toFixed(1)}" y="72" fill="var(--text-3)" font-size="9" text-anchor="middle">${d.yr}</text>`;
          const h=(d.muValue/muMax)*56;
          const col=d.muValue<5?'#3a78c9':d.muValue<10?'#d4a017':d.muValue<15?'#d67a1c':'#c94040';
          return `<rect x="${x.toFixed(1)}" y="${(62-h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${col}" opacity=".75" rx="3"/>
            <text x="${(x+bw/2).toFixed(1)}" y="${(62-h-4).toFixed(1)}" fill="${col}" font-size="10" font-family="var(--mono)" font-weight="bold" text-anchor="middle">${d.mu}</text>
            <text x="${(x+bw/2).toFixed(1)}" y="72" fill="rgba(255,255,255,.3)" font-size="9" font-family="var(--mono)" text-anchor="middle">${d.yr}</text>`;
        }).join('')}
      </svg>
    </div>
    <div style="font-family:var(--mono);font-size:9px;color:var(--text-3);margin-bottom:8px;letter-spacing:.06em">INDEPENDENT REFERENCE P(Xₜ ≥ k)  Poisson-binomial PMF convolution; ranges retain right-censored threats</div>
    <div style="overflow-x:auto;max-width:100%">
      <table style="width:100%;min-width:480px;border-collapse:collapse;font-family:var(--mono);font-size:9.5px">
        <thead><tr style="border-bottom:2px solid var(--border2)">
          <th style="text-align:left;padding:5px 8px;color:var(--text-3);font-weight:400">Threshold k</th>
          ${jfRows.map(d=>`<th style="text-align:center;padding:5px 8px;color:var(--text-3);font-weight:400">${d.yr}</th>`).join('')}
        </tr></thead>
        <tbody>
          ${fixedTh.map(th=>`<tr style="border-bottom:1px solid var(--border)">
            <td style="padding:6px 8px;color:${th.col};font-weight:700">${th.label} threats</td>
            ${jfRows.map(d=>{
              const val = d[`pGe${th.k}`];
              if (!val) return '<td style="text-align:center;padding:6px 8px;color:var(--text-3)">n/a</td>';
              const pctLo = Math.round(val.lower*100), pctHi = Math.round(val.upper*100);
              const bg = pctLo>80?'rgba(201,64,64,.12)':pctLo>50?'rgba(212,160,23,.10)':pctLo>20?'rgba(58,120,201,.08)':'transparent';
              return `<td style="text-align:center;padding:6px 8px;color:${th.col};background:${bg}">${pctLo===pctHi?pctLo+'%':pctLo+'–'+pctHi+'%'}</td>`;
            }).join('')}
          </tr>`).join('')}
          <tr style="border-bottom:1px solid var(--border);opacity:.5">
            <td style="padding:6px 8px;color:var(--text-3)">μ ± σ</td>
            ${jfRows.map(d=>`<td style="text-align:center;padding:6px 8px;color:var(--text-3)">${Number.isFinite(d.muValue) ? `${d.mu}±${d.sigma}` : 'n/a'}</td>`).join('')}
          </tr>
        </tbody>
      </table>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:14px;margin-top:10px;font-size:9px;color:var(--text-3)">
      <span><span style="color:#3a78c9">■</span> μ&lt;5  low</span>
      <span><span style="color:#d4a017">■</span> μ 5–10  moderate</span>
      <span><span style="color:#d67a1c">■</span> μ 10–15  high</span>
      <span><span style="color:#c94040">■</span> μ&gt;15  critical</span>
      <span style="color:var(--border2)">|</span>
      <span>σ is a separate scenario spread using Var=(1−ρ)Σvᵢ+ρ(Σ√vᵢ)² with ρ_eff=${Math.round(rhoE*100)}%; it does not define a joint Bernoulli model or correlated tails</span>
    </div>`;
  const sh = shannonEntropyRisk(enriched);
  const shC = sh.concentration;
  const shCol = shC > 0.35 ? '#c94040' : shC > 0.20 ? '#d4a017' : '#2a9d6e';
  const topShare = sh.shares.slice(0, 6);
  const shRight = `
    <div class="advanced-method-kpis" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
      ${[
        {label:'Entropy H',val:sh.h.toFixed(2),unit:'bits',col:'var(--blue)',desc:'How widely priority is spread across threats. Higher means broader risk.',tip:'<b>Entropy shows how widely risk priority is spread across the 23 threats.</b> Higher entropy means many threats matter at the same time. Lower entropy means only a few threats dominate the model.'},
        {label:'H_max = log₂(N)',val:sh.hMax.toFixed(2),unit:'bits',col:'var(--text-2)',desc:'Maximum possible spread if all threats were equally weighted.',tip:'<b>Hmax is the theoretical maximum entropy for this model.</b> It is the value entropy would reach if all 23 threats were weighted equally. It is used as a reference point, not as a separate warning signal.'},
        {label:'Concentration C',val:(shC*100).toFixed(1)+'%',unit:'1−H/H_max',col:shCol,desc:'How much risk is dominated by a few threats. Lower means more diffuse.',tip:'<b>Concentration shows whether risk is dominated by only a few threats.</b> A low value means risk is diffuse and spread broadly. A high value means the model is concentrated around a small number of dominant threats.'},
      ].map(x=>`<div class="advanced-kpi-tooltip-card" data-tip="${escapeHtml(x.tip || '')}" tabindex="0" style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r4);padding:14px 26px 12px 12px;text-align:center;position:relative">
        <div style="font-family:var(--mono);font-size:24px;font-weight:700;color:${x.col};line-height:1">${x.val}</div>
        <div style="font-family:var(--mono);font-size:8px;color:var(--text-3);margin-top:4px">${x.label}</div>
        <div style="font-family:var(--mono);font-size:7px;color:var(--text-3)">${x.unit}</div>
        <div style="font-size:8.5px;color:var(--text-3);line-height:1.45;margin-top:8px">${x.desc}</div>
      </div>`).join('')}
    </div>
    <div style="position:relative;height:8px;background:var(--bg3);border:1px solid var(--border);border-radius:4px;overflow:hidden;margin-bottom:10px">
      <div style="position:absolute;left:0;top:0;height:100%;width:${(shC*100).toFixed(1)}%;background:${shCol};border-radius:4px;transition:width .4s"></div>
    </div>
    <div style="font-size:10px;color:var(--text-3);margin-bottom:14px">
      ${shC>0.35?'High concentration a small number of threats drives most systemic risk. Targeted prioritised intervention may be decisive.':
        shC>0.20?'Moderate concentration risk is dispersed but not uniform. A multi-domain approach is required.':
        'Diffuse risk landscape no single threat dominates. Systemic resilience is needed across all domains simultaneously.'}
    </div>
    <div style="font-family:var(--mono);font-size:8.5px;color:var(--text-3);margin-bottom:6px">Priority share top 6</div>
    ${topShare.map(t => {
      const dc = t.domain==='biosphere'?'var(--green)':t.domain==='technology'?'var(--blue)':'var(--red)';
      return `<div style="display:grid;grid-template-columns:1fr 48px;gap:8px;align-items:center;padding:4px 0;border-bottom:1px solid var(--border)">
        <div>
          <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px">
            <span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:${dc}"></span>
            <span style="font-size:10px;color:var(--text-2);overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${escapeHtml(t.name)}</span>
          </div>
          <div style="height:3px;background:var(--bg3);border-radius:2px;overflow:hidden">
            <div style="height:100%;width:${(t.share*100).toFixed(1)}%;background:${dc};border-radius:2px"></div>
          </div>
        </div>
        <div style="font-family:var(--mono);font-size:11px;color:var(--text-2);text-align:right">${(t.share*100).toFixed(1)}%</div>
      </div>`;
    }).join('')}`;
  const evidence = {
    strong: enriched.filter(t => (t.evStr||'') === 'strong').length,
    moderate: enriched.filter(t => (t.evStr||'') === 'moderate').length,
    weak: enriched.filter(t => (t.evStr||'') === 'weak').length,
  };

  box.innerHTML = `
    <div class="advanced-method-intro" style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:14px;padding:18px 22px;background:var(--surface);border:1px solid var(--border);border-radius:var(--r8);border-left:3px solid var(--blue)">
      <div>
        <div style="font-family:var(--mono);font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--blue);margin-bottom:5px">Advanced Methodology  Quantitative Science Layer</div>
        <div class="advanced-method-intro-title" style="font-size:18px;font-weight:800;color:var(--text);margin-bottom:6px;letter-spacing:-.02em">4 Internal Quantitative Diagnostics</div>
        <div class="advanced-method-intro-copy" style="font-size:11px;color:var(--text-3);line-height:1.7;max-width:820px">
          These methods compare different internal summaries of the same model inputs and assumptions. Agreement is an internal diagnostic comparison; it does not independently validate the primary MCDA model. Read as an <strong style="color:var(--text-2)">optional diagnostic layer</strong>.
          <span style="color:var(--text-3)">  Active threats: ${enriched.length}  Evidence: ${evidence.strong}× strong / ${evidence.moderate}× moderate / ${evidence.weak}× weak</span>
        </div>
      </div>
      <div class="advanced-method-coupling" style="flex-shrink:0;text-align:right" data-tip="<strong>ρ_eff (scenario coupling)</strong>A graph-derived scenario assumption used only for the displayed spread formula. It is not an estimated Bernoulli correlation and does not determine joint failures or correlated tails. A value of 0 recovers the independent-reference variance; larger values increase the assumed spread without defining a joint distribution.">
        <div style="font-family:var(--mono);font-size:9px;color:var(--text-3)">ρ_eff (domain coupling)</div>
        <div style="font-family:var(--mono);font-size:28px;font-weight:700;color:var(--blue);line-height:1">${Math.round(rhoE*100)}%</div>
        <div style="font-family:var(--mono);font-size:8px;color:var(--text-3)">scenario spread assumption</div>
      </div>
    </div>
    ${card('var(--red)','01','Weibull Survival Analysis  Accelerating Hazard',
      '\\(m_i\\le2100:\\;\\eta_i=\\dfrac{m_i-t_0}{(\\ln 2)^{1/\\beta_i}},\\;F_i(t)=1-\\exp[-((t-t_0)/\\eta_i)^{\\beta_i}];\\quad m_i>2100:\\;\\text{right-censored, }\\eta_i\\text{ undefined}\\)',
      'Diagnostic survival layer. It estimates time-varying crossing probability only where the threat median is identifiable within the model horizon. A median beyond 2100 remains right-censored: η and point probabilities are not manufactured from a fallback year. The hazard accelerates only when β > 1, is constant at β = 1, and decelerates when β < 1.',
      'Weibull (1951) J. Appl. Mech.  Cox &amp; Oakes (1984)  Kousky &amp; Cooke (2009)',wRight)}
    ${card('var(--green)','02','Network Eigenvector Centrality  Dependency Hubs',
      '\\(D=\\{(i,j):j\\in deps_i\\};\\; A_{ij}=A_{ji}\\mathrel{+}=0.70+0.06I_i+0.04I_j\\;\\forall(i,j)\\in D;\\; v_i^{(0)}=1/\\sqrt{N};\\; \\mathbf{v}^{(k+1)}=\\dfrac{A\\mathbf{v}^{(k)}+\\varepsilon\\mathbf{1}}{\\lVert A\\mathbf{v}^{(k)}+\\varepsilon\\mathbf{1}\\rVert_2},\\; \\varepsilon=10^{-3};\\; c_i=\\dfrac{v_i}{\\sum_j v_j};\\; \\tilde c_i=c_i\\max(P_i,10^{-3})\\)',
      'Eigenvector centrality measures recursive influence over the symmetrised dependency matrix actually built by the code. This is a dependency-hub diagnostic, not the year-by-year dynamic cascade simulation. A small ε offset keeps isolated or weakly connected nodes numerically stable; visible bars use centrality share cᵢ, while the console structural-hub status can use the priority-weighted score c̃ᵢ.',
      'Bonacich (1972) J. Math. Sociology  Newman (2010) Networks ch.7  Helbing (2013) Nature 497',ecRight)}
    ${card('#d4a017','03','Concurrent Threshold Crossings  Poisson-Binomial Distribution',
      '\\(p_i(t)=\\operatorname{clamp}(F_i(t),0,0.9999);\\; X_t=\\sum_{i=1}^{N}B_i(t),\\; B_i\\sim\\mathrm{Bernoulli}(p_i(t));\\; f_0^{(0)}=1,\\; f_{k<0}^{(i)}=0;\\; f_k^{(i)}=(1-p_i)f_k^{(i-1)}+p_i f_{k-1}^{(i-1)};\\; P(X_t\\ge k)=\\sum_{j=k}^{N} f_j^{(N)};\\; \\mu(t)=\\sum_i p_i(t)\\)',
      'Poisson-binomial tail probabilities are an independence reference, computed by dynamic-programming convolution of unequal Bernoulli probabilities. Right-censored Weibull medians remain explicit and produce bounds rather than artificial zero probabilities. The separately displayed correlated spread is a scenario assumption using Var=(1−ρ)Σvᵢ+ρ(Σ√vᵢ)²; this variance formula alone does not specify a valid joint Bernoulli model or correlated tails.',
      'Wang (1993) Poisson binomial  Helbing (2013) Nature 497  Joe (1997) Multivariate Models',jfRight)}
    ${card('#8b5cf6','04','Shannon Entropy of the Risk Landscape',
      `\\(r_i=\\max(10^{-3},P_i);\\; w_i=\\dfrac{r_i}{\\sum_j r_j};\\; H=-\\sum_i w_i\\log_2 w_i;\\; H_{\\max}=\\log_2N=${sh.hMax.toFixed(2)}\\,\\mathrm{bits};\\; C=1-H/H_{\\max};\\; N_{eff}=2^H\\)`,
      'Shannon entropy H quantifies the breadth of the priority-weighted threat landscape. The concentration index C = 1 − H/H_max translates entropy into a directional signal for risk governance: high C favours focused response; low C demands broad systemic resilience across all domains simultaneously.',
      'Shannon (1948) Bell Syst. Tech. J.  Stirling (2007) Diversity as systemic risk measure',shRight)}`;

  if (typeof renderMathInElement !== 'undefined') {
    renderMathInElement(box, {
      delimiters: [{ left: '\\(', right: '\\)', display: false }, { left: '\\[', right: '\\]', display: true }],
      throwOnError: false,
    });
  }
}

function buildNarrative(scKey, enriched, mcRes) {
  const sorted = [...enriched].sort((a,b) => b.priority-a.priority);
  const top3 = sorted.slice(0,3).map(t=>`<strong>${t.name}</strong>`).join(', ');
  const gsi = calcGSI(enriched).toFixed(0);
  const p50 = mcRes ? fmtY(mcRes.p50) : ' ';
  const p50Band = mcRes ? describeHorizonBand(mcRes.p50) : ' ';
  const p2050 = mcRes ? pct((mcRes.cdf.find(e=>e.year===2050)||{prob:0}).prob) : ' ';
  const cascadeP50 = mcRes && mcRes.ensemble && mcRes.ensemble.dynamicCascade ? fmtY(mcRes.ensemble.dynamicCascade.p50) : ' ';
  const cascadeP90 = mcRes && mcRes.ensemble && mcRes.ensemble.dynamicCascade ? fmtY(mcRes.ensemble.dynamicCascade.p90) : ' ';
  const earliestList = sorted
    .map(t => ({
      name: t.name,
      horizon: mcRes && mcRes.threatStats && mcRes.threatStats[t.id] ? mcRes.threatStats[t.id].p50 : t.horizon,
    }))
    .filter(t => t.horizon <= YE)
    .sort((a, b) => a.horizon - b.horizon);
  const earliestItem = earliestList[0];
  const earliest = earliestItem ? `${earliestItem.name} (${fmtY(earliestItem.horizon)})` : 'none within 2100';

  const intro = {
    baseline:      `Under the <strong>Baseline</strong> scenario, no major corrective action reshapes systemic pressures.`,
    coordination:  `Under <strong>High Cooperation</strong>, global governance stabilizes and coordinated mitigation is applied across domains.`,
    cascade:       `The <strong>Polycrisis Cascade</strong> scenario models simultaneous intensification across all domains. Per-threat risk-growth proxies are elevated and uncertainty is widened.`,
    techaccel:     `Under <strong>Tech Acceleration</strong>, AI and cyber risks grow significantly faster than under baseline, while governance lags capability growth.`,
    fragmentation: `<strong>Fragmentation</strong> weakens global coordination capacity. Geopolitical and governance threats receive higher per-threat multipliers.`,
  };

  return `${intro[scKey]||''} The Global Stress Index stands at <strong>${gsi}/100</strong>.
  The three highest-priority threats are ${top3}, with the earliest individual threat horizon at <strong>${earliest}</strong>.
  The <em>compensatory</em> aggregate model (weighted threat-mass crossing) gives a central horizon of <strong>${p50}</strong> (${p50Band}),
  with approximately <strong>${p2050}</strong> probability of compensatory crossing by 2050.
  The <em>dynamic functional cascade</em> follows directed losses of supporting functions. Its P50 is <strong>${cascadeP50}</strong> and its P90 is <strong>${cascadeP90}</strong>; both are shown in the paired headline clocks. A single initial failure can propagate; simultaneous initial failure in all three domains is not required. The trigger is a share of criticality weights, globally or within any essential-service basket, reaching the run’s cascade threshold (sampled from 0.40 to 0.60); it is not a measured fraction of service output.
  <br><br><strong>Standalone → propagated functional P50:</strong> ${['oceans','biodiversity','amr','supply'].map(id => { const t = enriched.find(item => item.id === id); return t && mcRes?.functionalStats?.[id] ? `${t.name}: ${fmtY(mcRes.threatStats[id].p50)} → ${fmtY(mcRes.functionalStats[id].p50)}` : ''; }).filter(Boolean).join('; ')}.
  <br><br><em style="color:var(--text3);font-size:10px">Functional failure can precede disappearance of all organisms. The model records first threshold crossings, not permanent destruction or completion of global collapse. A narrow interval does not establish calibration: common assumptions and threshold structure can create it. P90 is a time-distribution quantile, not a physical tipping threshold.</em>
  <br><br><em style="color:var(--text3);font-size:10px">These are model-generated scenario intervals, not empirical probabilities.
  Results are highly sensitive to risk-growth proxy assumptions and dependency structure.</em>`;
}


const SOURCE_DATA_URL = './data_v1_9_0.json';

function threatReadMoreLink(t) {
  const url = SOURCE_DATA_URL;
  const label = escapeHtml(t?.name || 'this threat');
  return `<a class="threat-read-more" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="View source data for ${label}">VIEW SOURCE DATA</a>`;
}

function threatTableMetaHtml(t) {
  const col = domCol(t.domain);
  const domLbl = t.domain.charAt(0).toUpperCase()+t.domain.slice(1);
  return `<div class="threat-table-meta" aria-label="Threat classification details">
    <span class="td-dom threat-table-pill" style="background:${col}22;color:${col};border-color:${col}55" title="Domain: ${escapeHtml(domLbl)}" aria-label="Domain: ${escapeHtml(domLbl)}">${escapeHtml(domLbl)}</span>
    ${threatMechanismBadgeHtml(t, 'threat-table-pill')}
    ${threatReversibilityPillHtml(t, 'threat-table-pill')}
  </div>`;
}

function renderTable(enriched, mcRes) {
  const tbody = document.getElementById('tbody'); if (!tbody) return;
  const sorted = [...enriched].sort((a,b) => b.priority-a.priority);
  tbody.innerHTML = sorted.map((t, i) => {
    const displayRank = i + 1;
    const stats = mcRes && mcRes.threatStats ? mcRes.threatStats[t.id] : null;
    const horizonMid = stats ? stats.p50 : t.horizon;
    const intervalCell = stats
      ? `${fmtY(stats.p10)}–${fmtY(stats.p90)}`
      : `<span class="no-cross">Run MC</span>`;

    const horizonCell = horizonMid > YE
      ? `<span class="no-cross">No crossing ≤ 2100</span>`
      : `<span style="font-family:var(--mono);font-weight:700;color:var(--text)">${fmtY(horizonMid)}</span>`;

    return `<tr>
      <td style="color:var(--text3);font-family:var(--mono)">${displayRank}</td>
      <td class="td-name"><div class="threat-title-row"><span class="threat-title-text">${escapeHtml(t.name)}</span>${threatReadMoreLink(t)}</div>${threatTableMetaHtml(t)}</td>
      <td>${sourceBadge(muOf(t.scale), t.scale)}</td>
      <td>${sourceBadge(muOf(t.urgency), t.urgency)}</td>
      <td>${sourceBadge(muOf(t.acceleration), t.acceleration)}</td>
      <td>${sourceBadge(muOf(t.interdependence), t.interdependence)}</td>
      <td>${sourceBadge(muOf(t.irreversibility), t.irreversibility)}</td>
      <td>${sourceBadge(muOf(t.gov_failure), t.gov_failure)}</td>
      <td class="td-mono" style="color:var(--text2)">${t.bs.toFixed(2)}</td>
      <td class="td-mono" style="color:var(--text)">${t.priority.toFixed(2)}</td>
      <td>${horizonCell}</td>
      <td style="font-family:var(--mono);color:var(--text2);font-size:10px">${intervalCell}</td>
      <td style="font-family:var(--mono);color:var(--text2);font-size:10px">${
        sourceBadge(
          (Number.isFinite(t.growth_rate_effective)
            ? t.growth_rate_effective
            : effectiveRiskGrowthForThreat(t, muOf(t.growth_rate))) * 100,
          t.growth_rate,
          2,
          '%/yr'
        )
      }</td>
      <td style="font-family:var(--mono);color:var(--text2);font-size:10px">${sourceBadge(getThreatThreshold(t), t.threshold, 2)}</td>
      <td>${scientificEvidenceCellHtml(t)}</td>
      <td>${parameterCalibrationCellHtml(t)}</td>
      <td style="color:var(--text3);max-width:120px;min-width:80px;line-height:1.35;font-size:9px;overflow:hidden;text-overflow:ellipsis">${t.mechanism||' '}</td>
    </tr>`;
  }).join('');

  // A seventeen-column table is useful on a desktop but cannot be made legible on a phone by
  // shrinking it. Render the same values as collapsed cards for the mobile breakpoint. The desktop
  // table remains the canonical tabular view; this is only a responsive presentation of its data.
  let mobileRegister = document.getElementById('mobileThreatRegister');
  if (!mobileRegister) {
    mobileRegister = document.createElement('div');
    mobileRegister.id = 'mobileThreatRegister';
    mobileRegister.className = 'mobile-threat-register';
    mobileRegister.setAttribute('aria-label', 'Full threat register, mobile view');
    const tableWrap = tbody.closest('.tbl-wrap');
    // Keep the cards inside the table wrapper because that wrapper is the section-navigation target.
    // If they were inserted as a sibling after startup, SectionNav would not know to hide them.
    if (tableWrap) tableWrap.append(mobileRegister);
  }
  const mobileMetric = (label, value, extraClass = '') => `<div class="mobile-register-metric ${extraClass}">
    <span class="mobile-register-label">${label}</span><span class="mobile-register-value">${value}</span>
  </div>`;
  mobileRegister.innerHTML = sorted.map((t, i) => {
    const stats = mcRes && mcRes.threatStats ? mcRes.threatStats[t.id] : null;
    const horizonMid = stats ? stats.p50 : t.horizon;
    const intervalCell = stats ? `${fmtY(stats.p10)}–${fmtY(stats.p90)}` : '<span class="no-cross">Run MC</span>';
    const horizonCell = horizonMid > YE
      ? '<span class="no-cross">No crossing ≤ 2100</span>'
      : `<span class="td-mono">${fmtY(horizonMid)}</span>`;
    const effectiveGrowth = (Number.isFinite(t.growth_rate_effective)
      ? t.growth_rate_effective
      : effectiveRiskGrowthForThreat(t, muOf(t.growth_rate))) * 100;
    const domainColor = domCol(t.domain);
    const domainLabel = t.domain.charAt(0).toUpperCase() + t.domain.slice(1);
    return `<details class="mobile-register-card">
      <summary class="mobile-register-summary">
        <span class="mobile-register-rank">${i + 1}</span>
        <span class="mobile-register-heading">
          <span class="mobile-register-name">${escapeHtml(t.name)}</span>
          <span class="mobile-register-domain" style="color:${domainColor}">${escapeHtml(domainLabel)}</span>
        </span>
        <span class="mobile-register-score"><strong>${t.priority.toFixed(2)}</strong><small>adjusted</small></span>
        <span class="mobile-register-arrow" aria-hidden="true">⌄</span>
      </summary>
      <div class="mobile-register-body">
        ${threatTableMetaHtml(t)}
        <div class="mobile-register-grid">
          ${mobileMetric('Scale', sourceBadge(muOf(t.scale), t.scale))}
          ${mobileMetric('Urgency', sourceBadge(muOf(t.urgency), t.urgency))}
          ${mobileMetric('Acceleration', sourceBadge(muOf(t.acceleration), t.acceleration))}
          ${mobileMetric('Interdependence', sourceBadge(muOf(t.interdependence), t.interdependence))}
          ${mobileMetric('Irreversibility', sourceBadge(muOf(t.irreversibility), t.irreversibility))}
          ${mobileMetric('Governance', sourceBadge(muOf(t.gov_failure), t.gov_failure))}
          ${mobileMetric('Base score', t.bs.toFixed(2))}
          ${mobileMetric('Adjusted score', t.priority.toFixed(2))}
          ${mobileMetric('Model Tᵢ', horizonCell)}
          ${mobileMetric('Model P10–P90', intervalCell)}
          ${mobileMetric('Growth', sourceBadge(effectiveGrowth, t.growth_rate, 2, '%/yr'))}
          ${mobileMetric('Threshold', sourceBadge(getThreatThreshold(t), t.threshold, 2))}
          ${mobileMetric('Scientific evidence', scientificEvidenceCellHtml(t), 'mobile-register-wide')}
          ${mobileMetric('Input calibration', parameterCalibrationCellHtml(t), 'mobile-register-wide')}
        </div>
        <div class="mobile-register-mechanism"><span class="mobile-register-label">Mechanism</span><p>${escapeHtml(t.mechanism || 'Not supplied')}</p></div>
        <div class="mobile-register-actions">${threatReadMoreLink(t)}</div>
      </div>
    </details>`;
  }).join('');
}


function metricSourceSummary(rangeObj) {
  if (!rangeObj || typeof rangeObj !== 'object') return '';
  const src = sourceOf(rangeObj) || '';
  const parameterGrade = parameterCalibrationGrade(rangeObj);
  const grade = `Input calibration ${escapeHtml(parameterGrade.grade)}${parameterGrade.legacy ? ' (legacy)' : ''}`;
  const yr = rangeObj.accessed ? `accessed ${escapeHtml(rangeObj.accessed)}` : '';
  return [src ? escapeHtml(src) : '', grade, yr].filter(Boolean).join('  ');
}

/** High impact, low probability: an event-like (event or regime) threat with high priority, scale or irreversibility. */
function isHilpThreat(t) {
  if (!t) return false;
  const eventLike = t.process_type === 'event' || t.process_type === 'regime';
  const highImpact = (Number.isFinite(t.priority) && t.priority >= 4.5) || muOf(t.scale) >= 4.5 || muOf(t.irreversibility) >= 4.5;
  return eventLike && highImpact;
}

function metricTooltip(label) {
  const tips = {
    'To lower': '<strong>To lower</strong>Years until the lower edge of the model interval. In plain terms: this is the faster, earlier side of the estimate, not a fixed deadline.',
    'To mid': '<strong>To mid</strong>Years until the central estimate. Half of the model runs cross before this point and half after it, so it is the main middle estimate.',
    'To upper': '<strong>To upper</strong>Years until the upper edge of the model interval. This shows the later side of the range and helps show how wide the uncertainty is.',
    'Severity': '<strong>Severity</strong>How large the damage could be if this threat unfolds. 1 means limited impact, 5 means global or planetary-scale impact.',
    'Urgency': '<strong>Urgency</strong>How quickly this threat is becoming relevant. A high value means it matters on a near-term timeline, not only in the distant future.',
    'Cascade': '<strong>Cascade</strong>How strongly this threat can speed up itself or pull connected threats forward. High values make the model treat it as an amplifier.',
    'Interdependence': '<strong>Incoming functional vulnerability</strong>How strongly this target function depends on upstream systems. It is not the source threat’s outgoing importance. Directed edge weights and criticality tiers are separate model assumptions.',
    'Irreversibility': '<strong>Irreversibility</strong>How hard the damage is to undo. A high value means effects can last for decades, centuries, or become practically permanent.',
    'Gov. failure': '<strong>Governance failure</strong>How poorly institutions, treaties, regulation, or coordination can control this threat. High means society is less prepared to manage it.',
    'Growth proxy': '<strong>Effective risk-growth proxy</strong>Annualized effective systemic risk-growth proxy used by the model. It may be derived from empirical indicators, but it is not necessarily the raw empirical CAGR itself.',
    'Model threshold': '<strong>Model threshold</strong>Normalized model destabilization threshold. It is a judgment-based model input informed by evidence, not usually a directly observed empirical boundary.',
    'P / 2050': '<strong>P / 2050</strong>Model implied probability that the overall threshold is crossed by 2050 under the current scenario. It is a scenario output, not a measured real-world probability.',
    'HILP': '<strong>HILP</strong>High Impact, Low Probability. This marks a threat that may be unlikely in the near term but would be severe enough to keep visible.'
  };
  return tips[label] || `<strong>${label}</strong>Model metric used by the calculator to place this threat on the current risk timeline.`;
}

function climateMetric(label, value, sub) {
  return `<div class="meta-cell" data-tip="${escapeHtml(metricTooltip(label))}"><div class="meta-lbl">${escapeHtml(label)}</div><div class="meta-val">${value}</div>${sub ? `<div class="meta-sub">${sub}</div>` : ''}</div>`;
}

function collectThreatSourceLinks(t) {
  const fields = [
    ['Scale', t.scale], ['Urgency', t.urgency], ['Acceleration', t.acceleration], ['Interdependence', t.interdependence],
    ['Irreversibility', t.irreversibility], ['Governance', t.gov_failure], ['Growth', t.growth_rate], ['Threshold', t.threshold]
  ];
  const byUrl = new Map();
  fields.forEach(([field, r]) => {
    if (!r || !r.url) return;
    const url = normalizeHttpUrl(r.url);
    if (!url) return;
    const existing = byUrl.get(url) || {
      url,
      fields: [],
      source: sourceOf(r) || 'JSON source',
      strength: r.strength || r.confidence || t.evStr || 'moderate',
      notes: []
    };
    existing.fields.push(field);
    if (r.note && !existing.notes.includes(r.note)) existing.notes.push(r.note);
    byUrl.set(url, existing);
  });
  return Array.from(byUrl.values());
}


function formatYear(y) {
  if (!Number.isFinite(y)) return 'Not identified';
  if (y > YE) return '>2100';
  return String(Math.round(y));
}


function threatCardColor(domain) {
  const d = String(domain || '').toLowerCase();
  if (d === 'civilization') return 'civilization';
  if (d === 'technology') return 'technology';
  return 'biosphere';
}

const THREAT_SCIENTIFIC_DESCRIPTIONS = {
  climate: 'Climate breakdown describes a sustained destabilization of the Earth system: rising heat, more volatile hydrological cycles, stressed food and water systems, sea-level rise, and ecological feedbacks that can reinforce one another over time. In this model it is treated as a continuous cross-domain pressure that can magnify biospheric, economic, geopolitical, health, and technological risks rather than as a single isolated event.',
  biodiversity: 'Biodiversity loss describes the accelerating unraveling of the biosphere’s living complexity in the Anthropocene: a period in which human activity has become a planetary force and has driven processes that many biologists describe as the sixth mass extinction of animal, plant, and other species. Populations collapse, more species move toward local or global extinction, habitats fragment, and ecological networks lose the resilience that allows life-support systems to withstand shocks. Pollination, nutrient cycling, soil formation, fisheries, food webs, ecological disease regulation, and climate stability are bound together by this biological architecture. As that architecture breaks down, the biosphere becomes more brittle, local ecological failures spread more easily, and species loss can begin feeding on itself through habitat collapse, food-web disruption, pollinator loss, soil degradation, water-system stress, and weakened ecological disease regulation.',
  nuclear: 'Nuclear war remains a low-frequency but extreme-consequence threat in which escalation, miscalculation, command failures, or coercive crises can produce abrupt civilizational discontinuity. Its risk is not limited to immediate blast effects: atmospheric, agricultural, geopolitical, and institutional cascades can propagate far beyond the initiating conflict.',
  water: 'Freshwater stress is modeled here as a structural pressure on civilization and the biosphere, driven by aquifer depletion, hydrological instability, pollution, and intensifying competition among agriculture, cities, ecosystems, and industry. Because water links directly to food, energy, migration, health, and state capacity, even regional deficits can scale into wider systemic strain.',
  soils: 'Soil degradation captures the long-term depletion of the thin living substrate on which terrestrial food production and major biogeochemical cycles depend. Declining fertility, erosion, contamination, salinization, and organic-matter loss can quietly undermine agricultural output, biodiversity, hydrology, and social stability over multi-decade timescales.',
  oceans: 'Ocean degradation encompasses warming, acidification, deoxygenation, ecological disruption, and stress on fisheries and coastal systems. As the ocean regulates climate, food supply, oxygen production, and carbon uptake, persistent marine deterioration can amplify both biospheric instability and human vulnerability.',
  pollution: 'Pollution is treated as a chronic distributed stressor spanning air, water, soil, food chains, and human tissues. Rather than one pollutant alone, the systemic concern lies in the cumulative interaction of toxic exposures with health burdens, ecological damage, developmental harms, and governance failure.',
  pandemics: 'Pandemic risk arises from the interaction of pathogen emergence, dense global connectivity, supply-chain fragility, health-system limits, and uneven coordination. In the model, pandemics matter not only for mortality but also because they can trigger secondary disruptions in labor, trade, legitimacy, and political stability.',
  amr: 'Antimicrobial resistance gradually degrades one of modern medicine’s foundational control systems by making routine infections, surgeries, childbirth, and cancer treatment more dangerous. Its significance is systemic because it accumulates silently, spreads across borders and sectors, and can raise the background vulnerability of the entire health-security landscape.',
  bioengineered: 'Bioengineered pathogen risk reflects the combination of expanding biotech capability, falling barriers to manipulation, and imperfect global oversight. The danger is nonlinear: engineered traits, delayed detection, and weak containment can transform a local biological incident into a broad multi-system crisis.',
  ai: 'Advanced AI risk is modeled as a fast-moving technological pressure with potential to outpace governance, labor adaptation, information integrity, cyber defense, and military restraint. Its systemic relevance lies in its capacity to couple with many other domains simultaneously, including epistemic stability, economic concentration, autonomous systems, and strategic escalation.',
  cyber: 'Cyber risk captures the exposure of deeply networked societies to digital sabotage, cascading infrastructure disruption, data compromise, and institutional paralysis. Because finance, energy, logistics, communications, and public administration all depend on digital coordination, cyber failure can act as a force multiplier for many other crises.',
  autonomousw: 'Autonomous-weapons risk emerges when increasing machine speed, targeting autonomy, and reduced human deliberation compress the time available to detect, interpret, and halt escalation. The systemic concern is not only battlefield lethality but also destabilized deterrence, lower thresholds for force, and faster error propagation.',
  minerals: 'Critical-mineral stress reflects dependence on concentrated supply chains for materials required by energy transition, electronics, defense, and advanced industry. Scarcity, geopolitical concentration, extraction bottlenecks, and ecological conflict can turn a materials issue into a wider technological and economic choke point.',
  space: 'Space-system risk concerns the fragility of orbital infrastructure on which navigation, communications, weather forecasting, finance, observation, and military coordination increasingly depend. Debris growth, congestion, conflict, and anti-satellite activity can convert localized orbital disruption into broad terrestrial consequences.',
  geopolitics: 'Geopolitical escalation captures worsening rivalry, coercion, conflict diffusion, sanctions spirals, arms-race dynamics, and the erosion of cooperative security arrangements. It is a classic systemic trap: security dilemmas, brinkmanship, commitment problems, misperception, and collective-action failure can push rational actors into sequences of escalation that no actor fully controls. Its danger is not only war itself, but also the breakdown of coordination capacity on climate, pandemics, artificial intelligence, nuclear risk, trade, migration, and resource pressure, precisely when cross-border cooperation is needed most.',
  supply: 'Supply-chain breakdown reflects the vulnerability of highly optimized global production and distribution systems to shocks in transport, manufacturing, energy, finance, climate, and geopolitics. Its systemic role is connective: it transmits local disturbances into broad shortages, price spikes, and institutional stress.',
  fragmentation_gov: 'Governance fragmentation describes the weakening of shared rules, multilateral capacity, and collective problem-solving across states and institutions. When governance fragments, risks that require coordinated mitigation—climate, pandemics, conflict prevention, technology oversight—become harder to contain and easier to amplify.',
  economic: 'Systemic economic breakdown refers to the accumulation of fragilities in credit, demand, asset valuation, inequality, confidence, and macro-financial coordination. The relevance of this threat lies in the way economic stress can rapidly interact with debt, supply chains, politics, migration, and public legitimacy.',
  debt: 'Debt instability captures the possibility that sovereign, private, or global leverage becomes difficult to service under slower growth, higher rates, fiscal stress, or loss of confidence. Debt crises can propagate widely because they constrain adaptation capacity and transmit stress through banks, states, households, and international markets.',
  displacement: 'Mass displacement risk reflects the forced movement of populations under pressure from conflict, climate disruption, water stress, ecological decline, and state fragility. Large-scale displacement is a systemic issue because it couples humanitarian stress with border politics, urban overload, disease exposure, and conflict potential.',
  authoritarian: 'Authoritarian consolidation is modeled as a political-system risk in which surveillance, repression, emergency rule, and concentration of power erode institutional correction mechanisms. A more authoritarian world can become both less adaptable and more brittle, because feedback, accountability, and truth-testing are increasingly suppressed.',
  epistemic: 'Epistemic breakdown describes the degradation of shared reality, informational trust, and the capacity to distinguish reliable knowledge from manipulation. In a highly connected system, loss of epistemic coherence weakens coordination across science, democracy, public health, security, and technological governance.'
};

const THREAT_EXPOSURE_MAP = {
  climate: 'Exposure spans the atmosphere, oceans, cryosphere, agriculture, water security, coastal systems, public health, infrastructure, and ecosystem resilience on a global scale.',
  biodiversity: 'Exposure spans terrestrial, freshwater, and marine ecosystems, along with agriculture, pollination networks, fisheries, and the life-support services on which human societies depend.',
  nuclear: 'Exposure includes urban systems, food production, critical infrastructure, cross-border security networks, atmospheric systems, and the wider geopolitical order.',
  water: 'Exposure includes rivers, aquifers, irrigation, food production, cities, sanitation, hydropower, ecosystems, and transboundary basins under growing competitive stress.',
  soils: 'Exposure includes croplands, pasture, carbon storage, hydrological retention, nutrient cycles, rural livelihoods, and long-horizon food security.',
  oceans: 'Exposure spans fisheries, coral systems, coastal populations, climate regulation, oxygen production, marine biodiversity, and global food and trade systems.',
  pollution: 'Exposure spans air, water, soils, food chains, ecosystems, human development, chronic disease burdens, and intergenerational health outcomes.',
  pandemics: 'Exposure spans global mobility systems, hospitals, labor markets, food distribution, governance capacity, and all populations linked by trade and travel.',
  amr: 'Exposure spans hospitals, clinics, farms, wastewater systems, community health, surgery, intensive care, and the background resilience of modern medicine.',
  bioengineered: 'Exposure spans laboratories, public-health systems, dense urban centers, supply chains, critical institutions, and biological monitoring networks.',
  ai: 'Exposure spans labor markets, information ecosystems, cyber defense, research, autonomous systems, financial systems, and strategic decision-making.',
  cyber: 'Exposure spans power grids, finance, logistics, communications, public administration, health systems, and networked industrial control systems.',
  autonomousw: 'Exposure spans military command chains, crisis stability, civilian protection, escalation management, and machine-mediated security environments.',
  minerals: 'Exposure spans mining regions, industrial supply chains, energy transition sectors, electronics manufacturing, defense production, and geopolitical bargaining.',
  space: 'Exposure spans satellites, launch systems, communications, navigation, remote sensing, weather services, finance timing, and strategic infrastructure.',
  geopolitics: 'Exposure spans trade routes, alliances, food and energy markets, border regions, diplomacy, security institutions, and conflict-prone regions.',
  supply: 'Exposure spans ports, shipping, warehousing, food and medicine distribution, manufacturing hubs, retail systems, and emergency-response capacity.',
  fragmentation_gov: 'Exposure spans multilateral institutions, state capacity, treaty systems, crisis coordination, science-policy interfaces, and cross-border governance.',
  economic: 'Exposure spans banking systems, households, firms, employment, public finance, commodity markets, and the fiscal room needed for adaptation.',
  debt: 'Exposure spans sovereign balance sheets, central-bank policy space, banking systems, household solvency, corporate refinancing, and social spending capacity.',
  displacement: 'Exposure spans climate-sensitive regions, conflict zones, host cities, border regimes, humanitarian systems, and already fragile receiving societies.',
  authoritarian: 'Exposure spans political institutions, civil liberties, information systems, minority protection, judicial independence, and adaptive decision-making capacity.',
  epistemic: 'Exposure spans media systems, science communication, public deliberation, democratic legitimacy, crisis response, and the knowledge commons.'
};

function threatScientificDescription(t, enriched) {
  const curated = THREAT_SCIENTIFIC_DESCRIPTIONS[t.id];
  if (curated) return curated;
  const depCount = (t.deps || []).length;
  const processType = t.process_type ? String(t.process_type) : 'systemic';
  return `${t.name} is treated in this model as a ${processType} systemic pressure with multi-domain consequences. Its current ranking reflects a combination of severity, urgency, interdependence, irreversibility, and governance stress, with ${depCount} declared upstream dependenc${depCount === 1 ? 'y' : 'ies'} in the threat network.`;
}

function threatExposureLandscapeHtml(t) {
  return THREAT_EXPOSURE_MAP[t.id] || (t.domain === 'biosphere'
    ? 'Exposure spans ecological integrity, food-water systems, and the biophysical conditions that stabilize human civilization.'
    : t.domain === 'technology'
      ? 'Exposure spans high-connectivity technological systems whose failures can propagate rapidly across security, infrastructure, and governance.'
      : 'Exposure spans institutions, populations, infrastructure, and the coordination mechanisms that hold complex societies together.');
}

function threatSourceLinksHtml(t) {
  return collectThreatSourceLinks(t).map(x => {
    const label = `${x.fields.join('+')}  ${shortThreatLabel(x.source, 32)}`;
    const tip = `<strong>${escapeHtml(x.source)}</strong><br>Fields: ${escapeHtml(x.fields.join(', '))}${x.notes.length ? `<br>${escapeHtml(x.notes[0]).slice(0, 340)}` : ''}`;
    return `<a class="ev-link" data-s="${escapeHtml(String(x.strength || 'moderate'))}" href="${escapeHtml(x.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}<span class="tt">${tip}</span></a>`;
  }).join('');
}

function threatParameterNotesHtml(t) {
  const fields = [
    ['Scale', t.scale], ['Urgency', t.urgency], ['Acceleration', t.acceleration], ['Interdependence', t.interdependence],
    ['Irreversibility', t.irreversibility], ['Governance failure', t.gov_failure], ['Growth proxy', t.growth_rate], ['Threshold', t.threshold]
  ];
  return fields.map(([label, r]) => {
    const source = sourceOf(r) || 'No source recorded';
    const note = r && r.note ? String(r.note) : 'No parameter note recorded.';
    const strength = r && (r.strength || r.confidence) ? String(r.strength || r.confidence) : '';
    return `<div style="margin-bottom:7px"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(source)}${strength ? `  ${escapeHtml(strength)}` : ''}<br><span style="color:var(--text3)">${escapeHtml(note)}</span></div>`;
  }).join('');
}

function threatSourcePanelHtml(t) {
  const links = collectThreatSourceLinks(t);
  if (!links.length) return 'No metric-level source URLs are recorded for this threat.';
  return links.map(x => `<div style="margin-bottom:6px"><strong>${escapeHtml(x.fields.join(', '))}:</strong> <a href="${escapeHtml(x.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(x.source)}</a>${x.strength ? `  ${escapeHtml(String(x.strength))}` : ''}</div>`).join('');
}

function probabilityRangeLabel(point, lower, upper, fallback = 'Not identified') {
  if (Number.isFinite(point)) return pct(point);
  if (!Number.isFinite(lower) || !Number.isFinite(upper)) return fallback;
  const lowerLabel = pct(lower);
  const upperLabel = pct(upper);
  return lowerLabel === upperLabel ? lowerLabel : `${lowerLabel}–${upperLabel} range`;
}

function threatMethodNotesHtml(t, low, mid, high, p2050, p2050Lower = null, p2050Upper = null) {
  const processType = t.process_type ? String(t.process_type) : 'unspecified';
  const useWeibull = priorityViewMode() === 'weibull';
  const sourceLabel = useWeibull ? 'Weibull' : 'Monte Carlo';
  const lines = [
    `<li>This threat is treated as a <strong>${escapeHtml(processType)}</strong> process, not as a single isolated event.</li>`,
    useWeibull
      ? `<li>The displayed lower / central / upper horizon is computed from the Weibull diagnostic layer calibrated to the current threat horizon after MCDA scoring, dependency amplification, and threshold calibration.</li>`
      : `<li>The displayed lower / central / upper horizon is computed from the current model run after MCDA scoring, dependency amplification, threshold calibration, and Monte Carlo sampling.</li>`,
    `<li>The current model interval for this threat is <strong>${escapeHtml(formatYear(low))}–${escapeHtml(formatYear(high))}</strong>, with central horizon <strong>${escapeHtml(formatYear(mid))}</strong>.</li>`,
    `<li>By-2050 risk is shown from the current <strong>${escapeHtml(sourceLabel)}</strong> view under the present scenario assumptions: <strong>${escapeHtml(useWeibull ? probabilityRangeLabel(p2050, p2050Lower, p2050Upper) : p2050 == null ? 'Run Monte Carlo' : pct(p2050))}</strong>. A range means the median is right-censored after 2100; it is not a measured empirical probability.</li>`
  ];
  return `<ul class="detail-list">${lines.join('')}</ul>`;
}

function threatDependencyPathwaysHtml(t, enriched) {
  const nameOf = id => (enriched.find(x => x.id === id) || { name: id }).name;
  const upstream = (t.deps || []).map(nameOf);
  const downstream = enriched.filter(x => (x.deps || []).includes(t.id)).map(x => x.name);
  if (!upstream.length && !downstream.length) return 'No dependency links to or from this threat are declared in the current model specification.';
  const rows = [
    ...upstream.map(name => `<li>${escapeHtml(name)} → <strong>${escapeHtml(t.name)}</strong></li>`),
    ...downstream.map(name => `<li><strong>${escapeHtml(t.name)}</strong> → ${escapeHtml(name)}</li>`),
  ].join('');
  return `<ul class="detail-list">${rows}<li>Each arrow points from a threat whose functional failure adds exposure to the threat that depends on it, as declared in the current model network.</li></ul>`;
}

function threatRiskStructureHtml(t, enriched) {
  const growthPct = (Number.isFinite(t.growth_rate_effective) ? t.growth_rate_effective : effectiveRiskGrowthForThreat(t, muOf(t.growth_rate))) * 100;
  const evidence = scientificEvidenceForThreat(t);
  const calibration = parameterCalibrationProfileForThreat(t);
  const upstreamCount = (t.deps || []).length;
  const downstreamCount = enriched.filter(x => (x.deps || []).includes(t.id)).length;
  return `${threatScientificDescription(t, enriched)}<ul class="detail-list"><li><strong>Why it ranks highly here:</strong> severity ${muOf(t.scale).toFixed(1)}/5, urgency ${muOf(t.urgency).toFixed(1)}/5, interdependence ${muOf(t.interdependence).toFixed(1)}/5, and irreversibility ${muOf(t.irreversibility).toFixed(1)}/5 under the current weighting scheme.</li><li><strong>Amplification profile:</strong> acceleration ${muOf(t.acceleration).toFixed(1)}/5, governance stress ${muOf(t.gov_failure).toFixed(1)}/5, and an effective modeled growth proxy of ${growthPct.toFixed(2)}%/yr.</li><li><strong>Evidence posture:</strong> threat-level scientific evidence ${escapeHtml(evidence.grade)}; numerical input calibration profile ${escapeHtml(calibration.label)}${calibration.legacyFallback ? ' using legacy strength labels' : ''}. The model threshold is ${getThreatThreshold(t).toFixed(2)} on the shared destabilization scale.</li><li><strong>Network role:</strong> depends on ${upstreamCount} declared upstream threat${upstreamCount === 1 ? '' : 's'}; ${downstreamCount} threat${downstreamCount === 1 ? ' depends' : 's depend'} on it in the current cross-threat network.</li></ul>`;
}

function priorityThreatViewModel(t, rank, enriched, mcRes) {
  const mode = priorityViewMode();
  const timeline = threatTimelineForMode(t, mcRes, mode, {
    fallbackToWeibullProbability: true,
    requireMcForWeibullProbability: true,
  });
  const evidence = scientificEvidenceForThreat(t).grade;
  const calibration = parameterCalibrationProfileForThreat(t);
  const priorityThreshold = getThreatThreshold(t);
  const depNames = (t.deps || []).map(id => {
    const target = enriched.find(x => x.id === id);
    return target ? target.name : id;
  });

  return {
    t,
    rank,
    evidence,
    calibration,
    priorityThreshold,
    depNames,
    low: timeline.lower,
    mid: timeline.mid,
    high: timeline.upper,
    p2050: timeline.p2050,
    p2050Lower: timeline.p2050Lower,
    p2050Upper: timeline.p2050Upper,
    censored: timeline.censored === true,
    weibullStatus: timeline.status,
    useWeibull: mode === 'weibull',
    growthPct: (Number.isFinite(t.growth_rate_effective) ? t.growth_rate_effective : effectiveRiskGrowthForThreat(t, muOf(t.growth_rate))) * 100,
    alert: Number.isFinite(timeline.lower) && (timeline.lower - NOW) <= 10,
    barMeaning: t.threshold && t.threshold.note ? String(t.threshold.note) : 'Critical horizon interpretation derived from the calibrated threshold entry and the current model run.',
    currentStatus: t.priority >= 8 ? 'critical' : t.priority >= 6 ? 'elevated' : t.priority >= 4 ? 'watch' : 'monitored',
  };
}

function priorityThreatPillsHtml(vm) {
  const { t, evidence, calibration, currentStatus, alert } = vm;
  return `<div class="t-pills">
    <span class="t-pill">${escapeHtml(t.domain === 'biosphere' ? 'Planetary-scale' : t.domain === 'technology' ? 'High-connectivity' : 'System-wide')}</span>
    <span class="t-pill">${escapeHtml(t.process_type ? String(t.process_type).replace(/^./, s => s.toUpperCase()) : 'Systemic')}</span>
    <span class="t-pill good">Scientific evidence: ${escapeHtml(evidence)}</span>
    <span class="t-pill">Input calibration: ${escapeHtml(calibration.label)}</span>
    <span class="t-pill current status-${escapeHtml(currentStatus)}">Current: ${escapeHtml(currentStatus)}</span>
    ${threatReversibilityPillHtml(t)}
    ${alert ? `<span class="t-pill alert">⚠ ≤10yr</span>` : ''}
  </div>`;
}

function priorityThreatScoreHtml(vm) {
  const { t, priorityThreshold, p2050, p2050Lower, p2050Upper, useWeibull, weibullStatus } = vm;
  const probabilityText = useWeibull
    ? probabilityRangeLabel(p2050, p2050Lower, p2050Upper, weibullStatus === 'invalid' ? 'Not available' : 'Not identified')
    : p2050 == null ? 'Run MC' : pct(p2050);
  return `<div class="t-score">
    <div class="t-score-val">${t.priority.toFixed(2)}<span class="t-score-denom">/ ${priorityThreshold.toFixed(2)}</span></div>
    <div class="t-score-lbl">Priority / threshold</div>
    <div style="font-family:var(--mono);font-size:8px;color:var(--text3);margin-top:2px;letter-spacing:.02em">${pct(clamp(t.priority / Math.max(0.001, priorityThreshold), 0, 1.5))} of critical level</div>
    <div style="font-size:9px;color:var(--text3);margin-top:3px">P≤2050: ${probabilityText} <span style="font-family:var(--mono);font-size:7px;letter-spacing:.08em;color:var(--text-3);opacity:.7">(${useWeibull ? 'Weibull' : 'MC'})</span></div>
  </div>`;
}

function priorityThreatMetricsHtml(vm) {
  const { t, low, mid, high, growthPct, priorityThreshold } = vm;
  const yearsLabel = year => Number.isFinite(year) ? fmtYearsLeft(year) : 'Not identified';
  const daysLabel = year => Number.isFinite(year) ? daysLeft(year) : '';
  return `<div class="meta-grid">
    ${climateMetric('To lower', yearsLabel(low), daysLabel(low))}
    ${climateMetric('To mid', yearsLabel(mid), daysLabel(mid))}
    ${climateMetric('To upper', yearsLabel(high), daysLabel(high))}
    ${climateMetric('Severity', `${muOf(t.scale).toFixed(1)}/5`, metricSourceSummary(t.scale))}
    ${climateMetric('Urgency', `${muOf(t.urgency).toFixed(1)}/5`, metricSourceSummary(t.urgency))}
    ${climateMetric('Cascade', `${muOf(t.acceleration).toFixed(1)}/5`, metricSourceSummary(t.acceleration))}
    ${climateMetric('Interdependence', `${muOf(t.interdependence).toFixed(1)}/5`, metricSourceSummary(t.interdependence))}
    ${climateMetric('Irreversibility', `${muOf(t.irreversibility).toFixed(1)}/5`, metricSourceSummary(t.irreversibility))}
    ${climateMetric('Gov. failure', `${muOf(t.gov_failure).toFixed(1)}/5`, metricSourceSummary(t.gov_failure))}
    ${climateMetric('Growth proxy', `${growthPct.toFixed(2)}%/yr`, metricSourceSummary(t.growth_rate))}
    ${climateMetric('Model threshold', `${priorityThreshold.toFixed(2)}`, metricSourceSummary(t.threshold))}
  </div>`;
}

function priorityThreatDetailHtml(vm, enriched) {
  const { t, low, mid, high, p2050, p2050Lower, p2050Upper, evidence, calibration } = vm;
  return `<div class="t-detail">
    <div class="detail-box"><div class="detail-box-title">Risk structure captured here</div><div class="detail-box-body">${threatRiskStructureHtml(t, enriched)}</div></div>
    <div class="detail-box"><div class="detail-box-title">Dependency pathways in the model</div><div class="detail-box-body">${threatDependencyPathwaysHtml(t, enriched)}</div></div>
    <div class="detail-box"><div class="detail-box-title">Methodological notes</div><div class="detail-box-body">${threatMethodNotesHtml(t, low, mid, high, p2050, p2050Lower, p2050Upper)}</div></div>
    <div class="detail-box"><div class="detail-box-title">Source panel</div><div class="detail-box-body">${threatSourcePanelHtml(t)}<br><strong>Scientific evidence:</strong> ${escapeHtml(evidence)}.<br><strong>Input calibration:</strong> ${escapeHtml(calibration.label)}${calibration.legacyFallback ? ' (legacy strength mapping)' : ''}.</div></div>
    <div class="detail-box"><div class="detail-box-title">Exposure landscape</div><div class="detail-box-body">${escapeHtml(threatExposureLandscapeHtml(t))}</div></div>
    <div class="detail-box"><div class="detail-box-title">Parameter notes</div><div class="detail-box-body">${threatParameterNotesHtml(t)}</div></div>
  </div>`;
}

function priorityThreatCardHtml(t, rank, enriched, mcRes) {
  const vm = priorityThreatViewModel(t, rank, enriched, mcRes);
  const featureNote = 'Leading systemic threat under selected settings';
  const actionLabel = 'Expand';

  return `<article class="climate-feature-card is-collapsed" data-color="${escapeHtml(threatCardColor(t.domain))}" data-threat-card="${escapeHtml(t.id)}" aria-label="${escapeHtml(t.name)} threat card">
    <div class="t-header">
      <div>
        <div class="climate-feature-note"><strong>${rank}.</strong> ${escapeHtml(featureNote)}</div>
        <h2 class="t-name">${escapeHtml(t.name)}</h2>
        ${priorityThreatPillsHtml(vm)}
        <div class="t-mech">${escapeHtml(threatScientificDescription(t, enriched))}</div>
      </div>
      ${priorityThreatScoreHtml(vm)}
    </div>
    <div class="t-bar-section">
      ${renderTimelineBar(vm.low, vm.mid, vm.high, vm.low, vm.high, t)}
      ${threatMechanismNoteHtml(t)}
      ${priorityThreatMetricsHtml(vm)}
      <div class="t-bar-caption"><strong style="color:var(--text2)">Threshold note:</strong> ${escapeHtml(vm.barMeaning)}</div>
      <div class="ev-links">${threatSourceLinksHtml(t)}</div>
    </div>
    <div class="t-actions">
      <div class="t-interactions"><strong>Depends on:</strong> ${escapeHtml(vm.depNames.join('  ') || 'none recorded')}</div>
      <div style="display:flex;gap:5px;flex-wrap:wrap">
        <button class="a-chip" type="button" data-threat-action="watch">Watch</button>
        <a class="a-chip" href="${escapeHtml(SOURCE_DATA_URL)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none">VIEW SOURCE DATA</a>
        <button class="a-chip" type="button" data-threat-action="toggle-collapse">${actionLabel}</button>
      </div>
    </div>
    ${priorityThreatDetailHtml(vm, enriched)}
  </article>`;
}

function renderClimateBreakdownDetail(enriched, mcRes) {
  const shell = document.getElementById('climateBreakdownEnhancedCard');
  if (!shell || !Array.isArray(enriched)) return;
  cachePriorityRenderContext(enriched, mcRes);
  // Every threat, highest adjusted priority first.
  const sorted = [...enriched].sort((a, b) => b.priority - a.priority);
  if (!sorted.length) {
    shell.innerHTML = '<div class="climate-feature-card" data-color="priority"><div style="padding:14px 16px;color:var(--text3);font-family:var(--mono);font-size:10px">Threats by rank will update after the model run.</div></div>';
    return;
  }
  shell.innerHTML = sorted.map((t, idx) => priorityThreatCardHtml(t, idx + 1, enriched, mcRes)).join('');
  initClimateDetailControls();
}

function initClimateDetailControls() {
  const shell = document.getElementById('climateBreakdownEnhancedCard');
  if (!shell || shell.dataset.bound === '1') return;
  shell.dataset.bound = '1';
  shell.addEventListener('click', ev => {
    const action = ev.target.closest('[data-threat-action]');
    if (!action) return;
    const card = action.closest('[data-threat-card]');
    if (!card) return;
    const kind = action.getAttribute('data-threat-action');
    if (kind === 'watch') {
      const watching = !action.classList.contains('on');
      action.classList.toggle('on', watching);
      action.textContent = watching ? 'Watching' : 'Watch';
      return;
    }
    if (kind === 'toggle-collapse') {
      const collapsed = !card.classList.contains('is-collapsed');
      card.classList.toggle('is-collapsed', collapsed);
      action.textContent = collapsed ? 'Expand' : 'Collapse';
      return;
    }
  });
}

let _chartRegistry = Object.create(null);

function readVizPalette() {
  const root = getComputedStyle(document.documentElement);
  const body = getComputedStyle(document.body);
  return {
    text: root.getPropertyValue('--text').trim() || '#e2e8f4',
    text2: root.getPropertyValue('--text-2').trim() || root.getPropertyValue('--text2').trim() || '#8b98b4',
    text3: root.getPropertyValue('--text-3').trim() || root.getPropertyValue('--text3').trim() || '#515e78',
    border: root.getPropertyValue('--border').trim() || 'rgba(255,255,255,0.07)',
    border2: root.getPropertyValue('--border2').trim() || 'rgba(255,255,255,0.12)',
    surface: root.getPropertyValue('--surface').trim() || '#181d27',
    surface2: root.getPropertyValue('--surface2').trim() || '#1e2433',
    bg3: root.getPropertyValue('--bg3').trim() || '#141820',
    red: root.getPropertyValue('--red').trim() || '#c94040',
    green: root.getPropertyValue('--green').trim() || '#2a9d6e',
    blue: root.getPropertyValue('--blue').trim() || '#3a78c9',
    amber: root.getPropertyValue('--amber').trim() || '#c8952d',
    slate: root.getPropertyValue('--bar-safe').trim() || '#6b7886',
    watch: root.getPropertyValue('--bar-watch').trim() || '#c8952d',
    critical: root.getPropertyValue('--bar-doom').trim() || '#c94040',
    font: body.fontFamily || 'sans-serif',
  };
}

function rgba(color, alpha) {
  if (!color) return `rgba(255,255,255,${alpha})`;
  const value = color.trim();
  if (value.startsWith('#')) {
    let hex = value.slice(1);
    if (hex.length === 3) hex = hex.split('').map(ch => ch + ch).join('');
    if (hex.length !== 6) return `rgba(255,255,255,${alpha})`;
    const int = parseInt(hex, 16);
    const r = (int >> 16) & 255;
    const g = (int >> 8) & 255;
    const b = int & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }
  const match = value.match(/rgba?\(([^)]+)\)/i);
  if (match) {
    const parts = match[1].split(',').map(part => part.trim());
    return `rgba(${parts[0]},${parts[1]},${parts[2]},${alpha})`;
  }
  return value;
}

function ensureEChart(id) {
  if (!window.echarts) return null;
  const el = document.getElementById(id);
  if (!el) return null;
  let chart = _chartRegistry[id];
  if (chart && chart.isDisposed && chart.isDisposed()) chart = null;
  if (chart && chart.getDom && chart.getDom() !== el) {
    chart.dispose();
    chart = null;
  }
  if (!chart) {
    chart = window.echarts.init(el, null, { renderer: 'canvas' });
    _chartRegistry[id] = chart;
  }
  return chart;
}

function emptyChartOption(message, palette, compact = false) {
  return {
    animation: false,
    backgroundColor: 'transparent',
    xAxis: { show: false, min: 0, max: 1 },
    yAxis: { show: false, min: 0, max: 1 },
    series: [],
    graphic: {
      type: 'text',
      left: 'center',
      top: 'middle',
      style: {
        text: message,
        fill: palette.text3,
        fontSize: compact ? 10 : 12,
        fontFamily: palette.font,
        textAlign: 'center',
      },
    },
  };
}

function threatHorizonLabel(threat, mcRes) {
  const horizon = mcRes && mcRes.threatStats && mcRes.threatStats[threat.id]
    ? mcRes.threatStats[threat.id].p50
    : threat.horizon;
  return horizon > YE ? 'No crossing ≤ 2100' : fmtY(horizon);
}


const CASCADE_BASKET_LABELS = Object.freeze({
  [CASCADE_SYSTEM_BASKET]: 'System-wide functional loss',
  ecological_life_support: 'Ecological life support',
  food_water: 'Food and water',
  health_care: 'Health care',
  critical_infrastructure: 'Critical infrastructure',
  coordination_exchange: 'Coordination and exchange',
});

// The alternative rules are context lines: one muted gray, told apart by line pattern.
const CONDITIONAL_RULES = Object.freeze([
  { key: 'dynamicCascade', label: 'Dynamic cascade (the clocks)' },
  { key: 'maxRule', label: 'Max-rule', pattern: 'solid' },
  { key: 'compensatory', label: 'Compensatory', pattern: 'dashed' },
  { key: 'graphWeighted', label: 'Graph heuristic', pattern: 'dotted' },
]);

function conditionalShare(value) {
  // Whole percent from 10% up, one decimal below it, so shares such as 0.2% stay visible.
  const percent = value * 100;
  return percent >= 10 || percent === 0 ? `${Math.round(percent)}%` : `${percent.toFixed(1)}%`;
}

function conditionalStructureText(components) {
  const spec = STRUCTURAL_UNCERTAINTY;
  const parts = {
    threshold: `cascade threshold ${spec.cascadeThreshold.lo.toFixed(2)} to ${spec.cascadeThreshold.hi.toFixed(2)}`,
    criticality: `criticality levels 1/2/3 each ±${spec.criticalityLevelHalfWidth}`,
    dependencyWeights: 'dependency weights around the declared shares (Dirichlet)',
    lags: `dependency lags ${spec.dependencyLagYears.lo} to ${spec.dependencyLagYears.hi} years`,
    growthClass: `growth class one step down or up (${Math.round(spec.growthClassShift.down * 100)}% each)`,
  };
  return `Each run also samples the model structure: ${components.map(name => parts[name]).join('; ')}.`;
}

function conditionalTurnsText() {
  const spec = PRESSURE_TURNS;
  const drop = value => `${Math.round(value * 100)}%`;
  return `Each threat’s pressure also has a ${drop(spec.probabilityBy2100)} chance of peaking in a year between ${spec.firstYear} and ${spec.lastYear} and then falling at the rate it rose. After that turn a failed threat recovers once its combined own and upstream pressure is ${drop(spec.recoveryDrop.reversible)} (reversible) or ${drop(spec.recoveryDrop.partial)} (partly reversible) below its level at failure; irreversible threats do not recover. These are assumptions, not estimates from historical data.`;
}

function conditionalRecoveryText(recovery) {
  const crossed = recovery.crossedRuns.toLocaleString();
  if (!recovery.backBelowAtEnd) return `None of the ${crossed} runs that reach the threshold is back below it in ${YE}.`;
  const typical = Number.isFinite(recovery.firstBackBelowP50) ? ` Half of the runs that fall back below do so by ${fmtY(recovery.firstBackBelowP50)}.` : '';
  return `Of the ${crossed} runs that reach the threshold, ${recovery.backBelowAtEnd.toLocaleString()} (${conditionalShare(recovery.shareOfCrossed)}) are back below it in ${YE} because failed threats recovered after their pressure turned; the clocks still date the first crossing.${typical}`;
}

function conditionalBasketLabel(key) {
  return CASCADE_BASKET_LABELS[key] || key.replace(/_/g, ' ').replace(/^\w/, letter => letter.toUpperCase());
}

function conditionalGroupLabel(group) {
  return group.members.map(id => (THREATS.find(t => t.id === id) || { name: id }).name).join(' + ');
}

function conditionalRules(mcRes) {
  const ensemble = mcRes.ensemble;
  const length = ensemble.dynamicCascade.cdf.length;
  return CONDITIONAL_RULES.map(rule => ({ ...rule, summary: ensemble[rule.key] }))
    .filter(rule => rule.summary && Array.isArray(rule.summary.cdf) && rule.summary.cdf.length === length);
}

function conditionalBarRows(rows) {
  return rows.map(row => `<div class="conditional-bar-row" role="listitem">
      <span class="conditional-bar-label">${escapeHtml(row.label)}</span>
      <span class="conditional-bar-track" aria-hidden="true"><span class="conditional-bar-fill" style="width:${(row.share * 100).toFixed(2)}%"></span></span>
      <span class="conditional-bar-value">${conditionalShare(row.share)}</span>
    </div>`).join('');
}

function drawConditionalCdf(mcRes, rules) {
  const chart = ensureEChart('conditionalCdfChart');
  if (!chart) return;
  // The panel is hidden during reruns; a window resize meanwhile would leave a zero-size canvas.
  chart.resize();
  const palette = readVizPalette();
  const cascade = mcRes.ensemble.dynamicCascade;
  const probAt = (summary, idx) => summary.cdf[idx].prob * 100;
  // Labels sit right of and just below each point: under the rising curve, where no line runs.
  const quantiles = [
    { name: 'P50', year: cascade.p50, color: palette.blue },
    { name: 'P90', year: cascade.p90, color: palette.red },
  ].filter(q => Number.isFinite(q.year) && q.year <= YE);

  chart.setOption({
    animationDuration: 320,
    animationDurationUpdate: 280,
    backgroundColor: 'transparent',
    grid: { left: 40, right: 12, top: 12, bottom: 24 },
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: palette.surface2,
      borderColor: palette.border2,
      textStyle: { color: palette.text, fontFamily: palette.font, fontSize: 11 },
      axisPointer: { type: 'line', lineStyle: { color: rgba(palette.text, 0.20), width: 1 } },
      formatter: params => {
        const first = Array.isArray(params) ? params[0] : params;
        const year = first ? Math.round(first.value[0]) : NaN;
        const idx = year - YS;
        if (!Number.isInteger(idx) || idx < 0 || idx >= cascade.cdf.length) return '';
        const rows = rules.map(rule => `<div>${rule.label}: ${probAt(rule.summary, idx).toFixed(1)}%</div>`).join('');
        return `<div style="margin-bottom:4px">Threshold reached by ${year}</div>${rows}`;
      },
    },
    xAxis: {
      type: 'value',
      min: YS,
      max: YE,
      axisLine: { lineStyle: { color: rgba(palette.text, 0.12) } },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: rgba(palette.text, 0.05) } },
      axisLabel: {
        color: palette.text3,
        fontFamily: palette.font,
        fontSize: 10,
        formatter: value => (Math.round(value) % 10 === 0 ? Math.round(value) : ''),
      },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      interval: 50,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: rgba(palette.text, 0.05) } },
      axisLabel: { color: palette.text3, fontFamily: palette.font, fontSize: 10, formatter: value => `${Math.round(value)}%` },
    },
    series: [
      ...rules.filter(rule => rule.pattern).map(rule => ({
        name: rule.label, type: 'line', step: 'end', data: rule.summary.cdf.map(point => [point.year, point.prob * 100]), symbol: 'none',
        lineStyle: { color: rgba(palette.text, 0.42), width: 1.5, type: rule.pattern }, z: 2,
      })),
      { name: 'Dynamic cascade', type: 'line', step: 'end', data: cascade.cdf.map(point => [point.year, point.prob * 100]), symbol: 'none',
        lineStyle: { color: rgba(palette.text, 0.9), width: 2, cap: 'round', join: 'round' }, z: 3 },
      { name: 'Clock quantiles', type: 'scatter', symbolSize: 10, z: 4,
        data: quantiles.map(q => ({
          value: [q.year, probabilityByDisplayedYear(cascade, q.year) * 100],
          itemStyle: { color: q.color, borderColor: palette.surface, borderWidth: 2 },
          label: { show: true, position: 'right', distance: 6, offset: [0, 9], formatter: `${q.name} · ${fmtY(q.year)}`, color: palette.text2, fontFamily: palette.font, fontSize: 10 },
        })) },
    ],
  }, true);
}

function renderConditionalTriggers(el, mcRes) {
  const trace = mcRes.triggerTrace;
  const runs = mcRes.ensemble.dynamicCascade.crossing.length;
  el.dataset.state = trace ? (trace.failed ? 'failed' : 'ready') : mcRes.triggerReplayInputs ? 'pending' : 'unavailable';
  if (trace && !trace.failed) el.dataset.consistent = String(trace.consistent);
  else delete el.dataset.consistent;

  if (!trace && !mcRes.triggerReplayInputs) {
    el.innerHTML = '<p class="conditional-note">Trigger attribution is traced after a full model run.</p>';
    return;
  }
  if (!trace) {
    el.innerHTML = `<p class="conditional-note">Tracing which essential-service basket reaches the threshold in each of the ${runs.toLocaleString()} runs…</p>`;
    return;
  }
  if (trace.failed) {
    el.innerHTML = '<p class="conditional-note">Trigger attribution could not be computed for this result.</p>';
    return;
  }
  if (!trace.consistent) {
    el.innerHTML = '<p class="conditional-note">Trigger attribution withheld: the diagnostic replay did not reproduce the clock distribution.</p>';
    return;
  }
  if (!trace.crossedRuns || !trace.baskets.length) {
    el.innerHTML = '<p class="conditional-note">No run reaches the threshold by 2100, so there is no trigger to attribute.</p>';
    return;
  }

  const lead = trace.baskets[0];
  const leadLabel = conditionalBasketLabel(lead.key);
  const { lo, hi } = trace.threshold;
  const thresholdText = lo === hi ? `the ${lo.toFixed(2)} threshold` : `the sampled threshold (${lo.toFixed(2)} to ${hi.toFixed(2)})`;
  const listedGroups = lead.groups.slice(0, 4).map(conditionalGroupLabel);
  const moreGroups = lead.groupCount > listedGroups.length ? `; and ${lead.groupCount - listedGroups.length} more` : '';
  const singleShare = lead.groupsNeeded[1] || 0;
  const larger = Object.keys(lead.groupsNeeded).map(Number).filter(count => count > 1).sort((a, b) => a - b);
  const largerText = larger.length && larger[0] === lead.groupCount
    ? (lead.groupCount === 2 ? 'both groups' : `all ${lead.groupCount} groups`)
    : `at least ${larger[0]}${larger[larger.length - 1] > larger[0] ? `–${larger[larger.length - 1]}` : ''} of its ${lead.groupCount} groups`;
  const structure = !larger.length
    ? `One failing group is enough to reach ${thresholdText}.`
    : !singleShare
      ? `${largerText.charAt(0).toUpperCase()}${largerText.slice(1)} must fail to reach ${thresholdText}.`
      : `One failing group is enough to reach ${thresholdText} in ${conditionalShare(singleShare)} of runs; in the others ${largerText} must fail.`;
  const overlap = trace.multiBasketRuns
    ? ` In ${trace.multiBasketRuns.toLocaleString()} runs (${conditionalShare(trace.multiBasketRuns / trace.crossedRuns)}) more than one basket crosses in the same year, so the shares add up to more than 100%.`
    : '';

  el.innerHTML = `
    <p class="conditional-trigger-lead">In <strong>${conditionalShare(lead.share)}</strong> of the runs that reach the threshold, the <strong>${escapeHtml(leadLabel)}</strong> basket crosses it.</p>
    <p class="conditional-note">${escapeHtml(leadLabel)} has ${lead.groupCount} ${lead.groupCount === 1 ? 'group' : 'groups'}: ${escapeHtml(listedGroups.join('; '))}${moreGroups}. ${structure}</p>
    <div class="conditional-bars" role="list" aria-label="Share of runs in which each basket crosses the threshold">${conditionalBarRows(trace.baskets.map(basket => ({ label: conditionalBasketLabel(basket.key), share: basket.share })))}</div>
    <div class="conditional-subtitle">Failed groups when ${escapeHtml(leadLabel)} crosses</div>
    <div class="conditional-bars" role="list" aria-label="Share of ${escapeHtml(leadLabel)} crossings in which each group had failed">${conditionalBarRows(lead.groups.slice(0, 4).map(group => ({ label: conditionalGroupLabel(group), share: group.share })))}</div>
    <p class="conditional-note">Same ${trace.nSim.toLocaleString()} runs as the clocks, traced by replaying the model's random draws.${overlap}</p>`;
}

function ensureCascadeTriggerTrace(mcRes) {
  const inputs = mcRes.triggerReplayInputs;
  if (!inputs || mcRes.triggerTrace || mcRes.triggerTracePending) return;
  mcRes.triggerTracePending = true;
  const version = _resultVersion;
  const isCurrent = () => version === _resultVersion && currentScenario() === inputs.scKey && _cdfCurves[inputs.scKey] === mcRes;
  traceCascadeTriggers(inputs, mcRes.ensemble.dynamicCascade, isCurrent)
    .then(trace => { if (trace) mcRes.triggerTrace = trace; })
    .catch(error => { mcRes.triggerTrace = { failed: true, message: String((error && error.message) || error) }; })
    .finally(() => {
      mcRes.triggerTracePending = false;
      if (!isCurrent()) return;
      const trace = mcRes.triggerTrace;
      const lead = trace && !trace.failed && trace.baskets && trace.baskets[0];
      if (trace && trace.failed) setCalcStepStatus('triggers', 'error', 'Trigger attribution failed; the clocks are unaffected.');
      else setCalcStepStatus('triggers', 'done', lead ? `Runs replayed: the ${conditionalBasketLabel(lead.key)} basket sets the clocks off in ${conditionalShare(lead.share)} of crossing runs.` : 'Runs replayed; no crossing run to attribute.');
      renderConditionalScenario(mcRes);
    });
}

/**
 * Conditional-scenario context for the paired clocks: the Dynamic cascade first-crossing curve,
 * the range spanned by the four aggregation rules over the same runs, the share of runs still
 * below the threshold in 2100, and which essential-service basket sets the clocks off.
 * Reads existing summaries only; the clocks themselves are rendered elsewhere and unchanged.
 */
function renderConditionalScenario(mcRes) {
  const root = document.getElementById('conditionalScenario');
  if (!root) return;
  const cascade = mcRes && mcRes.ensemble && mcRes.ensemble.dynamicCascade;
  if (!cascade || !Array.isArray(cascade.crossing) || !cascade.crossing.length || !Array.isArray(cascade.cdf) || !cascade.cdf.length) {
    root.hidden = true;
    return;
  }
  root.hidden = false;
  const rules = conditionalRules(mcRes);
  drawConditionalCdf(mcRes, rules);

  const runs = cascade.crossing.length;
  const censored = cascade.crossing.filter(year => year > YE).length;
  const quantileKey = (name, year, className) => (Number.isFinite(year) && year <= YE
    ? `<span class="conditional-key"><span class="conditional-key-dot ${className}" aria-hidden="true"></span>${name} ${fmtY(year)} · ${pct(probabilityByDisplayedYear(cascade, year))} reached</span>`
    : `<span class="conditional-key"><span class="conditional-key-dot ${className}" aria-hidden="true"></span>${name} ${fmtY(year)}</span>`);
  const legend = document.getElementById('conditionalLegend');
  if (legend) {
    legend.innerHTML = `
      <div class="conditional-legend-row">
        <span class="conditional-key"><span class="conditional-key-line" aria-hidden="true"></span>Dynamic cascade (the clocks)</span>
        ${rules.filter(rule => rule.pattern).map(rule => `<span class="conditional-key"><span class="conditional-key-rule conditional-key-${rule.pattern}" aria-hidden="true"></span>${rule.label}</span>`).join('')}
      </div>
      <div class="conditional-legend-row">
        ${quantileKey('P50', cascade.p50, 'conditional-key-p50')}
        ${quantileKey('P90', cascade.p90, 'conditional-key-p90')}
      </div>`;
  }

  const censoredNote = document.getElementById('conditionalCensored');
  if (censoredNote) {
    censoredNote.textContent = censored
      ? `${censored.toLocaleString()} of ${runs.toLocaleString()} runs (${conditionalShare(censored / runs)}) are still below the threshold in 2100.`
      : `All ${runs.toLocaleString()} runs reach the threshold by 2100 under these assumptions, so the curve shows when the threshold is reached, not whether it is.`;
  }

  const runParams = (mcRes.triggerReplayInputs && mcRes.triggerReplayInputs.params) || (mcRes.executionSnapshot && mcRes.executionSnapshot.parameters) || null;
  const turnsOn = Boolean(runParams) && runParams.pressureTurns !== false;
  const structureNote = document.getElementById('conditionalStructure');
  if (structureNote) {
    const components = runParams ? structuralComponentsOf(runParams) : [];
    structureNote.hidden = !components.length;
    structureNote.textContent = components.length ? conditionalStructureText(components) : '';
  }

  const turnsNote = document.getElementById('conditionalTurns');
  if (turnsNote) {
    turnsNote.hidden = !turnsOn;
    turnsNote.textContent = turnsOn ? conditionalTurnsText() : '';
  }
  const recoveryNote = document.getElementById('conditionalRecovery');
  if (recoveryNote) {
    const recovery = mcRes.cascadeRecovery;
    const show = turnsOn && Boolean(recovery && recovery.crossedRuns);
    recoveryNote.hidden = !show;
    recoveryNote.textContent = show ? conditionalRecoveryText(recovery) : '';
  }

  const table = document.getElementById('conditionalRules');
  if (table) {
    table.innerHTML = `<thead><tr><th scope="col">Aggregation rule</th><th scope="col">P50</th><th scope="col">P90</th><th scope="col">Not reached by 2100</th></tr></thead>
      <tbody>${rules.map(rule => `<tr${rule.key === 'dynamicCascade' ? ' class="is-clock"' : ''}><th scope="row">${rule.label}</th><td>${fmtY(rule.summary.p50)}</td><td>${fmtY(rule.summary.p90)}</td><td>${conditionalShare(rule.summary.censorFraction)}</td></tr>`).join('')}</tbody>`;
  }

  const rulesNote = document.getElementById('conditionalRulesNote');
  if (rulesNote && rules.length) {
    const medians = rules.map(rule => rule.summary.p50);
    const low = Math.min(...medians);
    const high = Math.max(...medians);
    const spread = high <= YE ? `, ${high - low} years apart` : '';
    rulesNote.textContent = `All four rules read the same ${runs.toLocaleString()} runs. Their P50 spans ${fmtY(low)} to ${fmtY(high)}${spread}; the clocks use the Dynamic cascade rule.`;
  }

  const triggers = document.getElementById('conditionalTriggers');
  if (triggers) renderConditionalTriggers(triggers, mcRes);
  ensureCascadeTriggerTrace(mcRes);
}

function drawBarChart(enriched, mcRes) {
  const chart = ensureEChart('barCanvas');
  if (!chart) return;
  const palette = readVizPalette();
  const sorted = [...enriched].sort((a, b) => b.priority - a.priority);
  const el = document.getElementById('barCanvas');
  const compact = Boolean(el && el.clientWidth > 0 && el.clientWidth < 520);
  if (el) el.style.height = `${Math.max(compact ? 420 : 520, (compact ? 68 : 86) + sorted.length * (compact ? 18 : 23))}px`;
  if (!sorted.length) {
    chart.setOption(emptyChartOption('No threat data available', palette), true);
    return;
  }

  const maxPri = Math.max(...sorted.map(threat => threat.priority)) * 1.12;
  const rows = sorted.map(threat => ({
    fullName: threat.name,
    shortName: shortThreatLabel(threat.name, compact ? 15 : 28),
    score: +threat.priority.toFixed(2),
    horizon: threatHorizonLabel(threat, mcRes),
  }));

  chart.setOption({
    animationDuration: compact ? 0 : 280,
    animationDurationUpdate: compact ? 0 : 260,
    backgroundColor: 'transparent',
    grid: compact
      ? { left: 90, right: 42, top: 6, bottom: 14 }
      : { left: 180, right: 118, top: 10, bottom: 16 },
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: palette.surface2,
      borderColor: palette.border2,
      textStyle: { color: palette.text, fontFamily: palette.font, fontSize: compact ? 10 : 11 },
      formatter: params => {
        const row = rows[params.dataIndex];
        return `${row.fullName}<br/>Adjusted score: ${row.score.toFixed(2)}<br/>Central horizon: ${row.horizon}`;
      },
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: maxPri,
      axisLine: { lineStyle: { color: rgba(palette.text, 0.12) } },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: rgba(palette.text, 0.05) } },
      axisLabel: {
        color: palette.text3,
        fontFamily: palette.font,
        fontSize: compact ? 8 : 10,
        formatter: value => value.toFixed(1),
      },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: rows.map(row => row.shortName),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: palette.text2,
        fontFamily: palette.font,
        fontSize: compact ? 8 : 10,
        width: compact ? 82 : 160,
        overflow: 'truncate',
      },
    },
    series: [{
      name: 'Adjusted priority',
      type: 'bar',
      data: rows.map((row, idx) => ({
        value: row.score,
        itemStyle: {
          color: idx < 3 ? rgba(palette.text, 0.82) : idx < 8 ? rgba(palette.text, 0.66) : rgba(palette.text, 0.52),
          borderRadius: [0, 3, 3, 0],
        },
      })),
      barWidth: compact ? 7 : 9,
      showBackground: true,
      backgroundStyle: { color: rgba(palette.text, 0.06), borderRadius: [0, 3, 3, 0] },
      label: {
        show: true,
        position: 'right',
        color: palette.text2,
        fontSize: compact ? 8 : 9,
        fontFamily: palette.font,
        formatter: params => {
          const row = rows[params.dataIndex];
          return compact ? row.score.toFixed(2) : `${row.score.toFixed(2)}    ${row.horizon}`;
        },
      },
      emphasis: { itemStyle: { color: rgba(palette.text, 0.92) } },
    }],
  }, true);
}
// The Causal dependency network is src/threat-network.html, shown in an iframe. The page sends it the
// adjusted priorities of the current scenario (node sizes); the frame reports its height back.
let _threatNetworkMessage = null;
let _threatNetworkBound = false;

function sendThreatNetworkPriorities() {
  const frame = document.getElementById('threatNetworkFrame');
  if (frame && frame.contentWindow && _threatNetworkMessage) frame.contentWindow.postMessage(_threatNetworkMessage, '*');
}

function initNetwork(enriched) {
  const frame = document.getElementById('threatNetworkFrame');
  if (!frame) return;
  _threatNetworkMessage = {
    type: 'threat-network:priorities',
    priorities: Object.fromEntries(enriched.map(threat => [threat.id, threat.priority])),
  };
  if (!_threatNetworkBound) {
    _threatNetworkBound = true;
    window.addEventListener('message', event => {
      if (event.source !== frame.contentWindow || !event.data) return;
      if (event.data.type === 'threat-network:ready') sendThreatNetworkPriorities();
      if (event.data.type === 'threat-network:height' && Number.isFinite(event.data.height)) {
        frame.style.height = `${Math.max(320, Math.ceil(event.data.height))}px`;
      }
    });
  }
  sendThreatNetworkPriorities();
}

function resizeVizSurfaces() {
  Object.values(_chartRegistry).forEach(chart => {
    if (chart && chart.resize) chart.resize();
  });
}

function toggleCollapse(id) {
  const body = document.getElementById(id + '-body');
  const arrow = document.getElementById(id + '-arrow');
  if (!body) return;
  const open = body.classList.toggle('open');
  if (arrow) arrow.classList.toggle('open', open);
  const trigger = document.querySelector(`[aria-controls="${id}-body"]`);
  if (trigger) trigger.setAttribute('aria-expanded', String(open));
  if (id === 'contributionRankingCard') {
    const hint = document.getElementById('contributionRankingHint');
    if (hint) hint.style.display = open ? 'none' : 'block';
  }
  if (open && id === 'contributionRankingCard') {
    setTimeout(() => {
      const el = document.getElementById('barCanvas');
      const chart = el && window.echarts ? window.echarts.getInstanceByDom(el) : null;
      if (chart) chart.resize();
    }, 80);
  }
}

function exportClockJSON() {
  const d = window._lastInterpretData;
  const snapshot = d && d.executionSnapshot;
  if (!d || !snapshot) { alert('Run simulation first.'); return; }
  const sourceParameters = snapshot.sourceData;
  const sourceTraceabilityLimitations = getSourceTraceabilityLimitations(sourceParameters);
  const payload = {
    exportedAt: new Date().toISOString(),
    modelVersion: snapshot.codeIdentifier,
    datasetVersion: snapshot.dataIdentifier,
    primaryDataset: snapshot.primaryDataset,
    activeDataset: snapshot.activeDataset,
    seed: snapshot.seed,
    rngVersion: snapshot.rngVersion,
    seedPolicy: 'Deterministic seeded Monte Carlo: same dataset, scenario, parameters, and seed reproduce the same sampled uncertainty sequence.',
    monteCarloIterations: snapshot.parameters.nSim,
    scenario: d.scenario,
    executionSnapshot: snapshot,
    baselineResult: d.baselineResult || {
      headlineRule: 'Dynamic cascade P90',
      cascadeP10: d.cascadeP10,
      cascadeP50: d.cascadeP50,
      cascadeP90: d.cascadeP90,
    },
    diagnostics: d.diagnostics || {
      status: 'Optional scientific diagnostics are separate from the baseline/core model result and do not overwrite the headline result.',
    },
    functionalResults: d.functionalResults,
    averageExportWarning: AVERAGE_EXPORT_WARNING,
    averageSourcePreservationLimitation: AVERAGE_SOURCE_LIMITATION,
    sourceTraceabilityLimitation: SOURCE_TRACEABILITY_LIMITATION,
    sourceTraceabilityLimitationCount: sourceTraceabilityLimitations.length,
    sourceTraceabilityLimitations,
    sourceParameters,
    cascadeP10: d.cascadeP10,
    cascadeP50: d.cascadeP50,
    cascadeP90: d.cascadeP90,
    threats: (d.enriched || []).map(t => ({
      id: t.id, name: t.name, domain: t.domain,
      priority: t.priority, horizon: t.horizon
    }))
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'apocalypse_clock_export.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

function exportClockCSV() {
  const d = window._lastInterpretData;
  const snapshot = d && d.executionSnapshot;
  if (!d || !snapshot) { alert('Run simulation first.'); return; }
  const csvSafe = value => {
    let s = String(value ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const rows = [
    ['metadata_key','metadata_value'],
    ['functionalResultsJson', JSON.stringify(d.functionalResults || {})],
    ['executedAt', snapshot.executedAt],
    ['modelVersion', snapshot.codeIdentifier],
    ['codeHashFNV1a32', snapshot.codeHashFNV1a32],
    ['codeHashAlgorithm', snapshot.codeHashAlgorithm],
    ['codeHashScope', snapshot.codeHashScope],
    ['codeHashFunctionsJson', JSON.stringify(snapshot.codeHashFunctions)],
    ['datasetVersion', snapshot.dataIdentifier],
    ['dataHashFNV1a32', snapshot.dataHashFNV1a32],
    ['primaryDataset', snapshot.primaryDataset],
    ['activeDataset', snapshot.activeDataset],
    ['monteCarloIterations', snapshot.parameters.nSim],
    ['seed', snapshot.seed],
    ['rngVersion', snapshot.rngVersion],
    ['parametersJson', JSON.stringify(snapshot.parameters)],
    ['scenarioDefinitionJson', JSON.stringify(snapshot.scenarioDefinition)],
    ['modelConstantsJson', JSON.stringify(snapshot.modelConstants)],
    ['threatInputsJson', JSON.stringify(snapshot.threatInputs)],
    ['timeBaselineJson', JSON.stringify(snapshot.timeBaseline)],
    ['quantileRulesJson', JSON.stringify(snapshot.quantileRules)],
    ['censoringRulesJson', JSON.stringify(snapshot.censoringRules)],
    ['uncertaintyLabelsJson', JSON.stringify(snapshot.uncertaintyLabels)],
    ['diagnosticsJson', JSON.stringify(d.diagnostics || {})],
    ['sourceDataJson', JSON.stringify(snapshot.sourceData)],
    ['averageExportWarning', AVERAGE_EXPORT_WARNING],
    ['averageSourcePreservationLimitation', AVERAGE_SOURCE_LIMITATION],
    ['sourceTraceabilityLimitation', SOURCE_TRACEABILITY_LIMITATION],
    ['sourceTraceabilityLimitationCount', getSourceTraceabilityLimitations(snapshot.sourceData).length],
    [],
    ['baseline_metric','value'],
    ['headlineRule', d.baselineResult?.headlineRule || 'Dynamic cascade P90'],
    ['cascadeP10', d.cascadeP10],
    ['cascadeP50', d.cascadeP50],
    ['cascadeP90', d.cascadeP90],
    [],
    ['id','name','domain','priority','horizon_year'],
  ];
  for (const t of (d.enriched || [])) {
    rows.push([
      t.id,
      t.name || '',
      t.domain,
      (t.priority != null ? t.priority.toFixed(4) : ''),
      t.horizon
    ]);
  }
  const csv = rows.map(r => r.map(csvSafe).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'apocalypse_clock_export.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

function setDominantDriverKpi(name, note) {
  const driver = document.getElementById('kpiDriver');
  const driverNote = document.getElementById('kpiDriverNote');
  if (driver) driver.textContent = name || 'No driver ranked';
  if (driverNote) driverNote.textContent = note || 'Current priority summary';
}

function updateDominantDriverFromPriority(enriched) {
  const lead = (enriched || [])
    .filter(t => Number.isFinite(t.priority))
    .slice()
    .sort((a, b) => b.priority - a.priority)[0];
  setDominantDriverKpi(lead ? lead.name : 'No driver ranked', 'Current priority summary');
}

function updateUI(mcRes, scKey, enriched, executionSnapshot) {
  const gsi = calcGSI(enriched);
  const hue = Math.round(120 - gsi * 1.2);
  document.getElementById('kpiGSI').textContent = gsi.toFixed(0);
  document.getElementById('kpiGSI').style.color = `hsl(${hue},65%,52%)`;
  updateDominantDriverFromPriority(enriched);

  if (mcRes) {
    const runSnapshot = executionSnapshot || mcRes.executionSnapshot || null;
    const p2035 = (mcRes.cdf.find(e=>e.year===2035)||{prob:0}).prob;
    const p2050 = (mcRes.cdf.find(e=>e.year===2050)||{prob:0}).prob;
    const lead = [...enriched].sort((a, b) => b.priority - a.priority)[0];
    const leadP50 = lead && mcRes.threatStats && mcRes.threatStats[lead.id]
      ? mcRes.threatStats[lead.id].p50
      : lead ? lead.horizon : NaN;
    const leadBox = document.getElementById('hyLeadBox');
    const leadName = document.getElementById('hyLeadName');
    document.getElementById('kpiP50').textContent   = fmtY(mcRes.p50);
    document.getElementById('hyP10').textContent    = fmtY(mcRes.p10);
    document.getElementById('hyP50').textContent    = fmtY(mcRes.p50);
    document.getElementById('hyP90').textContent    = fmtY(mcRes.p90);
    document.getElementById('hyMax').textContent    = fmtY(mcRes.ensemble.maxRule.p50);
    document.getElementById('hyGraph').textContent  = fmtY(mcRes.ensemble.graphWeighted.p50);
    document.getElementById('hyCascadeP50').textContent = fmtY(mcRes.ensemble.dynamicCascade.p50);
    document.getElementById('hyCascadeP90').textContent = fmtY(mcRes.ensemble.dynamicCascade.p90);
    const cascadeSummary = mcRes.ensemble.dynamicCascade;
    const cascadeMedianRaw = cascadeSummary.p50;
    const cascadeMedianYearText = fmtY(cascadeMedianRaw);
    const cascadeMedianProb = probabilityByDisplayedYear(cascadeSummary, cascadeMedianRaw);
    const cascadeMedianDisplayYear = cascadeMedianRaw > YE ? '>2100' : String(Math.round(cascadeMedianRaw));
    const cascadeHeadlineRaw = cascadeSummary.p90;
    const cascadeHeadlineYearText = fmtY(cascadeHeadlineRaw);
    const cascadeHeadlineProb = probabilityByDisplayedYear(cascadeSummary, cascadeHeadlineRaw);
    const cascadeHeadlineDisplayYear = cascadeHeadlineRaw > YE ? '>2100' : String(Math.round(cascadeHeadlineRaw));
    const medianYear = document.getElementById('cascadeMedianYear');
    if (medianYear) medianYear.textContent = cascadeMedianYearText;
    const medianProb = document.getElementById('cascadeMedianProb');
    if (medianProb) {
      medianProb.textContent = Number.isFinite(cascadeMedianProb) ? pct(cascadeMedianProb) : '';
      medianProb.setAttribute('data-tip', `<strong>Dynamic cascade P50</strong>${Number.isFinite(cascadeMedianProb) ? pct(cascadeMedianProb) : '—'} of Dynamic cascade Monte Carlo runs cross the critical threshold on or before ${cascadeMedianRaw > YE ? '2100' : cascadeMedianDisplayYear}. P50 is the median of simulated first-crossing times: half of the sampled coded times are earlier and half later. ${cascadeMedianRaw > YE ? 'When P50 is beyond 2100, fewer than half of runs cross within the model horizon, so the actual median crossing time is not identified.' : 'The displayed probability can differ slightly from exactly 50% because a continuous quantile is shown as a rounded calendar year.'} This is a model-derived scenario quantity, not an empirical forecast or the probability of collapse in that exact year.`);
    }
    document.getElementById('cascadeHeadlineYear').textContent = cascadeHeadlineYearText;
    const _prob = document.getElementById('cascadeHeadlineProb');
    if (_prob) {
      _prob.textContent = Number.isFinite(cascadeHeadlineProb) ? pct(cascadeHeadlineProb) : '';
      _prob.setAttribute('data-tip', `<strong>Model implied cumulative probability</strong>${Number.isFinite(cascadeHeadlineProb) ? pct(cascadeHeadlineProb) : '—'} of Dynamic cascade Monte Carlo runs cross the critical threshold on or before ${cascadeHeadlineRaw > YE ? '2100' : cascadeHeadlineDisplayYear}. The headline statistic is the 90th percentile of the simulated Dynamic-cascade onset-year distribution, not a worst-case bound. ${cascadeHeadlineRaw > YE ? 'When the headline reads >2100, fewer than 90% of simulated runs cross by 2100, so the 90th percentile falls outside the model horizon; the percentage shown is the cumulative crossing probability up to 2100, and the remaining share represents runs that did not cross within the model horizon.' : 'Because the displayed year is rounded to a whole calendar year, this value can be slightly above or slightly below exactly 90%; that small offset is a rounding artefact of mapping a continuous 90th-percentile estimate onto an integer year.'} It is a model-derived scenario probability, not an empirical forecast, prophecy, or measured real-world probability of collapse.`);
    }
    const _pair = document.getElementById('cascadeHorizonPair');
    const _mw = document.getElementById('cascadeMedianYearWrap');
    const _yw = document.getElementById('cascadeHeadlineYearWrap');
    if (_pair) _pair.style.display = '';
    if (_mw) _mw.style.display = '';
    if (_yw) _yw.style.display = '';
    const _gap = document.getElementById('cascadeHorizonGap');
    const _gapUnit = document.getElementById('cascadeHorizonGapUnit');
    const gapIdentified = Number.isFinite(cascadeMedianRaw) && Number.isFinite(cascadeHeadlineRaw) && cascadeMedianRaw <= YE && cascadeHeadlineRaw <= YE;
    if (_gap) {
      _gap.textContent = gapIdentified ? String(Math.max(0, Math.round(cascadeHeadlineRaw - cascadeMedianRaw))) : '—';
      _gap.setAttribute('title', gapIdentified ? 'Calendar-year distance between the Dynamic cascade P50 and P90 quantiles.' : 'The P50–P90 distance is not identified because at least one quantile lies beyond the 2100 model horizon.');
    }
    if (_gapUnit) _gapUnit.textContent = gapIdentified ? 'years' : 'not identified';
    const _csn = document.getElementById('cascadeStabilityNote');
    if (_csn) _csn.style.display = '';
    const _chn = document.getElementById('cascadeHeadlineNote');
    if (_chn) { _chn.textContent = `The two clocks show two points from the same set of simulated cascade timelines for the ${SC[scKey].label || scKey} scenario. P50 is the middle result; P90 is the later result reached in about nine out of ten model runs. Because risks are connected, one serious failure can spread and disrupt essential services without every domain failing first. These dates are warning horizons, not forecasts of complete global collapse. “>2100” only means the model cannot locate that point within its time window; it does not mean the system is safe until then. The result still depends on stated assumptions about growth, system importance, connections and essential services.`; _chn.style.display = ''; }
    window._lastInterpretData = {
      scenario: scKey,
      modelVersion: runSnapshot?.codeIdentifier || MODEL_VERSION,
      datasetVersion: runSnapshot?.dataIdentifier || currentDatasetVersion(),
      primaryDataset: runSnapshot?.primaryDataset || PRIMARY_DATASET_NAME,
      activeDataset: runSnapshot?.activeDataset || ACTIVE_SOURCE_META.fileName || PRIMARY_DATASET_NAME,
      monteCarloIterations: runSnapshot?.parameters?.nSim ?? P.nSim,
      seed: runSnapshot?.seed || P.seed || DEFAULT_MC_SEED,
      seedPolicy: 'Deterministic seeded Monte Carlo: same dataset, scenario, parameters, and seed reproduce the same sampled uncertainty sequence.',
      baselineResult: {
        headlineRule: 'Dynamic cascade P90',
        cascadeP10: fmtY(mcRes.ensemble.dynamicCascade.p10),
        cascadeP50: fmtY(mcRes.ensemble.dynamicCascade.p50),
        cascadeP90: fmtY(mcRes.ensemble.dynamicCascade.p90),
        compensatoryP10: fmtY(mcRes.p10),
        compensatoryP50: fmtY(mcRes.p50),
        compensatoryP90: fmtY(mcRes.p90),
        maxRuleP50: fmtY(mcRes.ensemble.maxRule.p50),
        graphWeightedP50: fmtY(mcRes.ensemble.graphWeighted.p50),
      },
      diagnostics: {
        status: 'Optional scientific diagnostics are separate from the baseline/core model result and do not overwrite the headline result.',
        structuralSigmaYears: Number.isFinite(mcRes.structuralSigma) ? mcRes.structuralSigma : null,
        structuralSigmaDescription: 'Legacy public key; value is the cross-aggregator P50 range, not a standard deviation.',
        samplingSigmaYears: Number.isFinite(mcRes.samplingSigma) ? mcRes.samplingSigma : null,
        samplingSigmaDescription: 'SD of mixed horizon-coded times: no crossing by YE is coded YE + 1. Not exclusively process uncertainty, nor SD of unidentified post-horizon crossing times.',
        parameterSigmaYears: Number.isFinite(mcRes.parameterSigma) ? mcRes.parameterSigma : null,
        parameterSigmaDescription: 'Legacy public key; bootstrap MC SE of the horizon-coded median, not input uncertainty. Does not identify the actual median or its SE when the median is censored.',
        censorFraction: mcRes.censorFraction,
        censorFractionMeaning: 'Legacy field: compensatory aggregate, not Dynamic Cascade.',
        cascadeCensorFraction: mcRes.ensemble.dynamicCascade.censorFraction,
        medianCensored: mcRes.medianCensored,
        actualMedianMcStandardErrorYears: mcRes.medianCensored ? null : mcRes.parameterSigma,
        thresholdRobustness: mcRes.thresholdRobustness ? freezeDeepCopy(mcRes.thresholdRobustness) : null,
        central80IntervalWidthYears: Number.isFinite(mcRes.p90 - mcRes.p10) ? mcRes.p90 - mcRes.p10 : null,
      },
      functionalResults: {
        meaning: mcRes.functionalStatsMeaning,
        standalone: freezeDeepCopy(mcRes.threatStats),
        propagated: freezeDeepCopy(mcRes.functionalStats),
        domains: freezeDeepCopy(mcRes.domainStats),
        domainMeaning: mcRes.domainStatsMeaning,
        cascadeRecovery: mcRes.cascadeRecovery ? freezeDeepCopy(mcRes.cascadeRecovery) : null,
        deterministic: explainCascadeCrossing(enriched, runSnapshot?.parameters || P),
      },
      averageExportWarning: AVERAGE_EXPORT_WARNING,
      averageSourcePreservationLimitation: AVERAGE_SOURCE_LIMITATION,
      cascadeP10: fmtY(mcRes.ensemble.dynamicCascade.p10),
      cascadeP50: fmtY(mcRes.ensemble.dynamicCascade.p50),
      cascadeP90: fmtY(mcRes.ensemble.dynamicCascade.p90),
      executionSnapshot: runSnapshot,
      enriched: JSON.parse(JSON.stringify(enriched)),
    };
    document.getElementById('hyLead').textContent   = fmtY(leadP50);
    if (leadName) leadName.textContent = lead ? `${lead.name} P50` : 'Top threat P50';
    if (leadBox) leadBox.title = lead ? `Top-priority threat: ${lead.name}; individual P50 horizon ${fmtY(leadP50)}` : '';
    document.getElementById('kpiP2035').textContent = pct(p2035);
    document.getElementById('kpiP2050').textContent = pct(p2050);
    document.getElementById('kpiCI').textContent    = Math.round(mcRes.p90 - mcRes.p10) + 'y';
    document.getElementById('csP2035').textContent  = pct(p2035);
    document.getElementById('csP2050').textContent  = pct(p2050);
    document.getElementById('csAlea').textContent   = mcRes.samplingSigma.toFixed(1) + 'y';
    document.getElementById('csStruct').textContent = mcRes.structuralSigma.toFixed(1) + 'y';
    const censorNote = `No crossing by ${YE}: ${pct(mcRes.censorFraction || 0)}. SD and bootstrap values describe horizon-coded times (${YE + 1} for no crossing), not actual post-horizon dates.`;
    const outcomeSd = document.getElementById('csAlea');
    if (outcomeSd) outcomeSd.title = censorNote;
  } else {
    // Clear stale headline values until the next stochastic run finishes.
    const headline = document.getElementById('cascadeHeadlineYear');
    if (headline) headline.textContent = '';
    const median = document.getElementById('cascadeMedianYear');
    if (median) median.textContent = '';
    const prob = document.getElementById('cascadeHeadlineProb');
    if (prob) {
      prob.textContent = '';
      prob.removeAttribute('data-tip');
    }
    const medianProb = document.getElementById('cascadeMedianProb');
    if (medianProb) {
      medianProb.textContent = '';
      medianProb.removeAttribute('data-tip');
    }
    const gap = document.getElementById('cascadeHorizonGap');
    if (gap) gap.textContent = '';
    const pair = document.getElementById('cascadeHorizonPair');
    const medianWrap = document.getElementById('cascadeMedianYearWrap');
    const headlineWrap = document.getElementById('cascadeHeadlineYearWrap');
    if (pair) pair.style.display = 'none';
    if (medianWrap) medianWrap.style.display = 'none';
    if (headlineWrap) headlineWrap.style.display = 'none';
    const leadName = document.getElementById('hyLeadName');
    const leadBox = document.getElementById('hyLeadBox');
    if (leadName && !leadName.textContent.trim()) leadName.textContent = 'Top threat P50';
    if (leadBox && !leadBox.title) leadBox.title = '';
  }
  document.getElementById('narrativeText').innerHTML = buildNarrative(scKey, enriched, mcRes);
  renderAggregateRow(enriched, mcRes);
  renderPriorityPanel(enriched, mcRes);
  renderOverviewStrip(enriched, mcRes);
  try { renderAdvancedMethod(enriched, mcRes); } catch(e) { console.error('renderAdvancedMethod error:', e); }
  renderDomainComp(enriched);
  renderTable(enriched, mcRes);
  renderClimateBreakdownDetail(enriched, mcRes);
  drawBarChart(enriched, mcRes);
  renderConditionalScenario(mcRes);
  drawSensChart();
  drawExploratorySensitivityChart();

  document.getElementById('hdrMeta').innerHTML =
    mcRes
      ? `Scenario: ${SC[scKey].label}<br>Last run: ${new Date().toLocaleTimeString()}<br>${THREATS.length} threats  6 dims`
      : `Scenario: ${SC[scKey].label}<br>Status: pending rerun<br>${THREATS.length} threats  6 dims`;
}

let _running = false;
let _resultVersion = 0;

function updateLoadingProgress(progress) {
  const percent = Math.round(progress * 100);
  for (const [fillId, percentId] of [
    ['loaderLineFill', 'loaderPercent'],
    ['cascadeLoadingFill', 'cascadeLoadingPercent'],
  ]) {
    const fill = document.getElementById(fillId);
    const value = document.getElementById(percentId);
    if (fill) fill.style.width = `${percent}%`;
    if (value) value.textContent = `${percent}%`;
  }
  const progressbar = document.getElementById('cascadeLoadingProgress');
  if (progressbar) progressbar.setAttribute('aria-valuenow', String(percent));
}

(function() {
  let _cur = 0;
  window._particleLoader = {
    start() {
      _cur = 0;
      const wrap = document.getElementById('mcParticleWrap');
      updateLoadingProgress(0);
      if (wrap) wrap.style.display = 'grid';
    },
    setProgress(p) {
      const v = Math.max(_cur, Math.max(0, Math.min(1, p)));
      _cur = v;
      updateLoadingProgress(v);
    },
    stop() {
      _cur = 0;
      const wrap = document.getElementById('mcParticleWrap');
      if (wrap) wrap.style.display = 'none';
    },
  };
})();

function startLoadingIndicator() {
  const pair = document.getElementById('cascadeHorizonPair');
  const medianWrap = document.getElementById('cascadeMedianYearWrap');
  const yearWrap = document.getElementById('cascadeHeadlineYearWrap');
  const note     = document.getElementById('cascadeHeadlineNote');
  const stabilityNote = document.getElementById('cascadeStabilityNote');
  const clm      = document.getElementById('cascadeLoadingMsg');
  const conditional = document.getElementById('conditionalScenario');
  if (conditional) conditional.hidden = true;
  if (pair) pair.style.display = 'none';
  if (medianWrap) medianWrap.style.display = 'none';
  if (yearWrap) yearWrap.style.display = 'none';
  if (note)     note.style.display = 'none';
  if (stabilityNote) stabilityNote.style.display = 'none';
  if (clm) {
    updateLoadingProgress(0);
    clm.style.display = 'block';
  }
  const stepLine = document.getElementById('cascadeLoadingStep');
  if (stepLine) stepLine.textContent = '';
  document.body.classList.add('is-model-loading');
}

function announceRunStatus(message) {
  if (typeof window.announceStatus === 'function') window.announceStatus(message);
}

function stopLoadingIndicator() {
  const clm = document.getElementById('cascadeLoadingMsg');
  if (clm) clm.style.display = 'none';
  document.body.classList.remove('is-model-loading');
}

function snapshotParams(scKey, nSim) {
  const params = {
    scenario: scKey,
    nSim,
    seed: P.seed || DEFAULT_MC_SEED,
    threshold: P.threshold,
    cascadeThreshold: P.cascadeThreshold ?? 0.50,
    structuralUncertainty: P.structuralUncertainty !== false,
    pressureTurns: P.pressureTurns !== false,
    depAlpha: P.depAlpha,
    uncMult: P.uncMult,
    tailDependence: P.tailDependence ?? 0.15,
    vetoThreshold: P.vetoThreshold ?? 0.65,
    domW: { ...P.domW },
    weights: { ...P.weights },
    weightProfile: P.weightProfile || 'expert',
    thresholdPolicy: THRESHOLD_POLICY,
  };
  normalizedDomainWeights(params.domW);
  return params;
}

function fnv1aHex(value) {
  let h = 2166136261 >>> 0;
  const text = String(value);
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function freezeDeepCopy(value) {
  const copy = JSON.parse(JSON.stringify(value));
  const freeze = item => {
    if (!item || typeof item !== 'object' || Object.isFrozen(item)) return item;
    Object.values(item).forEach(freeze);
    return Object.freeze(item);
  };
  return freeze(copy);
}

function numericalCodeFingerprint() {
  // Capture loaded function bodies, never a later network copy of app.js.
  // This identifies the numerical implementation, not full-file bytes or a cryptographic digest.
  const functions = {
    numericalCodeFingerprint, clamp, quantile, normalizeMonteCarloSeed,
    hashSeedToUint32, makeSeededRandom, createRngContext, random01, randn, normalSample,
    erf, normCdf, normInv, muOf, loOf, hiOf, fieldKind, fieldBounds, sourceKey,
    lowZeroBit, getSobolDirections, generateSobolPoints, getThreatThreshold, computeHorizon,
    rangeMetaOf, rangedValue, autoRange, normalizeSourceEntry, sourceBackedRange,
    makeThreat, buildDepGraph, rebuildThreatState, sanitizeSourceMap,
    normalizeEvidenceEntry, sanitizeEvidenceMap, explicitSourceForSpecField,
    applyEvidencePosterior, rebuildActiveSourceDataFromState,
    shiftRange, scalePositiveRange, sampleGamma, sampleBeta, fitScaledBeta,
    sampleOrdinalRange, sampleLogNormalRange, sampleThreatNumerics,
    growthMetaOfThreat, growthKindOfThreat, riskConversionOfThreat, effectiveRiskGrowthForThreat,
    sampleEventHorizon, sampleRegimeHorizon, deterministicEventHorizon,
    deterministicRegimeHorizon, computeThreatHorizon, baseScore, depFactor,
    applyScenario, buildEnriched, calcGSI, normalizedDomainWeights, domainWeightMultiplier,
    compensatoryShareByYear, normalizedHorizonSignal, exploratorySensitivityTarget,
    buildCdf, summarizeCrossings, pairedQuantileContrastStandardError, graphAggregationScoreForYear, computeCompensatoryCrossing,
    computeAggregateYears, dependencyExposure,
    cascadeVulnerability, cascadePressureRatio, functionalCascadeNodes, configuredFunctionalCascadeNodes,
    simulateFunctionalCascade, computeDomainFunctionalCrossing,
    structuralComponentsOf, growthClassFactors, createStructuralContext, applyStructuralUncertainty,
    reversibilityTypeForThreat, createPressureTurnContext, applyPressureTurns, turnedHorizon, summarizeCascadeRecovery,
    functionalCoreSimulate: FunctionalCascade.simulate, functionalCorePrepare: FunctionalCascade.prepare,
    functionalCorePressure: FunctionalCascade.pressureRatio, functionalCoreExposure: FunctionalCascade.exposure,
    functionalCoreDrive: FunctionalCascade.drive,
    functionalCoreMetrics: FunctionalCascade.metrics,
    functionalCoreDomainCrossing: FunctionalCascade.firstCrossingFromActivationYears,
    functionalCoreClamp: FunctionalCascade.clamp01,
    activeTransmissionShare, computeDynamicCascadeCrossing, explainCascadeCrossing,
    oatCompositeResponseFromYears, pairedOatBootstrapStandardErrors, createMonteCarloAccumulator, enrichMonteCarloThreats,
    applyGlobalThresholdToSample, recordMonteCarloSample, summarizeThreatHorizonSamples,
    summarizeMonteCarloAccumulator, runMC, runSensitivity, runExploratorySensitivityIndices,
    priorityWeight, weightedFiniteAverage, weightedThreatAverages, domainMonteCarloTimeline,
    threatTimelineForMode, weightedDomainTimeline, summarizeDomainLayer,
    weibullCDF, weibullShapeForThreat, weibullParamsForThreat, weibullProbability, weibullProbabilityBounds, weibullQuantile,
    networkEigenvectorCentrality, dependencyEdgeStats, poissonBinomialPMF, poissonAtLeast,
    independentFailureReference, correlatedScenarioSpread, effectiveCascadeCorrelation,
    jointFailureByDecade, shannonEntropyRisk,
    computeVetoCrossingExperimental, computeAggregateYearsExperimental,
    enrichSampledThreatsForExperimental, sampleLogNormalShockExperimental,
    sampleTailShockExperimental, applyTailShockToSampledThreatExperimental,
    randomDirichletWeightsExperimental, perturbWeightsAroundBaseExperimental,
    runSMAARobustnessExperimental, runTailAndVetoStressExperimental,
  };
  const constants = {
    MODEL_VERSION, RNG_VERSION, DEFAULT_MC_SEED, DEFAULT_MC_SEED_HASH,
    NOW, YS, YE, YR, SOBOL_JOE_KUO_46, SOBOL_BITS, SOBOL_RECIP,
    GLOBAL_THRESHOLD, THRESHOLD_POLICY, THRESHOLD_MIN, THRESHOLD_MAX,
    SC, PARAM_FIELDS, ORD_RANGE, GROWTH_RANGE, THRESH_RANGE, THREAT_SPECS,
    EFFECTIVE_GROWTH_CAP, GROWTH_KIND_CONVERSION, WEIGHT_PROFILES,
    GLOBAL_STRESS_CAPACITY, OUT_DEGREES, MAX_OUT_DEGREE, MEAN_OUT_DEGREE, DEP_GRAPH,
    STRUCTURAL_UNCERTAINTY, STRUCTURAL_COMPONENTS, PRESSURE_TURNS, THREAT_REVERSIBILITY_OVERRIDES,
  };
  const functionNames = Object.keys(functions).sort();
  const source = functionNames.map(name => [name, Function.prototype.toString.call(functions[name])]);
  return {
    codeHashFNV1a32: fnv1aHex(JSON.stringify({ functions: source, constants })),
    codeHashAlgorithm: 'FNV-1a 32-bit over UTF-16 code units; non-cryptographic',
    codeHashScope: 'Loaded numerical function bodies listed in codeHashFunctions and their model constants/derived graph state at execution snapshot time; excludes UI, full-file bytes, browser runtime and libraries.',
    codeHashFunctions: functionNames,
  };
}

function createExecutionSnapshot(params) {
  const sourceData = JSON.parse(JSON.stringify(ACTIVE_SOURCE_DATA || {}));
  const numericFields = ['scale', 'urgency', 'acceleration', 'interdependence', 'irreversibility', 'gov_failure', 'growth_rate', 'threshold'];
  return freezeDeepCopy({
    executedAt: new Date().toISOString(),
    codeIdentifier: MODEL_VERSION,
    ...numericalCodeFingerprint(),
    dataIdentifier: currentDatasetVersion(),
    dataHashFNV1a32: fnv1aHex(JSON.stringify(sourceData)),
    primaryDataset: PRIMARY_DATASET_NAME,
    activeDataset: ACTIVE_SOURCE_META.fileName || PRIMARY_DATASET_NAME,
    seed: params.seed,
    rngVersion: RNG_VERSION,
    parameters: params,
    scenarioDefinition: SC[params.scenario] || SC.baseline,
    modelConstants: {
      effectiveGrowthCap: EFFECTIVE_GROWTH_CAP,
      globalThreshold: GLOBAL_THRESHOLD,
      thresholdMin: THRESHOLD_MIN,
      thresholdMax: THRESHOLD_MAX,
      cascadeWavesPerYear: 'synchronous least fixed point; at most number of threats',
      cascadeRule: 'max(global criticality-weighted loss, essential-service criticality-weighted loss) >= cascadeThreshold; in the Monte Carlo the threshold, criticality level values, dependency weights and lags are sampled per run (structuralUncertainty)',
      cascadeWeightMeaning: 'Criticality judgments, not probability or sampled MCDA priority. The declared tiers 1/2/3 are the central values; the Monte Carlo samples each level value within ±0.5.',
      structuralUncertainty: params.structuralUncertainty === false ? null : STRUCTURAL_UNCERTAINTY,
      pressureTurns: params.pressureTurns === false ? null : PRESSURE_TURNS,
      cascadeTimeMeaning: 'First functional-threshold crossing. In the Monte Carlo a threat’s pressure can turn and decline, and failed threats can then recover, so a run can fall back below the threshold later; no physical permanence claim.',
      regimeHorizonRule: 'Sampled latent-pressure first passage; regime abruptness does not add an uncalibrated geometric waiting-time draw.',
      domainHorizonRule: 'Within-domain functional-loss first crossing reconstructed from full-system propagated activation histories using the headline criticality, overlap, service and threshold rules.',
    },
    threatInputs: THREATS.map(t => ({
      id: t.id,
      process_type: t.process_type,
      deps: [...(t.deps || [])],
      dependency_weights: { ...(t.dependency_weights || {}) },
      functional_weight: t.functional_weight,
      functional_overlap_group: t.functional_overlap_group,
      functional_inducible: t.functional_inducible,
      dependency_lags: { ...(t.dependency_lags || {}) },
      critical_services: [...(t.critical_services || [])],
      functional_failure: t.functional_failure,
      numerics: Object.fromEntries(numericFields.map(field => [field, JSON.parse(JSON.stringify(t[field]))])),
      threat_specific_cap: growthMetaOfThreat(t).threat_specific_cap ?? null,
    })),
    sourceData,
    timeBaseline: { nowYear: NOW, horizonStartYear: YS, horizonEndYear: YE },
    quantileRules: { method: 'Type 7 linear interpolation', p10: 0.10, p50: 0.50, p90: 0.90, centralIntervalWidth: 'P90 - P10 (central 80%)' },
    censoringRules: { noCrossingMarker: YE + 1, display: '>2100', weibullUndefinedMedian: 'Finite median beyond horizon: right_censored; non-finite supplied median: invalid. Both retain null point quantiles/probabilities, without fallback; censored medians imply only probability bounds.' },
    uncertaintyLabels: {
      samplingSigma: 'SD of mixed horizon-coded times; no crossing by YE is coded YE + 1, not an actual post-horizon crossing time',
      parameterSigma: 'legacy key: sample SD of 160 bootstrap horizon-coded medians; actual median and its MC SE remain unidentified when censored',
      structuralSigma: 'legacy key: cross-aggregator P50 range, not sigma',
    },
  });
}

function resetExploratorySensitivityText() {
  const warn = document.getElementById('exploratorySensWarn');
  if (warn) warn.textContent = 'Low-discrepancy Sobol sampling is used here, but the panel remains a reduced-order screen over 23 effective threat parameters rather than a full raw-parameter decomposition.';
  const text = document.getElementById('exploratorySensText');
  if (text) text.textContent = 'This chart shows which threats contribute most to uncertainty in the Apocalypse Clock result when many possible combinations are tested. The first-order bar shows a threat\'s direct effect. The total-order bar includes both its direct effect and its interaction with other threats. This helps reveal which risks matter not only alone, but also as part of a connected systemic-risk network.';
}

function invalidateCachedResults() {
  _resultVersion += 1;
  _cdfCurves = {};
  _sensData = null;
  _exploratoryData = null;
  const prog = document.getElementById('mcProgress');
  const badge = document.getElementById('simBadge');
  if (prog) prog.style.width = '0%';
  if (window._particleLoader) window._particleLoader.stop();
  if (badge) badge.innerHTML = '<span class="live-dot"></span>Pending rerun';
  resetExploratorySensitivityText();
  _experimentalScientificData = null;
  resetExperimentalScientificPanel();
  markCalcConsolePending('Parameters changed. Waiting for a fresh rerun.');
}

function refreshCurrentView(mcRes) {
  const scKey = currentScenario();
  const enriched = buildEnriched(scKey);
  initNetwork(enriched);
  updateUI(mcRes || null, scKey, enriched);
}

async function runAll() {
  if (_running) return;
  const runVersion = ++_resultVersion;
  _running = true;
  startLoadingIndicator();
  if (window._particleLoader) window._particleLoader.start();
  try {
    const scKey = currentScenario();
    const nSim = parseInt(P.nSim, 10) || 3000;
    const seed = normalizeMonteCarloSeed(P.seed || DEFAULT_MC_SEED);
    P.scenario = scKey; P.nSim = nSim; P.seed = seed;
    startCalcConsole(scKey, nSim);
    setDominantDriverKpi('Calculating...', 'Current priority summary');
    setCalcStepStatus('scenario', 'running', 'Applying scenario shifts, domain multipliers, and per-threat modifiers.', 'Preparing mathematical inputs for the next model pass.');
    await yieldForCalcConsole();
    const params = snapshotParams(scKey, nSim);
    const executionSnapshot = createExecutionSnapshot(params);
    setCalcStepStatus('scenario', 'done', `${SC[scKey].label} scenario conditioning locked with ${nSim.toLocaleString()} Monte Carlo runs.`, 'Deterministic threat scoring is now running.');

    const prog = document.getElementById('mcProgress');
    const badge = document.getElementById('simBadge');
    prog.style.width = '0%';
    setCalcStepStatus('base', 'running', `Recomputing weighted six-dimension base scores for ${THREATS.length} threats.`);
    setCalcStepStatus('dependency', 'queued', 'Heuristic dependency amplification will be applied immediately after base scoring.');
    setCalcStepStatus('domainweights', 'queued', 'Domain sliders will be normalized into relative multipliers around the equal-weight baseline.');
    setCalcStepStatus('horizon', 'queued', 'Process-specific horizon heuristics will be remapped once adjusted priorities are available.');
    setCalcStepStatus('gsi', 'queued', 'Global systemic stress will update after deterministic threat priorities are rebuilt.');
    setCalcStepStatus('priorityrank', 'queued', 'Lead threat will be ranked from scenario-conditioned priority scores.');
    await yieldForCalcConsole();
    const enriched = buildEnriched(scKey, params);
    setCalcStepStatus('base', 'done', `${THREATS.length} weighted MCDA base scores computed under the active scenario.`);
    const depMax = enriched.length ? Math.max(...enriched.map(t => depFactor(t, enriched, params))) : 1;
    setCalcStepStatus('dependency', 'done', `Model-heuristic dependency amplification applied across the threat network (max factor ${depMax.toFixed(2)}×).`);
    const normW = normalizedDomainWeights(params.domW);
    setCalcStepStatus('domainweights', 'done', `Domain weights normalized to civilization ${(normW.civilization * 100).toFixed(0)}%, biosphere ${(normW.biosphere * 100).toFixed(0)}%, technology ${(normW.technology * 100).toFixed(0)}%.`);
    setCalcStepStatus('horizon', 'done', 'Process-specific horizon heuristics recomputed from adjusted priorities.');
    const gsi = calcGSI(enriched);
    initNetwork(enriched);
    setCalcStepStatus('gsi', 'done', `Global Stress Index recomputed at ${gsi.toFixed(0)} / 100.`, 'Deterministic model layers are ready. Monte Carlo sampling will start next.');
    const deterministicLead = [...enriched].sort((a, b) => b.priority - a.priority)[0];
    renderAggregateRow(enriched, null);
    renderPriorityPanel(enriched, null);
    renderOverviewStrip(enriched, null);
    renderAdvancedMethod(enriched, null);
    renderDomainComp(enriched);
    renderTable(enriched, null);
    renderClimateBreakdownDetail(enriched, null);
    drawBarChart(enriched, null);
    if (deterministicLead) setDominantDriverKpi(deterministicLead.name, 'Current priority summary');
    setCalcStepStatus('priorityrank', 'done', deterministicLead ? `Lead threat ranked as ${deterministicLead.name} with priority ${deterministicLead.priority.toFixed(2)}.` : 'No lead threat could be ranked.');
    let lastMcUpdate = -1;
    const structureOn = P.structuralUncertainty !== false;
    const turnsOn = P.pressureTurns !== false;
    setCalcStepStatus('structuresample', 'running', structureOn ? 'Sampling the cascade threshold (0.40 to 0.60), criticality levels, dependency weights and lags, and growth class in every run.' : 'Switched off: every run uses the declared structure.');
    setCalcStepStatus('turns', 'running', turnsOn ? 'Sampling for each threat a 50% chance that its pressure peaks between 2027 and 2100, with recovery by reversibility class.' : 'Switched off: pressure keeps rising in every run.');
    setCalcStepStatus('montecarlo', 'running', `Sampling Beta / log-normal parameters and simulating ${nSim.toLocaleString()} stochastic futures for threshold crossing.`);
    setCalcStepStatus('compensatory', 'running', 'Compensatory aggregation will be evaluated year by year inside the Monte Carlo pass.');
    setCalcStepStatus('maxrule', 'running', 'Max-rule aggregation will track the earliest single-threat crossing inside the Monte Carlo pass.');
    setCalcStepStatus('graph', 'running', 'Graph-weighted dependency heuristic index will be evaluated inside the Monte Carlo pass; it is not a probability from a validated correlation matrix.');
    setCalcStepStatus('cascade', 'running', 'Dynamic cascade propagation will run a rule-based dependency cascade year by year.');
    setCalcStepStatus('domainmc', 'queued', 'Civilization, biosphere and technology baskets will be reconstructed from full-system propagated activation histories.');
    setCalcStepStatus('recovery', 'queued', 'Runs still below the threshold in 2100 will be counted after the simulation.');
    setCalcStepStatus('triggers', 'queued', 'The runs will be replayed after the simulation to attribute what sets the clocks off.');
    setCalcStepStatus('structural', 'queued', 'Cross-aggregator structural spread will be computed after all ensemble rules resolve.');
    setCalcStepStatus('bootstrap', 'queued', 'Bootstrap uncertainty summaries will be computed after the crossing distributions are collected.');
    setCalcStepStatus('weibull', 'queued', 'Weibull-shaped hazard diagnostics will run after Monte Carlo threat statistics are available.');
    setCalcStepStatus('eigen', 'queued', 'Network eigenvector centrality will rank dependency hubs after main stochastic outputs are ready.');
    setCalcStepStatus('poissonbinomial', 'queued', 'Poisson-binomial convergence tails will run after threat probabilities are available.');
    setCalcStepStatus('entropy', 'queued', 'Shannon entropy will measure risk concentration after final priority shares are available.');
    // Loading bar: the steps done so far plus the share of the seven steps that finish with the simulation.
    const doneBeforeMc = BLOCKING_CALC_STEPS.filter(step => ensureCalcConsoleState().steps[step.id].status === 'done').length;
    const mcRes = await runMC(scKey, nSim, frac => {
      prog.style.width = (frac * 100) + '%';
      if (window._particleLoader) window._particleLoader.setProgress((doneBeforeMc + frac * 7) / BLOCKING_CALC_STEPS.length);
      badge.innerHTML = `<span class="live-dot"></span>${Math.round(frac * nSim)} / ${nSim}`;
      const roundedPct = Math.round(frac * 100);
      if (roundedPct >= lastMcUpdate + 8 || frac >= 0.999) {
        lastMcUpdate = roundedPct;
        const countLabel = `${Math.round(frac * nSim).toLocaleString()} / ${nSim.toLocaleString()}`;
        setCalcStepStatus('montecarlo', 'running', `${countLabel} stochastic futures sampled and evaluated.`);
      }
    }, params);
    mcRes.executionSnapshot = executionSnapshot;
    // Inputs for the trigger-attribution replay (traceCascadeTriggers), which must match this run.
    mcRes.triggerReplayInputs = { scKey, nSim, params };

    if (runVersion !== _resultVersion) return;

    _cdfCurves[scKey] = mcRes;
    prog.style.width = '100%';
    badge.innerHTML = `<span class="live-dot"></span>${nSim} / ${nSim} ✓`;
    setCalcStepStatus('structuresample', 'done', structureOn ? `Structure sampled in all ${nSim.toLocaleString()} runs: threshold 0.40 to 0.60, criticality levels, dependency weights and lags, growth class.` : 'Switched off: every run used the declared structure.');
    setCalcStepStatus('turns', 'done', turnsOn ? `Pressure turns and recovery sampled in all ${nSim.toLocaleString()} runs (50% chance per threat, recovery by reversibility class).` : 'Switched off: pressure kept rising in every run.');
    setCalcStepStatus('montecarlo', 'done', `${nSim.toLocaleString()} Beta / log-normal parameter draws and stochastic futures completed for threshold crossing.`);
    setCalcStepStatus('compensatory', 'done', `Compensatory aggregation resolved with P50 ${fmtY(mcRes.ensemble.compensatory.p50)}.`);
    setCalcStepStatus('maxrule', 'done', `Non-compensatory max-rule resolved with P50 ${fmtY(mcRes.ensemble.maxRule.p50)}.`);
    setCalcStepStatus('graph', 'done', `Graph-weighted heuristic index resolved with P50 ${fmtY(mcRes.ensemble.graphWeighted.p50)}; diagnostic only.`);
    setCalcStepStatus('cascade', 'done', `Rule-based dynamic cascade resolved with P50 ${fmtY(mcRes.ensemble.dynamicCascade.p50)} and P90 ${fmtY(mcRes.ensemble.dynamicCascade.p90)}.`);
    setCalcStepStatus('domainmc', 'done', `Domain baskets prepared and propagated functional crossings resolved: civilization P50 ${fmtY(mcRes.domainStats.civilization.p50)}, biosphere P50 ${fmtY(mcRes.domainStats.biosphere.p50)}, technology P50 ${fmtY(mcRes.domainStats.technology.p50)}.`);
    setCalcStepStatus('structural', 'done', `Aggregation-rule P50 range (not σ) computed at ${mcRes.structuralSigma.toFixed(1)} years across compensatory, max-rule, graph-weighted heuristic, and dynamic cascade models.`);
    setCalcStepStatus('bootstrap', 'done', `Bootstrap horizon-coded precision summary completed; central 80% interval is P10 ${fmtY(mcRes.p10)} to P90 ${fmtY(mcRes.p90)}, with P50 ${fmtY(mcRes.p50)}. Censored: ${pct(mcRes.censorFraction)}.${mcRes.medianCensored ? ' Actual median and its MC SE are not identifiable within the horizon.' : ''}`, 'Bootstrap precision concerns the horizon-coded median, not input uncertainty or unidentified post-horizon dates.');

    const recovery = mcRes.cascadeRecovery;
    setCalcStepStatus('recovery', 'done', recovery ? `${(nSim - recovery.crossedRuns).toLocaleString()} of ${nSim.toLocaleString()} runs are still below the threshold in 2100; ${recovery.backBelowAtEnd.toLocaleString()} of the ${recovery.crossedRuns.toLocaleString()} crossing runs are back below it by then.` : 'No recovery summary is available for this run.');
    setCalcStepStatus('triggers', 'running', `Replaying the ${nSim.toLocaleString()} runs in the background to attribute which essential-service basket sets the clocks off.`);
    setCalcStepStatus('weibull', 'running', 'Computing Weibull-shaped hazard diagnostics calibrated to model horizons.');
    setCalcStepStatus('eigen', 'running', 'Running power-iteration centrality over the dependency network.');
    setCalcStepStatus('poissonbinomial', 'running', 'Convolving unequal model probabilities for an exact internal tail calculation.');
    setCalcStepStatus('entropy', 'running', 'Computing Shannon entropy over normalized priority shares.');

    const ts = mcRes.threatStats || {};
    let weibullMeanBeta = 1.5;
    let centralityRows = [];
    let jointTail = { rows: [], k80: 10 };
    let joint2050 = { at80: 0 };
    let entropyStats = { h: 0, hMax: 0, concentration: 0, effectiveN: 1 };

    try { weibullMeanBeta = enriched.reduce((s, t) => s + weibullParamsForThreat(t, ts[t.id] || null).beta, 0) / Math.max(1, enriched.length); } catch(e) { console.warn('Weibull mean beta failed', e); }
    setCalcStepStatus('weibull', 'done', `Weibull-shaped diagnostic completed with mean β ${weibullMeanBeta.toFixed(2)} across ${enriched.length} threats; this is not an empirical survival fit.`);

    try { centralityRows = networkEigenvectorCentrality(enriched).sort((a, b) => b.weightedCentrality - a.weightedCentrality); } catch(e) { console.warn('Eigenvector centrality failed', e); }
    setCalcStepStatus('eigen', 'done', centralityRows.length ? `Eigenvector centrality completed. Current structural hub: ${centralityRows[0].name}.` : 'Eigenvector centrality completed.');

    try {
      jointTail = jointFailureByDecade(enriched, mcRes);
      joint2050 = (jointTail && jointTail.rows && jointTail.rows.length) ? (jointTail.rows.find(r => r.year === 2050) || jointTail.rows[jointTail.rows.length - 1]) : { at80: 0 };
    } catch(e) { console.warn('Poisson-binomial tail failed', e); }
    setCalcStepStatus('poissonbinomial', 'done', jointTail.rows.length ? `Independent Poisson-binomial reference completed: P(≥${jointTail.k80}/${enriched.length} model-active threats by 2050) ${joint2050.censoredCount ? `is bounded by ${advancedPct(joint2050.at80Lower)}–${advancedPct(joint2050.at80Upper)} with ${joint2050.censoredCount} right-censored threats` : `= ${advancedPct(joint2050.at80)}`}.` : 'Independent Poisson-binomial reference completed.');

    try { entropyStats = shannonEntropyRisk(enriched); } catch(e) { console.warn('Shannon entropy failed', e); }
    setCalcStepStatus('entropy', 'done', `Shannon entropy completed: H=${entropyStats.h.toFixed(2)} bits, effective N=${entropyStats.effectiveN.toFixed(1)} threats.`);

    // Optional diagnostics belong to the previous run; they are rerun only from the Model Diagnostics button.
    _sensData = null;
    _exploratoryData = null;
    _experimentalScientificData = null;
    resetExperimentalScientificPanel();
    try { updateUI(mcRes, scKey, enriched, executionSnapshot); } catch(uiErr) { console.error('updateUI error (non-fatal):', uiErr); }
    announceRunStatus(`Model run complete. Dynamic cascade P50 ${fmtY(mcRes.ensemble.dynamicCascade.p50)}, P90 ${fmtY(mcRes.ensemble.dynamicCascade.p90)}.`);
    setCalcStepStatus('oat', 'pending', 'Idle. Use “Run diagnostics” to run OAT sensitivity.');
    setCalcStepStatus('sobol', 'pending', 'Idle. Use “Run diagnostics” to run Sobol/Jansen sensitivity.');
    setCalcStepStatus('smaa', 'pending', 'Idle. Use “Run diagnostics” to run SMAA robustness.');
    setCalcStepStatus('veto', 'pending', 'Idle. Use “Run diagnostics” to run veto-rule stress testing.');
    setCalcStepStatus('tailshock', 'pending', 'Idle. Use “Run diagnostics” to run tail-dependence stress testing.');
    setCalcStepStatus('audit', 'pending', 'Idle. Use “Run diagnostics” to build the audit summary.');
    finalizeCalcConsoleSummary();
  } catch (err) {
    console.error('Simulation run failed', err);
    const badge = document.getElementById('simBadge');
    if (badge) badge.innerHTML = '<span class="live-dot"></span>Run failed';
    const state = ensureCalcConsoleState();
    CORE_CALC_STEPS.filter(step => state.steps[step.id].status === 'running').forEach(step => {
      setCalcStepStatus(step.id, 'error', 'This stage was interrupted by a run failure.', 'Current run failed before all calculation stages could finish.');
    });
    finalizeCalcConsoleSummary();
    if (window._particleLoader) window._particleLoader.stop();
    announceRunStatus('Model run failed.');
  } finally {
    stopLoadingIndicator();
    _running = false;
  }
}


let _advancedDiagnosticsRunning = false;
let _experimentalScientificData = null;

function setExperimentalScientificStatus(message) {
  const el = document.getElementById('experimentalScientificStatus');
  if (el) el.textContent = message || 'Idle';
}
function computeVetoCrossingExperimental(enriched, params) {
  const domainThreshold = params.vetoThreshold ?? 0.65;
  const domains = ['civilization', 'biosphere', 'technology'];
  for (let yr = YS; yr <= YE; yr++) {
    for (const domain of domains) {
      const subset = enriched.filter(t => t.domain === domain);
      const totalPriority = subset.reduce((s, t) => s + Math.max(0.001, t.priority || 1), 0) || 1;
      const activePriority = subset.filter(t => t.horizon <= yr).reduce((s, t) => s + Math.max(0.001, t.priority || 1), 0);
      if (activePriority / totalPriority >= domainThreshold) return yr;
    }
  }
  return YE + 1;
}

function computeAggregateYearsExperimental(enriched, params) {
  const years = computeAggregateYears(enriched, params);
  return { ...years, vetoRule: computeVetoCrossingExperimental(enriched, params) };
}

function enrichSampledThreatsForExperimental(sampled, params, rng) {
  return sampled.map(t => {
    const bs = baseScore(t, params.weights);
    const priority = bs * depFactor(t, sampled, params) * domainWeightMultiplier(t.domain, params);
    const rawGrowth = typeof t.growth_rate === 'number' ? t.growth_rate : muOf(t.growth_rate);
    const effectiveGrowth = effectiveRiskGrowthForThreat(t, rawGrowth);
    const threshold = getThreatThreshold(t, params.thresholdPolicy || THRESHOLD_POLICY);
    const horizon = computeThreatHorizon(
      priority,
      effectiveGrowth,
      threshold,
      t.process_type,
      true,
      rng
    );
    return {
      ...t,
      bs,
      priority,
      threshold_value: threshold,
      growth_rate_raw: rawGrowth,
      growth_rate_effective: effectiveGrowth,
      horizon,
    };
  });
}

function sampleLogNormalShockExperimental(mu, sigma, rng) {
  return Math.exp(mu + sigma * (rng ? rng.randn() : randn())) - 1;
}

function sampleTailShockExperimental(tailProb, rng) {
  const p = Number.isFinite(tailProb) ? tailProb : 0.15;
  return (rng ? rng.random01() : random01()) < clamp(p, 0, 1);
}

function applyTailShockToSampledThreatExperimental(threat, rng) {
  const rawGr = typeof threat.growth_rate === 'number' ? threat.growth_rate : muOf(threat.growth_rate);
  const interdependenceSensitivity = clamp(muOf(threat.interdependence) / 5, 0, 1);
  const accelerationSensitivity = clamp(muOf(threat.acceleration) / 5, 0, 1);
  const domainSensitivity = {
    civilization: 0.85,
    biosphere: 0.65,
    technology: 0.75,
  }[threat.domain] ?? 0.70;
  const rawBoost = clamp(sampleLogNormalShockExperimental(0.18, 0.28, rng), 0, 1.50);
  const effectiveBoost = rawBoost * domainSensitivity * (0.50 + 0.30 * interdependenceSensitivity + 0.20 * accelerationSensitivity);
  const shocked = clamp(rawGr * (1 + effectiveBoost), 0.0005, 0.25);
  return {
    ...threat,
    growth_rate: shocked,
    growth_rate_raw: shocked,
    tailShockApplied: true,
    tailShockBoost: effectiveBoost,
  };
}

function randomDirichletWeightsExperimental(baseWeights, concentration, rng) {
  const keys = Object.keys(baseWeights);
  const sumWeights = keys.reduce((sum, key) => sum + baseWeights[key], 0);
  const kappa = concentration || 8;
  const gammas = keys.map(key => baseWeights[key] > 0 ? sampleGamma(kappa * baseWeights[key] / sumWeights, rng) : 0);
  const sum = gammas.reduce((s, v) => s + v, 0) || 1;
  return Object.fromEntries(keys.map((k, i) => [k, gammas[i] / sum]));
}

function perturbWeightsAroundBaseExperimental(baseWeights, nSamples, concentration, rng) {
  const keys = Object.keys(baseWeights);
  if (!keys.length || !keys.every(k => Number.isFinite(baseWeights[k]) && baseWeights[k] >= 0)) {
    throw new Error('SMAA base weights must be finite and non-negative.');
  }
  const baseSum = keys.reduce((s, k) => s + baseWeights[k], 0);
  if (!(baseSum > 0)) throw new Error('SMAA base weights cannot all be zero.');
  const samples = [];
  // The previous equal-shape Gamma draws used this concentration per component.
  const kappa = (concentration || 8) * keys.length;
  for (let i = 0; i < nSamples; i++) {
    const dir = randomDirichletWeightsExperimental(baseWeights, kappa, rng);
    const result = {};
    keys.forEach(k => { result[k] = dir[k] * baseSum; });
    samples.push(result);
  }
  return samples;
}

async function runSMAARobustnessExperimental(scKey, params, nSamples) {
  const n = nSamples || 96;
  const baselineEnriched = buildEnriched(scKey, params);
  const weightSamples = perturbWeightsAroundBaseExperimental(params.weights, n, 8, createRngContext(`${params.seed || DEFAULT_MC_SEED}:smaa`));
  const compYears = [];
  const cascadeYears = [];
  const vetoYears = [];
  const topCounts = Object.fromEntries(baselineEnriched.map(t => [t.id, 0]));
  const top3Counts = Object.fromEntries(baselineEnriched.map(t => [t.id, 0]));

  for (let i = 0; i < weightSamples.length; i++) {
    const w = weightSamples[i];
    const testParams = { ...params, weights: w };
    const reEnriched = buildEnriched(scKey, testParams);
    const ranked = [...reEnriched].sort((a, b) => b.priority - a.priority);
    if (ranked[0]) topCounts[ranked[0].id]++;
    ranked.slice(0, 3).forEach(t => { top3Counts[t.id]++; });
    const years = computeAggregateYearsExperimental(reEnriched, testParams);
    compYears.push(years.comp);
    cascadeYears.push(years.dynamicCascade);
    vetoYears.push(years.vetoRule);
    if (i % 12 === 0) await new Promise(r => setTimeout(r, 0));
  }

  compYears.sort((a, b) => a - b);
  cascadeYears.sort((a, b) => a - b);
  vetoYears.sort((a, b) => a - b);

  const topRankAcceptability = Object.entries(topCounts).map(([id, count]) => {
    const t = baselineEnriched.find(x => x.id === id);
    return { id, name: t?.name || id, domain: t?.domain || '', share: count / n };
  }).sort((a, b) => b.share - a.share);

  const top3Acceptability = Object.entries(top3Counts).map(([id, count]) => {
    const t = baselineEnriched.find(x => x.id === id);
    return { id, name: t?.name || id, domain: t?.domain || '', share: count / n };
  }).sort((a, b) => b.share - a.share);

  return {
    nSamples: n,
    p10: quantile(compYears, 0.10),
    p50: quantile(compYears, 0.50),
    p90: quantile(compYears, 0.90),
    cascadeP10: quantile(cascadeYears, 0.10),
    cascadeP50: quantile(cascadeYears, 0.50),
    cascadeP90: quantile(cascadeYears, 0.90),
    vetoP10: quantile(vetoYears, 0.10),
    vetoP50: quantile(vetoYears, 0.50),
    vetoP90: quantile(vetoYears, 0.90),
    topRankAcceptability: topRankAcceptability.slice(0, 10),
    top3Acceptability: top3Acceptability.slice(0, 10),
    raw: { compYears, cascadeYears, vetoYears },
  };
}

async function runTailAndVetoStressExperimental(scKey, params, nSamples) {
  const n = nSamples || 320;
  const sc = SC[scKey] || SC.baseline;
  const spreadMult = params.uncMult * sc.uncWidthMult;
  const scenarioThreats = THREATS.map(t => applyScenario(t, scKey));
  const compYears = [];
  const cascadeYears = [];
  const vetoYears = [];
  const tailCascadeYears = [];
  const tailVetoYears = [];
  const forcedTailCascadeYears = [];
  let shockCount = 0;
  let meanBoost = 0;
  let boostN = 0;
  const tailCascadeDifferences = [];
  const tailVetoDifferences = [];
  const forcedTailCascadeDifferences = [];
  const parameterRng = createRngContext(`${params.seed || DEFAULT_MC_SEED}:stress:parameters`);
  const mcError = values => {
    if (values.length < 2) return 0;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
    return Math.sqrt(variance / values.length);
  };

  for (let i = 0; i < n; i++) {
    const sampled = scenarioThreats.map(t => sampleThreatNumerics(t, spreadMult, parameterRng));
    const processSeed = `${params.seed || DEFAULT_MC_SEED}:stress:process:${i}`;
    const enriched = enrichSampledThreatsForExperimental(sampled, params, createRngContext(processSeed));
    const years = computeAggregateYearsExperimental(enriched, params);
    compYears.push(years.comp);
    cascadeYears.push(years.dynamicCascade);
    vetoYears.push(years.vetoRule);

    const shockRng = createRngContext(`${params.seed || DEFAULT_MC_SEED}:stress:shock:${i}`);
    const shockFires = sampleTailShockExperimental(params.tailDependence ?? 0.15, shockRng);
    if (shockFires) shockCount++;
    const tailSampled = shockFires ? sampled.map(threat => applyTailShockToSampledThreatExperimental(threat, shockRng)) : sampled;
    tailSampled.forEach(t => {
      if (t.tailShockApplied && Number.isFinite(t.tailShockBoost)) { meanBoost += t.tailShockBoost; boostN++; }
    });
    const tailEnriched = enrichSampledThreatsForExperimental(tailSampled, params, createRngContext(processSeed));
    const tailYears = computeAggregateYearsExperimental(tailEnriched, params);
    tailCascadeYears.push(tailYears.dynamicCascade);
    tailVetoYears.push(tailYears.vetoRule);

    const forcedShockRng = createRngContext(`${params.seed || DEFAULT_MC_SEED}:stress:forced-shock:${i}`);
    const forcedTailSampled = sampled.map(threat => applyTailShockToSampledThreatExperimental(threat, forcedShockRng));
    const forcedTailEnriched = enrichSampledThreatsForExperimental(forcedTailSampled, params, createRngContext(processSeed));
    const forcedYears = computeAggregateYearsExperimental(forcedTailEnriched, params);
    forcedTailCascadeYears.push(forcedYears.dynamicCascade);
    tailCascadeDifferences.push(tailYears.dynamicCascade - years.dynamicCascade);
    tailVetoDifferences.push(tailYears.vetoRule - years.vetoRule);
    forcedTailCascadeDifferences.push(forcedYears.dynamicCascade - years.dynamicCascade);

    if (i % 24 === 0) await new Promise(r => setTimeout(r, 0));
  }

  const contrast = (values, baseline, intervention) => ({
    meanDifferenceYears: values.reduce((s, v) => s + v, 0) / Math.max(1, values.length),
    mcStandardErrorYears: mcError(values),
    estimand: 'paired mean contrast of horizon-coded times; no crossing by YE is coded as YE + 1',
    censorCodeYear: YE + 1,
    baselineCensorRate: baseline.filter(year => year > YE).length / Math.max(1, baseline.length),
    interventionCensorRate: intervention.filter(year => year > YE).length / Math.max(1, intervention.length),
  });
  const contrasts = {
    tailCascade: contrast(tailCascadeDifferences, cascadeYears, tailCascadeYears),
    tailVeto: contrast(tailVetoDifferences, vetoYears, tailVetoYears),
    forcedTailCascade: contrast(forcedTailCascadeDifferences, cascadeYears, forcedTailCascadeYears),
  };
  [compYears, cascadeYears, vetoYears, tailCascadeYears, tailVetoYears, forcedTailCascadeYears].forEach(arr => arr.sort((a, b) => a - b));
  const summarize = (arr, label) => summarizeCrossings(arr, arr.length || 1, createRngContext(`${params.seed || DEFAULT_MC_SEED}:stress:bootstrap:${label}`));

  return {
    nSamples: n,
    tailProbability: params.tailDependence ?? 0.15,
    observedShockRate: shockCount / Math.max(1, n),
    meanAppliedBoost: boostN ? meanBoost / boostN : 0,
    compSummary: summarize(compYears, 'comp'),
    cascadeSummary: summarize(cascadeYears, 'cascade'),
    vetoSummary: summarize(vetoYears, 'veto'),
    tailCascadeSummary: summarize(tailCascadeYears, 'tail-cascade'),
    tailVetoSummary: summarize(tailVetoYears, 'tail-veto'),
    forcedTailCascadeSummary: summarize(forcedTailCascadeYears, 'forced-tail-cascade'),
    contrasts,
    pairedRandomInputs: true,
    raw: { compYears, cascadeYears, vetoYears, tailCascadeYears, tailVetoYears, forcedTailCascadeYears },
  };
}

function renderExperimentalSummary(data) {
  const box = document.getElementById('experimentalSummaryBox');
  if (!box || !data) return;
  const s = data.stress || {};
  const m = data.smaa || {};
  box.innerHTML = `
    <div class="advanced-algo-grid">
      <div class="advanced-metric"><div class="advanced-metric-label">Stress samples</div><div class="advanced-metric-value">${s.nSamples || '—'}</div><div class="advanced-metric-note">veto + tail diagnostic</div></div>
      <div class="advanced-metric"><div class="advanced-metric-label">SMAA samples</div><div class="advanced-metric-value">${m.nSamples || '—'}</div><div class="advanced-metric-note">weight-space draws</div></div>
      <div class="advanced-metric"><div class="advanced-metric-label">Veto P50</div><div class="advanced-metric-value">${fmtY(s.vetoSummary?.p50 ?? YE + 1)}</div><div class="advanced-metric-note">domain non-compensatory crossing</div></div>
      <div class="advanced-metric"><div class="advanced-metric-label">Tail cascade P50</div><div class="advanced-metric-value">${fmtY(s.tailCascadeSummary?.p50 ?? YE + 1)}</div><div class="advanced-metric-note">probabilistic tail-shock run</div></div>
      <div class="advanced-metric"><div class="advanced-metric-label">Observed shocks</div><div class="advanced-metric-value">${advancedPct(s.observedShockRate || 0)}</div><div class="advanced-metric-note">configured p=${advancedPct(s.tailProbability || 0)}</div></div>
      <div class="advanced-metric"><div class="advanced-metric-label">Mean boost</div><div class="advanced-metric-value">${advancedPct(s.meanAppliedBoost || 0)}</div><div class="advanced-metric-note">conditional applied growth boost</div></div>
      <div class="advanced-metric"><div class="advanced-metric-label">Paired tail coded-time contrast</div><div class="advanced-metric-value">${Number.isFinite(s.contrasts?.tailCascade?.meanDifferenceYears) ? s.contrasts.tailCascade.meanDifferenceYears.toFixed(2) + 'y' : '—'}</div><div class="advanced-metric-note">MC SE ${Number.isFinite(s.contrasts?.tailCascade?.mcStandardErrorYears) ? s.contrasts.tailCascade.mcStandardErrorYears.toFixed(2) + 'y' : '—'}; no crossing by ${YE} is coded ${YE + 1}. Censored baseline/tail: ${advancedPct(s.contrasts?.tailCascade?.baselineCensorRate)}/${advancedPct(s.contrasts?.tailCascade?.interventionCensorRate)}. Negative means earlier coded times.</div></div>
    </div>`;
}

function renderExperimentalAudit(data) {
  const el = document.getElementById('experimentalAuditBox');
  if (!el || !data) return;
  const runId = `AC-EXP-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
  const modules = [
    ['OAT', !!_sensData],
    ['Sobol/Jansen', !!_exploratoryData],
    ['SMAA', !!data.smaa],
    ['Veto rule', !!data.stress],
    ['Tail shock', !!data.stress],
  ];
  el.innerHTML = `
    <div class="advanced-algo-grid">
      <div class="advanced-metric"><div class="advanced-metric-label">Run ID</div><div class="advanced-metric-value" style="font-size:14px">${escapeHtml(runId)}</div><div class="advanced-metric-note">local browser diagnostic</div></div>
      <div class="advanced-metric"><div class="advanced-metric-label">Scenario</div><div class="advanced-metric-value" style="font-size:14px">${escapeHtml(SC[data.scenario]?.label || data.scenario)}</div><div class="advanced-metric-note">active scenario</div></div>
      <div class="advanced-metric"><div class="advanced-metric-label">Tail p</div><div class="advanced-metric-value">${advancedPct(data.params?.tailDependence ?? 0.15)}</div><div class="advanced-metric-note">correlated shock probability</div></div>
      <div class="advanced-metric"><div class="advanced-metric-label">Veto boundary</div><div class="advanced-metric-value">${advancedPct(data.params?.vetoThreshold ?? 0.65)}</div><div class="advanced-metric-note">domain active-priority threshold</div></div>
    </div>
    <div style="display:grid;gap:8px;margin-top:12px">
      ${modules.map(([name, ok]) => `<div class="advanced-row"><div class="advanced-row-name">${escapeHtml(name)}</div><div class="advanced-row-val"><span class="advanced-badge">${ok ? 'completed' : 'not run'}</span></div></div>`).join('')}
    </div>`;
}

function yearChartValue(y) {
  return y > YE ? YE + 3 : Math.max(YS, y);
}

function yearAxisLabel(value) {
  return value > YE ? '>2100' : String(Math.round(value));
}

let _scientificPlotlyPromise = null;
const SCIENTIFIC_PLOTLY_IDS = [
  'sensCanvas',
  'sobolCanvas',
  'vetoDiagnosticChart',
  'tailShockChart',
  'smaaDiagnosticChart',
  'plotlyHistogramChart',
  'plotlyBoxplotChart',
  'plotlyHeatmapChart',
  'plotlyCdfChart',
];

function ensureScientificPlotly() {
  if (window.Plotly && typeof window.Plotly.react === 'function') return Promise.resolve(window.Plotly);
  if (_scientificPlotlyPromise) return _scientificPlotlyPromise;
  _scientificPlotlyPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[data-scientific-plotly="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Plotly));
      existing.addEventListener('error', () => { SCIENTIFIC_PLOTLY_IDS.forEach(id => setScientificPlotlyMessage(id, 'Chart renderer failed to load. Check network access or bundle the chart engine locally.')); resolve(null); });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/plotly.js-dist-min@2.35.2/plotly.min.js';
    script.async = true;
    script.defer = true;
    script.dataset.scientificPlotly = 'true';
    script.onload = () => resolve(window.Plotly);
    script.onerror = () => { SCIENTIFIC_PLOTLY_IDS.forEach(id => setScientificPlotlyMessage(id, 'Chart renderer failed to load. Check network access or bundle the chart engine locally.')); resolve(null); };
    document.head.appendChild(script);
  });
  return _scientificPlotlyPromise;
}

function scientificPlotlyConfig() {
  return {
    responsive: true,
    displaylogo: false,
    displayModeBar: 'hover',
    scrollZoom: false,
    doubleClick: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d', 'zoomIn2d', 'zoomOut2d'],
    toImageButtonOptions: { format: 'png', filename: 'apocalypse-clock-scientific-chart', scale: 2 },
  };
}

function scientificPlotlyPalette() {
  const p = readVizPalette();
  const purple = getComputedStyle(document.documentElement).getPropertyValue('--purple').trim() || '#8b5cf6';
  return {
    ...p,
    purple,
    panel: 'rgba(8,12,18,0.18)',
    grid: rgba(p.text, 0.055),
    gridSoft: rgba(p.text, 0.030),
    zero: rgba(p.text, 0.22),
    muted: rgba(p.text, 0.40),
  };
}

function scientificPlotlyBaseLayout() {
  const p = scientificPlotlyPalette();
  return {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: p.panel,
    font: { family: p.font, color: p.text2, size: 9 },
    colorway: [p.blue, p.green, p.amber, p.red, p.purple],
    margin: { l: 126, r: 24, t: 10, b: 44 },
    hovermode: 'closest',
    dragmode: false,
    hoverlabel: {
      bgcolor: 'rgba(13,18,27,.98)',
      bordercolor: rgba(p.text, 0.16),
      font: { family: p.font, color: p.text, size: 11 },
      align: 'left',
    },
    legend: {
      orientation: 'h', x: 0, y: -0.17,
      bgcolor: 'rgba(0,0,0,0)',
      font: { color: p.text3, size: 8 },
      itemclick: false,
      itemdoubleclick: false,
      tracegroupgap: 8,
    },
    xaxis: {
      zeroline: false,
      showgrid: true,
      gridcolor: p.grid,
      gridwidth: 1,
      showline: true,
      linecolor: rgba(p.text, 0.14),
      linewidth: 1,
      tickfont: { color: p.text3, size: 8 },
      titlefont: { color: p.text3, size: 8 },
      ticks: 'outside',
      tickcolor: rgba(p.text, 0.12),
      ticklen: 3,
      tickwidth: 1,
      automargin: true,
    },
    yaxis: {
      zeroline: false,
      showgrid: false,
      gridcolor: p.gridSoft,
      showline: true,
      linecolor: rgba(p.text, 0.10),
      linewidth: 1,
      tickfont: { color: p.text2, size: 8 },
      titlefont: { color: p.text3, size: 8 },
      ticks: '',
      automargin: true,
    },
    transition: { duration: 220, easing: 'cubic-in-out' },
  };
}

function mergeAxis(base, override) {
  return { ...(base || {}), ...(override || {}) };
}

function scientificPlotlyLayout(overrides = {}) {
  const base = scientificPlotlyBaseLayout();
  return {
    ...base,
    ...overrides,
    xaxis: mergeAxis(base.xaxis, overrides.xaxis),
    yaxis: mergeAxis(base.yaxis, overrides.yaxis),
    legend: mergeAxis(base.legend, overrides.legend),
    margin: mergeAxis(base.margin, overrides.margin),
  };
}

function prepareScientificPlotlyPanel(id) {
  const el = typeof id === 'string' ? document.getElementById(id) : id;
  if (!el) return null;
  if (window.Plotly && el.data) {
    try { window.Plotly.purge(el); } catch (_) {}
  }
  el.classList.remove('scientific-plotly-empty-state');
  el.innerHTML = '';
  return el;
}

function setScientificPlotlyMessage(id, message) {
  const el = document.getElementById(id);
  if (!el) return;
  if (window.Plotly && el.data) {
    try { window.Plotly.purge(el); } catch (_) {}
  }
  el.classList.add('scientific-plotly-empty-state');
  el.innerHTML = `<div class="scientific-plotly-empty">${escapeHtml(message)}</div>`;
}

function scientificDomainColor(id, alpha = 1) {
  const p = readVizPalette();
  const t = THREATS.find(x => x.id === id);
  const color = !t ? p.text2 : t.domain === 'civilization' ? p.red : t.domain === 'biosphere' ? p.green : p.blue;
  return alpha === 1 ? color : rgba(color, alpha);
}

function scientificYearRangeFromValues(values, pad = 2, minSpan = 8) {
  const finite = (values || []).filter(Number.isFinite).map(yearChartValue);
  if (!finite.length) return [YS, Math.min(YE + 3, YS + 12)];
  let min = Math.max(YS, Math.floor(Math.min(...finite)) - pad);
  let max = Math.min(YE + 3, Math.ceil(Math.max(...finite)) + pad);
  if (max - min < minSpan) {
    const mid = (min + max) / 2;
    min = Math.max(YS, Math.floor(mid - minSpan / 2));
    max = Math.min(YE + 3, Math.ceil(mid + minSpan / 2));
  }
  return [min, max];
}

function scientificYearTicks(range, approx = 6) {
  const [min, max] = range;
  const step = Math.max(1, Math.ceil((max - min) / approx));
  const ticks = [];
  for (let v = min; v <= max + 0.001; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] !== max) ticks.push(max);
  return ticks;
}

function scientificPercentText(x) {
  return `${Math.round((x || 0) * 100)}%`;
}

function labelAnnotation(x, y, text, color) {
  return {
    x, y, text, showarrow: false,
    xanchor: 'center', yanchor: 'bottom',
    font: { size: 9, color },
    bgcolor: 'rgba(5,7,11,.52)',
    bordercolor: rgba(color, 0.20),
    borderwidth: 1,
    borderpad: 3,
  };
}

async function drawSensChart(isCurrent = () => true) {
  if (!isCurrent()) return;
  const data = _sensData;
  if (!data || !data.length) {
    setScientificPlotlyMessage('sensCanvas', 'Run diagnostics to render OAT sensitivity.');
    return;
  }
  const Plotly = await ensureScientificPlotly();
  if (!Plotly || !isCurrent()) return;
  const p = scientificPlotlyPalette();
  const top = data.slice(0, Math.min(8, data.length)).reverse();
  const y = top.map(row => shortThreatLabel(row.name, 30));
  const maxAbs = Math.max(0.45, ...top.flatMap(row => [Math.abs(row.upShift || 0), Math.abs(row.dnShift || 0)]));
  const el = document.getElementById('sensCanvas');
  if (el) el.style.height = `${Math.max(250, 78 + top.length * 20)}px`;

  const traces = [
    {
      type: 'bar', orientation: 'h', name: '−20%',
      x: top.map(row => -Math.abs(row.dnShift || 0)), y,
      error_x: { type: 'data', array: top.map(row => 1.96 * (row.dnMcSe || 0)), visible: true, color: rgba(p.text, 0.65), thickness: 1 },
      marker: { color: rgba(p.blue, 0.44), line: { color: rgba(p.blue, 0.84), width: 0.9 } },
      width: 0.46,
      customdata: top.map(row => [row.name, row.totalImpact, row.dnShift, row.dnMcSe]),
      hovertemplate: '<b>%{customdata[0]}</b><br>−20% paired contrast: %{x:.2f} pp<br>Paired bootstrap MC SE: %{customdata[3]:.2f} pp<br>Contrast beyond 1.96 SE (heuristic): %{customdata[1]:.2f} pp<extra></extra>',
    },
    {
      type: 'bar', orientation: 'h', name: '+20%',
      x: top.map(row => Math.abs(row.upShift || 0)), y,
      error_x: { type: 'data', array: top.map(row => 1.96 * (row.upMcSe || 0)), visible: true, color: rgba(p.text, 0.65), thickness: 1 },
      marker: { color: rgba(p.red, 0.54), line: { color: rgba(p.red, 0.86), width: 0.9 } },
      width: 0.46,
      customdata: top.map(row => [row.name, row.totalImpact, row.upShift, row.upMcSe]),
      hovertemplate: '<b>%{customdata[0]}</b><br>+20% paired contrast: +%{x:.2f} pp<br>Paired bootstrap MC SE: %{customdata[3]:.2f} pp<br>Contrast beyond 1.96 SE (heuristic): %{customdata[1]:.2f} pp<extra></extra>',
    },
  ];

  const layout = scientificPlotlyLayout({
    barmode: 'relative',
    bargap: 0.46,
    margin: { l: 172, r: 20, t: 4, b: 40 },
    xaxis: { range: [-maxAbs * 1.20, maxAbs * 1.20], zeroline: true, zerolinecolor: p.zero, zerolinewidth: 1, title: 'Change in composite response (percentage points)' },
    yaxis: { showgrid: false },
    shapes: [{ type: 'line', x0: 0, x1: 0, y0: -0.6, y1: top.length - 0.4, xref: 'x', yref: 'y', line: { color: p.zero, width: 1 } }],
  });
  await Plotly.react(prepareScientificPlotlyPanel('sensCanvas'), traces, layout, scientificPlotlyConfig());
}

async function drawExploratorySensitivityChart(isCurrent = () => true) {
  if (!isCurrent()) return;
  const payload = _exploratoryData && _exploratoryData.rows ? _exploratoryData : null;
  if (payload && payload.status === 'undefined_zero_variance') {
    setScientificPlotlyMessage('sobolCanvas', 'Sobol/Jansen indices and ranking are undefined: the sampled target has zero or invalid variance.');
    return;
  }
  const rows = payload ? payload.rows : null;
  if (!rows || !rows.length) {
    setScientificPlotlyMessage('sobolCanvas', 'Run diagnostics to render Sobol/Jansen S1/ST indices.');
    return;
  }
  const Plotly = await ensureScientificPlotly();
  if (!Plotly || !isCurrent()) return;
  const p = scientificPlotlyPalette();
  const top = rows
    .slice()
    .sort((a, b) => Math.max(0, b.ST || 0) - Math.max(0, a.ST || 0))
    .slice(0, Math.min(8, rows.length))
    .reverse();
  const y = top.map(row => shortThreatLabel(row.name, 30));
  const s1 = top.map(row => Math.max(0, row.S1 || 0));
  const st = top.map(row => Math.max(0, row.ST || 0));
  const maxVal = Math.max(0.04, ...st, ...s1);
  const el = document.getElementById('sobolCanvas');
  if (el) el.style.height = `${Math.max(270, 84 + top.length * 22)}px`;

  const traces = [
    {
      type: 'bar', orientation: 'h', name: 'ST total-order',
      x: st, y,
      marker: { color: rgba(p.blue, 0.14), line: { color: rgba(p.blue, 0.82), width: 1.2 } },
      width: 0.54,
      customdata: top.map((row, i) => [row.name, s1[i], st[i], Math.max(0, st[i] - s1[i])]),
      hovertemplate: '<b>%{customdata[0]}</b><br>ST total-order: %{customdata[2]:.3f}<br>S1 first-order: %{customdata[1]:.3f}<br>Interaction gap: %{customdata[3]:.3f}<extra></extra>',
    },
    {
      type: 'bar', orientation: 'h', name: 'S1 first-order',
      x: s1, y,
      marker: { color: rgba(p.amber, 0.58), line: { color: rgba(p.amber, 0.90), width: 0.9 } },
      width: 0.26,
      customdata: top.map((row, i) => [row.name, s1[i], st[i], Math.max(0, st[i] - s1[i])]),
      hovertemplate: '<b>%{customdata[0]}</b><br>S1 first-order: %{customdata[1]:.3f}<br>ST total-order: %{customdata[2]:.3f}<br>Interaction gap: %{customdata[3]:.3f}<extra></extra>',
    },
  ];

  const layout = scientificPlotlyLayout({
    barmode: 'overlay',
    bargap: 0.50,
    margin: { l: 176, r: 20, t: 4, b: 40 },
    xaxis: { range: [0, maxVal * 1.22], title: 'Sensitivity index' },
    yaxis: { showgrid: false },
  });
  await Plotly.react(prepareScientificPlotlyPanel('sobolCanvas'), traces, layout, scientificPlotlyConfig());
}

function plotlySummaryYear(summary, key) {
  const raw = summary && Number.isFinite(summary[key]) ? summary[key] : YE + 1;
  return { raw, clipped: yearChartValue(raw) };
}

async function drawIntervalLollipopChart(targetId, rows, titleColor, isCurrent = () => true) {
  if (!isCurrent()) return;
  const Plotly = await ensureScientificPlotly();
  if (!Plotly || !isCurrent()) return;
  const p = scientificPlotlyPalette();
  const clean = rows.filter(([, summary]) => summary);
  const vals = [];
  clean.forEach(([, summary]) => ['p10','p50','p90'].forEach(k => Number.isFinite(summary[k]) && vals.push(summary[k])));
  const range = scientificYearRangeFromValues(vals, 2, 8);
  const tickVals = scientificYearTicks(range, 6);
  const labels = clean.map(r => r[0]);
  const yVals = labels.map((_, i) => i);
  const p50 = clean.map(r => plotlySummaryYear(r[1], 'p50'));
  const p90 = clean.map(r => plotlySummaryYear(r[1], 'p90'));
  const p10 = clean.map(r => plotlySummaryYear(r[1], 'p10'));

  const lineX = [];
  const lineY = [];
  clean.forEach(([, summary], i) => {
    const a = Number.isFinite(summary.p50) ? yearChartValue(summary.p50) : YE + 1;
    const b = Number.isFinite(summary.p90) ? yearChartValue(summary.p90) : YE + 1;
    lineX.push(Math.min(a, b), Math.max(a, b), null);
    lineY.push(i, i, null);
  });

  const traces = [
    {
      type: 'scatter', mode: 'lines', name: 'P50–P90 interval',
      x: lineX, y: lineY,
      line: { color: rgba(titleColor, 0.30), width: 5, shape: 'linear' },
      hoverinfo: 'skip',
      showlegend: false,
    },
    {
      type: 'scatter', mode: 'markers', name: 'P50',
      x: p50.map(d => d.clipped), y: yVals,
      marker: { color: p.blue, size: 9, symbol: 'circle', line: { color: rgba(p.text, .42), width: 1 } },
      customdata: p50.map(d => yearAxisLabel(d.raw)),
      hovertemplate: '%{text}<br>P50: %{customdata}<extra></extra>',
      text: labels,
    },
    {
      type: 'scatter', mode: 'markers', name: 'P90',
      x: p90.map(d => d.clipped), y: yVals,
      marker: { color: p.amber, size: 10, symbol: 'diamond', line: { color: rgba(p.text, .45), width: 1 } },
      customdata: p90.map(d => yearAxisLabel(d.raw)),
      hovertemplate: '%{text}<br>P90: %{customdata}<extra></extra>',
      text: labels,
    },
    {
      type: 'scatter', mode: 'markers', name: 'P10',
      x: p10.map(d => d.clipped), y: yVals,
      marker: { color: rgba(p.text, 0.26), size: 6, symbol: 'line-ns-open', line: { color: rgba(p.text, 0.34), width: 1 } },
      customdata: p10.map(d => yearAxisLabel(d.raw)),
      hovertemplate: '%{text}<br>P10: %{customdata}<extra></extra>',
      text: labels,
      visible: 'legendonly',
    },
  ];

  const el = document.getElementById(targetId);
  if (el) el.style.height = `${Math.max(220, 92 + clean.length * 28)}px`;

  const layout = scientificPlotlyLayout({
    margin: { l: 122, r: 18, t: 4, b: 40 },
    xaxis: { range, tickvals: tickVals, ticktext: tickVals.map(yearAxisLabel), title: 'Crossing year' },
    yaxis: { range: [-0.55, clean.length - 0.45], tickmode: 'array', tickvals: yVals, ticktext: labels, showgrid: false },
    legend: { orientation: 'h', x: 0, y: -0.18, font: { color: p.text3, size: 8 } },
  });
  await Plotly.react(prepareScientificPlotlyPanel(targetId), traces, layout, scientificPlotlyConfig());
}

async function drawVetoDiagnosticChart(data, isCurrent = () => true) {
  if (!isCurrent()) return;
  const stress = data && data.stress;
  if (!stress) {
    setScientificPlotlyMessage('vetoDiagnosticChart', 'Run diagnostics to render the veto stress test.');
    return;
  }
  const p = scientificPlotlyPalette();
  const rows = [
    ['Compensatory', stress.compSummary],
    ['Dynamic cascade', stress.cascadeSummary],
    ['Veto rule', stress.vetoSummary],
    ['Tail veto', stress.tailVetoSummary],
  ].reverse();
  await drawIntervalLollipopChart('vetoDiagnosticChart', rows, p.red, isCurrent);
}

async function drawTailShockChart(data, isCurrent = () => true) {
  if (!isCurrent()) return;
  const stress = data && data.stress;
  if (!stress) {
    setScientificPlotlyMessage('tailShockChart', 'Run diagnostics to render the tail-dependence stress test.');
    return;
  }
  const p = scientificPlotlyPalette();
  const rows = [
    ['Baseline cascade', stress.cascadeSummary],
    ['Prob. tail cascade', stress.tailCascadeSummary],
    ['Forced tail cascade', stress.forcedTailCascadeSummary],
  ].reverse();
  await drawIntervalLollipopChart('tailShockChart', rows, p.purple, isCurrent);
}

async function drawSMAADiagnosticChart(data, isCurrent = () => true) {
  if (!isCurrent()) return;
  const smaa = data && data.smaa;
  if (!smaa || !smaa.topRankAcceptability || !smaa.topRankAcceptability.length) {
    setScientificPlotlyMessage('smaaDiagnosticChart', 'Run diagnostics to render SMAA robustness.');
    return;
  }
  const Plotly = await ensureScientificPlotly();
  if (!Plotly || !isCurrent()) return;
  const p = scientificPlotlyPalette();
  const rows = smaa.topRankAcceptability.slice(0, 8).reverse();
  const y = rows.map(r => shortThreatLabel(r.name, 30));
  const x = rows.map(r => r.share);
  const maxX = Math.max(0.05, ...x);
  const el = document.getElementById('smaaDiagnosticChart');
  if (el) el.style.height = `${Math.max(260, 82 + rows.length * 22)}px`;
  const traces = [{
    type: 'bar', orientation: 'h', name: 'Acceptability',
    x, y,
    text: x.map(scientificPercentText),
    textposition: 'outside',
    textfont: { color: p.text2, size: 8 },
    cliponaxis: false,
    marker: { color: rows.map(r => scientificDomainColor(r.id, 0.58)), line: { color: rows.map(r => scientificDomainColor(r.id, 0.92)), width: 0.8 } },
    width: 0.46,
    customdata: rows.map(r => [r.name, r.share]),
    hovertemplate: '<b>%{customdata[0]}</b><br>Top-driver acceptability: %{customdata[1]:.1%}<extra></extra>',
  }];
  const layout = scientificPlotlyLayout({
    margin: { l: 174, r: 42, t: 4, b: 40 },
    showlegend: false,
    bargap: 0.48,
    xaxis: { range: [0, maxX * 1.30], tickformat: '.0%', title: 'Share of perturbed-weight runs' },
    yaxis: { showgrid: false },
  });
  await Plotly.react(prepareScientificPlotlyPanel('smaaDiagnosticChart'), traces, layout, scientificPlotlyConfig());
}

async function drawDistributionDiagnosticsPlotly(res, isCurrent = () => true) {
  if (!isCurrent()) return;
  const result = res || _cdfCurves[currentScenario()] || null;
  const cascade = result && result.ensemble ? result.ensemble.dynamicCascade : null;
  if (!cascade || !cascade.crossing || !cascade.crossing.length) {
    ['plotlyHistogramChart','plotlyBoxplotChart','plotlyHeatmapChart','plotlyCdfChart'].forEach(id => setScientificPlotlyMessage(id, 'Run the main simulation first; this distribution view needs a completed Monte Carlo result.'));
    return;
  }
  const Plotly = await ensureScientificPlotly();
  if (!Plotly || !isCurrent()) return;
  const p = scientificPlotlyPalette();
  const scenarioLabel = (SC[currentScenario()] && SC[currentScenario()].label) || currentScenario();
  const observedYears = values => (values || []).filter(year => Number.isFinite(year) && year <= YE);
  const censorCount = values => (values || []).filter(year => Number.isFinite(year) && year > YE).length;
  const primaryCrossing = observedYears(cascade.crossing);
  const censored = censorCount(cascade.crossing);
  const yearRange = scientificYearRangeFromValues(primaryCrossing, 2, 10);
  const p10 = yearChartValue(cascade.p10);
  const p50 = yearChartValue(cascade.p50);
  const p90 = yearChartValue(cascade.p90);
  const vline = (x, color, dash='dot') => ({ type: 'line', x0: x, x1: x, y0: 0, y1: 1, xref: 'x', yref: 'paper', line: { color, width: 1, dash } });
  const identifiedMarkers = [[p10, 'P10'], [p50, 'P50'], [p90, 'P90']].filter(([year]) => Number.isFinite(year) && year <= YE);

  if (!primaryCrossing.length) setScientificPlotlyMessage('plotlyHistogramChart', `No observed Dynamic cascade crossings by ${YE}; ${censored}/${cascade.crossing.length} runs are right-censored.`);
  else await Plotly.react(prepareScientificPlotlyPanel('plotlyHistogramChart'), [{
    type: 'histogram',
    x: primaryCrossing,
    nbinsx: Math.min(28, Math.max(9, Math.ceil(Math.sqrt(primaryCrossing.length) * 0.75))),
    marker: { color: rgba(p.amber, 0.42), line: { color: rgba(p.amber, 0.78), width: 0.8 } },
    hovertemplate: 'Crossing-year bin: %{x}<br>Samples: %{y}<extra></extra>',
  }], scientificPlotlyLayout({
    margin: { l: 46, r: 18, t: 4, b: 40 },
    showlegend: false,
    bargap: 0.12,
    xaxis: { range: yearRange, title: `Dynamic cascade crossing year  ${scenarioLabel}; censored ${censored}/${cascade.crossing.length}`, tickformat: 'd' },
    yaxis: { title: 'Samples', showgrid: true, gridcolor: p.gridSoft },
    shapes: identifiedMarkers.map(([year, label]) => vline(year, rgba(p.text, label === 'P50' ? .52 : .20), label === 'P50' ? 'dash' : 'dot')),
    annotations: identifiedMarkers.map(([year, label]) => labelAnnotation(year, 1.02, label, label === 'P50' ? p.text : rgba(p.text, .56))),
  }), scientificPlotlyConfig());
  if (!isCurrent()) return;

  const ensemble = result.ensemble || {};
  const boxDefs = [
    ['Compensatory', ensemble.compensatory, p.blue],
    ['Max-rule', ensemble.maxRule, p.red],
    ['Graph-weighted', ensemble.graphWeighted, p.purple],
    ['Dynamic cascade', ensemble.dynamicCascade, p.green],
  ].filter(([, summary]) => summary && summary.crossing && summary.crossing.length);
  const boxTraces = boxDefs.map(([name, summary, color]) => ({
    type: 'box',
    name: `${name} (${censorCount(summary.crossing)}/${summary.crossing.length} censored)`,
    x: observedYears(summary.crossing),
    boxpoints: false,
    orientation: 'h',
    fillcolor: rgba(color, 0.12),
    marker: { color: rgba(color, 0.52), size: 3 },
    line: { color: rgba(color, 0.82), width: 1.1 },
    whiskerwidth: 0.65,
    hovertemplate: `<b>${name}</b><br>Year conditional on crossing by ${YE}: %{x}<br>Censored: ${censorCount(summary.crossing)}/${summary.crossing.length}<extra></extra>`,
  }));
  const allBoxYears = boxDefs.flatMap(([, summary]) => observedYears(summary.crossing));
  if (!allBoxYears.length) setScientificPlotlyMessage('plotlyBoxplotChart', `No observed crossings by ${YE}; conditional crossing-time boxes are undefined.`);
  else await Plotly.react(prepareScientificPlotlyPanel('plotlyBoxplotChart'), boxTraces, scientificPlotlyLayout({
    margin: { l: 28, r: 18, t: 4, b: 48 },
    boxmode: 'group',
    xaxis: { range: scientificYearRangeFromValues(allBoxYears, 2, 10), title: `Crossing year, conditional on crossing by ${YE}`, tickformat: 'd' },
    yaxis: { showgrid: false },
    legend: { orientation: 'h', x: 0, y: -0.18, font: { color: p.text3, size: 8 } },
  }), scientificPlotlyConfig());
  if (!isCurrent()) return;

  const domains = ['civilization', 'biosphere', 'technology'];
  const labels = ['Civilization', 'Biosphere', 'Technology'];
  const percentiles = ['p10', 'p50', 'p90'];
  const zRaw = domains.map(domain => percentiles.map(k => yearChartValue(result.domainStats?.[domain]?.[k] ?? YE + 1)));
  const zVals = zRaw.flat();
  const zRange = scientificYearRangeFromValues(zVals, 0, 6);
  const text = domains.map(domain => percentiles.map(k => yearAxisLabel(result.domainStats?.[domain]?.[k] ?? YE + 1)));
  await Plotly.react(prepareScientificPlotlyPanel('plotlyHeatmapChart'), [{
    type: 'heatmap',
    z: zRaw,
    zmin: zRange[0],
    zmax: zRange[1],
    x: ['P10', 'P50', 'P90'],
    y: labels,
    text,
    texttemplate: '%{text}',
    textfont: { color: p.text, size: 10 },
    colorscale: [[0, rgba(p.green, .54)], [0.46, rgba(p.amber, .56)], [1, rgba(p.red, .56)]],
    showscale: false,
    hovertemplate: '%{y}<br>%{x}: %{text}<extra></extra>',
    xgap: 5,
    ygap: 5,
  }], scientificPlotlyLayout({
    margin: { l: 96, r: 14, t: 4, b: 34 },
    xaxis: { title: '', showgrid: false, side: 'bottom' },
    yaxis: { showgrid: false },
    showlegend: false,
  }), scientificPlotlyConfig());
  if (!isCurrent()) return;

  const cdfTraces = boxDefs.map(([name, summary, color], idx) => ({
    type: 'scatter',
    mode: 'lines',
    name,
    x: (summary.cdf || []).map(d => d.year),
    y: (summary.cdf || []).map(d => d.prob),
    line: { width: name === 'Dynamic cascade' ? 2.6 : 1.5, color, shape: 'spline', smoothing: 0.45 },
    opacity: name === 'Dynamic cascade' ? 0.96 : 0.62,
    hovertemplate: `<b>${name}</b><br>Year %{x}<br>Cumulative P: %{y:.1%}<extra></extra>`,
  }));
  const cdfYears = boxDefs.flatMap(([, summary]) => (summary.cdf || []).map(d => d.year).filter(Number.isFinite));
  await Plotly.react(prepareScientificPlotlyPanel('plotlyCdfChart'), cdfTraces, scientificPlotlyLayout({
    margin: { l: 50, r: 18, t: 4, b: 44 },
    xaxis: { range: scientificYearRangeFromValues(cdfYears, 2, 10), title: 'Year', tickformat: 'd' },
    yaxis: { title: 'Cumulative probability', tickformat: '.0%', range: [0, 1], showgrid: true, gridcolor: p.gridSoft },
    legend: { orientation: 'h', x: 0, y: -0.16, font: { color: p.text3, size: 8 } },
    shapes: [vline(p50, rgba(p.text, .40), 'dash')],
  }), scientificPlotlyConfig());
}


async function renderAllExperimentalDiagnostics(data, isCurrent = () => true) {
  if (!isCurrent()) return;
  renderExperimentalSummary(data);
  renderExperimentalAudit(data);
  await Promise.all([
    drawVetoDiagnosticChart(data, isCurrent),
    drawTailShockChart(data, isCurrent),
    drawSMAADiagnosticChart(data, isCurrent),
    drawDistributionDiagnosticsPlotly(_cdfCurves[currentScenario()] || null, isCurrent),
  ]);
  if (isCurrent()) setTimeout(() => { if (isCurrent()) resizeScientificPanelCharts(); }, 80);
}

function resetExperimentalScientificPanel() {
  setExperimentalScientificStatus('Idle  use the Model Diagnostics button');
  const summary = document.getElementById('experimentalSummaryBox');
  if (summary) summary.innerHTML = '<div class="advanced-copy">Run the main simulation first, then use the <strong>Run diagnostics</strong> button above to populate this experimental layer.</div>';
  const audit = document.getElementById('experimentalAuditBox');
  if (audit) audit.innerHTML = '<div class="advanced-copy">No experimental audit yet.</div>';
  ['vetoDiagnosticChart','tailShockChart','smaaDiagnosticChart'].forEach(id => setScientificPlotlyMessage(id, 'Run diagnostics to populate this diagnostic.'));
  ['plotlyHistogramChart','plotlyBoxplotChart','plotlyHeatmapChart','plotlyCdfChart'].forEach(id => setScientificPlotlyMessage(id, 'Run the main simulation and then run additional calculations to populate this distribution view.'));
}

function resizeScientificPanelCharts() {
  if (window.Plotly) {
    SCIENTIFIC_PLOTLY_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.data) {
        try { window.Plotly.Plots.resize(el); } catch (_) {}
      }
    });
  }
}

async function runAdditionalScientificCalculations() {
  if (_running || _advancedDiagnosticsRunning) return;

  const runVersion = _resultVersion;
  const isCurrent = () => runVersion === _resultVersion;
  const scKey = currentScenario();
  const nSim = parseInt(P.nSim, 10) || 3000;
  const baselineResult = _cdfCurves[scKey] || null;

  const btn = document.getElementById('diagBtn');
  if (!baselineResult) {
    setExperimentalScientificStatus('Run the main simulation first. Additional scientific calculations require a completed baseline result.');
    ['oat','sobol','smaa','veto','tailshock','audit'].forEach(id => setCalcStepStatus(id, 'pending'));
    if (btn) btn.textContent = 'Run diagnostics';
    return;
  }

  const params = snapshotParams(scKey, nSim);

  const prog = document.getElementById('mcProgress');
  const badge = document.getElementById('simBadge');
  const sciShell = document.getElementById('scientificPanelShell');
  const sciBody = document.getElementById('scientificPanelBody');
  const sciToggle = document.getElementById('scientificPanelToggle');
  if (sciBody) sciBody.hidden = false;
  if (sciShell) sciShell.classList.add('is-open');
  if (sciToggle) sciToggle.setAttribute('aria-expanded', 'true');

  const exploratoryBody = document.getElementById('exploratorySensBody');
  const exploratoryArrow = document.getElementById('exploratorySensArrow');
  if (exploratoryBody) exploratoryBody.style.display = 'block';
  if (exploratoryArrow) exploratoryArrow.textContent = '▼ Hide';

  const panelBody = document.getElementById('experimentalScientificBody');
  const panelArrow = document.getElementById('experimentalScientificArrow');
  if (panelBody) panelBody.style.display = 'block';
  if (panelArrow) panelArrow.textContent = '▼ Hide';

  _advancedDiagnosticsRunning = true;
  if (btn) { btn.disabled = true; btn.textContent = 'Running diagnostics…'; }
  if (badge) badge.innerHTML = '<span class="live-dot"></span>Additional diagnostics';
  if (prog) prog.style.width = '0%';
  setExperimentalScientificStatus('Running OAT sensitivity…');

  try {
    setCalcStepStatus('oat', 'running', 'Running OAT model-heuristic sensitivity with a larger client-side sample.');
    await yieldForCalcConsole();

    const oat = await runSensitivity(params, 240);
    if (runVersion !== _resultVersion) return;

    _sensData = oat;
    await drawSensChart(isCurrent);
    if (!isCurrent()) return;
    if (!_exploratoryData && oat && oat.length) {
      setDominantDriverKpi(oat[0].name, 'OAT sensitivity driver');
    }
    setCalcStepStatus('oat', 'done', `OAT heuristic sensitivity completed with 240 draws per perturbation. Current lead shift: ${oat && oat.length ? oat[0].name : 'No dominant shift'}.`);
    if (prog) prog.style.width = '20%';

    setExperimentalScientificStatus('Running Sobol/Jansen sensitivity…');
    setCalcStepStatus('sobol', 'running', 'Running Sobol/Jansen Monte Carlo indices with N=256 low-discrepancy draws.');
    await yieldForCalcConsole();

    _exploratoryPromise = runExploratorySensitivityIndices(params, 256);
    const sobol = await _exploratoryPromise;
    if (runVersion !== _resultVersion) return;

    _exploratoryData = sobol;
    await drawExploratorySensitivityChart(isCurrent);
    if (!isCurrent()) return;
    const firstOrderSumText = Number.isFinite(sobol.firstOrderSum) ? sobol.firstOrderSum.toFixed(2) : 'undefined';

    const warn = document.getElementById('exploratorySensWarn');
    if (warn) {
      warn.textContent = sobol.warnings.length
        ? `Exploratory only: ${sobol.warnings.join(' ')}`
        : `Exploratory only: Sobol/Jansen indices completed in responsive mode (N=${sobol.sampleSize}, ΣS1=${firstOrderSumText}).`;
    }

    const text = document.getElementById('exploratorySensText');
    if (text) text.textContent = `This chart shows which threats contribute most to uncertainty in the Apocalypse Clock result when many possible combinations are tested. The first-order bar shows a threat's direct effect. The total-order bar includes both its direct effect and its interaction with other threats. This helps reveal which risks matter not only alone, but also as part of a connected systemic-risk network. Current run: ${sobol.targetLabel}. ${sobol.sampler}.`;

    if (sobol.rows.length) {
      setDominantDriverKpi(sobol.rows[0].name, 'Sobol/Jansen sensitivity driver');
    }

    setCalcStepStatus('sobol', 'done', Number.isFinite(sobol.firstOrderSum)
      ? `Sobol/Jansen Monte Carlo estimate completed with N=${sobol.sampleSize} and ΣS1=${firstOrderSumText}.`
      : `Sobol/Jansen indices undefined: the sampled response has zero variance (N=${sobol.sampleSize}); no sensitivity ranking is available.`);
    if (prog) prog.style.width = '42%';

    setExperimentalScientificStatus('Running SMAA weight robustness…');
    setCalcStepStatus('smaa', 'running', 'Perturbing MCDA weights with 160 draws and measuring top-driver acceptability.');
    await yieldForCalcConsole();
    const smaa = await runSMAARobustnessExperimental(scKey, params, 160);
    if (runVersion !== _resultVersion) return;
    setCalcStepStatus('smaa', 'done', `SMAA Monte Carlo robustness completed with ${smaa.nSamples} weight-space draws; leading acceptability: ${smaa.topRankAcceptability[0] ? smaa.topRankAcceptability[0].name : 'none'}.`);
    if (prog) prog.style.width = '62%';

    setExperimentalScientificStatus('Running veto and tail-dependence stress tests…');
    setCalcStepStatus('veto', 'running', 'Computing non-compensatory domain veto stress distribution.');
    setCalcStepStatus('tailshock', 'running', 'Computing correlated systemic tail-shock stress distribution.');
    await yieldForCalcConsole();
    const stressSamples = Math.min(480, Math.max(240, Math.round(nSim * 0.16)));
    const stress = await runTailAndVetoStressExperimental(scKey, params, stressSamples);
    if (runVersion !== _resultVersion) return;
    setCalcStepStatus('veto', 'done', `Veto diagnostic completed: P50 ${fmtY(stress.vetoSummary.p50)}, P90 ${fmtY(stress.vetoSummary.p90)}.`);
    setCalcStepStatus('tailshock', 'done', `Paired tail-shock diagnostic completed: observed shock rate ${advancedPct(stress.observedShockRate)}, mean horizon-coded cascade contrast ${stress.contrasts.tailCascade.meanDifferenceYears.toFixed(2)} ± ${stress.contrasts.tailCascade.mcStandardErrorYears.toFixed(2)} years (MC SE; no crossing by ${YE} coded as ${YE + 1}); censored baseline/tail ${advancedPct(stress.contrasts.tailCascade.baselineCensorRate)}/${advancedPct(stress.contrasts.tailCascade.interventionCensorRate)}.`);
    if (prog) prog.style.width = '86%';

    setExperimentalScientificStatus('Rendering additional scientific graphs…');
    setCalcStepStatus('audit', 'running', 'Building compact classification-aware audit summary for optional modules.');
    _experimentalScientificData = { scenario: scKey, params: { ...params }, smaa, stress, generatedAt: new Date().toISOString() };
    await renderAllExperimentalDiagnostics(_experimentalScientificData, isCurrent);
    if (!isCurrent()) return;
    setCalcStepStatus('audit', 'done', 'Classification-aware audit and optional diagnostic graphs rendered.');

    if (prog) prog.style.width = '100%';
    if (badge) badge.innerHTML = '<span class="live-dot"></span>Diagnostics ✓';
    setExperimentalScientificStatus('Complete  additional graphs rendered');
    finalizeCalcConsoleSummary();

  } catch (err) {
    console.error('Additional scientific calculations failed', err);
    if (!isCurrent()) return;
    setCalcStepStatus('oat', 'error', 'Additional scientific calculations failed. Main Monte Carlo result remains valid.');
    setCalcStepStatus('sobol', 'error', 'Additional scientific calculations failed. Main Monte Carlo result remains valid.');
    setCalcStepStatus('smaa', 'error', 'Additional scientific calculations failed.');
    setCalcStepStatus('veto', 'error', 'Additional scientific calculations failed.');
    setCalcStepStatus('tailshock', 'error', 'Additional scientific calculations failed.');
    setCalcStepStatus('audit', 'error', 'Additional scientific calculations failed.');
    setExperimentalScientificStatus('Failed  main result remains valid');
    if (badge) badge.innerHTML = '<span class="live-dot"></span>Diagnostics failed';
  } finally {
    _advancedDiagnosticsRunning = false;
    if (btn) { btn.disabled = false; btn.textContent = 'Run diagnostics'; }
  }
}

function defaultBaselineParams() {
  return {
    scenario: 'baseline',
    nSim: 3000,
    threshold: 0.40,
    cascadeThreshold: 0.50,
    depAlpha: 0.22,
    uncMult: 1.0,
    domW: { civilization:1, biosphere:1, technology:1 },
    weights: { ...P.weights },
    weightProfile: P.weightProfile || 'expert',
  };
}

function logSelfTestWarning(ok, message) {
  if (!ok) console.warn(`SELF-TEST WARN: ${message}`);
}

async function runSelfTests() {
  try {
    validateModelConfig();
    if (window.ApocalypseClockDebug) console.log('OK: schema validation passed');

    const baselineCheckParams = { ...defaultBaselineParams(), seed: 'SELF_TEST_SEED' };
    const baselineCheckRows = buildEnriched('baseline', baselineCheckParams);
    const baselineCheckYears = computeAggregateYears(baselineCheckRows, baselineCheckParams);
    const baselineCheckOk = [baselineCheckYears.comp, baselineCheckYears.maxRule, baselineCheckYears.graphWeighted, baselineCheckYears.dynamicCascade].every(y => Number.isFinite(y) && y <= YE);
    if (!baselineCheckOk) throw new Error(`Structural baseline validation failed: ${JSON.stringify(baselineCheckYears)}`);
    if (window.ApocalypseClockDebug) console.log(`OK: structural ensemble baseline validation passed (${fmtY(baselineCheckYears.comp)} / ${fmtY(baselineCheckYears.maxRule)} / ${fmtY(baselineCheckYears.graphWeighted)} / ${fmtY(baselineCheckYears.dynamicCascade)})`);

    const exploratory = _exploratoryData || await runExploratorySensitivityIndices(baselineCheckParams, 96);
    if (!exploratory || !Number.isFinite(exploratory.firstOrderSum)) {
      throw new Error('Exploratory sensitivity validation failed');
    }
    if (window.ApocalypseClockDebug) console.log(`OK: exploratory sensitivity validation passed (finite indices; ΣS1=${exploratory.firstOrderSum.toFixed(3)})`);

    const mc = _cdfCurves.baseline || await runMC('baseline', 240, null, baselineCheckParams);
    const oat = _sensData || await runSensitivity(baselineCheckParams, 120);
    const normW = normalizedDomainWeights(baselineCheckParams.domW);
    const normSum = normW.civilization + normW.biosphere + normW.technology;
    const rescaledDomainParams = { ...baselineCheckParams, domW: { civilization:2, biosphere:2, technology:2 } };
    const rescaledEnriched = buildEnriched('baseline', rescaledDomainParams);
    const domainRescaleInvariant = baselineCheckRows.every(t => {
      const other = rescaledEnriched.find(x => x.id === t.id);
      return other && Math.abs(other.priority - t.priority) < 1e-9;
    });
    const depVals = baselineCheckRows.map(t => depFactor(t, baselineCheckRows, baselineCheckParams));
    const depCap = 1 + baselineCheckParams.depAlpha * (1 + MAX_OUT_DEGREE / Math.max(1, MEAN_OUT_DEGREE));
    const finiteThreatNumbers = baselineCheckRows.every(t => [t.bs, t.priority, t.horizon].every(Number.isFinite));
    const finiteMcStats = !!(mc && mc.cdf && mc.cdf.length && mc.crossing && mc.crossing.length);
    const isExplicitHorizon = y => Number.isFinite(y) && y >= YS;
    const cascadeStatsOk = !!(mc && mc.ensemble && mc.ensemble.dynamicCascade && [mc.ensemble.dynamicCascade.p50, mc.ensemble.dynamicCascade.p90].every(isExplicitHorizon));
    const crossingYearsOk = baselineCheckRows.every(t => isExplicitHorizon(t.horizon));
    const mcCrossingsOk = mc.crossing.every(y => isExplicitHorizon(y));
    const oatOk = Array.isArray(oat) && oat.length === THREATS.length && oat.every(row => [row.upShift, row.dnShift, row.totalImpact].every(Number.isFinite));
    const exploratoryOk = exploratory.rows.every(row => [row.S1, row.ST].every(Number.isFinite));
    const advWeibullOk = baselineCheckRows.every(t => {
      const wp = weibullParamsForThreat(t, mc.threatStats[t.id]);
      const probability = weibullProbability(t, 2035, mc.threatStats[t.id]);
      return wp.censored ? probability === null : Number.isFinite(probability);
    });
    const advCentral = networkEigenvectorCentrality(baselineCheckRows);
    const advJoint = jointFailureByDecade(baselineCheckRows, mc);
    const advEntropy = shannonEntropyRisk(baselineCheckRows);
    const advancedOk = advWeibullOk
      && advCentral.length === baselineCheckRows.length
      && advJoint.rows.length >= 5
      && advJoint.rows.every(row => row.censoredCount
        ? [row.at50Lower, row.at50Upper, row.at70Lower, row.at70Upper, row.at80Lower, row.at80Upper].every(Number.isFinite)
        : [row.at50, row.at70, row.at80].every(Number.isFinite))
      && Number.isFinite(advEntropy.h)
      && Number.isFinite(advEntropy.effectiveN);

    logSelfTestWarning(THREATS.length === 23, `Threat count is ${THREATS.length}, expected 23.`);
    logSelfTestWarning(finiteThreatNumbers && Number.isFinite(calcGSI(baselineCheckRows)), 'NaN detected in deterministic threat outputs.');
    logSelfTestWarning(crossingYearsOk && mcCrossingsOk, 'Some threshold horizons are non-finite instead of finite or explicit no-crossing markers.');
    logSelfTestWarning(Math.abs(normSum - 1) < 1e-9, `Normalized domain weights sum to ${normSum.toFixed(6)}, expected 1.0.`);
    logSelfTestWarning(domainRescaleInvariant, 'Equal domain slider rescaling changed priorities even though normalized shares were unchanged.');
    logSelfTestWarning(depVals.every(v => Number.isFinite(v) && v <= depCap + 1e-6), `Dependency amplification exceeded its capped range (max ${Math.max(...depVals).toFixed(3)} vs cap ${depCap.toFixed(3)}).`);
    logSelfTestWarning(finiteMcStats && mc.cdf.length === YR, 'Monte Carlo output arrays are empty or truncated.');
    logSelfTestWarning(cascadeStatsOk, 'Dynamic cascade P50/P90 outputs are missing or non-finite.');
    logSelfTestWarning(advancedOk, `Advanced cascade diagnostics failed one or more finite-output checks (Weibull=${advWeibullOk}, centrality=${advCentral.length === baselineCheckRows.length}, jointRows=${advJoint.rows.length}, entropy=${Number.isFinite(advEntropy.h) && Number.isFinite(advEntropy.effectiveN)}).`);
    logSelfTestWarning(oatOk && exploratoryOk && Number.isFinite(exploratory.variance), 'Sensitivity outputs are numerically unstable or incomplete.');
  } catch (err) {
    console.error('Apocalypse Clock self-test failed', err);
  }
}

function scheduleInitialRun(task) {
  const mobileLike = window.matchMedia && window.matchMedia('(max-width: 700px)').matches;
  const lowCore = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4;
  if ((mobileLike || lowCore) && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => task(), { timeout: 1500 });
    return;
  }
  requestAnimationFrame(() => setTimeout(task, 0));
}

function renderStaticBaseline() {
  resetCalcConsole('Loading the bundled reference result. A fresh Monte Carlo calculation runs only when requested.', 'Loading reference');
  refreshCurrentView(null);
}

function loadBundledBaselineSnapshot() {
  if (typeof BUNDLED_BASELINE_SNAPSHOT === 'undefined' || !BUNDLED_BASELINE_SNAPSHOT) return null;
  const bundle = BUNDLED_BASELINE_SNAPSHOT;
  const result = bundle.result;
  const execution = result && result.executionSnapshot;
  const cascade = result && result.ensemble && result.ensemble.dynamicCascade;
  const currentDataHash = fnv1aHex(JSON.stringify(ACTIVE_SOURCE_DATA || {}));
  const currentCodeHash = numericalCodeFingerprint().codeHashFNV1a32;
  const wixRuntimeSourceHashMatches = typeof WIX_RUNTIME_SOURCE_HASH_SHA256 !== 'undefined'
    && bundle.runtimeSourceHashSHA256 === WIX_RUNTIME_SOURCE_HASH_SHA256;
  const runtimeModelIdentityMatches = bundle.modelHashFNV1a32 === currentCodeHash
    || wixRuntimeSourceHashMatches;
  const valid = bundle.schema === 'apocalypse-clock-baseline-snapshot-v1'
    && bundle.modelVersion === MODEL_VERSION
    && runtimeModelIdentityMatches
    && bundle.datasetVersion === currentDatasetVersion()
    && bundle.datasetHashFNV1a32 === currentDataHash
    && bundle.scenario === 'baseline'
    && bundle.monteCarloIterations === 3000
    && bundle.seed === DEFAULT_MC_SEED
    && execution && execution.parameters
    && execution.parameters.scenario === 'baseline'
    && execution.parameters.nSim === 3000
    && execution.parameters.seed === DEFAULT_MC_SEED
    && cascade && Array.isArray(cascade.crossing) && cascade.crossing.length === 3000
    && Array.isArray(cascade.cdf) && cascade.cdf.length === YR
    && Number.isFinite(cascade.p50) && Number.isFinite(cascade.p90);
  if (!valid) {
    console.error('Bundled baseline snapshot failed its model/data/configuration integrity checks.');
    return null;
  }
  return JSON.parse(JSON.stringify(result));
}

function renderBundledBaseline() {
  const result = loadBundledBaselineSnapshot();
  if (!result) return false;
  const scKey = 'baseline';
  const enriched = buildEnriched(scKey, result.executionSnapshot.parameters);
  _cdfCurves[scKey] = result;
  updateUI(result, scKey, enriched, result.executionSnapshot);
  const runCount = Number(result.executionSnapshot.parameters.nSim || 0);
  const badge = document.getElementById('simBadge');
  if (badge) badge.innerHTML = `<span class="live-dot"></span>${runCount.toLocaleString()} precomputed ✓`;
  const meta = document.getElementById('hdrMeta');
  if (meta) meta.innerHTML = `Scenario: ${SC[scKey].label}<br>Reference: ${runCount.toLocaleString()} runs<br>${THREATS.length} threats  6 dims`;
  const progress = document.getElementById('mcProgress');
  if (progress) progress.style.width = '100%';
  resetCalcConsole(
    `Reference result loaded instantly from the verified ${runCount.toLocaleString()}-run baseline snapshot. Use “Run new data” after changing a dataset or when a fresh calculation is required.`,
    `Precomputed baseline · ${runCount.toLocaleString()} runs`,
  );
  announceRunStatus(`Precomputed baseline loaded. Dynamic cascade P50 ${fmtY(result.ensemble.dynamicCascade.p50)}, P90 ${fmtY(result.ensemble.dynamicCascade.p90)}.`);
  return true;
}

const AI_PRESETS = {
  claude: {
    label: 'Claude',
    scenario: 'baseline',
    uncMult: 1.0,
    depAlpha: 1.0,
    threshold: 0.50,
    fileName: 'claude.opus4.7.data.json',
    url: './presets/claude.opus4.7.data.json',
    chatUrl: 'https://claude.ai/share/33f155da-4c3b-44b9-b6fc-99a7f9dcfa52',
  },
  gpt: {
    label: 'GPT-5.5',
    scenario: 'baseline',
    uncMult: 1.0,
    depAlpha: 1.0,
    threshold: 0.50,
    fileName: 'gpt5.5.data.json',
    url: './presets/gpt5.5.data.json',
    chatUrl: 'https://chatgpt.com/share/69f666b6-db54-83eb-aff9-dcc35b0b626e',
  },
  gemini: {
    label: 'Gemini',
    scenario: 'baseline',
    uncMult: 1.0,
    depAlpha: 1.0,
    threshold: 0.50,
    fileName: 'Gemini3.1.data.json',
    url: './presets/Gemini3.1.data.json',
    chatUrl: 'https://gemini.google.com/share/ba734236ef06',
  },
  deepseek: {
    label: 'DeepSeek-V4 Preview',
    scenario: 'baseline',
    uncMult: 1.0,
    depAlpha: 1.0,
    threshold: 0.50,
    fileName: 'DeepSeek-V4Preview.data.json',
    url: './presets/DeepSeek-V4Preview.data.json',
    chatUrl: 'https://chat.deepseek.com/share/z0hekl5ix3yszqlb0q',
  },
  allAiAverage: {
    label: 'All-AI Average',
    scenario: 'baseline',
    uncMult: 1.0,
    depAlpha: 1.0,
    threshold: 0.50,
    fileName: 'All-AI-Average.data.json',
    url: './presets/All-AI-Average.data.json',
    chatUrl: 'https://github.com/jerseroman/apocalypse-clock/blob/main/docs/METHODOLOGY.md',
  },
  primarycalibrated: {
    label: 'Primary Functional JSON',
    scenario: 'baseline',
    uncMult: 1.0,
    depAlpha: 1.0,
    threshold: 0.50,
    fileName: PRIMARY_DATASET_NAME,
    isPrimary: true,
    chatUrl: 'https://github.com/jerseroman/apocalypse-clock/blob/main/docs/METHODOLOGY.md',
  },
  meta: {
    label: 'Meta AI',
    scenario: 'baseline',
    uncMult: 1.0,
    depAlpha: 1.0,
    threshold: 0.50,
    fileName: 'MetaAI.data.json',
    url: './presets/MetaAI.data.json',
    chatUrl: 'https://www.meta.ai/share/BJ58mD1g4ib',
  },
  grok: {
    label: 'Grok',
    scenario: 'baseline',
    uncMult: 1.0,
    depAlpha: 1.0,
    threshold: 0.50,
    fileName: 'Grok4.20.data.json',
    url: './presets/Grok4.20.data.json',
    chatUrl: 'https://grok.com/share/c2hhcmQtMi1jb3B5_be361e2b-dbf1-46b2-ac0c-f2ce6c056b62',
  },
};

function parseJsonText(text) {
  let s = String(text || '').replace(/^\uFEFF/, '').trim();
  s = s.replace(/^```[a-zA-Z0-9_-]*\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
  const firstBrace = s.search(/[{[]/);
  if (firstBrace > 0) s = s.slice(firstBrace);
  const lastClose = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
  if (lastClose !== -1 && lastClose < s.length - 1) s = s.slice(0, lastClose + 1);
  return JSON.parse(s);
}

function cacheBustUrl(url) {
  const sep = String(url).includes('?') ? '&' : '?';
  return `${url}${sep}_=${Date.now()}`;
}

function applyPresetJsonPayload(raw, preset) {
  const uploadMode = detectUploadedJsonMode(raw);
  const fileName = preset.fileName || `${preset.label}.json`;
  if (uploadMode === 'evidence') {
    const sanitized = sanitizeEvidenceMap(raw);
    const stats = summarizeSourceMap(sanitized);
    applyEvidenceOverlay(sanitized, {
      fileName,
      datasetVersion: datasetVersionFromSourceMap(raw),
      message: `Loaded ${preset.label} evidence preset from external JSON. ${stats.entryCount} parameters across ${stats.threatCount} threats now update the current source ranges.`,
    });
    return stats;
  }

  const sanitized = sanitizeSourceMap(raw);
  const stats = summarizeSourceMap(sanitized);
  applySourceMap(sanitized, {
    mode: 'custom',
    fileName,
    datasetVersion: datasetVersionFromSourceMap(raw) || `${preset.label} source map`,
    message: `Loaded ${preset.label} preset from external JSON and merged ${stats.entryCount} valid parameter entries across ${stats.threatCount} threats with the bundled defaults.`,
    uploaded: true,
  });
  return stats;
}

async function loadAiPresetJson(ai, btn) {
  const preset = AI_PRESETS[ai];
  if (!preset || !preset.url) return false;

  const msg = document.getElementById('sourceMessage');
  const viewer = document.getElementById('sourceViewer');
  if (msg) msg.textContent = `Loading ${preset.label} preset JSON...`;
  if (btn) {
    btn.disabled = true;
    btn.classList.add('loading');
  }

  try {
    const res = await fetch(cacheBustUrl(preset.url), { cache: 'no-store', mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = parseJsonText(await res.text());
    const stats = applyPresetJsonPayload(raw, preset);
    if (viewer) viewer.open = false;
    if (msg) msg.textContent = `${preset.label} preset loaded from external JSON. ${stats.entryCount} parameter entries across ${stats.threatCount} threats are now active. Running model with new data...`;
    if (typeof runAll === 'function') {
      try {
        await runAll();
      } catch (runErr) {
        if (msg) msg.textContent = `${preset.label} preset loaded, but model rerun failed: ${runErr.message}`;
        console.error(`${preset.label} preset rerun failed`, runErr);
      }
    }
    return true;
  } catch (err) {
    if (msg) msg.textContent = `${preset.label} preset load failed: ${err.message}`;
    console.error(`${preset.label} preset load failed`, err);
    return false;
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('loading');
    }
  }
}

function renderAiPresetInfo(preset) {
  const wrap = document.getElementById('aiPresetInfo');
  if (!wrap || !preset) return;
  const title = document.getElementById('aiInfoTitle');
  const chatRow = document.getElementById('aiInfoChatRow');
  const jsonRow = document.getElementById('aiInfoJsonRow');
  const chatLink = document.getElementById('aiInfoChatLink');
  const jsonLink = document.getElementById('aiInfoJsonLink');
  const unavailable = document.getElementById('aiInfoUnavailable');
  if (title) title.textContent = `${preset.label}  sources`;
  const hasChat = Boolean(preset.chatUrl);
  const hasJson = Boolean(preset.url);
  if (chatRow) chatRow.style.display = hasChat ? '' : 'none';
  if (jsonRow) jsonRow.style.display = hasJson ? '' : 'none';
  if (chatLink) {
    chatLink.href = hasChat ? preset.chatUrl : '#';
    chatLink.textContent = hasChat ? preset.chatUrl : '';
  }
  if (jsonLink) {
    jsonLink.href = hasJson ? preset.url : '#';
    jsonLink.textContent = hasJson ? preset.url : '';
  }
  if (unavailable) unavailable.style.display = (hasChat || hasJson) ? 'none' : '';
  wrap.classList.add('is-visible');
}

function initAiInfoCopyButtons() {
  const wrap = document.getElementById('aiPresetInfo');
  if (!wrap) return;
  wrap.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('.ai-info-copy');
    if (!btn) return;
    const targetId = btn.dataset.copyTarget;
    const target = targetId ? document.getElementById(targetId) : null;
    const text = target ? (target.href || target.textContent || '') : '';
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      const original = btn.textContent;
      btn.textContent = 'Copied';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('copied');
      }, 1400);
    } catch (err) {
      console.error('Copy failed', err);
    }
  });
}

function initAiPresetSelector() {
  const btns = document.querySelectorAll('.ai-preset-btn');
  initAiInfoCopyButtons();
  btns.forEach(btn => {
    btn.addEventListener('click', async () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const ai = btn.dataset.ai;
      const preset = AI_PRESETS[ai];
      if (!preset) return;
      renderAiPresetInfo(preset);
      if (preset.isPrimary) {
        const msg = document.getElementById('sourceMessage');
        const viewer = document.getElementById('sourceViewer');
        const stats = summarizeSourceMap(BUNDLED_SOURCE_DATA);
        applySourceMap(BUNDLED_SOURCE_DATA, {
          mode: 'bundled',
          fileName: PRIMARY_DATASET_NAME,
          message: `Primary Functional JSON restored from the embedded data_v1_9_0.json source map. Active parameters now match the bundled primary dataset.`,
          uploaded: false,
          clearEvidence: true,
        });
        if (viewer) viewer.open = false;
        if (msg) msg.textContent = `Primary Functional JSON is active. ${stats.entryCount} parameter entries across ${stats.threatCount} threats are now loaded. Running model with primary data...`;
        if (typeof runAll === 'function') {
          try {
            await runAll();
          } catch (runErr) {
            if (msg) msg.textContent = `Primary Functional JSON restored, but model rerun failed: ${runErr.message}`;
            console.error('Primary Functional JSON rerun failed', runErr);
          }
        }
        return;
      }
      if (preset.url) {
        await loadAiPresetJson(ai, btn);
        return;
      }
    });
  });
}

function initScientificPanelToggle() {
  const shell = document.getElementById('scientificPanelShell');
  const btn   = document.getElementById('scientificPanelToggle');
  const body  = document.getElementById('scientificPanelBody');
  if (!shell || !btn || !body) return;
  btn.addEventListener('click', () => {
    const nextOpen = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(nextOpen));
    body.hidden = !nextOpen;
    shell.classList.toggle('is-open', nextOpen);
    const main = btn.querySelector('.scientific-toggle-main');
    if (main) main.textContent = nextOpen ? 'Hide Model Diagnostics' : 'Open Model Diagnostics';
  });
}

/** Wires the controls that app.js owns; action-delegation.js wires the data-action buttons. */
function initEventHandlers() {
  const calcToggle = document.getElementById('calcConsoleToggle');
  if (calcToggle) calcToggle.addEventListener('click', () => {
    _calcConsoleExpanded = !_calcConsoleExpanded;
    renderCalcConsole();
  });

  const viewSources = document.getElementById('viewSourcesBtn');
  if (viewSources) viewSources.addEventListener('click', () => {
    const viewer = document.getElementById('sourceViewer');
    if (!viewer) return;
    viewer.open = true;
    viewer.scrollIntoView({ behavior:'smooth', block:'nearest' });
  });

  const resetSources = document.getElementById('resetSourcesBtn');
  if (resetSources) resetSources.addEventListener('click', () => {
    const fileInput = document.getElementById('sourceFileInput');
    if (fileInput) fileInput.value = '';
    applySourceMap(BUNDLED_SOURCE_DATA, {
      mode: 'bundled',
      fileName: 'data_v1_9_0.json',
      message: 'Bundled data_v1_9_0.json parameter map restored. Active parameters now match the embedded data_v1_9_0.json file.',
      uploaded: false,
      clearEvidence: true,
    });
  });

  const sourceFileInput = document.getElementById('sourceFileInput');
  if (sourceFileInput) sourceFileInput.addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const raw = parseJsonText(await file.text());
      const uploadMode = detectUploadedJsonMode(raw);
      if (uploadMode === 'evidence') {
        const sanitized = sanitizeEvidenceMap(raw);
        const stats = summarizeSourceMap(sanitized);
        applyEvidenceOverlay(sanitized, {
          fileName: file.name,
          datasetVersion: datasetVersionFromSourceMap(raw),
          message: `Loaded evidence overlay ${file.name}. ${stats.entryCount} parameters across ${stats.threatCount} threats now update the current source ranges through precision-weighted pooling.`,
        });
      } else {
        const sanitized = sanitizeSourceMap(raw);
        const stats = summarizeSourceMap(sanitized);
        applySourceMap(sanitized, {
          mode: 'custom',
          fileName: file.name,
          datasetVersion: datasetVersionFromSourceMap(raw) || 'custom source map',
          message: `Loaded ${file.name} and merged ${stats.entryCount} valid parameter entries across ${stats.threatCount} threats with the bundled defaults.`,
          uploaded: true,
        });
      }
      const viewer = document.getElementById('sourceViewer');
      if (viewer) viewer.open = true;
    } catch (err) {
      const msg = document.getElementById('sourceMessage');
      if (msg) msg.textContent = `Upload failed: ${err.message}`;
    }
  });

  const diagBtn = document.getElementById('diagBtn');
  if (diagBtn) diagBtn.addEventListener('click', runAdditionalScientificCalculations);

  // Chart layouts depend on the width only; mobile browsers also fire resize when the address bar moves.
  let resizeTimer = null;
  let lastWidth = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(redrawAfterResize, 150);
  });

  // Wix loads optional rendering libraries in the background so the verified
  // baseline, navigation and text remain usable on slow mobile connections.
  // Re-render only the surfaces that benefit when a dependency becomes ready.
  window.addEventListener('apocalypse-clock:optional-library-ready', event => {
    const dependency = event && event.detail ? event.detail.dependency : '';
    const scKey = currentScenario();
    const enriched = buildEnriched(scKey);
    const res = _cdfCurves[scKey] || null;
    if (dependency === 'echarts') {
      drawBarChart(enriched, res);
      if (res) renderConditionalScenario(res);
      resizeVizSurfaces();
    }
    if (dependency === 'katex' && res) {
      try { renderAdvancedMethod(enriched, res); } catch (error) { console.error('renderAdvancedMethod error:', error); }
    }
  });
}

function redrawAfterResize() {
  const scKey = currentScenario();
  const enriched = buildEnriched(scKey);
  const res = _cdfCurves[scKey] || null;
  drawBarChart(enriched, res);
  drawSensChart();
  drawExploratorySensitivityChart();
  initNetwork(enriched);
  resizeVizSurfaces();
}

async function initApp() {
  applySourceMap(BUNDLED_SOURCE_DATA, {
    mode: 'bundled',
    fileName: 'data_v1_9_0.json',
    message: 'Bundled data_v1_9_0.json parameter map embedded in widget and used as the default primary parameter source.',
    uploaded: false,
  }, false);
  renderSourceRegistry();
  initEventHandlers();
  bindPriorityModeToggle();
  initAiPresetSelector();
  initScientificPanelToggle();
  initFloatTip();
  // Render the page once. The verified snapshot fills every element the empty
  // placeholder render would, so drawing the placeholder first only doubled the
  // start-up work on phones; it remains the fallback when the snapshot fails.
  if (renderBundledBaseline()) {
    initNetwork(buildEnriched(currentScenario()));
  } else {
    renderStaticBaseline();
    const badge = document.getElementById('simBadge');
    if (badge) badge.innerHTML = '<span class="live-dot"></span>Run required';
    resetCalcConsole('The bundled reference result failed validation. Use “Run new data” to calculate a fresh result.', 'Run required');
  }
}

function setSafeTooltipHTML(target, rawHtml) {
  if (!target) return;
  const template = document.createElement('template');
  template.innerHTML = String(rawHtml || '');
  const allowed = new Set(['STRONG', 'B', 'EM', 'I', 'BR']);
  const fragment = document.createDocumentFragment();

  function cleanNode(node, parent) {
    if (node.nodeType === Node.TEXT_NODE) {
      parent.appendChild(document.createTextNode(node.textContent || ''));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return;
    const tag = allowed.has(node.tagName) ? node.tagName.toLowerCase() : null;
    const nextParent = tag ? document.createElement(tag) : parent;
    Array.from(node.childNodes).forEach(child => cleanNode(child, nextParent));
    if (tag) parent.appendChild(nextParent);
  }

  Array.from(template.content.childNodes).forEach(node => cleanNode(node, fragment));
  target.replaceChildren(fragment);
}

function initFloatTip() {
  const tip = document.getElementById('floatTip');
  if (!tip || tip.dataset.bound === '1') return;
  tip.dataset.bound = '1';
  let activeTarget = null;
  let pinnedByTap = false;

  const findTipTarget = target => target instanceof Element ? target.closest('[data-tip]') : null;
  const hideTip = () => {
    activeTarget = null;
    pinnedByTap = false;
    tip.classList.remove('visible');
  };
  const eventPointFor = (el, e) => {
    if (e && typeof e.clientX === 'number' && typeof e.clientY === 'number') return e;
    const r = el.getBoundingClientRect();
    return { clientX: r.left + Math.min(r.width * .62, 180), clientY: r.top + Math.min(r.height * .45, 48) };
  };
  const positionTip = e => {
    const pad = 12;
    const w = tip.offsetWidth || 240;
    const h = tip.offsetHeight || 80;
    let left = e.clientX + 14;
    let top = e.clientY - 8;
    if (left + w + pad > window.innerWidth) left = e.clientX - w - 14;
    if (top + h + pad > window.innerHeight) top = window.innerHeight - h - pad;
    tip.style.left = Math.max(pad, left) + 'px';
    tip.style.top = Math.max(pad, top) + 'px';
  };
  const showTip = (el, e, pin) => {
    if (!el) return;
    activeTarget = el;
    pinnedByTap = !!pin;
    setSafeTooltipHTML(tip, el.dataset.tip);
    tip.classList.add('visible');
    positionTip(eventPointFor(el, e));
  };

  document.addEventListener('mouseover', e => {
    if (pinnedByTap) return;
    const el = findTipTarget(e.target);
    if (!el || el === activeTarget) return;
    showTip(el, e, false);
  });
  document.addEventListener('mousemove', e => {
    if (pinnedByTap) return;
    const el = findTipTarget(e.target);
    if (!el) return;
    if (el !== activeTarget) showTip(el, e, false);
    else positionTip(e);
  });
  document.addEventListener('mouseout', e => {
    if (pinnedByTap) return;
    const el = findTipTarget(e.target);
    if (!el) return;
    const related = e.relatedTarget;
    if (related && el.contains(related)) return;
    if (el === activeTarget) hideTip();
  });
  document.addEventListener('click', e => {
    const el = findTipTarget(e.target);
    if (!el) { hideTip(); return; }
    showTip(el, e, true);
  });
  document.addEventListener('focusin', e => {
    const el = findTipTarget(e.target);
    if (el) showTip(el, null, true);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') hideTip();
  });
  window.addEventListener('scroll', hideTip, { passive:true });
  window.addEventListener('resize', hideTip);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp, { once:true });
} else {
  initApp();
}
