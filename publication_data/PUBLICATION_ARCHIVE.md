# Publication Data Archive Contract

This file defines the public archive boundary for the Phylo-Movies
publication-data layer.

## Archive Root

The archive root is:

```text
publication_data/
```

Related public entry points:

- Software landing page and browser demos: <https://enesberksakalli.github.io/phylo-movies/>
- Source repository: <https://github.com/enesBerkSakalli/phylo-movies>
- Publication DOI: <https://doi.org/10.64898/2026.04.01.715821>

A release archive should be made from committed repository files, not from
generated build folders or untracked local run directories.

Recommended command:

```bash
git archive --format=tar.gz \
  --prefix=phylo-movies-publication-data/ \
  HEAD:publication_data \
  -o phylo-movies-publication-data.tar.gz
```

## Included Layers

| Layer | Include in archive | Purpose |
| --- | --- | --- |
| `README.md`, `REGENERATE.md`, `PUBLICATION_ARCHIVE.md`, `SCALE_LIMITS.md` | yes | Reader entry points, archive contract, and committed scale limits. |
| `environment.yml`, `publication_data.env` | yes | Reproducible environment and shared workflow constants. |
| `bootstrap_rogue_taxa/source_alignments/` | yes | Selected Aberer/RogueNaRok source alignments with checksums. |
| `bootstrap_rogue_taxa/scripts/bootstrap_ordering/` | yes | Bootstrap replicate generation, tree inference, ordering, and promotion scripts. |
| `bootstrap_rogue_taxa/current_results/` | yes | Promoted IQ-TREE result set, manifests, checksums, and verification report. |
| `recombination_norovirus/source_alignments/` | yes | Norovirus source snapshot, canonical MSA, and retained ReCAN subsets. |
| `recombination_norovirus/source_preparation/` | yes | Retained preprocessing inputs, metadata, and source-preparation scripts. |
| `recombination_norovirus/scripts/recan_recombination_analysis/` | yes | ReCAN validation workflow scripts. |
| `recombination_norovirus/current_results/` | yes | Promoted ReCAN validation outputs and manifest. |
| `scale_fixtures/msprime_performance/` | yes | Deterministic synthetic tree-only fixtures for visualization scale checks. |
| `quick_msa_demo/` | yes | Lightweight app/demo input used for smoke tests and examples. |
| `figure_example/` | yes | Small figure/demo tree input. |

## Excluded Layers

| Layer | Exclude from archive | Reason |
| --- | --- | --- |
| `dist/examples/` | yes | Generated web build artifact copied from `publication_data/`. |
| `electron-app/frontend-dist/examples/` | yes | Generated Electron build artifact copied from `publication_data/`. |
| Any `runs/` directory | yes | Timestamped regeneration staging; recreate from scripts. |
| Any `__pycache__/` directory or `*.pyc` file | yes | Python cache output. |
| Old quarantined or stale result folders | yes | Superseded working material, not publication evidence. |

## Verification Before Release

Run publication data and checksum verification:

```bash
npm run publication:data:check
(cd publication_data/recombination_norovirus && shasum -a 256 -c MANIFEST.sha256)
```

Confirm the archive does not contain generated staging or caches:

```bash
find publication_data \
  \( -path '*/runs/*' -o -path '*/__pycache__/*' -o -name '*.pyc' -o -path '*/legacy_stale_outputs/*' \) \
  -print
```

The `find` command should print nothing.

## App Examples Are Separate

The app examples copied into web or Electron builds are intentionally smaller
than this archive. They are openable demo payloads, not the reproducibility
source of truth. Their copy surface is controlled by:

```text
scripts/copy-examples.sh
```

The publication data archive remains the authoritative source for source
alignments, promoted results, scripts, manifests, and regeneration instructions.
