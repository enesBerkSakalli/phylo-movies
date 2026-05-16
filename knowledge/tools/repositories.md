# Repository Evaluation for the LLM Wiki System

This page records GitHub repositories that can enhance the PhyloMovies knowledge wiki.

## Recommended First

### nvk/llm-wiki

- Repository: https://github.com/nvk/llm-wiki
- Role: LLM Wiki protocol and packaging for multiple agents.
- Use when: you want a maintained agent workflow instead of hand-maintaining only `knowledge/AGENTS.md`.
- Notes: useful because it ships Codex, Claude Code, OpenCode, and portable `AGENTS.md` modes.

### ehc-io/qmd

- Repository: https://github.com/ehc-io/qmd
- Role: local Markdown search.
- Use when: `knowledge/wiki/index.md` and `rg` are no longer enough.
- Notes: supports BM25, vector search, query expansion, reranking, and MCP integration.

### microsoft/markitdown

- Repository: https://github.com/microsoft/markitdown
- Role: lightweight file-to-Markdown conversion.
- Use when: ingesting PDFs, Office files, HTML, images, audio, CSV/JSON/XML, ZIP files, or YouTube URLs.
- Notes: best as a first-pass converter because it is simple and Markdown-oriented.

### docling-project/docling

- Repository: https://github.com/docling-project/docling
- Role: higher-fidelity document conversion.
- Use when: ingesting complex PDFs, tables, formulas, scanned documents, Office files, images, audio, or layout-sensitive sources.
- Notes: better than a simple converter when source structure matters.

## Useful Next

### axoviq-ai/synthadoc

- Repository: https://github.com/axoviq-ai/synthadoc
- Role: automated local-first wiki compiler.
- Use when: the manual wiki protocol becomes too slow or repetitive.
- Notes: supports source synthesis, cross-references, contradiction detection, orphan-page checks, citations, and Markdown output.

### Unstructured-IO/unstructured

- Repository: https://github.com/Unstructured-IO/unstructured
- Role: document ETL and structured document elements.
- Use when: building a larger ingest pipeline with many heterogeneous file formats.
- Notes: useful for chunking and normalized extraction, but may be heavier than needed for the first version.

### BerriAI/litellm

- Repository: https://github.com/BerriAI/litellm
- Role: LLM gateway and provider abstraction.
- Use when: the wiki needs model fallback, cost tracking, budgets, or a unified OpenAI-compatible API across providers.
- Notes: useful for productionizing agent workflows.

### ollama/ollama

- Repository: https://github.com/ollama/ollama
- Role: local model runtime.
- Use when: source privacy or offline processing matters.
- Notes: appropriate for draft summaries and low-risk local processing; verify important synthesis with stronger models when needed.

## Optional Later

### microsoft/graphrag

- Repository: https://github.com/microsoft/graphrag
- Role: graph-based retrieval and global relationship reasoning.
- Use when: the corpus requires relationship-heavy answers across many entities.
- Notes: do not start here; indexing can be expensive and the Markdown wiki should prove its limits first.

### graphology/graphology

- Repository: https://github.com/graphology/graphology
- Role: JavaScript graph data structures and algorithms.
- Use when: exporting wiki pages into node/link graphs for local analysis or UI.
- Notes: useful before adopting a heavier graph database.

### cytoscape/cytoscape.js

- Repository: https://github.com/cytoscape/cytoscape.js
- Role: graph visualization and graph interaction in the browser.
- Use when: the wiki needs an inspectable node/link graph UI.

### jacomyma/sigma.js

- Repository: https://github.com/jacomyal/sigma.js
- Role: WebGL graph rendering for larger interactive graphs.
- Use when: node/link exports become too large for simpler visualizations.

### markdownlint/markdownlint

- Repository: https://github.com/markdownlint/markdownlint
- Role: Markdown style checks.
- Use when: wiki pages need consistent structure in CI or pre-commit hooks.

### lycheeverse/lychee

- Repository: https://github.com/lycheeverse/lychee
- Role: broken-link checking for Markdown and HTML.
- Use when: the wiki accumulates many external citations.

## Adoption Order

1. Start with `knowledge/AGENTS.md`, `rg`, Git, and human review.
2. Add MarkItDown for simple source conversion.
3. Add Docling for complex scientific or publication sources.
4. Add QMD when search quality or corpus size demands it.
5. Evaluate Synthadoc once manual ingestion becomes repetitive.
6. Add LiteLLM or Ollama when model routing or local processing becomes a real requirement.
7. Evaluate GraphRAG only after the wiki contains enough relationship-heavy knowledge to justify it.
8. Add Graphology, Cytoscape.js, or sigma.js only after graph exports are useful.
