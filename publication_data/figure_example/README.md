# Figure Example

This directory contains the small two-tree Newick input used by the paper figure
example and generated browser-demo payload.

## Tracked Source

| File | Purpose |
| --- | --- |
| `paper_example.tree` | Canonical two-tree input used by the app demo fixture generator. |

The browser-demo JSON derived from this input is generated under
`publication_data/precomputed/` by the fixture generator and is not tracked.

## Local Figure QA Folders

Some local worktrees may contain crop or panel folders such as
`debug_crop_candidates/`, `qa_crops/`, or `regenerated_overview_panels/`.
Those folders are figure-review scratch outputs. Empty crop directories are not
tracked by Git and are not part of the publication-data archive unless their
contents are intentionally committed.
