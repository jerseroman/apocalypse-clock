"""Mechanical update of current UI labels; leaves archived data files untouched."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
changes = {
    'Last update: 16 May 2026 11:31 CEST Version 1.2.7': 'Local revision: 12 September 2026 · Model 1.2.8 · Data 1.9.0',
    'A cascade is triggered only when cross-domain activation, accumulated systemic mass, dependency transmission and induced secondary activation jointly pass the selected threshold.': 'Directed functional losses propagate when pressure plus loss of supporting capacity reaches a target threshold. A single seed may spread; the aggregate uses global or essential-service criticality shares.',
    'cascade if activeDomains ≥ 3  transmissionShare ≥ .25  activeMass ≥ cascadeThreshold  .18·transmissionShare + .10·inducedMass ≥ .06': 'target: qᵢ(t) + κᵢΣⱼaᵢⱼAⱼ(t−lagᵢⱼ) ≥ 1; trigger: max(global share, essential-service shares) ≥ cascadeThreshold',
    'data_v1_7_1metadata_revision.json': 'data_v1_9_0_functional.json',
    'Primary Calibrated JSON': 'Primary Functional JSON',
    'source-calibrated input parameters': 'evidence-informed scenario assumptions',
    'The pessimistic 90th percentile of the Dynamic cascade crossing distribution. This is the same rule used for the large highlighted headline year. A narrow P50 to P90 window is a structural feature of this model, not a calibration error: the cascade trigger is a tipping-point rule that requires multiple conditions to align at once (active mass, transmission share, all domains active). Once the system tips, it tips rapidly across most simulations. This mirrors the catastrophic regime-shift literature (Scheffer et al. 2009, Nature), where complex systems often show long tails of stability followed by rapid collapse.': 'The 90th percentile of functional-disruption crossing times after directed propagation. A single initial failure can spread. The trigger uses fixed criticality weights globally or within an essential-service basket. This is not a physical tipping point, worst-case bound or calibrated collapse forecast. A narrow interval alone does not validate the model.',
    'A cascade requires cross-domain activation, accumulated systemic mass, dependency transmission and induced secondary activation — not one threat alone.': 'A single initial functional failure can spread through directed dependencies. The trigger uses fixed criticality weights globally or within an essential-service basket; neither extinction of all organisms nor initial failure in every domain is required.',
    'per-threat calibrated thresholds anchored to a common': 'per-threat judgment-based thresholds anchored to a common',
    'calibrated thresholds are constrained to': 'thresholds are constrained to',
    'It is a model input calibrated from evidence and judgment': 'It is a judgment-based model input informed by evidence',
    'growth_rate and threshold remain calibrated model fields.': 'growth_rate and threshold remain judgment-based model fields.',
}
for name in ['src/app.js', 'index.html', '404.html']:
    path = ROOT / name
    content = path.read_text(encoding='utf-8')
    # Source metadata is preserved exactly, independent of presentation wording.
    if name.endswith('.html'):
        start = content.index('<script id="bundledSources"')
        stop = content.index('</script>', start) + len('</script>')
        parts = [content[:start], content[start:stop], content[stop:]]
        for idx in [0, 2]:
            for old, new in changes.items():
                parts[idx] = parts[idx].replace(old, new)
        content = ''.join(parts)
    else:
        for old, new in changes.items():
            content = content.replace(old, new)
    path.write_text(content, encoding='utf-8', newline='\n')
print('Updated current UI labels in app and both HTML pages.')
