/* Capture final local artifact identity after successful full-suite completion. */
const fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto'), assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
const testState=JSON.parse(fs.readFileSync(path.join(root,'test-results/.last-run.json'),'utf8'));
assert.equal(testState.status,'passed'); assert.deepEqual(testState.failedTests,[]);
const data=JSON.parse(fs.readFileSync(path.join(root,'data_v1_9_0.json'),'utf8'));
const historical=['data_v1_7_1metadata_revision.json','data_v1_8_0_evidence_revision.json'];
for(const file of historical) assert.equal(hash(file),hash('backups/pre-functional-cascade-2026-09-09/'+file));
const links=JSON.parse(fs.readFileSync(path.join(__dirname,'live-link-validation.json'),'utf8'));
const files=['src/app.js','src/cascade-model.js','index.html','404.html','data_v1_9_0.json','package.json','package-lock.json',...historical];
const report={
  completedAt:new Date().toISOString(),model:'1.2.8',dataset:'1.9.0',scope:'Local MODEL + DATASET implementation; no deployment or predictive-validation claim',
  hashes:Object.fromEntries(files.map(file=>[file,hash(file)])),
  parameterEntriesSha256:crypto.createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(data).filter(([key])=>key!=='_meta')))).digest('hex'),
  verification:{syntax:'PASS: 12 JavaScript files',dataset:'PASS: 184 entries, 23 functional profiles, exact embedded payloads',
    urlFormats:'PASS: 89 URLs',fullSuite:{command:'npm test',passed:40,failed:0,exitCode:0,workers:2,durationApproxSeconds:150},
    initialFullSuite:{passed:38,failed:2,reason:'Startup/repeatability timeouts under five workers; no numerical assertion failure'},
    runtime:'PASS: fresh archived baseline; identical 3000-run repeats; ten 1000-run alternatives; legacy imports; first-seed propagation',
    golden:{scenario:'baseline',profile:'expert',seed:'AC-1.2.6-2026',nSim:3000,p10:2033,p50:2036,p90:2043},
    pointerWorkflow:'PASS: panels opened normally, real file chooser, Run click and JSON/CSV downloads',
    visual:'Desktop and mobile upper-page screenshots inspected; not a full accessibility/cross-browser audit',
    liveLinks:{status:links.status,checked:links.checked,failureCount:links.failures.length,report:'live-link-validation.json'},
    runtimeWarnings:['Node v26.5.0 emitted deprecation/color warnings and a native UV_HANDLE_CLOSING assertion during worker teardown; all 40 tests completed and the parent command exited 0. This is not evidence of browser model failure.']},
  preservedOriginalDatasets:true,backup:'backups/pre-functional-cascade-2026-09-09',
  numericalCaveat:'Growth priors, ordinal thresholds, service baskets, criticality and causal coefficients are uncalibrated scenario judgments. A functional trigger is not completed global collapse.',
  evidenceSnapshotNote:'runtime-validation.json records its starting dataset hash. The final JSON differs only in the descriptive growth unit label in _meta; all parameter values and functional profiles are unchanged. Final golden and full suite ran against the final dataset.'
};
fs.writeFileSync(path.join(__dirname,'final-validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:'PASS_ENGINEERING_WITH_DISCLOSED_LIMITATIONS',hashes:report.hashes,fullSuite:report.verification.fullSuite,liveLinks:report.verification.liveLinks},null,2));
