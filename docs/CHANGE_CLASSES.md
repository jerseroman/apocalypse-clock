# Change Classes

This document summarizes `ai-governance/change-policy.md`. The governance files remain the authoritative rules for repository changes.

Every change belongs to exactly one class. If a change touches more than one class, the higher class wins. If unsure, use the higher class.

## COSMETIC

COSMETIC changes affect presentation only and have no numerical or interpretive effect.

Examples:

- typography or layout changes;
- accessibility labels;
- hover copy;
- README or documentation phrasing that does not change model meaning;
- tooltip wording that preserves every numerical claim.

Typical gate:

- run validation;
- inspect the diff against protected paths;
- append a review-log entry.

## LOGIC

LOGIC changes affect behavior or rendering of existing model output without touching model functions, model constants, or dataset values.

Examples:

- UI behavior fixes;
- new rendering helpers;
- chart or panel changes that expose existing values;
- export formatter refactors that preserve field names and values;
- keyboard behavior or interaction fixes.

LOGIC changes must not alter model regions, model functions, headline label strings, export field names, or dataset values.

Typical gate:

- complete the task-template review before editing;
- run the validation checklist;
- include headline-determinism checks where required;
- append a review-log entry.

## MODEL

MODEL changes affect model identity, numerical semantics, or protected model behavior.

Examples:

- changing horizon formulas;
- changing cascade trigger logic;
- changing threshold policy;
- changing quantile semantics;
- changing growth-rate interpretation;
- changing PRNG or Monte Carlo semantics;
- changing the `Dynamic Cascade P90` headline rule or identifier.

MODEL changes require explicit owner authorization and the governance items listed in `ai-governance/change-policy.md`, including model-version handling, changelog documentation, refreshed headline golden values, and updated invariant documentation.

## DATASET

DATASET changes touch `data_v1_7_1metadata_revision.json` or either HTML `bundledSources` block.

Examples:

- source URL updates;
- source metadata edits;
- parameter value updates;
- dataset schema changes;
- synchronized embedded dataset updates.

DATASET changes must keep the standalone JSON file and both embedded copies synchronized. Changes to `mu`, `lo`, `hi`, thresholds, or `growth_rate` require explicit instruction and review.

## Protected Values and Regions

The following must not change silently:

- `mu`, `lo`, and `hi` values;
- threshold values;
- `growth_rate` fields and interpretation;
- normalized metric meaning;
- threat taxonomy;
- source-map semantics;
- headline logic and `Dynamic Cascade P90`;
- model functions and constants listed in `ai-governance/protected-paths.md`;
- quantile, sentinel-year, and Monte Carlo semantics.

Protected values exist so documentation, UI, and source-refresh work cannot accidentally become model recalibration.
