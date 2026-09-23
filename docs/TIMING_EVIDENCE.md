# Timing evidence and calculation transparency

The current numerical engine uses the 23 headline-threat inputs and their dependency cascade. Climate and Ocean subsystem timelines are metadata, not numerical drivers. Adding a record or declaring a numerical mapping does not activate a new subsystem engine.

## Compatible JSON extension

Extend the existing complete dataset. Keep component IDs in `_meta.subsystem_models.climate.components` and `_meta.subsystem_models.oceans.components`. Each component may include the following fields:

```json
{
  "timing_evidence": [
    {
      "id": "example_projection",
      "kind": "projection_period",
      "event_definition": "Example only: projected state of a defined physical quantity",
      "metric": null,
      "unit": null,
      "reference_baseline": null,
      "geographic_scope": null,
      "scenario": null,
      "time": {
        "year": null,
        "start_year": 2081,
        "end_year": 2100,
        "interval_kind": "projection_period",
        "confidence_level": null,
        "bound_relation": "within",
        "approximate": false,
        "original_text": "2081-2100"
      },
      "reported_time_quantiles": { "p50_year": null, "p90_year": null },
      "probability_by_year": null,
      "physical_values": [],
      "source": null,
      "verification_status": "report_only",
      "shared_evidence_group": null,
      "limitations": ["Example structure, not a scientific input."]
    }
  ],
  "timing_model": {
    "mode": "display_only",
    "evidence_ids": ["example_projection"],
    "assumptions": [],
    "reason": "No approved numerical mapping."
  }
}
```

This is a fragment, not a complete upload file. Numeric calendar years must be JSON numbers or null, not strings. A source object can contain `title`, `doi`, `url`, `version_note`, `location`, `derivation`, `quote`, `traceability_excerpt`, and `supporting_sources` (a list of `title`, `url`, `role` objects). Source links must use HTTP or HTTPS. Supply the actual scenario, units, geographic scope and source where available; do not invent them.

Supported `kind` values: `threshold_crossing`, `projection_period`, `mitigation_milestone`, `trend_change`, `signal_emergence`, `historical_crossing`, `probability_by_year`.

Supported interval kinds: `confidence_interval`, `credible_interval`, `projection_period`, `scenario_range`, `event_window`, `approximate_period`. A confidence level is a number strictly between 0 and 1 and is valid only with a confidence or credible interval. Missing endpoints remain null; open bounds are not completed with invented years. Years outside the simulation horizon, such as 1950, 2150 or 2300, are preserved. Evidence timelines use a labeled common axis within each parent card.

`probability_by_year` can contain `year`, `probability`, `event_definition` and documented uncertainty. A probability at a specified year is not a time quantile. Physical observations belong in `physical_values`, with their quantity, value, units and time context. A mitigation milestone is not an automatic failure trigger.

`timing_model.mode` can record `display_only`, `trajectory_threshold`, `event_time_distribution` or `scenario_event_year`. The latter three are **declarations only** and are displayed as **Mapping required** until a numerical adapter is implemented. Referenced evidence IDs must exist in the component. Imported `model_horizon` values are labeled as imported results, not outputs of the current run. New timing records never fill legacy P50/P90 fields automatically.

## What is shown and exported

- Component rows distinguish **Context only**, **Mapping required** and **Timing data missing**. None currently claims numerical use. The first declared evidence ID, or otherwise the first record, supplies the compact timing and matching Source link. All records remain in the expanded threat details and export.
- **How is this calculated?** uses the frozen completed-run snapshot, not live edited controls. It separates source data, model assumptions, and recorded results. Pending, running, failed and stale states are explicit.
- The JSON export includes the effective `sourceDocument`, `executionSnapshot`, a transparency report and result status. Partial uploads can inherit bundled values. This merge policy and any active evidence overlay are disclosed; the export contains the effective inputs.
- `inputSha256` hashes UTF-8 `JSON.stringify(sourceDocument)`. It identifies the effective merged document including metadata, not original upload bytes. If Web Crypto is unavailable, the digest is explicitly unavailable. The older FNV-1a fingerprint remains labeled non-cryptographic.
- The snapshot records seed, RNG version, model identifier and numerical-code fingerprint, parameters, scenario, model rules and resolved threat inputs. JSON export carries the full replay context; CSV includes the transparency manifest and source document.

Missing data, an unimplemented mapping, and a quantile not identified within the simulation window are different states. A censored quantile has a null event year in the transparency report, with its status and simulation limit preserved. Reproducible execution does not establish empirical calibration or scientific validity.

No literature timing is silently substituted for a failure date. The existing numerical equations and baseline clocks are unchanged by this extension.
