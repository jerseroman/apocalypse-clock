const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('@playwright/test');

const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(ROOT, 'src', 'baseline-snapshot.js');
const runtimeSourceHashSHA256 = crypto.createHash('sha256')
  .update(fs.readFileSync(path.join(ROOT, 'src', 'app.js'), 'utf8'))
  .update('\0')
  .update(fs.readFileSync(path.join(ROOT, 'src', 'cascade-model.js'), 'utf8'))
  .digest('hex');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://127.0.0.1:4179/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => _cdfCurves?.baseline?.ensemble?.dynamicCascade, undefined, { timeout: 10000 });
  await page.evaluate(async () => { await runAll(); });
  await page.waitForFunction(() => (
    document.getElementById('cascadeMedianYear')?.textContent.trim() === '2038'
      && document.getElementById('cascadeHeadlineYear')?.textContent.trim() === '2046'
      && _cdfCurves?.baseline?.executionSnapshot?.parameters?.nSim === 3000
      && _cdfCurves.baseline.triggerTrace?.consistent === true
  ), undefined, { timeout: 180000 });

  const snapshot = await page.evaluate((runtimeSourceHash) => {
    const source = JSON.parse(JSON.stringify(_cdfCurves.baseline));
    const execution = source.executionSnapshot || {};
    source.executionSnapshot = {
      executedAt: execution.executedAt,
      codeIdentifier: execution.codeIdentifier,
      codeHashFNV1a32: execution.codeHashFNV1a32,
      codeHashAlgorithm: execution.codeHashAlgorithm,
      codeHashScope: execution.codeHashScope,
      dataIdentifier: execution.dataIdentifier,
      dataHashFNV1a32: execution.dataHashFNV1a32,
      primaryDataset: execution.primaryDataset,
      activeDataset: execution.activeDataset,
      seed: execution.seed,
      rngVersion: execution.rngVersion,
      parameters: execution.parameters,
      timeBaseline: execution.timeBaseline,
      quantileRules: execution.quantileRules,
      censoringRules: execution.censoringRules,
      uncertaintyLabels: execution.uncertaintyLabels,
    };
    delete source.triggerReplayInputs;
    delete source.triggerTracePending;
    return {
      schema: 'apocalypse-clock-baseline-snapshot-v1',
      generatedAt: execution.executedAt,
      modelVersion: execution.codeIdentifier,
      modelHashFNV1a32: execution.codeHashFNV1a32,
      runtimeSourceHashSHA256: runtimeSourceHash,
      datasetVersion: execution.dataIdentifier,
      datasetHashFNV1a32: execution.dataHashFNV1a32,
      scenario: execution.parameters?.scenario,
      monteCarloIterations: execution.parameters?.nSim,
      seed: execution.seed,
      rngVersion: execution.rngVersion,
      result: source,
    };
  }, runtimeSourceHashSHA256);

  if (snapshot.modelVersion !== 'Apocalypse Clock v1.5.0'
      || snapshot.datasetVersion !== '1.9.0'
      || snapshot.scenario !== 'baseline'
      || snapshot.monteCarloIterations !== 3000
      || snapshot.seed !== 'AC-1.2.6-2026'
      || snapshot.result?.ensemble?.dynamicCascade?.p50 !== 2038
      || snapshot.result?.ensemble?.dynamicCascade?.p90 !== 2046) {
    throw new Error(`Refusing to write an unexpected baseline snapshot: ${JSON.stringify({
      modelVersion: snapshot.modelVersion,
      datasetVersion: snapshot.datasetVersion,
      scenario: snapshot.scenario,
      monteCarloIterations: snapshot.monteCarloIterations,
      seed: snapshot.seed,
      p50: snapshot.result?.ensemble?.dynamicCascade?.p50,
      p90: snapshot.result?.ensemble?.dynamicCascade?.p90,
    })}`);
  }

  const content = [
    '/* Generated from the deterministic 3,000-run reference configuration. */',
    '/* Do not hand-edit; regenerate with .codex-wix-build/generate-baseline-snapshot.cjs. */',
    `const BUNDLED_BASELINE_SNAPSHOT = ${JSON.stringify(snapshot)};`,
    '',
  ].join('\n');
  fs.writeFileSync(TARGET, content, 'utf8');
  console.log(JSON.stringify({
    target: TARGET,
    bytes: Buffer.byteLength(content),
    generatedAt: snapshot.generatedAt,
    codeHashFNV1a32: snapshot.modelHashFNV1a32,
    runtimeSourceHashSHA256: snapshot.runtimeSourceHashSHA256,
    dataHashFNV1a32: snapshot.datasetHashFNV1a32,
    p50: snapshot.result.ensemble.dynamicCascade.p50,
    p90: snapshot.result.ensemble.dynamicCascade.p90,
  }, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
