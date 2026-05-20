# bioRxiv Upload vs Current Data Distribution

Audit date: 2026-05-19

This note compares the original bioRxiv/arXiv-style upload package with the
current repository and app-distributed data surfaces.

## Compared Inputs

| Surface | Path | Purpose |
| --- | --- | --- |
| bioRxiv upload package | `/Users/berksakalli/Projects/Phylo-Movies-animated-visualisation-of-phylogenetic-trees-from-sliding-window-analyses/Phylo_Movies__animated_visualisation_of_phylogenetic_trees_from_sliding_window_analyses.zip` | Manuscript source package uploaded with the preprint. |
| Current publication data | `publication_data/` | Canonical publication-data archive root. |
| Generated web build examples | `dist/examples/` | Disposable build artifact copied from `publication_data/`; not a source-data location. |
| Generated Electron frontend examples | `electron-app/frontend-dist/examples/` | Disposable build artifact copied from `publication_data/`; not a source-data location. |

## Size And File Counts

| Surface | Size | File count | Notes |
| --- | ---: | ---: | --- |
| bioRxiv upload package | 30 MB zip, 87 MB unpacked working folder | 42 files in zip | Manuscript `.tex`, `.bib`, class/style files, figures, and build PDFs. |
| `publication_data/` | 139 MB | 81 files | Clean publication-data archive root; generated run staging and caches are excluded. |
| `dist/examples/` | generated, currently removed from working tree | copied during build | Disposable app-facing example artifact. |
| `electron-app/frontend-dist/examples/` | generated, currently removed from working tree | copied during Electron build | Disposable desktop app-facing example artifact. |

## Main Difference

The bioRxiv upload package is a **manuscript-source archive**, not a
reproducibility data archive. It contains no FASTA, Newick, CSV, TSV, JSON
manifests, scripts, or `publication_data/` tree.

The uploaded manuscript nevertheless claimed:

```text
All sequence alignments, phylogenetic trees, metadata, and code used in this
study are available in the Phylo-Movies repository.
```

That claim must now be backed by the repository/archive distribution, not by
the bioRxiv manuscript zip.

## Current User Distribution Paths

`publication_data/` is the only canonical source of publication data. Any
`dist/examples/` or `electron-app/frontend-dist/examples/` folder is generated
from `publication_data/` and may be deleted after build/test work. Do not edit
or treat those folders as source data.

### Development Server

`vite.config.mts` serves any file under `publication_data/` as `/examples/...`
during development.

Consequence: local development can access much more than production builds,
including retained source, preprocessing, script, and promoted-result files.

### Production Web / GitHub Pages

`scripts/copy-examples.sh` copies only a small curated subset into
`dist/examples/`:

- `recombination_norovirus/source_preparation/augur_subsampling/03_trimmed/subsampled_350_gappyout_final.fasta`
- `quick_msa_demo/quick_msa_demo_30taxa_10trees.nwk`
- `quick_msa_demo/quick_msa_demo_30taxa_10windows.fasta`
- `figure_example/paper_example.tree`
- `bootstrap_rogue_taxa/current_results/`

Consequence: production users get demo/openable files inside the built artifact,
but those files must always be regenerated from `publication_data/`.

### Desktop App

The Electron frontend build uses the same copied `examples/` surface. It is a
packaging artifact only; the source of truth remains `publication_data/`.

## Current Closure Status

| Former gap | Current resolution |
| --- | --- |
| bioRxiv upload package contains no data archive. | `publication_data/` is now the canonical publication-data archive root; the release/archive boundary is defined in `publication_data/PUBLICATION_ARCHIVE.md`. |
| `dist/examples/` and `electron-app/frontend-dist/examples/` can be mistaken for source data. | `publication_data/README.md`, `publication_data/REGENERATE.md`, and `publication_data/PUBLICATION_ARCHIVE.md` state that generated app examples are disposable build artifacts. |
| Development `/examples/` exposes all `publication_data/`, production `/examples/` exposes only selected files. | This difference is now explicit: production app examples are curated demo payloads copied by `scripts/copy-examples.sh`; reproducibility data remain in `publication_data/`. |
| Generated example folders can become stale. | Build/copy scripts regenerate app examples from `publication_data/`; generated examples are not reviewed as source data. |
| Rogue-taxon source alignments are not distributed through app examples. | Selected source MSAs are retained under `publication_data/bootstrap_rogue_taxa/source_alignments/` and included in the publication-data archive contract. |
| `publication_data/` included generated run folders and caches. | The committed archive root is cleaned to source inputs, retained preprocessing files, scripts, promoted current results, manifests, and logs. Verification commands are in `publication_data/PUBLICATION_ARCHIVE.md`. |

## Recommended Distribution Model

Use three explicit layers:

| Layer | Audience | Contents |
| --- | --- | --- |
| Generated app demo examples | Web and desktop users | Small, curated files copied from `publication_data/` during build only. |
| Publication-data archive | Reviewers/readers who want reproducibility | Source MSAs, selected metadata, scripts, promoted current results, manifests, checksums, and `REGENERATE.md`. |
| Generated staging | Maintainers only | Timestamped run folders, intermediate bootstrap replicate MSAs, per-replicate IQ-TREE logs, caches, and stale outputs. Not distributed except as needed through an external archive. |

## Remaining Outside This Data-Archive Boundary

The data-archive boundary is now defined. Remaining resubmission work is outside
this specific row:

1. choose the final release target, such as GitHub release attachment and/or
   Zenodo DOI;
2. mirror the archive/regeneration wording in the manuscript Data Availability
   statement;
3. run the final release checklist immediately before upload.
