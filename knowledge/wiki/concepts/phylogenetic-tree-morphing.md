---
title: "Phylogenetic Tree Morphing"
type: concept
status: active
created: 2026-05-16
updated: 2026-05-16
sources:
  - ../../../README.md
  - ../../../docs/velocity-normalisation-design.md
---

# Phylogenetic Tree Morphing

## Summary

Phylogenetic tree morphing in PhyloMovies means animating transformations
between neighboring anchor trees so users can inspect interpretable subtree
migrations rather than only comparing summary distances. Sources: `README.md`,
`docs/velocity-normalisation-design.md`.

## Key Claims

- The core use case is comparing ordered tree sequences from sliding-window MSA
  analyses or bootstrap replicates. Source: `README.md`.
- PhyloMovies decomposes topological differences into subtree migrations and
  renders smooth morphing animations. Source: `README.md`.
- Transition frames can include topology changes and branch-length changes, and
  frontend animation stages distinguish COLLAPSE, EXPAND, and REORDER behavior.
  Source: `docs/velocity-normalisation-design.md`.

## Evidence

See [[src-0003-readme]] and [[src-0004-velocity-normalisation-design]].

## Connections

- [[phylo-movies]]
- [[brancharchitect]]
- [[velocity-normalisation]]
- [[project-terminology]]
- [[render-node-link-id-call-map]]
- [[timeline-subsystem-review]]

## Open Questions

- Which backend transition-frame fields are the most stable citation points for
  future implementation notes?
