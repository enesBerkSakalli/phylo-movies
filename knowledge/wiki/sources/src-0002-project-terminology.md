---
title: "Project Terminology"
type: source
status: active
created: 2026-05-16
updated: 2026-05-16
sources:
  - ../../../docs/terminology.md
---

# Project Terminology

## Summary

`docs/terminology.md` defines the preferred vocabulary for user-facing text,
documentation, tests, and new code in PhyloMovies. It separates app concepts
from serialized backend/API field names and gives explicit guidance on terms
that should not be merged casually. Source: `docs/terminology.md`.

## Key Claims

- Observed input trees are [[project-terminology|anchor trees]], while generated
  intermediate states are transition frames. Source: `docs/terminology.md`.
- A timeline segment is a rendered scrubber interval and must not be confused
  with a biological grouping or alignment window. Source: `docs/terminology.md`.
- A sliding window is an MSA region used to infer one anchor tree. Source:
  `docs/terminology.md`.
- The app-preferred term for topology-defined moving groups is subtree, while
  split is reserved for backend/API representations. Source:
  `docs/terminology.md`.
- `spr_move_events` and `jumping_subtree_solutions` are related but separate
  runtime contracts and should not be merged casually. Source:
  `docs/terminology.md`.

## Evidence

The source lists terms to use, terms to avoid, compatibility field names that
should not be renamed at serialization boundaries, and the distinction between
per-SPR analytics and transition topology data.

## Connections

- [[project-terminology]]
- [[phylo-movies]]
- [[brancharchitect]]

## Open Questions

- Which tests should become canonical examples for each term?
- Should older docs be linted for discouraged synonyms such as "partition" used
  as a synonym for split or subtree?
