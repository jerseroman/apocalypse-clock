# Apocalypse Clock v1.2.7

Live GitHub Pages version: https://jerseroman.github.io/apocalypse-clock/  
Official website: https://www.apocalypseclock.com/

Apocalypse Clock is a static, browser-based systemic-risk dashboard for exploring interacting global threats across civilizational, biospheric, and technological domains. It combines scenario controls, Monte Carlo uncertainty sampling, dependency-aware aggregation, Weibull horizon diagnostics, network analysis, and exportable model outputs in a client-side application.

The dashboard is driven by a structured JSON dataset that acts as the primary information carrier for the model. At runtime, the browser reads the JSON data, normalizes threat-level parameter entries, applies evidence metadata and uncertainty ranges, and uses those inputs to populate the risk model, source panels, scenario calculations, network views, and export outputs.

## Project Structure

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

## Model Scope

Apocalypse Clock is a scenario-based analytical model for exploring systemic stress, uncertainty, dependencies, and scenario sensitivity across interacting global threats.

It should not be interpreted as:

- a prophecy;
- a deterministic forecast;
- an empirical probability of civilizational collapse;
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
