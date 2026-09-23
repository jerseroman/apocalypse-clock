# Validation

This document summarizes the validation infrastructure currently present in the repository. It reflects the existing scripts and tests; it does not add a new validation method or claim peer review.

Validation checks repository consistency and regression behavior. Passing validation does not mean the model is scientifically verified, independently audited, or peer reviewed.

## Commands

Run from the repository root:

```bash
npm run check:js
npm run validate:data
npm run check:links
npm run test:smoke
```

On Windows PowerShell, use `npm.cmd` if needed:

```powershell
npm.cmd run check:js
npm.cmd run validate:data
npm.cmd run check:links
npm.cmd run test:smoke
```

## JavaScript Syntax Check

`npm run check:js` runs `scripts/check-js.js`.

It checks JavaScript files under `src/`, `scripts/`, and `tests/` with Node's syntax checker. It is a parse-level check, not a full static analysis pass.

## Dataset Integrity

`npm run validate:data` runs `scripts/validate-data.js`.

It verifies the current dataset structure and embedded copies, including:

- the expected schema version;
- 23 headline threats and 184 headline parameter entries;
- up to 36 nested Climate Breakdown and Ocean Degradation subsystem components in `_meta.subsystem_models`;
- 184 dataset parameters;
- `lo <= mu <= hi` for every parameter;
- required HTML metadata;
- byte-equal UTF-8 JSON payloads across the configured `data/data_v1_3_timing_2026-09-23.json`, `index.html`, and `404.html`, excluding enclosing whitespace;
- exact agreement of all functional catalog fields with their importable threshold extensions, normalized known dependency IDs, nonnegative integer lags and registered source URLs;
- direct growth semantics, with no raw observed-indicator CAGR imported as latent pressure.

This protects against accidental drift between the standalone dataset file and the two HTML `bundledSources` copies.

## Link Format Check

`npm run check:links` runs `scripts/check-links.js`.

It parses external URL formats from HTML and dataset sources. For added or replaced URLs, the governance checklist also calls for a live link check when appropriate:

```bash
LIVE_LINK_CHECK=1 npm run check:links
```

Live link results can be affected by third-party blocking, redirects, or service downtime, so failures require review before they are interpreted as source defects.

## Playwright Tests

`npm run test:smoke` currently runs the Playwright suite configured in `tests/`.

The suite currently includes:

- `tests/functional-cascade.spec.js`: single-seed directed propagation, censored-target susceptibility, cycles/order independence, monotonicity, essential-service triggers, overlap grouping, initiating-event restrictions, explicit lags and domain reconstruction from full-system activations.
- `tests/functional-integration.spec.js`: real uploads, legacy-source fallback, all scenarios/weight profiles, standalone versus propagated first-failure statistics, and actual JSON/CSV downloads through pointer-activated, visibly opened controls.

- `tests/smoke.spec.js`: loads the static dashboard, checks the title and heading, waits for the headline year, exercises the mission and share controls, verifies share-link behavior, and checks for unexpected page errors or warnings.
- `tests/units.spec.js`: uses Playwright `page.evaluate` against the live page to pin contracts for `quantile`, `fmtY`, `probabilityByDisplayedYear`, growth-responsive regime first passage, and censored domain-card labeling.
- `tests/headline-determinism.spec.js`: pins the Dynamic Cascade and three domain functional P10/P50/P90 values under Baseline scenario, Expert weight profile, default seed `AC-1.2.6-2026`, and `nSim=3000`; it also checks two consecutive same-configuration runs for bit-identical Dynamic Cascade outputs.

The headline-determinism test protects current behavior. If an intentional MODEL change alters the golden values, the change policy requires a model-version bump, changelog entry, refreshed golden value, and review-log record.

## Validation Boundary

These checks can catch syntax errors, dataset-copy drift, broken URL formats, UI regressions, pure-function contract drift, and headline determinism changes.

They do not prove that:

- source values are correct;
- parameter choices are scientifically valid;
- assumptions are complete;
- results are predictive;
- the model has passed independent expert review.
