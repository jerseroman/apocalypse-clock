/* Literature timing is evidence, not an automatically executed failure-time model. */
(function expose(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ClockTimingEvidence = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function factory() {
  'use strict';

  const KINDS = ['threshold_crossing', 'projection_period', 'mitigation_milestone', 'trend_change', 'signal_emergence', 'historical_crossing', 'probability_by_year'];
  const INTERVALS = ['confidence_interval', 'credible_interval', 'projection_period', 'scenario_range', 'event_window', 'approximate_period'];
  const MODES = ['display_only', 'trajectory_threshold', 'event_time_distribution', 'scenario_event_year'];
  const LABELS = {
    threshold_crossing: 'Reported threshold timing', projection_period: 'Projection period',
    mitigation_milestone: 'Mitigation milestone', trend_change: 'Trend change',
    signal_emergence: 'Signal emergence', historical_crossing: 'Historical crossing',
    probability_by_year: 'Reported probability by year'
  };
  const fail = (path, message) => { throw new TypeError(`${path}: ${message}`); };
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
  const object = (value, path) => isObject(value) ? value : fail(path, 'expected an object');

  function text(value, path, required = false) {
    if (value == null) return required ? fail(path, 'required text is missing') : null;
    if (typeof value !== 'string' || value.length > 16000) fail(path, 'expected text of at most 16000 characters');
    const result = value.trim();
    if (!result && required) fail(path, 'required text is empty');
    return result || null;
  }

  function choice(value, choices, path, fallback = null) {
    if (value == null) return fallback;
    if (!choices.includes(value)) fail(path, `expected one of ${choices.join(', ')}`);
    return value;
  }

  function year(value, path) {
    if (value == null) return null;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < -10000 || value > 10000) {
      fail(path, 'expected a finite numeric calendar year between -10000 and 10000, or null');
    }
    return value;
  }

  function probability(value, path) {
    if (value == null) return null;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) fail(path, 'expected a probability between 0 and 1');
    return value;
  }

  function ordered(low, high, path) {
    if (low != null && high != null && low > high) fail(path, 'lower bound must not exceed upper bound');
  }

  function strings(value, path) {
    if (value == null) return [];
    if (!Array.isArray(value) || value.length > 512) fail(path, 'expected a bounded list of strings');
    return value.map((item, index) => text(item, `${path}[${index}]`, true));
  }

  // Preserve model assumptions and physical measurements without executing them.
  function jsonClone(value, path, depth = 0, budget = { count: 0 }) {
    if (++budget.count > 20000 || depth > 10) fail(path, 'nested data exceeds the supported size');
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'string') return text(value, path) ?? '';
    if (typeof value === 'number') return Number.isFinite(value) ? value : fail(path, 'number must be finite');
    if (Array.isArray(value)) {
      if (value.length > 512) fail(path, 'list exceeds 512 entries');
      return value.map((item, index) => jsonClone(item, `${path}[${index}]`, depth + 1, budget));
    }
    object(value, path);
    if (Object.keys(value).length > 128) fail(path, 'object exceeds 128 fields');
    const result = {};
    for (const key of Object.keys(value)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) fail(path, 'unsafe object key');
      result[key] = jsonClone(value[key], `${path}.${key}`, depth + 1, budget);
    }
    return result;
  }

  function source(value, path) {
    if (value == null) return null;
    const input = object(value, path), result = {};
    for (const key of ['title', 'doi', 'url', 'version_note', 'location', 'derivation', 'quote', 'traceability_excerpt']) result[key] = text(input[key], `${path}.${key}`);
    const validateUrl = (url, urlPath) => {
      if (!url) return;
      let parsed;
      try { parsed = new URL(url); } catch (_) { fail(urlPath, 'expected an absolute HTTP(S) URL'); }
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) fail(urlPath, 'only HTTP(S) source URLs without credentials are supported');
    };
    validateUrl(result.url, `${path}.url`);
    if (input.supporting_sources != null) {
      if (!Array.isArray(input.supporting_sources) || input.supporting_sources.length > 32) fail(`${path}.supporting_sources`, 'expected a bounded list of sources');
      result.supporting_sources = input.supporting_sources.map((item, index) => {
        const itemPath = `${path}.supporting_sources[${index}]`, support = object(item, itemPath);
        const normalized = {};
        for (const key of ['title', 'url', 'role']) normalized[key] = text(support[key], `${itemPath}.${key}`);
        validateUrl(normalized.url, `${itemPath}.url`);
        return normalized;
      });
    }
    return result;
  }

  function normalizeTime(value, path) {
    const input = value == null ? {} : object(value, path);
    const result = {
      year: year(input.year, `${path}.year`), start_year: year(input.start_year, `${path}.start_year`),
      end_year: year(input.end_year, `${path}.end_year`), interval_kind: choice(input.interval_kind, INTERVALS, `${path}.interval_kind`),
      confidence_level: probability(input.confidence_level, `${path}.confidence_level`),
      bound_relation: choice(input.bound_relation, ['before', 'after', 'by', 'around', 'within'], `${path}.bound_relation`),
      approximate: input.approximate == null ? false : input.approximate,
      original_text: text(input.original_text, `${path}.original_text`)
    };
    if (typeof result.approximate !== 'boolean') fail(`${path}.approximate`, 'expected a boolean');
    ordered(result.start_year, result.end_year, path);
    if (result.confidence_level != null && (!['confidence_interval', 'credible_interval'].includes(result.interval_kind) || result.confidence_level <= 0 || result.confidence_level >= 1)) {
      fail(`${path}.confidence_level`, 'requires a confidence/credible interval and a level strictly between 0 and 1');
    }
    return result;
  }

  function normalizeProbability(value, path) {
    if (value == null) return null;
    const input = object(value, path), result = jsonClone(input, path);
    result.year = year(input.year, `${path}.year`);
    result.probability = probability(input.probability, `${path}.probability`);
    result.event_definition = text(input.event_definition, `${path}.event_definition`);
    for (const key of ['lower_bound', 'upper_bound', 'confidence_level']) {
      if (Object.prototype.hasOwnProperty.call(input, key)) result[key] = probability(input[key], `${path}.${key}`);
    }
    ordered(result.lower_bound, result.upper_bound, path);
    if (result.probability != null && ((result.lower_bound != null && result.probability < result.lower_bound) || (result.upper_bound != null && result.probability > result.upper_bound))) fail(path, 'reported probability lies outside its uncertainty bounds');
    return result;
  }

  function normalizePhysicalValues(value, path) {
    if (value == null) return [];
    if (!Array.isArray(value) || value.length > 512) fail(path, 'expected a bounded list of physical measurements');
    return value.map((item, index) => {
      const itemPath = `${path}[${index}]`, input = object(item, itemPath), result = jsonClone(input, itemPath);
      for (const key of ['year', 'start_year', 'end_year']) if (Object.prototype.hasOwnProperty.call(input, key)) result[key] = year(input[key], `${itemPath}.${key}`);
      if (input.time != null) result.time = normalizeTime(input.time, `${itemPath}.time`);
      if (input.value != null && (typeof input.value !== 'number' || !Number.isFinite(input.value))) fail(`${itemPath}.value`, 'expected a finite numeric physical value or null');
      ordered(result.start_year, result.end_year, itemPath);
      return result;
    });
  }

  function normalizeEvidence(value, fieldName = 'timing_evidence') {
    if (value == null) return [];
    if (!Array.isArray(value) || value.length > 512) fail(fieldName, 'expected a bounded list of timing evidence');
    const ids = new Set();
    return value.map((item, index) => {
      const path = `${fieldName}[${index}]`, input = object(item, path);
      const id = text(input.id, `${path}.id`, true);
      if (ids.has(id)) fail(`${path}.id`, 'duplicate timing-evidence id');
      ids.add(id);
      const result = { id, kind: choice(input.kind, KINDS, `${path}.kind`) };
      if (!result.kind) fail(`${path}.kind`, 'timing kind is required');
      result.event_definition = text(input.event_definition, `${path}.event_definition`, true);
      for (const key of ['metric', 'unit', 'reference_baseline', 'geographic_scope', 'scenario', 'shared_evidence_group', 'report_timing_class']) result[key] = text(input[key], `${path}.${key}`);
      result.time = normalizeTime(input.time, `${path}.time`);
      const quantiles = input.reported_time_quantiles == null ? {} : object(input.reported_time_quantiles, `${path}.reported_time_quantiles`);
      result.reported_time_quantiles = {
        p50_year: year(quantiles.p50_year, `${path}.reported_time_quantiles.p50_year`),
        p90_year: year(quantiles.p90_year, `${path}.reported_time_quantiles.p90_year`)
      };
      ordered(result.reported_time_quantiles.p50_year, result.reported_time_quantiles.p90_year, `${path}.reported_time_quantiles`);
      result.probability_by_year = normalizeProbability(input.probability_by_year, `${path}.probability_by_year`);
      result.physical_values = normalizePhysicalValues(input.physical_values, `${path}.physical_values`);
      result.source = source(input.source, `${path}.source`);
      result.verification_status = choice(input.verification_status, ['primary_checked', 'report_only'], `${path}.verification_status`, 'report_only');
      result.limitations = strings(input.limitations, `${path}.limitations`);
      return result;
    });
  }

  function normalizeTimingModel(value, fieldName = 'timing_model') {
    if (value == null) return null;
    const input = object(value, fieldName), result = jsonClone(input, fieldName);
    result.mode = choice(input.mode, MODES, `${fieldName}.mode`, 'display_only');
    result.evidence_ids = strings(input.evidence_ids, `${fieldName}.evidence_ids`);
    if (new Set(result.evidence_ids).size !== result.evidence_ids.length) fail(`${fieldName}.evidence_ids`, 'duplicate evidence ids');
    if (input.assumptions != null && !Array.isArray(input.assumptions) && !isObject(input.assumptions)) fail(`${fieldName}.assumptions`, 'expected a list or object');
    result.assumptions = input.assumptions == null ? [] : jsonClone(input.assumptions, `${fieldName}.assumptions`);
    result.reason = text(input.reason, `${fieldName}.reason`);
    return result;
  }

  function describeEvidence(record) {
    const item = normalizeEvidence([record])[0], time = item.time, q = item.reported_time_quantiles;
    let label = LABELS[item.kind], description = '', startYear = time.start_year ?? time.year, endYear = time.end_year ?? time.year;
    if (time.interval_kind === 'confidence_interval' || time.interval_kind === 'credible_interval') {
      label = `Reported ${time.confidence_level == null ? '' : `${Math.round(time.confidence_level * 10000) / 100}% `}${time.interval_kind.replace('_', ' ')}`;
    }
    if (time.year != null) description = `${time.bound_relation && time.bound_relation !== 'within' ? `${time.bound_relation} ` : ''}${time.year}`;
    else if (time.start_year != null && time.end_year != null) description = `${time.start_year}–${time.end_year}`;
    else if (time.start_year != null) description = `From ${time.start_year}`;
    else if (time.end_year != null) description = `${time.bound_relation || 'Up to'} ${time.end_year}`;
    if (time.approximate && description && !description.startsWith('around ')) description = `Approximately ${description}`;
    if (!description) description = time.original_text || 'Timing not reported';
    if (q.p50_year != null || q.p90_year != null) {
      const values = [q.p50_year, q.p90_year].filter(value => value != null);
      const quantileText = [q.p50_year == null ? null : `P50 ${q.p50_year}`, q.p90_year == null ? null : `P90 ${q.p90_year}`].filter(Boolean).join('; ');
      if (description !== 'Timing not reported' && (time.year != null || time.start_year != null || time.end_year != null)) description += `; reported time quantiles: ${quantileText}`;
      else { label = 'Reported time quantiles'; description = quantileText; }
      startYear = Math.min(...values, ...(startYear == null ? [] : [startYear]));
      endYear = Math.max(...values, ...(endYear == null ? [] : [endYear]));
    }
    if (item.kind === 'probability_by_year' && item.probability_by_year) {
      const p = item.probability_by_year;
      description = `${p.probability == null ? 'Probability not reported' : `${Math.round(p.probability * 10000) / 100}%`}${p.year == null ? '' : ` by ${p.year}`}`;
      startYear = endYear = p.year;
    }
    return { label, text: description, startYear, endYear, sourceUrl: item.source?.url || null };
  }

  function componentUsage(component) {
    const model = component?.timing_model;
    if (model?.mode && model.mode !== 'display_only') return {
      status: 'mapping_required', label: 'Mapping required',
      reason: `The requested ${model.mode.replace(/_/g, ' ')} mode is recorded but is not connected to the current calculation engine.`
    };
    const hasTiming = Boolean(component?.timing_evidence?.length || component?.timeline?.length ||
      [component?.literature_horizon, component?.model_horizon].some(value => Number.isFinite(value?.p50_year) || Number.isFinite(value?.p90_year)));
    if (hasTiming) return { status: 'context_only', label: 'Context only', reason: 'These subsystem data are displayed for reference; the current clocks are calculated from the 23 parent-threat inputs.' };
    return { status: 'missing_data', label: 'Timing data missing', reason: 'No usable timing evidence is supplied. Missing data do not mean zero risk.' };
  }

  return Object.freeze({ normalizeEvidence, normalizeTimingModel, describeEvidence, componentUsage });
});
