# PhyloMovies Knowledge Wiki

This directory is a Markdown-native LLM Wiki for accumulating persistent knowledge about PhyloMovies, phylogenetic animation, implementation decisions, related research, and supporting tools.

## Layout

```text
knowledge/
  AGENTS.md
  README.md
  sources/
    manifest.md
  wiki/
    index.md
    log.md
    contradictions.md
    open-questions.md
    concepts/
    entities/
    sources/
    analyses/
  tools/
    environment.md
    ingest.md
    query.md
    lint.md
    repositories.md
```

## How It Works

- `sources/` stores raw inputs and the source manifest. Raw sources are immutable once added.
- `wiki/` stores agent-maintained synthesis pages with citations and cross-links.
- `tools/` stores reusable operating checklists for ingestion, querying, linting, and tool selection.
- `AGENTS.md` is the protocol agents must follow when operating the wiki.
- `.env.example` documents safe environment variables and placeholder keys.

## First Use

1. Add raw source files under `knowledge/sources/` or register external URLs in `knowledge/sources/manifest.md`.
2. Ask the agent to ingest one source at a time.
3. Review generated pages under `knowledge/wiki/`.
4. Ask periodic lint passes to find contradictions, stale claims, and missing cross-links.

## Current Status

The scaffold is initialized with the [[llm-wiki|LLM Wiki]] concept and a curated list of candidate repositories that can enhance the system.

Environment, key handling, and identifier generation are defined in [tools/environment.md](tools/environment.md).
