# Contributing

Apocalypse Clock is an experimental, publicly available, browser-based systemic-risk dashboard. It is not peer reviewed, and its outputs must be treated as model-derived scenario outputs, not predictions.

Contributions are welcome when they improve transparency, correct technical defects, improve sources, clarify methodology, or make the repository easier to review. Changes must respect the governance files in `ai-governance/`.

## Ways to Contribute

### Bugs

Use the technical bug issue template when reporting:

- broken controls, charts, exports, or links;
- browser-specific rendering problems;
- JavaScript errors or console warnings;
- accessibility or keyboard-navigation problems;
- local validation failures.

Include the affected page or section, browser and operating system, reproduction steps, expected behavior, actual behavior, and screenshots or console logs when useful.

### Source Updates

Use the source correction issue template for outdated, broken, questionable, superseded, or better sources.

State the affected threat category, metric, parameter, or dataset entry. Include the current source, the proposed replacement source, and whether the change is source metadata only or may require recalibration.

Source updates that touch only URLs or source metadata are not automatically model changes. Updates that imply different `mu`, `lo`, `hi`, `threshold`, `growth_rate`, taxonomy, or interpretation values require explicit review as DATASET or MODEL work.

### Audits

Audits are most useful when they are specific and reproducible. Please identify:

- the exact file, function, metric, or output being audited;
- the current behavior;
- the suspected issue;
- why it matters for interpretation or validation;
- any calculations, references, or screenshots supporting the concern.

Numerical or methodological audits should distinguish between communication issues and changes that would alter model outputs.

### Methodology Comments

Use the model or methodology issue template for concerns about assumptions, thresholds, dependencies, uncertainty, scenario logic, aggregation, interpretation, or presentation of model outputs.

The project does not claim scientific consensus or peer review. Methodology comments should be framed as review, critique, clarification, or proposed research direction unless they include an independently verified correction.

### Pull Requests

Before opening a pull request:

1. Read `ai-governance/change-policy.md`, `ai-governance/protected-paths.md`, and `ai-governance/model-invariants.md`.
2. Classify the change as COSMETIC, LOGIC, MODEL, or DATASET.
3. Keep the edit as small as possible.
4. Do not mix unrelated change classes in one PR.
5. Run the applicable validation commands.
6. Record the change in `ai-governance/review-log.md` when the change is accepted for the repository.

Do not change protected model or dataset values casually. The following are protected and require explicit authorization and review:

- `mu`, `lo`, and `hi` values;
- threshold values;
- `growth_rate` fields and growth-rate interpretation;
- headline logic and the `Dynamic Cascade P90` identifier;
- model functions and constants listed in `ai-governance/protected-paths.md`;
- dataset values and embedded dataset copies.

## Validation Commands

Run these from the repository root:

```bash
npm run check:js
npm run validate:data
npm run check:links
npm run test:smoke
```

For DATASET changes with added or replaced URLs, also run the live link check when appropriate:

```bash
LIVE_LINK_CHECK=1 npm run check:links
```

On Windows PowerShell, use `npm.cmd` instead of `npm` if script execution policy blocks `npm.ps1`.

```powershell
npm.cmd run check:js
npm.cmd run validate:data
npm.cmd run check:links
npm.cmd run test:smoke
```

## Interpretation Standard

Public wording should preserve these boundaries:

- model output is not a prediction;
- `Dynamic Cascade P90` is the 90th percentile of a simulated Dynamic-cascade onset-year distribution under current assumptions, not a collapse date or deterministic forecast;
- thresholds are analytical anchors, not physical tipping points;
- the dataset is AI-assisted and not independently peer reviewed;
- independent source verification, methodological audit, and domain-expert review remain necessary.
