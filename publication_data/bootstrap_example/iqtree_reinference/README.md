# IQ-TREE Re-Inference Staging

This directory is the staging area for regenerating the rogue-taxon bootstrap
examples with IQ-TREE.

Generated run directories live under `runs/` and are ignored by Git until a run
has passed review. Promote only reviewed outputs into the publication-facing
data layer.

Run names encode timestamp, tree-inference method, replicate count, seed, and
dataset IDs:

```text
run_<YYYYMMDD>T<HHMMSS><TZ>_<tree-program[-mode]>_bs<replicates>_seed<seed>_ds<datasets>[_label]
```

Inside each run, outputs are grouped by role:

```text
RUN_MANIFEST.json
run_log.txt
dataset_<id>/DATASET_MANIFEST.json
dataset_<id>_source-<source-basename>_taxa<N>_sites<M>/bootstrap_alignments/
dataset_<id>_source-<source-basename>_taxa<N>_sites<M>/trees/
dataset_<id>_source-<source-basename>_taxa<N>_sites<M>/ranked/bootstrap_order_<id>_source-<source-basename>_taxa<N>_sites<M>.tsv
dataset_<id>_source-<source-basename>_taxa<N>_sites<M>/ranked/all_trees_<id>_source-<source-basename>_taxa<N>_sites<M>.nwk
```

Smoke test:

```bash
../../rogue_taxa/scripts/bootstrap_ordering/run_bootstrap_examples.sh --smoke --run-label smoke
```

Full publication run:

```bash
../../rogue_taxa/scripts/bootstrap_ordering/run_bootstrap_examples.sh --replicates 200 --tree-program iqtree --run-label reviewer-r3
```
