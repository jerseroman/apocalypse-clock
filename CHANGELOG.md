# Changelog

## v1.5.0 - 2026-09-27

Version 1.5.0 is one release that follows 1.3.0. It combines:

- two changes to the model, developed one after the other:
  - **structural uncertainty**, first labelled 1.4.0 and never released on its own;
  - **pressure turns with recovery**;
- new outputs computed from the same runs;
- corrections from a full code review;
- a redesigned dashboard.

Dataset 1.9.0 and its 184 numerical entries are unchanged. All figures below use Baseline scenario, Expert weights, seed `AC-1.2.6-2026` and 3,000 runs.

### Headline results

| Output | 1.3.0 | + structural uncertainty | 1.5.0 (+ pressure turns) |
| --- | ---: | ---: | ---: |
| Dynamic Cascade P10 / P50 / P90 | 2033 / 2036 / 2042 | 2034 / 2038 / 2044 | **2034 / 2038 / 2046** |
| Runs below the threshold in 2100 (Dynamic Cascade) | 0% | 0% | 0.2% (6 of 3,000) |
| Civilizational domain P50 | 2045 | 2046 | 2047 |
| Biosphere domain P50 | 2036 | 2038 | 2038 |
| Technological domain P50 | 2040 | 2041 | 2041 |
| Compensatory P10 / P50 / P90 | 2046 / 2054 / 2066 | 2046 / 2055 / 2068 | 2047 / 2058 / 2079 |
| Graph heuristic P10 / P50 / P90 | 2063 / 2076 / 2090 | 2064 / 2079 / 2097 | 2071 / 2092 / >2100 |
| Max-rule P10 / P50 / P90 | 2026 / 2031 / 2036 | 2026 / 2031 / 2036 | 2026 / 2031 / 2037 |

- The headline, Dynamic Cascade P90, moves from 2042 to 2046: two years come from structural uncertainty and two from pressure turns.
- Because 6 runs no longer cross by 2100, ">2100" is now a possible outcome of the main model.
- Domain P90 values with pressure turns:
  - civilization moves from 2064 to 2074;
  - biosphere from 2044 to 2046;
  - technology from 2055 to 2060.
- Other results of the same runs:
  - With pressure turns, compensatory runs below their threshold in 2100 rise from 0.1% to 2.8%, and graph-heuristic runs from 7.1% to 38% (from 3.5% in 1.3.0).
  - Compensatory P(crossed by 2050) falls from 31% to 29% with structural uncertainty.
  - The P50 range across the four aggregation rules widens from 45 to 48 years, and the horizon-coded outcome SD from 7.9 to 9.0 years.
  - Climate Breakdown standalone P50/P90 moves from 2037/2049 in 1.3.0 to 2038/2066.

These are conditional model quantiles. They are not validated dates of completed global collapse.

### Model: structural uncertainty (MODEL change, owner instruction of 2026-09-24)

In 1.3.0 the structural choices of the functional cascade were fixed judgments. Each Monte Carlo run now samples them, so model-structure uncertainty reaches the clocks. The ranges are defined once, in `STRUCTURAL_UNCERTAINTY` in `src/app.js`.

| Choice | Declared value | Sampled in each run |
| --- | --- | --- |
| Cascade threshold | 0.50 | uniform 0.40 to 0.60 |
| Criticality tier values | 1, 2, 3 | each tier value uniform within ±0.5. All nodes of a tier share the value, so the tiers keep their order |
| Dependency weights a_ij | equal shares per target | Dirichlet with the declared shares as mean and concentration 2 per edge. Each target's total is kept |
| Dependency lags | 1 year | whole years, uniform 0 to 5, per edge |
| Growth class | assigned class | one class down (25%), unchanged (50%) or up (25%) on the ladder 0.003 / 0.01 / 0.02 / 0.03, continued beyond both ends by the adjacent step ratio (0.0009 below, 0.045 above) |

**Growth-class shifts**
- A shift multiplies the threat's sampled growth by the ratio between the new and the assigned class, so the sampling width within the class is kept.
- The shifted growth still passes through the existing effective-growth clamps: the 0.0005 floor, the 0.08 global cap and each threat's `threat_specific_cap`.
- These clamps cut some upward moves short. At its central growth of 0.03, Climate Breakdown can move up only to 0.035 (×1.17 instead of ×1.5) and AI only to 0.04 (×1.33). Their downward moves to 0.02 are complete.

**Effect of each component alone** (P50/P90 in years):

| Component | P50 | P90 |
| --- | ---: | ---: |
| Threshold | +1 | +1 |
| Dependency lags | 0 | +1 |
| Growth class | 0 | +1 |
| Criticality levels | 0 | 0 |
| Dependency weights | 0 | 0 |

- Together the components move P50 by two years, more than the sum of the single shifts, because they interact.

**Scope**
- The following are not sampled: service memberships, overlap groups, topology, inducibility, the equations and the headline rule.
- Each structural component draws from its own seeded stream, so parameter and event draws are unchanged.
- `structuralUncertainty: false` reproduces 1.3.0 exactly.
- Deterministic views and the OAT, Sobol, SMAA and other sensitivity diagnostics keep the declared structure, so they still isolate parameter effects.

### Model: pressure turns and recovery (MODEL change, owner instruction of 2026-09-24)

Pressure can now fall as well as rise. The dataset's growth priors describe continued pressure and say nothing about whether or when a threat's pressure could peak. By owner instruction no historical data or examples are used, so the assumption is stated openly. The values are defined once, in `PRESSURE_TURNS` in `src/app.js`.

| Choice | Value in every run |
| --- | --- |
| Turn probability | 50% for each threat, independently |
| Turn year T | uniform over whole years 2027 to 2100 |
| Pressure after the turn | retraces its rise: pressure(T + k) = pressure(T) / (1 + g_i)^k |
| Recovery drop | 25% for reversible and 50% for partly reversible threats. Irreversible threats do not recover |

**Standalone horizons**
- A continuous or regime crossing at or before T is unchanged.
- A crossing after T no longer happens: pressure peaks below the threshold, and the result is coded 2101.
- Event hazards follow the same mirrored pressure path and keep their single process draw.

**Functional cascade**
- q_i(t) follows the same path after T.
- An active node past its turn recovers in the first year in which q_i(t) + κ_i·D_i(t) ≤ (1 − drop) · min(1, its value at activation).
- Recovery is evaluated before activation in each year, synchronously, until nothing changes (a fixed point).
- A recovered node can be induced again, but spontaneous activation happens at most once per node.
- Dependency lags count from an upstream node's latest activation.
- Domain horizons use each node's activity intervals.

**Recovery classes**
- The recovery class is the declared reversibility class shown on the threat pills:
  - irreversibility up to 3.0: reversible;
  - irreversibility from 4.2: irreversible;
  - in between: partly reversible.
- The dashboard's overrides apply: authoritarian drift, governance fragmentation and geopolitical escalation are reversible, and critical minerals are irreversible.
- As a result, climate, biodiversity, oceans, nuclear conflict and critical minerals do not recover.

**Clocks and results**
- The clocks and all horizons keep their first-crossing meaning.
- A run can fall back below the threshold after crossing. The share of crossing runs back below the threshold in 2100 is reported separately.
- At the default settings recovery does not bring the system back:
  - none of the 2,994 crossing runs is below the threshold again in 2100, and only one falls back below at any point;
  - 83% of runs cross through the Ecological life support basket, whose three threats are irreversible.

**Draws and switches**
- Turn draws come from their own seeded stream, two per threat per run, so parameter, structural and process draws are unchanged.
- `pressureTurns: false` reproduces the structural-sampling-only result (2034/2038/2044) exactly.
- Turns only lower pressure and recovery only removes failures, so every run crosses in the same year as without turns, or later.
- Deterministic views and the sensitivity diagnostics keep the declared continued-pressure path.

**Choice of values**
- The owner chose the turn design and the recovery by reversibility class from proposed options.
- The 25% and 50% drops were set by the assistant.
- The dataset notes that positive-only growth omits recovery and that activation is absorbing still describe its continued-pressure priors. The model now samples turns and recovery on top of those priors.

### Model: new outputs from the same runs

**Conditional scenario panel** (beside the clocks):
- the curve P(threshold reached by year X | model assumptions);
- the other three aggregation rules as reference lines, with their P50 and P90;
- the share of runs still below the threshold in 2100;
- the turn assumption and the number of crossing runs back below the threshold in 2100.

**Trigger attribution**
- The runs are replayed to find which essential-service basket sets the clocks off.
- At the default settings it is the Ecological life support basket in 83% of the runs that reach the threshold (86% with structural uncertainty alone).
- The replay runs after the main calculation, so the loading bar does not wait for it.

**Recovery check**
- It counts the runs still below the threshold in 2100 and the runs that fall back below it after crossing.

**Provenance**
- The code hash, `numericalCodeFingerprint` / `codeHashFNV1a32`, now covers the structural-uncertainty and pressure-turn functions and constants. As a result the hash value changes.

### Corrections from a full code review (LOGIC)

These corrections leave the Monte Carlo outputs bit-identical before and after, in three cases: the default settings, pressure turns off, and both switches off.

- **Dependency direction.** The network graph and the threat cards showed dependencies in the wrong direction. A threat's dependencies are the upstream threats whose functional failure adds exposure to it.
  - Edges now point from the upstream threat to the threat that depends on it.
  - The cards show both directions.
- **Distribution diagnostics** used the compensatory distribution. They now use the Dynamic Cascade distribution, as the clocks do, and they show the scenario name.
- **`404.html`**, which GitHub Pages serves for unknown addresses, was an older copy of the page. That copy had the former gauge, share links and tooltips. It is now a byte copy of `index.html`, and `validate-data` checks that the two stay identical.
- **Failed runs** are now reported in the calculation console:
  - every interrupted step is marked;
  - the progress overlay closes;
  - a finished or failed run is announced to screen readers.
- **Chart resizing.** Opening a collapsed diagnostics block resizes its charts again; the handler had called a function that no longer existed.
- **Resize handling.** The handler waits until resizing stops and ignores changes in height only.
- **Mission buttons** are written in their intended order. The old runtime reordering by fixed positions had moved "Ask Perplexity" to the end.

**Code without effect removed**
- From `app.js`, 40 unused or duplicated functions and constants were removed, taking it from 8,335 to 7,875 lines. They included:
  - the former gauge renderer;
  - weight-profile notes that wrote to missing elements and redrew the network in the middle of a calculation;
  - updates of elements that do not exist;
  - a duplicate outside-click handler;
  - a share-link builder whose links were always overwritten.
- 217 lines of CSS whose selectors matched no element were removed. Every computed style is unchanged at 1280 and 390 px.
- Event wiring now runs from one initialization function, and the start-up call is the last statement of `app.js`.

### Dashboard: layout and navigation

**Section menu** (`src/section-nav.js`)
- A left-hand menu replaces the single long page. Each section opens on its own on the right, under a large title.
- The eleven sections, in order:
  1. Projected horizon;
  2. Risk horizons;
  3. Threats by Rank;
  4. Causal dependency network;
  5. Model Diagnostics;
  6. Source registry;
  7. Live calculation console;
  8. Threat contribution ranking;
  9. Scenario overview;
  10. Full threat register;
  11. Mission statement.
- Each section has its own address (for example `#section-network`), so the back button and shared links open the same section. `#section-all` shows every section at once.
- Each menu item has a precise 1 px line icon on a 12 × 12 grid.
- A highlight glides between menu items, and a newly opened section fades and slides in.
- All motion is off when the system asks for reduced motion.
- Printing includes every section.
- Menu header:
  - the logo;
  - the title "Apocalypse Clock";
  - the line "Global Systemic Risk Monitor", letter-spaced to the width of the title;
  - under the links, the revision line "Model 1.5.0 · Data 1.9.0".

**Links in the menu**
- GitHub, Facebook and Perplexity.
- Share: uses the device's share sheet, or copies the link where there is none.
- Email.

**Page search** (`src/page-search.js`)
- The search sits beside every section title; Ctrl+K focuses it.
- It finds a keyword in the text of every section and lists matches by section, naming the threat card or register row they sit in.
- Choosing a match opens its section and any collapsed card, block or tab around it, then scrolls to the match and highlights it.

**Validation notice**
- It sits at the top of every section, in #FF2A00 with white text.
- It has a close button; the notice returns in the next browser session.

**Loading**
- The page stays hidden until the menu has arranged it, about 0.4 s, with a 3 s fallback. The old full layout no longer flashes during loading.
- While the model runs, the loading view sits in the middle of the clocks window, and the empty horizon markers are hidden.
- The progress bar is slim with a soft moving sheen, and its progress is the real share of finished steps.
- A line names the step that is running, for example "Step 10 of 22 · Monte Carlo sampling and crossing simulation".

**Phone layout** (760 px and below)
- A slim top bar holds the logo, the title and a menu button. The button opens a full-screen drawer with the menu items, links and revision line.
- Touch targets are 44 px.
- The search uses 16 px text, so iPhones do not zoom in.
- Checked at 320, 360 and 390 px with no sideways scrolling.

### Dashboard: sections

**Projected horizon**
- The paired P50/P90 clocks and the Conditional scenario share one window. The clocks keep their 520 px column and their look.
- The scenario chart spans the full width of the scenario panel.

**Threats by Rank** (formerly "Top threat cards")
- Lists all 23 threats by adjusted priority instead of the first five.
- The cards start collapsed.

**Scenario overview**
- Key indicators, Scenario analytical narrative and Domain stress composition now open together: the indicators on top, the narrative and the domain stress side by side.

**Mission statement**
- The header's introductory paragraph is merged into the Mission statement.
- "Are we alone in the universe?" is removed from its actions.

**Default state**
- Every collapsible part starts open: the mission text, the calculation console, the source registry and its parameter map, the diagnostics groups, the contribution ranking and the network table.
- The threat cards are the exception and start collapsed.

**Removed panel**
- The "Dynamic Cascade first-crossing distribution" panel is removed, together with `drawCDF` and `displayedCascadeCdfSummary`.
- The same curve remains in the Conditional scenario.

### Dashboard: Causal dependency network

The Cytoscape network is replaced by `src/threat-network.html`, a canvas network without a library. The owner approved it as a prototype first. The dashboard embeds it in a frame, and the file can also be opened on its own. Cytoscape and its runtime (`vendor/cytoscape.bundle.js`, a locked file) are removed on owner instruction.

**Links**
- The links come from the Apocalypse Clock research register of 25 Sep 2026: 101 directed links, each meaning that the source threat worsens the target threat.
- One link was added at the owner's request and is marked "added": Soil & Food System → Antimicrobial Resistance, a supported mechanism (WHO guidelines on antimicrobials in food-producing animals, 2017; Tang et al., Lancet Planetary Health 2017).
- The network has 102 links in total.

**Link types**
- Supported mechanism (D): 44 links, solid lines.
- Conditional (P): 51 links, dashed lines.
- Scenario or modelled (S): 7 links, dotted lines.
- The types are labels, not probabilities or weights.

**Selecting a threat**
- The threats it worsens directly (step 1) are shown bright, as full nodes marked 1.
- The threats those worsen in turn (step 2) are shown about 60% dimmer, as hollow rings marked 2.
- Uninvolved threats fade.
- Moving dots show only the direction of influence; their speed has no meaning.

**Filter and loops**
- A link-type filter hides link types everywhere except the table.
- The "Loops" view shows directed feedback cycles of two or three links in gold, listed by their weakest link. There are 53 loops, and 10 of them consist only of supported mechanisms.

**Other details**
- Node size follows the adjusted priority of the selected scenario and weights.
- A table view lists the whole register.
- The panel states that the clocks still use the dataset's own 71 declared dependencies, not the register.

### Dashboard: Model Diagnostics (formerly Scientific Panel)

- The section is renamed Model Diagnostics, with a pulse-line icon.
- The run card sits on top, with short copy, a "Run diagnostics" button and the step list 24–29.
- The diagnostics are grouped in tabs (`src/diagnostics-view.js`):

  | Tab | Contents |
  | --- | --- |
  | Sensitivity | OAT and Sobol/Jansen |
  | Stress tests | Veto, Tail-dependence shock and SMAA weight robustness |
  | Distribution | histogram, aggregator boxplot, domain percentile map and cumulative crossing curves |
  | Audit | run identity, module status and stress metrics |
  | How the model works | the model explanation |

- Before a run, the chart tabs show a short empty state with a run button.
- The existing blocks are moved, not copied, so every chart keeps its element.
- No calculation changes.

### Dashboard: Live calculation console

- The console lists what the model actually computes:
  - Structural uncertainty sampling;
  - Pressure turns and recovery;
  - Recovery check;
  - Trigger attribution.
- Parameter sampling and the crossing simulation are one step.
- Domain layer preparation is part of the domain step.
- "Structural ensemble spread" is renamed "Aggregation-rule spread".
- Five descriptive steps are grouped under "Diagnostics of the result". They describe the result without changing the clocks.
- Numbering: the main steps are 1–23, and the optional diagnostics are 24–29.

### Repository, tests and metadata

**Metadata**
- `CITATION.cff`, `.zenodo.json` and the README citation name version 1.5.0, released on 2026-09-27.

**Tools**
- `playwright.config.js` and `scripts/serve.js` are restored. `npm start` starts a dependency-free Node server, and `npm test` works locally and in GitHub Actions.
- The logo is declared as the page icon, so browsers no longer request a missing `/favicon.ico`.

**Tests**
- There are now 64 tests, including new tests of:
  - structural uncertainty;
  - pressure turns;
  - the Conditional scenario;
  - the section menu;
  - the page search;
  - the Model Diagnostics tabs.
- The headline-determinism tests pin three results:
  - 1.5.0;
  - pressure turns off;
  - both switches off, which reproduces 1.3.0.
- A test checks that pressure turns never move any order statistic of the four rules, or of the domain horizons, earlier.

**Documentation**
- `README.md`, `docs/METHODOLOGY.md`, `docs/MODEL_SCOPE.md`, `docs/LIMITATIONS.md` and `ai-governance/model-invariants.md` describe model 1.5.0.
- The review log and the task files record each change.

### What did not change

- Dataset 1.9.0 and its 184 entries.
- The cascade engine and the standalone equations.
- Service memberships, overlap groups and topology.
- The four aggregation rules.
- The Dynamic Cascade P90 headline rule.
- Quantile interpolation, and censoring coded 2101 and shown as ">2100".
- The look of the two clocks.
- The validation notice text.

## v1.3.0 - 2026-09-24

- Promotes the restored 23-threat application baseline to model version 1.3.0.
- Keeps dataset 1.9.0, all 184 numerical parameter entries and the established functional-cascade calculation unchanged.
- Renames the primary dataset from `data_v1_9_0_functional.json` to `data_v1_9_0.json` and updates all active references.
- Removes the unfinished subsystem-timing experiment from the active application and documentation.
- Preserves the separation between threat-level scientific evidence, parameter calibration and model assumptions.
- This is a version and delivery update, not an empirical recalibration or predictive validation.

## v1.2.9 — 2026-09-13

This MODEL correction makes the domain cards and regime timing internally consistent with the declared functional-pressure model. Dataset 1.9.0, its 184 numerical ranges, thresholds, topology, fixed criticality tiers, service memberships, edge weights and lags are unchanged.

### Same-version CDF, Weibull and presentation hotfix

- Corrects the main cumulative chart to display the existing Dynamic Cascade first-crossing distribution used by the paired P50/P90 clocks. It previously rendered the top-level compensatory distribution (Baseline P50 2054) even though the surrounding headline referred to Dynamic Cascade (P50 2036, P90 2042).
- Replaces JavaScript-style `undefined` output in the Weibull domain view with explicit partial-identification reporting. Positive-weight right-censored threats remain in the calculation: the UI shows a defensible lower bound for the weighted P50 and a weighted P≤2050 probability range instead of inventing a date or silently dropping late threats.
- Renames the three domain cards to Civilizational, Biosphere and Technological `Functional-Disruption Horizon`, and makes the paired-clock explanation easier to read without changing its scientific caveats.
- Extends the application's `#14181e` background across the full viewport width for the height of the dashboard, removing darker page gutters without changing the model or other page sections.
- Removes the obsolete page-builder delivery layer, its generator, harness and dedicated tests. The logo, Perplexity icon and all seven AI comparison presets are now served directly from the repository.
- This is a correction within application 1.2.9 and data 1.9.0. No model equation, dataset value, threshold, sampling rule, headline number or version identifier changes.

- Replaces the domain cards' former 40-percent standalone sampled-priority-mass crossing with a domain functional first crossing reconstructed from the full-system propagated activation history. Only the reporting node basket and denominator are restricted by domain; fixed criticality, overlap, essential-service and 0.50 trigger rules match the headline engine.
- Removes the misleading comparison of domain P50 values with the system P50 because the former rule measured a different estimand.
- Makes regime-process timing use sampled priority, growth and threshold in the same first-passage equation as continuous latent pressure. The previous growth-blind logistic/geometric waiting clock had no empirical calendar calibration and is removed.
- Adds explicit domain-method, censoring and `>2100` semantics to the UI and JSON/CSV export. Domain denominators are separate and non-additive.
- Advances the application model to 1.2.9 while keeping the active dataset at 1.9.0.

Fixed-seed baseline comparison (`baseline`, `expert`, seed `AC-1.2.6-2026`, 3000 simulations):

| Output | 1.2.8 | 1.2.9 |
| --- | ---: | ---: |
| Dynamic Cascade P10/P50/P90 | 2033 / 2036 / 2043 | 2033 / 2036 / 2042 |
| Civilizational domain P50 | 2068 | 2045 |
| Biosphere domain P50 | 2049 | 2036 |
| Technological domain P50 | 2097 | 2040 |

The new domain values are comparable model-defined functional warning horizons, not empirical probabilities or dates of completed domain collapse. The correction improves internal estimand consistency; it does not scientifically validate the coefficients, thresholds or calendar projections.

## v1.2.8 — 2026-09-12 (prepared locally, not deployed by this change)

Version 1.2.8 advances the public release sequence from 1.2.7. It incorporates the locally developed functional-cascade revision, previously carrying the provisional local identifier 1.3.0. This release-label alignment does not change numerical parameters or rerun results. The substantive changes from 1.2.7 are:

- Dataset 1.9.0: 184 parameter entries, 61 source URLs, 23 functional profiles; 43 numeric parameter triplets changed versus 1.8.0. Replaces indicator-growth substitutions with disclosed direct latent-pressure prior classes and revises incoming vulnerability semantics.
- Adds pure directed pressure-plus-capacity-loss propagation with one-year edge lags, initially censored target eligibility, fixed criticality weights, essential-service baskets and overlap-aware aggregation. Removes the all-three-domain/co-active-edge/induced-share veto.
- Retains event-specific initiation for nuclear, engineered biological, pandemic and autonomous-weapons events. All remain aggregate-eligible and can transmit after activation.
- Separates standalone and propagated first-functional-failure summaries in UI narrative and JSON/CSV exports. Corrects stale explanations and active dataset labels. Adds functional catalog/import/causal regression checks.
- Replaces the single headline P90 display with paired Dynamic-cascade P50 and P90 clocks plus their calendar-year interval. The pair exposes the median and later distribution quantile without changing the simulation, dataset, thresholds, random seed, or stored baseline result (P50 2036, P90 2043, interval 7 years).
- Expands public methodology, model-scope and limitation documentation. It explicitly distinguishes a functional-disruption threshold from completed global collapse and separates reproducible engineering results from empirical predictive validation.
- Synchronizes the 1.2.8 identifier across runtime code, HTML delivery surfaces, npm metadata, tests, documentation, citation metadata and Zenodo metadata. The active dataset remains 1.9.0.
- Original 1.7.1 and 1.8.0 JSON files remain byte-identical to the backup. The full previous application is preserved in `backups/pre-functional-cascade-2026-09-09`.

Before/after, Baseline + Expert + `AC-1.2.6-2026`, 3000 simulations:

| Model / dataset | Dynamic P10 | P50 | P90 | No crossing by 2100 |
| --- | ---: | ---: | ---: | ---: |
| Archived 1.2.7 / 1.7.1, freshly reproduced | 2037 | 2041 | 2046 | 0% |
| New 1.2.8 / 1.9.0 | 2033 | 2036 | 2043 | 0% |

New values were captured before refreshing the golden test; repeated same-seed runs were identical. This is an intentional change of inputs and aggregation meaning, not evidence of improved forecast accuracy. At n=1000 the global-only trigger gives P50 2047/P90 2060 versus essential-service P50 2037/P90 2043: headline timing is particularly sensitive to the service-basket rule. The non-propagating reference gives P90 2044, so the early headline must not be attributed solely to propagation.

Verification details and caveats: [research_v1_9_0/README.md](research_v1_9_0/README.md). Full-suite completion is recorded there and in the review log separately from this pre-test change record.

## v1.2.7 2026-05-16

First public GitHub release of the Apocalypse Clock.

Earlier development versions existed internally, but they were not maintained as a complete public release sequence. For that reason, public versioning begins with `v1.2.7`.

### Main notes

- Finalized the current public release of Apocalypse Clock.
- Added GitHub Pages public review version.
- Updated the active dataset reference to `data_v1_7_1metadata_revision.json`.
- Uses dataset v1.7.1 metadata-cleanup export.
- Refreshed selected source and URL references.
- Preserved the 23-threat, 8-metric, 184-parameter model structure.
- Preserved numerical `mu`, `lo`, and `hi` values; this release is not a scientific recalibration.
- Improved the distinction between current systemic stress and projected Dynamic Cascade horizon.
- Clarified that the Dynamic Cascade P90 horizon is a model-derived upper-risk horizon, not a deterministic forecast.
- Improved public-facing explanations for uncertainty and diagnostic views.
- Added or updated Scientific Panel diagnostics.
- Expanded and clarified MCDA weighting model controls.
- Renamed export functions to clearer public names.
- Added visible public timestamp/version labeling.
- Preserved static browser-based deployment without backend requirements.

## Dataset v1.7.1

- Metadata cleanup only.
- Fixed broken or outdated source links where replacements were available.
- No scientific recalibration.
- No modification of model parameter values.
- 23 threat categories × 8 metrics = 184 model parameters, excluding metadata.
