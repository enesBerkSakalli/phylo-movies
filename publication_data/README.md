# Phylo-Movies Publication Data

This folder is the canonical source of publication data in this repository.
Generated application bundles such as `dist/examples/` and
`electron-app/frontend-dist/examples/` must be rebuilt from this folder and must
not be edited as source data.

## Start Here

- `PUBLICATION_ARCHIVE.md` defines the public archive boundary and release
  verification checks.
- `SCALE_LIMITS.md` records the committed app-facing taxa scale tiers.
- `manuscript_facts.yml` records the numerical manuscript claims that are
  checked against committed publication data and generated demo payloads.
- `REGENERATE.md` is the top-level regeneration and verification entry point.
- `publication_data.env` defines shared workflow constants consumed by shell
  entry points and Python scripts.
- `environment.yml` defines the shared publication-analysis conda environment.
- `bootstrap_rogue_taxa/` contains the selected Aberer/RogueNaRok source
  alignments for the rogue-taxon bootstrap example.
- `bootstrap_rogue_taxa/current_results/` contains the promoted
  IQ-TREE bootstrap result set.
- `bootstrap_rogue_taxa/scripts/bootstrap_ordering/` contains the bootstrap regeneration
  scripts.
- `recombination_norovirus/` contains the retained norovirus source and derived
  alignment files for the recombination example.
- `recombination_norovirus/current_results/` contains the
  promoted ReCAN validation result set.
- `topology_search_iqtree/` contains a complete IQ-TREE fast-search
  topology-search trajectory example and its source alignment.

## Current Top-Level Groups

| Group | Purpose |
| --- | --- |
| `manuscript_facts.yml` | Ledger of manuscript-facing numerical claims checked by `npm run publication:data:check`. |
| `bootstrap_rogue_taxa/` | Source alignments, regeneration scripts, and promoted IQ-TREE bootstrap outputs for the Aberer/RogueNaRok-derived rogue-taxon example. |
| `recombination_norovirus/` | Source alignments, source-preparation files, ReCAN scripts, and promoted ReCAN outputs for the norovirus recombination example. |
| `topology_search_iqtree/` | Source alignment and promoted complete IQ-TREE 3 fast-search topology-search trajectory for the tree-search example. |
| `quick_msa_demo/` | Synthetic lightweight MSA demo. |
| `figure_example/` | Small figure/demo tree input. |

## Reader Rule

Retained external source material must have citation, source path or source
description, checksum, and transformation status. Generated outputs must point
back to their source inputs and reproducible command surface.

## Hygiene Check

Run the manifest, checksum, taxa-count, site-count, promoted-tree, and
manuscript-fact checks with:

```bash
npm run publication:data:check
```
