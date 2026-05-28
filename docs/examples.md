# Examples

[Back to README](../README.md)

Built-in examples are declared in `src/pages/WorkspaceInitialization/exampleDatasets.js` and read from `publication_data/`. During development, Vite serves those files as `/examples/...`. During production builds, `scripts/copy-examples.sh` copies the example files into the build output.

## Example Library

| UI name                            | Source path under `publication_data/`                                                                                                   | Workflow              | Scale                |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | -------------------- |
| Norovirus Polymerase-Capsid Recombination | `recombination_norovirus/source_preparation/augur_subsampling/03_trimmed/subsampled_350_gappyout_final.fasta`                           | Sliding-window MSA, IQ-TREE fast search | 334 taxa             |
| Norovirus Bootstrap Tree Search           | `recombination_norovirus/source_preparation/augur_subsampling/03_trimmed/subsampled_350_gappyout_final.fasta`                           | Sliding-window MSA, IQ-TREE thorough search + UFBoot | 334 taxa             |
| Quick MSA Demo                     | `quick_msa_demo/quick_msa_demo_30taxa_10trees.nwk` and `quick_msa_demo/quick_msa_demo_30taxa_10windows.fasta`                           | Trees + MSA           | 30 taxa / 10 trees   |
| Paper Figure Example               | `figure_example/paper_example.tree`                                                                                                     | Precomputed trees     | 14 taxa / 2 trees    |
| IQ-TREE Bootstrap Trees (24 taxa)  | `bootstrap_rogue_taxa/current_results/dataset_24_source-24_taxa24_sites14190/ranked/all_trees_24_source-24_taxa24_sites14190.nwk`       | Bootstrap tree series | 24 taxa / 200 trees  |
| IQ-TREE Bootstrap Trees (125 taxa) | `bootstrap_rogue_taxa/current_results/dataset_125_source-125_taxa125_sites29149/ranked/all_trees_125_source-125_taxa125_sites29149.nwk` | Bootstrap tree series | 125 taxa / 200 trees |
| msprime Performance 250            | `scale_fixtures/msprime_performance/msprime_250taxa_50trees_seed25050.nwk`                                                              | Synthetic tree series | 250 taxa / 50 trees  |
| msprime Performance 500            | `scale_fixtures/msprime_performance/msprime_500taxa_25trees_seed50025.nwk`                                                              | Synthetic tree series | 500 taxa / 25 trees  |
| msprime Performance 1000           | `scale_fixtures/msprime_performance/msprime_1000taxa_10trees_seed100010.nwk`                                                            | Synthetic tree series | 1000 taxa / 10 trees |

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

Current limitation: no JSON schema currently enforces `exampleDatasets.js`; keep entries consistent with existing objects.
