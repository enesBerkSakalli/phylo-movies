# Current ReCAN Validation Results

These are the promoted reader-facing outputs from the latest verified ReCAN
rerun.

Source run:

```text
publication_data/recombination_norovirus/runs/run_20260519T150251+0200_query-MK753032_P16_GII-4_win500_step250
```

The source run directory is generated output and is recreated on demand. This
`current_results/` directory contains the promoted subset needed for review and
publication-data inspection.

## Run Summary

- query ID: `MK753032_P16_GII-4`
- query alignment index: 25
- input sequences: 48
- references: 47
- alignment length: 8058
- windows: 33
- window size: 500 bp
- step size: 250 bp
- distance method: `pdist`
- environment: `phylomovies-publication`
- ReCAN version: 0.5

## Files

| File | Role |
| --- | --- |
| `SOURCE_RUN_MANIFEST.json` | Manifest copied from the verified source run. |
| `sequence_order.tsv` | Input sequence order with the query marked. |
| `reference_group_order.tsv` | Biological group order used in grouped summaries and plots. |
| `recan_similarity_data.csv` | Per-window similarity table for each reference. |
| `recan_grouped_similarity.csv` | Per-window group summary table. |
| `recan_recombination_plot.png` | Main grouped ReCAN validation plot. |
| `norovirus_recombination_by_capsid.png` | Capsid-group highlighted validation plot. |

## Phylo-Movies Tree Series

The default reviewer-facing Norovirus browser demo uses the 334-taxon trimmed
alignment with IQ-TREE fast search, GTR+G, SH-aLRT support,
`windowSize=1000`, and `stepSize=500`:

```text
phylo_movies/norovirus_334_iqtree_fast_sh_alrt_window1000_step500.nwk
```

The exact live-analysis windows are stored in:

```text
window_tables/norovirus_334_window1000_step500_windows.tsv
```

The table records the zero-based window index, BranchArchitect window name, and
one-based inclusive alignment coordinates.

BranchArchitect's parameterized windowing is center-based, not start-based. For
`windowSize=1000` and `stepSize=500`, centers are placed at alignment positions
1, 501, 1001, ... and each window extends 500 bp to either side of its center.
At the alignment boundaries, windows are clipped rather than shifted inward:

- first window: center 1, range 1-500, length 500
- internal windows: full 1000 bp
- last window: center 8001, range 7501-8058, length 558

This is intentional for live analysis because center positions stay on the exact
requested step grid and window names match the BranchArchitect-generated window
centers. The tradeoff is that edge trees are inferred from fewer sites. For
publication figures, use this explicit table when reporting or regenerating
windows so the boundary behavior is transparent.

The generated static demo payload contains 17 observed input trees, 16 adjacent
tree pairs, and 6,098 rendered tree states: 17 input-tree states plus 6,081
interpolation states.

A previous 750/500 IQ-TREE fast-search tree series remains in `phylo_movies/`
for traceability, but it is not the current reviewer-facing demo payload.

## Checksums

```text
8ab4d985a770afcfa4b3e0c3a9ff33b422f6520edc7b7e560edacb594602d457  SOURCE_RUN_MANIFEST.json
658ed4b2b4603452cc69cb1a33ae2f32aa2d77e629f76728d29012edf84d8ed8  sequence_order.tsv
b579831eb5057bfc9e85a26bb04188740b73ab9f615d63f6fbd056ccfb78849d  reference_group_order.tsv
da6140a1619dbdd832cffa3e5759ffbf4cd35fac8b00b39fa3765ad6df01f649  recan_similarity_data.csv
7757e511378c42a1a8e3967e19bd645796fe712fc7de35f1de50a9177eba44c7  recan_grouped_similarity.csv
19e486a2756eed5b6e878d1497fc7b8b96dc68efc172449f633d2e82ff0aa345  recan_recombination_plot.png
760c3f401f20547196b2ff435593e8a46038403644f0e42b93af561542fcee00  norovirus_recombination_by_capsid.png
89a51af0d29cc343fad39362f3d362dcbd45cd454f9836dc591cc2b5a5de86ff  window_tables/norovirus_334_window1000_step500_windows.tsv
```
