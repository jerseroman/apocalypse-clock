# Apocalypse Clock v1.2.7

Live GitHub Pages version: https://jerseroman.github.io/apocalypse-clock/  
Official website: https://www.apocalypseclock.com/

Apocalypse Clock is a static, browser-based systemic-risk dashboard for exploring interacting global threats across civilizational, biospheric, and technological domains. It combines scenario controls, Monte Carlo uncertainty sampling, dependency-aware aggregation, Weibull horizon diagnostics, network analysis, and exportable model outputs in a client-side application. The dashboard is driven by a structured JSON dataset that serves as the primary data input source for the model.

> **Statement**  
> Apocalypse Clock was created to show the broader public not only individual threats, but the wider structure of potential civilizational dangers: their origins, interconnections, and the    possibility that isolated risks may develop into systemic crises.  
>  
> [Read the Statement](Statement.md)


## Project Structure

- `Statement.md` - project statement.
- `index.html` - application entry point and page shell.
- `404.html` - GitHub Pages fallback route.
- `src/styles.css` - application styles.
- `src/action-delegation.js` - early UI action delegation.
- `src/app.js` - model logic, simulation workflow, rendering, exports, and initialization.
- `src/aria-status.js` - accessibility status helper.
- `vendor/echarts.bundle.js` - local ECharts runtime.
- `vendor/cytoscape.bundle.js` - local Cytoscape runtime.
- `data_v1_7_1metadata_revision.json` - public structured model dataset.
- `CITATION.cff` - citation metadata for academic, public, and review references.
- `NOTICE.md` - attribution, source-availability, and third-party notice.
- `CHANGELOG.md` - public version and dataset change history.
- `docs/MODEL_SCOPE.md` - model scope, limitations, and interpretation guidance.
- `.github/ISSUE_TEMPLATE/` - structured GitHub issue templates for bugs, methodology concerns, and source corrections.
- `.nojekyll` - disables Jekyll processing on GitHub Pages.
- `.gitattributes` - line-ending and text-file handling rules.
- `.gitignore` - ignored local and system files.

## Dataset

The model uses a structured JSON parameter dataset as its primary input source.

Current public dataset:

- [`data_v1_7_1metadata_revision.json`](./data_v1_7_1metadata_revision.json)

This file contains the Apocalypse Clock parameter dataset v1.7.1. It includes 23 threat categories and 8 metrics per threat, for a total of 184 model parameters excluding metadata.

Version 1.7.1 is a metadata-cleanup export and does not perform a scientific recalibration.

**⚠ Important note:** The JSON dataset v1.7.1 was created entirely with AI assistance and checked repeatedly with different AI tools. These AI-assisted checks should not be understood as scientific peer review. <ins>Independent source verification, methodological audit, and domain-expert assessment are required before any serious use!</ins>

Multiple AI model JSON presets are included as comparison and audit inputs. They were used to compare how different AI systems assess the same risk parameters and to observe the average spread between their estimates. These AI-generated estimates have not been independently audited and should not be treated as scientific validation. Notably, the different AI systems produced broadly similar assessments across many parameters, which makes the comparison useful as a consistency check, but not as a substitute for expert review.
<p align="left">
  <img src="https://i.ibb.co/zhSrMYGJ/datajson.jpg" alt="JSON dataset overview" width="720">
</p>

### AI preset transparency

Each AI model preset is documented with two linked records where available: the generated JSON preset and the corresponding shared AI chat or conversation record showing how the preset was produced.

These links are provided for transparency and auditability. They allow reviewers to inspect not only the final JSON output, but also the AI-assisted generation process behind each preset. The presets should be interpreted only as comparison and consistency-check inputs, not as scientific validation, expert consensus, or independently verified risk assessment.

| AI model | JSON preset | Shared chat / conversation |
|---|---|---|
| Meta AI | [JSON preset](https://313d4b58-3475-474c-bc09-1d2aa1181c13.usrfiles.com/ugd/313d4b_9340155ae5684cfab132ff9a1614f69f.json) | [Shared conversation](https://www.meta.ai/share/BJ58mD1g4ib) |
| DeepSeek | [JSON preset](https://313d4b58-3475-474c-bc09-1d2aa1181c13.usrfiles.com/ugd/313d4b_d51b457416cf4de69f09ebd823838d37.json) | [Shared conversation](https://chat.deepseek.com/share/z0hekl5ix3yszqlb0q) |
| Gemini | [JSON preset](https://313d4b58-3475-474c-bc09-1d2aa1181c13.usrfiles.com/ugd/313d4b_f0b88cfe12684eea98e58a2bc9e3a1a3.json) | [Shared conversation](https://gemini.google.com/share/ba734236ef06) |
| GPT | [JSON preset](https://313d4b58-3475-474c-bc09-1d2aa1181c13.usrfiles.com/ugd/313d4b_ed75db20af174949ac02dd6b1c67efbf.json) | [Shared conversation](https://chatgpt.com/share/69f666b6-db54-83eb-aff9-dcc35b0b626e) |
| Claude | [JSON preset](https://313d4b58-3475-474c-bc09-1d2aa1181c13.usrfiles.com/ugd/313d4b_3098987023234632b012f237a4522101.json) | [Shared conversation](https://claude.ai/share/33f155da-4c3b-44b9-b6fc-99a7f9dcfa52) |
| Grok | [JSON preset](https://313d4b58-3475-474c-bc09-1d2aa1181c13.usrfiles.com/ugd/313d4b_cfeab5d3751b4c99ab67cc7c01d87d34.json) | [Shared conversation](https://grok.com/share/c2hhcmQtMi1jb3B5_be361e2b-dbf1-46b2-ac0c-f2ce6c056b62) |

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
- MC / Weibull horizon toggle updates top threat cards and domain cards.
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

## Citation

Citation metadata is provided in [`CITATION.cff`](./CITATION.cff).

If you use, cite, review, or discuss this project, please cite it as:

Roman Jerše. *Apocalypse Clock: Global Systemic Risk Monitor*. Version 1.2.7.  
https://www.apocalypseclock.com/

## Changelog

Version and dataset history are documented in [`CHANGELOG.md`](./CHANGELOG.md).

## Notes

The application is fully static and does not require a backend service for the main dashboard workflow.

Some presentation resources are loaded from external providers, including Google Fonts, KaTeX CDN assets, remote images, and icon assets. Third-party libraries in `vendor/` and remote assets remain under their own respective licenses.

For attribution and third-party notice information, see [`NOTICE.md`](./NOTICE.md).

## License

This repository is released under the Apocalypse Clock Source-Available Non-Commercial Fork License.

Forking is permitted for non-commercial purposes, provided that every fork or derivative version clearly credits the original project and includes the official website:

Based on the Apocalypse Clock project by Roman Jerše.  
Official website: https://www.apocalypseclock.com/

Commercial use is not permitted without prior written permission from Roman Jerše.

The name "Apocalypse Clock", the project logo, visual identity, branding, and official presentation remain reserved. Forks and derivative versions must clearly state that they are unofficial and must not imply affiliation, endorsement, continuity, or official status.

Third-party libraries in `vendor/` and remote assets remain under their own respective licenses.

See [`LICENSE`](./LICENSE) for the full text.
