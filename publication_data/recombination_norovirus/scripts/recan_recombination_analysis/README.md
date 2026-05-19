# Norovirus ReCAN Validation Analysis

This folder contains the ReCAN validation workflow for the Phylo-Movies
norovirus recombination example.

The canonical input alignment is:

```text
../../source_alignments/norovirus_trimmed_publication_alignment_334taxa_8058bp.fasta
```

The ReCAN working subset is:

```text
../../source_alignments/recan_working_subset_48taxa_8058bp.fasta
```

## What This Analysis Does

The workflow builds a 48-sequence GII working subset and runs a
sliding-window similarity analysis against the suspected recombinant:

```text
MK753032_P16_GII-4
```

The query is selected by FASTA ID, not by row index.

## Re-run Command

Use the shared publication conda environment:

```bash
conda env create -f publication_data/environment.yml
conda run -n phylomovies-publication ./publication_data/recombination_norovirus/scripts/recan_recombination_analysis/run_recombination_analysis.sh
```

The shell entry point resolves Python in this order:

1. `PYTHON=/path/to/python`, if explicitly set;
2. `$CONDA_PREFIX/bin/python`, when run through `conda run` or an activated
   conda environment;
3. `python` on `PATH`.

It sources `../../../publication_data.env` when present, rebuilds the source-layer
working subset, and writes a timestamped generated run.

To reuse the existing source-layer subset:

```bash
SKIP_SUBSET=1 conda run -n phylomovies-publication ./publication_data/recombination_norovirus/scripts/recan_recombination_analysis/run_recombination_analysis.sh
```

## Parameters

| Parameter | Default |
| --- | --- |
| Query sequence | `MK753032_P16_GII-4` |
| Window size | 500 bp |
| Step size | 250 bp |
| Distance method | `pdist` |
| Input subset | `../../source_alignments/recan_working_subset_48taxa_8058bp.fasta` |

`run_recan_sliding_window.py --help` lists the override flags.

## Current Results

The promoted reader-facing result set lives in:

```text
../../current_results/
```

Use `current_results/README.md` for the file list, checksums, and run summary.
Generated timestamped run folders are not retained in the publication-data
source layer.

## Order Semantics

The plot order is biological, not lexical:

1. non-recombinant donor/control groups;
2. same recombinant genotype controls;
3. other recombinant control groups.

The exact order and sequence membership are written to
`reference_group_order.tsv`. The original alignment order and query row are
written to `sequence_order.tsv`.

## Dependencies

```bash
conda run -n phylomovies-publication python -m pip install -r publication_data/recombination_norovirus/scripts/recan_recombination_analysis/requirements.txt
```
