# Apocalypse Clock v1.2.9 — domain functional-horizon correction

Version **1.2.9** uses the unchanged dataset **1.9.0**, [data_v1_9_0_functional.json](./data_v1_9_0_functional.json), and the directed functional first-failure engine in [src/cascade-model.js](./src/cascade-model.js). Domain cards now use the same propagated functional-loss estimand as the headline, restricted only at the reporting basket; regime processes now respond to sampled latent-pressure growth instead of a separate growth-blind geometric clock.

A single initial failure can propagate into initially right-censored targets. Fixed criticality weights, essential-service baskets, one-year dependency lags and explicit overlap grouping replace the former three-domain/transmission veto. Functional failure does not require disappearance of all organisms. The headline is a **functional-disruption threshold after propagation**, not a calibrated prediction of completed global collapse. Parameter scores, growth priors and coupling coefficients remain transparent model judgments.

The original dataset files remain unchanged. The model-1.2.9 baseline is reproducible with the fixed seed: Dynamic Cascade P10/P50/P90 is 2033/2036/2042; domain functional P50 values are civilization 2045, biosphere 2036 and technology 2040. These are conditional model quantiles, not validated dates of completed collapse. The immediate pre-change files and baseline-commit record are preserved outside the repository in `C:/Users/error/Desktop/Apocalypse Clock backups/pre-domain-functional-fix-20260913`.

The dataset's `_meta.model_compatibility` value remains 1.2.8 because that is the earliest application version implementing its functional fields. Model 1.2.9 changes the calculation engine and presentation, not the dataset payload or dataset version.

Live application: https://jerseroman.github.io/apocalypse-clock/

Apocalypse Clock is a static, browser-based systemic-risk dashboard for exploring interacting global threats across civilizational, biospheric, and technological domains. It combines scenario controls, Monte Carlo uncertainty sampling, dependency-aware aggregation, Weibull horizon diagnostics, network analysis, and exportable model outputs in a client-side application. The dashboard is driven by a structured JSON dataset that serves as the primary data input source for the model.

> **Statement**  
> Apocalypse Clock was created to show the broader public not only individual threats, but the wider structure of potential civilizational dangers: their origins, interconnections, and the    possibility that isolated risks may develop into systemic crises.  
>  
> [Read the Statement](Statement.md)


## Project Structure

- `index.html` - application entry point, page shell, and embedded dataset copy.
- `404.html` - GitHub Pages fallback route with the same embedded dataset copy.
- `data_v1_9_0_functional.json` - active local functional-pressure dataset.
- `data_v1_7_1metadata_revision.json`, `data_v1_8_0_evidence_revision.json` - preserved historical inputs.
- `src/cascade-model.js` - pure directed functional-cascade engine.
- `src/app.js` - model logic, simulation workflow, rendering, exports, and initialization.
- `src/action-delegation.js` - early UI action delegation.
- `src/aria-status.js` - accessibility status helper.
- `src/styles.css` - application styles.
- `tests/` - Playwright smoke, unit-contract, and headline-determinism regression tests.
- `scripts/` - repository validation scripts for JavaScript syntax, dataset integrity, and link format checks.
- `docs/` - public methodology, scope, validation, limitations, and change-class documentation.
- `ai-governance/` - internal change policy, protected paths, model invariants, validation checklist, methodological review, and review log.
- `.github/ISSUE_TEMPLATE/` - structured GitHub issue templates for bugs, methodology concerns, and source corrections.
- `.github/pull_request_template.md` - governance-aware pull request checklist.
- `.github/workflows/validate.yml` - GitHub Actions validation workflow.
- `vendor/echarts.bundle.js` - local ECharts runtime.
- `vendor/cytoscape.bundle.js` - local Cytoscape runtime.
- `Statement.md` - project statement.
- `CITATION.cff` - citation metadata for academic, public, and review references.
- `.zenodo.json` - Zenodo archival and release metadata.
- `NOTICE.md` - attribution, source-availability, and third-party notice.
- `CHANGELOG.md` - public version and dataset change history.
- `CONTRIBUTING.md` - contribution and review guidance.
- `SECURITY.md` - security, integrity, and responsible-reporting guidance.
- `LICENSE` - source-available non-commercial fork license.
- `package.json` and `package-lock.json` - Node/Playwright validation dependencies and scripts.
- `playwright.config.js` - Playwright test-server configuration.
- `.nojekyll` - disables Jekyll processing on GitHub Pages.
- `.gitattributes` - line-ending and text-file handling rules.
- `.gitignore` - ignored local and system files.

## Dataset

The model uses a structured JSON parameter dataset as its primary input source.

Current dataset:

- [`data_v1_9_0_functional.json`](./data_v1_9_0_functional.json)

This file contains dataset v1.9.0: 23 threat categories and 8 metrics per threat, 184 parameter entries, 23 functional profiles and a registry of 61 primary/institutional source URLs. The review is targeted, not systematic.

Unlike historical v1.7.1, this is an explicitly authorized numerical and methodological revision. It is not empirical recalibration: growth priors describe conditional latent functional pressure, not observed-indicator CAGR.

**Important:** This revision is AI-assisted. Source review and passing software tests do not constitute scientific peer review, expert elicitation or predictive validation. Independent domain assessment and calibration remain necessary for consequential use.

Multiple AI model JSON presets are included as comparison and audit inputs. They were used to compare how different AI systems assess the same risk parameters and to observe the average spread between their estimates. These AI-generated estimates have not been independently audited and should not be treated as scientific validation. Notably, the different AI systems produced broadly similar assessments across many parameters, which makes the comparison useful as a consistency check, but not as a substitute for expert review.
<p align="left">
  <img src="https://i.ibb.co/zhSrMYGJ/datajson.jpg" alt="JSON dataset overview" width="720">
</p>

### AI preset transparency

Each AI model preset is documented with two linked records where available: the generated JSON preset and the corresponding shared AI chat or conversation record showing how the preset was produced.

These links are provided for transparency and auditability. They allow reviewers to inspect not only the final JSON output, but also the AI-assisted generation process behind each preset. The presets should be interpreted only as comparison and consistency-check inputs, not as scientific validation, expert consensus, or independently verified risk assessment.

| AI model | JSON preset | Shared chat / conversation |
|---|---|---|
| Meta AI | [JSON preset](presets/MetaAI.data.json) | [Shared conversation](https://www.meta.ai/share/BJ58mD1g4ib) |
| DeepSeek | [JSON preset](presets/DeepSeek-V4Preview.data.json) | [Shared conversation](https://chat.deepseek.com/share/z0hekl5ix3yszqlb0q) |
| Gemini | [JSON preset](presets/Gemini3.1.data.json) | [Shared conversation](https://gemini.google.com/share/ba734236ef06) |
| GPT | [JSON preset](presets/gpt5.5.data.json) | [Shared conversation](https://chatgpt.com/share/69f666b6-db54-83eb-aff9-dcc35b0b626e) |
| Claude | [JSON preset](presets/claude.opus4.7.data.json) | [Shared conversation](https://claude.ai/share/33f155da-4c3b-44b9-b6fc-99a7f9dcfa52) |
| Grok | [JSON preset](presets/Grok4.20.data.json) | [Shared conversation](https://grok.com/share/c2hhcmQtMi1jb3B5_be361e2b-dbf1-46b2-ac0c-f2ce6c056b62) |

## Model Scope

Apocalypse Clock is a scenario-based analytical model for exploring systemic stress, uncertainty, dependencies, and scenario sensitivity across interacting global threats.

It should not be interpreted as:

- a prophecy;
- a deterministic forecast;
- an empirical probability of civilizational collapse;
- an official scientific consensus;
- an official risk assessment by any public authority, institution, or government;
- a prediction of a specific collapse date;
- a real-time emergency warning system;
- a substitute for independent source verification, expert review, or methodological audit;
- a legal, financial, medical, security, or policy recommendation.

The highlighted year represents a model-derived dynamic-cascade horizon under specified assumptions. It is not a predicted collapse date and should not be read as a deterministic endpoint.

Thresholds used in the model are model anchors, not physical tipping points. Dataset values and uncertainty ranges are model inputs, not exact real-world measurements.

For full interpretation guidance, see [`docs/MODEL_SCOPE.md`](./docs/MODEL_SCOPE.md).

## Local Test

Run from this folder:

```bash
python -m http.server 8766 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:8766/index.html
```

Validation checklist:

- Page loads without JavaScript errors.
- Core dashboard cards render.
- Monte Carlo simulation completes.
- MC / Weibull horizon toggle updates top threat cards and domain cards; right-censored Weibull inputs are retained and shown through identification bounds rather than `undefined` dates.
- The main cumulative chart uses the same Dynamic Cascade first-crossing distribution as the paired P50/P90 clocks.
- JSON and CSV exports are available.

## GitHub Pages

Recommended settings:

- Source: deploy from branch
- Branch: `main`
- Folder: `/ (root)`

The `.nojekyll` file is included so GitHub Pages serves the static assets directly.

## Public Review and Issue Reporting

Structured GitHub issue templates are provided for:

- technical bugs;
- model or methodology concerns;
- source corrections.

Please use the relevant issue form when reporting problems, proposing corrections, or identifying source-related concerns.

## Citation and Archival Metadata

Citation metadata is provided in [`CITATION.cff`](./CITATION.cff). Zenodo archival and release metadata is provided in [`.zenodo.json`](./.zenodo.json). A DOI badge can be added here after Zenodo creates a DOI for an archived release.

These metadata files support citation and archival discovery. They do not imply peer review, scientific validation, or predictive certainty. Apocalypse Clock remains experimental, not peer reviewed, and its model outputs are scenario outputs, not predictions.

If you use, cite, review, or discuss this project, please cite it as:

Roman Jerše. *Apocalypse Clock: Global Systemic Risk Monitor*. Version 1.2.9.
https://github.com/jerseroman/apocalypse-clock

## Changelog

Version and dataset history are documented in [`CHANGELOG.md`](./CHANGELOG.md).

## Notes

The application is fully static and does not require a backend service for the main dashboard workflow.

Some presentation resources are loaded from external providers, including Google Fonts, KaTeX CDN assets, remote images, and icon assets. Third-party libraries in `vendor/` and remote assets remain under their own respective licenses.

For attribution and third-party notice information, see [`NOTICE.md`](./NOTICE.md).

## License

This repository is released under the Apocalypse Clock Source-Available Non-Commercial Fork License.

Forking is permitted for non-commercial purposes, provided that every fork or derivative version clearly credits the original project and includes the official project repository:

Based on the Apocalypse Clock project by Roman Jerše.  
Official repository: https://github.com/jerseroman/apocalypse-clock

Commercial use is not permitted without prior written permission from Roman Jerše.

The name "Apocalypse Clock", the project logo, visual identity, branding, and official presentation remain reserved. Forks and derivative versions must clearly state that they are unofficial and must not imply affiliation, endorsement, continuity, or official status.

Third-party libraries in `vendor/` and remote assets remain under their own respective licenses.

See [`LICENSE`](./LICENSE) for the full text.
