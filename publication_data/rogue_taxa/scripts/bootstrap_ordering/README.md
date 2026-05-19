# Bootstrap Ordering Tool

This is the user-facing tool for regenerating the two rogue-taxon bootstrap
examples from selected Aberer/RogueNaRok source alignments.

Default examples:

- dataset `24`: small palaeognath/crocodilian example
- dataset `125`: larger 125-sequence example

Default method:

1. Generate explicit bootstrap replicate MSAs with RAxML `raxmlHPC -f j`.
2. Compute corrected composition-distance ordering using
   `(A, C, G, T, AmbiguousOrGap)`.
3. Infer one tree per replicate alignment.
4. Concatenate inferred trees in ranked order.

Publication mode uses IQ-TREE by default:

```bash
./run_bootstrap_examples.sh --smoke
./run_bootstrap_examples.sh --replicates 200 --tree-program iqtree
./run_bootstrap_examples.sh --replicates 200 --tree-program iqtree --jobs 4 --threads 1
./run_bootstrap_examples.sh --replicates 200 --tree-program iqtree --run-label reviewer-r3
```

FastTree remains available for exploratory or compatibility runs:

```bash
./run_bootstrap_examples.sh --smoke --tree-program fasttree
```

The wrapper runs through the `epas1-pipeline` conda environment so `raxmlHPC`
is available. Override with:

```bash
PHYLOMOVIES_RAXML_ENV=my-env ./run_bootstrap_examples.sh --smoke
```

Set `ROGUE_TAXA_SOURCE_ROOT` if the external Aberer/RogueNaRok archive is in a
different location.

## Run Naming

Every execution creates a new run directory under:

```text
publication_data/bootstrap_example/iqtree_reinference/runs/
```

Run directories are named with the full provenance pattern:

```text
run_<YYYYMMDD>T<HHMMSS><TZ>_<tree-program[-mode]>_bs<replicates>_seed<seed>_ds<datasets>[_label]
```

Example:

```text
run_20260518T190113+0200_iqtree-fast_bs002_seed42_ds24-125_smoke
```

The timestamp is local time with timezone offset. Dataset names are sanitized
only for filesystem safety; source paths remain recorded in the manifests.

## Directory Structure

Each run has one run-level manifest and one folder per dataset:

```text
run_<timestamp>_<method>_bs<N>_seed<S>_ds<ids>/
├── RUN_MANIFEST.json
├── run_log.txt
├── dataset_24_source-24_taxa24_sites14190/
│   ├── DATASET_MANIFEST.json
│   ├── bootstrap_alignments/
│   │   ├── bootstrap
│   │   ├── bootstrap.BS0
│   │   └── RAxML_info.BS_ALN
│   ├── trees/
│   │   └── rep_000000/
│   └── ranked/
│       ├── bootstrap_order_24_source-24_taxa24_sites14190.tsv
│       └── all_trees_24_source-24_taxa24_sites14190.nwk
└── dataset_125_source-125_taxa125_sites29149/
    ├── DATASET_MANIFEST.json
    ├── bootstrap_alignments/
    ├── trees/
    └── ranked/
```

This keeps external source-derived bootstrap alignments, per-replicate tree
inference artifacts, and publication-facing ranked outputs physically separate.

Use `--jobs` to run independent replicate tree-inference jobs concurrently.
For publication reruns on a multi-core workstation, prefer `--jobs 4 --threads
1` before increasing per-IQ-TREE thread count; this keeps each replicate command
simple while reducing wall-clock time.
