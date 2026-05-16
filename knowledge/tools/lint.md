# Wiki Lint Workflow

Use this checklist for periodic wiki maintenance.

## Manual Checks

1. Find orphan pages:

```bash
find knowledge/wiki -name '*.md' -type f | sort
```

Then compare each page against backlinks found with `rg`.

2. Find missing citations:

```bash
rg -n "sources:\s*\[\]|sources:\s*$" knowledge/wiki
```

3. Find unresolved maintenance markers:

```bash
rg -n "TODO|FIXME|needs-review|uncited|contradiction" knowledge/wiki
```

4. Check broken external links with lychee when installed:

```bash
lychee "knowledge/**/*.md"
```

5. Check Markdown style with markdownlint when installed:

```bash
mdl knowledge
```

6. Check graph identifier shape when graph exports exist:

```bash
rg -n '"id": "(node|link|graph)-' knowledge/exports
```

## Lint Output

Update these files as needed:

- `knowledge/wiki/index.md`
- `knowledge/wiki/contradictions.md`
- `knowledge/wiki/open-questions.md`
- `knowledge/wiki/log.md`
