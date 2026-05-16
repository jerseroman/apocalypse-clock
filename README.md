# Apocalypse Clock PC v1.2.7

Apocalypse Clock is a static, browser-based systemic-risk dashboard for
exploring interacting global threats across civilizational, biospheric, and
technological domains. It combines scenario controls, Monte Carlo uncertainty
sampling, dependency-aware aggregation, Weibull horizon diagnostics, network
analysis, and exportable model outputs in a client-side application.

The dashboard is driven by a structured JSON dataset that acts as the primary
information carrier for the model. At runtime, the browser reads the JSON data,
normalizes threat-level parameter entries, applies evidence metadata and
uncertainty ranges, and uses those inputs to populate the risk model, source
panels, scenario calculations, network views, and export outputs.

## Project Structure

- `index.html` - application entry point and page shell.
- `404.html` - GitHub Pages fallback route.
- `src/styles.css` - application styles.
- `src/action-delegation.js` - early UI action delegation.
- `src/app.js` - model logic, simulation workflow, rendering, exports, and initialization.
- `src/aria-status.js` - accessibility status helper.
- `vendor/echarts.bundle.js` - local ECharts runtime.
- `vendor/cytoscape.bundle.js` - local Cytoscape runtime.

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

The `.nojekyll` file is included so GitHub Pages serves the static assets
directly.

## Notes

The application is fully static and does not require a backend service for the
main dashboard workflow. Some presentation resources are loaded from external
providers, including Google Fonts, KaTeX CDN assets, remote images, and icon
assets.

## License

- **Source code** is released under the MIT License with an additional
  attribution requirement: every source file must keep its header pointing to
  https://www.apocalypseclock.com/. Forks and derivative works are allowed as
  long as the header is preserved.
- **The name "Apocalypse Clock" and the project logo** are NOT covered by the
  code license. All rights to the name and logo are reserved. Forks must not
  use the name or logo to identify themselves or to imply affiliation.
- Third-party libraries in `vendor/` and remote assets remain under their own
  respective licenses.

See [LICENSE](./LICENSE) for the full text.
