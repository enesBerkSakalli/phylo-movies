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

On Apple Silicon/macOS, the conda `augur` package can be unavailable through the
same solver path as the native command-line tools. In that case, use a
project-local publication venv plus the conda-installed native helper binaries:

```bash
conda run -n phylomovies-publication python -m venv .venv-publication
.venv-publication/bin/python -m pip install --upgrade pip setuptools wheel
.venv-publication/bin/python -m pip install \
  nextstrain-augur==24.4.0 recan==0.5 nextstrain-cli==10.3.0 \
  jsonschema==3.2.0 snakemake==7.32.4 pulp==2.7.0 boto3==1.42.90 \
  biopython==1.85 pandas==1.5.3 matplotlib==3.10.9
conda install -n phylomovies-publication -c conda-forge -c bioconda \
  ncbi-datasets-cli csvtk tsv-utils nextclade mafft trimal
npm install --prefix .venv-publication/auspice-node auspice@2.71.0
ln -sf ../auspice-node/node_modules/.bin/auspice .venv-publication/bin/auspice
```

Recreate the source snapshot through the pinned Nextstrain/Augur workflow:

```bash
PATH="$PWD/.venv-publication/bin:$PATH" \
  ./publication_data/recombination_norovirus/source_preparation/augur_subsampling/scripts/recreate_nextstrain_augur_snapshot.sh
```

This checks out Nextstrain norovirus commit
`bce398d15a14c82a2a8c3574da289205e2c5844f`, runs `nextstrain build` for the
ingest workflow, locks the generated result to
`source_preparation/augur_subsampling/01_raw/full_genome_accession_versions.txt`,
then runs `augur filter`, MAFFT, and trimAl.

Run the reproducible ReCAN workflow:

```bash
PATH="$PWD/.venv-publication/bin:$PATH" \
  ./publication_data/recombination_norovirus/scripts/recan_recombination_analysis/run_recombination_analysis.sh
```

The shell entry point resolves Python from `.venv-publication/bin` when that
directory is on `PATH`, sources `publication_data/publication_data.env`,
rebuilds the working subset from the canonical source alignment, and writes a
timestamped run.

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

The Phylo-Movies Norovirus browser example is run live from the canonical
334-taxon alignment with `windowSize=1000`, `stepSize=500`, IQ-TREE fast search,
and SH-aLRT support (`1000` replicates). Its exact publication window
coordinates are pinned in:

```text
current_results/window_tables/norovirus_334_window1000_step500_windows.tsv
```
