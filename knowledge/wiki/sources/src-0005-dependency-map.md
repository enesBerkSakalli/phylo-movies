---
title: "PhyloMovies Dependency Map"
type: source
status: active
created: 2026-05-16
updated: 2026-05-16
sources:
  - ../../../plans/DEPENDENCY_MAP.md
---

# PhyloMovies Dependency Map

## Summary

`plans/DEPENDENCY_MAP.md` is an LLM-facing overview of repository structure,
dependency trees, runtime services, ports, submodules, startup scripts, and
common dependency-editing locations. Source: `plans/DEPENDENCY_MAP.md`.

## Key Claims

- The repository has three dependency trees: frontend npm, Electron npm, and
  BranchArchitect Poetry/Python. Source: `plans/DEPENDENCY_MAP.md`.
- The frontend runs as React/deck.gl on Vite, typically on port 5173. Source:
  `plans/DEPENDENCY_MAP.md`.
- BranchArchitect is a Python/Flask engine exposed on port 5002 and included as
  a git submodule. Source: `plans/DEPENDENCY_MAP.md`.
- Electron is an optional desktop wrapper that bundles frontend output and the
  engine. Source: `plans/DEPENDENCY_MAP.md`.
- Development proxy routes include `/treedata`, `/stream`, `/msa`, and
  `/about`. Source: `plans/DEPENDENCY_MAP.md`.

## Evidence

The source includes a directory tree, package-manager breakdown, service
diagram, submodule commands, startup behavior, runtime ports, proxy routes, and
file locations for common dependency tasks.

## Connections

- [[repository-architecture]]
- [[phylo-movies]]
- [[brancharchitect]]
- [[software-distribution]]

## Open Questions

- The map references `start_frontend.sh`, while the README emphasizes
  `start.sh`; the wiki should verify the current canonical startup script before
  reusing this detail broadly.
- Should runtime routes be turned into an entity page for the backend API?
