---
title: "Open Questions"
type: maintenance
status: active
created: 2026-05-16
updated: 2026-05-16
sources: []
---

# Open Questions

Questions worth investigating as the knowledge wiki grows.

## Wiki System

- Should this repository use only the lightweight local protocol, or should it adopt `nvk/llm-wiki` or Synthadoc after a trial?
- At what page count should QMD become mandatory instead of optional?
- Which source types matter most for PhyloMovies: papers, issue threads, code review notes, publication drafts, or user feedback?

## PhyloMovies Knowledge

- Which implementation decisions deserve stable concept pages?
- Which domain entities should become first-class wiki pages?
- Which current code paths already implement the velocity-normalisation design?
- Which MBE revision response items still need code, documentation, or manuscript
  follow-up?
- Should missing `split_indices` fail during source-tree validation now that
  layout node IDs are prepared before normalization?
- Should timeline segment records and one-based renderer item IDs get a stable
  schema page?
