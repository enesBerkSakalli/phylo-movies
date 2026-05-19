---
title: "Karpathy LLM Wiki Gist"
type: source
status: active
created: 2026-05-18
updated: 2026-05-18
sources:
  - https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
---

# Karpathy LLM Wiki Gist

## Summary

The gist describes the LLM Wiki pattern that this repository adapts for
PhyloMovies: raw sources remain the source of truth, while an agent-maintained
Markdown wiki accumulates summaries, entity pages, concept pages,
cross-references, contradictions, and a chronological log. Source:
`https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f`.

## Key Claims

- An LLM Wiki compiles durable Markdown synthesis instead of rediscovering raw
  chunks for every question. Source: Karpathy LLM Wiki gist.
- The pattern separates raw sources, generated wiki pages, and a schema or
  agent instruction file. Source: Karpathy LLM Wiki gist.
- Periodic lint passes should look for contradictions, stale claims, orphan
  pages, missing cross-references, and knowledge gaps. Source: Karpathy LLM Wiki
  gist.
- `index.md` is content-oriented, while `log.md` is chronological. Source:
  Karpathy LLM Wiki gist.

## Evidence

See [[llm-wiki]] for the project-specific concept page derived from this seed
source.

## Connections

- [[llm-wiki]]
- [[contradictions]]
- [[open-questions]]
- [[log]]

## Open Questions

- Which parts of the generic LLM Wiki pattern should remain lightweight local
  protocol, and which should become automated tooling as this wiki grows?
