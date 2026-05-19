# Apocalypse Clock Project Specification

This project is a systemic risk monitoring model.

The assistant must not change model parameters unless explicitly instructed.

Forbidden changes:
- mu, lo, hi values
- threshold values
- growth_rate fields
- threat taxonomy
- normalized metric interpretation
- source-map semantics

Before editing code:
1. inspect relevant files
2. explain affected logic
3. identify numerical risk
4. propose a plan
5. make minimal changes only after instruction

Every change must preserve numerical integrity and public interpretability.