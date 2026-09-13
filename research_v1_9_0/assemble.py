"""Reproducibly assemble the authorized functional revision and equal HTML embeds."""
from __future__ import annotations
import collections
import copy
import hashlib
import json
import re
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
BASELINE = ROOT / "data_v1_8_0_evidence_revision.json"
OUTPUT = ROOT / "data_v1_9_0_functional.json"
DATE = "2026-09-09"
KINDS = {"near_flat": [0.0005, 0.003, 0.015], "slow": [0.001, 0.01, 0.025], "moderate": [0.003, 0.02, 0.04], "rapid": [0.006, 0.03, 0.05]}
SERVICES = {"ecological_life_support": "Ecological and climatic regulation", "food_water": "Food and usable-water provision", "health_care": "Infection control and health-care continuity", "coordination_exchange": "Coordination, information and exchange", "critical_infrastructure": "Essential technical infrastructure"}

def read(path):
    def pairs(items):
        result = {}
        for key, value in items:
            assert key not in result, f"Duplicate key {key}"
            result[key] = value
        return result
    return json.loads(path.read_text(encoding="utf-8-sig"), object_pairs_hook=pairs)

def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8", newline="\n")

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    base = read(BASELINE)
    env = read(HERE / "environment_revision.json")
    society = read(HERE / "society_tech_revision.json")
    incoming = read(HERE / "incoming_vulnerability_revision.json")
    ids, metrics = base["_meta"]["threats"], base["_meta"]["metrics"]
    entries = {key: copy.deepcopy(value) for key, value in base.items() if key != "_meta"}
    for fragment in (env["entry_overrides"], incoming["entry_overrides"]):
        for key, value in fragment.items():
            assert key in entries
            entries[key].update(value)
            entries[key].pop("integration_condition", None)
    refs = copy.deepcopy(base["_meta"]["source_registry"]) + env["source_registry"]
    refs.append({"id": "nist_functional_resilience", "title": "NIST, Development and Implementation of the Community Resilience Planning Guides", "url": "https://www.nist.gov/community-resilience/planning-guide", "published": "live institutional guide page", "accessed": DATE, "source_type": "institutional_methodology", "findings": "Functionality, dependencies and recovery goals inform resilience planning. This guide supplies no global-collapse score, coupling coefficient or forecast date.", "fact_location": "Planning-guide overview and six-step planning process", "verification_method": "web_open"})
    registry = {item["id"]: item for item in refs}
    registry_urls = {item["url"] for item in refs}
    source_by_url = {item["url"]: item for item in refs}
    # Freeze the original named dependency graph as the auditable starting point.
    code = "const fs=require('fs'),vm=require('vm');const a=fs.readFileSync('backups/pre-functional-cascade-2026-09-09/src/app.js','utf8');const s=a.slice(a.indexOf('const THREAT_SPECS ='),a.indexOf('let THREATS ='));process.stdout.write(JSON.stringify(vm.runInNewContext(s+';THREAT_SPECS')));"
    specs = {item["id"]: item for item in json.loads(subprocess.check_output(["node", "-e", code], cwd=ROOT, text=True))}
    dependencies = {risk: set(specs[risk]["deps"]) for risk in ids}
    # Do not let overlapping ecosystem markers create an artificial reciprocal loop.
    removed = [("oceans", "climate"), ("oceans", "biodiversity"), ("biodiversity", "oceans"), ("oceans", "pollution")]
    for upstream, target in removed:
        dependencies[target].discard(upstream)
    edges = copy.deepcopy(env["directed_dependency_recommendations"])
    edges.append({"upstream": "oceans", "target": "supply", "mechanism": "Loss of marine food production disrupts food-provision chains; trade, dietary substitution and aquaculture are potential buffers, not guaranteed complete replacement.", "source_ids": ["fao_sofia_2026"], "evidence_strength": "mechanism_supported", "coefficient_status": "not_empirically_estimated"})
    for edge in edges:
        dependencies[edge["target"]].add(edge["upstream"])
    nodes, growth_inputs = {}, {}
    for risk in ids:
        if risk in env["growth_class_recommendations"]:
            recommendation = env["growth_class_recommendations"][risk]
            profile = env["functional_profiles"][risk]
            kind = recommendation["growth_class"]
            source = registry[recommendation["source_ids"][0]]
        else:
            recommendation = society["growth_class_recommendations"][risk]
            profile = recommendation
            kind = recommendation["intensity_class"]
            source = source_by_url[recommendation["source_url"]]
        cap = base[f"{risk}.growth_rate"]["threat_specific_cap"]
        lo, mu, hi = KINDS[kind]
        hi, mu = min(hi, cap), min(mu, cap)
        assert lo <= mu <= hi
        entries[f"{risk}.growth_rate"] = {
            "mu": mu, "lo": lo, "hi": hi, "source": source["title"], "url": source["url"], "accessed": DATE,
            "strength": "anchored_judgment", "note": recommendation["reason"],
            "growth_kind": "conditional_autonomous_functional_pressure_growth", "risk_conversion": 1,
            "effective_growth_calibrated": True, "threat_specific_cap": cap, "do_not_reconvert_mu_lo_hi": True, "capped_hi": hi == cap,
            "calibration_note": "Direct effective pressure prior, not measured indicator growth. The legacy calibrated flag means already in engine units, NOT empirical calibration. No log1p, indicator CAGR or legacy multiplier is applied. Do not reconvert. Positive-only continued-pressure scenarios omit endogenous recovery; lo/hi are plausibility anchors, not guaranteed quantiles."}
        growth_inputs[risk] = {"class": kind, "lo": lo, "mu": mu, "hi": hi, "cap": cap, "basis": "conditional_scenario_judgment", "reason": recommendation["reason"], "source_ids": recommendation["source_ids"], "role": "Growth of autonomous latent pressure; susceptibility to dependency loss can evolve even when an independent process year is censored. Retained event/regime arrival models remain separate heuristic assumptions."}
        deps = sorted(dependencies[risk])
        weight = 1 / len(deps) if deps else 0
        node = {"functional_weight": profile["criticality_tier"], "critical_services": profile["service_groups"],
                "functional_failure": profile["functional_failure"], "functional_overlap_group": "ecosystem_integrity" if risk in ("oceans", "biodiversity") else risk,
                "functional_inducible": risk not in ("nuclear", "bioengineered", "pandemics", "autonomousw"),
                "dependency_weights": {dep: weight for dep in deps}, "dependency_lags": {dep: 1 for dep in deps}}
        nodes[risk] = node
        threshold = entries[f"{risk}.threshold"]
        threshold.update(node)
        threshold["threshold_kind"] = "model_anchor"
        if risk not in env["scope"]:
            threshold["note"] = profile["functional_failure"] + " The normalized numeric anchor is an explicit model convention, not a source-estimated physical threshold."
        threshold["model_anchor_note"] = "Functional impairment boundary, not extinction or destruction of all components. Different threat types do not share an empirically identified calendar-time failure scale."
        assert node["functional_weight"] in (1, 2, 3)
        assert set(node["critical_services"]) <= SERVICES.keys()
        assert risk not in deps and set(deps) <= set(ids)
    for service in SERVICES:
        members = [risk for risk, node in nodes.items() if service in node["critical_services"]]
        assert len(members) >= 3 and len({nodes[risk]["functional_overlap_group"] for risk in members}) >= 2
    definitions = copy.deepcopy(base["_meta"]["dimensions"])
    definitions["interdependence"]["meaning"] = "Incoming functional vulnerability of the target to documented upstream losses; not source outgoing importance. Coupling coefficients are separately explicit model conventions."
    definitions["growth_rate"]["meaning"] = "Conditional annual relative growth of autonomous latent functional pressure; direct scenario prior, not measured risk, indicator CAGR, mortality growth or catastrophe probability."
    definitions["growth_rate"]["unit"] = "per year, dimensionless latent functional-pressure growth prior"
    changes = {key: {field: {"previous": base[key][field], "new": entry[field]} for field in ("lo", "mu", "hi") if base[key][field] != entry[field]} for key, entry in entries.items()}
    changes = {key: value for key, value in changes.items() if value}
    meta = {
        "schema_version": "1.9.0", "dataset_version": "1.9.0", "generated": DATE, "evidence_cutoff": DATE,
        "model_compatibility": "Apocalypse Clock v1.2.8; legacy importers may ignore functional fields and must not be assumed to implement this model",
        "description": "Functional-pressure and directed-dependency revision. Loss of critical functions can precede disappearance of organisms or assets. Sources anchor mechanisms; numerical model mappings remain transparent judgments.",
        "threats": ids, "metrics": metrics, "threat_count": 23, "metrics_per_threat": 8, "parameter_count_excluding_meta": 184,
        "dimensions": definitions, "strength_values": base["_meta"]["strength_values"],
        "assessment_status": "AI-assisted, evidence-anchored scenario model; not independently expert-elicited, peer reviewed, empirically calibrated or predictively validated",
        "research_model": "gpt-6-astra", "reasoning_effort": "ultra",
        "growth_mode": "direct_effective_functional_pressure_prior", "do_not_reconvert_growth_rate_mu_lo_hi": True,
        "growth_prior_classes": {key: dict(zip(("lo", "mu", "hi"), value)) for key, value in KINDS.items()},
        "growth_prior_definition": "Four shared orders of continued-pressure intensity chosen before inspecting new output years. The class numbers are model hypotheses, not measurements. Per-threat historical caps are retained numerical safeguards, not empirical ceilings.",
        "growth_inputs": growth_inputs,
        "growth_rate_calibration_classes": {risk: {"growth_kind": "conditional_autonomous_functional_pressure_growth", "conversion_multiplier": 1, "cap": nodes_cap["threat_specific_cap"]} for risk in ids for nodes_cap in [entries[f"{risk}.growth_rate"]]},
        "calibration_method": "Direct effective prior: no conversion from observed indicators. The legacy effective_growth_calibrated boolean is an execution guard only.",
        "interval_semantics": "lo/hi are analyst plausibility anchors. Existing beta/log-normal samplers approximate 90-percent widths; coverage is not calibrated, asymmetric endpoints are not hard bounds, and cap/clamp operations can alter sampled means. mu is a central judgment, not a guaranteed post-clamp median.",
        "threshold_semantics": "Dimensionless functional-failure anchors; the engine constrains sampled thresholds to7.8-9.2. Input plausibility widths can be wider. No empirical global-collapse threshold or common calendar-time estimand is asserted.",
        "functional_model": {
            "version": "1", "nodes": nodes, "services": SERVICES,
            "state": "First functional-threshold activation is recorded as an absorbing event marker. It does not mean zero biomass, literal total service loss or permanent physical collapse; event duration and restoration are outside this first-passage model.",
            "susceptibility": "q_i(t)=clamp((baseScore_i*domainMultiplier_i/threshold_i)*(1+g_i)^(max(0,t-2026)),0,1). The pre-network score avoids reusing the baseline depFactor in this pressure term.",
            "capacity_loss": "D_i(t)=sum_j a_ij*I(firstActivation_j+lag_ij<=t); kappa_i=((interdependence_i-1)/4)*(0.5+0.5*(gov_failure_i-1)/4). Eligible target activates if q_i+kappa_i*D_i>=1 with positive incoming influence.",
            "edge_weights": "Equal fixed shares among each target's declared upstream pathways (sum1); mechanism presence is not evidence for equal causal strength. Weights do not change with sampled priorities. Missing pathways and coefficient uncertainty remain structural limits.",
            "timing": "Each declared edge uses a one-year lag as an explicit resolution assumption, not a measured physical delay. Zero- and five-year alternatives are tested. Within-year zero-lag paths use synchronous least-fixed-point closure, never an arbitrary three-wave limit.",
            "aggregation": "S(t)=max(global fixed-criticality active share, maximum essential-service active share). Cross when S>=selected cascadeThreshold (default0.5). No three-domain, co-active-edge or induced-share veto. This is a functional-disruption trigger after propagation, not proof of completed global collapse.",
            "weight_rubric": {"1": "Primarily a systemic amplifier", "2": "Major partial function disruption with meaningful alternatives", "3": "Broad essential function with limited substitutes"},
            "weight_interpretation": "Fixed consequence tiers, not probabilities, GDP shares, sampled salience or empirically optimized coefficients. Healthy functions cannot compensate away threshold loss in another essential-service basket.",
            "overlap_policy": "Oceans and biodiversity share ecosystem_integrity. Within every basket, use the maximum member weight and maximum activated member weight, not their sum. Both nodes remain in the network and all outputs. Other category overlap is possible; the grouping is an explicit approximation.",
            "initiating_event_policy": "Nuclear conflict, engineered biological events, pandemics and autonomous-weapons escalation require their modeled initiating event. Generic loss of capacity does not deterministically create that event. These four nodes remain in all spontaneous processes and aggregations and can transmit after activation. Additional hazard-specific causal pathways are not empirically fitted here; they are not claimed physically impossible.",
            "background_coupling_limit": "Independent horizon models retain their pre-existing background depFactor. Dynamic loss represents additional conditional capacity loss beyond the background trajectory. This separation and the retained event/regime hazard equations have not been empirically identified.",
            "reviewed_edges": edges, "removed_legacy_edges": [{"upstream": upstream, "target": target, "reason": "Avoid overlap-driven reciprocal amplification or unsupported inference from marine biomass to climate/pollution failure."} for upstream, target in removed],
            "other_edges": "Other original topology edges are retained scenario hypotheses, not newly verified causal coefficients."
        },
        "source_selection": {"cutoff": DATE, "policy": "Current primary and institutional evidence plus relevant foundational research. Targeted review, not a systematic survey.", "unique_urls": len(registry_urls)},
        "source_registry": sorted(refs, key=lambda x: x["url"]),
        "revision_record": {"previous_dataset": BASELINE.name, "previous_sha256": digest(BASELINE), "numeric_changes": changes, "numeric_changed_parameters": len(changes), "no_target_date": True, "reference_only": "Prior indicator CAGR calculations remain in the archived1.8.0 file. They are not active growth inputs in1.9.0."},
        "scientific_limitations": ["No empirical calibration of ordinal scores, calendar horizons, hazard functions, coupling weights or loss thresholds.", "Positive-only growth scenarios cannot encode endogenous recovery; scenario controls and sensitivity runs represent alternatives imperfectly.", "A functional-threshold marker is binary, not a measured fraction of service output; weighted fractions refer to model components only.", "Service baskets and overlap groups remain coarse hypotheses; inspect global-only and equal-weight sensitivity rather than treating the headline as uniquely identified.", "Source verification and passing tests do not establish scientific or predictive validity."]
    }
    assert len(entries) == 184
    for key, entry in entries.items():
        assert entry["url"] in registry_urls, (key, entry["url"])
        assert entry["lo"] <= entry["mu"] <= entry["hi"]
        assert entry["strength"] == "anchored_judgment"
        if key.endswith("growth_rate"):
            assert "raw_indicator_growth" not in entry
    write(OUTPUT, {"_meta": meta, **entries})
    payload = OUTPUT.read_text(encoding="utf-8").rstrip()
    for name in ("index.html", "404.html"):
        target = ROOT / name
        html = target.read_bytes().decode("utf-8")
        html, count = re.subn(r'(<script id="bundledSources" type="application/json">)[\s\S]*?(</script>)', lambda m: m[1] + "\n" + payload + "\n" + m[2], html)
        assert count == 1
        if './src/cascade-model.js' not in html:
            html = html.replace('<script src="./src/app.js"></script>', '<script src="./src/cascade-model.js"></script>\n<script src="./src/app.js"></script>')
        target.write_bytes(html.encode("utf-8"))
    report = {"dataset": OUTPUT.name, "sha256": digest(OUTPUT), "schema": "1.9.0", "parameters": len(entries), "sources": len(registry_urls), "changed_numeric_parameters_vs1_8_0": len(changes), "functional_profiles": len(nodes), "growth_classes": dict(collections.Counter(x["class"] for x in growth_inputs.values())), "status": "PASS: assembly checks; full application verification recorded separately"}
    write(HERE / "validation.json", report)
    print(json.dumps(report, indent=2))

if __name__ == "__main__":
    main()
