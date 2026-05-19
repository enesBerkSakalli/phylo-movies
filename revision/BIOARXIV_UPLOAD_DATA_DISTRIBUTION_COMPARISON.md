# bioRxiv Upload vs Current Data Distribution

Audit date: 2026-05-19

This note compares the original bioRxiv/arXiv-style upload package with the
current repository and app-distributed data surfaces.

## Compared Inputs

| Surface | Path | Purpose |
| --- | --- | --- |
| bioRxiv upload package | `/Users/berksakalli/Projects/Phylo-Movies-animated-visualisation-of-phylogenetic-trees-from-sliding-window-analyses/Phylo_Movies__animated_visualisation_of_phylogenetic_trees_from_sliding_window_analyses.zip` | Manuscript source package uploaded with the preprint. |
| Current publication data | `publication_data/` | Full local publication-data layer, including source/intermediate/generated material. |
| Generated web build examples | `dist/examples/` | Disposable build artifact copied from `publication_data/`; not a source-data location. |
| Generated Electron frontend examples | `electron-app/frontend-dist/examples/` | Disposable build artifact copied from `publication_data/`; not a source-data location. |

## Size And File Counts

| Surface | Size | File count | Notes |
| --- | ---: | ---: | --- |
| bioRxiv upload package | 30 MB zip, 87 MB unpacked working folder | 42 files in zip | Manuscript `.tex`, `.bib`, class/style files, figures, and build PDFs. |
| `publication_data/` | 1.9 GB | 5665 files | Full local working/publication layer; includes generated run staging and caches unless cleaned. |
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
including intermediate files and generated run folders.

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

## Current Gaps

| Gap | Why it matters | Fix before public archive |
| --- | --- | --- |
| bioRxiv upload package contains no data archive. | The manuscript data-availability statement depends entirely on the GitHub/release archive. | Create a distinct publication-data release archive or include `publication_data/` in the repository release. |
| `dist/examples/` and `electron-app/frontend-dist/examples/` can be mistaken for source data. | Duplicate folders create ambiguity about which files are authoritative. | Treat both as ignored/generated build artifacts and delete them from the working tree after build/test work. |
| Development `/examples/` exposes all `publication_data/`, production `/examples/` exposes only selected files. | Behavior differs between developer and user builds. | Make the intended difference explicit or introduce a curated `publication_data/distribution_examples/` source for both dev and build. |
| Generated example folders can become stale. | A stale build artifact may omit new manifests or current results. | Regenerate from `publication_data/` when building; never review stale generated copies. |
| Rogue-taxon source alignments are still not distributed through the app examples. | App users can view promoted IQ-TREE trees, but cannot regenerate the bootstrap examples from the app bundle. | Put selected source MSAs in a publication source-alignment layer and include them in the publication-data archive, not necessarily in the app demo bundle. |
| `publication_data/` currently includes generated run folders and `__pycache__` files. | A public archive would be noisy and too large. | Exclude generated staging/caches; promote only source inputs, scripts, current results, manifests, and logs. |

## Recommended Distribution Model

Use three explicit layers:

| Layer | Audience | Contents |
| --- | --- | --- |
| Generated app demo examples | Web and desktop users | Small, curated files copied from `publication_data/` during build only. |
| Publication-data archive | Reviewers/readers who want reproducibility | Source MSAs, selected metadata, scripts, promoted current results, manifests, checksums, and `REGENERATE.md`. |
| Generated staging | Maintainers only | Timestamped run folders, intermediate bootstrap replicate MSAs, per-replicate IQ-TREE logs, caches, and stale outputs. Not distributed except as needed through an external archive. |

## Immediate Decision

Before moving more files, the repository should define:

1. `publication_data/source_alignments/` as the source MSA layer.
2. `publication_data/REGENERATE.md` as the user-facing regeneration entry
   point.
3. `scripts/copy-examples.sh` as app-demo-only, not publication-archive logic;
   generated output should stay ignored and disposable.
4. A release/archive checklist that excludes `runs/`, `__pycache__/`, stale
   quarantined outputs, and old test-data working folders.

Only after that should we copy the selected rogue-taxon source alignments and
normalize the ReCAN script names.
