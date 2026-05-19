---
title: "Contradictions"
type: maintenance
status: active
created: 2026-05-16
updated: 2026-05-18
sources:
  - ../AGENTS.md
  - ../../README.md
  - ../../plans/DEPENDENCY_MAP.md
  - ../../start.sh
---

# Contradictions

This page tracks claims that conflict across sources or wiki pages.

## Active Contradictions

### Startup Script Name

- **Claim A:** `plans/DEPENDENCY_MAP.md` describes `start_frontend.sh` as the
  unified startup script and lists it in runtime-port and task-location notes.
- **Claim B:** `README.md` documents `start.sh` as the one-command startup
  script, and the repository root currently contains `start.sh` but not
  `start_frontend.sh`.
- **Current handling:** Treat `start.sh` as the current canonical script in
  synthesis pages. Treat the dependency-map startup-script name as stale until
  the source document is refreshed.
- **Resolution needed:** Update `plans/DEPENDENCY_MAP.md` or register a newer
  dependency-map source.

## Resolved Contradictions

No contradictions have been resolved yet.

## Entry Format

```markdown
### Short Conflict Title

- **Claim A:** claim and citation.
- **Claim B:** conflicting claim and citation.
- **Current handling:** how the wiki should phrase or avoid the claim.
- **Resolution needed:** source, experiment, or decision required.
```
