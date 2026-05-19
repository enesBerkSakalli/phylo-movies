# IQ-TREE Re-Inference Plan For Rogue-Taxon Bootstrap Examples

Plan date: 2026-05-18

Scope: `publication_data/bootstrap_example/`

## Reviewer Trigger

Reviewer 3, Comment 3 in `revision/MBE_revision_response_draft.md` says that
FastTree is surprising because it is older and less accurate, and notes that
IQ-TREE has a fast option.

Current evidence from `run_log.txt`:

- RAxML generated the bootstrap replicate alignments with `raxmlHPC -f j`.
- FastTree inferred one tree per replicate alignment.
- The Phylo-Movies example uses 200 replicates, seed 42, and composition-distance
  ordering.

Therefore the publication-facing fix should replace FastTree tree inference for
the rogue-taxon bootstrap examples. It does not need to replace the whole
Phylo-Movies tree-loading concept: Phylo-Movies accepts ordered Newick trees
from any inference tool.

## Decision

Create a new IQ-TREE-derived rogue-taxon bootstrap tree set for datasets 24 and
125.

The primary publication tree set should use IQ-TREE for tree inference on each
explicit bootstrap replicate alignment. Keep the replicate alignments explicit
because the current Phylo-Movies ordering workflow ranks replicates by their
nucleotide-composition distance from the original alignment.

Preserve that ordering logic, but use the corrected full-cell composition metric
documented in `DISTANCE_METRIC_AUDIT.md`: `(A, C, G, T, AmbiguousOrGap)`.

Do not use IQ-TREE's internal bootstrap output as the first replacement unless
we decide to drop or redefine composition-distance ordering. IQ-TREE can run
standard and ultrafast bootstrap analyses internally and can write bootstrap
trees, but the documented command-line interface does not expose one resampled
MSA file per nonparametric bootstrap replicate. The current ordering workflow
depends on those explicit replicate alignments.

## Proposed Method

### Inputs

| Dataset | External source alignment | Current demo |
| --- | --- | --- |
| 24 | `/Users/berksakalli/Projects/rogue_taxa_analysis/online-data/data/datasets/alignments/24` | `24/all_trees_24.nwk` |
| 125 | `/Users/berksakalli/Projects/rogue_taxa_analysis/online-data/data/datasets/alignments/125` | `125/all_trees_125.nwk` |

### Bootstrap Replicate Alignments

Short-term reproducible path:

- Use the existing RAxML `-f j` replicate-alignment generation with the same
  seed (`42`) and replicate count (`200`).
- Record RAxML version, command, source alignment checksum, and generated
  replicate alignment checksums.

Cleaner future path:

- Replace RAxML `-f j` with a small deterministic Python replicate-alignment
  generator so the workflow is not tied to legacy RAxML just to sample columns.
- Validate the Python generator against expected dimensions, taxon order, and
  deterministic seed behavior.

IQ-TREE-only alternative:

- Use IQ-TREE standard nonparametric bootstrap to generate bootstrap trees
  directly, for example `iqtree2 -s <alignment> -m GTR+G --bonly 200 -pre <run>`.
- This would produce an IQ-TREE bootstrap tree set, but not the per-replicate
  MSA files needed by the current nucleotide-composition ordering metric.
- If we choose this route, define a new ordering metric over trees, such as
  input order, RF distance to the original-alignment ML tree, likelihood under
  the original alignment, or another documented topology/branch-length score.

### IQ-TREE Inference

Primary publication run:

```bash
iqtree2 \
  -s <replicate_alignment> \
  -st DNA \
  -m GTR+G \
  -T 1 \
  -seed 42 \
  -pre <replicate_output_prefix> \
  -quiet \
  --redo
```

Rationale:

- `GTR+G` preserves the closest model relationship to the current FastTree
  `-gtr -gamma -nt` run.
- `-T 1` keeps per-replicate runs predictable and avoids over-subscribing CPUs
  when replicates are parallelized externally.
- `-seed` makes IQ-TREE stochastic choices reproducible.
- `--redo` avoids hidden checkpoint reuse during controlled regeneration.

Optional speed/sensitivity run:

```bash
iqtree2 \
  -s <replicate_alignment> \
  -st DNA \
  -m GTR+G \
  -T 1 \
  -seed 42 \
  -fast \
  -pre <replicate_output_prefix> \
  -quiet \
  --redo
```

Use this only as a speed comparison or reviewer-facing sensitivity check. The
primary replacement should use default IQ-TREE search unless runtime becomes a
blocker.

## Output Layout

Do not overwrite the current FastTree examples until the IQ-TREE outputs have
passed validation.

Recommended staging layout:

```text
publication_data/bootstrap_example/
├── README.md
├── IQTREE_REINFERENCE_PLAN.md
└── iqtree_reinference/
    ├── README.md
    └── runs/
        └── run_<YYYYMMDD>T<HHMMSS><TZ>_iqtree-<mode>_bs<N>_seed<S>_ds<ids>[_label]/
            ├── RUN_MANIFEST.json
            ├── run_log.txt
            ├── dataset_24_source-24_taxa24_sites14190/
            │   ├── DATASET_MANIFEST.json
            │   ├── bootstrap_alignments/
            │   ├── trees/
            │   └── ranked/
            │       ├── bootstrap_order_24_source-24_taxa24_sites14190.tsv
            │       └── all_trees_24_source-24_taxa24_sites14190.nwk
            └── dataset_125_source-125_taxa125_sites29149/
                ├── DATASET_MANIFEST.json
                ├── bootstrap_alignments/
                ├── trees/
                └── ranked/
                    ├── bootstrap_order_125_source-125_taxa125_sites29149.tsv
                    └── all_trees_125_source-125_taxa125_sites29149.nwk
```

The run directory name is intentionally verbose: timestamp, timezone, method,
replicate count, seed, datasets, and optional short label are visible without
opening a log file. Generated run folders remain ignored by Git until reviewed.

After validation, either:

1. promote the IQ-TREE files to the existing app-facing paths
   (`24/all_trees_24.nwk`, `125/all_trees_125.nwk`), moving the old FastTree
   files to `fasttree_legacy/`, or
2. update the app example dataset list to expose both "legacy FastTree" and
   "publication IQ-TREE" variants.

Option 1 is simpler for the manuscript. Option 2 is useful if we want to show
that Phylo-Movies is inference-tool agnostic.

## Script Changes Needed

Current script:

```text
publication_data/rogue_taxa/scripts/bootstrap_ordering/generate_bootstrap_order.py
```

Required changes:

1. Add a source-alignment manifest before copying selected external files into
   `selected_external_files/`.
2. Keep `--tree-program iqtree` as the publication default for this workflow.
3. Keep IQ-TREE threading on the current IQ-TREE 2 `-T` flag.
4. Keep `--iqtree-mode default|fast` explicit, with `fast` used only for smoke
   and sensitivity runs.
5. Preserve machine-readable `RUN_MANIFEST.json` and `DATASET_MANIFEST.json`
   files containing dataset IDs, source alignment paths, source checksums,
   replicate count, seed, tree program/mode, and ranked-output checksums.
6. Keep per-replicate IQ-TREE `.log` and `.iqtree` files in an ignored or
   archived logs directory; retain enough logs to audit command/version/model.

Current shell entry point:

```bash
publication_data/rogue_taxa/scripts/bootstrap_ordering/run_bootstrap_examples.sh --smoke
```

## Validation Criteria

Before replacing the current demo files:

- every source and replicate alignment composition vector sums to
  `n_taxa * n_sites`,
- `all_trees_24_iqtree.nwk` has exactly 200 trees and 24 unique taxa per tree.
- `all_trees_125_iqtree.nwk` has exactly 200 trees and 125 unique taxa per tree.
- `bootstrap_order_*_iqtree.tsv` has 200 data rows plus header.
- Every ranked tree path exists before concatenation.
- The ranked Newick file order matches the ranking table.
- Phylo-Movies loads both IQ-TREE tree files without parser errors.
- Branch lengths are present and finite.
- SPR event analytics are regenerated from the IQ-TREE tree sets.
- The manuscript and README state:
  - replicate alignments were generated explicitly by RAxML `-f j` or by the new
    deterministic generator,
  - tree inference for the publication rogue-taxon examples used IQ-TREE 2,
  - the older FastTree files are legacy exploratory examples if retained.

## Recommended Execution Order

1. Decide whether to preserve the current composition-distance ordering.
2. If preserving it, create a dataset manifest for source alignments 24 and 125
   and keep explicit replicate-alignment generation.
3. If dropping it, use IQ-TREE standard bootstrap trees directly and define the
   replacement tree-ordering metric.
4. Refactor the bootstrap-ordering script out of `epas1_pipeline/`.
5. Run a smoke test with 2 replicates per dataset using the selected method.
6. Run the full 200-replicate IQ-TREE workflow for dataset 24.
7. Validate and load dataset 24 in Phylo-Movies.
8. Run the full 200-replicate IQ-TREE workflow for dataset 125.
9. Regenerate SPR analytics for both IQ-TREE tree sets.
10. Compare the major moving subtrees between old FastTree and new IQ-TREE
   outputs to check whether the narrative still holds.
11. Promote IQ-TREE files to publication-facing paths or expose both variants.
12. Update manuscript Methods, README, and relationship map.

## Local Environment Note

Current local IQ-TREE executable detected during planning:

```text
/usr/local/bin/iqtree2
IQ-TREE multicore version 2.4.0 for MacOS ARM 64-bit built Mar 8 2025
```

Final release documentation should record the exact version used for the
regeneration run, not just the version detected during this planning pass.
