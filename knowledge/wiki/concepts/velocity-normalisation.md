---
title: "Velocity Normalisation"
type: concept
status: active
created: 2026-05-16
updated: 2026-05-16
sources:
  - ../../../docs/velocity-normalisation-design.md
---

# Velocity Normalisation

## Summary

Velocity normalisation is the animation strategy for making tree elements move
at uniform perceived speeds during radial morphing. The design treats angular
and radial movement independently during REORDER frames. Source:
`docs/velocity-normalisation-design.md`.

## Key Claims

- Angular movement should be normalized by the largest angular displacement
  across element types. Source: `docs/velocity-normalisation-design.md`.
- Radial movement should be normalized by the largest radial displacement across
  element types. Source: `docs/velocity-normalisation-design.md`.
- The recommended interpolation shape uses separate `angularT` and `radialT`
  values. Source: `docs/velocity-normalisation-design.md`.
- COLLAPSE and EXPAND frames should use raw eased time rather than velocity
  maps. Source: `docs/velocity-normalisation-design.md`.

## Evidence

See [[src-0004-velocity-normalisation-design]].

## Connections

- [[phylogenetic-tree-morphing]]
- [[brancharchitect]]

## Open Questions

- Does the current implementation fully match the proposed design?
- Which regression tests prove angular and radial normalization independently?
