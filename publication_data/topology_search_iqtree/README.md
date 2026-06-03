# IQ-TREE Topology Search Example

This folder contains a small Phylo-Movies example for visualising an IQ-TREE
topology-search trajectory through tree space.

## Current Result

The promoted browser-facing tree series is:

```text
current_results/iqtree500_fast_search_trajectory.nwk
```

It contains the complete fast-search trajectory from IQ-TREE 3 `.treels` output
plus the final inferred tree. The run produced 21 unique tree states, small
enough for a reviewer-facing static browser example.

## Source Alignment

The source alignment is:

```text
source_alignments/aberer_roguenarok_dataset_500_taxa500_sites1398.phy
```

It is Dataset 500 from the Aberer/RogueNaRok benchmark collection, retained here
so the example has a public source file rather than depending on a local path.

## Run Summary

- taxa: 500
- sites: 1,398
- IQ-TREE version: 3.1.1
- search mode: `-fast`
- seed: 42
- model selected by IQ-TREE: GTR+F+G4
- tree-search iterations: 2
- promoted trajectory trees: 21

Raw cloud run directories are local/generated artifacts and are intentionally
ignored.
