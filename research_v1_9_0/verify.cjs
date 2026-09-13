/* Paired scenario checks and a fresh archived-baseline comparison. Not calibration. */
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const backup = path.join(root, 'backups/pre-functional-cascade-2026-09-09');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
  const archived = url.startsWith('/baseline/');
  const base = archived ? backup : root;
  const rel = archived ? url.slice('/baseline'.length) : url;
  let file = path.resolve(base, '.' + rel);
  if (!file.startsWith(base + path.sep)) return res.writeHead(403).end();
  if (archived && rel.startsWith('/vendor/')) file = path.resolve(root, '.' + rel);
  fs.readFile(file, (error, bytes) => {
    if (error) return res.writeHead(404).end();
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(bytes);
  });
});
async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch();
  const report = { scope:'Engineering correctness and sensitivity, not predictive validity', seed:'AC-1.2.6-2026', dataset_sha256:hash(path.join(root,'data_v1_9_0_functional.json')) };
  try {
    const page = await browser.newPage({ viewport:{width:1280,height:900} });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const load = async prefix => {
      await page.goto(origin + prefix + '/index.html', { waitUntil:'domcontentloaded' });
      await page.waitForFunction(() => typeof _running !== 'undefined' && !_running && window._lastInterpretData?.executionSnapshot, undefined, {timeout:120000});
    };
    await load('/baseline');
    report.archivedBaseline = await page.evaluate(async () => {
      applyWeightProfile('expert', false);
      const result = await runMC('baseline',3000,null,snapshotParams('baseline',3000));
      const s=result.ensemble.dynamicCascade;
      return {model:MODEL_VERSION,dataset:currentDatasetVersion(),p10:s.p10,p50:s.p50,p90:s.p90,censorFraction:s.censorFraction};
    });
    assert.deepEqual([report.archivedBaseline.p10,report.archivedBaseline.p50,report.archivedBaseline.p90],[2037,2041,2046]);
    console.log('Archived 1.2.7/1.7.1 baseline reproduced.');
    await load('');
    report.current = await page.evaluate(async () => {
      applyWeightProfile('expert', false);
      const params = snapshotParams('baseline',3000);
      const compact = result => {
        const s=result.ensemble.dynamicCascade;
        return {p10:s.p10,p50:s.p50,p90:s.p90,displayP90:fmtY(s.p90),censorFraction:s.censorFraction,
          p2050:probabilityByDisplayedYear(s,2050)};
      };
      const first=await runMC('baseline',3000,null,params), repeat=await runMC('baseline',3000,null,params);
      if(JSON.stringify(first)!==JSON.stringify(repeat)) throw new Error('Same-seed mismatch');
      const variants = [];
      for(const [label,options] of [
        ['reference',{}],['propagation_off',{dependencyScale:0}],['lag_zero',{propagationLagYears:0}],
        ['lag_five',{propagationLagYears:5}],['global_only',{functionalServiceRule:'global_only'}],
        ['equal_criticality',{functionalWeightRule:'equal'}],['lower_trigger',{cascadeThreshold:0.35}],
        ['higher_trigger',{cascadeThreshold:0.65}],['seed_A',{seed:'functional-check-A'}],['seed_B',{seed:'functional-check-B'}]
      ]) {
        const result=await runMC('baseline',1000,null,{...params,...options});
        variants.push({label,nSim:1000,options,summary:compact(result)});
      }
      const lookup=Object.fromEntries(variants.map(v=>[v.label,v.summary]));
      for(const q of ['p10','p50','p90']) {
        if(lookup.lag_zero[q]>lookup.reference[q] || lookup.reference[q]>lookup.lag_five[q]) throw new Error('Lag monotonicity');
        if(lookup.reference[q]>lookup.propagation_off[q] || lookup.reference[q]>lookup.global_only[q]) throw new Error('Cascade monotonicity');
        if(lookup.lower_trigger[q]>lookup.reference[q] || lookup.reference[q]>lookup.higher_trigger[q]) throw new Error('Threshold monotonicity');
      }
      const enriched=buildEnriched('baseline',params);
      const forced=enriched.map(t=>({...t,horizon:t.id==='oceans'?2030:YE+1}));
      const singleMarineSeed=simulateFunctionalCascade(forced,params,{collectAll:true,collectTrace:true});
      // A controlled stress fixture: these synthetic event times are NOT forecasts.
      if(singleMarineSeed.activationCauses.oceans!=='spontaneous') throw new Error('Marine seed missing');
      if(!singleMarineSeed.trace.some(e=>e.cause==='induced' && e.sources.includes('oceans'))) throw new Error('Marine pathway absent');
      return {model:MODEL_VERSION,dataset:currentDatasetVersion(),params,nSim:3000,summary:compact(first),identicalRepeat:true,
        standalone:first.threatStats,propagated:first.functionalStats,variants,singleMarineSeed,
        stressFixtureWarning:'Only oceans forced to 2030; other spontaneous times set after endpoint. This illustrates conditional pathways, not predicted dates.'};
    });
    console.log('New baseline, identical repeat and ten sensitivity runs completed.');
    // Fresh same-code comparisons isolate data replacement from the code revision.
    report.sameCodeLegacyData=[];
    for(const name of ['data_v1_7_1metadata_revision.json','data_v1_8_0_evidence_revision.json']) {
      await page.locator('#sourceFileInput').setInputFiles(path.join(root,name));
      await page.waitForFunction(name=>ACTIVE_SOURCE_META.fileName===name,name);
      report.sameCodeLegacyData.push(await page.evaluate(async name=>{
        const result=await runMC('baseline',1000,null,snapshotParams('baseline',1000));
        const s=result.ensemble.dynamicCascade;
        return {file:name,nSim:1000,model:MODEL_VERSION,dataset:currentDatasetVersion(),p10:s.p10,p50:s.p50,p90:s.p90,censorFraction:s.censorFraction};
      },name));
    }
    await load('');
    report.visibleHeadline=await page.locator('#cascadeHeadlineYear').textContent();
    await page.screenshot({path:path.join(__dirname,'dashboard-desktop.png')});
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:path.join(__dirname,'dashboard-mobile.png')});
    assert.deepEqual(errors,[]); report.pageErrors=errors;
    for(const name of ['data_v1_7_1metadata_revision.json','data_v1_8_0_evidence_revision.json']) assert.equal(hash(path.join(root,name)),hash(path.join(backup,name)));
    report.originalDatasetsUnchanged=true; report.status='PASS';
    fs.writeFileSync(path.join(__dirname,'runtime-validation.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({status:report.status,baseline:report.archivedBaseline,revised:report.current.summary,variants:report.current.variants,sameCodeLegacyData:report.sameCodeLegacyData},null,2));
  } finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
}
main().catch(error=>{console.error(error);server.close();process.exitCode=1;});
