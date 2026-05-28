# Scale Limits and Large Test Data

Committed publication data now covers these app-facing taxa tiers:

| Tier | Taxa | Data source | Purpose |
| --- | ---: | --- | --- |
| `committed-small` | 24 | Aberer/RogueNaRok bootstrap result | Fast rogue-taxon regression checks. |
| `committed-medium` | 125 | Aberer/RogueNaRok bootstrap result | Larger bootstrap tree-series checks. |
| `synthetic-performance-baseline` | 250 | msprime committed performance fixture | Baseline large-tree visualization. |
| `committed-msa` | 334 | Norovirus publication MSA | Largest retained publication MSA path. |
| `synthetic-performance-large` | 500 | msprime committed performance fixture | Large-tree visualization limits. |
| `synthetic-performance-stress` | 1000 | msprime committed performance fixture | Stress-testing maximum visible taxa. |

The committed msprime files are tree-only visualization fixtures, not biological
case studies. They are generated as deterministic independent-tree replicates in
two forms: longer timeline fixtures at 250/50, 500/25, and 1000/10, plus short
high-taxon fixtures at 500/5 and 1000/5 for quick rendering checks:

```text
publication_data/scale_fixtures/msprime_performance/
```

Generate larger local scratch fixtures with msprime when you need heavier
limits testing:

```bash
PATH="$PWD/.venv-publication/bin:$PATH" npm run fixtures:msprime-scale -- --taxa 500 --trees 25
PATH="$PWD/.venv-publication/bin:$PATH" npm run fixtures:msprime-scale -- --taxa 1000 --trees 10
```

Generated files are written to:

```text
publication_data/scale_fixtures/generated/
```

That directory is ignored by git. Use these generated files to measure frontend
and backend behavior beyond the committed 1000-taxon fixture without changing
the publication-data archive boundary.

Run the committed publication-data hygiene check with:

```bash
npm run publication:data:check
```
