# Bootstrap Rogue-Taxa Publication Layer

This folder is the publication-facing home for the rogue-taxon bootstrap
example source inputs.

Do not edit generated build copies under `dist/examples/` or
`electron-app/frontend-dist/examples/`; regenerate them from `publication_data/`
when needed.

## Contents

| Path | Role |
| --- | --- |
| `source_alignments/` | Selected Aberer/RogueNaRok source alignments used to regenerate the IQ-TREE bootstrap examples. |
| `source_alignments/MANIFEST.tsv` | Source, checksum, taxa/site count, role, and notes for each copied source alignment. |
| `REGENERATE.md` | Reviewer-facing commands for regenerating the bootstrap results from this source layer. |
