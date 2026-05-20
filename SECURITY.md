# Security and Integrity Reporting

Apocalypse Clock is a static browser application. It has no production backend for the main dashboard workflow, but security and integrity reports still matter because the repository publishes model code, dataset values, source links, and public interpretation text.

The project is experimental and not peer reviewed. Security and integrity reports should be specific, reproducible, and careful about distinguishing technical vulnerabilities from methodology or source-quality concerns.

## What to Report

### Security Issues

Report technical security issues such as:

- cross-site scripting or unsafe HTML/script behavior;
- unsafe dependency, CDN, or third-party asset use;
- malicious or compromised links;
- data export behavior that unexpectedly exposes private local information;
- GitHub Pages or repository configuration issues that could affect users.

If the issue is exploitable, do not publish exploit details in a public issue. Use GitHub private vulnerability reporting if available. If it is not available, open a minimal public issue asking for private coordination without including exploit steps.

### Data Integrity Issues

Report data integrity issues such as:

- inconsistent dataset copies;
- broken schema assumptions;
- incorrect source mapping;
- malformed or misleading source metadata;
- suspected accidental edits to protected values.

Protected values include `mu`, `lo`, `hi`, thresholds, `growth_rate`, threat taxonomy, normalized metric interpretation, and source-map semantics.

### Methodology and Model-Integrity Issues

Report methodology or model-integrity issues when a concern may affect:

- the headline rule or `Dynamic Cascade P90` interpretation;
- threshold handling;
- growth-rate interpretation;
- quantile semantics;
- Monte Carlo distributions;
- cascade logic;
- dependency-network propagation;
- sentinel-year handling for `>2100`.

These reports are not treated as security vulnerabilities unless they also create a technical exploit. They are still important because they can affect public interpretation.

### Source-Integrity Issues

Report source-integrity issues when a source is:

- broken or redirected unexpectedly;
- superseded by a newer authoritative source;
- mismatched to the parameter it supports;
- ambiguous, weak, or not traceable;
- suspected to have been altered or removed.

Use the source correction issue template when the report can be public. If the link is malicious or compromised, treat it as a security issue.

## What to Include

For any report, include:

- the affected file, page section, source, parameter, or output;
- exact steps to reproduce or verify the issue;
- the expected behavior or expected interpretation;
- the observed behavior;
- supporting evidence, references, screenshots, or logs;
- whether the issue appears technical, DATASET, MODEL, source-integrity, or documentation-only.

## Response Expectations

Repository changes are governed by `ai-governance/change-policy.md`.

- COSMETIC changes may clarify presentation without changing numerical or interpretive behavior.
- LOGIC changes affect behavior or rendering but do not touch model functions, model constants, or dataset values.
- DATASET changes touch the dataset JSON or embedded dataset copies.
- MODEL changes affect model identity, numerical semantics, headline logic, or protected model functions.

Reports that would change protected values or model behavior require explicit review before implementation. Public documentation must not imply peer review, scientific consensus, or deterministic prediction.
