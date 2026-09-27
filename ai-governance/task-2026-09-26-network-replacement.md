# Task: replace the Causal dependency network

## Task

Replace the Cytoscape network with the canvas network the owner approved as a standalone prototype (`.local-dev/network-prototype.html`), and replace the "Whole page" menu item with GitHub, Facebook and Perplexity buttons. Owner request of 26 Sep 2026.

## Change class

LOGIC (a new rendering of the network panel; no model function, constant or dataset change).

## Files touched

- `src/threat-network.html` (new): the prototype, with an embedded mode. In that mode it drops its own page header and reports its height to the page. It takes the page's current adjusted priorities for the node sizes.
- `src/app.js`: `initNetwork` now sends priorities to the embedded network. Removed: `updateNetworkSide`, `_netNodes`, `_netHover`, `_netCyInstance`, `_netCyFocusId` and the Cytoscape part of `resizeVizSurfaces`.
- `index.html` / `404.html`: network panel content replaced by an iframe; Cytoscape script tag removed.
- `vendor/cytoscape.bundle.js`: deleted (no longer used).
- `src/section-nav.js`, `src/styles.css`: "Whole page" item replaced by three link buttons. The `#section-all` address still shows every section.
- `tests/section-nav.spec.js`, `CHANGELOG.md`, `ai-governance/review-log.md`.

## Files explicitly NOT touched

Model regions and functions, the dataset and `bundledSources`, headline strings, and the clocks.

## Affected outputs

- DOM nodes: `#netCanvas`, `#netTitle`, `#netSummary`, `#netPriority` and `#netImpactList` are removed; `#threatNetworkFrame` is new.
- Export fields: none.
- Headline-related numbers: no.
- Determinism: preserved.

## Numerical risk

None. The links shown are the research register of 25 Sep 2026 plus one owner-added link. They are not the dataset's 71 dependencies that the clocks use, and the panel text says so.

## Validation strategy

`npm run check`; the full Playwright suite with one worker, including headline determinism; a browser check of the embedded network.

## Rollback plan

`Povrni prejšnjo postavitev.cmd` (the backup includes `vendor/cytoscape.bundle.js`).

## Status

implemented
