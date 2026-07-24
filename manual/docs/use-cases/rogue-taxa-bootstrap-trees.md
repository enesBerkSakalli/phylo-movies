---
title: Rogue Taxa Across Bootstrap Trees
description: Use recurrent subtree movements in Phylo-Movies to inspect unstable taxa across ordered bootstrap tree series.
---

# Inspecting Rogue Taxa Across Bootstrap Trees

Phylo-Movies can reveal taxa or clades that repeatedly change placement across bootstrap replicate trees. The moved-subtree analytics summarize recurrent SPR movements, while the animation shows the attachment context for each individual change.

## Why Animation Helps

Bootstrap summaries can show that support is diffuse, and rogue-taxon methods can rank unstable taxa. Phylo-Movies adds a complementary visual explanation: it shows where a recurrently moving taxon was attached, where it moves next, and which other parts of the tree are involved.

The order of bootstrap trees matters because the movie compares neighboring trees. An ordering that places similar trees near one another can make repeated movements easier to interpret. Ordering is therefore part of the exploratory workflow and should be reported with the analysis.

## Recommended Workflow

1. Prepare an ordered series of bootstrap replicate trees.
2. Load the tree series into the full application and record the rooting and ordering method.
3. Open **Analysis → Moved Subtrees**.
4. Use **Recurrent Subtrees** to identify taxa or clades that move repeatedly.
5. Select a recurrent subtree and inspect its movements in the tree view.
6. Switch to **SPR Moves** to review source attachment, target attachment, pivot edge, movement metrics, and branch annotations.
7. Compare recurrent movement with an independent rogue-taxon ranking or stability measure.

The [browser demo](https://enesberksakalli.github.io/phylo-movies/demo/) includes precomputed bootstrap tree series for learning this workflow.

## Interpretation Limits

Frequent movement is a descriptive property of the chosen ordered tree series. It can reflect weak phylogenetic signal, conflicting signal, taxon sampling, rooting, tree ordering, or inference uncertainty. Treat recurrent movement as evidence to investigate, not as a universal definition of a rogue taxon.

## Related Guides

- [SPR analytics](../feature-reference/spr-analytics.md)
- [Timeline and inspection](../feature-reference/timeline-and-inspection.md)
- [Usage workflows](../usage.md)
- [Sliding-window phylogenetics](sliding-window-phylogenetics.md)
