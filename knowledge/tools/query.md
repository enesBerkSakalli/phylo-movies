# Query Workflow

Use this checklist when answering questions against the wiki.

## Steps

1. Read `knowledge/wiki/index.md`.
2. Search with `rg` first:

```bash
rg -n "query terms" knowledge/wiki
```

3. If QMD is installed and indexed, use it for semantic or hybrid search.
4. Read only the relevant pages needed to answer the question.
5. Answer with citations to wiki pages, raw sources, repository files, or external URLs.
6. If the answer adds reusable synthesis, create a page under `knowledge/wiki/analyses/`.
7. Update `knowledge/wiki/index.md` if a new page is added.
8. Append a query entry to `knowledge/wiki/log.md`.

## Answer Standard

- Separate evidence-backed claims from inference.
- Cite the page or source for each important claim.
- Flag uncertainty and missing evidence.
- Do not treat wiki synthesis as stronger than its underlying sources.
