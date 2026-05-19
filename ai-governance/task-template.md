# Task Template

Fill before any LOGIC, MODEL, or DATASET edit. COSMETIC-only changes may skip this.

Paste a copy into the working conversation or PR description.

## Task

One sentence. What problem is being solved.

## Change class

One of: COSMETIC, LOGIC, MODEL, DATASET. See [change-policy.md](change-policy.md).

If MODEL or DATASET, paste the exact instruction that authorized this class.

## Files touched

List each file. For functions inside `src/app.js`, list the function names. For HTML, list the section or DOM id.

## Files explicitly NOT touched

List the regions from [protected-paths.md](protected-paths.md) that the task is near but must not change.

## Affected outputs

- DOM nodes:
- Export fields:
- Headline-related numbers (yes / no):
- Determinism under default seed (preserved / changed):

## Numerical risk

State any item from [numerical-integrity-rules.md](numerical-integrity-rules.md) the change touches.

If MODEL: state which invariant from [model-invariants.md](model-invariants.md) is affected and why the change remains consistent with the rest.

## Validation strategy

- Which items in [validation-checklist.md](validation-checklist.md) will run:
- Whether the headline-determinism check (step 8) is included:
- Whether a new golden value is recorded:

## Rollback plan

How to revert. Usually `git revert <commit>`. For DATASET, also record the prior `_meta.schema_version` and dataset filename.

## Status

One of: drafted, in review, implemented, validated, recorded.
