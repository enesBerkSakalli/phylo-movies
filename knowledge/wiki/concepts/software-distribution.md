---
title: "Software Distribution"
type: concept
status: active
created: 2026-05-16
updated: 2026-05-16
sources:
  - ../../../README.md
  - ../../../revision/MBE_revision_response_draft.md
---

# Software Distribution

## Summary

PhyloMovies distribution has multiple user paths: documentation-only GitHub
Pages, desktop builds, Docker, and source-based full-stack execution. Sources:
`README.md`, `revision/MBE_revision_response_draft.md`.

## Key Claims

- GitHub Pages is documentation-only and cannot run backend-dependent workflows.
  Sources: `README.md`, `revision/MBE_revision_response_draft.md`.
- Full processing requires the desktop app, Docker image, or local full-stack
  setup. Sources: `README.md`, `revision/MBE_revision_response_draft.md`.
- macOS users may need Gatekeeper workarounds for unsigned open-source desktop
  builds. Sources: `README.md`, `revision/MBE_revision_response_draft.md`.
- The frontend viewer can load Newick tree files without the backend, but tree
  interpolation and MSA-based workflows need BranchArchitect. Source:
  `README.md`.

## Evidence

See [[src-0003-readme]] and [[src-0006-mbe-revision-response-draft]].

## Connections

- [[phylo-movies]]
- [[brancharchitect]]
- [[publication-revision-context]]

## Open Questions

- Which release artifacts are currently available and tested for each platform?
