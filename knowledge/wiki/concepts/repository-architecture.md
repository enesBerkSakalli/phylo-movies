---
title: "Repository Architecture"
type: concept
status: active
created: 2026-05-16
updated: 2026-05-16
sources:
  - ../../../plans/DEPENDENCY_MAP.md
  - ../../../README.md
---

# Repository Architecture

## Summary

PhyloMovies is organized as a frontend application, a Python computation engine
submodule, and an optional Electron desktop wrapper. Sources:
`plans/DEPENDENCY_MAP.md`, `README.md`.

## Key Claims

- The frontend is React/Vite/deck.gl and uses npm dependencies from the root
  package. Sources: `README.md`, `plans/DEPENDENCY_MAP.md`.
- [[brancharchitect]] is a Python/Flask backend engine managed with Poetry and
  exposed locally on port 5002. Sources: `README.md`,
  `plans/DEPENDENCY_MAP.md`.
- The Electron app is an optional wrapper with a separate npm dependency tree.
  Source: `plans/DEPENDENCY_MAP.md`.
- Development uses Vite proxy routes to reach the backend for tree, stream,
  MSA, and about endpoints. Source: `plans/DEPENDENCY_MAP.md`.

## Evidence

See [[src-0005-dependency-map]] and [[src-0003-readme]].

## Connections

- [[phylo-movies]]
- [[brancharchitect]]
- [[software-distribution]]
- [[render-node-link-id-call-map]]
- [[timeline-subsystem-review]]
- [[commit-and-worktree-review-2026-05-16]]

## Open Questions

- Verify whether `start_frontend.sh` or `start.sh` is the current canonical
  startup script before adding runbook pages.
