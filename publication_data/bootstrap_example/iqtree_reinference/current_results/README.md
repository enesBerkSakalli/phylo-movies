# Current Rogue-Taxon Bootstrap Results

This folder contains the promoted current publication-facing result set for the
two rogue-taxon bootstrap examples.

Source run:

```text
run_20260518T202621+0200_iqtree-default_bs200_seed42_ds24-125_full-iqtree-default-j4-redo
```

Publication-facing files:

- ranked Phylo-Movies Newick tree files
- semantic composition-ranked bootstrap replicate tables
- dataset manifests
- ordering semantics note
- verification report

The ordering is documented in `ORDERING_SEMANTICS.md`. In short, trees are
ordered by ascending nucleotide-composition distance between each bootstrap
replicate alignment and the source alignment, using `(A, C, G, T,
AmbiguousOrGap)`. This is a deterministic visualization/order heuristic, not a
biological time axis, likelihood ranking, support value, or rogue-taxon severity
score.

Method summary:

- bootstrap replicate alignments: RAxML `raxmlHPC -f j`
- tree inference: IQ-TREE 2 default search mode, not `-fast`
- replicates: 200 per dataset
- seed: 42

Source alignment provenance:

- dataset manifests keep both the source alignment SHA256 and the path relative
  to `ROGUE_TAXA_SOURCE_ROOT`;
- absolute `source_alignment` paths in `SOURCE_RUN_*` snapshots are local
  execution provenance, not portable repo paths;
- the portable source contract is the relative source label plus SHA256 in each
  promoted `DATASET_MANIFEST.json`.

IQ-TREE per-replicate inference artifacts are not publication-facing results in
this folder. They remain in the ignored staging run and are documented through
`SOURCE_RUN_LOG.txt` and `SOURCE_RUN_MANIFEST.json`.
Those `SOURCE_RUN_*` files are provenance snapshots of the source run; the
publication-facing ordering contract in this folder is the
`composition_ranked_bootstrap_replicates_*.tsv` files referenced by the promoted
dataset manifests.

Bulky bootstrap replicate alignments are also not promoted here; they remain in
ignored staging as derived MSA intermediates.
