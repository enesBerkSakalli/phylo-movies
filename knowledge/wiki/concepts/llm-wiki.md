---
title: "LLM Wiki"
type: concept
status: active
created: 2026-05-16
updated: 2026-05-16
sources:
  - https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
---

# LLM Wiki

## Summary

An LLM Wiki is a persistent, agent-maintained Markdown knowledge base. Instead of using retrieval-augmented generation to rediscover raw chunks on every question, the agent incrementally compiles sources into durable pages, cross-links, summaries, contradictions, and analyses.

## Key Claims

- Raw sources should remain immutable and serve as the source of truth.
- The wiki should be a generated synthesis layer that the agent maintains.
- `index.md` should provide content-oriented navigation.
- `log.md` should provide chronological memory of ingests, queries, and lint passes.
- Useful answers should be filed back into the wiki when they are likely to be reused.
- Contradictions should be surfaced explicitly rather than blended into ambiguous synthesis.

## Evidence

- Karpathy's gist describes a three-layer architecture: raw sources, generated wiki, and a schema document such as `AGENTS.md`.
- The gist emphasizes that the wiki compounds because the agent updates existing pages when new sources arrive.

## Connections

- See [[contradictions]] for conflicts discovered during maintenance.
- See [[open-questions]] for implementation decisions still unresolved.
- See [repository notes](../../tools/repositories.md) for tools that can enhance ingestion, search, and maintenance.

## Open Questions

- How much of this repo's existing documentation should be ingested into the wiki versus left as ordinary project docs?
- Should source summaries mirror every raw source, or only sources with durable conceptual value?
