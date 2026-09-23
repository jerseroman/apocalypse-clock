'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const timing = require('../src/timing-evidence.js');
const evidence = (changes = {}) => ({ id: 'amoc-ci', kind: 'threshold_crossing', event_definition: 'Critical transition parameter in the source model', time: { start_year: 2037, end_year: 2109, interval_kind: 'confidence_interval', confidence_level: 0.95 }, source: { title: 'Example source', url: 'https://example.org/study', version_note: 'Corrected article' }, verification_status: 'primary_checked', ...changes });

test('normalization retains confidence interval semantics without inventing P90', () => {
  const result = timing.normalizeEvidence([evidence()])[0];
  assert.equal(result.time.end_year, 2109);
  assert.equal(result.time.interval_kind, 'confidence_interval');
  assert.equal(result.reported_time_quantiles.p90_year, null);
  assert.equal(result.source.version_note, 'Corrected article');
  const display = timing.describeEvidence(result);
  assert.equal(display.label, 'Reported 95% confidence interval');
  assert.equal(display.text, '2037–2109');
  assert.doesNotMatch(display.text, /P90/);
});

test('1950, 2150 and 2300 are retained rather than clamped to the model window', () => {
  for (const year of [1950, 2150, 2300]) {
    const result = timing.normalizeEvidence([evidence({ time: { year } })])[0];
    assert.equal(result.time.year, year);
    assert.equal(timing.describeEvidence(result).endYear, year);
  }
});

test('null and absent fields remain unknown, without numeric coercion', () => {
  assert.deepEqual(timing.normalizeEvidence(null), []);
  assert.equal(timing.normalizeTimingModel(undefined), null);
  const record = timing.normalizeEvidence([evidence({ time: { year: null }, source: null })])[0];
  assert.equal(record.time.year, null);
  assert.equal(record.reported_time_quantiles.p50_year, null);
  assert.equal(timing.describeEvidence(record).startYear, null);
  assert.equal(timing.describeEvidence(record).sourceUrl, null);
  assert.equal(timing.normalizeEvidence([evidence({ verification_status: undefined })])[0].verification_status, 'report_only');
  for (const value of ['2300', '', false, NaN, Infinity]) assert.throws(() => timing.normalizeEvidence([evidence({ time: { year: value } })]), /calendar year/);
});

test('bad intervals, confidence levels, probabilities and explicit types are rejected', () => {
  assert.throws(() => timing.normalizeEvidence([evidence({ time: { start_year: 2100, end_year: 2050 } })]), /lower bound/);
  assert.throws(() => timing.normalizeEvidence([evidence({ time: { confidence_level: 0.95, interval_kind: 'event_window' } })]), /confidence\/credible/);
  assert.throws(() => timing.normalizeEvidence([evidence({ time: { approximate: 'yes' } })]), /boolean/);
  assert.throws(() => timing.normalizeEvidence([evidence({ probability_by_year: { year: 2300, probability: 45 } })]), /probability/);
  assert.throws(() => timing.normalizeEvidence([evidence({ reported_time_quantiles: { p50_year: 2100, p90_year: 2050 } })]), /lower bound/);
  assert.throws(() => timing.normalizeEvidence([evidence(), evidence()]), /duplicate/);
  assert.throws(() => timing.normalizeEvidence({}), /list/);
});

test('probability at an evaluation year is not a time quantile', () => {
  const record = timing.normalizeEvidence([evidence({ kind: 'probability_by_year', time: null, probability_by_year: { year: 2300, probability: 0.45, event_definition: 'At least one specified tipping event', uncertainty: { interpretation: 'Model-specific estimate' } } })])[0];
  assert.equal(record.reported_time_quantiles.p90_year, null);
  assert.equal(record.probability_by_year.uncertainty.interpretation, 'Model-specific estimate');
  assert.equal(timing.describeEvidence(record).text, '45% by 2300');
});

test('physical measurements, context and explicit model assumptions survive round trip', () => {
  const record = evidence({ metric: 'sea_level', unit: 'm', reference_baseline: '1900', scenario: 'SSP2-4.5', geographic_scope: 'Global', shared_evidence_group: 'same-study', physical_values: [{ value: 0.5, year: 2150, unit: 'm', uncertainty: { low: 0.3, high: 0.8 } }], limitations: ['Not a functional-loss date'] });
  const normalized = timing.normalizeEvidence([record]);
  assert.deepEqual(timing.normalizeEvidence(JSON.parse(JSON.stringify(normalized))), normalized);
  const request = { mode: 'trajectory_threshold', evidence_ids: ['amoc-ci'], assumptions: [{ id: 'regional-transfer', value: 0.5, status: 'uncalibrated' }], threshold: { metric: 'loss', value: 0.4, unit: 'fraction' } };
  assert.deepEqual(timing.normalizeTimingModel(request).threshold, request.threshold);
  assert.deepEqual(timing.normalizeTimingModel(request).assumptions, request.assumptions);
});

test('unsafe source schemes and unsafe nested object keys are rejected', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,x', 'file:///secret', 'https://name:password@example.org']) {
    assert.throws(() => timing.normalizeEvidence([evidence({ source: { url } })]), /HTTP\(S\)/);
  }
  assert.throws(() => timing.normalizeTimingModel(JSON.parse('{"mode":"display_only","assumptions":{"__proto__":{"polluted":true}}}')), /unsafe object key/);
  assert.equal({}.polluted, undefined);
});

test('source traceability and supporting references survive import', () => {
  const original = evidence({ source: { title: 'Primary', url: 'https://example.org/primary', traceability_excerpt: 'Reported interval, not a P90.', supporting_sources: [{ title: 'Review', url: 'https://example.org/review', role: 'context' }] } });
  const normalized = timing.normalizeEvidence([original]);
  assert.equal(normalized[0].source.traceability_excerpt, original.source.traceability_excerpt);
  assert.deepEqual(normalized[0].source.supporting_sources, original.source.supporting_sources);
  assert.deepEqual(timing.normalizeEvidence(JSON.parse(JSON.stringify(normalized))), normalized);
  assert.throws(() => timing.normalizeEvidence([evidence({ source: { supporting_sources: [{ url: 'javascript:alert(1)' }] } })]), /HTTP\(S\)/);
});

test('requested modes and imported execution claims never assert runtime use', () => {
  for (const mode of ['trajectory_threshold', 'event_time_distribution', 'scenario_event_year']) {
    const component = { timing_model: timing.normalizeTimingModel({ mode, used_in_calculation: true }), timing_evidence: [evidence()] };
    assert.equal(timing.componentUsage(component).status, 'mapping_required');
  }
  assert.equal(timing.componentUsage({ timeline: [{ year: 2050 }] }).status, 'context_only');
  assert.equal(timing.componentUsage({ timing_model: { mode: 'display_only' }, timing_evidence: [evidence()] }).status, 'context_only');
  assert.equal(timing.componentUsage({}).status, 'missing_data');
});

test('genuinely reported time quantiles remain separate and visible', () => {
  const record = evidence({ time: null, reported_time_quantiles: { p50_year: 2050, p90_year: 2080 } });
  assert.equal(timing.describeEvidence(record).label, 'Reported time quantiles');
  assert.equal(timing.describeEvidence(record).text, 'P50 2050; P90 2080');
});
