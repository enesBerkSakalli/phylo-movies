---
title: Sliding-Window Phylogenetics
description: Use Phylo-Movies to inspect topology changes across phylogenetic trees inferred from overlapping MSA windows.
---

# Sliding-Window Phylogenetics with Phylo-Movies

Phylo-Movies turns trees inferred from successive alignment windows into an interactive animation. Instead of reducing every neighboring tree pair to one distance value, it shows which taxa or subtrees move, the source and target attachment context, and where each transition occurs along the ordered series.

## When This Workflow Helps

Use this workflow when a whole-alignment tree hides local phylogenetic variation or when a distance plot identifies an interesting interval but does not explain the underlying topological change. Typical inputs are an MSA plus window and step sizes, or an ordered Newick tree series inferred by an external pipeline.

Phylo-Movies is an exploratory visualization tool. It helps researchers locate and interpret topology changes; it does not by itself establish their biological cause.

## Workflow

1. Open **New Project** in the full application.
2. Provide an MSA for integrated inference, or upload an ordered tree series produced elsewhere.
3. Configure window size, step size, inference engine, model, support calculation, and rooting as required by the analysis.
4. Create the visualization and use the timeline to move between input trees and generated transition frames.
5. Open the MSA viewer when alignment context is available and enable window synchronization.
6. Review tree-distance plots, moving-subtree highlights, source/target placement, branch support, and recurrent movements together.

The static [browser demo](https://enesberksakalli.github.io/phylo-movies/demo/) contains precomputed examples. Processing a new MSA requires the desktop app, Docker, or a source checkout with the BranchArchitect backend.

## What to Inspect

- Whether topology changes cluster around particular alignment windows
- Which taxa or clades move repeatedly
- Whether the moving subtree and attachment edges have useful support context
- Whether several SPR transitions explain one large change between neighboring input trees
- Whether results remain interpretable under a different ordering, rooting choice, or distance measure

## Related Guides

- [Usage workflows](../usage.md)
- [Setup and input](../feature-reference/setup-and-input.md)
- [Timeline and inspection](../feature-reference/timeline-and-inspection.md)
- [MSA viewer](../feature-reference/msa-viewer.md)
- [Recombination analysis](recombination-analysis.md)
