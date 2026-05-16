# Ingest Workflow

Use this checklist when adding a new source to the wiki.

## Inputs

- Source title
- Source type: local file, URL, paper, issue, PR, meeting note, review, dataset, or code artifact
- Source location
- User goal for the ingest

## Steps

1. Register the source in `knowledge/sources/manifest.md`.
2. If the source is not Markdown, convert it:
   - Use MarkItDown for straightforward files and broad format support.
   - Use Docling for complex PDFs, tables, OCR, layout-sensitive documents, or formulas.
   - Use Unstructured when a pipeline needs normalized document elements or chunking.
3. Read the source and identify reusable claims, entities, concepts, decisions, and open questions.
4. Create or update a source summary under `knowledge/wiki/sources/`.
5. Update relevant pages under `knowledge/wiki/concepts/`, `knowledge/wiki/entities/`, and `knowledge/wiki/analyses/`.
6. Record conflicts in `knowledge/wiki/contradictions.md`.
7. Add missing research needs to `knowledge/wiki/open-questions.md`.
8. Update `knowledge/wiki/index.md`.
9. Append an entry to `knowledge/wiki/log.md`.

## Source Summary Template

```markdown
---
title: "Source Title"
type: source
status: active
created: YYYY-MM-DD
updated: YYYY-MM-DD
sources:
  - raw-source-location
---

# Source Title

## Summary

## Key Claims

## Evidence

## Connections

## Open Questions
```
