# Regenerate Norovirus Recombination Results

This folder is the canonical source-input layer for the norovirus
recombination example.

## Inputs

Source and derived alignments are listed in:

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
| `RECAN_CANONICAL_ALIGNMENT` | 334-taxon trimmed publication alignment used to rebuild the working subset. |
| `RECAN_WORKING_SUBSET` | 48-taxon subset consumed by the ReCAN sliding-window analysis. |
| `RECAN_FOCUSED_SUBSET` | Small manually focused subset retained for inspection. |
| `RECAN_QUERY_ID` | Stable FASTA ID of the suspected recombinant. |
| `RECAN_WINDOW_SIZE` | Sliding-window size in bp. |
| `RECAN_STEP_SIZE` | Sliding-window step in bp. |
| `RECAN_DISTANCE_METHOD` | ReCAN distance method. |
| `RECAN_ORF_JUNCTION` | Plot annotation for the ORF1/ORF2 junction in bp. |
| `RECAN_REPS_PER_COMBO` | Maximum representatives per genotype combination for the working subset. |
| `RECAN_MAX_GAP_PERCENT` | Gap threshold used when selecting working-subset representatives. |
| `RECAN_FOCUSED_SELECTED_IDS` | Comma-separated sequence IDs for the focused subset helper. |

## Command

Create or update the shared environment:

```bash
conda env create -f publication_data/environment.yml
```

Run the reproducible ReCAN workflow:

```bash
conda run -n phylomovies-publication \
  ./publication_data/recombination_norovirus/scripts/recan_recombination_analysis/run_recombination_analysis.sh
```

The shell entry point resolves Python from the active conda environment,
sources `publication_data/publication_data.env`, rebuilds the working subset
from the canonical source alignment, and writes a timestamped run.

## Outputs

Generated runs are written under:

```text
runs/
```

The publication-facing promoted result lives at:

```text
current_results/
```

Each run writes `run_manifest.json`, source checksum, query ID, alignment
order, group order, raw similarity values, grouped values, and plots.
