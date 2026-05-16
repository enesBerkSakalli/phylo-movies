---
title: "Project Terminology"
type: concept
status: active
created: 2026-05-16
updated: 2026-05-16
sources:
  - ../../../docs/terminology.md
---

# Project Terminology

## Summary

PhyloMovies uses a controlled vocabulary to keep user-facing text,
implementation docs, tests, and serialized backend contracts distinct. Source:
`docs/terminology.md`.

## Key Claims

- Anchor trees are observed input trees, while transition frames are generated
  intermediate tree states. Source: `docs/terminology.md`.
- Subtree is the app-level abstraction for topology-defined groups that move or
  are highlighted during SPR transitions. Source: `docs/terminology.md`.
- Split remains the internal/backend representation for bipartitions and should
  not replace subtree in user-facing descriptions. Source: `docs/terminology.md`.
- Compatibility fields such as `split_indices`, `pivot_edge`, and
  `jumping_subtree_solutions` should not be renamed at serialized API
  boundaries. Source: `docs/terminology.md`.

## Evidence

See [[src-0002-project-terminology]].

## Connections

- [[phylo-movies]]
- [[brancharchitect]]
- [[phylogenetic-tree-morphing]]
- [[render-node-link-id-call-map]]

## Open Questions

- Should discouraged terms be checked automatically in docs and UI strings?
