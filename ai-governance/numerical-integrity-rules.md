# Numerical Integrity Rules

Never modify:
- mu values
- lo values
- hi values
- threshold values
- growth_rate logic
- normalized metric meaning

Always verify:
- weighted averages
- p10/p50/p90 calculations
- horizon year calculations
- amplifier-risk handling
- no-crossing <= 2100 logic
- NaN/null handling
- rounding consistency

Before changing numerical logic:
1. explain the current logic
2. explain side effects
3. identify affected outputs
4. propose validation strategy