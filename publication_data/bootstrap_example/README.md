# Rogue-Taxon Bootstrap Example

This folder contains Phylo-Movies-ready rogue-taxon bootstrap examples. These
files are derived from selected alignments in the Aberer/RogueNaRok paper data
archive, but they are not the full third-party paper archive and should not be
described as original Aberer data.

Source paper:

Aberer, Krompass, and Stamatakis, "Pruning Rogue Taxa Improves Phylogenetic
Accuracy: An Efficient Algorithm and Webservice", Systematic Biology 62(1),
2013, DOI `10.1093/sysbio/sys078`.

Local external archive used during generation:

```text
/Users/berksakalli/Projects/rogue_taxa_analysis/online-data/
```

## Relationship To The Paper Data

The external paper archive contains 1000 bootstrap trees for each dataset and
many RogueNaRok/BMA/STA benchmarking outputs. The current Phylo-Movies examples
use only the source alignments for datasets 24 and 125 as inputs to our local
demo-generation workflow.

| External input | Current derived example |
| --- | --- |
| `data/datasets/alignments/24` | `24/all_trees_24.nwk`, `24/bootstrap_order_24.txt`, `24/24-spr-event-analytics.csv` |
| `data/datasets/alignments/125` | `125/all_trees_125.nwk`, `125/bootstrap_order_125.txt`, `125/125_spr-event-frequencies.csv` |

Important: `24/all_trees_24.nwk` and `125/all_trees_125.nwk` each contain 200
generated FastTree trees. They are not byte-identical copies of the paper
archive's 1000-tree bootstrap files.

## File Groups

### Dataset 24

| File | Role |
| --- | --- |
| `24/all_trees_24.nwk` | Phylo-Movies tree-sequence input, 200 generated trees, 24 taxa. |
| `24/bootstrap_order_24.txt` | Rank/order table for the generated bootstrap replicates. |
| `24/24-spr-event-analytics.csv` | Phylo-Movies SPR event analytics for the tree sequence. |
| `24/all_trees_24-2026-02-05.csv` | Older/alternate analytics table; keep only if it is explicitly cited. |
| `24/RAxML_info.BS_ALN` | RAxML bootstrap-alignment generation log. |

### Dataset 125

| File | Role |
| --- | --- |
| `125/all_trees_125.nwk` | Phylo-Movies tree-sequence input, 200 generated trees, 125 taxa. |
| `125/bootstrap_order_125.txt` | Rank/order table for the generated bootstrap replicates. |
| `125/125_spr-event-frequencies.csv` | Phylo-Movies event-frequency summary for the tree sequence. |
| `125/RAxML_info.BS_ALN` | RAxML bootstrap-alignment generation log. |

### Run-Level Provenance

| File | Role |
| --- | --- |
| `run_log.txt` | Records source alignment paths, bootstrap settings, FastTree command, seed, and replicate count. |

## Hygiene Status

This folder is usable as a Phylo-Movies demo input layer, but it still needs a
publication manifest. Add source citation, access date, source checksums,
derived-file checksums, and exact commands before final data release.

The existing distance-ranking files should be treated as legacy metadata. The
old script omitted IUPAC ambiguity symbols from the composition vector,
materially affecting dataset 24. See `DISTANCE_METRIC_AUDIT.md`.

## IQ-TREE Re-Inference Plan

The current tree files were inferred with FastTree from RAxML-generated
bootstrap replicate alignments. Reviewer feedback specifically questioned
FastTree as the tree inference engine. The planned publication replacement is
to infer one IQ-TREE tree per explicit bootstrap replicate alignment, then
regenerate the ordered Newick files and SPR analytics.

See `IQTREE_REINFERENCE_PLAN.md`.

The shell entry point is:

```bash
../rogue_taxa/scripts/bootstrap_ordering/run_bootstrap_examples.sh --smoke --run-label smoke
```

New IQ-TREE re-inference runs are staged under
`iqtree_reinference/runs/` using the naming pattern:

```text
run_<YYYYMMDD>T<HHMMSS><TZ>_<tree-program[-mode]>_bs<replicates>_seed<seed>_ds<datasets>[_label]
```

Each run contains `RUN_MANIFEST.json`, `run_log.txt`, and per-dataset folders
with `bootstrap_alignments/`, `trees/`, and `ranked/` subdirectories.
