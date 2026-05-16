# Source Manifest

This file registers raw sources and external references used by the knowledge wiki.

| ID | Title | Type | Location | Added | Status | Notes |
|---|---|---|---|---|---|---|
| src-0001 | Karpathy LLM Wiki gist | gist | https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f | 2026-05-16 | active | Seed idea for the persistent Markdown wiki pattern. |
| src-0002 | Project terminology | repo-doc | docs/terminology.md | 2026-05-16 | active | Controlled vocabulary for UI, docs, tests, and code. |
| src-0003 | PhyloMovies README | repo-doc | README.md | 2026-05-16 | active | Public project overview, setup paths, features, limitations, and citation. |
| src-0004 | Velocity normalisation design | repo-doc | docs/velocity-normalisation-design.md | 2026-05-16 | active | Design note for angular and radial velocity normalization during tree morphing. |
| src-0005 | Dependency map | repo-doc | plans/DEPENDENCY_MAP.md | 2026-05-16 | active | LLM-facing map of package managers, services, ports, and submodule structure. |
| src-0006 | MBE revision response draft | repo-doc | revision/MBE_revision_response_draft.md | 2026-05-16 | active | Planned response to editor and reviewer feedback for MBE-26-0127. |

## Conventions

- Raw local files belong under `knowledge/sources/`.
- External sources may be registered by URL when the raw file is not stored locally.
- Do not edit raw source content after ingestion; add a new source entry for revised material.
