# Examples

[Back to README](../README.md)

Built-in examples are declared in `src/pages/WorkspaceInitialization/exampleDatasets.js` and read from `publication_data/`. During development, Vite serves those files as `/examples/...`. During production builds, `scripts/copy-examples.sh` copies the example files into the build output.

## Where Examples Work

| Environment                             | What works                                                                                                                                                                   |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local source checkout with `./start.sh` | **Example Library** loads bundled examples through the BranchArchitect backend.                                                                                              |
| Docker full stack                       | **Example Library** loads bundled examples through the containerized backend.                                                                                                |
| Desktop app                             | Bundled examples and uploads run through the packaged local backend.                                                                                                         |
| GitHub Pages                            | `/demo` opens generated movie payloads without backend processing. Downloaded examples can be saved, but uploads and **Example Library** processing require a local backend. |

The browser demo uses the same direct Phylo-Movies payload contract as backend runs. The reviewer-facing norovirus, bootstrap, quick MSA, and paper examples include generated interpolation frames in their bundled `.movie.json` payloads. The `msprime 1000-Taxa Limit Demo` is the only intentionally input-tree-only payload, because it is a maximum-taxon rendering check rather than an interpolation walkthrough.

## Example Library

| UI name                                   | Source path under `publication_data/`                                                                                                   | Workflow                                                          | Scale                |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------- |
| Norovirus Polymerase-Capsid Recombination | `recombination_norovirus/source_preparation/augur_subsampling/03_trimmed/subsampled_350_gappyout_final.fasta`                           | Sliding-window MSA, IQ-TREE fast search                           | 334 taxa             |
| Norovirus Stability Scan                  | `recombination_norovirus/source_preparation/augur_subsampling/03_trimmed/subsampled_350_gappyout_final.fasta`                           | Sliding-window MSA, IQ-TREE fast search + SH-aLRT 1000 replicates | 334 taxa             |
| Quick MSA Demo                            | `quick_msa_demo/quick_msa_demo_30taxa_10trees.nwk` and `quick_msa_demo/quick_msa_demo_30taxa_10windows.fasta`                           | Trees + MSA                                                       | 30 taxa / 10 trees   |
| Paper Figure Example                      | `figure_example/paper_example.tree`                                                                                                     | Precomputed trees                                                 | 14 taxa / 2 trees    |
| IQ-TREE Bootstrap Trees (24 taxa)         | `bootstrap_rogue_taxa/current_results/dataset_24_source-24_taxa24_sites14190/ranked/all_trees_24_source-24_taxa24_sites14190.nwk`       | Bootstrap tree series                                             | 24 taxa / 200 trees  |
| IQ-TREE Bootstrap Trees (125 taxa)        | `bootstrap_rogue_taxa/current_results/dataset_125_source-125_taxa125_sites29149/ranked/all_trees_125_source-125_taxa125_sites29149.nwk` | Bootstrap tree series                                             | 125 taxa / 200 trees |
| msprime Performance 250                   | `scale_fixtures/msprime_performance/msprime_250taxa_50trees_seed25050.nwk`                                                              | Synthetic tree series                                             | 250 taxa / 50 trees  |
| msprime Performance 500                   | `scale_fixtures/msprime_performance/msprime_500taxa_25trees_seed50025.nwk`                                                              | Synthetic tree series                                             | 500 taxa / 25 trees  |
| msprime Performance 500 Short             | `scale_fixtures/msprime_performance/msprime_500taxa_5trees_seed50005.nwk`                                                               | Synthetic tree series                                             | 500 taxa / 5 trees   |
| msprime Performance 1000                  | `scale_fixtures/msprime_performance/msprime_1000taxa_10trees_seed100010.nwk`                                                            | Synthetic tree series                                             | 1000 taxa / 10 trees |
| msprime Performance 1000 Short            | `scale_fixtures/msprime_performance/msprime_1000taxa_5trees_seed100005.nwk`                                                             | Synthetic tree series                                             | 1000 taxa / 5 trees  |

## Minimal Example Workflow

Use **Paper Figure Example** first. It is the smallest bundled tree-only example and should process quickly.

```text
./start.sh -> http://127.0.0.1:5173/ -> Example Library -> Paper Figure Example -> Load
```

Expected result:

- The setup page shows processing progress.
- The app opens `/visualization`.
- The timeline contains input tree markers and generated frames.
- The transport controls can step between frames.

## Publication Data

The publication-data source of truth is [publication_data/README.md](../publication_data/README.md). Do not edit generated copies in `dist/examples/` or `electron-app/frontend-dist/examples/`.

## Adding a New Built-In Example

1. Add source files under `publication_data/`.
2. Add or update source documentation in that folder.
3. Add an entry to `src/pages/WorkspaceInitialization/exampleDatasets.js`.
4. Run:

```bash
npm run build
```

5. Verify the example appears in **Example Library** and loads through the backend.

For browser-demo payloads, `npm run fixtures:generate` refreshes local `.movie.json` files and reruns configured tree inference when needed. CI uses `npm run fixtures:generate:ci` on pushes to `main`; that regenerates demo payloads from the checked-in source trees without rerunning IQ-TREE, then packages the generated payloads into the build artifact. The generated `.movie.json` files under `publication_data/precomputed/` are ignored so large reviewer payloads are not committed to Git.

Current limitation: no JSON schema currently enforces `exampleDatasets.js`; keep entries consistent with existing objects.
