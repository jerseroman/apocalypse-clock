# Pull Request Checklist

Apocalypse Clock is experimental and not peer reviewed. Model outputs are scenario outputs, not predictions.

Use this checklist with `CONTRIBUTING.md`, `ai-governance/change-policy.md`, `ai-governance/protected-paths.md`, `ai-governance/model-invariants.md`, and `docs/CHANGE_CLASSES.md`.

## Purpose

Short description of the purpose of this pull request:

-

## Change Classification

Select exactly one class. If more than one class applies, use the higher class.

- [ ] COSMETIC
- [ ] LOGIC
- [ ] MODEL
- [ ] DATASET

## Files Changed

List the files changed in this pull request:

-

## Protected Model/Data Values

State explicitly whether protected model or data values were changed:

- [ ] No protected model or data values were changed.
- [ ] Protected model or data values were changed and are described below.

Details:

-

## Governance Reads

- [ ] I read `ai-governance/change-policy.md`.
- [ ] I read `ai-governance/protected-paths.md`.
- [ ] I read `ai-governance/model-invariants.md`.

## Validation

- [ ] I ran `npm.cmd run check:js`.
- [ ] I ran `npm.cmd run validate:data`.
- [ ] I ran `npm.cmd run check:links`.
- [ ] I ran `npm.cmd run test:smoke`.

## MODEL or DATASET Changes

Complete this section for MODEL or DATASET changes. For COSMETIC or LOGIC changes, mark items as not applicable.

- `mu` / `lo` / `hi` changed?
  - [ ] No
  - [ ] Yes
  - [ ] Not applicable
- thresholds changed?
  - [ ] No
  - [ ] Yes
  - [ ] Not applicable
- `growth_rate` changed?
  - [ ] No
  - [ ] Yes
  - [ ] Not applicable
- headline logic changed?
  - [ ] No
  - [ ] Yes
  - [ ] Not applicable
- dataset values changed?
  - [ ] No
  - [ ] Yes
  - [ ] Not applicable
- embedded dataset copies synchronized?
  - [ ] No
  - [ ] Yes
  - [ ] Not applicable
- `CHANGELOG.md` updated if public release behavior changed?
  - [ ] No
  - [ ] Yes
  - [ ] Not applicable

MODEL/DATASET notes:

-

## Screenshots

If UI changed, add before/after screenshots or explain why screenshots are not needed:

-

## Reviewer Notes

Add any context reviewers should know:

-
