---
title: "Knowledge Wiki Index"
type: index
status: active
created: 2026-05-16
updated: 2026-05-18
sources:
  - ../sources/manifest.md
---

# Knowledge Wiki Index

This index is the first page to read before answering questions against the wiki.

## Concepts

| Page | Summary |
|---|---|
| [[llm-wiki]] | Persistent, agent-maintained Markdown wiki pattern where sources are compiled into durable synthesis. |
| [[project-terminology]] | Controlled vocabulary and API-boundary naming rules for PhyloMovies. |
| [[phylogenetic-tree-morphing]] | Core animation concept for transforming ordered phylogenetic trees. |
| [[velocity-normalisation]] | Angular and radial movement timing strategy for radial tree morphing. |
| [[repository-architecture]] | Frontend, backend, Electron, package-manager, port, and submodule structure. |
| [[software-distribution]] | Desktop, Docker, local, and documentation-only deployment paths. |
| [[publication-revision-context]] | Reviewer-response framing for software access, use cases, FastTree, rogue taxa, and scalability. |

## Entities

| Page | Summary |
|---|---|
| [[phylo-movies]] | Main software project and visualization application. |
| [[brancharchitect]] | Python backend engine for SPR paths, moved subtrees, and transition frames. |

## Source Summaries

| Page | Source |
|---|---|
| [[src-0001-llm-wiki-gist]] | Karpathy LLM Wiki gist |
| [[src-0002-project-terminology]] | `docs/terminology.md` |
| [[src-0003-readme]] | `README.md` |
| [[src-0004-velocity-normalisation-design]] | `docs/velocity-normalisation-design.md` |
| [[src-0005-dependency-map]] | `plans/DEPENDENCY_MAP.md` |
| [[src-0006-mbe-revision-response-draft]] | `revision/MBE_revision_response_draft.md` |

## Analyses

| Page | Summary |
|---|---|
| [[render-node-link-id-call-map]] | Code call map for render node IDs, link IDs, endpoint IDs, and connector IDs. |
| [[timeline-subsystem-review]] | Code review and data-flow map for timeline construction, rendering, scrubbing, navigation, and store synchronization. |
| [[timeline-analytics-next-steps]] | Next implementation plan for joining Moving Subtrees analytics to movie-time charts through a canonical temporal contract. |
| [[commit-and-worktree-review-2026-05-16]] | Historical 2026-05-16 snapshot of commits and uncommitted changes affecting render identity, timeline timing, connector cleanup, and tests. |
| [[tree-node-highlight-timing-flow]] | Narrow data-flow map and invariants for nodes, highlighting, timing, playback sync, and deck.gl layer responsibilities. |

## Maintenance

- [[contradictions]] tracks conflicting claims.
- [[open-questions]] tracks research gaps and follow-up questions.
- [[log]] records ingests, analyses, queries, lint passes, and corrections.

## External Tooling Candidates

See [tool repository notes](../tools/repositories.md) for evaluated GitHub repositories that can enhance this wiki.

## Environment and Identifiers

See [environment, keys, and identifiers](../tools/environment.md) for:

- `.env.example` and `.env.local` conventions
- provider key handling
- key generation commands
- source IDs and page slugs
- graph node IDs and graph link IDs
- operation, run, artifact, and graph export IDs
