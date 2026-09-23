/* Calculation provenance only. This module does not change the numerical model. */
(function expose(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ClockTransparency = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function factory() {
  'use strict';

  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const numberOrNull = value => finite(value) ? value : null;
  const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const textOrNull = value => typeof value === 'string' && value.trim() ? value : null;
  const copy = value => value == null ? null : JSON.parse(JSON.stringify(value));
  const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);

  function quantileRecord(value, probability, horizonEndYear) {
    const suppliedYear = numberOrNull(value);
    const censored = suppliedYear != null && finite(horizonEndYear) && suppliedYear > horizonEndYear;
    return {
      probability,
      year: censored ? null : suppliedYear,
      status: censored ? 'right_censored' : suppliedYear == null ? 'not_identified' : 'identified',
      horizonEndYear: numberOrNull(horizonEndYear),
      note: censored
        ? 'The quantile is not identified within the simulation horizon. The coded no-crossing value is not an estimated event year.'
        : suppliedYear == null
          ? 'No finite quantile was supplied for this completed calculation. This is not a zero-risk result.'
          : 'Quantile of simulated first functional-threshold crossing times under the recorded scenario assumptions.',
    };
  }

  function componentRecord(parentId, parent, component, index) {
    const timingModel = object(component.timing_model);
    const requestedMode = textOrNull(timingModel.mode) || 'display_only';
    const timingEvidence = Array.isArray(component.timing_evidence) ? component.timing_evidence : [];
    const timeline = Array.isArray(component.timeline) ? component.timeline : [];
    const literature = object(component.literature_horizon);
    const suppliedModel = object(component.model_horizon);
    const hasLiteratureQuantile = finite(literature.p50_year) || finite(literature.p90_year);
    const hasModelQuantile = finite(suppliedModel.p50_year) || finite(suppliedModel.p90_year);
    const evidenceAvailable = timeline.length > 0 || timingEvidence.length > 0 || hasLiteratureQuantile || hasModelQuantile;
    const mappingRequested = requestedMode !== 'display_only';
    return {
      parentId,
      parentName: textOrNull(parent.title) || parentId,
      componentId: textOrNull(component.id) || `component_${index + 1}`,
      componentName: textOrNull(component.name) || textOrNull(component.id) || `Component ${index + 1}`,
      numericalUsed: false,
      usage: mappingRequested ? 'mapping_required' : evidenceAvailable ? 'context_only' : 'missing_data',
      requestedMode,
      implementedMode: 'metadata_only',
      evidenceState: evidenceAvailable ? 'reported' : 'missing_timing_data',
      timingEvidenceCount: timingEvidence.length,
      timelineRecordCount: timeline.length,
      literatureQuantilesSupplied: hasLiteratureQuantile,
      modelQuantilesSupplied: hasModelQuantile,
      importedModelHorizon: hasModelQuantile ? {
        p50_year: numberOrNull(suppliedModel.p50_year),
        p90_year: numberOrNull(suppliedModel.p90_year),
        status: textOrNull(suppliedModel.status),
        source_ids: Array.isArray(suppliedModel.source_ids) ? copy(suppliedModel.source_ids) : [],
        note: textOrNull(suppliedModel.note),
        provenance: 'Supplied in the effective source document; not computed or used by this execution.',
      } : null,
      evidenceGrade: textOrNull(component.evidence_grade),
      calibrationGrade: textOrNull(component.calibration_grade),
      sourceIds: Array.isArray(component.source_ids) ? copy(component.source_ids) : [],
      reason: 'The current numerical engine uses headline-threat inputs. Subsystem records, including supplied model dates, do not enter the headline calculation.',
    };
  }

  function createReport(snapshot, result) {
    const saved = object(snapshot);
    const completed = object(result);
    const sourceDocument = object(saved.sourceDocument);
    const sourceMeta = object(sourceDocument._meta);
    const subsystemModels = object(sourceMeta.subsystem_models);
    const parameters = object(saved.parameters);
    const baseline = object(saved.timeBaseline);
    const inputs = Array.isArray(saved.threatInputs) ? saved.threatInputs : [];
    const metadataAvailable = saved.sourceDocument != null;
    const inputListAvailable = Array.isArray(saved.threatInputs);
    const evidenceUsage = [];
    Object.entries(subsystemModels).forEach(([parentId, rawParent]) => {
      const parent = object(rawParent);
      (Array.isArray(parent.components) ? parent.components : []).forEach((rawComponent, index) => {
        evidenceUsage.push(componentRecord(parentId, parent, object(rawComponent), index));
      });
    });
    const censorFraction = finite(completed.censorFraction) && completed.censorFraction >= 0 && completed.censorFraction <= 1
      ? completed.censorFraction : null;
    const actualRunCount = Number.isInteger(completed.actualRunCount) && completed.actualRunCount > 0
      ? completed.actualRunCount : null;
    const sha256 = typeof saved.inputSha256 === 'string' && /^[a-f0-9]{64}$/i.test(saved.inputSha256)
      ? saved.inputSha256 : null;
    const p50 = quantileRecord(completed.p50, 0.5, baseline.horizonEndYear);
    const p90 = quantileRecord(completed.p90, 0.9, baseline.horizonEndYear);
    const warnings = [
      'These are scenario-model results, not empirically calibrated probabilities of global collapse.',
      'A projection end year, confidence-interval endpoint or upper literature marker is not automatically a P90.',
      'Subsystem dates are metadata in this calculation. They do not replace the existing climate or ocean process inputs.',
      'More Monte Carlo draws can reduce simulation noise; they do not validate the assumptions or remove structural uncertainty.',
    ];
    if (!metadataAvailable) warnings.push('The effective source-document metadata was not recorded; subsystem coverage is unavailable.');
    if (!inputListAvailable) warnings.push('The executed headline-threat input list was not recorded; its count is unavailable.');
    if (!sha256) warnings.push('A SHA-256 input fingerprint is unavailable for this execution. Any FNV-1a fingerprint is non-cryptographic.');
    if (evidenceUsage.some(component => component.usage === 'mapping_required')) {
      warnings.push('One or more subsystem records request numerical use, but this engine has no implemented subsystem-to-headline mapping. Those records are not used numerically.');
    }
    if (p50.year != null && p90.year != null && p50.year > p90.year) {
      warnings.push('The supplied P50 exceeds P90. The recorded result requires investigation; this report has not changed it.');
    }
    return {
      schemaVersion: 'calculation-transparency-1',
      execution: {
        executedAt: textOrNull(saved.executedAt),
        codeIdentifier: textOrNull(saved.codeIdentifier),
        dataIdentifier: textOrNull(saved.dataIdentifier),
        activeDataset: textOrNull(saved.activeDataset),
        inputSha256: sha256,
        inputHashScope: textOrNull(saved.inputHashScope),
        dataHashFNV1a32: textOrNull(saved.dataHashFNV1a32),
        dataHashFNV1a32Meaning: 'Non-cryptographic fingerprint; not a substitute for SHA-256.',
      },
      engine: {
        mode: 'legacy_headline_processes_with_dependency_cascade',
        label: 'Headline process assumptions and dependency cascade',
        headlineInputCount: inputListAvailable ? inputs.length : null,
        climateMode: inputs.some(input => input.id === 'climate') ? 'legacy_growth' : 'unavailable',
        oceanMode: inputs.some(input => input.id === 'oceans') ? 'legacy_growth' : 'unavailable',
        subsystemNumericalEngineImplemented: false,
        explanation: 'The current engine samples headline-threat scores, growth and thresholds, applies its process-specific event rules, then propagates functional disruption through dependencies. Climate and ocean subsystem dates are not numerical drivers.',
      },
      evidenceSummary: {
        metadataAvailable,
        totalComponents: metadataAvailable ? evidenceUsage.length : null,
        componentsUsedNumerically: metadataAvailable ? 0 : null,
        contextOnly: metadataAvailable ? evidenceUsage.filter(component => component.usage === 'context_only').length : null,
        mappingRequired: metadataAvailable ? evidenceUsage.filter(component => component.usage === 'mapping_required').length : null,
        missingTimingData: metadataAvailable ? evidenceUsage.filter(component => component.evidenceState === 'missing_timing_data').length : null,
        interpretation: 'Literature observations and timing records are kept separate from model priors. Evidence quality is not the same as calibration of the numerical mapping.',
      },
      evidenceUsage,
      assumptions: {
        scenario: textOrNull(parameters.scenario),
        scenarioDefinition: copy(saved.scenarioDefinition),
        cascadeThreshold: numberOrNull(parameters.cascadeThreshold),
        dependencyAmplification: numberOrNull(parameters.depAlpha),
        uncertaintyMultiplier: numberOrNull(parameters.uncMult),
        thresholdPolicy: textOrNull(parameters.thresholdPolicy),
        requestedRunCount: numberOrNull(parameters.nSim),
        criterionWeights: copy(parameters.weights),
        domainWeights: copy(parameters.domW),
        timeBaseline: copy(saved.timeBaseline),
        modelConstants: copy(saved.modelConstants),
        quantileRules: copy(saved.quantileRules),
        censoringRules: copy(saved.censoringRules),
        uncertaintyLabels: copy(saved.uncertaintyLabels),
      },
      results: {
        p50,
        p90,
        censorFraction,
        actualRunCount,
        censoringMeaning: 'Fraction of runs without a recorded system-threshold crossing by the simulation end year. It is not a missing-data count or evidence of safety after that year.',
        thresholdMeaning: 'The first modeled functional-threshold crossing, not completed global collapse. The functional rule uses the maximum of system-wide and essential-service loss, not their average.',
      },
      warnings,
      reproducibility: {
        executedAt: textOrNull(saved.executedAt),
        seed: saved.seed == null ? null : copy(saved.seed),
        rngVersion: textOrNull(saved.rngVersion),
        parameters: copy(saved.parameters),
        scenarioDefinition: copy(saved.scenarioDefinition),
        timeBaseline: copy(saved.timeBaseline),
        codeIdentifier: textOrNull(saved.codeIdentifier),
        codeHashFNV1a32: textOrNull(saved.codeHashFNV1a32),
        codeHashAlgorithm: textOrNull(saved.codeHashAlgorithm),
        codeHashScope: textOrNull(saved.codeHashScope),
        codeHashFunctions: copy(saved.codeHashFunctions),
        dataIdentifier: textOrNull(saved.dataIdentifier),
        inputSha256: sha256,
        inputHashScope: textOrNull(saved.inputHashScope),
        inputHashStatus: textOrNull(saved.inputHashStatus),
        inputImport: copy(saved.inputImport),
        dataHashFNV1a32: textOrNull(saved.dataHashFNV1a32),
        fullInputsLocation: 'The exported executionSnapshot contains sourceDocument, sourceData and the full threatInputs used in the calculation. They are omitted from this compact display manifest.',
      },
    };
  }

  function displayNumber(value, digits) {
    return finite(value) ? value.toLocaleString('en-US', { maximumFractionDigits: digits == null ? 2 : digits }) : 'Unavailable';
  }

  function displayQuantile(record) {
    const item = object(record);
    if (item.status === 'right_censored' && finite(item.horizonEndYear)) return `>${item.horizonEndYear} (not identified within horizon)`;
    return finite(item.year) ? String(Math.round(item.year)) : 'Not identified';
  }

  function render(host, report, status) {
    if (!host || typeof host !== 'object') throw new TypeError('A host element is required.');
    const runStatus = status || 'complete';
    const isCurrent = runStatus === 'complete';
    if (!report) {
      host.innerHTML = `<p class="transparency-warning">${escapeHtml(runStatus === 'running'
        ? 'Calculation in progress. No completed calculation report is available yet.'
        : runStatus === 'failed'
          ? 'The last calculation failed. No completed calculation report is available.'
          : 'No completed calculation report is available yet.')}</p>`;
      return host;
    }
    const execution = object(report.execution);
    const engine = object(report.engine);
    const evidence = object(report.evidenceSummary);
    const assumptions = object(report.assumptions);
    const results = object(report.results);
    const settings = object(report.reproducibility);
    const inputImport = object(settings.inputImport);
    const overlay = object(inputImport.overlay);
    const baseline = object(assumptions.timeBaseline);
    const value = item => escapeHtml(item == null || item === '' ? 'Unavailable' : item);
    const runLabel = isCurrent ? 'Completed calculation' : 'Last completed calculation';
    const statusNote = isCurrent ? '' : `<p class="transparency-warning">${escapeHtml(runStatus === 'running'
      ? 'A new calculation is running. Everything below belongs to the last completed calculation, not the new run.'
      : runStatus === 'failed'
        ? 'The last calculation failed. Everything below belongs to the earlier completed calculation, not the failed run.'
        : 'Inputs or settings changed. Rerun the calculation to update the result. Everything below belongs to the last completed calculation.')}</p>`;
    const sourceCounts = evidence.metadataAvailable
      ? `${displayNumber(evidence.totalComponents, 0)} subsystem components recorded; ${displayNumber(evidence.componentsUsedNumerically, 0)} used in the numerical calculation.`
      : 'Subsystem coverage unavailable: source metadata was not recorded.';
    const pendingMappings = finite(evidence.mappingRequired) && evidence.mappingRequired > 0
      ? `<p class="transparency-warning">${value(evidence.mappingRequired)} component records request numerical use. Their mapping is not implemented; they remain excluded from the calculation.</p>` : '';
    const missingTiming = finite(evidence.missingTimingData) && evidence.missingTimingData > 0
      ? `<p>${value(evidence.missingTimingData)} components have no reported timing records. Missing timing is separate from an unmapped record or a simulated threshold not reached.</p>` : '';
    const censorText = finite(results.censorFraction) ? `${displayNumber(results.censorFraction * 100, 1)}%` : 'Unavailable';
    const hash = execution.inputSha256
      ? `<code class="transparency-code">${value(execution.inputSha256)}</code>`
      : 'Unavailable for this calculation';
    const exceptionalWarnings = (Array.isArray(report.warnings) ? report.warnings.slice(4) : [])
      .map(warning => `<p class="transparency-warning">${escapeHtml(warning)}</p>`).join('');
    const overlayStatus = overlay.active === true
      ? `Active${textOrNull(overlay.fileName) ? ` (${overlay.fileName})` : ''}`
      : overlay.active === false ? 'Inactive' : 'Unavailable';
    const rawReport = escapeHtml(JSON.stringify({ reproducibility: settings, componentUsage: report.evidenceUsage }, null, 2));
    host.innerHTML = `${statusNote}
      <p>${escapeHtml(runLabel)}: ${value(execution.executedAt)}. Model ${value(execution.codeIdentifier)}; dataset ${value(execution.dataIdentifier)}.</p>
      ${exceptionalWarnings}
      <div class="transparency-grid">
        <section class="transparency-block"><h4>1. Source data and actual use</h4>
          <p>${value(engine.headlineInputCount)} headline-threat inputs drive this calculation. ${escapeHtml(sourceCounts)}</p>
          <p class="transparency-usage">${escapeHtml(engine.label || 'Calculation mode unavailable')}. Climate and Ocean retain their existing headline process model; subsystem dates are shown as context.</p>
          <p>Literature measurements, projection years and reported intervals are not automatically calibrated model priors. An upper interval endpoint is not automatically P90.</p>
          <p>Import policy: ${value(inputImport.mergePolicy)} Evidence overlay: ${escapeHtml(overlayStatus)}.</p>
          ${pendingMappings}${missingTiming}
        </section>
        <section class="transparency-block"><h4>2. Explicit model assumptions</h4>
          <p>Scenario: ${value(assumptions.scenario)}. Functional threshold: ${value(assumptions.cascadeThreshold)}. Dependency amplification: ${value(assumptions.dependencyAmplification)}. Uncertainty multiplier: ${value(assumptions.uncertaintyMultiplier)}.</p>
          <p>The first modeled functional disruption is reached when the system-wide loss or an essential-service loss reaches the threshold. Fixed criticality weights, dependencies and event rules are assumptions recorded below.</p>
          <p>Missing timing data, a missing numerical mapping and a threshold not reached during simulation are different states. No absent date is treated as zero risk.</p>
        </section>
        <section class="transparency-block"><h4>3. Recorded result</h4>
          <div class="transparency-metrics"><span>Model P50: <strong>${escapeHtml(displayQuantile(results.p50))}</strong></span><span>Model P90: <strong>${escapeHtml(displayQuantile(results.p90))}</strong></span></div>
          <p>${escapeHtml(censorText)} of runs had no system-threshold crossing by ${value(baseline.horizonEndYear)}. Completed draws: ${escapeHtml(displayNumber(results.actualRunCount, 0))}.</p>
          <p>These are scenario-model quantiles, not empirically calibrated collapse probabilities. More draws reduce sampling noise, not uncertainty about the model itself.</p>
        </section>
      </div>
      <details><summary>Reproducibility settings and component usage</summary>
        <p>Seed: ${value(settings.seed)}. Random-number generator: ${value(settings.rngVersion)}. Dataset: ${value(execution.activeDataset)}.</p>
        <p>Input SHA-256: ${hash}</p><p>Hash scope: ${value(execution.inputHashScope)}.</p>
        <p>Recorded FNV-1a: ${value(execution.dataHashFNV1a32)} (non-cryptographic). Repeating a recorded calculation does not establish scientific validity.</p>
        <p>${value(settings.fullInputsLocation)}</p>
        <pre class="transparency-code">${rawReport}</pre>
      </details>`;
    return host;
  }

  return { createReport, render };
});
