# Change Policy

Every change to this repository belongs to exactly one of four classes. The class determines the gate.

Read together with [project-specification.md](project-specification.md), [numerical-integrity-rules.md](numerical-integrity-rules.md), [model-invariants.md](model-invariants.md), [protected-paths.md](protected-paths.md), and [validation-checklist.md](validation-checklist.md).

## Classes

### COSMETIC

Pure presentation. No numerical or interpretive effect.

Examples: typography in `src/styles.css`, accessibility labels, hover copy, button labels (except the headline-rule string), tooltip wording, README phrasing.

Allowed surfaces: see "Cosmetic-edit surfaces" in [protected-paths.md](protected-paths.md).

Gate:
- run `npm run check`
- pass `npm run test:smoke`
- append one line to [review-log.md](review-log.md)

### LOGIC

Behavior or rendering of model output. Does not touch model functions, model constants, or the dataset.

Examples: new chart, new render helper, refactor of an export formatter that preserves every field name, new UI panel, new keyboard shortcut, bugfix in a `render*` function, new tooltip that exposes existing values.

Forbidden in this class: any item under "Model regions", "Model functions", or "Headline label strings" in [protected-paths.md](protected-paths.md). Renaming any export field name.

Gate:
- complete a [task-template.md](task-template.md) entry before editing
- run the full [validation-checklist.md](validation-checklist.md)
- include the headline-determinism check (step 8)
- append to [review-log.md](review-log.md)

### MODEL

Touches any item listed under "Model regions" or "Model functions" in [protected-paths.md](protected-paths.md), or affects any invariant in [model-invariants.md](model-invariants.md).

Examples: changing a horizon formula, modifying a cascade trigger constant, swapping the PRNG, changing quantile semantics, replacing the dataset embed mechanism, re-tier-ing a threat's `process_type`, renaming `Dynamic cascade P90`.

Forbidden without all of:
- explicit owner instruction recorded in [review-log.md](review-log.md)
- a `MODEL_VERSION` bump in `src/app.js`
- a matching `package.json` version bump
- a `CHANGELOG.md` entry stating rationale and headline impact
- a refreshed golden value for the headline determinism test
- an updated section in [model-invariants.md](model-invariants.md) restating what changed and what did not

Gate:
- everything under LOGIC, plus the four bumps above
- record before-and-after of the headline year under baseline + expert + default seed in the changelog

### DATASET

Touches `data_v1_7_1metadata_revision.json` or either `<script id="bundledSources">` block.

Forbidden in this class without an explicit instruction citing this file: editing `mu`, `lo`, `hi`, `threshold`, or `growth_rate` values. See [numerical-integrity-rules.md](numerical-integrity-rules.md).

Forbidden without all of:
- updating all three byte-equal copies together
- bumping `_meta.schema_version` in the JSON
- a `CHANGELOG.md` entry
- `npm run validate:data` and `npm run check:links` passing

Gate:
- everything under LOGIC
- `npm run validate:data` must pass
- `LIVE_LINK_CHECK=1 npm run check:links` must pass for any added URL

## Decision rule

If a change touches more than one class, the higher class wins.

If unsure, default to the higher class.

## Assistant rule

Before any non-trivial edit, the assistant must:

1. Read [project-specification.md](project-specification.md), [numerical-integrity-rules.md](numerical-integrity-rules.md), and [model-invariants.md](model-invariants.md).
2. Classify the proposed change against this file.
3. Fill a [task-template.md](task-template.md) entry.
4. Refuse to proceed with a MODEL or DATASET change without explicit owner instruction.
