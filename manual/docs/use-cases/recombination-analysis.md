---
title: Recombination Analysis
description: Explore local phylogenetic changes and candidate recombination intervals with Phylo-Movies.
---

# Exploring Recombination with Local Phylogenetic Trees

Phylo-Movies helps inspect how local phylogenetic relationships change across an alignment. In a sliding-window analysis, the timeline, tree animation, distance plots, and synchronized MSA view make it easier to connect a candidate breakpoint region with the taxa and subtrees involved in the topology change.

## What Phylo-Movies Contributes

A peak in Robinson–Foulds or another tree-distance measure identifies that neighboring trees differ, but it does not explain the change. Phylo-Movies decomposes the transition into subtree-prune-and-regraft movements and displays the source placement, target placement, and intermediate frames.

This supports questions such as:

- Which sequence group changes placement across a candidate breakpoint?
- Does the same group move repeatedly across adjacent windows?
- Are relevant branches supported in the observed input trees?
- Does the MSA window align with the region where topology changes?

## Recommended Workflow

1. Infer an ordered tree series from overlapping MSA windows using a model and support procedure appropriate for the dataset.
2. Load the MSA and trees into the full application, or run the integrated MSA workflow.
3. Use the distance plot to find intervals with pronounced tree change.
4. Step through the corresponding transition and inspect highlighted moving subtrees.
5. Compare source and target placement and review branch-support context.
6. Use taxa coloring to mark known genotypes, hosts, locations, or other metadata groups.
7. Export a still image or recording when the displayed transition is useful for reporting.

The generated norovirus example in the [browser demo](https://enesberksakalli.github.io/phylo-movies/demo/) illustrates this workflow without requiring local processing.

## Interpretation Limits

An animated topology change is evidence about differences between inferred trees, not a standalone recombination test. Window size, step size, taxon sampling, alignment quality, substitution model, rooting, and tree uncertainty all affect the observed pattern. Confirm biological conclusions with appropriate statistical analyses and domain evidence.

## Related Guides

- [Sliding-window phylogenetics](sliding-window-phylogenetics.md)
- [Taxa coloring](../feature-reference/taxa-coloring.md)
- [Timeline and inspection](../feature-reference/timeline-and-inspection.md)
- [Export and recording](../feature-reference/export-and-recording.md)
