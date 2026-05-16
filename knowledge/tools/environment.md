# Environment, Keys, and Identifiers

This document defines environment variables, key-handling rules, and identifier
formats for the PhyloMovies knowledge wiki.

## Principles

- Never commit real API keys, signing secrets, or encryption keys.
- Keep committed configuration in `.env.example`.
- Keep local secrets in `.env.local`, `.env.*.local`, shell profiles, or an OS
  keychain.
- Prefer provider keys scoped to the smallest project and budget.
- Prefer stable identifiers for durable artifacts and random identifiers for
  transient runs.
- Record generated artifact identifiers in `knowledge/wiki/log.md`.

## Files

| File | Committed | Purpose |
|---|---:|---|
| `.env.example` | yes | Safe template with empty keys and example values. |
| `.env.local` | no | Local developer secrets and model choices. |
| `.env.production.local` | no | Production-only secrets if this system is automated. |
| `knowledge/sources/manifest.md` | yes | Durable source IDs and source locations. |
| `knowledge/wiki/log.md` | yes | Operation IDs, run IDs, and change history. |

## Environment Variables

### Core

| Variable | Required | Example | Purpose |
|---|---:|---|---|
| `KNOWLEDGE_ENV` | yes | `local` | Runtime mode: `local`, `ci`, or `production`. |
| `KNOWLEDGE_INSTANCE_ID` | yes | UUIDv4 | Stable identifier for this wiki checkout. |
| `KNOWLEDGE_ID_NAMESPACE` | no | `phylo-movies` | Prefix namespace for generated IDs. |
| `KNOWLEDGE_ROOT` | no | `knowledge` | Knowledge system root directory. |
| `KNOWLEDGE_SOURCES_DIR` | no | `knowledge/sources` | Raw source directory. |
| `KNOWLEDGE_WIKI_DIR` | no | `knowledge/wiki` | Generated wiki directory. |

### Model Providers

| Variable | Required | Purpose |
|---|---:|---|
| `OPENAI_API_KEY` | no | OpenAI models and embeddings. |
| `ANTHROPIC_API_KEY` | no | Anthropic models. |
| `GOOGLE_API_KEY` | no | Gemini models. |
| `GROQ_API_KEY` | no | Groq-hosted models. |
| `DEEPSEEK_API_KEY` | no | DeepSeek models. |
| `OPENAI_BASE_URL` | no | OpenAI-compatible endpoint for Ollama or LiteLLM. |

### Model Selection

| Variable | Required | Purpose |
|---|---:|---|
| `KNOWLEDGE_LLM_MODEL` | no | Default chat or reasoning model for wiki work. |
| `KNOWLEDGE_EMBEDDING_MODEL` | no | Default embedding model for search tools. |
| `KNOWLEDGE_RERANK_MODEL` | no | Default reranker model for hybrid search. |

### Search

| Variable | Required | Purpose |
|---|---:|---|
| `QMD_COLLECTION` | no | QMD collection name for this wiki. |
| `QMD_INDEX_DIR` | no | Local QMD index path. |

### Local Secrets

| Variable | Required | Purpose |
|---|---:|---|
| `KNOWLEDGE_RUN_SIGNING_SECRET` | no | HMAC secret for signing generated run manifests. |
| `KNOWLEDGE_EXPORT_ENCRYPTION_KEY` | no | Symmetric key for local encrypted exports. |

## Key Generation

Run these locally. Do not paste generated values into chat.

### Instance ID

Use a UUIDv4 for `KNOWLEDGE_INSTANCE_ID`:

```bash
node -e "console.log(crypto.randomUUID())"
```

Alternative:

```bash
uuidgen | tr '[:upper:]' '[:lower:]'
```

### Run Signing Secret

Use 32 random bytes encoded as lowercase hex:

```bash
openssl rand -hex 32
```

Store as:

```bash
KNOWLEDGE_RUN_SIGNING_SECRET=<64-hex-character-value>
```

### Export Encryption Key

Use 32 random bytes encoded as base64:

```bash
openssl rand -base64 32
```

Store as:

```bash
KNOWLEDGE_EXPORT_ENCRYPTION_KEY=<base64-value>
```

### Deterministic Content Hash

Use SHA-256 for content fingerprints:

```bash
shasum -a 256 path/to/source.pdf
```

Use this only as a fingerprint, not as a secret.

## Identifier Formats

Identifiers should be readable, stable, and sortable where useful.

### Source IDs

Format:

```text
src-0001
```

Rules:

- Allocate sequentially in `knowledge/sources/manifest.md`.
- Never reuse a source ID.
- Add a new source ID for a revised raw source.

### Page Slugs

Format:

```text
lowercase-kebab-case
```

Rules:

- Use lowercase ASCII letters, numbers, and hyphens.
- Keep concept pages under `knowledge/wiki/concepts/<slug>.md`.
- Keep entity pages under `knowledge/wiki/entities/<slug>.md`.
- Keep source summaries under `knowledge/wiki/sources/<source-id>-<slug>.md`.
- Keep reusable analyses under `knowledge/wiki/analyses/<slug>.md`.

### Operation IDs

Format:

```text
op-YYYYMMDD-HHMMSS-<short-random>
```

Generate:

```bash
printf "op-%s-%s\n" "$(date -u +%Y%m%d-%H%M%S)" "$(openssl rand -hex 3)"
```

Use for ingest, query, lint, export, and migration log entries.

### Run IDs

Format:

```text
run-YYYYMMDD-HHMMSS-<short-random>
```

Generate:

```bash
printf "run-%s-%s\n" "$(date -u +%Y%m%d-%H%M%S)" "$(openssl rand -hex 4)"
```

Use for automated tool executions that may produce artifacts or logs.

### Artifact IDs

Format:

```text
art-YYYYMMDD-<slug>-<short-random>
```

Generate:

```bash
printf "art-%s-%s-%s\n" "$(date -u +%Y%m%d)" "summary" "$(openssl rand -hex 3)"
```

Use for generated exports, bundles, reports, or context packs.

### Graph Node IDs

Use graph node IDs when exporting wiki structure to a graph viewer, graph
database, Cytoscape, sigma.js, Graphology, or a custom visualization.

Format:

```text
node-<kind>-<slug>
```

Kinds:

| Kind | Meaning | Example |
|---|---|---|
| `concept` | Concept wiki page | `node-concept-llm-wiki` |
| `entity` | Person, project, package, paper, dataset, or organization | `node-entity-qmd` |
| `source` | Raw source or source summary | `node-source-src-0001` |
| `analysis` | Reusable generated analysis | `node-analysis-tool-selection` |
| `artifact` | Generated report, context pack, export, or bundle | `node-artifact-20260516-summary-a1b2c3` |

Rules:

- A node ID must be deterministic for durable wiki objects.
- For wiki pages, derive the node ID from page type and slug.
- For raw sources, derive the node ID from `src-0001`, not from title text.
- Do not include spaces, uppercase letters, punctuation, or file extensions.
- Do not encode secrets, local usernames, or absolute paths into node IDs.

Examples:

```text
knowledge/wiki/concepts/llm-wiki.md
node-concept-llm-wiki

knowledge/wiki/sources/src-0001-karpathy-llm-wiki.md
node-source-src-0001
```

### Graph Link IDs

Use graph link IDs for relationships between wiki nodes.

Format:

```text
link-<relation>-<source-node-hash>-<target-node-hash>
```

Generate the hashes from node IDs:

```bash
source_id="node-concept-llm-wiki"
target_id="node-source-src-0001"
relation="cites"
source_hash="$(printf "%s" "$source_id" | shasum -a 256 | cut -c1-10)"
target_hash="$(printf "%s" "$target_id" | shasum -a 256 | cut -c1-10)"
printf "link-%s-%s-%s\n" "$relation" "$source_hash" "$target_hash"
```

Relation names:

| Relation | Meaning |
|---|---|
| `cites` | Wiki page cites a source. |
| `mentions` | Page mentions an entity or concept without deeper synthesis. |
| `defines` | Source or page defines a concept. |
| `supports` | Source supports a claim or analysis. |
| `contradicts` | Source or page conflicts with another claim. |
| `supersedes` | Newer source or page supersedes an older one. |
| `derived-from` | Artifact or analysis was generated from another node. |
| `related-to` | Weak relationship that should be refined later. |

Rules:

- A link ID must be deterministic for the same source node, relation, and target
  node.
- Links are directed unless a graph export explicitly treats them as undirected.
- Prefer specific relations over `related-to`.
- Store human-readable `source`, `target`, and `relation` fields alongside the
  generated link ID in graph exports.
- Use `contradicts` only when the conflict is also recorded in
  `knowledge/wiki/contradictions.md`.

Example:

```json
{
  "id": "link-cites-6bb1839bcb-60a7cdb38b",
  "source": "node-concept-llm-wiki",
  "target": "node-source-src-0001",
  "relation": "cites"
}
```

### Graph Export IDs

Use export IDs for complete graph snapshots.

Format:

```text
graph-YYYYMMDD-HHMMSS-<short-random>
```

Generate:

```bash
printf "graph-%s-%s\n" "$(date -u +%Y%m%d-%H%M%S)" "$(openssl rand -hex 3)"
```

Use the export ID in filenames:

```text
knowledge/exports/graph-20260516-120000-a1b2c3.nodes.json
knowledge/exports/graph-20260516-120000-a1b2c3.links.json
```

Do not commit exports by default unless the user explicitly wants graph
snapshots versioned.

## Provider Key Handling

### Local Development

1. Copy `.env.example` to `.env.local`.
2. Fill only the providers you actually use.
3. Keep `.env.local` out of Git.
4. Rotate keys if they are pasted into chat, logs, screenshots, or commits.

### CI or Automation

- Store provider keys in the CI secret manager.
- Do not write secrets to generated Markdown logs.
- Pass only non-secret identifiers into wiki pages.
- Redact environment dumps before saving them.

### Local Models

For Ollama, prefer an OpenAI-compatible local endpoint:

```bash
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_API_KEY=ollama
```

The `OPENAI_API_KEY` value is a placeholder for local compatibility in this
case, not a real provider secret.

### LiteLLM Proxy

For a local LiteLLM proxy:

```bash
OPENAI_BASE_URL=http://localhost:4000/v1
OPENAI_API_KEY=<litellm-virtual-key>
```

Use LiteLLM virtual keys for budgets, auditability, and provider switching.

## Logging Rules

Add these fields to `knowledge/wiki/log.md` when relevant:

```markdown
## [YYYY-MM-DD] ingest | Source Title

- Operation ID: `op-YYYYMMDD-HHMMSS-abcdef`
- Source ID: `src-0002`
- Run ID: `run-YYYYMMDD-HHMMSS-abcdef12`
- Inputs: source path or URL
- Outputs: generated or updated wiki pages
- Secrets used: provider names only, never key values
```

## Redaction Rules

Before saving terminal output, logs, or diagnostics into the wiki, redact:

- API keys
- bearer tokens
- cookies
- private URLs with signed query parameters
- local absolute paths if they reveal private user information
- email addresses unless needed as source attribution

Use this replacement style:

```text
OPENAI_API_KEY=[REDACTED]
Authorization: Bearer [REDACTED]
```

## Rotation Rules

Rotate a key immediately when:

- it appears in Git history
- it appears in a screenshot or shared transcript
- it is pasted into an LLM conversation
- it is written to `knowledge/wiki/log.md`
- it is used by an untrusted local script

After rotation:

1. Revoke the exposed key at the provider.
2. Generate a replacement.
3. Update local secret storage.
4. Add a log entry that says the key was rotated, without recording the key.

## Validation Checklist

Before running automated wiki tools:

- `.env.local` exists only if local secrets are needed.
- `KNOWLEDGE_INSTANCE_ID` is set and stable.
- Provider keys are scoped and budget-limited.
- `OPENAI_BASE_URL` points to the intended provider or local proxy.
- Generated source IDs do not collide with `knowledge/sources/manifest.md`.
- Operation IDs and run IDs are written to `knowledge/wiki/log.md`.
