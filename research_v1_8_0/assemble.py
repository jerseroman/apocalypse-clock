"""Assemble researched fragments into a standalone, auditable parameter map.

Only new artifacts in this directory and the named v1.8.0 output are written.
The reference supplies taxonomy and model conventions, never replacement scores.
"""
from __future__ import annotations

import collections
import hashlib
import json
import math
from pathlib import Path
from urllib.parse import urlsplit

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
REFERENCE = Path(r"C:\Users\error\Downloads\data_v1_7_1metadata_revision.json")
PROMPT = Path(r"C:\Users\error\.codex\attachments\9697ddc6-d45e-41b6-9cd0-1f47b2c3d121\pasted-text.txt")
OUTPUT = ROOT / "data_v1_8_0_evidence_revision.json"
DATE = "2026-09-09"
THREATS = "ai amr authoritarian autonomousw biodiversity bioengineered climate cyber debt displacement economic epistemic fragmentation_gov geopolitics minerals nuclear oceans pandemics pollution soils space supply water".split()
METRICS = "scale urgency acceleration interdependence irreversibility gov_failure growth_rate threshold".split()
BASE_FIELDS = "mu lo hi source url accessed strength note".split()
GROWTH_FIELDS = "growth_kind risk_conversion raw_indicator_growth effective_growth_calibrated calibration_note threat_specific_cap do_not_reconvert_mu_lo_hi capped_hi".split()


def pairs_unique(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"Duplicate JSON key: {key}")
        result[key] = value
    return result


def read(path):
    return json.loads(path.read_text(encoding="utf-8-sig"), object_pairs_hook=pairs_unique,
                      parse_constant=lambda value: (_ for _ in ()).throw(ValueError(value)))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write(path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False, allow_nan=False) + "\n", encoding="utf-8")


def require(condition, message):
    if not condition:
        raise ValueError(message)


def round_significant(value, digits=4):
    return 0 if value == 0 else round(value, digits - 1 - math.floor(math.log10(abs(value))))


def inspect_tree(value, path="$"):
    require(value is not None, f"Null at {path}")
    if isinstance(value, dict):
        for key, item in value.items():
            inspect_tree(item, f"{path}.{key}")
    elif isinstance(value, list):
        for index, item in enumerate(value):
            inspect_tree(item, f"{path}[{index}]")
    elif isinstance(value, float):
        require(math.isfinite(value), f"Nonfinite at {path}")


def main():
    baseline = read(REFERENCE)
    fragments = [read(HERE / f"{name}.json") for name in ("environment", "technology_health", "society_economy")]
    entries, growth_inputs, source_registry, research_notes = {}, {}, [], []
    for fragment in fragments:
        require(not set(entries) & set(fragment["entries"]), "Overlapping research scope")
        entries.update(fragment["entries"])
        growth_inputs.update(fragment["growth_inputs"])
        source_registry.extend(fragment["sources"])
        research_notes.extend(fragment.get("research_notes", []))
    expected = {f"{threat}.{metric}" for threat in THREATS for metric in METRICS}
    require(set(entries) == expected, f"Key mismatch: missing={expected-set(entries)}; extra={set(entries)-expected}")
    require(set(growth_inputs) == set(THREATS), "Growth audit is incomplete")

    source_registry.append({
        "id": "oecd_jrc_composite_2008", "title": "OECD/European Union/EC-JRC (2008), Handbook on Constructing Composite Indicators: Methodology and User Guide",
        "url": "https://www.oecd.org/en/publications/handbook-on-constructing-composite-indicators-methodology-and-user-guide_9789264043466-en.html",
        "published": "2008-08-22", "accessed": DATE, "source_type": "institutional_methodology",
        "findings": "Methodological reference for constructing and interpreting composite indicators; it supplies no Apocalypse Clock score, threshold or growth conversion factor.",
        "fact_location": "Publication information and Abstract", "verification_method": "web_open"})
    nuclear_source_url = "https://www.sipri.org/sites/default/files/YB26%2008%20World%20Nuclear%20Forces.pdf"
    source_registry.append({
        "id": "sipri_nuclear_forces_chapter_2026", "title": "Kristensen and Korda (2026), World nuclear forces, SIPRI Yearbook 2026, chapter 8",
        "url": nuclear_source_url, "published": "2026", "accessed": DATE,
        "source_type": "institutional_assessment", "findings": "Military-stockpile estimates: 9614 (2025), 9745 (2026). The Russian increase largely reflects reassessment, not identified physical production.",
        "fact_location": "Table 8A.1, printed p.279 / PDF p.29, especially footnote j; introductory interpretation on printed pp.251-253",
        "verification_method": "web_open_and_table_footnote_verification"})
    entries["nuclear.growth_rate"].update({
        "source": "Kristensen and Korda, SIPRI Yearbook 2026, chapter 8, table 8A.1 and footnote j",
        "url": nuclear_source_url,
        "note": "Reported military-stockpile estimates increased from 9614 to 9745, about 1.36%. SIPRI attributes much of the Russian increase to reassessment. This is an estimate-change proxy, not identified physical growth or nuclear-war probability. The 0-4% raw range is judgmental."})
    growth_inputs["nuclear"].update({
        "raw_basis": "reported_estimate_proxy",
        "derivation": "Raw central = 9745 / 9614 - 1, using the two years in SIPRI 2026 table 8A.1. The 0-0.04 bounds are analyst-selected.",
        "limitations": "Footnote j identifies reassessment in the Russian increase. The aggregate ratio cannot isolate physical additions and excludes retired weapons. Posture, modernization and escalation are not proportional to this proxy."})
    research_notes = [note for note in research_notes if not note.startswith("SIPRI nuclear growth uses military stockpiles")]
    research_notes.append("The nuclear stockpile estimate-change proxy was reclassified after checking the 2026 table footnote: reassessment prevents identifying physical growth from the aggregate ratio.")
    entries["space.growth_rate"]["note"] = "ESA's 2025 overview gives about 40000 tracked objects; the 31 July 2026 update gives about 46770. A 19-month interval is assumed from the overview's end-2024 data cutoff, not an explicitly dated first count. This approximate inventory-pressure proxy is not collision frequency; the 3-22% raw range is judgmental."
    growth_inputs["space"]["derivation"] = "Approximate annualized tracked-inventory growth=(46770/40000)^(12/19)-1. The first endpoint date is inferred from the ESA report's end-2024 data cutoff; the 31 July 2026 endpoint is explicitly dated. Nineteen months is therefore an assumption. Bounds 0.03-0.22 are judgmental."
    growth_inputs["space"]["limitations"] = "Tracked inventory includes functioning satellites and debris; surveillance improvements and net launches affect counts. The initial count is rounded and is not explicitly dated: its assumed date follows the report's stated data cutoff. Modelled small-debris populations were not differenced because reference populations changed."
    source_registry.sort(key=lambda source: (source["url"], source.get("id", "")))
    registry_urls = {source["url"] for source in source_registry}
    classes = {threat: dict(baseline["_meta"]["growth_rate_calibration_classes"][threat]) for threat in THREATS}
    corrected_kinds = {
        "water": ("freshwater_withdrawal_pressure_growth", "The raw indicator is freshwater withdrawals, not scarcity-exposed population."),
        "autonomousw": ("military_autonomy_pressure_proxy", "The raw quantity is a judgmental military-autonomy pressure index, not measured commercial market growth."),
        "bioengineered": ("dual_use_capability_pressure_proxy", "The raw quantity is a judgmental dual-use capability-pressure index, not a publication-count series."),
        "pandemics": ("emergence_exposure_pressure_proxy", "The raw quantity is judgmental emergence/exposure pressure, not measured pandemic event-frequency growth."),
        "fragmentation_gov": ("institutional_coordination_pressure_proxy", "The raw quantity combines judgmental coordination pressures; it is not growth in annual veto counts."),
        "epistemic": ("information_integrity_pressure_proxy", "The raw quantity is judgmental information-system pressure, not observed growth in countries running disinformation operations."),
        "nuclear": ("stockpile_estimate_change_proxy", "The raw ratio describes changes in published stockpile estimates, including reassessment; it does not isolate physical stockpile growth."),
    }
    kind_changes = []
    for threat, (kind, reason) in corrected_kinds.items():
        kind_changes.append({"threat": threat, "previous": classes[threat]["growth_kind"], "new": kind, "reason": reason})
        classes[threat]["growth_kind"] = kind
        entries[f"{threat}.growth_rate"]["calibration_note"] += f" Active growth_kind={kind}. {reason}"
    for threat, old_sentence in {
        "autonomousw": "The retained label market_capability_growth is a schema category, not a commercial market estimate.",
        "bioengineered": "The retained publication_capability_proxy label is a schema category only.",
        "pandemics": "The retained event_frequency_growth label must not be interpreted as an observed pandemic-frequency estimate.",
    }.items():
        growth_inputs[threat]["limitations"] = growth_inputs[threat]["limitations"].replace(old_sentence, corrected_kinds[threat][1])
    growth_inputs["minerals"]["limitations"] += " The source narrative does not specify exact averaging years or aggregation weights; 0.10 is a rounded reported rate, not an independently reconstructed CAGR."
    rounding_adjustments = []
    for key, entry in entries.items():
        threat, metric = key.split(".")
        for field in BASE_FIELDS:
            require(field in entry, f"{key}: missing {field}")
        require(entry["url"] in registry_urls, f"{key}: source absent from registry")
        require(urlsplit(entry["url"]).scheme in ("https", "http"), f"{key}: invalid URL")
        require(entry["accessed"] == DATE, f"{key}: wrong access date")
        require(entry["strength"] in {"strong", "moderate", "weak", "expert_judgment", "anchored_judgment"}, f"{key}: invalid strength")
        if metric == "growth_rate":
            raw = growth_inputs[threat]
            convention = classes[threat]
            raw["raw_lo"], raw["raw_mu"], raw["raw_hi"] = (round_significant(raw[field]) for field in ("raw_lo", "raw_mu", "raw_hi"))
            raw["serialization_note"] = "Stored raw anchors are rounded to at most four significant digits. Effective values are computed from these stored anchors and rounded to four significant digits; derivation text may display unrounded arithmetic for reproducibility."
            require(raw["multiplier"] == convention["conversion_multiplier"], f"{key}: changed multiplier")
            require(raw["cap"] == convention["cap"], f"{key}: changed cap")
            require(0 <= raw["raw_lo"] <= raw["raw_mu"] <= raw["raw_hi"], f"{key}: raw range")
            for field, raw_field in (("lo", "raw_lo"), ("mu", "raw_mu"), ("hi", "raw_hi")):
                computed = round_significant(max(0.0005, min(math.log1p(raw[raw_field]) * raw["multiplier"], raw["cap"])))
                old = entry[field]
                require(abs(old - computed) <= 0.00010001, f"{key}.{field}: authored {old} vs computed {computed}")
                if old != computed:
                    rounding_adjustments.append({"key": key, "field": field, "authored": old, "serialized": computed})
                entry[field] = computed
            entry.update({"growth_kind": convention["growth_kind"], "risk_conversion": raw["multiplier"],
                          "raw_indicator_growth": raw["raw_mu"], "effective_growth_calibrated": True,
                          "threat_specific_cap": raw["cap"], "do_not_reconvert_mu_lo_hi": True,
                          "capped_hi": entry["hi"] == raw["cap"]})
            require("not" in entry["calibration_note"].lower() and "convert" in entry["calibration_note"].lower(), f"{key}: missing double-conversion warning")
        for field in ("lo", "mu", "hi"):
            require(type(entry[field]) in (float, int) and math.isfinite(entry[field]), f"{key}.{field}: invalid number")
        require(entry["lo"] <= entry["mu"] <= entry["hi"], f"{key}: unordered interval")
        low, high = (0.0005, classes[threat]["cap"]) if metric == "growth_rate" else ((0, 10) if metric == "threshold" else (0, 5))
        require(low <= entry["lo"] <= entry["hi"] <= high, f"{key}: outside range")
        if metric == "threshold":
            require(entry.get("threshold_kind") == "model_anchor", f"{key}: threshold not annotated")
            require(entry["strength"] in {"expert_judgment", "anchored_judgment"}, f"{key}: threshold strength implies direct measurement")

    for source in source_registry:
        for field in ("id", "title", "url", "published", "accessed", "source_type", "findings", "fact_location", "verification_method"):
            require(field in source and source[field] != "", f"Source missing {field}: {source}")
        require(source["accessed"] == DATE, f"Source date: {source['id']}")

    dimensions = {
        "scale": {"range": [0, 5], "unit": "normalized ordinal model score", "meaning": "Potential systemic magnitude of harm if this threat intensifies; severity conditional on adverse development, not event probability."},
        "urgency": {"range": [0, 5], "unit": "normalized ordinal model score", "meaning": "Present-decade action priority from current exposure, warning signs and response lead times."},
        "acceleration": {"range": [0, 5], "unit": "normalized ordinal model score", "meaning": "Evidence for worsening drivers, exposure, capabilities or impacts; persistent high burden alone does not establish accelerating growth."},
        "interdependence": {"range": [0, 5], "unit": "normalized ordinal model score", "meaning": "Breadth and strength of systemic amplification pathways; this scalar does not specify a correlation matrix or a causal network."},
        "irreversibility": {"range": [0, 5], "unit": "normalized ordinal model score", "meaning": "Persistence of damage and difficulty of recovery conditional on severe harm; accounts for recovery, substitution and adaptation where supported."},
        "gov_failure": {"range": [0, 5], "unit": "normalized ordinal model score", "meaning": "Evidence-informed concern about institutional inability to prevent or contain harm; not a numerical probability."},
        "growth_rate": {"range": [0.0005, 0.05], "unit": "per year, calibrated effective systemic pressure proxy", "meaning": "Model growth parameter after log1p mapping and threat-specific capping. 0.02 is approximately 2 percent per year of modeled pressure, not a 2 percent annual catastrophe probability."},
        "threshold": {"range": [0, 10], "unit": "normalized destabilization model anchor", "meaning": "Analyst-chosen critical level in the dashboard's abstract score space; lower values make crossing easier for fixed pressure. A high threshold is not an additional severity score."},
    }
    ordered = {f"{threat}.{metric}": entries[f"{threat}.{metric}"] for threat in THREATS for metric in METRICS}
    changes = []
    for key, entry in ordered.items():
        changed = {field: {"previous": baseline[key][field], "new": entry[field]} for field in ("lo", "mu", "hi") if baseline[key][field] != entry[field]}
        if changed:
            changes.append({"key": key, "changes": changed})
    meta = {
        "schema_version": "1.8.0", "dataset_version": "1.8.0", "generated": DATE, "evidence_cutoff": DATE,
        "description": "Fresh evidence-informed Apocalypse Clock parameter assessment for 23 systemic threats. Observations, projections and analyst mappings are distinguished. The flat source-map interface and safe-calibrated growth contract are preserved.",
        "parameter_count_excluding_meta": 184, "threat_count": 23, "metrics_per_threat": 8,
        "threats": THREATS, "metrics": METRICS,
        "entry_fields": sorted({field for entry in entries.values() for field in entry}),
        "dimensions": dimensions,
        "strength_values": {
            "strong": "High-quality evidence closely supports the specific quantity; institutional prestige alone does not validate an ordinal score.",
            "moderate": "Credible relevant evidence supports the direction and approximate severity, with inferential numerical mapping.",
            "weak": "Indirect, incomplete, heterogeneous or strongly biased evidence with limited support for the chosen mapping.",
            "expert_judgment": "Analyst/model judgment without a direct source anchor; does not imply that a human expert panel was consulted.",
            "anchored_judgment": "Explicit analyst/model judgment anchored to named retrieved evidence; the source does not itself estimate this model parameter."},
        "scoring_method": {
            "assessment_type": "AI-assisted analytical elicitation, not statistical fitting to observed systemic-collapse outcomes",
            "model": "gpt-6-astra", "reasoning_effort": "ultra", "research_workers": 3,
            "central_values": "Rational evidence-based judgments were made afresh. No target headline year, automatic upward revision or preservation of old scores was imposed.",
            "ordinal_rubric": {"0": "Minimal relevance on the specific dimension", "1": "Low or mainly local relevance", "2": "Material regional or sectoral relevance", "3": "Major multiregional or several-sector relevance", "4": "Severe global relevance or extensive coupling, persistence or governance shortfall", "5": "Extreme, broad global relevance supported on the specific dimension"},
            "rubric_application": "Apply scale to magnitude; urgency to lead time and current need; acceleration to directional change; interdependence to transmission; irreversibility to recovery; governance to institutional gaps. Fractional scores interpolate the anchors and are analyst choices.",
            "interval_interpretation": "lo and hi are analyst lower and upper plausibility anchors for epistemic uncertainty. They are not empirical confidence intervals, calibrated posterior credible intervals, guaranteed quantiles or hard physical limits.",
            "sampling_contract": "The current dashboard treats interval widths approximately as 90-percent widths when fitting beta/log-normal samples. This is a downstream modeling convention; no calibrated 90-percent coverage is claimed here.",
            "aleatoric_epistemic_separation": "This file describes parameter uncertainty. Stochastic event arrivals and regime transitions are generated by the dashboard. Shared evidence and systemic dependencies preclude treating all inputs as empirically independent.",
            "threshold_identification": "Published evidence anchors failure pathways. It does not identify the 0-10 threshold or a common calendar-time failure scale across threats; thresholds remain explicit model conventions.",
            "methodology_reference": "https://www.oecd.org/en/publications/handbook-on-constructing-composite-indicators-methodology-and-user-guide_9789264043466-en.html"},
        "growth_mode": "safe_calibrated_effective_growth", "do_not_reconvert_growth_rate_mu_lo_hi": True,
        "calibration_method": "For each raw plausibility anchor r: effective=max(0.0005,min(log1p(r)*conversion_multiplier,threat_specific_cap)), rounded to four significant digits. r is a dimensionless annual fractional indicator/proxy growth; all output mu/lo/hi are already effective growth. Multipliers and caps are inherited compatibility conventions, not estimated causal coefficients.",
        "growth_rate_calibration_classes": classes,
        "growth_kind_policy": "The structured entry growth_kind and corresponding calibration class name identify the actual pressure proxy. Seven labels were aligned to revised indicators rather than retaining misleading market, publication, event-frequency or old proxy labels. Factors and caps remain fixed; type labels do not authorize converting calibrated mu/lo/hi again.",
        "raw_basis_definitions": {"observed_indicator": "A rate derived from, or reported for, a retrieved indicator. The underlying series may be estimated, rounded or coverage-biased; it is not observed systemic-risk growth.", "judgmental_proxy": "An analyst-selected scenario-pressure rate anchored to evidence, not a measured growth series.", "reported_estimate_proxy": "Change in published estimates materially affected by reassessment; it must not be interpreted as identified physical year-on-year growth."},
        "growth_kind_changes": kind_changes,
        "growth_calibration": {"mode": "safe_calibrated_effective_growth", "formula": "max(0.0005,min(log1p(raw_growth)*risk_conversion,threat_specific_cap))", "positive_floor": 0.0005, "conversion_multiplier_source": "_meta.growth_rate_calibration_classes[threat].conversion_multiplier", "threat_specific_cap_source": "_meta.growth_rate_calibration_classes[threat].cap", "do_not_reconvert_growth_rate_mu_lo_hi": True,
            "limitations": "The positive-growth legacy interface cannot encode sustained recovery or negative effective growth. Flat or declining observed indicators must be disclosed in the audit; any positive floor or scenario pressure is a model convention. Uncertainty in conversion factors, caps and the functional mapping is structural and not fully propagated by lo/hi."},
        "growth_inputs": {threat: growth_inputs[threat] for threat in THREATS},
        "source_selection": {"cutoff": DATE, "policy": "Prefer current primary scientific or official institutional assessments; retain older foundational research when it supplies stronger or unique evidence. Read selected source content, not search snippets alone.", "scope": "Targeted cross-domain evidence review; not an exhaustive systematic review or a claim that no newer source exists.", "verification": "Source records identify retrieved content and location. A working source and a supported observation do not validate an analyst's exact score.", "unique_urls": len(registry_urls)},
        "source_registry": source_registry,
        "compatibility": {"format": "flat threat.metric source map; _meta first", "entry_extensions": "Retains 1.7.1 threat_specific_cap and do_not_reconvert fields plus threshold annotations. These intentional extensions supersede the supplied prompt's obsolete exact 1.5 field list.", "application_changes": "None. This standalone artifact is loadable as a custom source map; it is not embedded, deployed or selected as the application's default.", "engine_nominal_bounds": {"ordinal": [1, 5], "threshold": [4.5, 12], "growth_rate": [0.0005, 0.25]}, "engine_interpretation": "Process classes, network, weights, time origin, scenario rules and sampling remain those of the separately versioned dashboard. The regime horizon does not directly use growth_rate. Source dates do not reset the engine's time origin."},
        "revision_record": {"version": "1.8.0", "based_on_structure": REFERENCE.name, "reference_sha256": digest(REFERENCE), "request_prompt_sha256": digest(PROMPT), "scope": "New evidence and numerical analytical assessment; not metadata-only", "numeric_parameter_change_count": len(changes), "numeric_changes": changes, "formula_rounding_adjustments": rounding_adjustments},
        "research_notes": research_notes,
        "validation_rules": ["Exactly 23 threats times 8 metrics, plus _meta", "Strict JSON, unique keys, finite numbers, no nulls", "Every lo <= mu <= hi and within documented bounds", "Every entry has a retrieved source in source_registry and an ISO access date", "All growth inputs reproduce output triplets with the documented transform and rounding", "Every threshold is an analyst model anchor", "Passing structural and runtime checks does not establish predictive validity"],
    }
    result = {"_meta": meta, **ordered}
    inspect_tree(result)
    write(OUTPUT, result)
    require(read(OUTPUT) == result, "Round-trip serialization mismatch")
    summary = {"dataset": OUTPUT.name, "sha256": digest(OUTPUT), "parameters": len(entries), "threats": len(THREATS), "unique_source_urls": len(registry_urls), "strength_counts": dict(collections.Counter(e["strength"] for e in entries.values())), "growth_basis_counts": dict(collections.Counter(g["raw_basis"] for g in growth_inputs.values())), "changed_parameters": len(changes), "changed_central_values": sum(baseline[k]["mu"] != v["mu"] for k, v in entries.items()), "formula_rounding_adjustments": rounding_adjustments, "structural_validation": "PASS", "scientific_status": "Evidence-informed heuristic inputs; not empirically validated catastrophe probabilities or forecasts"}
    write(HERE / "validation.json", summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
