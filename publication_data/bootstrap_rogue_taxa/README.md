# Bootstrap Rogue-Taxa Publication Layer

This folder is the publication-facing home for the rogue-taxon bootstrap
example source inputs.

Do not edit generated build copies under `dist/examples/` or
`electron-app/frontend-dist/examples/`; regenerate them from `publication_data/`
when needed.

`source_alignments/MANIFEST.tsv` is the source-input manifest. The `.phy`
files under `source_alignments/` are the immutable source payloads referenced by
that manifest. Files under `current_results/` are regenerated artifacts produced
from those source alignments and the workflow in `REGENERATE.md`.

## Contents

| Path | Role |
| --- | --- |
| `source_alignments/` | Selected Aberer/RogueNaRok source alignments used to regenerate the IQ-TREE bootstrap examples. |
| `source_alignments/MANIFEST.tsv` | Source, checksum, taxa/site count, role, and notes for each copied source alignment. |
| `REGENERATE.md` | Reviewer-facing commands for regenerating the bootstrap results from this source layer. |
| `current_results/` | Generated tree series, ranked replicate tables, split-support tables, manifests, and verification output. |
| `current_results/TREE_DISTANCE_ORDERING_SUMMARY.json` | Secondary additive RF and weighted-RF ordering analysis for the current bootstrap tree series. |
