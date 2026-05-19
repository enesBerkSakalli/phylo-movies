# Rogue-Taxon Publication Data Layer

This folder is the Phylo-Movies publication-data entry point for rogue-taxon
examples and related helper scripts.

## Ownership and Scope

The Aberer et al. RogueNaRok online data is external third-party material, not
Phylo-Movies data. Do not vendor the full online-data archive into this
repository. If a specific file is needed for a figure, demo, or reproducibility
check, place only that file under `selected_external_files/` and document:

- original source and citation
- original path inside the external archive
- why the file is needed by the Phylo-Movies manuscript or demo
- any transformation applied after copying

The full external archive currently lives locally outside this repository at:

`/Users/berksakalli/Projects/rogue_taxa_analysis/online-data/`

## Included Material

- `epas1_pipeline/` contains scripts and configuration for the EPAS1
  rogue-taxon sliding-window pipeline. This is the script-facing layer that can
  be referenced from the Phylo-Movies manuscript/repository.
- `scripts/bootstrap_ordering/` contains the shell tool for regenerating the two
  Aberer/RogueNaRok-derived bootstrap examples (`24` and `125`). Publication
  mode uses IQ-TREE for tree inference; FastTree remains available as an
  explicit exploratory mode.
- `selected_external_files/` is reserved for explicitly chosen third-party
  files after provenance review. It is intentionally empty for now.
- `PUBLICATION_FILE_GROUPS.md` orders the current files by publication
  relevance and marks which ones are canonical, supporting, exploratory, or
  legacy/exclude-until-fixed.
- `PUBLICATION_DATA_HYGIENE_AUDIT.md` records the current publication-readiness
  and data-hygiene blockers.

## Manuscript Framing

The current Phylo-Movies preprint is the bioRxiv manuscript
`10.64898/2026.04.01.715821`. Its rogue-taxon framing should stay narrow:
Phylo-Movies is a complementary exploratory and diagnostic view that helps show
where unstable taxa attach and which neighboring subtrees are affected, but it
does not replace quantitative rogue-taxon or support-based analyses.

For the MBE revision/data-hygiene pass, keep this separation:

- scripts and Phylo-Movies-derived summaries can live in this repository
- third-party source data should remain external or be deposited in a DOI-backed
  archive with clear citation
- selected third-party files should be copied only when needed and accompanied
  by provenance notes
