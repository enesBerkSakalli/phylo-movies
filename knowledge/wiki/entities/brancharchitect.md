---
title: "BranchArchitect"
type: entity
status: active
created: 2026-05-16
updated: 2026-05-16
sources:
  - ../../../README.md
  - ../../../plans/DEPENDENCY_MAP.md
---

# BranchArchitect

## Summary

BranchArchitect is the Python computation engine used by PhyloMovies to compute
SPR paths, moved subtrees, interpolation sequences, and MSA window mappings.
Sources: `README.md`, `plans/DEPENDENCY_MAP.md`.

## Key Claims

- BranchArchitect is included as a git submodule under
  `engine/BranchArchitect/`. Sources: `README.md`,
  `plans/DEPENDENCY_MAP.md`.
- It exposes a Flask API on port 5002 for frontend requests. Sources:
  `README.md`, `plans/DEPENDENCY_MAP.md`.
- It computes SPR paths between anchor trees and generates transition frames for
  frontend morphing animations. Source: `README.md`.
- It has a Poetry/Python dependency tree distinct from the frontend and
  Electron dependency trees. Source: `plans/DEPENDENCY_MAP.md`.

## Evidence

See [[src-0003-readme]] and [[src-0005-dependency-map]].

## Connections

- [[phylo-movies]]
- [[repository-architecture]]
- [[phylogenetic-tree-morphing]]
- [[velocity-normalisation]]
- [[render-node-link-id-call-map]]

## Open Questions

- Which backend API routes and payload contracts should become separate wiki
  pages?
