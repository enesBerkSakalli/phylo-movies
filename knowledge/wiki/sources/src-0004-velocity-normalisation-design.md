---
title: "Velocity Normalisation Design"
type: source
status: active
created: 2026-05-16
updated: 2026-05-16
sources:
  - ../../../docs/velocity-normalisation-design.md
---

# Velocity Normalisation Design

## Summary

`docs/velocity-normalisation-design.md` describes how PhyloMovies should
normalize angular and radial movement speeds during radial tree morphing. The
document distinguishes animation stages and recommends independent angular and
radial normalization during REORDER frames. Source:
`docs/velocity-normalisation-design.md`.

## Key Claims

- Radial tree morphing has separate angular and radial velocity problems.
  Source: `docs/velocity-normalisation-design.md`.
- BranchArchitect decomposes a tree-to-tree transition into a five-step surgery
  per active-changing split. Source:
  `docs/velocity-normalisation-design.md`.
- Frontend detection classifies consecutive transition frames as COLLAPSE,
  EXPAND, or REORDER. Source: `docs/velocity-normalisation-design.md`.
- The recommended approach is independent normalization: angular interpolation
  gets `angularT`, and radial interpolation gets `radialT`. Source:
  `docs/velocity-normalisation-design.md`.
- COLLAPSE and EXPAND stages should not receive velocity maps; their timing is
  handled by stage-specific easing. Source:
  `docs/velocity-normalisation-design.md`.

## Evidence

The source provides formulas, stage definitions, code-level design notes, and a
call chain from frame processing through tree interpolation.

## Connections

- [[velocity-normalisation]]
- [[phylogenetic-tree-morphing]]
- [[brancharchitect]]

## Open Questions

- Which current code paths already implement the proposed dual `{ angularT,
  radialT }` shape?
- Should the wiki track implementation status separately from the design
  document?
