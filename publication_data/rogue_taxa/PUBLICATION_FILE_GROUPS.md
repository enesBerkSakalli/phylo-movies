# Rogue-Taxon Publication File Groups

This document orders the rogue-taxon files by publication relevance. It is a
curation map, not a claim that every listed file is already publication-ready.

## Group 1: Canonical Publication Surface

These are the files that should be presented as the main reproducible
script/data-access layer after the fixes listed below are applied.

| File | Role | Publication Status |
| --- | --- | --- |
| `epas1_pipeline/README.md` | Human-facing runbook for the EPAS1 rogue-taxon pipeline. | Keep, but update after script fixes. |
| `epas1_pipeline/config.yaml` | Example configuration for samples, region, window size, tree program, and filtering parameters. | Keep, but provide publication-grade defaults and clearly mark test defaults. |
| `epas1_pipeline/env.yml` | Conda environment for system and Python dependencies. | Keep. |
| `epas1_pipeline/Makefile` | Minimal command entry points: consensus, windows, strip. | Keep after ensuring every target is publication-safe. |
| `epas1_pipeline/scripts/consensus.py` | Builds per-sample consensus FASTA files and merged alignment. | Important, but must be fixed before citation/use. |
| `epas1_pipeline/scripts/window_trees.py` | Slices the alignment, infers trees, and emits per-window rogue-state table. | Important, but needs stronger error handling and configurable input/output paths. |
| `epas1_pipeline/scripts/utils_topology.py` | Encodes the current rogue-state classifier. | Important, but classifier is currently too narrow. |
| `epas1_pipeline/scripts/quick_strip.py` | Creates a compact visual summary from `epas1_windows.csv`. | Keep as optional figure/helper output. |

Required fixes before publication use:

- `consensus.py` must fail on missing required samples instead of silently
  skipping them.
- `consensus.py` must avoid stale `*.fa` contamination when merging.
- `consensus.py` should use a validated region-consensus command path.
- `window_trees.py` should expose input and output paths via CLI/config.
- `utils_topology.py` should support a documented, biologically defensible
  rogue-state criterion, not only exact two-taxon clades.
- `config.yaml` should not use test-grade filtering defaults in the canonical
  publication configuration.

## Group 2: Bootstrap/RogueNaRok Bridge

These files relate to the external Aberer/RogueNaRok-style bootstrap analysis
and are relevant only when specific third-party input files have been selected
and documented in `selected_external_files/`.

Current location note: this bridge currently lives under `epas1_pipeline/`, but
its clearer future home is `rogue_taxa/scripts/bootstrap_ordering/` or
`rogue_taxa/phylomovies_bootstrap_demo/scripts/`.

| File | Role | Publication Status |
| --- | --- | --- |
| `scripts/bootstrap_ordering/run_bootstrap_examples.sh` | User-facing shell entry point for regenerating datasets 24 and 125. | Canonical tool entry point. Creates self-describing timestamped run folders. |
| `scripts/bootstrap_ordering/generate_bootstrap_order.py` | Generates bootstrap replicate alignments, infers trees, ranks replicates by corrected nucleotide composition distance, and writes ordered Newick trees. | Canonical implementation for the bootstrap examples. Writes run/dataset manifests and separates bootstrap alignments, tree artifacts, and ranked outputs. |
| `epas1_pipeline/bootstrap_bridge/generate_bootstrap_order.py` | Older location for the same bridge concept. | Keep temporarily for traceability, but prefer `scripts/bootstrap_ordering/`. |
| `selected_external_files/README.md` | Placeholder for explicitly selected third-party files and provenance notes. | Keep. |

Required fixes before publication use:

- Use `--source-root` or `DATASET=PATH` inputs until selected external files
  have a formal manifest.
- Record source archive, source path, citation, and transformation status for
  every selected external file.
- Decide whether composition-distance ranking is a manuscript method, a demo
  ordering heuristic, or an internal visualization convenience.
- Do not vendor the full Aberer/RogueNaRok online-data archive.

Generated run naming pattern:

```text
run_<YYYYMMDD>T<HHMMSS><TZ>_<tree-program[-mode]>_bs<replicates>_seed<seed>_ds<datasets>[_label]
```

Generated per-dataset structure:

```text
dataset_<id>/
├── DATASET_MANIFEST.json
├── bootstrap_alignments/
├── trees/
└── ranked/
```

Actual generated dataset folders include source basename, taxon count, and site
count:

```text
dataset_<id>_source-<source-basename>_taxa<N>_sites<M>/
```

## Group 3: Data Acquisition and Environment Helpers

These files support reproducibility but should not be treated as the core
analysis result. They are useful if documented as helpers with caveats.

| File | Role | Publication Status |
| --- | --- | --- |
| `epas1_pipeline/helpers/download.py` | Downloads SRR FastQs, 1000 Genomes chr2 VCF, and GRCh38 reference resources. | Useful helper; update stale usage text and verify URLs before public release. |
| `epas1_pipeline/helpers/download_archaic.sh` | Downloads hg19 archaic VCFs from Max Planck. | Helper only; requires liftover/build-harmonization documentation. |
| `epas1_pipeline/helpers/activate.sh` | Local conda activation convenience script. | Local helper; not a reproducibility requirement. |

Required fixes before publication use:

- Verify data source URLs and access dates.
- Clarify genome build expectations: GRCh38 inputs for the canonical pipeline,
  or an explicit liftover/preprocessing stage.
- Avoid implying that downloaded hg19 archaic VCFs can be used directly with the
  GRCh38 canonical config.

## Group 4: Legacy, Exploratory, or Exclude Until Fixed

These files should not be presented as publication scripts in their current
form. They may be kept temporarily as developer references, but they should be
kept in `epas1_pipeline/legacy/` or removed before archive/deposit.

| File | Reason |
| --- | --- |
| `epas1_pipeline/legacy/create_all_consensus.sh` | Uses placeholder/reference sequences for archaic taxa and hardcoded sample choices. Biologically unsafe for publication. |
| `epas1_pipeline/legacy/download_additional_genomes.sh` | Creates a placeholder chimp sequence and handles approximate/hg19 inputs. Not publication-safe. |
| `epas1_pipeline/legacy/get_chimp_sequence.sh` | Uses approximate chimp coordinates that require verification. Not publication-safe as a canonical input builder. |
| `epas1_pipeline/legacy/fix_alignment.py` | Blindly trims all sequences to the shortest length and masks underlying build/coordinate problems. Use only as a diagnostic, not a publication method. |

Recommended handling:

- Keep these outside the canonical path.
- Keep short notes explaining why they are excluded.
- Do not cite these as manuscript reproduction scripts.

## Group 5: External Data Policy

The Aberer et al. RogueNaRok online data is external third-party data, not
Phylo-Movies data. The publication data layer should only contain selected
external files after provenance review.

Use this order when adding external files later:

1. Confirm the file is directly needed for a manuscript figure, demo, or
   validation result.
2. Add the file under `selected_external_files/`.
3. Add a provenance note in `selected_external_files/README.md`.
4. State whether the file is unchanged, renamed, filtered, converted, or
   summarized.
5. If the file is large or licensing/provenance is uncertain, deposit/link it
   through a DOI-backed archive instead of committing it here.

## Publication Readiness Summary

Current state:

- Good enough for internal curation and script review.
- Not yet good enough as a final reproducibility package.
- Main value today: identify which files matter and which should not be exposed
  as methods.

Minimum before external release:

- Fix the Group 1 scripts.
- Make Group 2 config-driven or remove it from the publication surface.
- Keep Group 4 files out of the canonical path.
- Add selected external files only with explicit provenance.
