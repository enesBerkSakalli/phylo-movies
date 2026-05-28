# Publication Environment Verification

Verification date: 2026-05-28

Environment:

```text
.venv-publication plus phylomovies-publication native helper binaries
```

Definition:

```text
publication_data/environment.yml
```

## Fresh Environment Create

Status: passed for the project-local publication environment.

```bash
/Users/berksakalli/miniconda3/envs/phylomovies-publication/bin/python -m venv .venv-publication
.venv-publication/bin/python -m pip install --upgrade pip setuptools wheel
.venv-publication/bin/python -m pip install \
  nextstrain-augur==24.4.0 recan==0.5 nextstrain-cli==10.3.0 \
  jsonschema==3.2.0 snakemake==7.32.4 pulp==2.7.0 boto3==1.42.90 \
  msprime==1.3.4 biopython==1.85 pandas==1.5.3 matplotlib==3.10.9
conda install -n phylomovies-publication -c conda-forge -c bioconda \
  ncbi-datasets-cli csvtk tsv-utils nextclade mafft trimal
npm install --prefix .venv-publication/auspice-node auspice@2.71.0
ln -sf ../auspice-node/node_modules/.bin/auspice .venv-publication/bin/auspice
```

Resolved interpreter:

```text
.venv-publication/bin/python: Python 3.11.15
```

Verified Python packages:

```text
nextstrain-augur==24.4.0
nextstrain-cli==10.3.0
biopython==1.85
pandas==1.5.3
matplotlib==3.10.9
numpy==1.26.4
jsonschema==3.2.0
recan==0.5
snakemake==7.32.4
msprime==1.3.4
```

Verified command-line tools:

```text
Nextstrain CLI: 10.3.0
Nextstrain runtime: ambient supported
Augur: 24.4.0
Snakemake: 7.32.4
Auspice: 2.71.0
NCBI datasets CLI: 18.29.0
Nextclade: 3.21.2
csvtk: 0.37.0
tsv-utils: 2.2.3
MAFFT: 7.526
trimAl: 1.5.rev1
IQ-TREE executable: iqtree2
IQ-TREE reported version: 2.4.0
FastTree executable: FastTree
FastTree package version: 2.2.0
```

`raxmlHPC` is not currently on `PATH` in the local macOS environment; bootstrap
regeneration still requires RAxML through the conda/container path.

## Workflow Checks

Status: passed.

Bootstrap smoke command:

```bash
publication_data/bootstrap_rogue_taxa/scripts/bootstrap_ordering/run_bootstrap_rogue_taxa.sh --smoke --run-label publication-env-smoke
```

Nextstrain/Augur source recreation dry-run:

```bash
PATH="$PWD/.venv-publication/bin:$PATH" \
  nextstrain build --ambient /tmp/nextstrain-norovirus-full/ingest \
  --configfile defaults/config.yaml defaults/nextclade_config.yaml \
  --cores 1 --dry-run
```

The dry-run produced the expected 17-job Nextstrain ingest DAG, including NCBI
Datasets fetch, Augur curation, Nextclade gene typing, and metadata joins.

Publication-data hygiene check:

```bash
npm run publication:data:check
```

Status: passed.

msprime scale-fixture smoke check:

```bash
PATH="$PWD/.venv-publication/bin:$PATH" \
  npm run fixtures:msprime-scale -- --taxa 10 --trees 2 --seed 7 \
  --output-dir /tmp/phylo-movies-msprime-smoke
```

Status: passed.
