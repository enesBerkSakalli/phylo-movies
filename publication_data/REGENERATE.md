# Regenerate Publication Data

This is the top-level entry point for rebuilding and verifying the
publication-data layer.

`publication_data/` is the canonical source-data and reproducibility archive.
Generated app examples under `dist/examples/` or
`electron-app/frontend-dist/examples/` are disposable build artifacts copied
from this folder.

## Environment

Create or update the publication-analysis environment:

```bash
conda env create -f publication_data/environment.yml
```

On Apple Silicon/macOS, use the project-local publication venv documented in
`publication_data/recombination_norovirus/REGENERATE.md` for Nextstrain/Augur
workflows:

```bash
source .venv-publication/bin/activate
nextstrain check-setup --set-default ambient
```

If conda is not installed on the host, use the publication container instead:

```bash
docker compose --profile publication build publication-env
docker compose --profile publication run --rm publication-env bash
```

Inside that shell, the `phylomovies-publication` conda environment and native
tools are already available:

```bash
conda run -n phylomovies-publication raxmlHPC -v
engine/BranchArchitect/bin/darwin/iqtree3 --version
conda run -n phylomovies-publication FastTree -expert
```

Version note: publication workflows and the live app use the bundled
BranchArchitect IQ-TREE 3 binary. On Linux, replace the Darwin path above with
`engine/BranchArchitect/bin/linux/iqtree3`. `IQTREE_PATH` or `--iqtree-bin` can
override discovery for local debugging, but publication regeneration should use
the bundled IQ-TREE 3 binary.

The shared shell defaults are stored in:

```text
publication_data/publication_data.env
```

## Verify Promoted Results

Verify manifest cleanliness, retained source-file counts, promoted bootstrap
tree counts, checksums, and app-facing taxa scale tiers:

```bash
npm run publication:data:check
```

Verify the norovirus/ReCAN checksum manifest:

```bash
(cd publication_data/recombination_norovirus && shasum -a 256 -c MANIFEST.sha256)
```

The checksum command should report `OK` for every file.

Verify the moved-subtree recurrence tables used for the rogue-taxon manuscript
claims:

```bash
npm run publication:spr-recurrence:check
```

## Regenerate Rogue-Taxon Bootstrap Results

Run a quick smoke check:

```bash
conda run -n phylomovies-publication \
  ./publication_data/bootstrap_rogue_taxa/scripts/bootstrap_ordering/run_bootstrap_rogue_taxa.sh \
  --smoke --run-label archive-smoke
```

Or run the same command through the publication container:

```bash
docker compose --profile publication run --rm publication-env \
  conda run -n phylomovies-publication \
  ./publication_data/bootstrap_rogue_taxa/scripts/bootstrap_ordering/run_bootstrap_rogue_taxa.sh \
  --smoke --run-label archive-smoke
```

Run the full IQ-TREE regeneration:

```bash
conda run -n phylomovies-publication \
  ./publication_data/bootstrap_rogue_taxa/scripts/bootstrap_ordering/run_bootstrap_rogue_taxa.sh
```

After regenerating the static browser-demo payloads, rebuild the committed
moved-subtree recurrence tables:

```bash
npm run publication:spr-recurrence
```

Detailed notes are in:

```text
publication_data/bootstrap_rogue_taxa/REGENERATE.md
```

## Regenerate Norovirus ReCAN Results

Run the ReCAN validation workflow:

```bash
PATH="$PWD/.venv-publication/bin:$PATH" \
  ./publication_data/recombination_norovirus/scripts/recan_recombination_analysis/run_recombination_analysis.sh
```

Detailed notes are in:

```text
publication_data/recombination_norovirus/REGENERATE.md
```

## Rebuild App Demo Examples

The app demo files are not the publication-data archive. They are copied from
`publication_data/` during build:

```bash
npm run build
```

For copy-only checks:

```bash
npm run copy-examples
```

To regenerate the static browser-demo payloads and check that committed JSON is
current:

```bash
npm run fixtures:generate
npm run fixtures:check
```

The norovirus demo fixtures infer IQ-TREE window trees from the committed
334-taxon MSA before writing the generated tree series and browser JSON.

## Generate Local Large-Scale Fixtures

Use the publication venv and msprime for larger local taxa-limit probes without
committing generated stress data:

```bash
PATH="$PWD/.venv-publication/bin:$PATH" npm run fixtures:msprime-scale -- --taxa 500 --trees 25
PATH="$PWD/.venv-publication/bin:$PATH" npm run fixtures:msprime-scale -- --taxa 1000 --trees 10
```

The generated files are written under:

```text
publication_data/scale_fixtures/generated/
```

## Archive Boundary

The public publication-data archive is defined in:

```text
publication_data/PUBLICATION_ARCHIVE.md
```

Use that file to decide what belongs in a release or DOI deposit.
