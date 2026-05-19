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

## Checksums

```text
8ab4d985a770afcfa4b3e0c3a9ff33b422f6520edc7b7e560edacb594602d457  SOURCE_RUN_MANIFEST.json
658ed4b2b4603452cc69cb1a33ae2f32aa2d77e629f76728d29012edf84d8ed8  sequence_order.tsv
b579831eb5057bfc9e85a26bb04188740b73ab9f615d63f6fbd056ccfb78849d  reference_group_order.tsv
da6140a1619dbdd832cffa3e5759ffbf4cd35fac8b00b39fa3765ad6df01f649  recan_similarity_data.csv
7757e511378c42a1a8e3967e19bd645796fe712fc7de35f1de50a9177eba44c7  recan_grouped_similarity.csv
19e486a2756eed5b6e878d1497fc7b8b96dc68efc172449f633d2e82ff0aa345  recan_recombination_plot.png
760c3f401f20547196b2ff435593e8a46038403644f0e42b93af561542fcee00  norovirus_recombination_by_capsid.png
```
