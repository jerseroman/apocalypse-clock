/* Integration verification against the existing browser engine; no app edits. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');

const root = path.resolve(__dirname, '..');
const datasetFile = path.join(root, 'data_v1_8_0_evidence_revision.json');
const data = JSON.parse(fs.readFileSync(datasetFile, 'utf8'));
const protectedPaths = ['src/app.js', 'index.html', '404.html', 'data_v1_7_1metadata_revision.json'];
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const before = Object.fromEntries(protectedPaths.map(file => [file, hash(path.join(root, file))]));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let relative;
  try { relative = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname); }
  catch { res.writeHead(400).end(); return; }
  const file = path.resolve(root, '.' + (relative === '/' ? '/index.html' : relative));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, bytes) => {
    if (error) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
    res.end(bytes);
  });
});

async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  const report = { dataset: path.basename(datasetFile), dataset_sha256: hash(datasetFile), scope: 'Engineering import, computation and reproducibility checks only; no predictive validation', original_file_hashes: before };
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof runMC === 'function' && THREATS.length === 23);
    const baseline = await page.evaluate(async () => {
      applyWeightProfile('expert', false);
      const params = snapshotParams('baseline', 3000);
      const result = await runMC('baseline', 3000, null, params);
      return { version: currentDatasetVersion(), seed: params.seed, engine_time_origin: NOW,
        dynamicCascade: result.ensemble.dynamicCascade, params };
    });
    console.log('Bundled baseline computation completed.');
    await page.locator('#sourceFileInput').setInputFiles(datasetFile);
    await page.waitForFunction(() => currentDatasetVersion() === '1.8.0');
    const imported = await page.evaluate(expected => {
      const mismatch = [], conversionMismatch = [];
      for (const threat of THREATS) {
        for (const metric of PARAM_FIELDS) {
          for (const field of ['lo', 'mu', 'hi']) {
            if (threat[metric][field] !== expected[`${threat.id}.${metric}`][field]) mismatch.push(`${threat.id}.${metric}.${field}`);
          }
        }
        const growth = threat.growth_rate;
        if (growth.effective_growth_calibrated !== true || growth.threat_specific_cap !== expected[`${threat.id}.growth_rate`].threat_specific_cap) conversionMismatch.push(threat.id);
        for (const field of ['lo', 'mu', 'hi']) {
          if (Math.abs(effectiveRiskGrowthForThreat(threat, growth[field]) - growth[field]) > 1e-12) conversionMismatch.push(`${threat.id}.${field}`);
        }
      }
      return { version: currentDatasetVersion(), entries: Object.keys(sanitizeSourceMap(expected)).length,
        threat_count: THREATS.length, mismatch, conversionMismatch,
        file: document.getElementById('sourceFileName').textContent,
        message: document.getElementById('sourceMessage').textContent };
    }, data);
    assert.equal(imported.entries, 184);
    assert.equal(imported.threat_count, 23);
    assert.deepEqual(imported.mismatch, []);
    assert.deepEqual(imported.conversionMismatch, []);
    report.import = imported;
    console.log('All 552 values and 23 safe-growth contracts survive the actual upload handler.');
    const runs = await page.evaluate(async () => {
      const check = summary => {
        if (![summary.p10, summary.p50, summary.p90, summary.censorFraction].every(Number.isFinite)) throw new Error('Nonfinite summary');
        if (!(summary.p10 <= summary.p50 && summary.p50 <= summary.p90)) throw new Error('Unordered quantiles');
        if (!(0 <= summary.censorFraction && summary.censorFraction <= 1)) throw new Error('Invalid censoring');
        if (fmtY(summary.p90) === '2101') throw new Error('Sentinel leaked');
        for (const year of [2030, 2050, 2100]) {
          const p = probabilityByDisplayedYear(summary, year);
          if (!(Number.isFinite(p) && p >= 0 && p <= 1)) throw new Error('Invalid displayed-year probability');
        }
      };
      const compact = result => {
        for (const summary of Object.values(result.ensemble)) check(summary);
        for (const summary of Object.values(result.domainStats)) check(summary);
        return { ensemble: Object.fromEntries(Object.entries(result.ensemble).map(([key, value]) => [key, {
          p10: value.p10, p50: value.p50, p90: value.p90, display_p90: fmtY(value.p90), censorFraction: value.censorFraction
        }])), threatStats: result.threatStats, domainStats: Object.fromEntries(Object.entries(result.domainStats).map(([key, value]) => [key, {
          p10: value.p10, p50: value.p50, p90: value.p90, censorFraction: value.censorFraction
        }])) };
      };
      const params = snapshotParams('baseline', 3000);
      const first = await runMC('baseline', 3000, null, params);
      const repeat = await runMC('baseline', 3000, null, params);
      if (JSON.stringify(first) !== JSON.stringify(repeat)) throw new Error('Seeded result not reproducible');
      const alternatives = [];
      for (const seed of ['AC-v1.8.0-check-A', 'AC-v1.8.0-check-B']) {
        alternatives.push({ seed, nSim: 1000, summary: compact(await runMC('baseline', 1000, null, { ...params, seed })) });
      }
      return { params, baseline: compact(first), identical_repeat: true, alternatives,
        note: 'Alternative seeds are a bounded numerical stability check, not a convergence proof or uncertainty calibration.' };
    });
    report.bundled_baseline = { version: baseline.version, seed: baseline.seed, engine_time_origin: baseline.engine_time_origin, nSim: 3000,
      p10: baseline.dynamicCascade.p10, p50: baseline.dynamicCascade.p50, p90: baseline.dynamicCascade.p90, censorFraction: baseline.dynamicCascade.censorFraction };
    report.new_dataset_runs = runs;
    report.page_errors = errors;
    assert.deepEqual(errors, []);
    const after = Object.fromEntries(protectedPaths.map(file => [file, hash(path.join(root, file))]));
    assert.deepEqual(after, before);
    report.original_files_unchanged = true;
    report.status = 'PASS';
    fs.writeFileSync(path.join(__dirname, 'runtime_validation.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ status: report.status, imported: imported.entries, original_files_unchanged: true,
      bundled: report.bundled_baseline, revised: runs.baseline.ensemble.dynamicCascade,
      alternative_seeds: runs.alternatives.map(x => ({ seed: x.seed, ...x.summary.ensemble.dynamicCascade })) }, null, 2));
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
