# Review Log

Append-only record of accepted, rejected, or reverted changes.

Do not edit prior entries. Do not delete prior entries. Add new entries at the bottom of the table.

## Format

- `date`: YYYY-MM-DD
- `task`: one-line title matching the corresponding [task-template.md](task-template.md) entry
- `class`: COSMETIC | LOGIC | MODEL | DATASET (see [change-policy.md](change-policy.md))
- `files`: comma-separated list of files touched
- `result`: accepted | rejected | reverted
- `note`: optional pointer to the changelog entry, PR number, or authorizing instruction

## Entries

| date | task | class | files | result | note |
|------|------|-------|-------|--------|------|
