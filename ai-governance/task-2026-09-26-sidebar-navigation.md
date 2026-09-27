# Task: left-hand section menu

## Task

Show the page as a left-hand menu with one button per existing section; the chosen section fills the right-hand side. Owner request of 26 Sep 2026: "na levi strani gumbe na desni pa stran", with one button for every section ("vsak del posebej") and menu names that match what the clock actually shows.

## Change class

LOGIC (new navigation behaviour and markup; no model, dataset or headline-string change).

## Files touched

- `src/section-nav.js` (new): builds the menu, marks each section's elements, switches sections, redraws charts through `redrawAfterResize()` after a switch.
- `src/styles.css`: menu layout, section visibility, print rule that prints every section.
- `index.html` and its byte copy `404.html`: one `<script>` tag for `src/section-nav.js` after `src/app.js`.
- `CHANGELOG.md`, `ai-governance/review-log.md`.

## Files explicitly NOT touched

- Every model region and model function in `src/app.js` and `src/cascade-model.js`.
- The `bundledSources` block, headline label strings, and the markup and styles of the two clocks (`#heroAbsoluteClock`). Its column keeps its 520 px width.

## Affected outputs

- DOM nodes: a new `nav.section-nav`; `data-nav-section` attributes on existing section elements. No existing id is renamed or moved; only `#calcConsole` stays in place and is shown under its own menu item.
- Export fields: none.
- Headline-related numbers: no.
- Determinism under default seed: preserved.

## Numerical risk

None. The menu only shows and hides existing elements and asks the existing charts to redraw.

## Validation strategy

- `npm run check`; the full Playwright suite (includes the headline-determinism check, step 8); a menu test that every section opens and has visible content; screenshots at 1536, 1100 and 390 px.
- No new golden value.

## Rollback plan

Run `Povrni prejšnjo postavitev.cmd` in the project folder. It copies back the backup in `.local-dev/backup-pred-menijem-2026-09-26` and deletes the new files. Alternatively, restore the listed files from that folder by hand.

## Status

implemented
