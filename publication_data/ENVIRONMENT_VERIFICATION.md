# Publication Environment Verification

Verification date: 2026-05-19

Environment:

```text
phylomovies-publication
```

Definition:

```text
publication_data/environment.yml
```

## Fresh Environment Create

Status: passed.

```bash
conda env create -f publication_data/environment.yml
```

Resolved interpreter:

```text
/Users/berksakalli/miniconda3/envs/phylomovies-publication/bin/python
```

Verified Python packages:

```text
biopython==1.85
pandas==2.3.2
matplotlib==3.10.5
numpy==2.3.2
recan==0.5
```

Verified command-line tools:

```text
RAxML executable: /Users/berksakalli/miniconda3/envs/phylomovies-publication/bin/raxmlHPC
RAxML reported version: 8.2.12
IQ-TREE executable: /Users/berksakalli/miniconda3/envs/phylomovies-publication/bin/iqtree2
IQ-TREE reported version: 2.4.0
FastTree executable: /Users/berksakalli/miniconda3/envs/phylomovies-publication/bin/FastTree
FastTree package version: 2.2.0
```

Note: the conda `raxml=8.2.13` package installs an executable that reports
RAxML `8.2.12`.

## Workflow Checks

Status: passed.

Bootstrap smoke command:

```bash
publication_data/bootstrap_rogue_taxa/scripts/bootstrap_ordering/run_bootstrap_rogue_taxa.sh --smoke --run-label publication-env-smoke
```

ReCAN command:

```bash
conda run -n phylomovies-publication ./publication_data/recombination_norovirus/scripts/recan_recombination_analysis/run_recombination_analysis.sh
```

The bootstrap smoke run completed for datasets `24` and `125` with two
replicates per dataset using RAxML bootstrap alignment generation and IQ-TREE
fast-mode smoke inference.

The ReCAN rerun completed with 48 input sequences, 47 references, 8058 bp
alignment length, 33 windows, query `MK753032_P16_GII-4` at alignment index 25,
500 bp window size, 250 bp step size, and `pdist`.

Generated run folders were removed after promotion/verification; retained
reader-facing outputs live under each workflow's `current_results/` folder.
