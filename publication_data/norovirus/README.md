# Norovirus Publication Data Layer

This directory contains the norovirus recombination example used by
Phylo-Movies.

The canonical publication dataset is the Augur/MAFFT/trimAl-derived alignment
under `augur_subsampling/`. The local ReCAN folder is a derived validation
analysis against that same alignment, not a separate primary dataset.

## Directory Map

```text
norovirus/
├── README.md
├── RECOMBINATION_DATA_HYGIENE_AUDIT.md
├── augur_subsampling/
│   ├── 01_raw/          # Nextstrain/GenBank-derived raw and subsampled FASTA.
│   ├── 02_aligned/      # MAFFT alignment.
│   ├── 03_trimmed/      # trimAl output; canonical final alignment lives here.
│   ├── logs/            # Augur and MAFFT logs.
│   ├── metadata/        # Source metadata, subsampling metadata, rename map.
│   └── scripts/         # Dataset conversion and renaming helpers.
└── recan_recombination_analysis/
    ├── README.md        # Local ReCAN analysis notes.
    ├── *.py             # Local ReCAN helper scripts.
    ├── *.fasta          # Derived subsets from the canonical alignment.
    ├── *.csv            # Derived ReCAN similarity matrices.
    └── *.png            # Derived ReCAN plots.
```

## Canonical Publication Inputs

- `augur_subsampling/03_trimmed/subsampled_350_gappyout_final.fasta`
  is the canonical 334-sequence trimmed alignment.
- `augur_subsampling/metadata/subsampled_350_metadata.csv`
  is the matching 334-row metadata table for the final alignment.
- `augur_subsampling/spr-event-analytics.csv`
  is the Phylo-Movies event summary for the norovirus demonstration.

## ReCAN Relationship

`recan_recombination_analysis/working_subset.fasta` and
`recan_recombination_analysis/subset_for_recan.fasta` are subsets of the
canonical 334-sequence alignment. They should be treated as derived validation
inputs for checking the recombination signal, not as independent publication
source data.

Current status: the ReCAN folder needs cleanup before publication use. See
`RECOMBINATION_DATA_HYGIENE_AUDIT.md` for the specific blockers.

## External Data Note

The source sequences and metadata are derived from the Nextstrain norovirus
workflow and GenBank records. Publication packaging should keep source
provenance, access date, upstream repository revision, and checksums with any
released data bundle.
