# Evidence revision 1.8.0

Task: create a new standalone 23-threat, 184-parameter JSON using current primary sources and explicitly documented analytical scoring.

Change class: DATASET artifact preparation. The active 1.7.1 dataset, both HTML embeds, numerical engine and application version are not being replaced in this task.

Owner authorization, 2026-09-09: "Ti sedaj na podlagi tega narediš novo verzijo json. Za to uporabi astra ULTRA a vendar ne porabi več kot 30% vse tedenske porabe ki jo imam na voljo. pri delu ne bodi konzervativen ampak racionalen."

Files: new `data_v1_8_0_evidence_revision.json` and the new `research_v1_8_0/` evidence, assembly and verification files. No existing publication or model file needs an edit.

Affected outputs: all new-file parameter values and evidence notes are eligible for reassessment. Loading the new file can change model results; no numerical result is targeted or back-fitted. Existing DOM, export contracts, PRNG and headline rule retain their current definitions. Fixed growth conversion factors and caps are inherited as model conventions, with fresh raw indicators or explicitly declared scenario proxies.

Numerical risks: proxy-to-risk identification, ordinal arithmetic, analyst interval coverage, threshold non-identifiability, source comparability, caps and the engine's positive growth floor. These are documented in `_meta` and per-threat growth records.

Validation: strict JSON and unique keys; full Cartesian product; required fields and bounds; formula recomputation; source registry coverage and access dates; imported value/cap preservation; seeded browser runs and sentinel/finite checks. Baseline content hashes are checked for preservation. Runtime results establish engineering behavior only. The old golden is not replaced because the bundled dataset is not changed.

Rollback: the standalone artifact can simply be left unloaded; original bundled 1.7.1 files remain available.

Budget: start at 2% of weekly quota consumed. User limit interpreted as 30% of the remaining 98%, or 29.4 percentage points additional consumption. Shared quota is monitored with a reserve below the resulting 31.4% absolute ceiling. Three research agents explicitly use gpt-6-astra with ultra reasoning.

Status: complete. Final artifact contains 184 parameters and 58 distinct retrieved source URLs. Strict structural/formula validation and actual-browser import/reproducibility checks passed against the same final SHA-256: `159c874c6f721129fedfbae623de37853b362ee6b4274af1dbbf27cf2da8bc64`.

Final verification: 552 values and 23 calibrated-growth/cap contracts survive the existing upload handler; two identical-seed 3000-run results match exactly. Two additional 1000-run seeds pass finite, ordering and censoring checks. Existing protected application files remain unchanged. Evidence interpretation was corrected for nuclear-stockpile reassessment and the approximate first space-inventory date. See `README.md`, `validation.json` and `runtime_validation.json` for results and limitations.

Budget closeout: the final shared-account weekly usage reading is 10%, versus 2% initially, approximately 8 percentage points additional usage (about 8.2% of the initially available 98%). These are rounded shared-account readings, not a per-task token bill. This is below the user's 30%-of-available ceiling. No usage-reset credit was consumed.
