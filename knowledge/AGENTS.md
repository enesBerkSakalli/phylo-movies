# Knowledge Wiki Agent Protocol

You maintain the LLM Wiki under `knowledge/wiki/`.

## Purpose

The wiki is a persistent synthesis layer for PhyloMovies research, implementation context, related tooling, publication material, design decisions, and domain knowledge. It follows the LLM Wiki pattern: raw sources remain immutable, and the agent maintains structured Markdown pages that compound over time.

## Invariants

- Never rewrite or "clean up" raw files under `knowledge/sources/`.
- Every factual claim added to the wiki should cite either a raw source, a repository file, a prior wiki page, or a linked external source.
- Prefer updating existing pages over creating near-duplicates.
- Use Obsidian-style links for internal wiki links, such as `[[llm-wiki]]`.
- Use relative Markdown links for repository files.
- Append every ingest, query, and lint operation to `knowledge/wiki/log.md`.
- Follow `knowledge/tools/environment.md` for environment variables, secrets,
  source IDs, page slugs, graph node IDs, and graph link IDs.
- If two sources disagree, record the conflict in `knowledge/wiki/contradictions.md` instead of blending claims.
- Keep generated synthesis under `knowledge/wiki/`; keep process notes under `knowledge/tools/`.

## Page Conventions

Use YAML frontmatter on generated wiki pages:

```yaml
---
title: "Human Readable Title"
type: concept | entity | source | analysis | index | log | maintenance
status: draft | active | needs-review | deprecated
created: YYYY-MM-DD
updated: YYYY-MM-DD
sources:
  - path-or-url
---
```

Use these sections when applicable:

- `## Summary`
- `## Key Claims`
- `## Evidence`
- `## Connections`
- `## Open Questions`

## Ingest Workflow

1. Register the source in `knowledge/sources/manifest.md`.
2. Convert the source to Markdown if needed.
3. Create or update a source summary under `knowledge/wiki/sources/`.
4. Update relevant pages under `knowledge/wiki/concepts/`, `knowledge/wiki/entities/`, and `knowledge/wiki/analyses/`.
5. Update `knowledge/wiki/index.md`.
6. Add contradictions to `knowledge/wiki/contradictions.md`.
7. Append a dated entry to `knowledge/wiki/log.md`.

## Query Workflow

1. Read `knowledge/wiki/index.md`.
2. Search the wiki with `rg`; use QMD when a semantic index exists.
3. Read the smallest sufficient set of wiki pages.
4. Answer with citations to wiki pages, raw sources, or repository files.
5. If the answer is reusable, save it under `knowledge/wiki/analyses/`.
6. Append the query to `knowledge/wiki/log.md`.

## Lint Workflow

Check for:

- orphan pages with no inbound links
- important terms without pages
- missing source citations
- duplicate or overlapping concept pages
- unresolved contradictions
- stale claims superseded by newer sources
- broken internal links
- broken external links

Update `knowledge/wiki/index.md`, `knowledge/wiki/contradictions.md`, and `knowledge/wiki/open-questions.md` as needed.

## Recommended Tools

- Use `rg` first for exact repository and wiki search.
- Use MarkItDown for lightweight conversion of PDFs, Office files, HTML, CSV/JSON/XML, images, audio, ZIP files, and YouTube URLs.
- Use Docling for complex PDFs, layout-sensitive documents, tables, formulas, OCR, and structured document exports.
- Use QMD when the wiki becomes large enough to need BM25/vector/hybrid Markdown search.
- Use markdownlint and lychee as quality gates when installed.
- Consider Synthadoc only when a higher-level automated wiki compiler is desired.
- Consider GraphRAG only for relationship-heavy corpora where graph-level retrieval is worth the indexing cost.
