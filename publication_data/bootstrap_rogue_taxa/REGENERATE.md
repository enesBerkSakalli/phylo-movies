# Regenerate Bootstrap Rogue-Taxa Results

This folder is the canonical source-input layer for the rogue-taxon bootstrap
examples.

## Inputs

Selected external alignments are listed in:

```text
source_alignments/MANIFEST.tsv
```

The default constants are centralized in:

```text
../publication_data.env
```

Key defaults:

| Variable | Meaning |
| --- | --- |
| `BOOTSTRAP_SOURCE_ROOT` | Source alignment folder used by the regeneration script. |
| `BOOTSTRAP_DATASET_24` | 24-taxon Aberer/RogueNaRok alignment filename. |
| `BOOTSTRAP_DATASET_125` | 125-taxon Aberer/RogueNaRok alignment filename. |
| `BOOTSTRAP_OUTPUT_BASE` | Timestamped IQ-TREE run output root. |
| `BOOTSTRAP_REPLICATES` | Bootstrap replicate count. |
| `BOOTSTRAP_SEED` | Reproducibility seed. |

## Command

Create or update the shared environment:

```bash
conda env create -f publication_data/environment.yml
```

If the host does not have conda, use the repository publication container:

```bash
docker compose --profile publication build publication-env
docker compose --profile publication run --rm publication-env bash
```

The container mounts the repository at `/workspace` and contains the same
`phylomovies-publication` environment defined by `publication_data/environment.yml`.

Run a quick smoke regeneration:

```bash
conda run -n phylomovies-publication \
  ./publication_data/bootstrap_rogue_taxa/scripts/bootstrap_ordering/run_bootstrap_rogue_taxa.sh \
  --smoke --run-label separated-source-smoke
```

Container form:

```bash
docker compose --profile publication run --rm publication-env \
  conda run -n phylomovies-publication \
  ./publication_data/bootstrap_rogue_taxa/scripts/bootstrap_ordering/run_bootstrap_rogue_taxa.sh \
  --smoke --run-label separated-source-smoke
```

Run the full regeneration:

```bash
conda run -n phylomovies-publication \
  ./publication_data/bootstrap_rogue_taxa/scripts/bootstrap_ordering/run_bootstrap_rogue_taxa.sh
```

## Outputs

Generated runs are written under:

```text
runs/
```

The publication-facing promoted result lives at:

```text
current_results/
```

Each run writes logs, ordering metadata, tree-distance audit outputs, and a
manifest so reviewers can verify the relationship between source alignment,
bootstrap tree set, and final Phylo-Movies order.
