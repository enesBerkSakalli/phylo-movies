# Rogue-Taxon Publication Data Hygiene Audit

Audit date: 2026-05-18

Scope: `publication_data/rogue_taxa/`

## Executive Summary

The rogue-taxon publication-data layer now has the right directory separation:

- canonical EPAS1 scripts live in `epas1_pipeline/scripts/`
- external bootstrap bridge code currently lives in
  `epas1_pipeline/bootstrap_bridge/`, but should move to a rogue-taxon
  bootstrap-ordering scripts group because it is not EPAS1-specific
- download/environment helpers live in `epas1_pipeline/helpers/`
- unsafe exploratory scripts live in `epas1_pipeline/legacy/`
- selected third-party data has a reserved provenance-controlled directory:
  `selected_external_files/`

The folder is suitable for internal curation and manuscript-data planning. It is
not yet suitable as a final public reproducibility package.

## Current Hierarchy Assessment

| Path | Hygiene Status | Notes |
| --- | --- | --- |
| `README.md` | Good | States that Aberer/RogueNaRok data is external and not Phylo-Movies data. |
| `PUBLICATION_FILE_GROUPS.md` | Good | Orders files by publication relevance and flags non-publication files. |
| `.gitignore` | Good | Blocks wholesale raw/external data, generated outputs, and caches. |
| `selected_external_files/` | Good placeholder | Correctly empty except README; no third-party files are currently committed. |
| `epas1_pipeline/scripts/` | Needs fixes | Correct canonical location, but scripts need robustness and validation work. |
| `scripts/bootstrap_ordering/` | Good tool entry point | Regenerates the two bootstrap examples with RAxML replicate MSAs, corrected composition ordering, and IQ-TREE by default; FastTree remains available as an explicit exploratory mode. New runs use timestamped, self-describing folder names and role-separated subdirectories. |
| `epas1_pipeline/bootstrap_bridge/` | Superseded location | Older location for the bootstrap bridge concept. Keep temporarily for traceability, but prefer `scripts/bootstrap_ordering/`. |
| `epas1_pipeline/helpers/` | Supporting only | Useful for data access, but URLs/build assumptions need verification. |
| `epas1_pipeline/legacy/` | Correctly isolated | These files should not be cited as publication methods. |

## External Data Hygiene

The Aberer et al. RogueNaRok online-data archive is external third-party data.
The full archive is not stored here and should not be committed wholesale.

Current state:

- no large external files are present
- no `original_online_data/` directory is present
- `selected_external_files/` contains only a README
- `.gitignore` blocks accidental raw archive imports

Required before adding any external file:

1. Confirm the file is needed for a manuscript result, figure, demo, or
   validation.
2. Add only that file under `selected_external_files/`.
3. Document source archive, source path, citation, access date, local filename,
   and transformation status.
4. If file size, permissions, or provenance are uncertain, use a DOI-backed data
   deposit instead of Git.

## Canonical Script Hygiene

Canonical scripts:

- `epas1_pipeline/scripts/consensus.py`
- `epas1_pipeline/scripts/window_trees.py`
- `epas1_pipeline/scripts/utils_topology.py`
- `epas1_pipeline/scripts/quick_strip.py`

Current blockers:

- `consensus.py` skips missing samples and still writes an alignment.
- `consensus.py` can merge stale FASTA outputs from previous runs.
- `consensus.py` needs a validated region-consensus command path.
- `window_trees.py` hardcodes `out/consensus/epas1.aln.fa` and output paths.
- `window_trees.py` has limited failure reporting for tree inference/parse
  errors.
- `utils_topology.py` only detects exact two-taxon Tibetan/archaic clades.
- `quick_strip.py` assumes a fixed output path and does not validate unknown
  states.

Publication requirement:

These scripts should produce deterministic outputs from a clean checkout and
documented inputs, fail loudly on missing required data, and record enough
metadata to reproduce the run.

## Bootstrap Bridge Hygiene

Canonical bootstrap-ordering scripts:

- `scripts/bootstrap_ordering/run_bootstrap_examples.sh`
- `scripts/bootstrap_ordering/generate_bootstrap_order.py`

Current strengths:

- timestamped run folders use the pattern
  `run_<YYYYMMDD>T<HHMMSS><TZ>_<tree-program[-mode]>_bs<replicates>_seed<seed>_ds<datasets>[_label]`
- run outputs are grouped by role:
  `bootstrap_alignments/`, `trees/`, and `ranked/`
- `RUN_MANIFEST.json` and `DATASET_MANIFEST.json` record source paths,
  source checksums, parameters, and ranked-output checksums
- publication default is IQ-TREE; FastTree remains an explicit exploratory
  mode
- composition-distance ordering now counts all IUPAC ambiguity/gap states in
  the fifth vector component

Remaining blockers:

- source alignments are still read from a local external archive path unless a
  caller passes `--source-root`
- selected external files have not yet been copied into
  `selected_external_files/` with formal provenance notes
- SPR analytics still need to be regenerated after the full IQ-TREE run is
  promoted
- the older `epas1_pipeline/bootstrap_bridge/` copy remains only for
  traceability and should not be the publication entry point

Publication requirement:

Before public release, either point the tool at a documented
`selected_external_files/` manifest or record the external archive path,
citation, access date, and checksum for every source alignment used in the
promoted run.

## Helper Hygiene

Helper files:

- `epas1_pipeline/helpers/download.py`
- `epas1_pipeline/helpers/download_archaic.sh`
- `epas1_pipeline/helpers/activate.sh`

Current blockers:

- external URLs and access dates are not recorded in a manifest
- hg19/GRCh37 archaic downloads require explicit liftover/build harmonization
- `activate.sh` assumes a local `~/miniconda3` installation

Publication requirement:

Helpers can remain, but final reproducibility should depend on `env.yml` and
documented data manifests rather than machine-specific activation scripts.

## Legacy Hygiene

Legacy files:

- `epas1_pipeline/legacy/create_all_consensus.sh`
- `epas1_pipeline/legacy/download_additional_genomes.sh`
- `epas1_pipeline/legacy/fix_alignment.py`
- `epas1_pipeline/legacy/get_chimp_sequence.sh`

Reason for exclusion:

- placeholder/reference archaic or chimp sequences
- approximate chimp coordinates
- hardcoded samples and paths
- blind trimming that can hide coordinate/build mismatches

Publication requirement:

Do not cite these as methods. Remove them from any final archive if they create
confusion, or keep them only with the `legacy/README.md` warning.

## Metadata and Reproducibility Gaps

Missing but needed before public release:

- selected-input manifest for all required external files
- checksums for selected inputs and derived outputs
- exact software versions from `bcftools`, `samtools`, `FastTree`, `IQ-TREE`,
  RAxML/RAxML-NG, Python, and Python packages
- command log for each generated output
- explicit genome build statement for every input
- clear distinction between raw third-party data, derived Phylo-Movies inputs,
  and internal exploratory artifacts
- final data availability text for the manuscript

## Recommended Next Actions

1. Fix `consensus.py` and `window_trees.py` first; they are the canonical
   pipeline.
2. Convert `generate_bootstrap_order.py` to use a YAML/CSV dataset manifest.
3. Add `selected_external_files/MANIFEST.tsv` before copying any external file.
4. Add a run-log output for the canonical EPAS1 pipeline.
5. Decide whether `legacy/` remains in the final publication deposit or is
   removed before archiving.

## Current Release Decision

Do not mark the rogue-taxon data layer as publication-ready yet.

It is ready for:

- internal review
- script cleanup
- deciding which external files are needed
- preparing provenance and data-availability language

It is not ready for:

- Zenodo/Dryad deposit
- citation as a final reproducibility package
- manuscript claims that the EPAS1/rogue-taxon scripts fully reproduce a
  publication-grade analysis
