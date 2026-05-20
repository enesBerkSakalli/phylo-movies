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

The shared shell defaults are stored in:

```text
publication_data/publication_data.env
```

## Verify Promoted Results

Verify the rogue-taxon bootstrap result set:

```bash
(cd publication_data/bootstrap_rogue_taxa/current_results && shasum -a 256 -c MANIFEST.sha256)
```

Verify the norovirus/ReCAN result set:

```bash
(cd publication_data/recombination_norovirus && shasum -a 256 -c MANIFEST.sha256)
```

The commands should report `OK` for every file.

## Regenerate Rogue-Taxon Bootstrap Results

Run a quick smoke check:

```bash
conda run -n phylomovies-publication \
  ./publication_data/bootstrap_rogue_taxa/scripts/bootstrap_ordering/run_bootstrap_rogue_taxa.sh \
  --smoke --run-label archive-smoke
```

Run the full IQ-TREE regeneration:

```bash
conda run -n phylomovies-publication \
  ./publication_data/bootstrap_rogue_taxa/scripts/bootstrap_ordering/run_bootstrap_rogue_taxa.sh
```

Detailed notes are in:

```text
publication_data/bootstrap_rogue_taxa/REGENERATE.md
```

## Regenerate Norovirus ReCAN Results

Run the ReCAN validation workflow:

```bash
conda run -n phylomovies-publication \
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

## Archive Boundary

The public publication-data archive is defined in:

```text
publication_data/PUBLICATION_ARCHIVE.md
```

Use that file to decide what belongs in a release or DOI deposit.
